// -----------------------------------------------------------------------------
//  Consistency checks between `gladys-assistant-integration.json`, the code and
// the tests. Keep the manifest and the integration in sync.
// -----------------------------------------------------------------------------

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { DEFAULT_CONFIG } from '../src/config.js';
import { SCENE_ACTIONS, TRIGGER } from '../src/scenes.js';
import { REMOTE_WIDGET } from '../src/widgets.js';

const manifest = JSON.parse(
  await readFile(new URL('../gladys-assistant-integration.json', import.meta.url), 'utf8'),
);
const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));

// Every list of form fields the manifest can declare.
const allFields = [
  ...(manifest.config_schema ?? []),
  ...(manifest.actions ?? []).flatMap((item) => item.fields ?? []),
  ...(manifest.scene_triggers ?? []).flatMap((item) => item.fields ?? []),
  ...(manifest.scene_actions ?? []).flatMap((item) => item.fields ?? []),
  ...(manifest.widgets ?? []).flatMap((widget) => widget.settings ?? []),
];

// Manifest fields older Gladys releases reject as unknown.
const CAPABILITY_MIN_GLADYS_VERSION = [5, 1, 0];
const CATEGORIES_MIN_GLADYS_VERSION = [4, 86, 0];

// Minimum version of the manifest `gladys_version` range, e.g. [5, 1, 0].
function minGladysVersion() {
  const match = manifest.gladys_version.match(/>=\s*(\d+)\.(\d+)\.(\d+)/);
  assert.ok(match, 'gladys_version must declare a minimum version');
  return match.slice(1).map(Number);
}

function isAtLeast(version, required) {
  for (let i = 0; i < required.length; i += 1) {
    if (version[i] !== required[i]) return version[i] > required[i];
  }
  return true;
}

test('declaring catalog categories requires Gladys >= 4.86.0', () => {
  assert.ok(manifest.categories.length >= 1 && manifest.categories.length <= 3);
  assert.ok(isAtLeast(minGladysVersion(), CATEGORIES_MIN_GLADYS_VERSION));
});

test('widgets, scene triggers and scene actions require Gladys >= 5.1.0', () => {
  assert.ok(manifest.widgets?.length > 0);
  assert.ok(manifest.scene_triggers?.length > 0);
  assert.ok(manifest.scene_actions?.length > 0);
  assert.ok(isAtLeast(minGladysVersion(), CAPABILITY_MIN_GLADYS_VERSION));
});

test('the widget key has a handler in the code', () => {
  const declared = (manifest.widgets ?? []).map((widget) => widget.key);
  assert.ok(declared.includes(REMOTE_WIDGET), `widget "${REMOTE_WIDGET}" is not declared`);
  assert.equal(declared.length, 1);
});

test('every scene action is declared and has a handler, and vice versa', () => {
  const declared = (manifest.scene_actions ?? []).map((action) => action.key);
  for (const key of declared) {
    assert.equal(typeof SCENE_ACTIONS[key], 'function', `scene action "${key}" has no handler`);
  }
  for (const key of Object.keys(SCENE_ACTIONS)) {
    assert.ok(declared.includes(key), `scene action "${key}" is not declared in the manifest`);
  }
});

test('the scene trigger fired by the code is declared', () => {
  const declared = (manifest.scene_triggers ?? []).map((trigger) => trigger.key);
  assert.ok(declared.includes(TRIGGER.VOLUME_CROSSED));
});

test('config_schema defaults stay consistent with DEFAULT_CONFIG', () => {
  for (const field of manifest.config_schema) {
    if (field.default !== undefined) {
      assert.equal(
        DEFAULT_CONFIG[field.key],
        field.default,
        `DEFAULT_CONFIG.${field.key} must match the manifest default`,
      );
    }
  }
});

test('section fields are purely presentational', () => {
  const sections = manifest.config_schema.filter((field) => field.type === 'section');
  for (const section of sections) {
    assert.equal(section.required, undefined);
    assert.equal(section.default, undefined);
    assert.equal(section.placeholder, undefined);
    assert.ok(section.label?.en, `section "${section.key}" needs an English label`);
    assert.ok(!(section.key in DEFAULT_CONFIG));
  }
});


test('every select field offers at least one option or a dynamic source', () => {
  for (const field of allFields.filter((field) => field.type === 'select')) {
    if (field.source) {
      assert.ok(
        typeof field.source === 'string' && field.source.length > 0,
        `select field "${field.key}" needs a valid source`,
      );
      continue;
    }

    assert.ok(
      Array.isArray(field.options) && field.options.length > 0,
      `select field "${field.key}" needs options`,
    );

    for (const option of field.options) {
      assert.ok(
        typeof option.value === 'string' || typeof option.value === 'number',
      );
      assert.ok(
        option.label?.en,
        `option "${option.value}" needs an English label`,
      );
    }
  }
});


test('the manifest and the package agree on the version', () => {
  assert.equal(manifest.version, pkg.version, 'manifest version must match package.json');
});

// The image tag is deliberately free: a test branch publishes the same manifest
// with a branch tag (ghcr.io/...:feat-something), and the Release workflow puts
// the version tag back. Only the shape is checked here, the store validator is
// the place that ties the tag to a published image.
test('the image is tagged, on a registry, with a non-empty tag', () => {
  assert.match(
    manifest.docker_image,
    /^[a-z0-9.-]+\/\S+:[A-Za-z0-9._-]+$/,
    `docker_image must carry a tag, got "${manifest.docker_image}"`,
  );
});

test('the catalog description holds 10 to 100 characters per language', () => {
  assert.ok(manifest.description.en);
  for (const [lang, description] of Object.entries(manifest.description)) {
    assert.ok(
      description.length >= 10 && description.length <= 100,
      `description.${lang} has ${description.length} characters (10 to 100 allowed)`,
    );
  }
});

test('field placeholders are multi-language objects', () => {
  for (const field of allFields.filter((item) => item.placeholder !== undefined)) {
    assert.equal(typeof field.placeholder, 'object', `field "${field.key}": placeholder`);
    assert.ok(field.placeholder.en, `field "${field.key}": placeholder needs an English text`);
  }
});

test('user-facing manifest texts are bilingual', () => {
  const texts = [
    manifest.label,
    manifest.description,
    ...(manifest.config_schema ?? []).flatMap((field) => [field.label, field.description]),
  ];
  for (const text of texts.filter(Boolean)) {
    assert.ok(text.en && text.fr, `both en and fr are required, got ${JSON.stringify(text)}`);
  }
});

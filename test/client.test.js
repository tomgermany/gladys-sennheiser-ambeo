import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { AmbeoClient, KEY } from '../src/ambeo/client.js';
import { buildRemoteContent } from '../src/widgets.js';
import { DEFAULT_CONFIG } from '../src/config.js';

// Fake soundbar (Plus/Mini flavour): path -> getData answer.
// Answers are served as TEXT, like the real client reads them.
function fakeFetch(store, calls = []) {
  return async (url) => {
    const u = new URL(url);
    const fn = u.pathname.split('/').pop();
    const path = u.searchParams.get('path');
    calls.push({ fn, path, value: u.searchParams.get('value') });
    const body = (data) => ({ ok: true, text: async () => JSON.stringify(data) });
    if (fn === 'getRows') {
      if (!(path in store.rows)) return { ok: false, status: 404, text: async () => '' };
      return body({ rows: store.rows[path] });
    }
    if (fn === 'setData') return body({});
    if (!(path in store.data)) return { ok: false, status: 404, text: async () => '' };
    return body({ value: store.data[path] });
  };
}

const store = {
  data: {
    'settings:/system/productName': { string_: 'AMBEO Soundbar Plus' },
    'systemmanager:/deviceName': { string_: 'Wohnzimmer' },
    'settings:/system/serialNumber': { string_: 'SN123' },
    'player:volume': { i32_: 30 },
    'settings:/mediaPlayer/mute': { bool_: false },
    'powermanager:target': { powerTarget: { target: 'online' } },
    'settings:/popcorn/audio/nightModeStatus': { bool_: true },
    'popcorn:inputChange/selected': { popcornInputId: 'hdmi1' },
  },
  rows: {
    'ui:/inputs': [
      { id: 'hdmi1', title: 'HDMI 1', path: 'ui:/inputs/hdmi1' },
      { id: 'spdif', title: 'Optical', path: 'ui:/inputs/optical' },
    ],
    'settings:/popcorn/audio/audioPresetValues': [
      { title: 'Movie', value: { popcornAudioPreset: 'movie' } },
    ],
  },
};

test('connect + state: only answered keys, sources, power derived', async () => {
  const calls = [];
  const c = new AmbeoClient('1.2.3.4', { fetch: fakeFetch(store, calls) });
  await c.connect();
  const state = await c.fetchState();
  assert.equal(state[KEY.VOLUME], 30);
  assert.equal(state[KEY.NIGHT], true);
  assert.equal(KEY.ECO in state, false);
  assert.equal(c.isOn(state), true);
  assert.equal(c.sourceTitle(state), 'HDMI 1');
  assert.equal(c.canPower(), false);
});

test('set: typed JSON value and activate path for inputs', async () => {
  const calls = [];
  const c = new AmbeoClient('1.2.3.4', { fetch: fakeFetch(store, calls) });
  await c.connect();
  calls.length = 0;
  await c.set(KEY.VOLUME, 41.6);
  assert.deepEqual(JSON.parse(calls[0].value), { type: 'i32_', i32_: 42 });
  await c.setSource('spdif');
  assert.equal(calls[1].path, 'ui:/inputs/optical');
  await assert.rejects(() => c.setSource('airplay'), /cannot be selected/);
});

test('widget exposes power (Max only), volume and one button per input', async () => {
  const c = new AmbeoClient('1.2.3.4', { fetch: fakeFetch(store) });
  await c.connect();
  const state = await c.fetchState();
  const content = buildRemoteContent({ client: c, state, volumeFeatureId: 'f' });
  const keys = content.components.filter((x) => x.type === 'button').map((x) => x.action.key);
  assert.deepEqual(keys, ['volume_down', 'volume_up', 'mute_toggle', 'source', 'source']);
});

test('manifest defaults match config defaults', () => {
  const m = JSON.parse(
    readFileSync(new URL('../gladys-assistant-integration.json', import.meta.url)),
  );
  for (const f of m.config_schema.filter((x) => 'default' in x)) {
    assert.equal(f.default, DEFAULT_CONFIG[f.key], f.key);
  }
});

// A firmware that knows nothing but its own model name must still produce a
// usable client: the device appears, with no inputs and no profiles.
test('a soundbar that answers the model only still connects', async () => {
  const partial = {
    data: { 'settings:/system/productName': { string_: 'AMBEO Soundbar Mini' } },
    rows: {},
  };
  const warns = [];
  const c = new AmbeoClient('1.2.3.4', { fetch: fakeFetch(partial) });
  c.warn = (what) => warns.push(what);

  const info = await c.connect();
  assert.equal(info.model, 'AMBEO Soundbar Mini');
  assert.equal(c.sources.filter((s) => s.selectable).length, 0);
  assert.deepEqual(c.presets, []);
  // The groups themselves failed, so they are reported rather than silent.
  assert.ok(warns.includes('sources'), `expected a report, got ${JSON.stringify(warns)}`);
  assert.ok(warns.includes('presets'), `expected a report, got ${JSON.stringify(warns)}`);
});

// An unknown path answers 404 with an empty body on this firmware, and a wrong
// address answers with a web page: both have to name what came back.
test('an HTTP error names its path', async () => {
  const partial = { data: {}, rows: {} };
  const c = new AmbeoClient('1.2.3.4', { fetch: fakeFetch(partial) });
  await assert.rejects(() => c.connect(), (err) =>
    /HTTP 404 for settings:\/system\/productName/.test(err.message),
  );
});

test('an HTML answer is reported with its path, not as a bare JSON error', async () => {
  const htmlFetch = async () => ({ ok: true, text: async () => '<html><body>Hello</body></html>' });
  const c = new AmbeoClient('1.2.3.4', { fetch: htmlFetch });
  await assert.rejects(
    () => c.connect(),
    (err) =>
      /Invalid JSON for settings:\/system\/productName/.test(err.message) &&
      /<html>/.test(err.message),
  );
});

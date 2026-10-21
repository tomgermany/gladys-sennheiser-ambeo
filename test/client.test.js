import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { AmbeoClient, KEY } from '../src/ambeo/client.js';
import { buildRemoteContent } from '../src/widgets.js';
import { DEFAULT_CONFIG } from '../src/config.js';

// Fake soundbar (Plus/Mini flavour): path -> getData answer.
function fakeFetch(store, calls) {
  return async (url) => {
    const u = new URL(url);
    const fn = u.pathname.split('/').pop();
    const path = u.searchParams.get('path');
    calls.push({ fn, path, value: u.searchParams.get('value') });
    if (fn === 'getRows') return { ok: true, json: async () => ({ rows: store.rows[path] ?? [] }) };
    if (fn === 'setData') return { ok: true, json: async () => ({}) };
    if (!(path in store.data)) return { ok: false, status: 404, json: async () => ({}) };
    return { ok: true, json: async () => ({ value: store.data[path] }) };
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
    'settings:/popcorn/audio/audioPresetValues': [{ title: 'Movie', value: { popcornAudioPreset: 'movie' } }],
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
  const c = new AmbeoClient('1.2.3.4', { fetch: fakeFetch(store, []) });
  await c.connect();
  const state = await c.fetchState();
  const content = buildRemoteContent({ client: c, state, volumeFeatureId: 'f' });
  const keys = content.components.filter((x) => x.type === 'button').map((x) => x.action.key);
  assert.deepEqual(keys, ['volume_down', 'volume_up', 'mute_toggle', 'source', 'source']);
});

test('manifest defaults match config defaults', () => {
  const m = JSON.parse(readFileSync(new URL('../gladys-assistant-integration.json', import.meta.url)));
  for (const f of m.config_schema.filter((x) => 'default' in x)) {
    assert.equal(f.default, DEFAULT_CONFIG[f.key], f.key);
  }
});

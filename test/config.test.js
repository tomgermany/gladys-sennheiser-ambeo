import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeConfig, DEFAULT_CONFIG } from '../src/config.js';

test('normalizeConfig returns the defaults when called with no argument', () => {
  assert.deepEqual(normalizeConfig(), DEFAULT_CONFIG);
});

test('normalizeConfig keeps user values over the defaults', () => {
  const config = normalizeConfig({ host: '192.168.1.50', volume_step: 2 });
  assert.equal(config.host, '192.168.1.50');
  assert.equal(config.volume_step, 2);
});

test('normalizeConfig coerces numeric strings coming from a form', () => {
  const config = normalizeConfig({ poll_frequency: '600', volume_max: '80', volume_min: '5' });
  assert.equal(config.poll_frequency, 600);
  assert.equal(typeof config.poll_frequency, 'number');
  assert.equal(config.volume_max, 80);
  assert.equal(config.volume_min, 5);
});

test('normalizeConfig trims the host and tolerates surrounding spaces', () => {
  assert.equal(normalizeConfig({ host: '  192.168.1.50  ' }).host, '192.168.1.50');
});

test('normalizeConfig falls back to the default for a missing field', () => {
  assert.equal(normalizeConfig({ host: '10.0.0.2' }).poll_frequency, DEFAULT_CONFIG.poll_frequency);
  assert.equal(normalizeConfig({}).default_sound, 'tone.wav');
});

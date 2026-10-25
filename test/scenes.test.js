import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateVolume, nextSide, TRIGGER } from '../src/scenes.js';
import { listSounds, firstLanAddress } from '../src/sounds.js';

test('threshold fires once per crossing, holds while loud, re-arms after hysteresis', () => {
  let side = 'normal';
  const run = (volume) => {
    const events = evaluateVolume({
      volume,
      maxVolume: 70,
      minVolume: 10,
      previous: { SIDE: side },
    });
    side = nextSide(events, side);
    return events.filter((e) => !e.__side);
  };
  assert.deepEqual(run(50), []);
  assert.deepEqual(run(80), [{ direction: 'over', limit: 70, volume: 80 }]);
  assert.deepEqual(run(85), []); // still loud: no repeat
  assert.deepEqual(run(68), []); // inside the hysteresis band: still loud
  assert.deepEqual(run(50), []); // back to normal, armed again
  assert.deepEqual(run(80), [{ direction: 'over', limit: 70, volume: 80 }]);
  assert.deepEqual(run(5), [{ direction: 'under', limit: 10, volume: 5 }]);
});

test('a disabled limit never fires', () => {
  const events = evaluateVolume({
    volume: 100,
    maxVolume: undefined,
    minVolume: undefined,
    previous: { SIDE: 'normal' },
  });
  assert.deepEqual(events.filter((e) => !e.__side), []);
});

test('trigger key and file listing are stable', () => {
  assert.equal(TRIGGER.VOLUME_CROSSED, 'volume_threshold_crossed');
  assert.ok(Array.isArray(listSounds()));
});

test('a LAN address is found in this container', () => {
  assert.match(String(firstLanAddress()), /^\d+\.\d+\.\d+\.\d+$/);
});

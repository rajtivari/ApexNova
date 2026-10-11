import test from 'node:test';
import assert from 'node:assert/strict';
import { scoreResult } from '../src/services/standings.service.js';

test('scoreResult combines kills and placement points', () => {
  assert.deepEqual(scoreResult({ kills: 4, placement: 1 }), {
    killPoints: 4,
    placementPoints: 10,
    totalPoints: 14,
  });
});

test('unknown placement positions receive no placement points', () => {
  assert.deepEqual(scoreResult({ kills: 2, placement: 99 }), {
    killPoints: 2,
    placementPoints: 0,
    totalPoints: 2,
  });
});

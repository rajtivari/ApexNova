import test from 'node:test';
import assert from 'node:assert/strict';
import { recalculateStandings, scoreResult } from '../src/services/standings.service.js';

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

test('standings are rebuilt with deterministic tie breakers', async () => {
  const writes = [];
  const tx = {
    matchResult: {
      async findMany() {
        return [
          { teamId: 'team-b', kills: 5, totalPoints: 12 },
          { teamId: 'team-a', kills: 7, totalPoints: 12 },
          { teamId: 'team-c', kills: 2, totalPoints: 8 },
        ];
      },
    },
    standing: {
      async deleteMany(args) { writes.push({ type: 'delete', args }); },
      async createMany(args) { writes.push({ type: 'create', args }); },
    },
  };

  await recalculateStandings(tx, 'tournament-1');
  assert.deepEqual(writes[0], { type: 'delete', args: { where: { tournamentId: 'tournament-1' } } });
  assert.deepEqual(writes[1].args.data.map((row) => [row.teamId, row.rank]), [
    ['team-a', 1],
    ['team-b', 2],
    ['team-c', 3],
  ]);
});

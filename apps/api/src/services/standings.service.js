// Placeholder scoring for both games: tune kill and placement tables with tournament rules.
const placementPoints = [10, 6, 5, 4, 3, 2, 1];

export function scoreResult({ kills, placement }) {
  const placementScore = placementPoints[placement - 1] ?? 0;
  return {
    killPoints: kills,
    placementPoints: placementScore,
    totalPoints: kills + placementScore,
  };
}

// Pass a Prisma transaction client so result review and standings stay atomic.
export async function recalculateStandings(tx, tournamentId) {
  const results = await tx.matchResult.findMany({
    where: { status: 'APPROVED', match: { tournamentId } },
  });
  const totals = new Map();

  for (const result of results) {
    const current = totals.get(result.teamId) ?? { kills: 0, totalPoints: 0, matchesPlayed: 0 };
    current.kills += result.kills;
    current.totalPoints += result.totalPoints;
    current.matchesPlayed += 1;
    totals.set(result.teamId, current);
  }

  const ranked = [...totals.entries()].sort((a, b) => (
    b[1].totalPoints - a[1].totalPoints
    || b[1].kills - a[1].kills
    || a[0].localeCompare(b[0])
  ));

  await tx.standing.deleteMany({ where: { tournamentId } });
  if (ranked.length) {
    await tx.standing.createMany({
      data: ranked.map(([teamId, data], index) => ({
        tournamentId,
        teamId,
        rank: index + 1,
        ...data,
      })),
    });
  }
}

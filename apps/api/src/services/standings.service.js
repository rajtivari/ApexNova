// Placeholder scoring for both games: tune kill and placement tables with tournament rules.
const placementPoints = [10, 6, 5, 4, 3, 2, 1];
export function scoreResult({ kills, placement }) { return { killPoints: kills, placementPoints: placementPoints[placement - 1] ?? 0, totalPoints: kills + (placementPoints[placement - 1] ?? 0) }; }
export async function recalculateStandings(prisma, tournamentId) {
  const results = await prisma.matchResult.findMany({ where: { status: 'APPROVED', match: { tournamentId } } });
  const totals = new Map();
  for (const result of results) { const current = totals.get(result.teamId) ?? { kills: 0, totalPoints: 0, matchesPlayed: 0 }; current.kills += result.kills; current.totalPoints += result.totalPoints; current.matchesPlayed += 1; totals.set(result.teamId, current); }
  const ranked = [...totals.entries()].sort((a, b) => b[1].totalPoints - a[1].totalPoints);
  await prisma.$transaction([prisma.standing.deleteMany({ where: { tournamentId } }), ...ranked.map(([teamId, data], index) => prisma.standing.create({ data: { tournamentId, teamId, rank: index + 1, ...data } }))]);
}

import {
  computeImpact,
  explainAward,
  explainMostSixes,
  explainTopScorer,
  explainTopWicketTaker,
  IMPACT_FORMULA,
  mergeImpacts,
  mostSixes,
  rankImpacts,
  topRunScorer,
  topWicketTaker,
  type PlayerImpact,
} from '@cricket/engine';
import type { InningsState } from '@cricket/shared';
import { prisma } from '../../db/prisma';
import { notFound } from '../../lib/errors';
import { getStandings } from './tournaments.service';

export interface AwardPlayer {
  playerId: string;
  name: string;
  teamId: string;
  teamName: string;
  matches: number;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  wickets: number;
  ballsBowled: number;
  runsConceded: number;
  points: number;
  /** Plain-language reason this player got the award. */
  reason: string;
}

export interface TeamRef {
  id: string;
  name: string;
  reason?: string;
}

export interface SeriesAwards {
  /** Number of completed matches the awards are based on. */
  matchesCounted: number;
  champion: TeamRef | null;
  runnerUp: TeamRef | null;
  /** "Man of the Series" or "Man of the Tournament". */
  bestPlayerTitle: string;
  bestPlayer: AwardPlayer | null;
  topRunScorer: AwardPlayer | null;
  topWicketTaker: AwardPlayer | null;
  mostSixes: AwardPlayer | null;
  /** How the best player is chosen. */
  formula: string;
}

type MatchRow = {
  id: string;
  winnerId: string | null;
  stage?: string | null;
  teamAId: string | null;
  teamBId: string | null;
  resultText: string | null;
  innings: { snapshot: unknown }[];
};

/** Impact of every completed match, merged. Only completed matches count. */
async function collect(where: { tournamentId: string } | { seriesId: string }) {
  const matches = (await prisma.match.findMany({
    where: { ...where, status: 'completed' },
    include: { innings: true },
  })) as unknown as MatchRow[];

  const perMatch: PlayerImpact[][] = [];
  const appearances = new Map<string, number>();
  for (const m of matches) {
    const snaps = m.innings.map((i) => i.snapshot as InningsState | null).filter((s): s is InningsState => !!s);
    const impact = computeImpact(snaps);
    perMatch.push(impact);
    for (const p of impact) appearances.set(p.playerId, (appearances.get(p.playerId) ?? 0) + 1);
  }
  return { matches, merged: mergeImpacts(perMatch), appearances };
}

async function awardPlayers(title: string, merged: PlayerImpact[], appearances: Map<string, number>) {
  const players = await prisma.player.findMany({ where: { id: { in: merged.map((p) => p.playerId) } } });
  const teams = await prisma.team.findMany({ where: { id: { in: [...new Set(merged.map((p) => p.teamId))] } } });
  const pName = new Map<string, string>(players.map((p: { id: string; name: string }) => [p.id, p.name]));
  const tName = new Map<string, string>(teams.map((t: { id: string; name: string }) => [t.id, t.name]));
  const nameOf = (id: string) => pName.get(id) ?? 'Unknown';
  const ranked = rankImpacts(merged);

  const view = (p: PlayerImpact | null, reason: (p: PlayerImpact, matches: number) => string): AwardPlayer | null => {
    if (!p) return null;
    const matches = appearances.get(p.playerId) ?? 0;
    return { ...p, name: nameOf(p.playerId), teamName: tName.get(p.teamId) ?? 'Unknown', matches, reason: reason(p, matches) };
  };

  return {
    bestPlayer: view(ranked[0] ?? null, (p, matches) =>
      explainAward({ title, winner: p, winnerName: nameOf(p.playerId), teamName: tName.get(p.teamId) ?? 'Unknown', ranked, nameOf, matches }),
    ),
    topRunScorer: view(topRunScorer(merged), (p, m) => explainTopScorer(p, nameOf(p.playerId), m)),
    topWicketTaker: view(topWicketTaker(merged), (p, m) => explainTopWicketTaker(p, nameOf(p.playerId), m)),
    mostSixes: view(mostSixes(merged), (p) => explainMostSixes(p, nameOf(p.playerId))),
  };
}

async function teamRef(id: string | null, reason?: string): Promise<TeamRef | null> {
  if (!id) return null;
  const t = await prisma.team.findUnique({ where: { id } });
  return t ? { id: t.id, name: t.name, ...(reason ? { reason } : {}) } : null;
}

const record = (matches: MatchRow[], teamId: string) => {
  const mine = matches.filter((m) => m.teamAId === teamId || m.teamBId === teamId);
  return { played: mine.length, won: mine.filter((m) => m.winnerId === teamId).length };
};

export async function getTournamentAwards(tournamentId: string): Promise<SeriesAwards> {
  const tournament = await prisma.tournament.findUnique({ where: { id: tournamentId } });
  if (!tournament) throw notFound('Tournament');
  const { matches, merged, appearances } = await collect({ tournamentId });
  const players = await awardPlayers('Man of the Tournament', merged, appearances);

  let championId: string | null = null;
  let runnerUpId: string | null = null;
  let reason: string | undefined;
  if (tournament.status === 'completed') {
    const final = matches.find((m) => m.stage === 'final' && m.winnerId);
    if (final) {
      championId = final.winnerId;
      runnerUpId = final.teamAId === championId ? final.teamBId : final.teamAId;
      const r = record(matches, championId!);
      const group = (await prisma.tournamentTeam.findFirst({ where: { tournamentId, teamId: championId! } }))?.groupName as string | null | undefined;
      reason =
        `Won the final${final.resultText ? ` (${final.resultText})` : ''}` +
        `, and ${r.won} of ${r.played} matches in the tournament${group ? `, coming through Group ${group}` : ''}.`;
    } else {
      const table = await getStandings(tournamentId); // league only: table topper
      championId = table[0]?.teamId ?? null;
      runnerUpId = table[1]?.teamId ?? null;
      if (table[0]) reason = `Finished top of the table with ${table[0].points} points from ${table[0].played} matches.`;
    }
  }

  return {
    matchesCounted: matches.length,
    champion: await teamRef(championId, reason),
    runnerUp: await teamRef(runnerUpId),
    bestPlayerTitle: 'Man of the Tournament',
    ...players,
    formula: IMPACT_FORMULA,
  };
}

export async function getSeriesAwards(seriesId: string): Promise<SeriesAwards> {
  const series = await prisma.series.findUnique({ where: { id: seriesId } });
  if (!series) throw notFound('Series');
  const { matches, merged, appearances } = await collect({ seriesId });
  const players = await awardPlayers('Man of the Series', merged, appearances);

  const winsA = matches.filter((m) => m.winnerId === series.teamAId).length;
  const winsB = matches.filter((m) => m.winnerId === series.teamBId).length;
  const needed = Math.floor(series.matchCount / 2) + 1;
  const decided = series.status === 'completed' || winsA >= needed || winsB >= needed;
  // Series draw (equal wins when all matches are done): no champion.
  const championId = !decided ? null : winsA > winsB ? series.teamAId : winsB > winsA ? series.teamBId : null;
  const runnerUpId = championId ? (championId === series.teamAId ? series.teamBId : series.teamAId) : null;
  const reason = championId ? `Won the series ${Math.max(winsA, winsB)}-${Math.min(winsA, winsB)}.` : undefined;

  return {
    matchesCounted: matches.length,
    champion: await teamRef(championId, reason),
    runnerUp: await teamRef(runnerUpId),
    bestPlayerTitle: 'Man of the Series',
    ...players,
    formula: IMPACT_FORMULA,
  };
}

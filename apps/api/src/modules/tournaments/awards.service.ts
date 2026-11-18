import { computeImpact, mergeImpacts, pickBestPlayer, topRunScorer, topWicketTaker, type PlayerImpact } from '@cricket/engine';
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
}

export interface SeriesAwards {
  /** Number of completed matches the awards are based on. */
  matchesCounted: number;
  champion: { id: string; name: string } | null;
  runnerUp: { id: string; name: string } | null;
  manOfTheSeries: AwardPlayer | null;
  topRunScorer: AwardPlayer | null;
  topWicketTaker: AwardPlayer | null;
}

type MatchRow = { id: string; winnerId: string | null; stage?: string | null; innings: { snapshot: unknown }[] };

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

async function decorate(merged: PlayerImpact[], appearances: Map<string, number>) {
  const players = await prisma.player.findMany({ where: { id: { in: merged.map((p) => p.playerId) } } });
  const teams = await prisma.team.findMany({ where: { id: { in: [...new Set(merged.map((p) => p.teamId))] } } });
  const pName = new Map(players.map((p) => [p.id, p.name]));
  const tName = new Map(teams.map((t) => [t.id, t.name]));
  const view = (p: PlayerImpact | null): AwardPlayer | null =>
    p && {
      ...p,
      name: pName.get(p.playerId) ?? 'Unknown',
      teamName: tName.get(p.teamId) ?? 'Unknown',
      matches: appearances.get(p.playerId) ?? 0,
    };
  return view;
}

async function teamRef(id: string | null) {
  if (!id) return null;
  const t = await prisma.team.findUnique({ where: { id } });
  return t ? { id: t.id, name: t.name } : null;
}

export async function getTournamentAwards(tournamentId: string): Promise<SeriesAwards> {
  const tournament = await prisma.tournament.findUnique({ where: { id: tournamentId } });
  if (!tournament) throw notFound('Tournament');
  const { matches, merged, appearances } = await collect({ tournamentId });
  const view = await decorate(merged, appearances);

  let championId: string | null = null;
  let runnerUpId: string | null = null;
  if (tournament.status === 'completed') {
    const final = matches.find((m) => m.stage === 'final' && m.winnerId);
    if (final) {
      const fm = (await prisma.match.findUnique({ where: { id: final.id } })) as { teamAId: string | null; teamBId: string | null } | null;
      championId = final.winnerId;
      runnerUpId = fm ? (fm.teamAId === championId ? fm.teamBId : fm.teamAId) : null;
    } else {
      const table = await getStandings(tournamentId); // league only: table topper
      championId = table[0]?.teamId ?? null;
      runnerUpId = table[1]?.teamId ?? null;
    }
  }

  return {
    matchesCounted: matches.length,
    champion: await teamRef(championId),
    runnerUp: await teamRef(runnerUpId),
    manOfTheSeries: view(pickBestPlayer(merged)),
    topRunScorer: view(topRunScorer(merged)),
    topWicketTaker: view(topWicketTaker(merged)),
  };
}

export async function getSeriesAwards(seriesId: string): Promise<SeriesAwards> {
  const series = await prisma.series.findUnique({ where: { id: seriesId } });
  if (!series) throw notFound('Series');
  const { matches, merged, appearances } = await collect({ seriesId });
  const view = await decorate(merged, appearances);

  const winsA = matches.filter((m) => m.winnerId === series.teamAId).length;
  const winsB = matches.filter((m) => m.winnerId === series.teamBId).length;
  const needed = Math.floor(series.matchCount / 2) + 1;
  const decided = series.status === 'completed' || winsA >= needed || winsB >= needed;
  // Series draw (equal wins when all matches are done): no champion.
  const championId = !decided ? null : winsA > winsB ? series.teamAId : winsB > winsA ? series.teamBId : null;
  const runnerUpId = championId ? (championId === series.teamAId ? series.teamBId : series.teamAId) : null;

  return {
    matchesCounted: matches.length,
    champion: await teamRef(championId),
    runnerUp: await teamRef(runnerUpId),
    manOfTheSeries: view(pickBestPlayer(merged)),
    topRunScorer: view(topRunScorer(merged)),
    topWicketTaker: view(topWicketTaker(merged)),
  };
}

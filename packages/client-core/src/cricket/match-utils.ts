import type { MatchStatus } from '@cricket/shared';
import type { MatchDetail, MatchPlayerRow, MatchSummary } from '../api/types';

type TossInfo = Pick<MatchSummary, 'teamAId' | 'teamBId' | 'tossWinnerId' | 'tossDecision'>;

/**
 * Who bats and bowls in an innings. Mirrors the server rule (the server re-checks it):
 * the toss decides innings 1, innings 2 is the reverse.
 */
export function inningsSides(m: TossInfo, inningsNo: number): { batting: string; bowling: string } | null {
  if (!m.teamAId || !m.teamBId || !m.tossWinnerId || !m.tossDecision) return null;
  if (inningsNo !== 1 && inningsNo !== 2) return null;
  const loser = m.tossWinnerId === m.teamAId ? m.teamBId : m.teamAId;
  const firstBat = m.tossDecision === 'bat' ? m.tossWinnerId : loser;
  const firstBowl = m.tossDecision === 'bat' ? loser : m.tossWinnerId;
  return inningsNo === 1 ? { batting: firstBat, bowling: firstBowl } : { batting: firstBowl, bowling: firstBat };
}

export const FINISHED_STATUSES: readonly MatchStatus[] = ['completed', 'abandoned', 'no_result', 'walkover'];
export const isFinished = (s: MatchStatus): boolean => FINISHED_STATUSES.includes(s);
export const isLive = (s: MatchStatus): boolean => s === 'live' || s === 'innings_break';

const LABELS: Record<MatchStatus, string> = {
  scheduled: 'Upcoming',
  toss: 'Toss done',
  live: 'LIVE',
  innings_break: 'Innings break',
  completed: 'Completed',
  abandoned: 'Abandoned',
  no_result: 'No result',
  walkover: 'Walkover',
};
export const statusLabel = (s: MatchStatus): string => LABELS[s];
export const statusTone = (s: MatchStatus): 'neutral' | 'success' | 'live' | 'warning' =>
  s === 'live' ? 'live' : s === 'completed' || s === 'walkover' ? 'success' : s === 'innings_break' ? 'warning' : 'neutral';

export const teamName = (m: Pick<MatchSummary, 'teamAId' | 'teamBId' | 'teamA' | 'teamB'>, id: string | null): string =>
  id && id === m.teamAId ? (m.teamA?.name ?? 'Team A') : id && id === m.teamBId ? (m.teamB?.name ?? 'Team B') : 'TBD';

export const teamOf = (m: Pick<MatchSummary, 'teamAId' | 'teamB' | 'teamA'>, id: string | null) =>
  id && id === m.teamAId ? m.teamA : m.teamB;

/** Player id -> name for everyone in the match XIs. */
export function playerNames(players: readonly MatchPlayerRow[]): (id: string | null | undefined) => string {
  const map = new Map(players.map((p) => [p.playerId, p.player.name]));
  return (id) => (id ? (map.get(id) ?? 'Unknown') : '—');
}

export const xiOf = (m: Pick<MatchDetail, 'players'>, teamId: string): MatchPlayerRow[] =>
  m.players
    .filter((p) => p.teamId === teamId)
    .sort((a, b) => (a.battingPosition ?? 99) - (b.battingPosition ?? 99));

/** What the scorer should do next, in order. Drives the match hub buttons. */
export type NextStep = 'waiting' | 'xi' | 'toss' | 'startInnings' | 'score' | 'done';

export function nextStep(m: MatchDetail): NextStep {
  if (isFinished(m.status)) return 'done';
  // playoff slot still waiting for earlier results
  if (!m.teamAId || !m.teamBId) return 'waiting';
  const sizeA = m.players.filter((p) => p.teamId === m.teamAId).length;
  const sizeB = m.players.filter((p) => p.teamId === m.teamBId).length;
  if (sizeA < 2 || sizeB < 2) return 'xi';
  if (!m.tossWinnerId) return 'toss';
  const current = m.innings.find((i) => i.inningsNo === m.currentInningsNo);
  if (m.currentInningsNo === 0 || !current) return 'startInnings';
  if (current.status === 'inProgress') return 'score';
  return m.currentInningsNo < 2 ? 'startInnings' : 'done';
}

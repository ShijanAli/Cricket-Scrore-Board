import { describe, expect, it } from 'vitest';
import { EngineError } from '../errors';
import { formatNrr, oversFromBalls } from '../format';
import { computeStandings, netRunRate, type MatchOutcome } from '../tournament/standings';

const inn = (teamId: string, runs: number, ballsFaced: number, allOut = false) => ({
  teamId,
  runs,
  ballsFaced,
  allOut,
});

const m1: MatchOutcome = {
  matchId: 'm1',
  teamAId: 'A',
  teamBId: 'B',
  status: 'completed',
  winnerTeamId: 'A',
  innings: [inn('A', 100, 60), inn('B', 90, 54, true)], // B all out: counts as the full 60 balls
  maxBalls: 60,
};
const m2: MatchOutcome = {
  matchId: 'm2',
  teamAId: 'B',
  teamBId: 'C',
  status: 'completed',
  winnerTeamId: 'B',
  innings: [inn('B', 120, 60), inn('C', 100, 55, true)],
  maxBalls: 60,
};

describe('netRunRate', () => {
  it('uses full quota when a team is all out', () => {
    expect(netRunRate([m1], 'A')).toBeCloseTo(1, 6);
    expect(netRunRate([m1], 'B')).toBeCloseTo(-1, 6);
  });

  it('accumulates over matches', () => {
    // B: for 210 / 20 ov = 10.5, against 200 / 20 ov = 10  => 0.5
    expect(netRunRate([m1, m2], 'B')).toBeCloseTo(0.5, 6);
  });

  it('ignores no-result and walkover matches, and teams with no matches', () => {
    const nr: MatchOutcome = { ...m1, matchId: 'x', status: 'noResult', winnerTeamId: null, innings: null };
    expect(netRunRate([nr], 'A')).toBe(0);
    expect(netRunRate([m1], 'Z')).toBe(0);
  });
});

describe('computeStandings', () => {
  it('ranks by points, then wins, then NRR', () => {
    const table = computeStandings(['A', 'B', 'C'], [m1, m2]);
    expect(table.map((r) => r.teamId)).toEqual(['A', 'B', 'C']);
    expect(table[0]).toMatchObject({ played: 1, won: 1, points: 2, rank: 1 });
    expect(table[1]).toMatchObject({ played: 2, won: 1, lost: 1, points: 2, rank: 2 });
    expect(table[2]).toMatchObject({ played: 1, lost: 1, points: 0, rank: 3 });
  });

  it('tie and no-result give points to both teams', () => {
    const tie: MatchOutcome = {
      matchId: 't',
      teamAId: 'A',
      teamBId: 'B',
      status: 'tie',
      winnerTeamId: null,
      innings: [inn('A', 50, 60), inn('B', 50, 60)],
      maxBalls: 60,
    };
    const nr: MatchOutcome = { ...tie, matchId: 'n', status: 'noResult', innings: null };
    const [a] = computeStandings(['A', 'B'], [tie, nr]);
    expect(a).toMatchObject({ played: 2, tied: 1, noResult: 1, points: 2 });
  });

  it('walkover awards a win but does not touch NRR', () => {
    const w: MatchOutcome = {
      matchId: 'w',
      teamAId: 'A',
      teamBId: 'B',
      status: 'walkover',
      winnerTeamId: 'B',
      innings: null,
      maxBalls: 60,
    };
    const table = computeStandings(['A', 'B'], [w]);
    expect(table[0]).toMatchObject({ teamId: 'B', won: 1, points: 2, nrr: 0 });
  });

  it('honours custom points and tiebreak order', () => {
    const table = computeStandings(['A', 'B', 'C'], [m1, m2], {
      points: { win: 3, tie: 1, noResult: 1, loss: 0 },
      tiebreakers: ['points', 'nrr'],
    });
    expect(table[0]!.points).toBe(3);
  });

  it('a completed match without a winner is an error', () => {
    expect(() => computeStandings(['A', 'B'], [{ ...m1, winnerTeamId: null }])).toThrowError(EngineError);
  });

  it('ignores matches for teams outside the table', () => {
    const table = computeStandings(['A', 'C'], [m1]);
    expect(table.every((r) => r.played === 0)).toBe(true);
  });

  it('returns a stable order for teams that are level on everything', () => {
    const table = computeStandings(['C', 'B', 'A'], []);
    expect(table.map((r) => r.teamId)).toEqual(['A', 'B', 'C']);
  });
});

describe('format helpers', () => {
  it('formats overs and NRR', () => {
    expect(oversFromBalls(56)).toBe('9.2');
    expect(oversFromBalls(0)).toBe('0.0');
    expect(formatNrr(0.5)).toBe('+0.500');
    expect(formatNrr(-1.23456)).toBe('-1.235');
    expect(formatNrr(0)).toBe('0.000');
  });
});

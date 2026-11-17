import { describe, expect, it } from 'vitest';
import { createInnings } from '@cricket/engine';
import { matchRulesSchema, type InningsState } from '@cricket/shared';
import { toOutcome, type FinishedMatchRow } from '../modules/tournaments/standings';

const rules = matchRulesSchema.parse({ oversPerInnings: 2, playersPerSide: 4 });
const snap = (team: string, patch: Partial<InningsState>): InningsState => ({
  ...createInnings(
    { battingTeamId: team, bowlingTeamId: 'X', strikerId: 's', nonStrikerId: 'n', bowlerId: 'b' },
    rules,
  ),
  ...patch,
});

const row = (patch: Partial<FinishedMatchRow>): FinishedMatchRow => ({
  id: 'm1',
  status: 'completed',
  resultType: 'won_by_runs',
  teamAId: 'A',
  teamBId: 'B',
  winnerId: 'A',
  innings: [
    { inningsNo: 2, snapshot: snap('B', { runs: 20, legalBalls: 12, completedReason: 'oversDone', status: 'completed' }) },
    { inningsNo: 1, snapshot: snap('A', { runs: 30, legalBalls: 12, completedReason: 'oversDone', status: 'completed' }) },
  ],
  ...patch,
});

describe('toOutcome', () => {
  it('maps a decided match and orders innings by number', () => {
    const o = toOutcome(row({}), rules)!;
    expect(o.status).toBe('completed');
    expect(o.winnerTeamId).toBe('A');
    expect(o.innings![0]).toMatchObject({ teamId: 'A', runs: 30, ballsFaced: 12, allOut: false });
    expect(o.innings![1]).toMatchObject({ teamId: 'B', runs: 20 });
    expect(o.maxBalls).toBe(12);
  });

  it('flags an all-out innings (NRR then uses the full quota)', () => {
    const o = toOutcome(
      row({
        innings: [
          { inningsNo: 1, snapshot: snap('A', { runs: 30, legalBalls: 12, status: 'completed', completedReason: 'oversDone' }) },
          { inningsNo: 2, snapshot: snap('B', { runs: 20, legalBalls: 8, status: 'completed', completedReason: 'allOut' }) },
        ],
      }),
      rules,
    )!;
    expect(o.innings![1].allOut).toBe(true);
  });

  it('maps a tie', () => {
    const o = toOutcome(row({ resultType: 'tie', winnerId: null }), rules)!;
    expect(o).toMatchObject({ status: 'tie', winnerTeamId: null });
  });

  it('maps walkover, no result and abandoned without innings', () => {
    expect(toOutcome(row({ status: 'walkover', resultType: 'walkover', innings: [] }), rules)).toMatchObject({
      status: 'walkover', winnerTeamId: 'A', innings: null,
    });
    expect(toOutcome(row({ status: 'no_result', winnerId: null, innings: [] }), rules)?.status).toBe('noResult');
    expect(toOutcome(row({ status: 'abandoned', winnerId: null, innings: [] }), rules)?.status).toBe('abandoned');
  });

  it('skips matches that do not count yet', () => {
    expect(toOutcome(row({ status: 'live' }), rules)).toBeNull();
    expect(toOutcome(row({ teamBId: null }), rules)).toBeNull();
    expect(toOutcome(row({ innings: [] }), rules)).toBeNull();
    expect(toOutcome(row({ winnerId: null }), rules)).toBeNull();
    expect(toOutcome(row({ status: 'walkover', winnerId: null, innings: [] }), rules)).toBeNull();
  });
});

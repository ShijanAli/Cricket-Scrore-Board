import { describe, expect, it } from 'vitest';
import { createInnings } from '@cricket/engine';
import { matchRulesSchema, type InningsState } from '@cricket/shared';
import { deriveProgress } from '../modules/matches/progress';

const rules = matchRulesSchema.parse({ oversPerInnings: 2, playersPerSide: 4 });
const innings = (team: 'A' | 'B', patch: Partial<InningsState> = {}): InningsState => ({
  ...createInnings(
    {
      battingTeamId: team,
      bowlingTeamId: team === 'A' ? 'B' : 'A',
      strikerId: `${team}1`,
      nonStrikerId: `${team}2`,
      bowlerId: `${team === 'A' ? 'B' : 'A'}1`,
    },
    rules,
  ),
  ...patch,
});

describe('deriveProgress', () => {
  it('before the first innings the match is at the toss', () => {
    expect(deriveProgress(null, null)).toEqual({ status: 'toss', result: null });
  });

  it('first innings in progress is live', () => {
    expect(deriveProgress(innings('A'), null).status).toBe('live');
  });

  it('first innings finished, second not started: innings break', () => {
    const first = innings('A', { status: 'completed', completedReason: 'oversDone', runs: 30 });
    expect(deriveProgress(first, null)).toEqual({ status: 'innings_break', result: null });
  });

  it('second innings in progress is live', () => {
    const first = innings('A', { status: 'completed', completedReason: 'oversDone', runs: 30 });
    expect(deriveProgress(first, innings('B', { target: 31, runs: 10 }))).toEqual({ status: 'live', result: null });
  });

  it('chasing side wins by wickets in hand', () => {
    const first = innings('A', { status: 'completed', completedReason: 'oversDone', runs: 30 });
    const second = innings('B', { status: 'completed', completedReason: 'targetReached', runs: 31, wickets: 1, target: 31 });
    const p = deriveProgress(first, second);
    expect(p.status).toBe('completed');
    expect(p.result).toEqual({ type: 'won_by_wickets', winnerTeamId: 'B', margin: 2 });
  });

  it('defending side wins by runs', () => {
    const first = innings('A', { status: 'completed', completedReason: 'oversDone', runs: 30 });
    const second = innings('B', { status: 'completed', completedReason: 'oversDone', runs: 25, target: 31 });
    expect(deriveProgress(first, second).result).toEqual({ type: 'won_by_runs', winnerTeamId: 'A', margin: 5 });
  });

  it('equal scores is a tie', () => {
    const first = innings('A', { status: 'completed', completedReason: 'oversDone', runs: 30 });
    const second = innings('B', { status: 'completed', completedReason: 'oversDone', runs: 30, target: 31 });
    expect(deriveProgress(first, second).result?.type).toBe('tie');
  });
});

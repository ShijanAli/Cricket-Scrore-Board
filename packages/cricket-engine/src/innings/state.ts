import type { InningsSetup, InningsState, MatchRules } from '@cricket/shared';
import { EngineError } from '../errors';

export const cloneState = (s: InningsState): InningsState => JSON.parse(JSON.stringify(s));

export function createInnings(
  setup: InningsSetup,
  rules: MatchRules,
  target: number | null = null,
): InningsState {
  if (setup.strikerId === setup.nonStrikerId) {
    throw new EngineError('INVALID_SETUP', 'Striker and non-striker must be different players');
  }
  if (setup.battingTeamId === setup.bowlingTeamId) {
    throw new EngineError('INVALID_SETUP', 'Batting and bowling team must be different');
  }
  return {
    battingTeamId: setup.battingTeamId,
    bowlingTeamId: setup.bowlingTeamId,
    strikerId: setup.strikerId,
    nonStrikerId: setup.nonStrikerId,
    bowlerId: setup.bowlerId,
    previousBowlerId: null,
    runs: 0,
    wickets: 0,
    legalBalls: 0,
    extras: { wide: 0, noBall: 0, bye: 0, legBye: 0 },
    batters: {
      [setup.strikerId]: newBatter(setup.strikerId),
      [setup.nonStrikerId]: newBatter(setup.nonStrikerId),
    },
    battingOrder: [setup.strikerId, setup.nonStrikerId],
    bowlers: { [setup.bowlerId]: newBowler(setup.bowlerId) },
    thisOver: [],
    fallOfWickets: [],
    partnership: { runs: 0, balls: 0 },
    freeHit: false,
    needsNewBatter: false,
    needsNewBowler: false,
    status: 'inProgress',
    completedReason: null,
    target,
    maxWickets: rules.lastManStands ? rules.playersPerSide : rules.playersPerSide - 1,
    maxBalls: rules.oversPerInnings * rules.ballsPerOver,
    ballsPerOver: rules.ballsPerOver,
  };
}

export const newBatter = (id: string) => ({
  id,
  runs: 0,
  balls: 0,
  fours: 0,
  sixes: 0,
  status: 'batting' as const,
});

export const newBowler = (id: string) => ({
  id,
  legalBalls: 0,
  runs: 0,
  wickets: 0,
  wides: 0,
  noBalls: 0,
  maidens: 0,
  currentOverRuns: 0,
});

/**
 * Swap the batters' ends. Only when both are at the crease, or when one end is
 * vacant waiting for a new batter (the vacancy moves with the swap so the new
 * batter fills the right end). A lone last-man-stands batter never swaps.
 */
export function swapEnds(s: InningsState): void {
  const bothAtCrease = s.strikerId !== null && s.nonStrikerId !== null;
  if (bothAtCrease || s.needsNewBatter) {
    [s.strikerId, s.nonStrikerId] = [s.nonStrikerId, s.strikerId];
  }
}

export function completeIfDone(s: InningsState): void {
  if (s.status === 'completed') return;
  let reason: InningsState['completedReason'] = null;
  if (s.target !== null && s.runs >= s.target) reason = 'targetReached';
  else if (s.wickets >= s.maxWickets) reason = 'allOut';
  else if (s.legalBalls >= s.maxBalls) reason = 'oversDone';
  if (reason) {
    s.status = 'completed';
    s.completedReason = reason;
    s.needsNewBatter = false;
    s.needsNewBowler = false;
  }
}

/**
 * Called after a batter leaves because of a wicket. Decides whether a new batter is
 * needed, or (last man stands) the survivor continues alone.
 */
export function afterWicket(s: InningsState, rules: MatchRules): void {
  if (s.wickets >= s.maxWickets) return; // completeIfDone ends the innings
  if (s.wickets <= rules.playersPerSide - 2) {
    s.needsNewBatter = true;
    return;
  }
  // Last man stands: one batter left, nobody to come in.
  if (s.strikerId === null) {
    s.strikerId = s.nonStrikerId;
    s.nonStrikerId = null;
  }
}

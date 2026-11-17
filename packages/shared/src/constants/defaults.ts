import type { MatchRules } from '../schemas/rules.schema';

export const DEFAULT_MATCH_RULES: MatchRules = {
  oversPerInnings: 20,
  ballsPerOver: 6,
  maxOversPerBowler: null,
  playersPerSide: 11,
  wideRuns: 1,
  noBallRuns: 1,
  freeHitOnNoBall: true,
  allowByes: true,
  allowLegByes: true,
  lastManStands: false,
};

export const DEFAULT_POINTS = { win: 2, tie: 1, noResult: 1, loss: 0 } as const;

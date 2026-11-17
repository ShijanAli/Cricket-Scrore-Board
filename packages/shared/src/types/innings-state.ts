import type { WicketType } from '../constants/enums';

export interface DismissalInfo {
  type: WicketType | 'retiredOut';
  bowlerId?: string;
  fielderId?: string;
}

export interface BatterStats {
  id: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  status: 'batting' | 'out' | 'retiredHurt';
  out?: DismissalInfo;
}

export interface BowlerStats {
  id: string;
  legalBalls: number;
  runs: number;
  wickets: number;
  wides: number;
  noBalls: number;
  maidens: number;
  /** Runs conceded in the current over, used for maiden detection. */
  currentOverRuns: number;
}

export interface BallLog {
  eventId: string;
  /** Display label: "0", "4", "W", "Wd", "Wd+2", "Nb", "Nb+4", "1b", "2lb" ... */
  label: string;
  totalRuns: number;
  legal: boolean;
  isWicket: boolean;
}

export interface FallOfWicket {
  wicketNo: number;
  teamRuns: number;
  legalBalls: number;
  batterId: string;
}

export interface Extras {
  wide: number;
  noBall: number;
  bye: number;
  legBye: number;
}

export interface InningsState {
  battingTeamId: string;
  bowlingTeamId: string;
  strikerId: string | null;
  nonStrikerId: string | null;
  bowlerId: string | null;
  previousBowlerId: string | null;
  runs: number;
  wickets: number;
  legalBalls: number;
  extras: Extras;
  batters: Record<string, BatterStats>;
  /** Batter ids in the order they came to the crease. */
  battingOrder: string[];
  bowlers: Record<string, BowlerStats>;
  thisOver: BallLog[];
  fallOfWickets: FallOfWicket[];
  partnership: { runs: number; balls: number };
  freeHit: boolean;
  needsNewBatter: boolean;
  needsNewBowler: boolean;
  status: 'inProgress' | 'completed';
  completedReason: 'allOut' | 'oversDone' | 'targetReached' | null;
  /** Set for the chasing innings: runs needed to win. */
  target: number | null;
  /** Wickets that end the innings. */
  maxWickets: number;
  maxBalls: number;
  ballsPerOver: number;
}

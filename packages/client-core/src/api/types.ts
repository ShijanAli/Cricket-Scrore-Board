import type {
  BallEvent,
  InningsState,
  MatchRules,
  MatchStatus,
  PlayerRole,
  ResultType,
  ScheduleMode,
  TossDecision,
  TournamentFormat,
} from '@cricket/shared';

/** Shapes returned by apps/api. Kept in one place so screens never guess a field name. */

export interface User {
  id: string;
  name: string;
  email: string;
}

export interface AuthResult {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface Team {
  id: string;
  ownerId: string;
  name: string;
  shortName: string;
  color: string;
  logoUrl: string | null;
  contactNumber: string | null;
}

export interface TeamListItem extends Team {
  _count: { roster: number };
}

export interface Player {
  id: string;
  name: string;
  phone: string | null;
  role: PlayerRole;
  jerseyNumber: number | null;
}

export interface SquadMember {
  teamId: string;
  playerId: string;
  isCaptain: boolean;
  isViceCaptain: boolean;
  isWicketkeeper: boolean;
  player: Player;
}

export interface TeamWithRoster extends Team {
  roster: SquadMember[];
}

export interface MatchPlayerRow {
  matchId: string;
  playerId: string;
  teamId: string;
  battingPosition: number | null;
  player: Player;
}

export interface InningsRow {
  id: string;
  matchId: string;
  inningsNo: number;
  battingTeamId: string;
  bowlingTeamId: string;
  strikerId: string;
  nonStrikerId: string;
  bowlerId: string;
  target: number | null;
  status: 'inProgress' | 'completed';
  lastSeq: number;
  snapshot: InningsState | null;
}

export interface MatchSummary {
  id: string;
  type: 'single' | 'tournament' | 'series';
  ownerId: string;
  status: MatchStatus;
  teamAId: string | null;
  teamBId: string | null;
  teamA: Team | null;
  teamB: Team | null;
  scheduledDate: string | null;
  scheduledTime: string | null;
  ground: string | null;
  rules: MatchRules;
  tossWinnerId: string | null;
  tossDecision: TossDecision | null;
  currentInningsNo: number;
  resultType: ResultType | null;
  winnerId: string | null;
  resultText: string | null;
  activeScorerId: string | null;
  createdAt: string;
  /** Tournament and series matches only. */
  tournamentId?: string | null;
  seriesId?: string | null;
  matchNo?: number | null;
  stage?: string | null;
  round?: number | null;
  /** Where a TBD team comes from: a fixed team, a table position, or the winner of another match. */
  sourceA?: FixtureSource | null;
  sourceB?: FixtureSource | null;
}

export type FixtureSource =
  | { kind: 'team'; teamId: string }
  | { kind: 'standing'; position: number }
  | { kind: 'winnerOf'; matchNo: number }
  | { kind: 'groupPosition'; group: string; position: number };

export interface MatchDetail extends MatchSummary {
  players: MatchPlayerRow[];
  innings: InningsRow[];
  /** Added by GET /matches/:id */
  canScore?: boolean;
}

export interface Page<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

export interface IngestResult {
  accepted: number;
  duplicates: string[];
  lastSeq: number;
  innings: InningsState;
  matchStatus: MatchStatus;
  resultText: string | null;
}

export type StoredServerEvent = BallEvent & { seq: number };

export interface EventsResult {
  inningsNo: number;
  lastSeq: number;
  events: StoredServerEvent[];
}

// ---------- tournaments ----------
export type TournamentStatus = 'draft' | 'live' | 'completed';

export interface TournamentListItem {
  id: string;
  name: string;
  format: TournamentFormat;
  teamCount: number;
  status: TournamentStatus;
  _count: { teams: number; matches: number };
}

export interface TournamentEntry {
  tournamentId: string;
  teamId: string;
  seed: number | null;
  /** Group stage format only: "A", "B", ... */
  groupName?: string | null;
  team: Team;
}

export interface TournamentMember {
  tournamentId: string;
  userId: string;
  role: 'organiser' | 'scorer' | 'captain';
}

export interface TournamentDetail {
  id: string;
  ownerId: string;
  name: string;
  format: TournamentFormat;
  teamCount: number;
  /** Group stage format only. */
  groupCount?: number | null;
  doubleRoundRobin: boolean;
  scheduleMode: ScheduleMode;
  status: TournamentStatus;
  rules: MatchRules;
  teams: TournamentEntry[];
  members: TournamentMember[];
}

export interface StandingRowDto {
  teamId: string;
  played: number;
  won: number;
  lost: number;
  tied: number;
  noResult: number;
  points: number;
  nrr: number;
  rank: number;
  /** Group stage format: the group this row belongs to. */
  group?: string | null;
  team: Team | null;
}

// ---------- series ----------
export interface SeriesListItem {
  id: string;
  name: string;
  matchCount: number;
  status: 'live' | 'completed';
  teamA: Team;
  teamB: Team;
}

export interface SeriesDetail extends SeriesListItem {
  teamAId: string;
  teamBId: string;
  matches: MatchSummary[];
  score: { winsA: number; winsB: number; needed: number; winnerTeamId: string | null };
}

// ---------- awards ----------
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

export interface AwardTeam {
  id: string;
  name: string;
  reason?: string;
}

export interface SeriesAwards {
  matchesCounted: number;
  champion: AwardTeam | null;
  runnerUp: AwardTeam | null;
  /** "Man of the Series" or "Man of the Tournament" */
  bestPlayerTitle: string;
  bestPlayer: AwardPlayer | null;
  topRunScorer: AwardPlayer | null;
  topWicketTaker: AwardPlayer | null;
  mostSixes: AwardPlayer | null;
  /** How the best player is chosen. */
  formula: string;
}

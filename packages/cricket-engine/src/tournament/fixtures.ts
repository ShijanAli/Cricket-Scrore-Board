import type { TournamentFormat } from '@cricket/shared';
import { EngineError } from '../errors';
import { groupsKnockoutFixtures, type Group } from './groups';

export type FixtureSource =
  | { kind: 'team'; teamId: string }
  | { kind: 'standing'; position: number }
  | { kind: 'winnerOf'; matchNo: number }
  /** Finishing place inside a group (group stage + knockout format). */
  | { kind: 'groupPosition'; group: string; position: number };

export type FixtureStage =
  | 'league'
  | 'quarter_final'
  | 'semi_final'
  | 'final'
  | `round_of_${number}`
  | `group_${string}`;

export interface FixtureDraft {
  matchNo: number;
  stage: FixtureStage;
  round: number;
  a: FixtureSource;
  b: FixtureSource;
  /** matchNos that must be played before this one (so it is scheduled on a later day). */
  dependsOn: number[];
}

const team = (teamId: string): FixtureSource => ({ kind: 'team', teamId });

function assertUnique(teamIds: readonly string[]): void {
  if (new Set(teamIds).size !== teamIds.length) {
    throw new EngineError('INVALID_TEAM_COUNT', 'Team ids must be unique');
  }
}

/** Circle method. Odd team counts get a bye each round. */
export function roundRobinRounds(teamIds: readonly string[]): [string, string][][] {
  assertUnique(teamIds);
  if (teamIds.length < 2) throw new EngineError('INVALID_TEAM_COUNT', 'Need at least 2 teams');
  const teams: (string | null)[] = [...teamIds];
  if (teams.length % 2 === 1) teams.push(null);
  const n = teams.length;
  const rounds: [string, string][][] = [];
  for (let r = 0; r < n - 1; r++) {
    const pairs: [string, string][] = [];
    for (let i = 0; i < n / 2; i++) {
      const a = teams[i]!;
      const b = teams[n - 1 - i]!;
      if (a !== null && b !== null) pairs.push(r % 2 === 0 ? [a, b] : [b, a]);
    }
    rounds.push(pairs);
    const last = teams.pop()!;
    teams.splice(1, 0, last);
  }
  return rounds;
}

function leagueFixtures(teamIds: readonly string[], double: boolean): FixtureDraft[] {
  const firstLeg = roundRobinRounds(teamIds);
  const legs = double ? [firstLeg, firstLeg.map((r) => r.map(([a, b]) => [b, a] as [string, string]))] : [firstLeg];
  const drafts: FixtureDraft[] = [];
  let matchNo = 1;
  let round = 1;
  for (const leg of legs) {
    for (const pairs of leg) {
      for (const [a, b] of pairs) {
        drafts.push({ matchNo: matchNo++, stage: 'league', round, a: team(a), b: team(b), dependsOn: [] });
      }
      round++;
    }
  }
  return drafts;
}

const nextPow2 = (n: number): number => {
  let p = 1;
  while (p < n) p *= 2;
  return p;
};

/** Standard bracket seeding: [1,8,4,5,2,7,3,6] for 8. Adjacent entries meet in round 1. */
export function seedOrder(size: number): number[] {
  let order = [1];
  while (order.length < size) {
    const len = order.length * 2;
    order = order.flatMap((seed) => [seed, len + 1 - seed]);
  }
  return order;
}

const stageForSlots = (slots: number): FixtureStage =>
  slots === 2 ? 'final' : slots === 4 ? 'semi_final' : slots === 8 ? 'quarter_final' : `round_of_${slots}`;

/** teamIds are in seed order (index 0 = top seed). Top seeds get byes when count is not a power of 2. */
export function knockoutFixtures(teamIds: readonly string[]): FixtureDraft[] {
  assertUnique(teamIds);
  const n = teamIds.length;
  if (n < 2) throw new EngineError('INVALID_TEAM_COUNT', 'Need at least 2 teams');
  const size = nextPow2(n);
  let slots: (FixtureSource | null)[] = seedOrder(size).map((seed) =>
    seed <= n ? team(teamIds[seed - 1]!) : null,
  );
  const drafts: FixtureDraft[] = [];
  let matchNo = 1;
  let round = 1;
  while (slots.length > 1) {
    const stage = stageForSlots(slots.length);
    const next: FixtureSource[] = [];
    for (let i = 0; i < slots.length; i += 2) {
      const a = slots[i] ?? null;
      const b = slots[i + 1] ?? null;
      if (a && b) {
        const dependsOn = [a, b].flatMap((x) => (x.kind === 'winnerOf' ? [x.matchNo] : []));
        drafts.push({ matchNo, stage, round, a, b, dependsOn });
        next.push({ kind: 'winnerOf', matchNo });
        matchNo++;
      } else {
        next.push((a ?? b)!); // bye
      }
    }
    slots = next;
    round++;
  }
  return drafts;
}

export interface FixtureOptions {
  doubleRoundRobin?: boolean;
  /** Group stage format: the draw (see drawGroups). */
  groups?: readonly Group[];
}

export function generateFixtures(
  teamIds: readonly string[],
  format: TournamentFormat,
  options: FixtureOptions = {},
): FixtureDraft[] {
  if (format === 'knockout') return knockoutFixtures(teamIds);
  if (format === 'groups_knockout') {
    if (!options.groups) throw new EngineError('INVALID_TEAM_COUNT', 'Groups are required for this format');
    return groupsKnockoutFixtures(options.groups, options.doubleRoundRobin ?? false);
  }

  const league = leagueFixtures(teamIds, options.doubleRoundRobin ?? false);
  if (format === 'league') return league;

  const leagueNos = league.map((m) => m.matchNo);
  const lastRound = league[league.length - 1]!.round;
  let matchNo = league.length + 1;

  if (format === 'league_final') {
    return [
      ...league,
      {
        matchNo,
        stage: 'final',
        round: lastRound + 1,
        a: { kind: 'standing', position: 1 },
        b: { kind: 'standing', position: 2 },
        dependsOn: leagueNos,
      },
    ];
  }

  // league_semi_final
  if (teamIds.length < 4) throw new EngineError('INVALID_TEAM_COUNT', 'Semi-finals need at least 4 teams');
  const semi1 = matchNo++;
  const semi2 = matchNo++;
  const final = matchNo;
  return [
    ...league,
    {
      matchNo: semi1,
      stage: 'semi_final',
      round: lastRound + 1,
      a: { kind: 'standing', position: 1 },
      b: { kind: 'standing', position: 4 },
      dependsOn: leagueNos,
    },
    {
      matchNo: semi2,
      stage: 'semi_final',
      round: lastRound + 1,
      a: { kind: 'standing', position: 2 },
      b: { kind: 'standing', position: 3 },
      dependsOn: leagueNos,
    },
    {
      matchNo: final,
      stage: 'final',
      round: lastRound + 2,
      a: { kind: 'winnerOf', matchNo: semi1 },
      b: { kind: 'winnerOf', matchNo: semi2 },
      dependsOn: [semi1, semi2],
    },
  ];
}

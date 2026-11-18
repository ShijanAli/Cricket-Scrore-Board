import { EngineError } from '../errors';
import { roundRobinRounds, type FixtureDraft, type FixtureSource, type FixtureStage } from './fixtures';

export interface Group {
  /** "A", "B", ... */
  name: string;
  teamIds: string[];
}

export const groupLetter = (index: number): string => String.fromCharCode(65 + index);
export const groupStage = (name: string): FixtureStage => `group_${name}`;
/** "group_A" -> "A", anything else -> null. */
export const groupOfStage = (stage: string | null | undefined): string | null => {
  const m = /^group_([A-Z])$/.exec(stage ?? '');
  return m ? m[1]! : null;
};

const ALLOWED = [2, 4, 8];

/**
 * Seeded snake draw: teams in seed order go A, B, C, D, then D, C, B, A, ... so every group
 * gets a similar mix of strong and weak teams. Group sizes differ by at most one.
 */
export function drawGroups(teamIds: readonly string[], groupCount: number): Group[] {
  if (!ALLOWED.includes(groupCount)) {
    throw new EngineError('INVALID_TEAM_COUNT', 'Use 2, 4 or 8 groups');
  }
  if (new Set(teamIds).size !== teamIds.length) throw new EngineError('INVALID_TEAM_COUNT', 'Team ids must be unique');
  if (teamIds.length < groupCount * 2) {
    throw new EngineError('INVALID_TEAM_COUNT', `Need at least ${groupCount * 2} teams for ${groupCount} groups`);
  }
  const groups: Group[] = Array.from({ length: groupCount }, (_, i) => ({ name: groupLetter(i), teamIds: [] }));
  teamIds.forEach((id, i) => {
    const row = Math.floor(i / groupCount);
    const col = i % groupCount;
    groups[row % 2 === 0 ? col : groupCount - 1 - col]!.teamIds.push(id);
  });
  return groups;
}

/** Checks a hand-made draw: right number of groups named A.., 2+ teams each, nobody twice. */
export function assertValidGroups(groups: readonly Group[], groupCount: number): void {
  if (groups.length !== groupCount) throw new EngineError('INVALID_TEAM_COUNT', `Expected ${groupCount} groups`);
  const seen = new Set<string>();
  groups.forEach((g, i) => {
    if (g.name !== groupLetter(i)) throw new EngineError('INVALID_TEAM_COUNT', 'Groups must be named A, B, C...');
    if (g.teamIds.length < 2) throw new EngineError('INVALID_TEAM_COUNT', `Group ${g.name} needs at least 2 teams`);
    for (const id of g.teamIds) {
      if (seen.has(id)) throw new EngineError('INVALID_TEAM_COUNT', 'A team is in two groups');
      seen.add(id);
    }
  });
}

const team = (teamId: string): FixtureSource => ({ kind: 'team', teamId });
const pos = (group: string, position: number): FixtureSource => ({ kind: 'groupPosition', group, position });

/** Every group is a round robin. Rounds are interleaved across groups so all groups play at the same pace. */
function groupStageFixtures(groups: readonly Group[], double: boolean): FixtureDraft[] {
  const legsOf = groups.map((g) => {
    const first = roundRobinRounds(g.teamIds);
    return double ? [...first, ...first.map((r) => r.map(([a, b]) => [b, a] as [string, string]))] : first;
  });
  const maxRounds = Math.max(...legsOf.map((r) => r.length));
  const drafts: FixtureDraft[] = [];
  let matchNo = 1;
  for (let r = 0; r < maxRounds; r++) {
    groups.forEach((g, gi) => {
      for (const [a, b] of legsOf[gi]![r] ?? []) {
        drafts.push({ matchNo: matchNo++, stage: groupStage(g.name), round: r + 1, a: team(a), b: team(b), dependsOn: [] });
      }
    });
  }
  return drafts;
}

const stageForSlots = (slots: number): FixtureStage =>
  slots === 2 ? 'final' : slots === 4 ? 'semi_final' : slots === 8 ? 'quarter_final' : `round_of_${slots}`;

/**
 * Winners and runners-up of each group meet crosswise: 1A v 2B, 1C v 2D, 1B v 2A, 1D v 2C.
 * Teams from the same group can only meet again in the final.
 */
export function groupsKnockoutFixtures(groups: readonly Group[], double = false): FixtureDraft[] {
  const groupDrafts = groupStageFixtures(groups, double);
  const groupNos = groupDrafts.map((d) => d.matchNo);
  let round = Math.max(...groupDrafts.map((d) => d.round)) + 1;
  let matchNo = groupDrafts.length + 1;

  const first: [FixtureSource, FixtureSource][] = [];
  for (let g = 0; g < groups.length; g += 2) first.push([pos(groups[g]!.name, 1), pos(groups[g + 1]!.name, 2)]);
  for (let g = 0; g < groups.length; g += 2) first.push([pos(groups[g + 1]!.name, 1), pos(groups[g]!.name, 2)]);

  const drafts = [...groupDrafts];
  let pairs: [FixtureSource, FixtureSource][] = first;
  let firstRound = true;
  while (pairs.length >= 1) {
    const stage = stageForSlots(pairs.length * 2);
    const winners: FixtureSource[] = [];
    for (const [a, b] of pairs) {
      const dependsOn = firstRound ? groupNos : [a, b].flatMap((x) => (x.kind === 'winnerOf' ? [x.matchNo] : []));
      drafts.push({ matchNo, stage, round, a, b, dependsOn });
      winners.push({ kind: 'winnerOf', matchNo });
      matchNo++;
    }
    if (pairs.length === 1) break;
    pairs = Array.from({ length: winners.length / 2 }, (_, i) => [winners[2 * i]!, winners[2 * i + 1]!] as [FixtureSource, FixtureSource]);
    firstRound = false;
    round++;
  }
  return drafts;
}

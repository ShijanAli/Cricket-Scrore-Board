import type { FixtureSource, MatchSummary } from '@/api/types';
import { teamName } from './match-utils';

const ordinal = (n: number): string => {
  const v = n % 100;
  if (v >= 11 && v <= 13) return `${n}th`;
  return `${n}${({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[n % 10] ?? 'th'}`;
};

/** Name of a side, or what it will be once earlier results are in ("1st in table", "Winner of match 7"). */
export function sideLabel(m: MatchSummary, side: 'A' | 'B'): string {
  const id = side === 'A' ? m.teamAId : m.teamBId;
  if (id) return teamName(m, id);
  const source: FixtureSource | null | undefined = side === 'A' ? m.sourceA : m.sourceB;
  if (source?.kind === 'standing') return `${ordinal(source.position)} in table`;
  if (source?.kind === 'winnerOf') return `Winner of match ${source.matchNo}`;
  return 'TBD';
}

export function stageLabel(stage: string | null | undefined): string {
  if (!stage || stage === 'league') return 'League';
  if (stage === 'quarter_final') return 'Quarter-finals';
  if (stage === 'semi_final') return 'Semi-finals';
  if (stage === 'final') return 'Final';
  const round = /^round_of_(\d+)$/.exec(stage);
  return round ? `Round of ${round[1]}` : stage;
}

export interface FixtureGroup {
  stage: string;
  label: string;
  matches: MatchSummary[];
}

/** Group fixtures by stage, keeping the order of the first match of each stage. */
export function groupByStage(fixtures: readonly MatchSummary[]): FixtureGroup[] {
  const sorted = [...fixtures].sort((a, b) => (a.matchNo ?? 0) - (b.matchNo ?? 0));
  const groups: FixtureGroup[] = [];
  for (const m of sorted) {
    const stage = m.stage ?? 'league';
    let g = groups.find((x) => x.stage === stage);
    if (!g) {
      g = { stage, label: stageLabel(stage), matches: [] };
      groups.push(g);
    }
    g.matches.push(m);
  }
  return groups;
}

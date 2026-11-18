import { defaultMaxOversPerBowler } from '@cricket/engine';
import { GROUP_COUNTS, matchRulesSchema, updateTournamentSchema, type NoticeKind, type UpdateTournamentInput } from '@cricket/shared';
import type { TournamentDetail, TournamentNotice, TournamentStatus } from '../api/types';

/** What the organiser can still change, by tournament status. */
export interface EditScope {
  /** Name, points and tiebreakers. */
  basics: boolean;
  /** Overs, players per side. In a running tournament these apply to matches that have not started. */
  rules: boolean;
  /** Team count, groups, round-robin type: only before fixtures exist. */
  structure: boolean;
}

export function editScope(status: TournamentStatus): EditScope {
  if (status === 'draft') return { basics: true, rules: true, structure: true };
  if (status === 'completed') return { basics: false, rules: false, structure: false };
  return { basics: true, rules: true, structure: false };
}

export interface SettingsDraft {
  name: string;
  overs: number;
  /** 0 = no limit. */
  maxOversPerBowler: number;
  playersPerSide: number;
  win: number;
  tie: number;
  noResult: number;
  loss: number;
  teamCount: number;
  groupCount: number;
  doubleRoundRobin: boolean;
}

export function settingsDraftFrom(t: TournamentDetail): SettingsDraft {
  return {
    name: t.name,
    overs: t.rules.oversPerInnings,
    maxOversPerBowler: t.rules.maxOversPerBowler ?? 0,
    playersPerSide: t.rules.playersPerSide,
    win: t.points?.win ?? 2,
    tie: t.points?.tie ?? 1,
    noResult: t.points?.noResult ?? 1,
    loss: t.points?.loss ?? 0,
    teamCount: t.teamCount,
    groupCount: t.groupCount ?? 4,
    doubleRoundRobin: t.doubleRoundRobin,
  };
}

export type SettingsResult =
  | { ok: true; changes: UpdateTournamentInput | null }
  | { ok: false; errors: Record<string, string> };

/**
 * Compare the draft with the saved tournament and build a PATCH body holding only what changed.
 * `changes: null` means nothing changed. Validated with the shared schema the server uses.
 */
export function buildTournamentUpdate(d: SettingsDraft, t: TournamentDetail): SettingsResult {
  const scope = editScope(t.status);
  const body: Record<string, unknown> = {};

  if (scope.basics) {
    if (d.name.trim() !== t.name) body.name = d.name.trim();
    const pointsChanged = d.win !== t.points?.win || d.tie !== t.points?.tie || d.noResult !== t.points?.noResult || d.loss !== t.points?.loss;
    if (pointsChanged) body.points = { win: d.win, tie: d.tie, noResult: d.noResult, loss: d.loss };
  }
  if (scope.rules) {
    const oversChanged = d.overs !== t.rules.oversPerInnings;
    const savedCap = t.rules.maxOversPerBowler ?? 0;
    const capEdited = d.maxOversPerBowler !== savedCap;
    // An explicit cap wins. Otherwise keep the saved one, unless the overs changed (then re-derive it).
    const capValue = capEdited ? d.maxOversPerBowler : oversChanged ? defaultMaxOversPerBowler(d.overs) : savedCap;
    if (oversChanged || capEdited || d.playersPerSide !== t.rules.playersPerSide) {
      body.rules = { ...t.rules, oversPerInnings: d.overs, playersPerSide: d.playersPerSide, maxOversPerBowler: capValue === 0 ? null : capValue };
    }
  }
  if (scope.structure) {
    if (d.teamCount !== t.teamCount) body.teamCount = d.teamCount;
    if (t.format === 'groups_knockout' && d.groupCount !== t.groupCount) body.groupCount = d.groupCount;
    if (d.doubleRoundRobin !== t.doubleRoundRobin) body.doubleRoundRobin = d.doubleRoundRobin;
  }

  if (Object.keys(body).length === 0) return { ok: true, changes: null };

  const errors: Record<string, string> = {};
  if (body.rules) {
    const r = matchRulesSchema.safeParse(body.rules);
    if (!r.success) for (const i of r.error.issues) errors[String(i.path[0] ?? 'overs') === 'oversPerInnings' ? 'overs' : String(i.path[0] ?? 'rules')] ??= i.message;
  }
  if (body.groupCount !== undefined && !GROUP_COUNTS.includes(body.groupCount as (typeof GROUP_COUNTS)[number])) {
    errors.groupCount = 'Choose 2, 4 or 8 groups';
  }
  const parsed = updateTournamentSchema.safeParse(body);
  if (!parsed.success) {
    for (const i of parsed.error.issues) {
      const k = String(i.path[0] ?? 'form');
      errors[k === 'rules' ? 'overs' : k] ??= i.message;
    }
  }
  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, changes: (parsed as { data: UpdateTournamentInput }).data };
}

// ---------------------------------------------------------------------------
// Notices
// ---------------------------------------------------------------------------

export const NOTICE_LABEL: Record<NoticeKind, string> = {
  info: 'Information',
  delay: 'Delay',
  weather: 'Weather',
  dispute: 'Dispute',
  rescheduled: 'Rescheduled',
  paused: 'Paused',
  resumed: 'Resumed',
  other: 'Notice',
};

/** Kinds an organiser can post by hand (pause / resume have their own buttons). */
export const POSTABLE_NOTICE_KINDS: NoticeKind[] = ['info', 'delay', 'weather', 'dispute', 'rescheduled', 'other'];

export const activeNotices = (all: readonly TournamentNotice[]) => all.filter((n) => n.active);

/** The notice to show as the big banner while play is halted. */
export const pauseNotice = (all: readonly TournamentNotice[]) => all.find((n) => n.active && n.kind === 'paused') ?? null;

/** Human line for a status chip. */
export function tournamentStatusLabel(status: TournamentStatus): string {
  return status === 'paused' ? 'Paused' : status === 'live' ? 'Live' : status === 'completed' ? 'Completed' : 'Draft';
}

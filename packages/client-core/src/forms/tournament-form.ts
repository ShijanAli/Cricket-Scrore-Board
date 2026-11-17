import { defaultMaxOversPerBowler } from '@cricket/engine';
import {
  createTournamentSchema,
  type CreateTournamentInput,
  type ScheduleMode,
  type TournamentFormat,
} from '@cricket/shared';

/** Everything the "new tournament" screen edits, as plain strings and numbers. */
export interface TournamentDraft {
  name: string;
  format: TournamentFormat;
  teamCount: number;
  doubleRoundRobin: boolean;
  scheduleMode: ScheduleMode;
  startDate: string;
  endDate: string;
  /** "09:00, 14:00" */
  slots: string;
  /** "Main ground, Nets" */
  grounds: string;
  offWeekdays: number[];
  overs: number;
  playersPerSide: number;
}

export const defaultDraft: TournamentDraft = {
  name: '',
  format: 'league_final',
  teamCount: 4,
  doubleRoundRobin: false,
  scheduleMode: 'auto',
  startDate: '',
  endDate: '',
  slots: '09:00, 14:00',
  grounds: 'Ground 1',
  offWeekdays: [],
  overs: 10,
  playersPerSide: 11,
};

const list = (s: string): string[] => s.split(/[,\n]/).map((x) => x.trim()).filter(Boolean);

export type BuildResult =
  | { ok: true; data: CreateTournamentInput }
  | { ok: false; errors: Record<string, string> };

/** Validate with the shared schema (the same one the server uses) and map issues to form fields. */
export function buildTournamentInput(d: TournamentDraft): BuildResult {
  const auto = d.scheduleMode === 'auto';
  const parsed = createTournamentSchema.safeParse({
    name: d.name,
    format: d.format,
    teamCount: d.teamCount,
    doubleRoundRobin: d.doubleRoundRobin,
    scheduleMode: d.scheduleMode,
    scheduler: auto
      ? {
          startDate: d.startDate.trim(),
          endDate: d.endDate.trim(),
          slots: list(d.slots),
          grounds: list(d.grounds),
          offWeekdays: d.offWeekdays,
        }
      : undefined,
    rules: {
      oversPerInnings: d.overs,
      playersPerSide: d.playersPerSide,
      maxOversPerBowler: defaultMaxOversPerBowler(d.overs),
    },
  });
  if (parsed.success) return { ok: true, data: parsed.data };

  const errors: Record<string, string> = {};
  for (const issue of parsed.error.issues) {
    const [a, b] = issue.path;
    const key = a === 'scheduler' && b !== undefined ? `scheduler.${String(b)}` : String(a ?? 'form');
    errors[key] ??= issue.message;
  }
  return { ok: false, errors };
}

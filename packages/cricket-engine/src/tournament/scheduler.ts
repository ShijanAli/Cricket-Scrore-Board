import type { SchedulerConfig } from '@cricket/shared';
import { formatDate, parseDate, weekdayOf } from './dates';
import type { FixtureDraft } from './fixtures';

export interface ScheduledFixture extends FixtureDraft {
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  ground: string;
}

export interface ScheduleResult {
  scheduled: ScheduledFixture[];
  /** Fixtures that did not fit in the date range (or whose dependency did not fit). */
  unscheduled: FixtureDraft[];
}

/**
 * Greedy first-fit scheduler. Deterministic: same input, same output.
 * - Fixtures are placed in matchNo order, into the earliest free day/slot/ground.
 * - A team never plays twice within `minDaysBetweenMatches` calendar days.
 * - A fixture is placed on a later day than every fixture it depends on.
 * - Off dates and off weekdays are skipped.
 */
export function scheduleFixtures(drafts: readonly FixtureDraft[], cfg: SchedulerConfig): ScheduleResult {
  const start = parseDate(cfg.startDate);
  const end = parseDate(cfg.endDate);
  const offDates = new Set(cfg.offDates.map(parseDate));
  const offWeekdays = new Set(cfg.offWeekdays);

  const days: number[] = [];
  for (let d = start; d <= end; d++) {
    if (!offDates.has(d) && !offWeekdays.has(weekdayOf(d))) days.push(d);
  }
  const slots = [...cfg.slots].sort();
  const grounds = cfg.grounds;

  const occupied = new Set<string>();
  const teamBookings = new Map<string, { day: number; slot: number }[]>();
  const placedDay = new Map<number, number>();
  const scheduled: ScheduledFixture[] = [];
  const unscheduled: FixtureDraft[] = [];

  for (const draft of [...drafts].sort((x, y) => x.matchNo - y.matchNo)) {
    const teams = [draft.a, draft.b].flatMap((s) => (s.kind === 'team' ? [s.teamId] : []));

    let earliestDay = start;
    let blocked = false;
    for (const dep of draft.dependsOn) {
      const depDay = placedDay.get(dep);
      if (depDay === undefined) {
        blocked = true;
        break;
      }
      earliestDay = Math.max(earliestDay, depDay + 1);
    }
    if (blocked) {
      unscheduled.push(draft);
      continue;
    }

    let placed = false;
    search: for (const day of days) {
      if (day < earliestDay) continue;
      for (let slotIdx = 0; slotIdx < slots.length; slotIdx++) {
        const teamsFree = teams.every((t) =>
          (teamBookings.get(t) ?? []).every((b) => {
            const diff = Math.abs(day - b.day);
            if (diff < cfg.minDaysBetweenMatches) return false;
            return !(diff === 0 && b.slot === slotIdx);
          }),
        );
        if (!teamsFree) continue;
        for (const ground of grounds) {
          const key = `${day}|${slotIdx}|${ground}`;
          if (occupied.has(key)) continue;
          occupied.add(key);
          for (const t of teams) {
            const list = teamBookings.get(t) ?? [];
            list.push({ day, slot: slotIdx });
            teamBookings.set(t, list);
          }
          placedDay.set(draft.matchNo, day);
          scheduled.push({ ...draft, date: formatDate(day), time: slots[slotIdx]!, ground });
          placed = true;
          break search;
        }
      }
    }
    if (!placed) unscheduled.push(draft);
  }

  scheduled.sort(
    (x, y) =>
      x.date.localeCompare(y.date) || x.time.localeCompare(y.time) || x.ground.localeCompare(y.ground),
  );
  return { scheduled, unscheduled };
}

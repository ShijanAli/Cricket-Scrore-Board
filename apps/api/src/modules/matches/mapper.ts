import { toDateOnly } from '../../lib/dates';

export const matchInclude = {
  teamA: true,
  teamB: true,
  players: { include: { player: true }, orderBy: { battingPosition: 'asc' as const } },
  innings: { orderBy: { inningsNo: 'asc' as const } },
} as const;

/** Convert the @db.Date column back to a plain "YYYY-MM-DD" string for the API. */
export function withDateString<T extends { scheduledDate: Date | null }>(
  match: T,
): Omit<T, 'scheduledDate'> & { scheduledDate: string | null } {
  return { ...match, scheduledDate: match.scheduledDate ? toDateOnly(match.scheduledDate) : null };
}

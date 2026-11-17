import { EngineError } from '../errors';

const DAY_MS = 86_400_000;

/** 'YYYY-MM-DD' -> whole days since 1970-01-01 (UTC, so no timezone surprises). */
export function parseDate(s: string): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) throw new EngineError('INVALID_DATE', `Invalid date: ${s}`);
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const ms = Date.UTC(y, mo - 1, d);
  const back = new Date(ms);
  if (back.getUTCFullYear() !== y || back.getUTCMonth() !== mo - 1 || back.getUTCDate() !== d) {
    throw new EngineError('INVALID_DATE', `Invalid date: ${s}`);
  }
  return Math.floor(ms / DAY_MS);
}

export const formatDate = (day: number): string => new Date(day * DAY_MS).toISOString().slice(0, 10);

/** 0 = Sunday ... 6 = Saturday */
export const weekdayOf = (day: number): number => new Date(day * DAY_MS).getUTCDay();

/** DB @db.Date columns come back as a Date at UTC midnight. The API speaks "YYYY-MM-DD" strings. */
export const toDateOnly = (d: Date): string => d.toISOString().slice(0, 10);
export const fromDateOnly = (s: string): Date => new Date(`${s}T00:00:00.000Z`);

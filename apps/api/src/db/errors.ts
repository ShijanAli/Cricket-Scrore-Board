/** Prisma error code checks without importing runtime classes (keeps services easy to unit test). */
const code = (e: unknown): string | undefined =>
  typeof e === 'object' && e !== null && 'code' in e ? String((e as { code: unknown }).code) : undefined;

export const isUniqueViolation = (e: unknown) => code(e) === 'P2002';
export const isRecordNotFound = (e: unknown) => code(e) === 'P2025';
export const isForeignKeyViolation = (e: unknown) => code(e) === 'P2003';

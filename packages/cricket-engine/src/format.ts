/** 56 legal balls with 6 per over -> "9.2" */
export function oversFromBalls(balls: number, ballsPerOver = 6): string {
  return `${Math.floor(balls / ballsPerOver)}.${balls % ballsPerOver}`;
}

/** Runs per over, 2 decimals. Returns 0 when no balls have been bowled. */
export function runRate(runs: number, balls: number, ballsPerOver = 6): number {
  if (balls <= 0) return 0;
  return (runs / balls) * ballsPerOver;
}

export function strikeRate(runs: number, balls: number): number {
  if (balls <= 0) return 0;
  return (runs / balls) * 100;
}

export function formatNrr(nrr: number): string {
  const rounded = Math.round(nrr * 1000) / 1000;
  const sign = rounded > 0 ? '+' : '';
  return `${sign}${rounded.toFixed(3)}`;
}

/** A sensible default quota: T20 -> 4, 10 overs -> 2. */
export function defaultMaxOversPerBowler(oversPerInnings: number): number {
  return Math.max(1, Math.ceil(oversPerInnings / 5));
}

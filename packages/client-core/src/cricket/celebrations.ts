import { detectCelebrations, type Celebration } from '@cricket/engine';
import type { InningsState } from '@cricket/shared';

/**
 * Turns a stream of innings snapshots (socket push, polling or the local scorer) into celebrations.
 * Framework free: web and mobile each wrap it in a tiny hook and render their own overlay.
 * - never celebrates the first snapshot it sees (page load / reconnect)
 * - never celebrates the same ball twice
 * - a big jump (tab asleep, long offline gap) is treated as a resync, not a celebration
 */
export class CelebrationTracker {
  private prev = new Map<number, InningsState>();
  private seen = new Set<string>();

  constructor(private readonly maxJumpOvers = 2) {}

  feed(innings: ReadonlyArray<{ inningsNo: number; snapshot: InningsState | null }>, limit = 3): Celebration[] {
    const out: Celebration[] = [];
    for (const { inningsNo, snapshot } of innings) {
      if (!snapshot) continue;
      const before = this.prev.get(inningsNo) ?? null;
      this.prev.set(inningsNo, snapshot);
      if (before && snapshot.legalBalls - before.legalBalls > this.maxJumpOvers * snapshot.ballsPerOver) continue;
      for (const c of detectCelebrations(before, snapshot)) {
        if (this.seen.has(c.key)) continue;
        this.seen.add(c.key);
        out.push(c);
      }
    }
    if (this.seen.size > 500) this.seen = new Set([...this.seen].slice(-200));
    return out.slice(0, limit);
  }

  reset(): void {
    this.prev.clear();
    this.seen.clear();
  }
}

export interface CelebrationView {
  title: string;
  subtitle: string;
  emoji: string;
  tone: 'gold' | 'red' | 'green' | 'blue';
  durationMs: number;
  /** Big moments get confetti. */
  confetti: boolean;
}

export interface CelebrationLookup {
  playerName: (id: string | undefined) => string;
  teamName: (id: string) => string;
}

/** The one place the celebration wording lives, so web and mobile say the same thing. */
export function celebrationView(c: Celebration, who: CelebrationLookup): CelebrationView {
  const player = who.playerName(c.playerId);
  const team = who.teamName(c.teamId);
  switch (c.kind) {
    case 'team_milestone':
      return { title: `${c.value} UP!`, subtitle: `${team} reach ${c.value}`, emoji: '🎉', tone: 'gold', durationMs: 3500, confetti: true };
    case 'player_milestone': {
      const v = c.value ?? 50;
      const title = v === 100 ? 'CENTURY!' : v === 50 ? 'FIFTY!' : `${v}!`;
      return { title, subtitle: `${player} reaches ${v}`, emoji: v >= 100 ? '🏆' : '🌟', tone: 'gold', durationMs: 3500, confetti: true };
    }
    case 'wicket':
      return { title: 'WICKET!', subtitle: c.playerId ? `${player} is out` : `${team} strike`, emoji: '☝️', tone: 'red', durationMs: 2200, confetti: false };
    case 'six':
      return { title: 'SIX!', subtitle: c.playerId ? player : team, emoji: '💥', tone: 'green', durationMs: 2000, confetti: false };
    case 'four':
      return { title: 'FOUR!', subtitle: c.playerId ? player : team, emoji: '🔥', tone: 'blue', durationMs: 1600, confetti: false };
  }
}

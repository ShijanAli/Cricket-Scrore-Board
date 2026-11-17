import type {
  BallEventInput,
  InningsState,
  NoBallRunSource,
  Wicket,
} from '@cricket/shared';

/** Distributive Omit: keeps each member of the event union intact. */
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

/** An event before the controller gives it an id. */
export type NewEvent = DistributiveOmit<BallEventInput, 'id'>;

/** What the scorer meant, in cricket words. The UI builds one of these from a tap. */
export type Intent =
  | { kind: 'runs'; runs: number }
  | { kind: 'wide'; extraRuns: number }
  | { kind: 'noBall'; batRuns: number; from?: NoBallRunSource }
  | { kind: 'bye'; runs: number }
  | { kind: 'legBye'; runs: number }
  | { kind: 'wicket'; wicket: Wicket; runs: number; extra?: 'none' | 'wide' | 'noBall' };

/**
 * Turn an intent into a delivery event for whoever is on strike now. Pure: the engine decides
 * later whether it is legal. A 4 or a 6 off the bat is a boundary.
 */
export function deliveryFromIntent(state: InningsState, intent: Intent): NewEvent {
  const { strikerId, bowlerId } = state;
  if (!strikerId || !bowlerId) throw new Error('Choose the batter and bowler first');
  const base = { type: 'delivery' as const, strikerId, bowlerId };
  const isBoundary = (runs: number) => runs === 4 || runs === 6;

  switch (intent.kind) {
    case 'runs':
      return { ...base, runs: intent.runs, extra: 'none', boundary: isBoundary(intent.runs) };
    case 'wide':
      return { ...base, runs: intent.extraRuns, extra: 'wide' };
    case 'noBall': {
      const from = intent.from ?? 'bat';
      return {
        ...base,
        runs: intent.batRuns,
        extra: 'noBall',
        noBallRunsFrom: from,
        boundary: from === 'bat' && isBoundary(intent.batRuns),
      };
    }
    case 'bye':
      return { ...base, runs: intent.runs, extra: 'bye' };
    case 'legBye':
      return { ...base, runs: intent.runs, extra: 'legBye' };
    case 'wicket':
      return { ...base, runs: intent.runs, extra: intent.extra ?? 'none', wicket: intent.wicket };
  }
}

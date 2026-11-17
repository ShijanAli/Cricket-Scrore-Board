import {
  deliveryEventSchema,
  matchRulesSchema,
  type BallEvent,
  type DeliveryEventInput,
  type InningsSetup,
  type InningsState,
  type MatchRules,
  type MatchRulesInput,
} from '@cricket/shared';
import { applyEvent } from '../innings/apply-event';

let counter = 0;
export const nextId = (): string => `e${++counter}`;

/** Small default match: 2 overs, 4 players a side (3 wickets end the innings). */
export const makeRules = (over: Partial<MatchRulesInput> = {}): MatchRules =>
  matchRulesSchema.parse({ oversPerInnings: 2, playersPerSide: 4, ...over });

export const setup: InningsSetup = {
  battingTeamId: 'A',
  bowlingTeamId: 'B',
  strikerId: 'a1',
  nonStrikerId: 'a2',
  bowlerId: 'b1',
};

/** Build a valid delivery event for whoever is currently on strike. */
export function delivery(state: InningsState, input: Partial<DeliveryEventInput> = {}) {
  return deliveryEventSchema.parse({
    id: nextId(),
    type: 'delivery',
    // Placeholders when nobody is set (waiting for a new batter/bowler) so the ENGINE rejects it.
    strikerId: state.strikerId ?? 'none',
    bowlerId: state.bowlerId ?? 'none',
    runs: 0,
    ...input,
  });
}

export const play = (state: InningsState, rules: MatchRules, input: Partial<DeliveryEventInput> = {}) =>
  applyEvent(state, delivery(state, input), rules);

export const playMany = (
  state: InningsState,
  rules: MatchRules,
  count: number,
  input: Partial<DeliveryEventInput> = {},
) => {
  let s = state;
  for (let i = 0; i < count; i++) s = play(s, rules, input);
  return s;
};

export const batterIn = (state: InningsState, rules: MatchRules, batterId: string) =>
  applyEvent(state, { id: nextId(), type: 'batterIn', batterId }, rules);

export const bowlerIn = (state: InningsState, rules: MatchRules, bowlerId: string) =>
  applyEvent(state, { id: nextId(), type: 'bowlerSelected', bowlerId }, rules);

export const ev = {
  delivery: (state: InningsState, input: Partial<DeliveryEventInput> = {}): BallEvent =>
    delivery(state, input),
};

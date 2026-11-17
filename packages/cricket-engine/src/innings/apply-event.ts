import type { BallEvent, InningsState, MatchRules } from '@cricket/shared';
import { EngineError } from '../errors';
import { applyDelivery } from './apply-delivery';
import {
  afterWicket,
  cloneState,
  completeIfDone,
  newBatter,
  newBowler,
  swapEnds,
} from './state';

function assertInProgress(s: InningsState): void {
  if (s.status === 'completed') throw new EngineError('INNINGS_COMPLETED', 'Innings is already completed');
}

function applyBatterIn(prev: InningsState, batterId: string, rules: MatchRules): InningsState {
  assertInProgress(prev);
  if (!prev.needsNewBatter) throw new EngineError('NOT_EXPECTED', 'No new batter is needed right now');
  if (batterId === prev.strikerId || batterId === prev.nonStrikerId) {
    throw new EngineError('INVALID_BATTER', 'That batter is already at the crease');
  }
  const s = cloneState(prev);
  const existing = s.batters[batterId];
  if (existing) {
    if (existing.status !== 'retiredHurt') {
      throw new EngineError('INVALID_BATTER', 'That batter has already batted and is out');
    }
    existing.status = 'batting'; // retired-hurt batter returns
  } else {
    if (s.battingOrder.length >= rules.playersPerSide) {
      throw new EngineError('SQUAD_EXHAUSTED', 'No more batters available');
    }
    s.batters[batterId] = newBatter(batterId);
    s.battingOrder.push(batterId);
  }
  if (s.strikerId === null) s.strikerId = batterId;
  else s.nonStrikerId = batterId;
  s.needsNewBatter = false;
  s.partnership = { runs: 0, balls: 0 };
  return s;
}

function applyBowlerSelected(prev: InningsState, bowlerId: string, rules: MatchRules): InningsState {
  assertInProgress(prev);
  if (!prev.needsNewBowler) throw new EngineError('NOT_EXPECTED', 'A new bowler is not needed right now');
  if (bowlerId === prev.previousBowlerId) {
    throw new EngineError('CONSECUTIVE_OVERS', 'A bowler cannot bowl two overs in a row');
  }
  const s = cloneState(prev);
  const existing = s.bowlers[bowlerId];
  if (
    rules.maxOversPerBowler !== null &&
    existing &&
    existing.legalBalls >= rules.maxOversPerBowler * rules.ballsPerOver
  ) {
    throw new EngineError('BOWLER_QUOTA_EXCEEDED', `Bowler already bowled ${rules.maxOversPerBowler} overs`);
  }
  const bowler = existing ?? newBowler(bowlerId);
  bowler.currentOverRuns = 0;
  s.bowlers[bowlerId] = bowler;
  s.bowlerId = bowlerId;
  s.needsNewBowler = false;
  s.thisOver = [];
  return s;
}

function applyStrikeSwap(prev: InningsState): InningsState {
  assertInProgress(prev);
  if (prev.strikerId === null || prev.nonStrikerId === null) {
    throw new EngineError('CANNOT_SWAP', 'Both batters must be at the crease to swap strike');
  }
  const s = cloneState(prev);
  swapEnds(s);
  return s;
}

function applyRetire(
  prev: InningsState,
  batterId: string,
  reason: 'hurt' | 'out',
  rules: MatchRules,
): InningsState {
  assertInProgress(prev);
  if (prev.needsNewBatter) throw new EngineError('BATTER_REQUIRED', 'Select the new batter first');
  if (prev.nonStrikerId === null) {
    throw new EngineError('INVALID_RETIRE', 'The last batter cannot retire');
  }
  if (batterId !== prev.strikerId && batterId !== prev.nonStrikerId) {
    throw new EngineError('INVALID_RETIRE', 'That batter is not at the crease');
  }
  const s = cloneState(prev);
  const batter = s.batters[batterId]!;
  const yetToBat = rules.playersPerSide - s.battingOrder.length;
  if (reason === 'hurt') {
    if (yetToBat <= 0) throw new EngineError('NO_REPLACEMENT', 'No replacement batter available');
    batter.status = 'retiredHurt';
  } else {
    batter.status = 'out';
    batter.out = { type: 'retiredOut' };
    s.wickets += 1;
    s.fallOfWickets.push({
      wicketNo: s.wickets,
      teamRuns: s.runs,
      legalBalls: s.legalBalls,
      batterId,
    });
  }
  if (s.strikerId === batterId) s.strikerId = null;
  else s.nonStrikerId = null;
  s.partnership = { runs: 0, balls: 0 };
  if (reason === 'hurt') s.needsNewBatter = true;
  else afterWicket(s, rules);
  completeIfDone(s);
  return s;
}

/** Apply one non-undo event. Pure: returns a new state or throws EngineError. */
export function applyEvent(state: InningsState, event: BallEvent, rules: MatchRules): InningsState {
  switch (event.type) {
    case 'delivery':
      return applyDelivery(state, event, rules);
    case 'batterIn':
      return applyBatterIn(state, event.batterId, rules);
    case 'bowlerSelected':
      return applyBowlerSelected(state, event.bowlerId, rules);
    case 'strikeSwap':
      return applyStrikeSwap(state);
    case 'retire':
      return applyRetire(state, event.batterId, event.reason, rules);
    case 'undo':
      throw new EngineError('UNDO_NOT_APPLICABLE', 'Undo events are resolved by replayInnings');
  }
}

import {
  BOWLER_CREDITED_WICKETS,
  NO_BALL_VALID_WICKETS,
  WIDE_VALID_WICKETS,
  ZERO_RUN_WICKETS,
  type BallLog,
  type DeliveryEvent,
  type InningsState,
  type MatchRules,
} from '@cricket/shared';
import { EngineError } from '../errors';
import { afterWicket, cloneState, completeIfDone, swapEnds } from './state';

function ballLabel(e: DeliveryEvent, total: number): string {
  if (e.wicket) return total > 0 ? `${total}W` : 'W';
  switch (e.extra) {
    case 'wide':
      return e.runs > 0 ? `Wd+${e.runs}` : 'Wd';
    case 'noBall':
      return e.runs > 0 ? `Nb+${e.runs}` : 'Nb';
    case 'bye':
      return `${e.runs}b`;
    case 'legBye':
      return `${e.runs}lb`;
    default:
      return String(e.runs);
  }
}

function assertCanDeliver(s: InningsState, e: DeliveryEvent, rules: MatchRules): void {
  if (s.status === 'completed') throw new EngineError('INNINGS_COMPLETED', 'Innings is already completed');
  if (s.needsNewBatter) throw new EngineError('BATTER_REQUIRED', 'Select the new batter first');
  if (s.needsNewBowler) throw new EngineError('BOWLER_REQUIRED', 'Select the next bowler first');
  if (s.strikerId === null || s.bowlerId === null) {
    throw new EngineError('INVALID_STATE', 'Striker or bowler is not set');
  }
  if (e.strikerId !== s.strikerId) {
    throw new EngineError('STRIKER_MISMATCH', 'Event striker does not match the current striker');
  }
  if (e.bowlerId !== s.bowlerId) {
    throw new EngineError('BOWLER_MISMATCH', 'Event bowler does not match the current bowler');
  }

  const usesBye = e.extra === 'bye' || (e.extra === 'noBall' && e.noBallRunsFrom === 'bye');
  const usesLegBye = e.extra === 'legBye' || (e.extra === 'noBall' && e.noBallRunsFrom === 'legBye');
  if (usesBye && !rules.allowByes) throw new EngineError('EXTRA_NOT_ALLOWED', 'Byes are not allowed in this match');
  if (usesLegBye && !rules.allowLegByes) {
    throw new EngineError('EXTRA_NOT_ALLOWED', 'Leg byes are not allowed in this match');
  }

  if (e.wicket) {
    const w = e.wicket;
    const restricted = e.extra === 'noBall' || s.freeHit;
    const allowed = restricted ? NO_BALL_VALID_WICKETS : e.extra === 'wide' ? WIDE_VALID_WICKETS : null;
    if (allowed && !allowed.includes(w.type)) {
      throw new EngineError('INVALID_WICKET', `${w.type} is not possible on this delivery`);
    }
    if (w.playerOutId !== s.strikerId && w.playerOutId !== s.nonStrikerId) {
      throw new EngineError('INVALID_WICKET', 'Dismissed player is not at the crease');
    }
    if (ZERO_RUN_WICKETS.includes(w.type)) {
      if (w.playerOutId !== s.strikerId) {
        throw new EngineError('INVALID_WICKET', `${w.type} must dismiss the striker`);
      }
      if (e.runs !== 0) {
        throw new EngineError('INVALID_WICKET', `${w.type} cannot have runs on the same ball`);
      }
    }
  }
}

export function applyDelivery(prev: InningsState, e: DeliveryEvent, rules: MatchRules): InningsState {
  assertCanDeliver(prev, e, rules);
  const s = cloneState(prev);
  const striker = s.batters[s.strikerId!]!;
  const bowler = s.bowlers[s.bowlerId!]!;

  const wide = e.extra === 'wide';
  const noBall = e.extra === 'noBall';
  const legal = !wide && !noBall;
  const penalty = wide ? rules.wideRuns : noBall ? rules.noBallRuns : 0;

  // Where do the runs go?
  let bat = 0;
  let bye = 0;
  let legBye = 0;
  let wideTotal = 0;
  let noBallTotal = 0;
  switch (e.extra) {
    case 'none':
      bat = e.runs;
      break;
    case 'wide':
      wideTotal = penalty + e.runs;
      break;
    case 'noBall':
      noBallTotal = penalty;
      if (e.noBallRunsFrom === 'bat') bat = e.runs;
      else if (e.noBallRunsFrom === 'bye') bye = e.runs;
      else legBye = e.runs;
      break;
    case 'bye':
      bye = e.runs;
      break;
    case 'legBye':
      legBye = e.runs;
      break;
  }
  const total = bat + bye + legBye + wideTotal + noBallTotal;
  const conceded = bat + wideTotal + noBallTotal; // byes/leg byes are not the bowler's

  // Team + extras
  s.runs += total;
  s.extras.wide += wideTotal;
  s.extras.noBall += noBallTotal;
  s.extras.bye += bye;
  s.extras.legBye += legBye;

  // Striker
  striker.runs += bat;
  if (!wide) striker.balls += 1;
  if (e.boundary && bat === 4) striker.fours += 1;
  if (e.boundary && bat === 6) striker.sixes += 1;

  // Bowler
  bowler.runs += conceded;
  bowler.currentOverRuns += conceded;
  if (wide) bowler.wides += 1;
  if (noBall) bowler.noBalls += 1;
  if (legal) {
    bowler.legalBalls += 1;
    s.legalBalls += 1;
  }

  // Partnership
  s.partnership.runs += total;
  if (!wide) s.partnership.balls += 1;

  // Strike changes on odd runs (before the dismissal is resolved, so a run-out
  // after an odd number of completed runs removes the right batter from the right end).
  if (e.runs % 2 === 1) swapEnds(s);

  // Wicket
  if (e.wicket) {
    const w = e.wicket;
    const credited = BOWLER_CREDITED_WICKETS.includes(w.type);
    const out = s.batters[w.playerOutId]!;
    out.status = 'out';
    out.out = {
      type: w.type,
      ...(credited ? { bowlerId: bowler.id } : {}),
      ...(w.fielderId ? { fielderId: w.fielderId } : {}),
    };
    if (s.strikerId === w.playerOutId) s.strikerId = null;
    else s.nonStrikerId = null;
    s.wickets += 1;
    if (credited) bowler.wickets += 1;
    s.fallOfWickets.push({
      wicketNo: s.wickets,
      teamRuns: s.runs,
      legalBalls: s.legalBalls,
      batterId: w.playerOutId,
    });
    s.partnership = { runs: 0, balls: 0 };
    afterWicket(s, rules);
  }

  // Free hit: a no-ball earns one; the next legal ball uses it up; wides keep it alive.
  if (noBall) s.freeHit = rules.freeHitOnNoBall;
  else if (legal) s.freeHit = false;

  // Ball log
  const log: BallLog = {
    eventId: e.id,
    label: ballLabel(e, total),
    totalRuns: total,
    legal,
    isWicket: Boolean(e.wicket),
  };
  s.thisOver.push(log);

  // End of over
  if (legal && s.legalBalls % s.ballsPerOver === 0) {
    if (bowler.currentOverRuns === 0) bowler.maidens += 1;
    bowler.currentOverRuns = 0;
    swapEnds(s);
    s.previousBowlerId = s.bowlerId;
    s.bowlerId = null;
    s.needsNewBowler = true;
  }

  completeIfDone(s);
  return s;
}

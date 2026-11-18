import { applyEvent, createInnings } from '@cricket/engine';
import { deliveryEventSchema, matchRulesSchema, type InningsState } from '@cricket/shared';
import { describe, expect, it } from 'vitest';
import type { MatchDetail } from '../../api/types';
import { buildReportView } from '../match-report';

const rules = matchRulesSchema.parse({ oversPerInnings: 1, playersPerSide: 4 });
let n = 0;
const ball = (s: InningsState, extra: object = {}) =>
  applyEvent(
    s,
    deliveryEventSchema.parse({ id: `e${++n}`, type: 'delivery', strikerId: s.strikerId!, bowlerId: s.bowlerId!, runs: 0, ...extra }),
    rules,
  );

function build(): MatchDetail {
  let first = createInnings({ battingTeamId: 'A', bowlingTeamId: 'B', strikerId: 'a1', nonStrikerId: 'a2', bowlerId: 'b1' }, rules);
  for (let i = 0; i < 6; i++) first = ball(first, { runs: 4, boundary: true }); // 24
  let second = createInnings({ battingTeamId: 'B', bowlingTeamId: 'A', strikerId: 'b1', nonStrikerId: 'b2', bowlerId: 'a9' }, rules, 25);
  for (let i = 0; i < 6; i++) second = ball(second, { runs: 1 });
  const team = (id: string, name: string) => ({ id, ownerId: 'u', name, shortName: name, color: '#111', logoUrl: null, contactNumber: null });
  const p = (id: string, name: string, teamId: string) => ({
    matchId: 'm', playerId: id, teamId, battingPosition: null, player: { id, name, phone: null, role: 'allrounder', jerseyNumber: null },
  });
  return {
    id: 'm', status: 'completed', teamAId: 'A', teamBId: 'B', teamA: team('A', 'Alpha'), teamB: team('B', 'Beta'),
    resultText: 'Alpha won by 18 runs',
    players: [p('a1', 'Rahim', 'A'), p('a9', 'Sakib', 'A'), p('b1', 'Karim', 'B')],
    innings: [
      { inningsNo: 1, snapshot: first },
      { inningsNo: 2, snapshot: second },
    ],
  } as unknown as MatchDetail;
}

describe('buildReportView', () => {
  it('winner, loser, margin and awards with player names', () => {
    const v = buildReportView(build())!;
    expect(v.winner).toMatchObject({ name: 'Alpha', score: '24/0', margin: 'won by 18 runs' });
    expect(v.loser).toMatchObject({ name: 'Beta', score: '6/0', margin: 'lost by 18 runs' });
    const mom = v.awards.find((a) => a.label === 'Man of the Match')!;
    expect(mom.playerName).toBe('Rahim');
    expect(mom.teamName).toBe('Alpha');
    expect(v.awards.find((a) => a.label === 'Best Bowler')).toBeUndefined(); // nobody took a wicket
  });

  it('null until completed', () => {
    expect(buildReportView({ ...build(), status: 'live' })).toBeNull();
  });
});

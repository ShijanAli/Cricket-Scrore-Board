import { buildMatchReport, oversFromBalls, strikeRate, type PlayerImpact } from '@cricket/engine';
import type { MatchDetail } from '../api/types';
import { teamName } from './match-utils';

export interface ReportTeamLine {
  teamId: string;
  name: string;
  color: string | null;
  /** "152/6" */
  score: string;
  overs: string;
}

export interface ReportAward {
  label: string;
  playerName: string;
  teamName: string;
  /** "52 (31) · 4×4 2×6 · 3/18" */
  line: string;
}

export interface MatchReportView {
  resultText: string;
  winner: (ReportTeamLine & { margin: string }) | null;
  loser: (ReportTeamLine & { margin: string }) | null;
  /** Both teams in batting order (used for tie / no winner too). */
  teams: [ReportTeamLine, ReportTeamLine];
  awards: ReportAward[];
}

const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;

export const battingLine = (p: PlayerImpact): string =>
  `${p.runs} (${p.balls}) · ${p.fours}×4 ${p.sixes}×6 · SR ${strikeRate(p.runs, p.balls).toFixed(1)}`;
export const bowlingLine = (p: PlayerImpact, ballsPerOver = 6): string =>
  `${p.wickets}/${p.runsConceded} (${oversFromBalls(p.ballsBowled, ballsPerOver)} ov)`;

/** Everything a result card needs, or null when the match has no two completed innings. */
export function buildReportView(match: MatchDetail): MatchReportView | null {
  if (match.status !== 'completed') return null;
  const byNo = (n: number) => match.innings.find((i) => i.inningsNo === n)?.snapshot ?? null;
  const first = byNo(1);
  const second = byNo(2);
  const report = buildMatchReport(first, second);
  if (!report || !first || !second) return null;

  const playerName = (id: string) => match.players.find((p) => p.playerId === id)?.player.name ?? 'Unknown';
  const line = (s: (typeof report.scores)[number]): ReportTeamLine => ({
    teamId: s.teamId,
    name: teamName(match, s.teamId),
    color: s.teamId === match.teamAId ? (match.teamA?.color ?? null) : (match.teamB?.color ?? null),
    score: `${s.runs}/${s.wickets}`,
    overs: oversFromBalls(s.legalBalls, s.ballsPerOver),
  });
  const teams: [ReportTeamLine, ReportTeamLine] = [line(report.scores[0]), line(report.scores[1])];
  const byId = (id: string | null) => teams.find((t) => t.teamId === id) ?? null;

  let winnerMargin = '';
  let loserMargin = '';
  if (report.marginKind === 'runs') {
    winnerMargin = `won by ${plural(report.margin, 'run')}`;
    loserMargin = `lost by ${plural(report.margin, 'run')}`;
  } else if (report.marginKind === 'wickets') {
    winnerMargin = `won by ${plural(report.margin, 'wicket')} (${plural(report.ballsLeft ?? 0, 'ball')} left)`;
    loserMargin = `lost by ${plural(report.margin, 'wicket')}`;
  }
  const w = byId(report.winnerTeamId);
  const l = byId(report.loserTeamId);

  const awards: ReportAward[] = [];
  const add = (label: string, p: PlayerImpact | null, text: (p: PlayerImpact) => string) => {
    if (!p) return;
    awards.push({ label, playerName: playerName(p.playerId), teamName: teamName(match, p.teamId), line: text(p) });
  };
  add('Man of the Match', report.manOfTheMatch, (p) =>
    [p.balls > 0 || p.runs > 0 ? `${p.runs} (${p.balls})` : null, p.ballsBowled > 0 ? bowlingLine(p, first.ballsPerOver) : null]
      .filter(Boolean)
      .join(' · '),
  );
  add('Top Scorer', report.topBatter, battingLine);
  add('Best Bowler', report.topBowler, (p) => bowlingLine(p, first.ballsPerOver));

  return {
    resultText: match.resultText ?? (w ? `${w.name} ${winnerMargin}` : 'Match tied'),
    winner: w ? { ...w, margin: winnerMargin } : null,
    loser: l ? { ...l, margin: loserMargin } : null,
    teams,
    awards,
  };
}

/** "7 wkts · 4.2 ov · 31 runs" for a series award row. */
export const bowlingFigures = (p: { wickets: number; ballsBowled: number; runsConceded: number }, ballsPerOver = 6): string =>
  `${p.wickets} wkts · ${oversFromBalls(p.ballsBowled, ballsPerOver)} ov · ${p.runsConceded} runs`;

import { View } from 'react-native';
import { buildReportView, type MatchDetail, type ReportTeamLine } from '@cricket/client-core';
import { Card, Text, colors, space } from '@/ui';

const Line = ({ t, margin, win }: { t: ReportTeamLine; margin: string; win: boolean }) => (
  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space.md }}>
    <View style={{ flex: 1 }}>
      <Text variant={win ? 'label' : 'muted'}>{t.name}</Text>
      {margin ? <Text variant="muted">{margin}</Text> : null}
    </View>
    <Text variant={win ? 'title' : 'muted'}>
      {t.score} ({t.overs} ov)
    </Text>
  </View>
);

/** Finished match: winner, loser, margin and awards. Falls back to the plain result text. */
export function MatchResultCard({ match }: { match: MatchDetail }) {
  const r = buildReportView(match);
  if (!r) {
    return match.resultText ? (
      <Card style={{ backgroundColor: colors.primarySoft }}>
        <Text variant="title">{match.resultText}</Text>
      </Card>
    ) : null;
  }
  return (
    <Card style={{ backgroundColor: colors.primarySoft, gap: space.md }}>
      <Text variant="title">🏆 {r.resultText}</Text>
      {r.winner && r.loser ? (
        <>
          <Line t={r.winner} margin={r.winner.margin} win />
          <Line t={r.loser} margin={r.loser.margin} win={false} />
        </>
      ) : (
        r.teams.map((t) => <Line key={t.teamId} t={t} margin="" win />)
      )}
      {r.awards.map((a) => (
        <View key={a.label} style={{ backgroundColor: colors.card, borderRadius: 10, padding: space.md }}>
          <Text variant="muted">{a.label.toUpperCase()}</Text>
          <Text variant="label">
            {a.playerName} · {a.teamName}
          </Text>
          <Text variant="body">{a.line}</Text>
          {a.reason ? <Text variant="muted">{a.reason}</Text> : null}
        </View>
      ))}
    </Card>
  );
}

import { View } from 'react-native';
import { bowlingFigures, type AwardPlayer, type SeriesAwards } from '@cricket/client-core';
import { Card, Text, colors, space } from '@/ui';

const Award = ({ label, p, detail }: { label: string; p: AwardPlayer | null; detail: string }) =>
  p ? (
    <View style={{ backgroundColor: colors.card, borderRadius: 10, padding: space.md }}>
      <Text variant="muted">{label.toUpperCase()}</Text>
      <Text variant="label">
        {p.name} · {p.teamName}
      </Text>
      <Text variant="body">{detail}</Text>
    </View>
  ) : null;

/** Champion, runner-up, Man of the Series and the leaders. Renders nothing until a match is completed. */
export function AwardsCard({ awards: a }: { awards: SeriesAwards | undefined }) {
  if (!a || a.matchesCounted === 0) return null;
  return (
    <Card style={{ backgroundColor: colors.primarySoft, gap: space.md }}>
      {a.champion ? (
        <View>
          <Text variant="muted">CHAMPIONS</Text>
          <Text variant="title">👑 {a.champion.name}</Text>
          {a.runnerUp ? <Text variant="muted">Runners-up: {a.runnerUp.name}</Text> : null}
        </View>
      ) : (
        <Text variant="title">Leaders so far</Text>
      )}
      <Award label={a.champion ? 'Man of the Series' : 'Best player'} p={a.manOfTheSeries} detail={a.manOfTheSeries ? `${a.manOfTheSeries.runs} runs · ${a.manOfTheSeries.wickets} wkts` : ''} />
      <Award label="Top run scorer" p={a.topRunScorer} detail={a.topRunScorer ? `${a.topRunScorer.runs} runs · ${a.topRunScorer.sixes}×6 ${a.topRunScorer.fours}×4` : ''} />
      <Award label="Top wicket taker" p={a.topWicketTaker} detail={a.topWicketTaker ? bowlingFigures(a.topWicketTaker) : ''} />
    </Card>
  );
}

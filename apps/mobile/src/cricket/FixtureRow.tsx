import { View } from 'react-native';
import { sideLabel, isFinished, statusLabel, statusTone, type MatchSummary } from '@cricket/client-core';
import { Badge, Card, Text, space } from '@/ui';

export function FixtureRow({ match, onPress }: { match: MatchSummary; onPress: () => void }) {
  const when = [match.scheduledDate?.slice(0, 10), match.scheduledTime, match.ground].filter(Boolean).join(' · ');
  return (
    <Card onPress={onPress} style={{ gap: space.xs }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text variant="muted">Match {match.matchNo}</Text>
        <Badge label={statusLabel(match.status)} tone={statusTone(match.status)} />
      </View>
      <Text variant="label">
        {sideLabel(match, 'A')} vs {sideLabel(match, 'B')}
      </Text>
      {when ? <Text variant="muted">{when}</Text> : <Text variant="muted">Date not set</Text>}
      {isFinished(match.status) && match.resultText ? <Text variant="muted">{match.resultText}</Text> : null}
    </Card>
  );
}

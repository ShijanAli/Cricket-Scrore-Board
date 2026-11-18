import { StyleSheet, View } from 'react-native';
import { isFinished, statusLabel, statusTone, type MatchSummary } from '@cricket/client-core';
import { Badge, Card, TeamBadge, Text, space } from '@/ui';

export function MatchCard({ match, onPress }: { match: MatchSummary; onPress: () => void }) {
  const a = match.teamA;
  const b = match.teamB;
  return (
    <Card onPress={onPress} style={styles.card}>
      <View style={styles.top}>
        <Badge label={statusLabel(match.status)} tone={statusTone(match.status)} />
        {match.scheduledDate ? <Text variant="muted">{match.scheduledDate.slice(0, 10)}</Text> : null}
      </View>
      <View style={styles.teams}>
        <View style={styles.team}>
          <TeamBadge shortName={a?.shortName ?? '?'} color={a?.color} />
          <Text variant="label" numberOfLines={1}>{a?.name ?? 'TBD'}</Text>
        </View>
        <Text variant="muted">vs</Text>
        <View style={styles.team}>
          <TeamBadge shortName={b?.shortName ?? '?'} color={b?.color} />
          <Text variant="label" numberOfLines={1}>{b?.name ?? 'TBD'}</Text>
        </View>
      </View>
      {isFinished(match.status) && match.resultText ? <Text variant="muted">{match.resultText}</Text> : null}
      {match.ground ? <Text variant="muted">{match.ground}</Text> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: space.sm },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  teams: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  team: { flex: 1, alignItems: 'center', gap: space.xs },
});

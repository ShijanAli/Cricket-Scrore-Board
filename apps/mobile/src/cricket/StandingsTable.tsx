import { StyleSheet, View } from 'react-native';
import { formatNrr } from '@cricket/engine';
import type { StandingRowDto } from '@cricket/client-core';
import { Card, Text, colors, space } from '@/ui';

const C = ({ children, head, wide, bold }: { children: React.ReactNode; head?: boolean; wide?: boolean; bold?: boolean }) => (
  <Text variant={head ? 'muted' : 'body'} numberOfLines={1} style={[wide ? styles.wide : styles.cell, (head || bold) && { fontWeight: '700' }]}>
    {children}
  </Text>
);

export function StandingsTable({ rows }: { rows: readonly StandingRowDto[] }) {
  return (
    <Card style={{ gap: space.sm }}>
      <View style={styles.row}>
        <C head>#</C><C head wide>Team</C><C head>P</C><C head>W</C><C head>L</C><C head>T</C><C head>NR</C><C head>Pts</C><C head wide>NRR</C>
      </View>
      {rows.map((r) => (
        <View key={r.teamId} style={styles.row}>
          <C>{r.rank}</C>
          <C wide>{r.team?.shortName ?? r.team?.name ?? '?'}</C>
          <C>{r.played}</C><C>{r.won}</C><C>{r.lost}</C><C>{r.tied}</C><C>{r.noResult}</C>
          <C bold>{r.points}</C>
          <C wide>{formatNrr(r.nrr)}</C>
        </View>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border, paddingBottom: 4 },
  wide: { flex: 2, fontSize: 14 },
  cell: { flex: 1, fontSize: 14, textAlign: 'center' },
});

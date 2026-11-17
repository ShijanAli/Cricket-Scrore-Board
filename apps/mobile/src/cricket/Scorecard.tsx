import { StyleSheet, View } from 'react-native';
import { oversFromBalls, strikeRate } from '@cricket/engine';
import type { DismissalInfo, InningsState } from '@cricket/shared';
import { Card, Text, colors, space } from '@/ui';

type NameOf = (id: string | null | undefined) => string;

function dismissal(d: DismissalInfo | undefined, nameOf: NameOf): string {
  if (!d) return 'not out';
  const by = d.bowlerId ? ` b ${nameOf(d.bowlerId)}` : '';
  const f = d.fielderId ? ` (${nameOf(d.fielderId)})` : '';
  switch (d.type) {
    case 'bowled': return `b ${nameOf(d.bowlerId)}`;
    case 'caught': return `c ${nameOf(d.fielderId)}${by}`;
    case 'lbw': return `lbw${by}`;
    case 'stumped': return `st ${nameOf(d.fielderId)}${by}`;
    case 'runOut': return `run out${f}`;
    case 'hitWicket': return `hit wicket${by}`;
    case 'retiredOut': return 'retired out';
    default: return d.type;
  }
}

const Cell = ({ children, wide, head }: { children: React.ReactNode; wide?: boolean; head?: boolean }) => (
  <Text variant={head ? 'muted' : 'body'} style={[wide ? styles.wide : styles.cell, head && { fontWeight: '700' }]} numberOfLines={wide ? 2 : 1}>
    {children}
  </Text>
);

export function Scorecard({ title, state, nameOf }: { title: string; state: InningsState; nameOf: NameOf }) {
  const batters = state.battingOrder.map((id) => state.batters[id]).filter((b): b is NonNullable<typeof b> => !!b);
  const bowlers = Object.values(state.bowlers);
  const e = state.extras;
  const extrasTotal = e.wide + e.noBall + e.bye + e.legBye;
  return (
    <Card style={{ gap: space.sm }}>
      <Text variant="title">
        {title} · {state.runs}/{state.wickets} ({oversFromBalls(state.legalBalls, state.ballsPerOver)})
      </Text>
      <View style={styles.row}>
        <Cell wide head>Batter</Cell><Cell head>R</Cell><Cell head>B</Cell><Cell head>4s</Cell><Cell head>6s</Cell><Cell head>SR</Cell>
      </View>
      {batters.map((b) => (
        <View key={b.id}>
          <View style={styles.row}>
            <Cell wide>{nameOf(b.id)}{b.id === state.strikerId ? ' *' : ''}</Cell>
            <Cell>{b.runs}</Cell><Cell>{b.balls}</Cell><Cell>{b.fours}</Cell><Cell>{b.sixes}</Cell>
            <Cell>{strikeRate(b.runs, b.balls).toFixed(0)}</Cell>
          </View>
          <Text variant="muted" style={styles.how}>
            {b.status === 'retiredHurt' ? 'retired hurt' : b.status === 'batting' ? 'batting' : dismissal(b.out, nameOf)}
          </Text>
        </View>
      ))}
      <Text variant="muted">
        Extras {extrasTotal} (wd {e.wide}, nb {e.noBall}, b {e.bye}, lb {e.legBye})
      </Text>
      <View style={styles.divider} />
      <View style={styles.row}>
        <Cell wide head>Bowler</Cell><Cell head>O</Cell><Cell head>M</Cell><Cell head>R</Cell><Cell head>W</Cell><Cell head>Wd/Nb</Cell>
      </View>
      {bowlers.map((b) => (
        <View key={b.id} style={styles.row}>
          <Cell wide>{nameOf(b.id)}</Cell>
          <Cell>{oversFromBalls(b.legalBalls, state.ballsPerOver)}</Cell><Cell>{b.maidens}</Cell><Cell>{b.runs}</Cell><Cell>{b.wickets}</Cell>
          <Cell>{b.wides}/{b.noBalls}</Cell>
        </View>
      ))}
      {state.fallOfWickets.length > 0 ? (
        <Text variant="muted">
          FoW: {state.fallOfWickets.map((f) => `${f.teamRuns}-${f.wicketNo} (${nameOf(f.batterId)})`).join(', ')}
        </Text>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  wide: { flex: 3, fontSize: 14 },
  cell: { flex: 1, textAlign: 'right', fontSize: 14 },
  how: { marginTop: -2 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: space.xs },
});

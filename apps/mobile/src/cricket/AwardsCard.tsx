import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { bowlingFigures, type AwardPlayer, type SeriesAwards } from '@cricket/client-core';
import { Card, Text, colors, space } from '@/ui';

function Award({ label, p, detail }: { label: string; p: AwardPlayer | null; detail: string }) {
  const [open, setOpen] = useState(false);
  if (!p) return null;
  return (
    <Pressable accessibilityRole="button" onPress={() => setOpen((v) => !v)} style={{ backgroundColor: colors.card, borderRadius: 10, padding: space.md, gap: 2 }}>
      <Text variant="muted">{label.toUpperCase()}</Text>
      <Text variant="label">
        {p.name} · {p.teamName}
      </Text>
      <Text variant="body">{detail}</Text>
      <Text variant="muted">{open ? p.reason : 'Tap to see why'}</Text>
    </Pressable>
  );
}

/** Champion, runner-up, Man of the Series/Tournament and the leaders, each with the reason. Renders nothing until a match is completed. */
export function AwardsCard({ awards: a }: { awards: SeriesAwards | undefined }) {
  if (!a || a.matchesCounted === 0) return null;
  return (
    <Card style={{ backgroundColor: colors.primarySoft, gap: space.md }}>
      {a.champion ? (
        <View style={{ gap: 2 }}>
          <Text variant="muted">CHAMPIONS</Text>
          <Text variant="title">👑 {a.champion.name}</Text>
          {a.champion.reason ? <Text variant="muted">{a.champion.reason}</Text> : null}
          {a.runnerUp ? <Text variant="muted">Runners-up: {a.runnerUp.name}</Text> : null}
        </View>
      ) : (
        <Text variant="title">Leaders so far</Text>
      )}
      <Award label={a.champion ? a.bestPlayerTitle : 'Best player'} p={a.bestPlayer} detail={a.bestPlayer ? `${a.bestPlayer.runs} runs · ${a.bestPlayer.wickets} wkts` : ''} />
      <Award label="Top run scorer" p={a.topRunScorer} detail={a.topRunScorer ? `${a.topRunScorer.runs} runs · ${a.topRunScorer.sixes}×6 ${a.topRunScorer.fours}×4` : ''} />
      <Award label="Top wicket taker" p={a.topWicketTaker} detail={a.topWicketTaker ? bowlingFigures(a.topWicketTaker) : ''} />
      <Award label="Most sixes" p={a.mostSixes} detail={a.mostSixes ? `${a.mostSixes.sixes} sixes` : ''} />
      <Text variant="muted">{a.formula}</Text>
    </Card>
  );
}

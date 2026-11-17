import { View } from 'react-native';
import type { SquadMember, Team } from '@cricket/client-core';
import { Button, Card, Chip, TeamBadge, Text, space } from '@/ui';

export interface XiPickerProps {
  team: Team;
  squad: readonly SquadMember[];
  selected: readonly string[];
  max: number;
  onChange: (ids: string[]) => void;
  onManageSquad: () => void;
}

/** Choose a team's playing XI from its squad. */
export function XiPicker({ team, squad, selected, max, onChange, onManageSquad }: XiPickerProps) {
  const toggle = (id: string) => {
    if (selected.includes(id)) onChange(selected.filter((x) => x !== id));
    else if (selected.length < max) onChange([...selected, id]);
  };
  return (
    <Card style={{ gap: space.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
        <TeamBadge shortName={team.shortName} color={team.color} />
        <View style={{ flex: 1 }}>
          <Text variant="label">{team.name}</Text>
          <Text variant="muted">
            {selected.length} of {max} selected (batting order = tap order)
          </Text>
        </View>
      </View>
      {squad.length === 0 ? <Text variant="muted">This team has no players yet.</Text> : null}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
        {squad.map((m) => {
          const pos = selected.indexOf(m.playerId);
          return (
            <Chip
              key={m.playerId}
              label={pos >= 0 ? `${pos + 1}. ${m.player.name}` : m.player.name}
              selected={pos >= 0}
              disabled={pos < 0 && selected.length >= max}
              onPress={() => toggle(m.playerId)}
            />
          );
        })}
      </View>
      <Button title="Manage squad" variant="ghost" compact onPress={onManageSquad} />
    </Card>
  );
}

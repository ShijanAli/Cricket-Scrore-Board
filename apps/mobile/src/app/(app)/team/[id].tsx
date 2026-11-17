import { useState } from 'react';
import { Alert, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { PLAYER_ROLES, type PlayerRole } from '@cricket/shared';
import { useAddSquadPlayer, useDeleteTeam, useRemoveSquadPlayer, useTeam } from '@/hooks/queries';
import { errorMessage } from '@/lib/query';
import { Badge, Button, Card, ErrorBanner, QueryBoundary, Screen, Segmented, TeamBadge, Text, TextField, space } from '@/ui';

const ROLE_LABEL: Record<PlayerRole, string> = {
  batter: 'Batter', bowler: 'Bowler', all_rounder: 'All-rounder', wicketkeeper: 'Keeper',
};

export default function TeamDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const team = useTeam(id);
  const add = useAddSquadPlayer(id);
  const remove = useRemoveSquadPlayer(id);
  const del = useDeleteTeam();
  const [name, setName] = useState('');
  const [role, setRole] = useState<PlayerRole>('batter');
  const [nameError, setNameError] = useState<string | undefined>();

  const submit = () => {
    const trimmed = name.trim();
    if (trimmed.length < 2) return setNameError('Enter at least 2 letters');
    setNameError(undefined);
    add.mutate({ newPlayer: { name: trimmed, role }, isCaptain: false, isViceCaptain: false, isWicketkeeper: false }, { onSuccess: () => setName('') });
  };

  const confirmDelete = () =>
    Alert.alert('Delete team?', 'The squad will be removed. Played matches are kept.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => del.mutate(id, { onSuccess: () => router.back() }) },
    ]);

  return (
    <Screen>
      <Stack.Screen options={{ title: team.data?.name ?? 'Team' }} />
      <QueryBoundary query={team}>
        {(t) => (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
              <TeamBadge shortName={t.shortName} color={t.color} size={56} />
              <View style={{ flex: 1 }}>
                <Text variant="title">{t.name}</Text>
                <Text variant="muted">{t.roster.length} players</Text>
              </View>
            </View>

            <Text variant="title">Squad</Text>
            {t.roster.length === 0 ? <Text variant="muted">No players yet. Add your first player below.</Text> : null}
            {t.roster.map((m) => (
              <Card key={m.playerId} style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text variant="label">{m.player.name}</Text>
                  <Badge label={ROLE_LABEL[m.player.role]} />
                </View>
                <Button title="Remove" variant="ghost" compact onPress={() => remove.mutate(m.playerId)} />
              </Card>
            ))}

            <Card style={{ gap: space.md }}>
              <Text variant="title">Add player</Text>
              <TextField label="Name" value={name} onChangeText={setName} error={nameError} />
              <Segmented options={PLAYER_ROLES.values.map((r) => ({ value: r, label: ROLE_LABEL[r] }))} value={role} onChange={setRole} />
              {add.isError ? <ErrorBanner message={errorMessage(add.error)} /> : null}
              <Button title="Add to squad" loading={add.isPending} onPress={submit} />
            </Card>

            {remove.isError ? <ErrorBanner message={errorMessage(remove.error)} /> : null}
            <Button title="Delete team" variant="danger" loading={del.isPending} onPress={confirmDelete} />
          </>
        )}
      </QueryBoundary>
    </Screen>
  );
}

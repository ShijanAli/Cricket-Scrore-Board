import { Stack, useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createTeamSchema, type CreateTeamFormValues, type CreateTeamInput } from '@cricket/shared';
import { useCreateTeam } from '@/hooks/queries';
import { errorMessage } from '@/lib/query';
import { Button, ErrorBanner, FormField, Screen, TeamBadge, Text, colors, space } from '@/ui';
import { Pressable, View } from 'react-native';

const PALETTE = ['#0E7C4A', '#1565C0', '#C62828', '#EF6C00', '#6A1B9A', '#00838F', '#37474F', '#AD1457'];

export default function NewTeam() {
  const router = useRouter();
  const create = useCreateTeam();
  const { control, handleSubmit, watch } = useForm<CreateTeamFormValues, any, CreateTeamInput>({
    resolver: zodResolver(createTeamSchema),
    defaultValues: { name: '', shortName: '', color: PALETTE[0] },
  });
  const short = watch('shortName');
  const color = watch('color') ?? PALETTE[0]!;

  return (
    <Screen>
      <Stack.Screen options={{ title: 'New team' }} />
      <View style={{ alignItems: 'center' }}>
        <TeamBadge shortName={(short || '??').toUpperCase().slice(0, 4)} color={color} size={72} />
      </View>
      <FormField control={control} name="name" label="Team name" />
      <FormField control={control} name="shortName" label="Short name (2–4 letters)" autoCapitalize="characters" maxLength={4} />
      <Text variant="label">Colour</Text>
      <Controller
        control={control}
        name="color"
        render={({ field }) => (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
            {PALETTE.map((c) => (
              <Pressable
                key={c}
                accessibilityRole="button"
                accessibilityLabel={`Colour ${c}`}
                onPress={() => field.onChange(c)}
                style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: c, borderWidth: field.value === c ? 3 : 0, borderColor: colors.text }}
              />
            ))}
          </View>
        )}
      />
      <FormField control={control} name="contactNumber" label="Contact number (optional, 01XXXXXXXXX)" keyboardType="phone-pad" parse={(t) => (t === '' ? undefined : t)} />
      {create.isError ? <ErrorBanner message={errorMessage(create.error)} /> : null}
      <Button
        title="Create team"
        loading={create.isPending}
        onPress={handleSubmit((v) => create.mutate(v, { onSuccess: (team) => router.replace(`/team/${team.id}`) }))}
      />
    </Screen>
  );
}

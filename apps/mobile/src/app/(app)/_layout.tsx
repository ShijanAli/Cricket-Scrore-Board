import { View } from 'react-native';
import { Stack } from 'expo-router';
import { CelebrationHost } from '@/cricket/CelebrationHost';
import { colors } from '@/ui';

export default function AppLayout() {
  return (
    <View style={{ flex: 1 }}>
      <Stack screenOptions={{ headerTintColor: colors.primary, headerStyle: { backgroundColor: colors.bg }, headerShadowVisible: false }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
      <CelebrationHost />
    </View>
  );
}

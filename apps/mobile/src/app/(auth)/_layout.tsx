import { Stack } from 'expo-router';
import { colors } from '@/ui';

export default function AuthLayout() {
  return <Stack screenOptions={{ headerTintColor: colors.primary, headerStyle: { backgroundColor: colors.bg }, headerShadowVisible: false }} />;
}

import { Ionicons } from '@expo/vector-icons';
import type { ColorValue } from 'react-native';
import { Tabs } from 'expo-router';
import { colors } from '@/ui';

const icon = (name: React.ComponentProps<typeof Ionicons>['name']) =>
  function TabIcon({ color, size }: { color: ColorValue; size: number }) {
    return <Ionicons name={name} color={color as string} size={size} />;
  };

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: colors.primary, headerStyle: { backgroundColor: colors.bg }, headerShadowVisible: false }}>
      <Tabs.Screen name="index" options={{ title: 'Matches', tabBarIcon: icon('baseball-outline') }} />
      <Tabs.Screen name="events" options={{ title: 'Events', tabBarIcon: icon('trophy-outline') }} />
      <Tabs.Screen name="teams" options={{ title: 'Teams', tabBarIcon: icon('people-outline') }} />
      <Tabs.Screen name="account" options={{ title: 'Account', tabBarIcon: icon('person-circle-outline') }} />
    </Tabs>
  );
}

import { API_URL } from '@/lib/api';
import { useAuth } from '@/state/auth';
import { Button, Card, Screen, Text } from '@/ui';

export default function AccountTab() {
  const user = useAuth((s) => s.user);
  return (
    <Screen>
      <Card style={{ gap: 4 }}>
        <Text variant="title">{user?.name}</Text>
        <Text variant="muted">{user?.email}</Text>
      </Card>
      <Button title="Sign out" variant="secondary" onPress={() => void useAuth.getState().signOut()} />
      <Text variant="muted">Server: {API_URL}</Text>
    </Screen>
  );
}

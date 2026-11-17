import Constants from 'expo-constants';

/**
 * API base URL, in this order:
 * 1. EXPO_PUBLIC_API_URL (set it for a deployed API or a real phone on another network)
 * 2. the machine running the Expo dev server, port 4000 (works for a phone on the same Wi-Fi)
 */
export function resolveApiUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/+$/, '');
  const hostUri = Constants.expoConfig?.hostUri; // e.g. "192.168.1.5:8081"
  const host = hostUri?.split(':')[0];
  return `http://${host ?? 'localhost'}:4000`;
}


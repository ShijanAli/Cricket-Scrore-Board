/** Build-time settings. Only VITE_* variables reach the browser. */
const trim = (s: string) => s.replace(/\/+$/, '');

export const env = {
  /** Where the API lives. Routes have no prefix (/auth, /matches, ...). */
  apiUrl: trim(import.meta.env.VITE_API_URL ?? 'http://localhost:4000'),
  /** Turn off when the API host cannot keep WebSocket connections (the app polls instead). */
  socketEnabled: import.meta.env.VITE_ENABLE_SOCKET !== 'false',
} as const;

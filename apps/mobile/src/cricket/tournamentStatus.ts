import type { TournamentStatus } from '@cricket/client-core';

type Tone = 'neutral' | 'success' | 'live' | 'warning';

/** How a tournament status is labelled and coloured everywhere in the app. */
export const tournamentBadge = (s: TournamentStatus): { label: string; tone: Tone } =>
  s === 'live' ? { label: 'In progress', tone: 'live' }
  : s === 'paused' ? { label: 'Paused', tone: 'warning' }
  : s === 'completed' ? { label: 'Completed', tone: 'success' }
  : { label: 'Setting up', tone: 'neutral' };

import { create } from 'zustand';
import type { CelebrationView } from '@cricket/client-core';

export interface QueuedCelebration {
  key: string;
  view: CelebrationView;
}

const MAX_QUEUE = 3;

interface CelebrationStore {
  queue: QueuedCelebration[];
  push: (items: QueuedCelebration[]) => void;
  /** Drop the one on screen. */
  next: () => void;
  clear: () => void;
}

export const useCelebrationStore = create<CelebrationStore>((set) => ({
  queue: [],
  push: (items) => set((s) => ({ queue: [...s.queue, ...items].slice(-MAX_QUEUE) })),
  next: () => set((s) => ({ queue: s.queue.slice(1) })),
  clear: () => set({ queue: [] }),
}));

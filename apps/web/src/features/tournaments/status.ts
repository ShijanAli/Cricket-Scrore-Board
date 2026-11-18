/** One place for how a tournament status looks, shared by the organiser, events and public pages. */
export const STATUS_LABEL = { draft: 'Setting up', live: 'In progress', paused: 'Paused', completed: 'Completed' } as const;
export const STATUS_VARIANT = { draft: 'secondary', live: 'live', paused: 'warning', completed: 'success' } as const;

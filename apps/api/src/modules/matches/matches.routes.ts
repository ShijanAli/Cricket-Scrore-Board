import { Router } from 'express';
import {
  createSingleMatchSchema,
  ingestEventsSchema,
  inningsSetupSchema,
  paginationQuerySchema,
  playingXISchema,
  scheduleMatchSchema,
  tossSchema,
} from '@cricket/shared';
import { z } from 'zod';
import { asyncHandler } from '../../lib/http';
import { idParams, uuidSchema } from '../../lib/ids';
import { optionalAuth, requireAuth, uid } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { canScore } from './access';
import * as matches from './matches.service';
import * as scoring from './scoring.service';

const closeSchema = z.object({
  outcome: z.enum(['abandoned', 'no_result', 'walkover']),
  winnerTeamId: uuidSchema.optional(),
  note: z.string().trim().max(120).optional(),
});

const eventsQuery = z.object({
  inningsNo: z.coerce.number().int().min(1).max(4),
  afterSeq: z.coerce.number().int().min(0).default(0),
});

export const matchesRouter = Router();

matchesRouter.post(
  '/',
  requireAuth,
  validate(createSingleMatchSchema),
  asyncHandler(async (req, res) => {
    res.status(201).json({ match: await matches.createSingleMatch(uid(req), req.body) });
  }),
);

matchesRouter.get(
  '/',
  requireAuth,
  validate(paginationQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    res.json(await matches.listMyMatches(uid(req), req.query as never));
  }),
);

// Must be registered before '/:id'.
matchesRouter.get(
  '/live',
  asyncHandler(async (_req, res) => {
    res.json({ matches: await matches.listLiveMatches() });
  }),
);

matchesRouter.get(
  '/:id',
  optionalAuth,
  validate(idParams, 'params'),
  asyncHandler(async (req, res) => {
    // Tells the app whether to show scoring buttons (owner, or organiser/scorer of the tournament).
    // The two lookups are independent, so they run together.
    const [match, mayScore] = await Promise.all([matches.getMatchViewCached(req.params.id!), canScore(req.params.id!, req.userId)]);
    res.json({ match: { ...match, canScore: mayScore } });
  }),
);

matchesRouter.put(
  '/:id/playing-xi',
  requireAuth,
  validate(idParams, 'params'),
  validate(playingXISchema),
  asyncHandler(async (req, res) => {
    res.json({ match: await matches.setPlayingXI(req.params.id!, uid(req), req.body) });
  }),
);

matchesRouter.post(
  '/:id/toss',
  requireAuth,
  validate(idParams, 'params'),
  validate(tossSchema),
  asyncHandler(async (req, res) => {
    res.json({ match: await matches.recordToss(req.params.id!, uid(req), req.body) });
  }),
);

matchesRouter.patch(
  '/:id/schedule',
  requireAuth,
  validate(idParams, 'params'),
  validate(scheduleMatchSchema),
  asyncHandler(async (req, res) => {
    res.json({ match: await matches.scheduleMatch(req.params.id!, uid(req), req.body) });
  }),
);

matchesRouter.post(
  '/:id/close',
  requireAuth,
  validate(idParams, 'params'),
  validate(closeSchema),
  asyncHandler(async (req, res) => {
    res.json({ match: await matches.closeMatch(req.params.id!, uid(req), req.body) });
  }),
);

matchesRouter.post(
  '/:id/innings',
  requireAuth,
  validate(idParams, 'params'),
  validate(inningsSetupSchema),
  asyncHandler(async (req, res) => {
    res.status(201).json({ match: await scoring.startInnings(req.params.id!, uid(req), req.body) });
  }),
);

matchesRouter.post(
  '/:id/events',
  requireAuth,
  validate(idParams, 'params'),
  validate(ingestEventsSchema),
  asyncHandler(async (req, res) => {
    res.json(await scoring.ingestEvents(req.params.id!, uid(req), req.body));
  }),
);

matchesRouter.get(
  '/:id/events',
  validate(idParams, 'params'),
  validate(eventsQuery, 'query'),
  asyncHandler(async (req, res) => {
    const q = req.query as unknown as z.infer<typeof eventsQuery>;
    res.json(await scoring.listEvents(req.params.id!, q.inningsNo, q.afterSeq));
  }),
);

matchesRouter.post(
  '/:id/scorer/lock',
  requireAuth,
  validate(idParams, 'params'),
  asyncHandler(async (req, res) => {
    res.json(await scoring.lockScorer(req.params.id!, uid(req)));
  }),
);

matchesRouter.delete(
  '/:id/scorer/lock',
  requireAuth,
  validate(idParams, 'params'),
  asyncHandler(async (req, res) => {
    await scoring.releaseScorer(req.params.id!, uid(req));
    res.status(204).end();
  }),
);

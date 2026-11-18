import { Router } from 'express';
import { createSeriesSchema, createTournamentSchema } from '@cricket/shared';
import { z } from 'zod';
import { asyncHandler } from '../../lib/http';
import { idParams, uuidSchema } from '../../lib/ids';
import { requireAuth, uid } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import * as awards from './awards.service';
import * as series from './series.service';
import * as tournaments from './tournaments.service';

const addTeamSchema = z.object({ teamId: uuidSchema, seed: z.number().int().min(1).max(64).optional() });
const addScorerSchema = z.object({ email: z.string().trim().toLowerCase().email() });
const teamParams = z.object({ id: uuidSchema, teamId: uuidSchema });

export const tournamentsRouter = Router();

tournamentsRouter.post(
  '/',
  requireAuth,
  validate(createTournamentSchema),
  asyncHandler(async (req, res) => {
    res.status(201).json({ tournament: await tournaments.createTournament(uid(req), req.body) });
  }),
);

tournamentsRouter.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json({ tournaments: await tournaments.listMyTournaments(uid(req)) });
  }),
);

// Public: anyone with the link can follow a tournament.
tournamentsRouter.get(
  '/:id',
  validate(idParams, 'params'),
  asyncHandler(async (req, res) => {
    res.json({ tournament: await tournaments.getTournament(req.params.id!) });
  }),
);

// Public: champion, Man of the Series, top scorer, top wicket-taker.
tournamentsRouter.get(
  '/:id/awards',
  validate(idParams, 'params'),
  asyncHandler(async (req, res) => {
    res.json({ awards: await awards.getTournamentAwards(req.params.id!) });
  }),
);

tournamentsRouter.post(
  '/:id/teams',
  requireAuth,
  validate(idParams, 'params'),
  validate(addTeamSchema),
  asyncHandler(async (req, res) => {
    const { teamId, seed } = req.body as z.infer<typeof addTeamSchema>;
    res.status(201).json({ entry: await tournaments.addTeam(req.params.id!, uid(req), teamId, seed) });
  }),
);

tournamentsRouter.delete(
  '/:id/teams/:teamId',
  requireAuth,
  validate(teamParams, 'params'),
  asyncHandler(async (req, res) => {
    await tournaments.removeTeam(req.params.id!, uid(req), req.params.teamId!);
    res.status(204).end();
  }),
);

tournamentsRouter.post(
  '/:id/scorers',
  requireAuth,
  validate(idParams, 'params'),
  validate(addScorerSchema),
  asyncHandler(async (req, res) => {
    res.status(201).json({ scorer: await tournaments.addScorer(req.params.id!, uid(req), req.body.email) });
  }),
);

tournamentsRouter.post(
  '/:id/fixtures',
  requireAuth,
  validate(idParams, 'params'),
  asyncHandler(async (req, res) => {
    res.status(201).json({ fixtures: await tournaments.generateTournamentFixtures(req.params.id!, uid(req)) });
  }),
);

tournamentsRouter.get(
  '/:id/fixtures',
  validate(idParams, 'params'),
  asyncHandler(async (req, res) => {
    res.json({ fixtures: await tournaments.listFixtures(req.params.id!) });
  }),
);

tournamentsRouter.get(
  '/:id/standings',
  validate(idParams, 'params'),
  asyncHandler(async (req, res) => {
    res.json({ standings: await tournaments.getStandings(req.params.id!) });
  }),
);

export const seriesRouter = Router();

seriesRouter.post(
  '/',
  requireAuth,
  validate(createSeriesSchema),
  asyncHandler(async (req, res) => {
    res.status(201).json({ series: await series.createSeries(uid(req), req.body) });
  }),
);

seriesRouter.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json({ series: await series.listMySeries(uid(req)) });
  }),
);

seriesRouter.get(
  '/:id/awards',
  validate(idParams, 'params'),
  asyncHandler(async (req, res) => {
    res.json({ awards: await awards.getSeriesAwards(req.params.id!) });
  }),
);

seriesRouter.get(
  '/:id',
  validate(idParams, 'params'),
  asyncHandler(async (req, res) => {
    res.json({ series: await series.getSeries(req.params.id!) });
  }),
);

import { Router } from 'express';
import {
  addSquadPlayerSchema,
  createPlayerSchema,
  createTeamSchema,
  updateTeamSchema,
} from '@cricket/shared';
import { z } from 'zod';
import { asyncHandler } from '../../lib/http';
import { idParams, uuidSchema } from '../../lib/ids';
import { optionalAuth, requireAuth, uid } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import * as teams from './teams.service';

const idParam = idParams;
const squadParam = z.object({ id: uuidSchema, playerId: uuidSchema });
const playerQuery = z.object({ q: z.string().trim().max(60).optional() });

export const teamsRouter = Router();

teamsRouter.post(
  '/',
  requireAuth,
  validate(createTeamSchema),
  asyncHandler(async (req, res) => {
    res.status(201).json({ team: await teams.createTeam(uid(req), req.body) });
  }),
);

teamsRouter.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json({ teams: await teams.listMyTeams(uid(req)) });
  }),
);

// Public read so live pages can show a squad.
teamsRouter.get(
  '/:id',
  optionalAuth,
  validate(idParam, 'params'),
  asyncHandler(async (req, res) => {
    res.json({ team: await teams.getTeam(req.params.id!) });
  }),
);

teamsRouter.patch(
  '/:id',
  requireAuth,
  validate(idParam, 'params'),
  validate(updateTeamSchema),
  asyncHandler(async (req, res) => {
    res.json({ team: await teams.updateTeam(req.params.id!, uid(req), req.body) });
  }),
);

teamsRouter.delete(
  '/:id',
  requireAuth,
  validate(idParam, 'params'),
  asyncHandler(async (req, res) => {
    await teams.deleteTeam(req.params.id!, uid(req));
    res.status(204).end();
  }),
);

teamsRouter.post(
  '/:id/players',
  requireAuth,
  validate(idParam, 'params'),
  validate(addSquadPlayerSchema),
  asyncHandler(async (req, res) => {
    res.status(201).json({ member: await teams.addToSquad(req.params.id!, uid(req), req.body) });
  }),
);

teamsRouter.delete(
  '/:id/players/:playerId',
  requireAuth,
  validate(squadParam, 'params'),
  asyncHandler(async (req, res) => {
    await teams.removeFromSquad(req.params.id!, uid(req), req.params.playerId!);
    res.status(204).end();
  }),
);

export const playersRouter = Router();

playersRouter.post(
  '/',
  requireAuth,
  validate(createPlayerSchema),
  asyncHandler(async (req, res) => {
    res.status(201).json({ player: await teams.createPlayer(uid(req), req.body) });
  }),
);

playersRouter.get(
  '/',
  requireAuth,
  validate(playerQuery, 'query'),
  asyncHandler(async (req, res) => {
    const { q } = req.query as { q?: string };
    res.json({ players: await teams.listMyPlayers(uid(req), q) });
  }),
);

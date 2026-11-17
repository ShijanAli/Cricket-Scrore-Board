import { Router } from 'express';
import { loginSchema, refreshSchema, registerSchema } from '@cricket/shared';
import { asyncHandler } from '../../lib/http';
import { requireAuth, uid } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import * as auth from './auth.service';

export const authRouter = Router();

authRouter.post(
  '/register',
  validate(registerSchema),
  asyncHandler(async (req, res) => {
    res.status(201).json(await auth.register(req.body));
  }),
);

authRouter.post(
  '/login',
  validate(loginSchema),
  asyncHandler(async (req, res) => {
    res.json(await auth.login(req.body));
  }),
);

authRouter.post(
  '/refresh',
  validate(refreshSchema),
  asyncHandler(async (req, res) => {
    res.json(await auth.refresh(req.body.refreshToken));
  }),
);

authRouter.post(
  '/logout',
  validate(refreshSchema),
  asyncHandler(async (req, res) => {
    await auth.logout(req.body.refreshToken);
    res.status(204).end();
  }),
);

authRouter.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json({ user: await auth.me(uid(req)) });
  }),
);

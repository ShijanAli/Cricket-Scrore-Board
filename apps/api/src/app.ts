import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import { corsOrigins } from './config/env';
import { errorHandler, notFoundHandler } from './middleware/error-handler';
import { authRouter } from './modules/auth/auth.routes';
import { matchesRouter } from './modules/matches/matches.routes';
import { playersRouter, teamsRouter } from './modules/teams/teams.routes';
import { seriesRouter, tournamentsRouter } from './modules/tournaments/tournaments.routes';

/** Built separately from server.ts so tests can mount it with supertest. */
export function createApp(): Express {
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({ origin: corsOrigins() }));
  // A batch of 200 events is well under 1 MB.
  app.use(express.json({ limit: '1mb' }));

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/auth', authRouter);
  app.use('/teams', teamsRouter);
  app.use('/players', playersRouter);
  app.use('/tournaments', tournamentsRouter);
  app.use('/series', seriesRouter);
  app.use('/matches', matchesRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

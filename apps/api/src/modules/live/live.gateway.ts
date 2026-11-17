import type { Server as HttpServer } from 'node:http';
import { Server, type Socket } from 'socket.io';
import {
  LIVE_EVENTS,
  LIVE_NAMESPACE,
  matchRoom,
  type ClientToServerEvents,
  type MatchStatusPayload,
  type ScoreUpdatedPayload,
  type ScorerChangedPayload,
  type ServerToClientEvents,
} from '@cricket/shared';
import { corsOrigins } from '../../config/env';
import { prisma } from '../../db/prisma';
import { AppError } from '../../lib/errors';
import { isUuid } from '../../lib/ids';
import { asInnings } from '../../lib/json';
import { logger } from '../../lib/logger';
import { verifyAccessToken } from '../../lib/tokens';
import { lockScorer, releaseScorer } from '../matches/scoring.service';
import { liveBus, type LiveSink } from './live-bus';

interface SocketData {
  userId: string | null;
}

type LiveSocket = Socket<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;

/**
 * Realtime layer. Viewers join `match:{id}` rooms (no login needed). Scorers authenticate with
 * their access token in the handshake. All writes still go through the REST API; the socket is
 * only used to broadcast and to claim/release the scorer lock.
 */
export class LiveGateway implements LiveSink {
  private readonly io: Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;

  constructor(httpServer: HttpServer) {
    this.io = new Server(httpServer, { cors: { origin: corsOrigins() } });
    const ns = this.io.of(LIVE_NAMESPACE);

    // Anonymous viewers are allowed. A token, if sent, must be valid.
    ns.use((socket, next) => {
      const token = (socket.handshake.auth as { token?: unknown } | undefined)?.token;
      socket.data.userId = null;
      if (typeof token === 'string' && token) {
        try {
          socket.data.userId = verifyAccessToken(token);
        } catch {
          return next(new Error('INVALID_TOKEN'));
        }
      }
      next();
    });

    ns.on('connection', (socket) => this.onConnection(socket as LiveSocket));
  }

  private onConnection(socket: LiveSocket) {
    socket.on(LIVE_EVENTS.client.joinMatch, async ({ matchId }, ack) => {
      if (!isUuid(matchId)) return ack?.(false);
      try {
        await socket.join(matchRoom(matchId));
        ack?.(true);
        await this.sendCurrentState(socket, matchId);
      } catch (e) {
        logger.error('join failed', e);
        ack?.(false);
      }
    });

    socket.on(LIVE_EVENTS.client.leaveMatch, ({ matchId }) => {
      void socket.leave(matchRoom(matchId));
    });

    socket.on(LIVE_EVENTS.client.scorerLock, async ({ matchId }, ack) => {
      if (!socket.data.userId || !isUuid(matchId)) return ack?.(false);
      try {
        await lockScorer(matchId, socket.data.userId);
        ack?.(true);
      } catch (e) {
        ack?.(false);
        const code = e instanceof AppError ? e.code : 'INTERNAL';
        const message = e instanceof AppError ? e.message : 'Could not lock the match';
        socket.emit(LIVE_EVENTS.server.error, { code, message });
      }
    });

    socket.on(LIVE_EVENTS.client.scorerRelease, async ({ matchId }) => {
      if (!socket.data.userId || !isUuid(matchId)) return;
      try {
        await releaseScorer(matchId, socket.data.userId);
      } catch (e) {
        logger.error('release failed', e);
      }
    });
  }

  /** A viewer who joins late (or reconnects) gets the latest score immediately. */
  private async sendCurrentState(socket: LiveSocket, matchId: string) {
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: { innings: { orderBy: { inningsNo: 'desc' }, take: 1 } },
    });
    if (!match) return;
    socket.emit(LIVE_EVENTS.server.scorerChanged, { matchId, scorerUserId: match.activeScorerId });
    socket.emit(LIVE_EVENTS.server.matchStatus, { matchId, status: match.status });
    const latest = match.innings[0];
    if (latest?.snapshot) {
      socket.emit(LIVE_EVENTS.server.scoreUpdated, {
        matchId,
        inningsNo: latest.inningsNo,
        innings: asInnings(latest.snapshot),
        lastSeq: latest.lastSeq,
      });
    }
  }

  // LiveSink: called by services through liveBus.
  scoreUpdated(p: ScoreUpdatedPayload) {
    this.io.of(LIVE_NAMESPACE).to(matchRoom(p.matchId)).emit(LIVE_EVENTS.server.scoreUpdated, p);
  }
  scorerChanged(p: ScorerChangedPayload) {
    this.io.of(LIVE_NAMESPACE).to(matchRoom(p.matchId)).emit(LIVE_EVENTS.server.scorerChanged, p);
  }
  matchStatus(p: MatchStatusPayload) {
    this.io.of(LIVE_NAMESPACE).to(matchRoom(p.matchId)).emit(LIVE_EVENTS.server.matchStatus, p);
  }

  attach() {
    liveBus.attach(this);
  }

  async close() {
    liveBus.detach();
    await this.io.close();
  }
}

# Cricket Score App

Local cricket scoring for single matches, series and tournaments.
Mobile app (Expo React Native), Express + Prisma + PostgreSQL API, Socket.io for live scores.

## Structure

```
apps/
  api/        Express + Prisma + Socket.io   (done: auth, teams, tournaments, series, matches, scoring, live)
  mobile/     Expo React Native              (next)
  web/        Next.js public live page       (later)
packages/
  shared/     zod schemas, enums, types, socket event contracts   (single source of truth)
  cricket-engine/  pure TypeScript cricket logic: scoring, result, NRR, standings, fixtures, scheduler
```

## Setup

```bash
corepack enable
pnpm install
cp .env.example apps/api/.env
docker compose up -d            # PostgreSQL
pnpm build                      # builds shared + engine
pnpm test                       # 101 engine tests + shared schema tests
pnpm --filter @cricket/api prisma:generate  # Prisma client (types)
pnpm --filter @cricket/api prisma:migrate   # creates the tables (first run creates the migration)
pnpm --filter @cricket/api dev              # API on http://localhost:4000
```

Deploying and building the APK: see [DEPLOY.md](DEPLOY.md).

## Rules the code follows

1. A schema is written once, in `packages/shared`. API validation, mobile forms and TypeScript types all come from it.
2. Cricket logic is written once, in `packages/cricket-engine`. The phone (offline scoring) and the server (verification) run the same code.
3. Every ball is an immutable event. Undo is another event. Scorecards are always rebuilt from the log with `replayInnings`.
4. Socket event names and payloads live in `packages/shared/src/socket/events.ts`. Never type them by hand.

## Scoring model (engine)

- `delivery.runs` = runs run/credited **excluding** the wide or no-ball penalty. Penalty comes from the match rules.
- Strike changes on odd `runs`. A boundary of 4 or 6 does not change strike; a boundary with an overthrow (5, 7) does.
- After a run-out the new batter takes the end the dismissed batter was at. If they had crossed differently, use the manual swap (`strikeSwap`).
- Free hit: after a no-ball. Only run out, obstructing the field, hit the ball twice, handled the ball are possible.
- One bowler cannot bowl two overs in a row; optional per-bowler over limit.
- Not yet in the engine: super over, DLS / revised targets, penalty runs, mid-over bowler change for injury, head-to-head tiebreaker.

## Database notes

- `ball_events.id` is a client UUID, so syncing the same event twice does nothing.
- `innings.snapshot` is a cache of the engine state. It can always be rebuilt from `ball_events`.
- A player can be in many teams. The "one team per player per tournament" rule is enforced in the service layer.

## API (apps/api)

Auth is `Authorization: Bearer <accessToken>`. Reads marked *public* need no login (live pages).
Errors always look like `{ "error": { "code", "message", "details?" } }`: 400 validation, 401/403 auth,
404, 409 conflict (`SCORER_LOCKED`, `INNINGS_EXISTS`...), 422 cricket-rule violation (`STRIKER_MISMATCH`...).

| Area | Endpoints |
| --- | --- |
| Auth | `POST /auth/register`, `/auth/login`, `/auth/refresh` (rotating), `/auth/logout`, `GET /auth/me` |
| Teams | `POST/GET /teams`, `GET/PATCH/DELETE /teams/:id`, `POST /teams/:id/players`, `DELETE /teams/:id/players/:playerId` |
| Players | `POST/GET /players` |
| Tournaments | `POST/GET /tournaments`, `GET /tournaments/:id` *public*, `POST/DELETE .../teams`, `POST .../scorers`, `POST .../fixtures` (generate), `GET .../fixtures`, `GET .../standings` *public* |
| Series | `POST/GET /series`, `GET /series/:id` *public* |
| Matches | `POST /matches` (single), `GET /matches`, `GET /matches/live` *public*, `GET /matches/:id` *public*, `PUT .../playing-xi`, `POST .../toss`, `PATCH .../schedule`, `POST .../close` (abandoned / no result / walkover) |
| Scoring | `POST .../innings`, `POST .../events` (batch), `GET .../events?inningsNo&afterSeq` *public*, `POST/DELETE .../scorer/lock` |

Match flow: create match -> playing XI for both teams -> toss -> start innings 1 (openers + bowler) ->
send ball events -> innings ends -> start innings 2 -> events -> result is computed by the server.

### Sending ball events (offline-first contract)

```http
POST /matches/:id/events
{ "inningsNo": 1, "events": [ { "id": "<uuid made on the phone>", "type": "delivery", "strikerId": "...", "bowlerId": "...", "runs": 4, "boundary": true } ] }
```

- The phone keeps an outbox and can resend the same batch any number of times. Events whose `id` is already stored
  are ignored (`duplicates` in the response), so retries are safe.
- The server replays the whole innings with `@cricket/engine` and validates every event, including that each player is
  in the right playing XI. One bad event rejects the whole batch (422 with `details.eventId` and `index`), nothing is half saved.
- Only the latest event can be undone, with an `undo` event. Undo can re-open a finished innings or match.
- Innings 1 is locked once innings 2 starts.
- One scorer at a time. The lock is taken by `POST .../scorer/lock` (or implicitly by sending events) and expires after
  `SCORER_LOCK_TTL_SECONDS` of silence, so a dead phone cannot block the match.

### Realtime (Socket.io, namespace `/live`)

Connect with `io(url + '/live', { auth: { token } })` (token optional for viewers). Emit `match:join { matchId }`, then
listen for `score:updated`, `match:status`, `scorer:changed`. A new viewer immediately gets the current state. Event names and
payloads come from `@cricket/shared` (`LIVE_EVENTS`). Broadcasts go out after the database commit.

### Tournament progression

After a match finishes the server fills TBD playoff slots (1st vs 2nd, "winner of match 7") and closes the tournament or
series when everything is decided. Standings only count `league` stage matches.

## Mobile app (apps/mobile)

Expo (SDK 58) + Expo Router. Light theme, primary `#0E7C4A`.

Run it (API must be running first, see Setup):

```bash
pnpm install
cp apps/mobile/.env.example apps/mobile/.env     # optional, see below
pnpm --filter @cricket/mobile start
```

- API address: by default the app uses the machine running the Expo dev server on port 4000, so a phone on the same Wi-Fi works with no setup. Android emulator: `EXPO_PUBLIC_API_URL=http://10.0.2.2:4000`. The API must listen on `0.0.0.0` (it does by default).
- Expo Go works (expo-sqlite and expo-secure-store ship with it).

Layout:

```
src/app        routes: (auth) login/register, (app)/(tabs) matches/teams/account,
               team/new, team/[id], match/new, match/[id]/{index,xi,toss,start-innings,score,scorecard,schedule},
               (tabs)/events, tournament/new, tournament/[id] (teams, fixtures, table), series/new, series/[id]
src/api        typed client (single-flight token refresh), endpoints, DTO types
src/features/scoring   offline scoring: controller, SQLite outbox, merge, intents, useScoring, ScoringView
src/cricket    FixtureRow, StandingsTable, fixture-utils, ScoreHeader, OverStrip, RunPad, ExtrasSheet, WicketSheet, Scorecard, XiPicker, MatchCard
src/ui         theme + reusable kit (Button, Card, TextField/FormField, Chip/Segmented, BottomSheet, QueryBoundary...)
src/hooks      React Query hooks, useLiveMatch (socket)
src/state      auth store (zustand + SecureStore)
```

Tournaments: create (league / league+final / league+semi-finals / knockout, automatic dates from a date range or manual), add your teams, create fixtures, follow fixtures and the points table. Playoff slots show "1st in table" / "Winner of match 7" until earlier results fill them in. Add a scorer by email so another person can score the tournament's matches. Series: best-of 1-9 between two of your teams with a running score.

How scoring works offline: a tap becomes an event, the engine replays the local log (so the screen updates instantly and illegal balls are refused before saving), the event is written to SQLite, then sent in the background (after every tap, every 8 s, and when the app returns to the foreground). Sending is idempotent, so retries are safe. If the server refuses a batch, scoring pauses and the scorer chooses: retry, or discard the unsynced balls and reload the server score.

## Tests

`pnpm test` runs the shared, engine, API and mobile tests (mobile tests cover only pure logic: API client, offline controller, merge, intents, match helpers; screens are verified by typecheck and a Metro bundle, not by running them). API tests use an in-memory fake of Prisma
(`apps/api/src/__tests__/fake-prisma.ts`) plus a real Socket.io client. They prove the logic, not the SQL: run the app once
against Postgres (`docker compose up -d`, migrate, then a manual match) before trusting it with a real tournament.

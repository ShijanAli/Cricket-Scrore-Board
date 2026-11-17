import { randomUUID } from 'node:crypto';

/**
 * A tiny in-memory stand-in for PrismaClient, only for unit tests. It supports exactly the query
 * features the services use (equality, in/lt/gt/not, OR/AND, compound unique keys, orderBy/take/skip).
 * It is NOT a database: constraints and locking are only as real as the code below.
 */
type Row = Record<string, any>;

const DEFAULTS: Record<string, Row> = {
  innings: { lastSeq: 0, status: 'inProgress', completedAt: null },
  match: {
    currentInningsNo: 0,
    status: 'scheduled',
    activeScorerId: null,
    scorerLockedAt: null,
    resultType: null,
    winnerId: null,
    resultMargin: null,
    resultText: null,
    tossWinnerId: null,
    tossDecision: null,
    tournamentId: null,
    seriesId: null,
    scheduledDate: null,
  },
  refreshToken: { revokedAt: null },
  tournament: { status: 'draft', scheduleMode: 'auto', doubleRoundRobin: false },
  series: { status: 'live' },
};

/** Only the relations the services `include`. */
const RELATIONS: Record<string, Record<string, { table: string; local: string; foreign: string; many: boolean }>> = {
  refreshToken: { user: { table: 'user', local: 'userId', foreign: 'id', many: false } },
  series: { matches: { table: 'match', local: 'id', foreign: 'seriesId', many: true } },
  match: { innings: { table: 'innings', local: 'id', foreign: 'matchId', many: true } },
  teamPlayer: {
    team: { table: 'team', local: 'teamId', foreign: 'id', many: false },
    player: { table: 'player', local: 'playerId', foreign: 'id', many: false },
  },
  team: { tournamentTeams: { table: 'tournamentTeam', local: 'id', foreign: 'teamId', many: true } },
};

const UNIQUES: Record<string, string[][]> = {
  user: [['email']],
  refreshToken: [['tokenHash']],
  innings: [['matchId', 'inningsNo']],
  ballEvent: [['id'], ['inningsId', 'seq']],
  team: [['ownerId', 'name']],
  tournamentTeam: [['tournamentId', 'teamId'], ['tournamentId', 'seed']],
};

const isPlain = (v: unknown): v is Row =>
  typeof v === 'object' && v !== null && !(v instanceof Date) && !Array.isArray(v);

const norm = (v: unknown) => (v === undefined ? null : v);
const cmpVal = (v: unknown) => (v instanceof Date ? v.getTime() : v);

type Ctx = { name: string; db: () => Record<string, any> };

function related(row: Row, ctx: Ctx, key: string) {
  const rel = RELATIONS[ctx.name]?.[key];
  if (!rel) return null;
  const rows = (ctx.db()[rel.table] as Table).rows.filter((r) => r[rel.foreign] === row[rel.local]);
  return { rel, rows };
}

function matches(row: Row, where: Row | undefined, ctx: Ctx): boolean {
  if (!where) return true;
  return Object.entries(where).every(([key, cond]) => {
    if (key === 'OR') return (cond as Row[]).some((w) => matches(row, w, ctx));
    if (key === 'AND') return (Array.isArray(cond) ? cond : [cond]).every((w: Row) => matches(row, w, ctx));
    if (key === 'NOT') return !matches(row, cond, ctx);
    // Compound unique key, e.g. matchId_inningsNo: { matchId, inningsNo }
    const rel = related(row, ctx, key);
    if (rel && isPlain(cond)) {
      const target = { name: rel.rel.table, db: ctx.db };
      if ('some' in cond) return rel.rows.some((r) => matches(r, cond.some as Row, target));
      return rel.rows.some((r) => matches(r, cond, target));
    }
    if (!(key in row) && isPlain(cond)) return matches(row, cond, ctx);
    const value = norm(row[key]);
    if (isPlain(cond)) {
      return Object.entries(cond).every(([op, arg]) => {
        const v = cmpVal(value);
        const a = cmpVal(arg);
        switch (op) {
          case 'in': return (arg as unknown[]).includes(value);
          case 'lt': return v !== null && (v as number) < (a as number);
          case 'gt': return v !== null && (v as number) > (a as number);
          case 'not': return value !== norm(arg);
          case 'mode': return true;
          case 'contains': return typeof value === 'string' && value.toLowerCase().includes(String(arg).toLowerCase());
          default: throw new Error(`fake-prisma: unsupported operator ${op}`);
        }
      });
    }
    return cmpVal(value) === cmpVal(norm(cond));
  });
}

class Table {
  rows: Row[] = [];
  constructor(private readonly name: string, private readonly db: () => Record<string, any>) {}

  private get ctx(): Ctx {
    return { name: this.name, db: this.db };
  }

  private withIncludes(row: Row, include?: Row): Row {
    const out = { ...row };
    for (const key of Object.keys(include ?? {})) {
      const rel = RELATIONS[this.name]?.[key];
      if (!rel) continue; // other includes are ignored by this fake
      const target = (this.db()[rel.table] as Table).rows.filter((r) => r[rel.foreign] === row[rel.local]);
      out[key] = rel.many ? target.map((r) => ({ ...r })) : target[0] ? { ...target[0] } : null;
    }
    return out;
  }

  private checkUnique(candidate: Row, ignore?: Row) {
    for (const cols of UNIQUES[this.name] ?? []) {
      const clash = this.rows.some(
        (r) => r !== ignore && cols.every((c) => r[c] != null && r[c] === candidate[c]) // NULLs never collide, like SQL,
      );
      if (clash) throw Object.assign(new Error(`Unique constraint failed on ${cols.join(',')}`), { code: 'P2002' });
    }
  }

  // Rows are returned as copies, like a real database: later writes must not change a row we already read.
  async findUnique({ where, include }: { where: Row; include?: Row }) {
    const r = this.rows.find((x) => matches(x, where, this.ctx));
    return r ? this.withIncludes(r, include) : null;
  }
  async findFirst(a: { where?: Row; include?: Row } = {}) {
    const r = this.rows.find((x) => matches(x, a.where, this.ctx));
    return r ? this.withIncludes(r, a.include) : null;
  }
  async findMany(a: { where?: Row; orderBy?: Row; skip?: number; take?: number; include?: Row } = {}) {
    let out = this.rows.filter((r) => matches(r, a.where, this.ctx));
    if (a.orderBy) {
      const [[field, dir]] = Object.entries(a.orderBy) as [[string, 'asc' | 'desc']];
      out = [...out].sort((x, y) => {
        const d = (cmpVal(x[field]) as number) < (cmpVal(y[field]) as number) ? -1 : (cmpVal(x[field]) as number) > (cmpVal(y[field]) as number) ? 1 : 0;
        return dir === 'desc' ? -d : d;
      });
    }
    return out.slice(a.skip ?? 0, a.take ? (a.skip ?? 0) + a.take : undefined).map((r) => this.withIncludes(r, a.include));
  }
  async create({ data }: { data: Row }) {
    const row: Row = { id: randomUUID(), createdAt: new Date(), ...(DEFAULTS[this.name] ?? {}), ...data };
    this.checkUnique(row);
    this.rows.push(row);
    return { ...row };
  }
  async createMany({ data }: { data: Row[] }) {
    for (const d of data) await this.create({ data: d });
    return { count: data.length };
  }
  async update({ where, data }: { where: Row; data: Row }) {
    const row = this.rows.find((r) => matches(r, where, this.ctx));
    if (!row) throw Object.assign(new Error('Record not found'), { code: 'P2025' });
    Object.assign(row, data);
    return { ...row };
  }
  async updateMany({ where, data }: { where?: Row; data: Row }) {
    const hit = this.rows.filter((r) => matches(r, where, this.ctx));
    hit.forEach((r) => Object.assign(r, data));
    return { count: hit.length };
  }
  async delete({ where }: { where: Row }) {
    const i = this.rows.findIndex((r) => matches(r, where, this.ctx));
    if (i < 0) throw Object.assign(new Error('Record not found'), { code: 'P2025' });
    return { ...this.rows.splice(i, 1)[0]! };
  }
  async deleteMany(a: { where?: Row } = {}) {
    const keep = this.rows.filter((r) => !matches(r, a.where, this.ctx));
    const count = this.rows.length - keep.length;
    this.rows = keep;
    return { count };
  }
  async count(a: { where?: Row } = {}) {
    return this.rows.filter((r) => matches(r, a.where, this.ctx)).length;
  }
}

export type FakePrisma = Record<string, any> & { table(name: string): { rows: Row[] } };

export function createFakePrisma(): FakePrisma {
  const tables = new Map<string, Table>();
  const target: Record<string, unknown> = {
    $transaction: async (fn: (tx: unknown) => Promise<unknown>) => fn(proxy),
    $queryRaw: async () => [],
    $disconnect: async () => undefined,
    /** Direct access for seeding and asserting in tests. */
    table: (name: string) => proxy[name] as Table,
  };
  const proxy: Record<string, any> = new Proxy(target, {
    get(t, prop: string) {
      if (prop in t) return t[prop];
      if (!tables.has(prop)) tables.set(prop, new Table(prop, () => proxy));
      return tables.get(prop);
    },
  });
  return proxy as FakePrisma;
}

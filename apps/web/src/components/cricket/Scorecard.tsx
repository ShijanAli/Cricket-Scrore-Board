import { oversFromBalls, strikeRate } from '@cricket/engine';
import type { DismissalInfo, InningsState } from '@cricket/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

type NameOf = (id: string | null | undefined) => string;

function dismissal(d: DismissalInfo | undefined, nameOf: NameOf): string {
  if (!d) return 'not out';
  const by = d.bowlerId ? ` b ${nameOf(d.bowlerId)}` : '';
  const f = d.fielderId ? ` (${nameOf(d.fielderId)})` : '';
  switch (d.type) {
    case 'bowled': return `b ${nameOf(d.bowlerId)}`;
    case 'caught': return `c ${nameOf(d.fielderId)}${by}`;
    case 'lbw': return `lbw${by}`;
    case 'stumped': return `st ${nameOf(d.fielderId)}${by}`;
    case 'runOut': return `run out${f}`;
    case 'hitWicket': return `hit wicket${by}`;
    case 'retiredOut': return 'retired out';
    default: return d.type;
  }
}

export function Scorecard({ title, state, nameOf }: { title: string; state: InningsState; nameOf: NameOf }) {
  const batters = state.battingOrder.map((id) => state.batters[id]).filter((b): b is NonNullable<typeof b> => !!b);
  const bowlers = Object.values(state.bowlers);
  const e = state.extras;
  const extrasTotal = e.wide + e.noBall + e.bye + e.legBye;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-baseline justify-between gap-2">
          <span>{title}</span>
          <span className="tabular-nums">
            {state.runs}/{state.wickets} <span className="text-sm font-normal text-muted-foreground">({oversFromBalls(state.legalBalls, state.ballsPerOver)} ov)</span>
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-full">Batter</TableHead>
              <TableHead className="text-right">R</TableHead>
              <TableHead className="text-right">B</TableHead>
              <TableHead className="text-right">4s</TableHead>
              <TableHead className="text-right">6s</TableHead>
              <TableHead className="text-right">SR</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {batters.map((b) => (
              <TableRow key={b.id}>
                <TableCell>
                  <div className="font-medium">
                    {nameOf(b.id)}
                    {b.id === state.strikerId ? ' *' : ''}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {b.status === 'retiredHurt' ? 'retired hurt' : b.status === 'batting' ? 'batting' : dismissal(b.out, nameOf)}
                  </div>
                </TableCell>
                <TableCell className="text-right font-semibold tabular-nums">{b.runs}</TableCell>
                <TableCell className="text-right tabular-nums">{b.balls}</TableCell>
                <TableCell className="text-right tabular-nums">{b.fours}</TableCell>
                <TableCell className="text-right tabular-nums">{b.sixes}</TableCell>
                <TableCell className="text-right tabular-nums">{strikeRate(b.runs, b.balls).toFixed(0)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <p className="text-sm text-muted-foreground">
          Extras {extrasTotal} (wd {e.wide}, nb {e.noBall}, b {e.bye}, lb {e.legBye})
        </p>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-full">Bowler</TableHead>
              <TableHead className="text-right">O</TableHead>
              <TableHead className="text-right">M</TableHead>
              <TableHead className="text-right">R</TableHead>
              <TableHead className="text-right">W</TableHead>
              <TableHead className="text-right">Wd/Nb</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bowlers.map((b) => (
              <TableRow key={b.id}>
                <TableCell className="font-medium">{nameOf(b.id)}</TableCell>
                <TableCell className="text-right tabular-nums">{oversFromBalls(b.legalBalls, state.ballsPerOver)}</TableCell>
                <TableCell className="text-right tabular-nums">{b.maidens}</TableCell>
                <TableCell className="text-right tabular-nums">{b.runs}</TableCell>
                <TableCell className="text-right font-semibold tabular-nums">{b.wickets}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {b.wides}/{b.noBalls}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {state.fallOfWickets.length > 0 ? (
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">FoW:</span>{' '}
            {state.fallOfWickets.map((f) => `${f.teamRuns}-${f.wicketNo} (${nameOf(f.batterId)})`).join(', ')}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

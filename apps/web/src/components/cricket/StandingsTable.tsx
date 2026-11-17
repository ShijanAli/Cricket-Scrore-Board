import { formatNrr } from '@cricket/engine';
import type { StandingRowDto } from '@cricket/client-core';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TeamBadge } from '@/components/common/TeamBadge';

export function StandingsTable({ rows }: { rows: readonly StandingRowDto[] }) {
  return (
    <Card className="py-2">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8 pl-4">#</TableHead>
            <TableHead className="w-full">Team</TableHead>
            <TableHead className="text-right">P</TableHead>
            <TableHead className="text-right">W</TableHead>
            <TableHead className="text-right">L</TableHead>
            <TableHead className="text-right">T</TableHead>
            <TableHead className="text-right">NR</TableHead>
            <TableHead className="text-right">Pts</TableHead>
            <TableHead className="pr-4 text-right">NRR</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.teamId}>
              <TableCell className="pl-4 text-muted-foreground tabular-nums">{r.rank}</TableCell>
              <TableCell>
                <span className="flex items-center gap-2 font-medium">
                  <TeamBadge shortName={r.team?.shortName ?? '?'} color={r.team?.color} size="sm" />
                  {r.team?.name ?? '?'}
                </span>
              </TableCell>
              <TableCell className="text-right tabular-nums">{r.played}</TableCell>
              <TableCell className="text-right tabular-nums">{r.won}</TableCell>
              <TableCell className="text-right tabular-nums">{r.lost}</TableCell>
              <TableCell className="text-right tabular-nums">{r.tied}</TableCell>
              <TableCell className="text-right tabular-nums">{r.noResult}</TableCell>
              <TableCell className="text-right font-bold tabular-nums">{r.points}</TableCell>
              <TableCell className="pr-4 text-right tabular-nums">{formatNrr(r.nrr)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}

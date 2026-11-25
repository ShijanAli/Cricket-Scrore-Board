import { PlayerAvatar } from '@/components/art/CricketArt';
import { useState } from 'react';
import { PLAYER_ROLES, type PlayerRole } from '@cricket/shared';
import { Trash2, X } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChoiceGroup } from '@/components/common/ChoiceGroup';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { ErrorState } from '@/components/common/ErrorState';
import { PageHeader } from '@/components/common/PageHeader';
import { QueryBoundary } from '@/components/common/QueryBoundary';
import { TeamBadge } from '@/components/common/TeamBadge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { errorMessage } from '@/lib/errors';
import { paths } from '@/lib/paths';
import { useAddSquadPlayersBulkMutation, useDeleteTeamMutation, useGetTeamQuery, useRemoveSquadPlayerMutation } from './teamsApi';

const ROLE_LABEL: Record<PlayerRole, string> = {
  batter: 'Batter',
  bowler: 'Bowler',
  all_rounder: 'All-rounder',
  wicketkeeper: 'Keeper',
};

export function TeamDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const team = useGetTeamQuery(id);
  const [savePlayers, add] = useAddSquadPlayersBulkMutation();
  const [removePlayer, remove] = useRemoveSquadPlayerMutation();
  const [deleteTeam, del] = useDeleteTeamMutation();
  const [name, setName] = useState('');
  const [role, setRole] = useState<PlayerRole>('batter');
  const [drafts, setDrafts] = useState<{ name: string; role: PlayerRole }[]>([]);
  const [nameError, setNameError] = useState<string | undefined>();
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Adding only fills a local list; nothing is sent until "Save squad".
  const addDraft = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length < 2) return setNameError('Enter at least 2 letters');
    setNameError(undefined);
    setDrafts((d) => [...d, { name: trimmed, role }]);
    setName('');
  };

  const saveAll = async () => {
    const res = await savePlayers({
      teamId: id,
      input: { players: drafts.map((d) => ({ ...d, isCaptain: false, isViceCaptain: false, isWicketkeeper: false })) },
    });
    if (!res.error) setDrafts([]);
  };

  return (
    <>
      <PageHeader title={team.data?.name ?? 'Team'} backTo={paths.app.teams} />
      <QueryBoundary query={team}>
        {(t) => (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <TeamBadge shortName={t.shortName} color={t.color} size="lg" />
              <p className="text-muted-foreground">{t.roster.length} players</p>
            </div>

            <section className="space-y-3">
              <h2 className="font-semibold">Squad</h2>
              {t.roster.length === 0 ? <p className="text-sm text-muted-foreground">No players yet. Add your first player below.</p> : null}
              <div className="grid gap-2 sm:grid-cols-2">
                {t.roster.map((m) => (
                  <Card key={m.playerId} className="py-3">
                    <CardContent className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <PlayerAvatar name={m.player.name} role={m.player.role} />
                        <div className="min-w-0 space-y-1">
                          <p className="truncate font-semibold">{m.player.name}</p>
                          <Badge variant="secondary">{ROLE_LABEL[m.player.role]}</Badge>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Remove ${m.player.name}`}
                        disabled={remove.isLoading}
                        onClick={() => void removePlayer({ teamId: id, playerId: m.playerId })}
                      >
                        <Trash2 />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
              {remove.isError ? <ErrorState message={errorMessage(remove.error)} /> : null}
            </section>

            <Card className="max-w-xl">
              <CardHeader>
                <CardTitle>Add player</CardTitle>
              </CardHeader>
              <CardContent>
                <form className="space-y-4" onSubmit={addDraft}>
                  <div className="space-y-1.5">
                    <Label htmlFor="player-name">Name</Label>
                    <Input id="player-name" value={name} onChange={(e) => setName(e.target.value)} aria-invalid={!!nameError} />
                    {nameError ? <p className="text-xs text-destructive">{nameError}</p> : null}
                  </div>
                  <ChoiceGroup label="Role" options={PLAYER_ROLES.values.map((r) => ({ value: r, label: ROLE_LABEL[r] }))} value={role} onChange={setRole} />
                  <Button type="submit" variant="secondary" disabled={add.isLoading}>
                    Add to list
                  </Button>
                </form>

                {drafts.length > 0 ? (
                  <div className="mt-5 space-y-3">
                    <p className="text-sm font-medium">To be saved ({drafts.length})</p>
                    <ul className="space-y-2">
                      {drafts.map((d, i) => (
                        <li key={`${d.name}-${i}`} className="flex items-center justify-between gap-3 rounded-md border px-3 py-2">
                          <span className="min-w-0 truncate">
                            {d.name} <Badge variant="secondary">{ROLE_LABEL[d.role]}</Badge>
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label={`Remove ${d.name} from list`}
                            disabled={add.isLoading}
                            onClick={() => setDrafts((list) => list.filter((_, j) => j !== i))}
                          >
                            <X />
                          </Button>
                        </li>
                      ))}
                    </ul>
                    {add.isError ? <ErrorState message={errorMessage(add.error)} /> : null}
                    <Button type="button" disabled={add.isLoading} onClick={() => void saveAll()}>
                      {add.isLoading ? 'Saving…' : `Save squad (${drafts.length})`}
                    </Button>
                  </div>
                ) : null}
              </CardContent>
            </Card>

            <Button variant="destructive" onClick={() => setConfirmOpen(true)}>
              Delete team
            </Button>
            {del.isError ? <ErrorState message={errorMessage(del.error)} /> : null}
          </div>
        )}
      </QueryBoundary>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Delete team?"
        description="The squad will be removed. Played matches are kept."
        confirmLabel="Delete"
        destructive
        loading={del.isLoading}
        onConfirm={async () => {
          const res = await deleteTeam(id);
          setConfirmOpen(false);
          if (!res.error) navigate(paths.app.teams, { replace: true });
        }}
      />
    </>
  );
}

import { useState } from 'react';
import { PLAYER_ROLES, type PlayerRole } from '@cricket/shared';
import { Trash2 } from 'lucide-react';
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
import { useAddSquadPlayerMutation, useDeleteTeamMutation, useGetTeamQuery, useRemoveSquadPlayerMutation } from './teamsApi';

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
  const [addPlayer, add] = useAddSquadPlayerMutation();
  const [removePlayer, remove] = useRemoveSquadPlayerMutation();
  const [deleteTeam, del] = useDeleteTeamMutation();
  const [name, setName] = useState('');
  const [role, setRole] = useState<PlayerRole>('batter');
  const [nameError, setNameError] = useState<string | undefined>();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length < 2) return setNameError('Enter at least 2 letters');
    setNameError(undefined);
    const res = await addPlayer({
      teamId: id,
      input: { newPlayer: { name: trimmed, role }, isCaptain: false, isViceCaptain: false, isWicketkeeper: false },
    });
    if (!res.error) setName('');
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
                      <div className="min-w-0 space-y-1">
                        <p className="truncate font-medium">{m.player.name}</p>
                        <Badge variant="secondary">{ROLE_LABEL[m.player.role]}</Badge>
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
                <form className="space-y-4" onSubmit={(e) => void submit(e)}>
                  <div className="space-y-1.5">
                    <Label htmlFor="player-name">Name</Label>
                    <Input id="player-name" value={name} onChange={(e) => setName(e.target.value)} aria-invalid={!!nameError} />
                    {nameError ? <p className="text-xs text-destructive">{nameError}</p> : null}
                  </div>
                  <ChoiceGroup label="Role" options={PLAYER_ROLES.values.map((r) => ({ value: r, label: ROLE_LABEL[r] }))} value={role} onChange={setRole} />
                  {add.isError ? <ErrorState message={errorMessage(add.error)} /> : null}
                  <Button type="submit" disabled={add.isLoading}>
                    {add.isLoading ? 'Adding…' : 'Add to squad'}
                  </Button>
                </form>
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

import type { SquadMember, Team } from '@cricket/client-core';
import { Link } from 'react-router-dom';
import { ChoiceButton } from '@/components/common/ChoiceGroup';
import { TeamBadge } from '@/components/common/TeamBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { paths } from '@/lib/paths';

export interface XiPickerProps {
  team: Team;
  squad: readonly SquadMember[];
  selected: readonly string[];
  max: number;
  onChange: (ids: string[]) => void;
}

/** Choose a team's playing XI from its squad. Tap order is the batting order. */
export function XiPicker({ team, squad, selected, max, onChange }: XiPickerProps) {
  const toggle = (id: string) => {
    if (selected.includes(id)) onChange(selected.filter((x) => x !== id));
    else if (selected.length < max) onChange([...selected, id]);
  };
  return (
    <Card>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <TeamBadge shortName={team.shortName} color={team.color} />
          <div className="min-w-0 flex-1">
            <p className="font-semibold">{team.name}</p>
            <p className="text-sm text-muted-foreground">
              {selected.length} of {max} selected (batting order = click order)
            </p>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link to={paths.app.team(team.id)}>Manage squad</Link>
          </Button>
        </div>
        {squad.length === 0 ? <p className="text-sm text-muted-foreground">This team has no players yet.</p> : null}
        <div className="flex flex-wrap gap-2">
          {squad.map((m) => {
            const pos = selected.indexOf(m.playerId);
            return (
              <ChoiceButton
                key={m.playerId}
                role="checkbox"
                selected={pos >= 0}
                disabled={pos < 0 && selected.length >= max}
                onClick={() => toggle(m.playerId)}
              >
                {pos >= 0 ? `${pos + 1}. ${m.player.name}` : m.player.name}
              </ChoiceButton>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

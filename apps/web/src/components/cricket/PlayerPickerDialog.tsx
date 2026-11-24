import { PlayerAvatar } from '@/components/art/CricketArt';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { PickablePlayer } from './WicketDialog';

export interface PlayerPickerDialogProps {
  open: boolean;
  title: string;
  players: readonly PickablePlayer[];
  onPick: (id: string) => void;
  emptyText?: string;
}

/** A required choice (new batter, next bowler): cannot be dismissed without picking. */
export function PlayerPickerDialog({ open, title, players, onPick, emptyText = 'No players available' }: PlayerPickerDialogProps) {
  return (
    <Dialog open={open}>
      <DialogContent showCloseButton={false} onInteractOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {players.length === 0 ? <p className="text-sm text-muted-foreground">{emptyText}</p> : null}
        <div className="grid gap-2">
          {players.map((p) => (
            <Button key={p.id} variant="outline" className="h-12 justify-between" onClick={() => onPick(p.id)}>
              <span className="flex items-center gap-3">
                <PlayerAvatar name={p.name} size="sm" />
                {p.name}
              </span>
              {p.note ? <span className="text-xs text-muted-foreground">{p.note}</span> : null}
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

import { playerNames, teamName, type MatchDetail } from '@cricket/client-core';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EmptyState } from '@/components/common/EmptyState';
import { Scorecard } from './Scorecard';
import { ScoreHeader } from './ScoreHeader';

/** Live score lines plus a full scorecard per innings. Used by the public page and the organiser's scorecard page. */
export function MatchScoreboard({ match }: { match: MatchDetail }) {
  const nameOf = playerNames(match.players);
  const rows = [...match.innings].sort((a, b) => a.inningsNo - b.inningsNo).filter((r) => r.snapshot);
  if (rows.length === 0) {
    return <EmptyState title="Match not started" hint="The score appears here as soon as the first innings begins." />;
  }
  return (
    <Tabs defaultValue="summary">
      <TabsList>
        <TabsTrigger value="summary">Summary</TabsTrigger>
        <TabsTrigger value="scorecard">Scorecard</TabsTrigger>
      </TabsList>
      <TabsContent value="summary" className="space-y-3">
        {rows.map((r) => (
          <ScoreHeader key={r.id} teamName={`${teamName(match, r.battingTeamId)} · innings ${r.inningsNo}`} state={r.snapshot!} />
        ))}
      </TabsContent>
      <TabsContent value="scorecard" className="space-y-4">
        {rows.map((r) => (
          <Scorecard key={r.id} title={`${teamName(match, r.battingTeamId)} (innings ${r.inningsNo})`} state={r.snapshot!} nameOf={nameOf} />
        ))}
      </TabsContent>
    </Tabs>
  );
}

import { useMutation, useQuery, useQueryClient, type QueryKey } from '@tanstack/react-query';
import type {
  AddSquadPlayerInput,
  CreateSeriesInput,
  CreateSingleMatchInput,
  CreateTournamentInput,
  ScheduleMatchInput,
  CreateTeamInput,
  InningsSetup,
  PlayingXIInput,
  TossInput,
} from '@cricket/shared';
import { api } from '@/lib/api';
import { keys } from '@/lib/query';

// ---------- reads ----------
export const useTeams = () => useQuery({ queryKey: keys.teams, queryFn: api.teams.list });
export const useTeam = (id: string) => useQuery({ queryKey: keys.team(id), queryFn: () => api.teams.get(id) });
export const useMatches = () => useQuery({ queryKey: keys.matches, queryFn: () => api.matches.list(1) });
export const useLiveMatches = () =>
  useQuery({ queryKey: keys.liveMatches, queryFn: api.matches.live, refetchInterval: 30_000 });
export const useMatch = (id: string) => useQuery({ queryKey: keys.match(id), queryFn: () => api.matches.get(id) });

// ---------- writes ----------
/** Every mutation invalidates the same few keys, so the helper lives here once. */
function useApiMutation<V, R>(fn: (v: V) => Promise<R>, invalidate: (v: V, r: R) => QueryKey[]) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: async (r, v) => {
      await Promise.all(invalidate(v, r).map((queryKey) => qc.invalidateQueries({ queryKey })));
    },
  });
}

export const useCreateTeam = () => useApiMutation((v: CreateTeamInput) => api.teams.create(v), () => [keys.teams]);

export const useAddSquadPlayer = (teamId: string) =>
  useApiMutation((v: AddSquadPlayerInput) => api.teams.addPlayer(teamId, v), () => [keys.team(teamId), keys.teams]);

export const useRemoveSquadPlayer = (teamId: string) =>
  useApiMutation((playerId: string) => api.teams.removePlayer(teamId, playerId), () => [keys.team(teamId), keys.teams]);

export const useDeleteTeam = () => useApiMutation((id: string) => api.teams.remove(id), () => [keys.teams]);

export const useCreateMatch = () =>
  useApiMutation((v: CreateSingleMatchInput) => api.matches.createSingle(v), () => [keys.matches]);

export const useSetPlayingXI = (matchId: string) =>
  useApiMutation((v: PlayingXIInput) => api.matches.setPlayingXI(matchId, v), () => [keys.match(matchId)]);

export const useToss = (matchId: string) =>
  useApiMutation((v: TossInput) => api.matches.toss(matchId, v), () => [keys.match(matchId), keys.matches]);

export const useStartInnings = (matchId: string) =>
  useApiMutation((v: InningsSetup) => api.matches.startInnings(matchId, v), () => [
    keys.match(matchId),
    keys.matches,
    keys.liveMatches,
  ]);

// ---------- tournaments ----------
export const useTournaments = () => useQuery({ queryKey: keys.tournaments, queryFn: api.tournaments.list });
export const useTournament = (id: string) => useQuery({ queryKey: keys.tournament(id), queryFn: () => api.tournaments.get(id) });
export const useFixtures = (id: string) => useQuery({ queryKey: keys.fixtures(id), queryFn: () => api.tournaments.fixtures(id) });
export const useStandings = (id: string) => useQuery({ queryKey: keys.standings(id), queryFn: () => api.tournaments.standings(id) });

export const useCreateTournament = () =>
  useApiMutation((v: CreateTournamentInput) => api.tournaments.create(v), () => [keys.tournaments]);

export const useAddTournamentTeam = (id: string) =>
  useApiMutation((teamId: string) => api.tournaments.addTeam(id, teamId), () => [keys.tournament(id), keys.tournaments]);

export const useRemoveTournamentTeam = (id: string) =>
  useApiMutation((teamId: string) => api.tournaments.removeTeam(id, teamId), () => [keys.tournament(id), keys.tournaments]);

export const useAddTournamentScorer = (id: string) =>
  useApiMutation((email: string) => api.tournaments.addScorer(id, email), () => [keys.tournament(id)]);

export const useGenerateFixtures = (id: string) =>
  useApiMutation(() => api.tournaments.generateFixtures(id), () => [keys.tournament(id), keys.fixtures(id), keys.standings(id), keys.tournaments]);

export const useScheduleMatch = (matchId: string) =>
  useApiMutation((v: ScheduleMatchInput) => api.matches.schedule(matchId, v), () => [keys.match(matchId), keys.matches, ['tournaments']]);

// ---------- series ----------
export const useTournamentAwards = (id: string) =>
  useQuery({ queryKey: keys.awards(id), queryFn: () => api.tournaments.awards(id) });
export const useSeriesAwards = (id: string) =>
  useQuery({ queryKey: keys.seriesAwards(id), queryFn: () => api.series.awards(id) });
export const useSeriesList = () => useQuery({ queryKey: keys.seriesList, queryFn: api.series.list });
export const useSeries = (id: string) => useQuery({ queryKey: keys.series(id), queryFn: () => api.series.get(id) });
export const useCreateSeries = () => useApiMutation((v: CreateSeriesInput) => api.series.create(v), () => [keys.seriesList]);

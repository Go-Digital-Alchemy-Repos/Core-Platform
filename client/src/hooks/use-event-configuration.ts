import { useQuery } from "@tanstack/react-query";
import {
  defaultEventConfiguration,
  type EventConfiguration,
  type OptionGroup,
} from "@shared/event-configuration";
export function useEventConfiguration(admin = false) {
  const query = useQuery<EventConfiguration>({
    queryKey: [admin ? "/api/admin/events/configuration" : "/api/events/configuration"],
  });
  const configuration = { ...defaultEventConfiguration(), ...query.data };
  const ids = (group: OptionGroup, current?: string | null) =>
    configuration[group].filter((o) => !o.archived || o.id === current).map((o) => o.id);
  const labels = (group: OptionGroup): Record<string, string> =>
    Object.fromEntries(configuration[group].map((o) => [o.id, o.label]));
  return {
    configuration,
    ids,
    labels,
    isLoading: query.isLoading,
    isError: query.isError,
    retry: query.refetch,
  };
}

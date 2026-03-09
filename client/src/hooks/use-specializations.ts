import { useQuery } from "@tanstack/react-query";

type Specialization = { id: number; name: string; sortOrder: number };

export function useSpecializations() {
  const { data, isLoading } = useQuery<Specialization[]>({
    queryKey: ["/api/specializations"],
    staleTime: 5 * 60 * 1000,
  });
  return { specializations: data ?? [], isLoading };
}

import { useQuery } from "@tanstack/react-query";
import type { SeoSettings } from "@shared/schema";

export function useGlobalSeo() {
  return useQuery<SeoSettings>({
    queryKey: ["/api/seo/global"],
    staleTime: 10 * 60 * 1000,
  });
}

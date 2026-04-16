export type PublicSearchResultType = "page" | "post" | "event";

export interface PublicSearchResult {
  type: PublicSearchResultType;
  id: string;
  title: string;
  url: string;
  excerpt: string;
  metadata?: string | null;
}

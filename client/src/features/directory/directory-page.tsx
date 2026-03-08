import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { List, Map } from "lucide-react";
import { PageLayout } from "@/components/layout/page-layout";
import { TherapistCard } from "@/components/directory/therapist-card";
import { FilterPanel, type DirectoryFilters } from "@/components/directory/filter-panel";
import { MapView } from "@/components/directory/map-view";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import type { TherapistProfile } from "@shared/schema/therapist-profiles";
import type { User } from "@shared/schema/users";

type TherapistWithUser = TherapistProfile & {
  user?: {
    firstName: string | null;
    lastName: string | null;
    email: string;
    profileImageUrl: string | null;
  };
};

function DirectorySkeletons() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i} className="p-4 flex flex-col gap-3">
          <div className="flex items-start gap-3">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
          <div className="flex gap-1.5">
            <Skeleton className="h-5 w-16 rounded-md" />
            <Skeleton className="h-5 w-20 rounded-md" />
          </div>
          <Skeleton className="h-3 w-1/3" />
          <Skeleton className="h-9 w-full rounded-md" />
        </Card>
      ))}
    </div>
  );
}

export default function DirectoryPage() {
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [filters, setFilters] = useState<DirectoryFilters>({
    search: "",
    practiceMode: "all",
    acceptingClients: false,
  });

  const { data: therapists, isLoading } = useQuery<TherapistWithUser[]>({
    queryKey: ["/api/therapists"],
  });

  const filtered = useMemo(() => {
    if (!therapists) return [];
    return therapists.filter((t) => {
      if (filters.practiceMode !== "all" && t.practiceMode !== filters.practiceMode) {
        return false;
      }
      if (filters.acceptingClients && !t.acceptingClients) {
        return false;
      }
      if (filters.search.trim()) {
        const q = filters.search.toLowerCase();
        const name = [t.user?.firstName, t.user?.lastName].filter(Boolean).join(" ").toLowerCase();
        const specs = (t.specializations || []).join(" ").toLowerCase();
        const title = (t.title || "").toLowerCase();
        if (!name.includes(q) && !specs.includes(q) && !title.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [therapists, filters]);

  const mapTherapists = useMemo(
    () =>
      filtered.map((t) => ({
        profile: t,
        user: {
          firstName: t.user?.firstName ?? null,
          lastName: t.user?.lastName ?? null,
        },
      })),
    [filtered]
  );

  return (
    <PageLayout>
      <div className="container mx-auto px-4 py-8 flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-heading font-semibold" data-testid="text-directory-heading">
            Therapist Directory
          </h1>
          <p className="text-muted-foreground" data-testid="text-directory-subtitle">
            Find a TCK-informed therapist that fits your needs.
          </p>
        </div>

        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex-1 min-w-0">
            <FilterPanel filters={filters} onChange={setFilters} />
          </div>
          <div className="flex items-center gap-1">
            <Button
              size="icon"
              variant={viewMode === "list" ? "default" : "ghost"}
              onClick={() => setViewMode("list")}
              data-testid="button-view-list"
              className="toggle-elevate"
              aria-label="List view"
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant={viewMode === "map" ? "default" : "ghost"}
              onClick={() => setViewMode("map")}
              data-testid="button-view-map"
              className="toggle-elevate"
              aria-label="Map view"
            >
              <Map className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {isLoading ? (
          <DirectorySkeletons />
        ) : viewMode === "list" ? (
          filtered.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground" data-testid="text-no-results">
              No therapists found matching your criteria.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="grid-therapists">
              {filtered.map((t) => (
                <TherapistCard
                  key={t.id}
                  profile={t}
                  user={{
                    firstName: t.user?.firstName ?? null,
                    lastName: t.user?.lastName ?? null,
                    profileImageUrl: t.user?.profileImageUrl ?? null,
                  }}
                />
              ))}
            </div>
          )
        ) : (
          <MapView therapists={mapTherapists} />
        )}

        {!isLoading && filtered.length > 0 && (
          <p className="text-sm text-muted-foreground text-center" data-testid="text-results-count">
            Showing {filtered.length} therapist{filtered.length !== 1 ? "s" : ""}
          </p>
        )}
      </div>
    </PageLayout>
  );
}

import { useState, useMemo, useCallback } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Search, MapPin, Monitor, Map, List, Users, ChevronRight } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { MapView } from "@/components/directory/map-view";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { TherapistProfile } from "@shared/schema/therapist-profiles";

type TherapistWithUser = TherapistProfile & {
  user?: {
    firstName: string | null;
    lastName: string | null;
    email: string;
    profileImageUrl: string | null;
  };
};

function getPracticeModeLabel(mode: string | null) {
  switch (mode) {
    case "in_person": return "In-Person";
    case "virtual": return "Virtual";
    case "both": return "In-Person & Virtual";
    default: return "Virtual";
  }
}

function TherapistRow({
  profile,
  user,
  isHighlighted,
  onHover,
}: {
  profile: TherapistProfile;
  user: { firstName: string | null; lastName: string | null; profileImageUrl: string | null };
  isHighlighted: boolean;
  onHover: (id: string | null) => void;
}) {
  const initials = `${(user.firstName || "")[0] || ""}${(user.lastName || "")[0] || ""}`.toUpperCase();
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ") || "Therapist";
  const specializations = profile.specializations || [];
  const displayedSpecs = specializations.slice(0, 2);
  const remainingCount = specializations.length - 2;

  const locationText = profile.city && profile.country
    ? `${profile.city}, ${profile.country}`
    : profile.country || null;

  return (
    <Link href={`/directory/${profile.id}`}>
      <div
        className={`flex items-center gap-3 px-4 py-3 border-b cursor-pointer transition-colors ${
          isHighlighted
            ? "bg-primary/5 border-l-2 border-l-primary"
            : "hover:bg-muted/50 border-l-2 border-l-transparent"
        }`}
        onMouseEnter={() => onHover(profile.id)}
        onMouseLeave={() => onHover(null)}
        onFocus={() => onHover(profile.id)}
        onBlur={() => onHover(null)}
        data-testid={`row-therapist-${profile.id}`}
      >
        <Avatar className="h-11 w-11 flex-shrink-0">
          {user.profileImageUrl && <AvatarImage src={user.profileImageUrl} alt={fullName} />}
          <AvatarFallback className="text-xs">{initials}</AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-sm truncate" data-testid={`text-name-${profile.id}`}>
              {fullName}
            </h3>
            {profile.acceptingClients && (
              <span className="h-2 w-2 rounded-full bg-green-500 flex-shrink-0" title="Accepting clients" />
            )}
          </div>
          {profile.title && (
            <p className="text-xs text-muted-foreground truncate" data-testid={`text-title-${profile.id}`}>
              {profile.title}
            </p>
          )}
          <div className="flex items-center gap-2 mt-1">
            {locationText ? (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3 flex-shrink-0" />
                <span className="truncate" data-testid={`text-location-${profile.id}`}>{locationText}</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Monitor className="h-3 w-3 flex-shrink-0" />
                <span data-testid={`text-location-${profile.id}`}>Virtual Only</span>
              </span>
            )}
            <span className="text-muted-foreground/40">·</span>
            <span className="text-xs text-muted-foreground">
              {getPracticeModeLabel(profile.practiceMode)}
            </span>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-1.5 flex-shrink-0 max-w-[200px]">
          {displayedSpecs.map((spec) => (
            <Badge key={spec} variant="secondary" className="text-[10px] px-1.5 py-0 whitespace-nowrap">
              {spec}
            </Badge>
          ))}
          {remainingCount > 0 && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              +{remainingCount}
            </Badge>
          )}
        </div>

        <ChevronRight className="h-4 w-4 text-muted-foreground/50 flex-shrink-0" />
      </div>
    </Link>
  );
}

function ListSkeletons() {
  return (
    <>
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3 border-b">
          <Skeleton className="h-11 w-11 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-48" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      ))}
    </>
  );
}

export default function DirectoryPage() {
  const [search, setSearch] = useState("");
  const [practiceMode, setPracticeMode] = useState("all");
  const [acceptingClients, setAcceptingClients] = useState(false);
  const [mobileView, setMobileView] = useState<"list" | "map">("list");
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const { data: therapists, isLoading } = useQuery<TherapistWithUser[]>({
    queryKey: ["/api/therapists"],
  });

  const filtered = useMemo(() => {
    if (!therapists) return [];
    return therapists
      .filter((t) => {
        if (practiceMode !== "all" && t.practiceMode !== practiceMode) return false;
        if (acceptingClients && !t.acceptingClients) return false;
        if (search.trim()) {
          const q = search.toLowerCase();
          const name = [t.user?.firstName, t.user?.lastName].filter(Boolean).join(" ").toLowerCase();
          const specs = (t.specializations || []).join(" ").toLowerCase();
          const title = (t.title || "").toLowerCase();
          if (!name.includes(q) && !specs.includes(q) && !title.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const nameA = [a.user?.firstName, a.user?.lastName].filter(Boolean).join(" ");
        const nameB = [b.user?.firstName, b.user?.lastName].filter(Boolean).join(" ");
        return nameA.localeCompare(nameB);
      });
  }, [therapists, search, practiceMode, acceptingClients]);

  const mapTherapists = useMemo(
    () =>
      filtered.map((t) => ({
        profile: t,
        user: {
          firstName: t.user?.firstName ?? null,
          lastName: t.user?.lastName ?? null,
          profileImageUrl: t.user?.profileImageUrl ?? null,
        },
      })),
    [filtered]
  );

  const handleHover = useCallback((id: string | null) => {
    setHoveredId(id);
  }, []);

  return (
    <div className="flex flex-col h-screen">
      <Navbar />

      <div className="flex-1 flex overflow-hidden">
        <div
          className={`${
            mobileView === "list" ? "flex" : "hidden"
          } md:flex flex-col w-full md:w-[420px] lg:w-[480px] border-r bg-background flex-shrink-0`}
        >
          <div className="p-4 border-b space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-lg font-heading font-semibold" data-testid="text-directory-heading">
                  Find a Therapist
                </h1>
                {!isLoading && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1" data-testid="text-results-count">
                    <Users className="h-3 w-3" />
                    {filtered.length} therapist{filtered.length !== 1 ? "s" : ""} available
                  </p>
                )}
              </div>
              <div className="flex md:hidden items-center gap-1">
                <Button
                  size="icon"
                  variant={mobileView === "list" ? "default" : "ghost"}
                  onClick={() => setMobileView("list")}
                  data-testid="button-view-list"
                  aria-label="List view"
                >
                  <List className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant={mobileView === "map" ? "default" : "ghost"}
                  onClick={() => setMobileView("map")}
                  data-testid="button-view-map"
                  aria-label="Map view"
                >
                  <Map className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search by name, specialty..."
                className="pl-9 h-9 text-sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                data-testid="input-search"
                aria-label="Search therapists"
              />
            </div>

            <div className="flex items-center gap-3">
              <Select value={practiceMode} onValueChange={setPracticeMode}>
                <SelectTrigger className="h-8 text-xs w-[130px]" data-testid="select-practice-mode">
                  <SelectValue placeholder="All Modes" />
                </SelectTrigger>
                <SelectContent className="z-[1000]">
                  <SelectItem value="all">All Modes</SelectItem>
                  <SelectItem value="in_person">In-Person</SelectItem>
                  <SelectItem value="virtual">Virtual</SelectItem>
                  <SelectItem value="both">Both</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center gap-1.5">
                <Checkbox
                  id="filter-accepting"
                  checked={acceptingClients}
                  onCheckedChange={(checked) => setAcceptingClients(checked === true)}
                  data-testid="checkbox-accepting-clients"
                  className="h-3.5 w-3.5"
                />
                <Label htmlFor="filter-accepting" className="text-xs cursor-pointer whitespace-nowrap">
                  Accepting clients
                </Label>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto" data-testid="list-therapists">
            {isLoading ? (
              <ListSkeletons />
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-4 text-center" data-testid="text-no-results">
                <Users className="h-10 w-10 text-muted-foreground/30 mb-3" />
                <p className="text-sm font-medium text-muted-foreground">No therapists found</p>
                <p className="text-xs text-muted-foreground/70 mt-1">Try adjusting your search or filters</p>
              </div>
            ) : (
              filtered.map((t) => (
                <TherapistRow
                  key={t.id}
                  profile={t}
                  user={{
                    firstName: t.user?.firstName ?? null,
                    lastName: t.user?.lastName ?? null,
                    profileImageUrl: t.user?.profileImageUrl ?? null,
                  }}
                  isHighlighted={hoveredId === t.id}
                  onHover={handleHover}
                />
              ))
            )}
          </div>
        </div>

        <div
          className={`${
            mobileView === "map" ? "flex" : "hidden"
          } md:flex flex-1 flex-col relative`}
        >
          <div className="flex md:hidden items-center gap-2 p-2 border-b bg-background">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setMobileView("list")}
              data-testid="button-back-to-list"
              className="h-8"
            >
              <List className="h-4 w-4 mr-1" />
              List
            </Button>
            <span className="text-xs text-muted-foreground">
              {filtered.length} result{filtered.length !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="flex-1">
            <MapView therapists={mapTherapists} height="100%" highlightedId={hoveredId} />
          </div>
        </div>
      </div>
    </div>
  );
}

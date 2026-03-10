import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { Link, useSearch, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Search, MapPin, Monitor, Map, List, Users, ChevronRight, X, SlidersHorizontal, ChevronLeft } from "lucide-react";
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
import { useSpecializations } from "@/hooks/use-specializations";
import type { TherapistProfile } from "@shared/schema/therapist-profiles";

type TherapistWithUser = TherapistProfile & {
  user?: {
    firstName: string | null;
    lastName: string | null;
    email: string;
    profileImageUrl: string | null;
  };
};

interface PaginatedResponse {
  items: TherapistWithUser[];
  total: number;
  page: number;
  pageSize: number;
}

interface FilterOptions {
  languages: string[];
  countries: string[];
}

function getSessionFormatLabel(mode: string | null) {
  switch (mode) {
    case "in_person": return "In-Person";
    case "virtual": return "Virtual";
    case "both": return "In-Person & Virtual";
    default: return "Virtual";
  }
}

function getSessionFormatShortLabel(mode: string | null) {
  switch (mode) {
    case "in_person": return "In-Person";
    case "virtual": return "Virtual";
    case "both": return "Virtual & In-Person";
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
        className={`flex items-start gap-3 px-3 sm:px-4 py-3 border-b cursor-pointer transition-colors ${
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
        <Avatar className="h-10 w-10 sm:h-11 sm:w-11 flex-shrink-0 mt-0.5">
          {user.profileImageUrl && <AvatarImage src={user.profileImageUrl} alt={fullName} />}
          <AvatarFallback className="text-xs">{initials}</AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <h3 className="font-semibold text-sm leading-tight truncate" data-testid={`text-name-${profile.id}`}>
              {fullName}
            </h3>
            {profile.acceptingClients && (
              <span className="h-2 w-2 rounded-full bg-green-500 flex-shrink-0" title="Accepting clients" />
            )}
          </div>
          {profile.title && (
            <p className="text-xs text-muted-foreground truncate mt-0.5" data-testid={`text-title-${profile.id}`}>
              {profile.title}
            </p>
          )}
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            {locationText ? (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground max-w-[160px] sm:max-w-none">
                <MapPin className="h-3 w-3 flex-shrink-0" />
                <span className="truncate" data-testid={`text-location-${profile.id}`}>{locationText}</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Monitor className="h-3 w-3 flex-shrink-0" />
                <span data-testid={`text-location-${profile.id}`}>Virtual Only</span>
              </span>
            )}
            <span className="text-muted-foreground/40 hidden sm:inline">·</span>
            <span className="text-xs text-muted-foreground hidden sm:inline">
              {getSessionFormatShortLabel(profile.practiceMode)}
            </span>
          </div>

          <div className="flex items-center gap-1 mt-1.5 flex-wrap">
            {displayedSpecs.map((spec) => (
              <Badge key={spec} variant="secondary" className="text-[10px] px-1.5 py-0 leading-4 whitespace-nowrap">
                {spec}
              </Badge>
            ))}
            {remainingCount > 0 && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 leading-4">
                +{remainingCount}
              </Badge>
            )}
          </div>
        </div>

        <ChevronRight className="h-4 w-4 text-muted-foreground/50 flex-shrink-0 mt-1 hidden sm:block" />
      </div>
    </Link>
  );
}

function ListSkeletons() {
  return (
    <>
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-start gap-3 px-3 sm:px-4 py-3 border-b">
          <Skeleton className="h-10 w-10 sm:h-11 sm:w-11 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-28 sm:w-32" />
            <Skeleton className="h-3 w-36 sm:w-48" />
            <Skeleton className="h-3 w-20 sm:w-24" />
          </div>
        </div>
      ))}
    </>
  );
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export default function DirectoryPage() {
  const queryString = useSearch();
  const [, navigate] = useLocation();
  const initParams = useMemo(() => new URLSearchParams(queryString), []);

  const [search, setSearch] = useState(initParams.get("search") || "");
  const [sessionFormat, setSessionFormat] = useState(initParams.get("practiceMode") || "all");
  const [specialization, setSpecialization] = useState(initParams.get("specialization") || "all");
  const [language, setLanguage] = useState(initParams.get("language") || "all");
  const [country, setCountry] = useState(initParams.get("country") || "all");
  const [acceptingClients, setAcceptingClients] = useState(initParams.get("acceptingClients") === "true");
  const [showFilters, setShowFilters] = useState(false);
  const [mobileView, setMobileView] = useState<"list" | "map">("list");
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [page, setPage] = useState(parseInt(initParams.get("page") || "1") || 1);

  const debouncedSearch = useDebounce(search, 300);
  const isInternalUpdate = useRef(false);

  useEffect(() => {
    if (isInternalUpdate.current) {
      isInternalUpdate.current = false;
      return;
    }
    const sp = new URLSearchParams(queryString);
    setSpecialization(sp.get("specialization") || "all");
    setLanguage(sp.get("language") || "all");
    setSessionFormat(sp.get("practiceMode") || "all");
    setCountry(sp.get("country") || "all");
    setAcceptingClients(sp.get("acceptingClients") === "true");
    const searchParam = sp.get("search") || "";
    if (searchParam !== search) setSearch(searchParam);
    const pageParam = parseInt(sp.get("page") || "1") || 1;
    setPage(pageParam);
  }, [queryString]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, sessionFormat, specialization, language, country, acceptingClients]);

  useEffect(() => {
    const p = new URLSearchParams();
    if (debouncedSearch) p.set("search", debouncedSearch);
    if (specialization !== "all") p.set("specialization", specialization);
    if (sessionFormat !== "all") p.set("practiceMode", sessionFormat);
    if (language !== "all") p.set("language", language);
    if (country !== "all") p.set("country", country);
    if (acceptingClients) p.set("acceptingClients", "true");
    if (page > 1) p.set("page", String(page));
    const qs = p.toString();
    const newPath = qs ? `/directory?${qs}` : "/directory";
    isInternalUpdate.current = true;
    navigate(newPath, { replace: true });
  }, [debouncedSearch, specialization, sessionFormat, language, country, acceptingClients, page]);

  const { specializations: specList } = useSpecializations();

  const queryParams = useMemo(() => {
    const p = new URLSearchParams();
    if (debouncedSearch) p.set("search", debouncedSearch);
    if (specialization !== "all") p.set("specialization", specialization);
    if (sessionFormat !== "all") p.set("practiceMode", sessionFormat);
    if (language !== "all") p.set("language", language);
    if (country !== "all") p.set("country", country);
    if (acceptingClients) p.set("acceptingClients", "true");
    p.set("page", String(page));
    p.set("pageSize", "200");
    return p.toString();
  }, [debouncedSearch, specialization, sessionFormat, language, country, acceptingClients, page]);

  const { data, isLoading } = useQuery<PaginatedResponse>({
    queryKey: ["/api/therapists", queryParams],
    queryFn: async () => {
      const res = await fetch(`/api/therapists?${queryParams}`);
      if (!res.ok) throw new Error("Failed to fetch therapists");
      return res.json();
    },
  });

  const { data: filterOptions } = useQuery<FilterOptions>({
    queryKey: ["/api/therapists/filters"],
  });

  const therapists = data?.items ?? [];
  const total = data?.total ?? 0;
  const currentPage = data?.page ?? 1;
  const pageSize = data?.pageSize ?? 200;
  const totalPages = Math.ceil(total / pageSize);

  const mapTherapists = useMemo(
    () =>
      therapists.map((t) => ({
        profile: t,
        user: {
          firstName: t.user?.firstName ?? null,
          lastName: t.user?.lastName ?? null,
          profileImageUrl: t.user?.profileImageUrl ?? null,
        },
      })),
    [therapists]
  );

  const handleHover = useCallback((id: string | null) => {
    setHoveredId(id);
  }, []);

  const activeFilterCount = [
    sessionFormat !== "all",
    specialization !== "all",
    language !== "all",
    country !== "all",
    acceptingClients,
  ].filter(Boolean).length;

  const clearAllFilters = () => {
    setSessionFormat("all");
    setSpecialization("all");
    setLanguage("all");
    setCountry("all");
    setAcceptingClients(false);
    setSearch("");
  };

  return (
    <div className="flex flex-col h-[100dvh]">
      <Navbar />
      <div className="flex-1 flex overflow-hidden">
        <div
          className={`${
            mobileView === "list" ? "flex" : "hidden"
          } md:flex flex-col w-full md:w-[340px] lg:w-[380px] xl:w-[420px] border-r bg-background flex-shrink-0`}
        >
          <div className="px-3 sm:px-4 py-3 border-b space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <h1 className="sm:text-lg font-heading font-semibold text-[30px]" data-testid="text-directory-heading">
                  Find a Counselor
                </h1>
                {!isLoading && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-[10px] mb-[10px]" data-testid="text-results-count">
                    <Users className="h-3 w-3 flex-shrink-0" />
                    {total} counselor{total !== 1 ? "s" : ""} available
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <Button
                  size="icon"
                  variant={showFilters ? "default" : "ghost"}
                  onClick={() => setShowFilters(!showFilters)}
                  data-testid="button-toggle-filters"
                  aria-label="Toggle filters"
                  className="relative h-9 w-9"
                >
                  <SlidersHorizontal className="h-4 w-4" />
                  {activeFilterCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex items-center justify-center h-4 w-4 rounded-full bg-accent text-accent-foreground text-[10px] font-bold">
                      {activeFilterCount}
                    </span>
                  )}
                </Button>
                <div className="flex md:hidden items-center gap-1 ml-0.5">
                  <Button
                    size="icon"
                    variant={mobileView === "list" ? "default" : "ghost"}
                    onClick={() => setMobileView("list")}
                    data-testid="button-view-list"
                    aria-label="List view"
                    className="h-9 w-9"
                  >
                    <List className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant={mobileView === "map" ? "default" : "ghost"}
                    onClick={() => setMobileView("map")}
                    data-testid="button-view-map"
                    aria-label="Map view"
                    className="h-9 w-9"
                  >
                    <Map className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search name, specialty, language..."
                className="pl-9 h-9 text-sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                data-testid="input-search"
                aria-label="Search therapists"
              />
            </div>

            {showFilters && (
              <div className="space-y-2.5 pt-0.5" data-testid="panel-filters">
                <div className="grid grid-cols-1 xs:grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[11px] text-muted-foreground mb-1 block">Specialization</Label>
                    <Select value={specialization} onValueChange={setSpecialization}>
                      <SelectTrigger className="h-9 text-xs w-full" data-testid="select-specialization">
                        <SelectValue placeholder="All Specializations" />
                      </SelectTrigger>
                      <SelectContent className="z-[1000] max-h-[280px]">
                        <SelectItem value="all">All Specializations</SelectItem>
                        {specList.map((s) => (
                          <SelectItem key={s.name} value={s.name}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-[11px] text-muted-foreground mb-1 block">Language</Label>
                    <Select value={language} onValueChange={setLanguage}>
                      <SelectTrigger className="h-9 text-xs w-full" data-testid="select-language">
                        <SelectValue placeholder="All Languages" />
                      </SelectTrigger>
                      <SelectContent className="z-[1000] max-h-[280px]">
                        <SelectItem value="all">All Languages</SelectItem>
                        {(filterOptions?.languages ?? []).map((l) => (
                          <SelectItem key={l} value={l}>{l}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-[11px] text-muted-foreground mb-1 block">Location</Label>
                    <Select value={country} onValueChange={setCountry}>
                      <SelectTrigger className="h-9 text-xs w-full" data-testid="select-country">
                        <SelectValue placeholder="All Countries" />
                      </SelectTrigger>
                      <SelectContent className="z-[1000] max-h-[280px]">
                        <SelectItem value="all">All Countries</SelectItem>
                        {(filterOptions?.countries ?? []).map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-[11px] text-muted-foreground mb-1 block">Session Format</Label>
                    <Select value={sessionFormat} onValueChange={setSessionFormat}>
                      <SelectTrigger className="h-9 text-xs w-full" data-testid="select-session-format">
                        <SelectValue placeholder="All Formats" />
                      </SelectTrigger>
                      <SelectContent className="z-[1000]">
                        <SelectItem value="all">All Formats</SelectItem>
                        <SelectItem value="in_person">In-Person</SelectItem>
                        <SelectItem value="virtual">Virtual</SelectItem>
                        <SelectItem value="both">Both</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Checkbox
                      id="filter-accepting"
                      checked={acceptingClients}
                      onCheckedChange={(checked) => setAcceptingClients(checked === true)}
                      data-testid="checkbox-accepting-clients"
                      className="h-4 w-4"
                    />
                    <Label htmlFor="filter-accepting" className="text-xs cursor-pointer whitespace-nowrap">
                      Accepting clients
                    </Label>
                  </div>
                  {activeFilterCount > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearAllFilters}
                      data-testid="button-clear-filters"
                      className="text-xs text-muted-foreground h-8"
                    >
                      <X className="h-3 w-3 mr-1" />
                      Clear all
                    </Button>
                  )}
                </div>
              </div>
            )}

            {!showFilters && activeFilterCount > 0 && (
              <div className="flex flex-wrap gap-1.5" data-testid="active-filter-badges">
                {specialization !== "all" && (
                  <Badge variant="secondary" className="text-xs gap-1 max-w-[140px]">
                    <span className="truncate">{specialization}</span>
                    <button onClick={() => setSpecialization("all")} aria-label={`Remove ${specialization} filter`} className="flex-shrink-0 ml-0.5">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                {language !== "all" && (
                  <Badge variant="secondary" className="text-xs gap-1">
                    {language}
                    <button onClick={() => setLanguage("all")} aria-label={`Remove ${language} filter`} className="flex-shrink-0 ml-0.5">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                {country !== "all" && (
                  <Badge variant="secondary" className="text-xs gap-1 max-w-[140px]">
                    <span className="truncate">{country}</span>
                    <button onClick={() => setCountry("all")} aria-label={`Remove ${country} filter`} className="flex-shrink-0 ml-0.5">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                {sessionFormat !== "all" && (
                  <Badge variant="secondary" className="text-xs gap-1">
                    {getSessionFormatLabel(sessionFormat)}
                    <button onClick={() => setSessionFormat("all")} aria-label="Remove session format filter" className="flex-shrink-0 ml-0.5">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                {acceptingClients && (
                  <Badge variant="secondary" className="text-xs gap-1">
                    Accepting
                    <button onClick={() => setAcceptingClients(false)} aria-label="Remove accepting clients filter" className="flex-shrink-0 ml-0.5">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto overscroll-contain" style={{ WebkitOverflowScrolling: "touch" }} data-testid="list-therapists">
            {isLoading ? (
              <ListSkeletons />
            ) : therapists.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-4 text-center" data-testid="text-no-results">
                <Users className="h-10 w-10 text-muted-foreground/30 mb-3" />
                <p className="text-sm font-medium text-muted-foreground">No counselors found</p>
                <p className="text-xs text-muted-foreground/70 mt-1">Try adjusting your search or filters</p>
                {activeFilterCount > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearAllFilters}
                    className="mt-4"
                    data-testid="button-clear-filters-empty"
                  >
                    Clear all filters
                  </Button>
                )}
              </div>
            ) : (
              therapists.map((t) => (
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

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 py-4 border-t" data-testid="pagination-controls">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  data-testid="button-prev-page"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                <span className="text-xs text-muted-foreground" data-testid="text-page-info">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  data-testid="button-next-page"
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
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
              className="h-9"
            >
              <List className="h-4 w-4 mr-1" />
              List
            </Button>
            <span className="text-xs text-muted-foreground">
              {total} result{total !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="flex-1">
            <MapView therapists={mapTherapists} height="100%" highlightedId={hoveredId} zoom={2} center={[20, 0]} />
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import type { Event } from "@shared/schema/events";
import { PageLayout } from "@/components/layout/page-layout";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search,
  Calendar,
  User,
  Video,
  Play,
  ExternalLink,
  Filter,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function formatDate(date: string | Date) {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function getVideoEmbedUrl(url: string) {
  if (!url) return null;

  // YouTube
  const ytMatch = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
  if (ytMatch) {
    return `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1`;
  }

  // Vimeo
  const vimeoMatch = url.match(/(?:vimeo\.com\/|player\.vimeo\.com\/video\/)(\d+)/);
  if (vimeoMatch) {
    return `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1`;
  }

  return null;
}

function RecordingCard({ event, onWatch }: { event: Event; onWatch: (event: Event) => void }) {
  return (
    <Card data-testid={`card-recording-${event.id}`} className="flex flex-col h-full hover-elevate overflow-visible">
      <div className="aspect-video relative overflow-hidden rounded-t-md bg-muted flex items-center justify-center">
        {event.imageUrl ? (
          <img
            src={event.imageUrl}
            alt={event.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <Video className="h-12 w-12 text-muted-foreground/40" />
        )}
        <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
          <Button 
            size="icon" 
            variant="secondary" 
            className="rounded-full h-12 w-12 shadow-lg"
            onClick={() => onWatch(event)}
            data-testid={`button-play-overlay-${event.id}`}
          >
            <Play className="h-6 w-6 fill-current" />
          </Button>
        </div>
      </div>
      <CardHeader className="flex-none p-4 pb-2">
        <div className="flex justify-between items-start gap-2 mb-1">
          <Badge variant="outline" className="text-[10px] uppercase tracking-wider" data-testid={`text-recording-date-${event.id}`}>
            {formatDate(event.date)}
          </Badge>
          {event.registrationEnabled && (
            <Badge variant="secondary" className="text-[10px]" data-testid={`badge-recording-type-${event.id}`}>
              {event.registrationType === "paid" ? "Paid Event" : "Free Event"}
            </Badge>
          )}
        </div>
        <Link href={`/events/${event.id}`}>
          <CardTitle className="text-base line-clamp-2 cursor-pointer hover:text-primary transition-colors" data-testid={`text-recording-title-${event.id}`}>
            {event.title}
          </CardTitle>
        </Link>
      </CardHeader>
      <CardContent className="flex-1 p-4 pt-0 text-sm text-muted-foreground">
        {event.speakerName && (
          <div className="flex items-center gap-1.5 mb-2 text-foreground/80 font-medium">
            <User className="h-3.5 w-3.5" />
            <span data-testid={`text-recording-speaker-${event.id}`}>{event.speakerName}</span>
          </div>
        )}
        <p className="line-clamp-2" data-testid={`text-recording-description-${event.id}`}>
          {event.description}
        </p>
      </CardContent>
      <CardFooter className="flex-none p-4 pt-0">
        <Button 
          className="w-full" 
          onClick={() => onWatch(event)}
          data-testid={`button-watch-recording-${event.id}`}
        >
          <Play className="mr-2 h-4 w-4 fill-current" />
          Watch Recording
        </Button>
      </CardFooter>
    </Card>
  );
}

function RecordingSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i} className="flex flex-col h-full">
          <Skeleton className="aspect-video w-full rounded-t-md" />
          <CardHeader className="p-4 pb-2 space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-5 w-full" />
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
          </CardContent>
          <CardFooter className="p-4 pt-0">
            <Skeleton className="h-9 w-full" />
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}

export default function RecordingArchivesPage() {
  const [search, setSearch] = useState("");
  const [yearFilter, setYearFilter] = useState("all");
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  const { data: recordings, isLoading } = useQuery<Event[]>({
    queryKey: ["/api/events/recordings"],
  });

  const years = useMemo(() => {
    if (!recordings) return [];
    const yearSet = new Set<string>();
    recordings.forEach((event) => {
      yearSet.add(new Date(event.date).getFullYear().toString());
    });
    return Array.from(yearSet).sort((a, b) => b.localeCompare(a));
  }, [recordings]);

  const filteredRecordings = useMemo(() => {
    if (!recordings) return [];
    return recordings.filter((event) => {
      const matchesSearch = 
        event.title.toLowerCase().includes(search.toLowerCase()) ||
        (event.speakerName?.toLowerCase().includes(search.toLowerCase()) ?? false);
      
      const eventYear = new Date(event.date).getFullYear().toString();
      const matchesYear = yearFilter === "all" || eventYear === yearFilter;

      return matchesSearch && matchesYear;
    });
  }, [recordings, search, yearFilter]);

  const embedUrl = selectedEvent?.recordingUrl ? getVideoEmbedUrl(selectedEvent.recordingUrl) : null;

  return (
    <PageLayout>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 sm:py-12">
        <div className="mb-8 space-y-4">
          <div className="space-y-2">
            <h1 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight" data-testid="text-archives-heading">
              Recording Archives
            </h1>
            <p className="text-muted-foreground text-lg max-w-3xl" data-testid="text-archives-subtitle">Browse our collection of past trainings and webinars. </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center pt-4">
            <div className="relative flex-1 w-full max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by title or speaker..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                data-testid="input-search-archives"
              />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={yearFilter} onValueChange={setYearFilter}>
                <SelectTrigger className="w-[140px]" data-testid="select-year-filter">
                  <SelectValue placeholder="All Years" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Years</SelectItem>
                  {years.map((year) => (
                    <SelectItem key={year} value={year}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {isLoading ? (
          <RecordingSkeleton />
        ) : filteredRecordings.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="grid-recordings">
            {filteredRecordings.map((event) => (
              <RecordingCard 
                key={event.id} 
                event={event} 
                onWatch={setSelectedEvent} 
              />
            ))}
          </div>
        ) : (
          <div className="py-20 text-center border rounded-xl bg-muted/20" data-testid="text-no-recordings">
            <Video className="mx-auto h-12 w-12 text-muted-foreground/40 mb-4" />
            <h3 className="text-lg font-medium">No recordings found</h3>
            <p className="text-muted-foreground">Try adjusting your search or filter.</p>
          </div>
        )}

        <Dialog open={!!selectedEvent} onOpenChange={(open) => !open && setSelectedEvent(null)}>
          <DialogContent className="max-w-4xl p-0 overflow-hidden" data-testid="dialog-playback">
            <DialogHeader className="p-4 border-b">
              <DialogTitle className="pr-8 truncate" data-testid="text-dialog-title">
                {selectedEvent?.title}
              </DialogTitle>
            </DialogHeader>
            <div className="bg-black aspect-video flex flex-col items-center justify-center">
              {embedUrl ? (
                <iframe
                  src={embedUrl}
                  className="w-full h-full"
                  allow="autoplay; fullscreen"
                  allowFullScreen
                  data-testid="iframe-player"
                />
              ) : selectedEvent?.recordingUrl ? (
                <div className="p-8 text-center text-white space-y-4">
                  <p className="text-lg">This recording is hosted on an external platform.</p>
                  <Button asChild size="lg" data-testid="button-open-external">
                    <a href={selectedEvent.recordingUrl} target="_blank" rel="noopener noreferrer">
                      Open Recording
                      <ExternalLink className="ml-2 h-4 w-4" />
                    </a>
                  </Button>
                </div>
              ) : null}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </PageLayout>
  );
}

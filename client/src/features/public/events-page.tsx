import { useQuery } from "@tanstack/react-query";
import type { Event } from "@shared/schema/events";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarDays, MapPin, Monitor } from "lucide-react";

function formatDate(date: string | Date) {
  return new Date(date).toLocaleDateString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatTime(date: string | Date) {
  return new Date(date).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function EventCard({ event }: { event: Event }) {
  const eventDate = new Date(event.date);
  const isPast = eventDate < new Date();

  return (
    <Card
      data-testid={`card-event-${event.id}`}
      className={isPast ? "opacity-60" : ""}
    >
      <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 pb-3">
        <div className="space-y-1">
          <CardTitle className="text-lg" data-testid={`text-event-title-${event.id}`}>
            {event.title}
          </CardTitle>
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <CalendarDays className="h-3.5 w-3.5 shrink-0" />
            <span data-testid={`text-event-date-${event.id}`}>
              {formatDate(event.date)}
              {event.endDate && ` — ${formatDate(event.endDate)}`}
              {" at "}
              {formatTime(event.date)}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {event.isVirtual && (
            <Badge variant="secondary" data-testid={`badge-virtual-${event.id}`}>
              <Monitor className="mr-1 h-3 w-3" />
              Virtual
            </Badge>
          )}
          {event.memberOnly && (
            <Badge variant="outline" data-testid={`badge-member-only-${event.id}`}>
              Members Only
            </Badge>
          )}
          {isPast && (
            <Badge variant="outline" data-testid={`badge-past-${event.id}`}>
              Past
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {event.description && (
          <p
            className="text-sm text-muted-foreground"
            data-testid={`text-event-description-${event.id}`}
          >
            {event.description}
          </p>
        )}
        {event.location && (
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span data-testid={`text-event-location-${event.id}`}>
              {event.location}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function EventsSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="space-y-2">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-4 w-1/3" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="mt-2 h-4 w-1/2" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function EventsPage() {
  const { data: events, isLoading, error } = useQuery<Event[]>({
    queryKey: ["/api/events"],
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 py-12">
        <div className="mb-8 space-y-2">
          <h1
            className="font-heading text-3xl font-bold tracking-tight"
            data-testid="text-events-heading"
          >
            Upcoming Events
          </h1>
          <p className="text-muted-foreground" data-testid="text-events-subtitle">
            Workshops, webinars, and community gatherings for the TCK community.
          </p>
        </div>

        {isLoading && <EventsSkeleton />}

        {error && (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              Failed to load events. Please try again later.
            </CardContent>
          </Card>
        )}

        {events && events.length === 0 && (
          <Card>
            <CardContent
              className="py-12 text-center text-muted-foreground"
              data-testid="text-no-events"
            >
              No upcoming events at this time. Check back soon!
            </CardContent>
          </Card>
        )}

        {events && events.length > 0 && (
          <div className="space-y-4" data-testid="list-events">
            {events.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

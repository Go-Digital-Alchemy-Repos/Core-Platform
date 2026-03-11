import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import type { Event } from "@shared/schema/events";
import { PageLayout } from "@/components/layout/page-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CalendarDays,
  MapPin,
  Monitor,
  List,
  CalendarIcon,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  Video,
  User,
  Building,
} from "lucide-react";

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

function getRegistrationStatus(event: Event): { label: string; open: boolean } | null {
  if (!event.registrationEnabled) return null;
  const now = new Date();
  if (event.registrationOpensAt && new Date(event.registrationOpensAt) > now) {
    return {
      label: `Registration opens ${formatDate(event.registrationOpensAt)}`,
      open: false,
    };
  }
  if (event.registrationClosesAt && new Date(event.registrationClosesAt) < now) {
    return { label: "Registration Closed", open: false };
  }
  return { label: "Registration Open", open: true };
}

function formatPrice(fee: number, currency: string) {
  const curr = (currency || "usd").toUpperCase();
  const amount = fee / 100;
  return `${curr === "USD" ? "$" : curr + " "}${amount.toFixed(amount % 1 === 0 ? 0 : 2)}`;
}

function EventCard({ event }: { event: Event }) {
  const eventDate = new Date(event.date);
  const isPast = eventDate < new Date();
  const isHybrid = event.isVirtual && !!(event.location || event.locationName || event.locationAddress);
  const registrationStatus = getRegistrationStatus(event);
  const displayLocation = event.locationName || event.locationAddress || event.location;

  return (
    <Link href={`/events/${event.id}`}>
      <Card
        data-testid={`card-event-${event.id}`}
        className={`cursor-pointer hover-elevate ${isPast ? "opacity-60" : ""}`}
      >
        <CardHeader className="flex flex-col sm:flex-row items-start justify-between gap-2 space-y-0 pb-3">
          <div className="space-y-1 min-w-0">
            <CardTitle className="text-base sm:text-lg break-words" data-testid={`text-event-title-${event.id}`}>
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
            {isHybrid ? (
              <Badge variant="secondary" data-testid={`badge-hybrid-${event.id}`}>
                <Monitor className="mr-1 h-3 w-3" />
                Hybrid
              </Badge>
            ) : event.isVirtual ? (
              <Badge variant="secondary" data-testid={`badge-virtual-${event.id}`}>
                <Monitor className="mr-1 h-3 w-3" />
                Virtual
              </Badge>
            ) : (
              <Badge variant="secondary" data-testid={`badge-in-person-${event.id}`}>
                <Building className="mr-1 h-3 w-3" />
                In-Person
              </Badge>
            )}
            {event.registrationEnabled && event.registrationType === "paid" && event.registrationFee ? (
              <Badge variant="outline" data-testid={`badge-paid-${event.id}`}>
                <DollarSign className="mr-1 h-3 w-3" />
                {formatPrice(event.registrationFee, event.registrationCurrency || "usd")}
              </Badge>
            ) : event.registrationEnabled && event.registrationType === "free" ? (
              <Badge variant="outline" data-testid={`badge-free-${event.id}`}>
                Free
              </Badge>
            ) : null}
            {registrationStatus && (
              <Badge
                variant={registrationStatus.open ? "default" : "outline"}
                data-testid={`badge-registration-${event.id}`}
              >
                {registrationStatus.label}
              </Badge>
            )}
            {isPast && event.recordingUrl && (
              <Badge variant="secondary" data-testid={`badge-recording-${event.id}`}>
                <Video className="mr-1 h-3 w-3" />
                Recording Available
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
              className="text-sm text-muted-foreground line-clamp-2"
              data-testid={`text-event-description-${event.id}`}
            >
              {event.description}
            </p>
          )}
          {event.speakerName && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <User className="h-3.5 w-3.5 shrink-0" />
              <span data-testid={`text-event-speaker-${event.id}`}>
                {event.speakerName}
              </span>
            </div>
          )}
          {displayLocation && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span data-testid={`text-event-location-${event.id}`}>
                {displayLocation}
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
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

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

function CalendarView({ events }: { events: Event[] }) {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());

  const eventsByDate = useMemo(() => {
    const map: Record<string, Event[]> = {};
    for (const event of events) {
      const d = new Date(event.date);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      if (!map[key]) map[key] = [];
      map[key].push(event);
    }
    return map;
  }, [events]);

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth);
  const monthLabel = new Date(currentYear, currentMonth).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  function prevMonth() {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  }

  function nextMonth() {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  }

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const todayKey = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;

  return (
    <div data-testid="calendar-view">
      <div className="mb-4 flex items-center justify-between gap-4">
        <Button
          variant="outline"
          size="icon"
          onClick={prevMonth}
          data-testid="button-prev-month"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h2 className="font-heading text-lg font-semibold" data-testid="text-calendar-month">
          {monthLabel}
        </h2>
        <Button
          variant="outline"
          size="icon"
          onClick={nextMonth}
          data-testid="button-next-month"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg border bg-border">
        {WEEKDAYS.map((day) => (
          <div
            key={day}
            className="bg-muted px-2 py-2 text-center text-xs font-medium text-muted-foreground"
          >
            {day}
          </div>
        ))}
        {cells.map((day, i) => {
          const key = day ? `${currentYear}-${currentMonth}-${day}` : null;
          const dayEvents = key ? eventsByDate[key] || [] : [];
          const isToday = key === todayKey;

          return (
            <div
              key={i}
              className={`min-h-[60px] sm:min-h-[80px] bg-card p-1 sm:p-1.5 ${
                !day ? "bg-muted/30" : ""
              }`}
              data-testid={day ? `calendar-day-${day}` : undefined}
            >
              {day && (
                <>
                  <span
                    className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                      isToday
                        ? "bg-primary text-primary-foreground font-bold"
                        : "text-foreground"
                    }`}
                  >
                    {day}
                  </span>
                  {dayEvents.length > 0 && (
                    <div className="mt-0.5 space-y-0.5">
                      {dayEvents.map((event) => (
                        <Link key={event.id} href={`/events/${event.id}`}>
                          <div
                            className="truncate rounded bg-primary/10 px-1 py-0.5 text-[10px] leading-tight text-primary cursor-pointer hover:bg-primary/20 transition-colors"
                            title={`${event.title} — ${formatTime(event.date)}`}
                            data-testid={`calendar-event-${event.id}`}
                          >
                            {event.title}
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function EventsPage() {
  const [view, setView] = useState<"list" | "calendar">("list");
  const { data: events, isLoading, error } = useQuery<Event[]>({
    queryKey: ["/api/events"],
  });

  return (
    <PageLayout>
      <div className="mx-auto max-w-4xl px-4 sm:px-6 py-8 sm:py-12">
        <div className="mb-6 sm:mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1.5 sm:space-y-2">
            <h1
              className="font-heading text-2xl sm:text-3xl font-bold tracking-tight"
              data-testid="text-events-heading"
            >
              Upcoming Events
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground font-normal" data-testid="text-events-subtitle">We offer quarterly TCK-informed trainings for professional providers! All of our members get free registration to the events below. Log into your profile to get access to the free registration links. If you’re not a member you can still register through the links below.</p>
          </div>
          <div className="flex gap-1 rounded-lg border p-1" data-testid="toggle-view">
            <Button
              variant={view === "list" ? "default" : "ghost"}
              size="sm"
              onClick={() => setView("list")}
              data-testid="button-list-view"
            >
              <List className="mr-1.5 h-4 w-4" />
              List
            </Button>
            <Button
              variant={view === "calendar" ? "default" : "ghost"}
              size="sm"
              onClick={() => setView("calendar")}
              data-testid="button-calendar-view"
            >
              <CalendarIcon className="mr-1.5 h-4 w-4" />
              Calendar
            </Button>
          </div>
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

        {events && events.length > 0 && view === "list" && (
          <div className="space-y-4" data-testid="list-events">
            {events.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )}

        {events && events.length > 0 && view === "calendar" && (
          <CalendarView events={events} />
        )}
      </div>
    </PageLayout>
  );
}

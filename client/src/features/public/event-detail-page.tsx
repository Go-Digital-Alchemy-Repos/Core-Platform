import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "wouter";
import type { Event } from "@shared/schema/events";
import { PageLayout } from "@/components/layout/page-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CalendarDays,
  Clock,
  MapPin,
  Monitor,
  ArrowLeft,
  ExternalLink,
  Lock,
} from "lucide-react";

function formatFullDate(date: string | Date) {
  return new Date(date).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatTime(date: string | Date) {
  return new Date(date).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

function EventDetailSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-3/4" />
      <div className="flex gap-2">
        <Skeleton className="h-6 w-20" />
        <Skeleton className="h-6 w-28" />
      </div>
      <Skeleton className="h-48 w-full rounded-lg" />
      <div className="space-y-3">
        <Skeleton className="h-5 w-1/3" />
        <Skeleton className="h-5 w-1/4" />
        <Skeleton className="h-5 w-2/5" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    </div>
  );
}

export default function EventDetailPage() {
  const params = useParams<{ id: string }>();
  const eventId = params.id;

  const { data: event, isLoading, error } = useQuery<Event>({
    queryKey: ["/api/events", eventId],
    enabled: !!eventId,
  });

  const isPast = event ? new Date(event.date) < new Date() : false;

  return (
    <PageLayout>
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-8 sm:py-12">
        <Link href="/events">
          <Button variant="ghost" className="mb-6 -ml-2" data-testid="button-back-events">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Events
          </Button>
        </Link>

        {isLoading && <EventDetailSkeleton />}

        {error && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground" data-testid="text-event-error">
              Event not found or could not be loaded.
            </CardContent>
          </Card>
        )}

        {event && (
          <article data-testid={`event-detail-${event.id}`}>
            {event.imageUrl && (
              <div className="aspect-[21/9] overflow-hidden rounded-xl mb-8">
                <img
                  src={event.imageUrl}
                  alt={event.title}
                  className="w-full h-full object-cover"
                  data-testid="img-event-cover"
                />
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2 mb-4">
              {event.isVirtual && (
                <Badge variant="secondary" data-testid="badge-event-virtual">
                  <Monitor className="mr-1 h-3 w-3" />
                  Virtual
                </Badge>
              )}
              {!event.isVirtual && (
                <Badge variant="secondary" data-testid="badge-event-in-person">
                  <MapPin className="mr-1 h-3 w-3" />
                  In-Person
                </Badge>
              )}
              {event.memberOnly && (
                <Badge variant="outline" data-testid="badge-event-member-only">
                  <Lock className="mr-1 h-3 w-3" />
                  Members Only
                </Badge>
              )}
              {isPast && (
                <Badge variant="outline" className="opacity-60" data-testid="badge-event-past">
                  Past Event
                </Badge>
              )}
            </div>

            <h1
              className="font-heading text-2xl sm:text-3xl md:text-4xl font-bold mb-6"
              data-testid="text-event-detail-title"
            >
              {event.title}
            </h1>

            <Card className="mb-8">
              <CardContent className="p-5 sm:p-6 space-y-4">
                <div className="flex items-start gap-3">
                  <CalendarDays className="h-5 w-5 text-accent flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium" data-testid="text-event-detail-date">
                      {formatFullDate(event.date)}
                    </p>
                    {event.endDate && new Date(event.endDate).toDateString() !== new Date(event.date).toDateString() && (
                      <p className="text-sm text-muted-foreground">
                        to {formatFullDate(event.endDate)}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Clock className="h-5 w-5 text-accent flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium" data-testid="text-event-detail-time">
                      {formatTime(event.date)}
                      {event.endDate && ` — ${formatTime(event.endDate)}`}
                    </p>
                  </div>
                </div>

                {event.location && (
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-accent flex-shrink-0 mt-0.5" />
                    <p className="font-medium" data-testid="text-event-detail-location">
                      {event.location}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {event.description && (
              <div className="mb-8" data-testid="text-event-detail-description">
                <h2 className="font-heading text-xl font-semibold mb-3">About This Event</h2>
                <p className="text-sm sm:text-base text-muted-foreground leading-relaxed whitespace-pre-wrap">
                  {event.description}
                </p>
              </div>
            )}

            {!isPast && (
              <div className="border-t pt-8" data-testid="section-event-registration">
                <h2 className="font-heading text-xl font-semibold mb-3">Registration</h2>
                {event.isVirtual && event.zoomLink ? (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      This is a virtual event. Click the button below to join or register.
                    </p>
                    <a href={event.zoomLink} target="_blank" rel="noopener noreferrer">
                      <Button
                        size="lg"
                        className="bg-accent text-accent-foreground border-accent-border"
                        data-testid="button-event-register"
                      >
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Join / Register
                      </Button>
                    </a>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      {event.location
                        ? `This event will be held at ${event.location}. Registration details will be provided soon.`
                        : "Registration details will be provided soon. Please check back for updates."}
                    </p>
                    {event.memberOnly && (
                      <p className="text-sm text-muted-foreground">
                        This event is exclusive to TCK Wellness members.{" "}
                        <Link href="/join" className="text-accent underline underline-offset-2">
                          Join the network
                        </Link>{" "}
                        to get access.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {isPast && (
              <div className="border-t pt-8" data-testid="section-event-past-notice">
                <p className="text-sm text-muted-foreground">
                  This event has already taken place. Check our{" "}
                  <Link href="/events" className="text-accent underline underline-offset-2">
                    events page
                  </Link>{" "}
                  for upcoming events.
                </p>
              </div>
            )}
          </article>
        )}
      </div>
    </PageLayout>
  );
}

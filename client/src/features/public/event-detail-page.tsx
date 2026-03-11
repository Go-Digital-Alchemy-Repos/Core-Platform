import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "wouter";
import type { Event } from "@shared/schema/events";
import { PageLayout } from "@/components/layout/page-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { EventLocationMap } from "@/components/shared/event-location-map";
import { useAuth } from "@/hooks/use-auth";
import {
  CalendarDays,
  Clock,
  MapPin,
  Monitor,
  ArrowLeft,
  ExternalLink,
  Lock,
  Phone,
  Video,
  Users,
  Ticket,
  Globe,
  User,
  AlertTriangle,
  Building2,
  Wifi,
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

function formatCurrency(amountCents: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amountCents / 100);
}

function getRegistrationState(event: Event): "open" | "closed" | "upcoming" | "none" {
  if (!event.registrationEnabled) return "none";
  const now = new Date();
  if (event.registrationOpensAt && new Date(event.registrationOpensAt) > now) return "upcoming";
  if (event.registrationClosesAt && new Date(event.registrationClosesAt) < now) return "closed";
  return "open";
}

function canUserAccessEvent(event: Event, userRole: string | null): boolean {
  if (!event.visibility || event.visibility === "public") return true;
  if (!userRole) return false;
  if (userRole === "admin") return true;
  if (event.visibility === "members_only") return userRole === "therapist" || userRole === "client";
  if (event.visibility === "counselors_only") return userRole === "therapist";
  if (event.visibility === "admins_only") return false;
  return true;
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
  const { user } = useAuth();

  const { data: event, isLoading, error } = useQuery<Event>({
    queryKey: ["/api/events", eventId],
    enabled: !!eventId,
  });

  const isPast = event ? new Date(event.date) < new Date() : false;
  const joinUrl = event?.virtualJoinUrl || event?.zoomLink;
  const displayLocationName = event?.locationName || event?.location;
  const isCanceled = event?.status === "canceled";
  const isDraft = event?.status === "draft";
  const isCompleted = event?.status === "completed";

  const isHybrid = event?.isVirtual && (event?.latitude || event?.location || event?.locationName || event?.locationAddress);
  const isVirtualOnly = event?.isVirtual && !isHybrid;
  const hasGeo = event?.latitude && event?.longitude;
  const showMap = hasGeo && !isVirtualOnly;

  const registrationState = event ? getRegistrationState(event) : "none";
  const userHasAccess = event ? canUserAccessEvent(event, user?.role ?? null) : true;

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
            {isCanceled && (
              <div className="flex items-center gap-3 rounded-md border border-destructive/50 bg-destructive/10 p-4 mb-6" data-testid="banner-event-canceled">
                <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0" />
                <p className="font-medium text-destructive">This event has been canceled.</p>
              </div>
            )}

            {isDraft && (
              <div className="flex items-center gap-3 rounded-md border p-4 mb-6 opacity-70" data-testid="banner-event-draft">
                <AlertTriangle className="h-5 w-5 flex-shrink-0" />
                <p className="font-medium">This event is not yet published.</p>
              </div>
            )}

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
              {event.status && event.status !== "published" && (
                <Badge
                  variant={isCanceled ? "destructive" : "secondary"}
                  data-testid="badge-event-status"
                >
                  {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                </Badge>
              )}
              {isHybrid ? (
                <Badge variant="secondary" data-testid="badge-event-hybrid">
                  <Wifi className="mr-1 h-3 w-3" />
                  Hybrid
                </Badge>
              ) : event.isVirtual ? (
                <Badge variant="secondary" data-testid="badge-event-virtual">
                  <Monitor className="mr-1 h-3 w-3" />
                  Virtual
                </Badge>
              ) : (
                <Badge variant="secondary" data-testid="badge-event-in-person">
                  <Building2 className="mr-1 h-3 w-3" />
                  In-Person
                </Badge>
              )}
              {event.memberOnly && (
                <Badge variant="outline" data-testid="badge-event-member-only">
                  <Lock className="mr-1 h-3 w-3" />
                  Members Only
                </Badge>
              )}
              {event.visibility && event.visibility !== "public" && !event.memberOnly && (
                <Badge variant="outline" data-testid="badge-event-visibility">
                  <Lock className="mr-1 h-3 w-3" />
                  {event.visibility === "members_only" ? "Members Only" :
                   event.visibility === "counselors_only" ? "Counselors Only" :
                   event.visibility === "admins_only" ? "Admins Only" : event.visibility}
                </Badge>
              )}
              {event.registrationEnabled && event.registrationType === "free" && (
                <Badge variant="outline" data-testid="badge-event-free">
                  <Ticket className="mr-1 h-3 w-3" />
                  Free
                </Badge>
              )}
              {event.registrationEnabled && event.registrationType === "paid" && event.registrationFee && (
                <Badge variant="outline" data-testid="badge-event-paid">
                  <Ticket className="mr-1 h-3 w-3" />
                  {formatCurrency(event.registrationFee, event.registrationCurrency || "usd")}
                </Badge>
              )}
              {registrationState === "open" && !isPast && !isCanceled && (
                <Badge className="bg-green-600/15 text-green-700 border-green-600/30" data-testid="badge-registration-open">
                  Registration Open
                </Badge>
              )}
              {registrationState === "closed" && !isPast && !isCanceled && (
                <Badge variant="outline" className="opacity-60" data-testid="badge-registration-closed">
                  Registration Closed
                </Badge>
              )}
              {isPast && (
                <Badge variant="outline" className="opacity-60" data-testid="badge-event-past">
                  Past Event
                </Badge>
              )}
              {isPast && event.recordingUrl && (
                <Badge className="bg-blue-600/15 text-blue-700 border-blue-600/30" data-testid="badge-recording-available">
                  <Video className="mr-1 h-3 w-3" />
                  Recording Available
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
                    {event.timezone && (
                      <p className="text-sm text-muted-foreground" data-testid="text-event-timezone">
                        <Globe className="inline mr-1 h-3 w-3" />
                        {event.timezone}
                      </p>
                    )}
                  </div>
                </div>

                {(displayLocationName || event.locationAddress) && (
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-accent flex-shrink-0 mt-0.5" />
                    <div>
                      {displayLocationName && (
                        <p className="font-medium" data-testid="text-event-detail-location">
                          {displayLocationName}
                        </p>
                      )}
                      {event.locationAddress && (
                        <p className="text-sm text-muted-foreground" data-testid="text-event-detail-address">
                          {event.locationAddress}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {!displayLocationName && !event.locationAddress && event.location && (
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-accent flex-shrink-0 mt-0.5" />
                    <p className="font-medium" data-testid="text-event-detail-location">
                      {event.location}
                    </p>
                  </div>
                )}

                {event.capacity && (
                  <div className="flex items-start gap-3">
                    <Users className="h-5 w-5 text-accent flex-shrink-0 mt-0.5" />
                    <p className="font-medium" data-testid="text-event-capacity">
                      Capacity: {event.capacity}
                      {event.waitlistEnabled && (
                        <span className="text-sm text-muted-foreground ml-2">(waitlist available)</span>
                      )}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {showMap && (
              <div className="mb-8">
                <EventLocationMap
                  latitude={event.latitude!}
                  longitude={event.longitude!}
                  locationName={displayLocationName || undefined}
                />
              </div>
            )}

            {event.registrationEnabled && (
              <Card className="mb-8" data-testid="section-registration-info">
                <CardContent className="p-5 sm:p-6">
                  <h2 className="font-heading text-lg font-semibold mb-3">Registration</h2>
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      {event.registrationType === "free" ? (
                        <Badge variant="outline" data-testid="badge-registration-free">Free Event</Badge>
                      ) : event.registrationFee ? (
                        <Badge variant="outline" data-testid="badge-registration-paid">
                          {formatCurrency(event.registrationFee, event.registrationCurrency || "usd")}
                        </Badge>
                      ) : null}
                      {registrationState === "open" && (
                        <Badge className="bg-green-600/15 text-green-700 border-green-600/30">Open</Badge>
                      )}
                      {registrationState === "closed" && (
                        <Badge variant="outline" className="opacity-60">Closed</Badge>
                      )}
                      {registrationState === "upcoming" && event.registrationOpensAt && (
                        <Badge variant="outline">Opens {formatFullDate(event.registrationOpensAt)}</Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      {event.registrationOpensAt && registrationState !== "upcoming" && (
                        <p data-testid="text-registration-opens">
                          Opened: {formatFullDate(event.registrationOpensAt)}
                        </p>
                      )}
                      {event.registrationClosesAt && (
                        <p data-testid="text-registration-closes">
                          {registrationState === "closed" ? "Closed" : "Closes"}: {formatFullDate(event.registrationClosesAt)} at {formatTime(event.registrationClosesAt)}
                        </p>
                      )}
                      {event.waitlistEnabled && (
                        <p data-testid="text-waitlist-enabled">Waitlist is available if capacity is reached.</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {event.description && (
              <div className="mb-8" data-testid="text-event-detail-description">
                <h2 className="font-heading text-xl font-semibold mb-3">About This Event</h2>
                <p className="text-sm sm:text-base text-muted-foreground leading-relaxed whitespace-pre-wrap">
                  {event.description}
                </p>
              </div>
            )}

            {event.speakerName && (
              <Card className="mb-8" data-testid="section-speaker">
                <CardContent className="p-5 sm:p-6">
                  <h2 className="font-heading text-lg font-semibold mb-4">Speaker / Host</h2>
                  <div className="flex items-start gap-4">
                    <Avatar className="h-16 w-16 flex-shrink-0">
                      {event.speakerImageUrl && (
                        <AvatarImage src={event.speakerImageUrl} alt={event.speakerName} />
                      )}
                      <AvatarFallback>
                        <User className="h-6 w-6" />
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold text-lg" data-testid="text-speaker-name">
                        {event.speakerName}
                      </p>
                      {event.speakerBio && (
                        <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap" data-testid="text-speaker-bio">
                          {event.speakerBio}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {isPast && event.recordingUrl && (
              <Card className="mb-8 border-blue-200 dark:border-blue-800" data-testid="section-recording">
                <CardContent className="p-5 sm:p-6">
                  <h2 className="font-heading text-lg font-semibold mb-2">Recording Available</h2>
                  <p className="text-sm text-muted-foreground mb-4">
                    A recording of this event is available to watch. This recording will also be available in the event archives.
                  </p>
                  {userHasAccess ? (
                    <a href={event.recordingUrl} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" data-testid="button-view-recording">
                        <Video className="mr-2 h-4 w-4" />
                        Watch Recording
                      </Button>
                    </a>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">
                      <Lock className="inline mr-1 h-3 w-3" />
                      Log in to access the recording.
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {!isPast && !isCanceled && !isCompleted && (
              <div className="border-t pt-8" data-testid="section-event-join">
                <h2 className="font-heading text-xl font-semibold mb-3">
                  {event.isVirtual ? "Join This Event" : "Attend This Event"}
                </h2>

                {!userHasAccess && event.visibility !== "public" ? (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      <Lock className="inline mr-1 h-4 w-4" />
                      This event requires membership access. Log in or join the network to view event details.
                    </p>
                    <Link href="/join">
                      <Button variant="outline" data-testid="button-join-network">
                        Join the Network
                      </Button>
                    </Link>
                  </div>
                ) : event.isVirtual && joinUrl ? (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      {isHybrid
                        ? "This is a hybrid event. You can attend virtually or in person."
                        : "This is a virtual event. Click below to join or register."}
                    </p>
                    <a href={joinUrl} target="_blank" rel="noopener noreferrer">
                      <Button
                        size="lg"
                        className="bg-accent text-accent-foreground border-accent-border"
                        data-testid="button-event-join"
                      >
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Join / Register
                      </Button>
                    </a>
                    {event.virtualDialInInfo && (
                      <Card className="mt-2" data-testid="section-dial-in">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <p className="text-sm font-medium">Dial-In Information</p>
                          </div>
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap pl-6">
                            {event.virtualDialInInfo}
                          </p>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      {displayLocationName
                        ? `This event will be held at ${displayLocationName}. Registration details will be provided soon.`
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

            {isPast && !event.recordingUrl && (
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

            {isCanceled && !isPast && (
              <div className="border-t pt-8" data-testid="section-event-canceled-notice">
                <p className="text-sm text-muted-foreground">
                  This event has been canceled. Check our{" "}
                  <Link href="/events" className="text-accent underline underline-offset-2">
                    events page
                  </Link>{" "}
                  for other upcoming events.
                </p>
              </div>
            )}
          </article>
        )}
      </div>
    </PageLayout>
  );
}

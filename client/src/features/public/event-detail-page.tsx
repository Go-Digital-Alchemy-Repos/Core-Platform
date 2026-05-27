import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useParams, useLocation } from "wouter";
import type { Event } from "@shared/schema/events";
import { getEventPath, getEventUrlSegment } from "@shared/event-url";
import type { EventRegistration } from "@shared/schema/event-registrations";
import type { SeoSettings } from "@shared/schema";
import { PageLayout } from "@/components/layout/page-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { EventLocationMap } from "@/components/shared/event-location-map";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient, getQueryFn } from "@/lib/queryClient";
import { useState, useEffect } from "react";
import { useSeo } from "@/hooks/use-seo";
import { JsonLd } from "@/components/shared/json-ld";
import { formatEventDate, formatEventTime } from "@/lib/event-datetime";
import { getImageObjectPositionStyle } from "@/lib/image-focus";
import { stripHtml } from "@/lib/html";
import {
  buildOrganizationLd,
  buildBreadcrumbLd,
  buildEventLd,
  buildVideoObjectLd,
} from "@/lib/structured-data";
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
  CheckCircle2,
  XCircle,
  ClockIcon,
  Loader2,
  LogIn,
  Mail,
} from "lucide-react";

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

function RegistrationSection({
  event,
  user,
  isPast,
  isCanceled,
}: {
  event: Event;
  user: { id: string; role: string; email: string; firstName: string } | null;
  isPast: boolean;
  isCanceled: boolean;
}) {
  const { toast } = useToast();
  const registrationState = getRegistrationState(event);

  const {
    data: registration,
    isLoading: regLoading,
  } = useQuery<EventRegistration | null>({
    queryKey: ["/api/events", event.id, "registration"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!user && event.registrationEnabled === true && !isPast && !isCanceled,
  });

  const registerMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/events/${event.id}/register`);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", event.id, "registration"] });
      toast({ title: "Registered successfully", description: "You have been registered for this event." });
    },
    onError: (error: Error) => {
      toast({ title: "Registration failed", description: error.message, variant: "destructive" });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/events/${event.id}/registration`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", event.id, "registration"] });
      toast({ title: "Registration canceled", description: "Your registration has been canceled." });
    },
    onError: (error: Error) => {
      toast({ title: "Cancellation failed", description: error.message, variant: "destructive" });
    },
  });

  const payMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/stripe/create-event-checkout-session", { eventId: event.id });
      const { url } = await res.json();
      return url;
    },
    onSuccess: (url) => {
      window.location.href = url;
    },
    onError: (error: Error) => {
      toast({ title: "Checkout failed", description: error.message, variant: "destructive" });
    },
  });

  if (!event.registrationEnabled) return null;
  if (isPast || isCanceled) return null;

  const isFree = event.registrationType === "free";
  const isPaid = event.registrationType === "paid";

  const [guestFirstName, setGuestFirstName] = useState("");
  const [guestLastName, setGuestLastName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestRegistered, setGuestRegistered] = useState(false);

  const guestRegisterMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/events/${event.id}/register-guest`, {
        firstName: guestFirstName,
        lastName: guestLastName,
        email: guestEmail,
      });
      return await res.json();
    },
    onSuccess: (data) => {
      setGuestRegistered(true);
      const statusMsg = data.status === "waitlisted" 
        ? "You've been added to the waitlist. We'll notify you if a spot opens up."
        : "You have been registered for this event. Check your email for confirmation.";
      toast({ title: data.status === "waitlisted" ? "Added to waitlist" : "Registered successfully", description: statusMsg });
    },
    onError: (error: Error) => {
      toast({ title: "Registration failed", description: error.message, variant: "destructive" });
    },
  });

  if (!user) {
    if (registrationState === "upcoming") {
      return (
        <Card data-testid="card-registration-upcoming">
          <CardContent className="p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <ClockIcon className="h-5 w-5 text-muted-foreground" />
              <div>
                <h3 className="font-heading text-lg font-semibold">Registration Opens Soon</h3>
                {event.registrationOpensAt && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Registration opens on {formatEventDate(event.registrationOpensAt, event.timezone, { weekday: "long", month: "long", day: "numeric", year: "numeric" })} at {formatEventTime(event.registrationOpensAt, event.timezone, { timeZoneName: "short" })}.
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      );
    }

    if (registrationState === "closed") {
      return (
        <Card data-testid="card-registration-closed">
          <CardContent className="p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <XCircle className="h-5 w-5 text-muted-foreground" />
              <div>
                <h3 className="font-heading text-lg font-semibold">Registration Closed</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Registration for this event has closed.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      );
    }

    if (guestRegistered) {
      return (
        <Card className="border-green-600/30" data-testid="card-guest-registration-success">
          <CardContent className="p-5 sm:p-6">
            <div className="flex items-center gap-3 mb-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <h3 className="font-heading text-lg font-semibold">You're Registered</h3>
            </div>
            <p className="text-sm text-muted-foreground" data-testid="text-guest-success-message">
              A confirmation email has been sent to your email address.
            </p>
          </CardContent>
        </Card>
      );
    }

    if (isPaid || (event.visibility && event.visibility !== "public")) {
      return (
        <Card data-testid="card-registration-login">
          <CardContent className="p-5 sm:p-6">
            <div className="flex items-center gap-3 mb-3">
              <LogIn className="h-5 w-5 text-accent" />
              <h3 className="font-heading text-lg font-semibold">Register for This Event</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              {isPaid 
                ? `This is a paid event (${formatCurrency(event.registrationFee || 0, event.registrationCurrency || "usd")}). Log in to register and pay.` 
                : "Log in to your account to register for this event."}
            </p>
            <Link href="/login">
              <Button data-testid="button-login-to-register">
                <LogIn className="mr-2 h-4 w-4" />
                Log in to Register
              </Button>
            </Link>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card data-testid="card-guest-registration">
        <CardContent className="p-5 sm:p-6">
          <div className="flex items-center gap-3 mb-3">
            <Ticket className="h-5 w-5 text-accent" />
            <h3 className="font-heading text-lg font-semibold">Register for This Event</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Fill in your details below to register for this free event.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              guestRegisterMutation.mutate();
            }}
            className="space-y-3"
          >
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="guest-first-name" className="text-sm">First Name</Label>
                <Input
                  id="guest-first-name"
                  value={guestFirstName}
                  onChange={(e) => setGuestFirstName(e.target.value)}
                  required
                  data-testid="input-guest-first-name"
                />
              </div>
              <div>
                <Label htmlFor="guest-last-name" className="text-sm">Last Name</Label>
                <Input
                  id="guest-last-name"
                  value={guestLastName}
                  onChange={(e) => setGuestLastName(e.target.value)}
                  required
                  data-testid="input-guest-last-name"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="guest-email" className="text-sm">Email</Label>
              <Input
                id="guest-email"
                type="email"
                value={guestEmail}
                onChange={(e) => setGuestEmail(e.target.value)}
                required
                data-testid="input-guest-email"
              />
            </div>
            <Button
              type="submit"
              disabled={guestRegisterMutation.isPending || !guestFirstName || !guestLastName || !guestEmail}
              className="w-full"
              data-testid="button-guest-register"
            >
              {guestRegisterMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Ticket className="mr-2 h-4 w-4" />
              )}
              Register
            </Button>
          </form>
          <div className="mt-3 text-center">
            <p className="text-xs text-muted-foreground">
              Already have an account?{" "}
              <Link href="/login" className="text-accent hover:underline" data-testid="link-login-instead">
                Log in
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (registration && registration.status === "confirmed" && (registration.paymentStatus === "paid" || registration.paymentStatus === "not_required") && registrationState !== "open") {
    return (
      <Card className="border-green-600/30" data-testid="card-registration-confirmed-closed">
        <CardContent className="p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <h3 className="font-heading text-lg font-semibold">You're Registered</h3>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            You are confirmed for this event.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (registrationState === "closed" && (!registration || registration.status === "canceled")) {
    return (
      <Card data-testid="card-registration-closed">
        <CardContent className="p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <XCircle className="h-5 w-5 text-muted-foreground" />
            <div>
              <h3 className="font-heading text-lg font-semibold">Registration Closed</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Registration for this event has closed.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (registrationState === "upcoming") {
    return (
      <Card data-testid="card-registration-upcoming">
        <CardContent className="p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <ClockIcon className="h-5 w-5 text-muted-foreground" />
            <div>
              <h3 className="font-heading text-lg font-semibold">Registration Opens Soon</h3>
              {event.registrationOpensAt && (
                <p className="text-sm text-muted-foreground mt-1">
                  Registration opens on {formatEventDate(event.registrationOpensAt, event.timezone, { weekday: "long", month: "long", day: "numeric", year: "numeric" })} at {formatEventTime(event.registrationOpensAt, event.timezone, { timeZoneName: "short" })}.
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (regLoading) {
    return (
      <Card data-testid="card-registration-loading">
        <CardContent className="p-5 sm:p-6 flex items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Checking registration status...</p>
        </CardContent>
      </Card>
    );
  }

  if (registration && registration.status === "confirmed" && (registration.paymentStatus === "paid" || registration.paymentStatus === "not_required")) {
    return (
      <Card className="border-green-600/30" data-testid="card-registration-confirmed">
        <CardContent className="p-5 sm:p-6">
          <div className="flex items-center gap-3 mb-3">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <h3 className="font-heading text-lg font-semibold">You're Registered</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            You are confirmed for this event. We'll send event details and any updates to your email.
          </p>
          {isFree && (
            <Button
              variant="outline"
              onClick={() => cancelMutation.mutate()}
              disabled={cancelMutation.isPending}
              data-testid="button-cancel-registration"
            >
              {cancelMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <XCircle className="mr-2 h-4 w-4" />
              )}
              Cancel Registration
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  if (isPaid && registration && registration.paymentStatus === "pending") {
    return (
      <Card className="border-yellow-600/30" data-testid="card-registration-pending-payment">
        <CardContent className="p-5 sm:p-6">
          <div className="flex items-center gap-3 mb-3">
            <ClockIcon className="h-5 w-5 text-yellow-600" />
            <h3 className="font-heading text-lg font-semibold">Payment Pending</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            You've started the registration process but haven't completed the payment yet.
          </p>
          <Button
            onClick={() => payMutation.mutate()}
            disabled={payMutation.isPending}
            data-testid="button-resume-checkout"
          >
            {payMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Ticket className="mr-2 h-4 w-4" />
            )}
            Resume Checkout
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (registration && registration.status === "waitlisted") {
    return (
      <Card className="border-yellow-600/30" data-testid="card-registration-waitlisted">
        <CardContent className="p-5 sm:p-6">
          <div className="flex items-center gap-3 mb-3">
            <ClockIcon className="h-5 w-5 text-yellow-600" />
            <h3 className="font-heading text-lg font-semibold">You're on the Waitlist</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            This event is at capacity. You'll be automatically confirmed if a spot opens up, and we'll notify you by email.
          </p>
          <Button
            variant="outline"
            onClick={() => cancelMutation.mutate()}
            disabled={cancelMutation.isPending}
            data-testid="button-cancel-waitlist"
          >
            {cancelMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <XCircle className="mr-2 h-4 w-4" />
            )}
            Leave Waitlist
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="card-registration-register">
      <CardContent className="p-5 sm:p-6">
        <div className="flex items-center gap-3 mb-3">
          <Ticket className="h-5 w-5 text-accent" />
          <h3 className="font-heading text-lg font-semibold">Register for This Event</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          {isPaid 
            ? `Secure your spot for this event. Registration fee: ${formatCurrency(event.registrationFee || 0, event.registrationCurrency || "usd")}.`
            : "Secure your spot for this free event. You'll receive a confirmation email after registering."}
        </p>
        {isPaid ? (
          <Button
            onClick={() => payMutation.mutate()}
            disabled={payMutation.isPending}
            data-testid="button-register-and-pay"
          >
            {payMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Ticket className="mr-2 h-4 w-4" />
            )}
            Register & Pay {formatCurrency(event.registrationFee || 0, event.registrationCurrency || "usd")}
          </Button>
        ) : (
          <Button
            onClick={() => registerMutation.mutate()}
            disabled={registerMutation.isPending}
            data-testid="button-register-event"
          >
            {registerMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Ticket className="mr-2 h-4 w-4" />
            )}
            Register for This Event
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function EventSeo({ event, globalSeo }: { event: Event; globalSeo?: SeoSettings }) {
  const titleSuffix = globalSeo?.titleSuffix ?? " | Core Platform";
  const siteUrl = globalSeo?.siteUrl || (typeof window !== "undefined" ? window.location.origin : "");
  const effectiveTitle = `${event.title}${titleSuffix}`;
  const effectiveDescription = event.description
    ? stripHtml(event.description)
    : globalSeo?.defaultMetaDescription || undefined;
  const effectiveOgImage = event.imageUrl || globalSeo?.defaultOgImageUrl || undefined;
  const canonical = `${siteUrl}${getEventPath(event)}`;

  useSeo({
    title: effectiveTitle,
    description: effectiveDescription,
    ogImage: effectiveOgImage,
    canonical,
  });

  const breadcrumbs = buildBreadcrumbLd([
    { name: "Home", url: siteUrl || "/" },
    { name: "Events", url: `${siteUrl}/events` },
    { name: event.title, url: canonical },
  ]);

  return (
    <JsonLd
      schemas={[
        globalSeo ? buildOrganizationLd(globalSeo) : null,
        breadcrumbs,
        buildEventLd(event, globalSeo),
        buildVideoObjectLd(event, globalSeo),
      ]}
    />
  );
}

export default function EventDetailPage() {
  const params = useParams<{ id: string }>();
  const eventId = params.id;
  const { user } = useAuth();
  const { toast } = useToast();
  const [location, setLocation] = useLocation();

  const { data: event, isLoading, error } = useQuery<Event>({
    queryKey: ["/api/events", eventId],
    enabled: !!eventId,
  });

  const { data: globalSeo } = useQuery<SeoSettings>({
    queryKey: ["/api/seo/global"],
    staleTime: 10 * 60 * 1000,
  });

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const checkout = searchParams.get("checkout");
    if (checkout === "success") {
      toast({
        title: "Registration successful!",
        description: "Your payment has been processed and your registration is confirmed.",
      });
      // Clear the query parameters without refreshing the page
      setLocation(event ? getEventPath(event) : `/events/${eventId}`, { replace: true });
      // Invalidate queries to fetch the new registration status
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "registration"] });
    } else if (checkout === "canceled") {
      toast({
        title: "Registration canceled",
        description: "The payment process was canceled. You can try registering again when you're ready.",
      });
      setLocation(event ? getEventPath(event) : `/events/${eventId}`, { replace: true });
    }
  }, [event, eventId, setLocation, toast]);

  useEffect(() => {
    if (!event || !eventId) return;
    const canonicalSegment = getEventUrlSegment(event);
    if (eventId !== canonicalSegment && !window.location.search) {
      setLocation(getEventPath(event), { replace: true });
    }
  }, [event, eventId, setLocation]);

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
      <section className="relative" data-testid="section-event-detail-hero">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 pt-10 pb-6 sm:pt-14 sm:pb-8">
          <Link href="/events">
            <Button variant="ghost" className="mb-4 -ml-2" data-testid="button-back-events">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Events
            </Button>
          </Link>
        </div>
      </section>

      <div className="mx-auto max-w-3xl px-4 sm:px-6 pt-8 pb-2 sm:pt-12 sm:pb-3" data-testid="section-event-info">
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
            <EventSeo event={event} globalSeo={globalSeo} />
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
                  style={getImageObjectPositionStyle(event.imagePositionX, event.imagePositionY)}
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
                   event.visibility === "counselors_only" ? "Mental Health Professionals Only" :
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

            <Card className={showMap ? "mb-8" : "mb-2"}>
              <CardContent className="p-5 sm:p-6 space-y-4">
                <div className="flex items-start gap-3">
                  <CalendarDays className="h-5 w-5 text-accent flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium" data-testid="text-event-detail-date">
                      {formatEventDate(event.date, event.timezone, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                    </p>
                    {event.endDate && new Date(event.endDate).toDateString() !== new Date(event.date).toDateString() && (
                      <p className="text-sm text-muted-foreground">
                        to {formatEventDate(event.endDate, event.timezone, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Clock className="h-5 w-5 text-accent flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium" data-testid="text-event-detail-time">
                      {formatEventTime(event.date, event.timezone, { timeZoneName: "short" })}
                      {event.endDate && ` — ${formatEventTime(event.endDate, event.timezone, { timeZoneName: "short" })}`}
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

          </article>
        )}
      </div>

      {event && (event.description || event.speakerName) && (
        <section className="mx-auto max-w-3xl px-4 sm:px-6 pt-4 pb-10 sm:pt-5 sm:pb-14" data-testid="section-event-description">
          <div>
            {event.description && (
              <>
                <h2 className="font-heading text-xl font-semibold mb-3">About This Event</h2>
                <div
                  className="prose prose-sm sm:prose-base max-w-none text-muted-foreground"
                  data-testid="text-event-detail-description"
                  dangerouslySetInnerHTML={{ __html: event.description }}
                />
              </>
            )}

            {event.speakerName && (
              <Card className={event.description ? "mt-8" : ""} data-testid="section-speaker">
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
          </div>
        </section>
      )}

      {event && (
        <section className="mx-auto max-w-3xl px-4 sm:px-6 pt-4 pb-10 sm:pt-5 sm:pb-14" data-testid="section-event-registration">
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
                        <Badge variant="outline">
                          Opens {formatEventDate(event.registrationOpensAt, event.timezone, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      {event.registrationOpensAt && registrationState !== "upcoming" && (
                        <p data-testid="text-registration-opens">
                          Opened: {formatEventDate(event.registrationOpensAt, event.timezone, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                        </p>
                      )}
                      {event.registrationClosesAt && (
                        <p data-testid="text-registration-closes">
                          {registrationState === "closed" ? "Closed" : "Closes"}: {formatEventDate(event.registrationClosesAt, event.timezone, { weekday: "long", month: "long", day: "numeric", year: "numeric" })} at {formatEventTime(event.registrationClosesAt, event.timezone, { timeZoneName: "short" })}
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

            {isPast && event.recordingUrl && (
              <Card className="mb-8 border-blue-200" data-testid="section-recording">
                <CardContent className="p-5 sm:p-6">
                  <h2 className="font-heading text-lg font-semibold mb-2">Recording Available</h2>
                  <p className="text-sm text-muted-foreground mb-4">
                    A recording of this event is available to watch. This recording will also be available in the event archives.
                  </p>
                  {userHasAccess ? (
                    <div className="space-y-3">
                      <a href={event.recordingUrl} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" data-testid="button-view-recording">
                          <Video className="mr-2 h-4 w-4" />
                          Watch Recording
                        </Button>
                      </a>
                      <p className="text-sm">
                        <Link href="/recordings" className="text-muted-foreground hover:text-accent transition-colors underline-offset-4 hover:underline" data-testid="link-browse-recordings">
                          Browse all recordings →
                        </Link>
                      </p>
                    </div>
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
              <div className="space-y-6" data-testid="section-event-join">
                <h2 className="font-heading text-xl font-semibold">
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
                ) : (
                  <>
                    {event.isVirtual && joinUrl && (
                      <div className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                          {isHybrid
                            ? "This is a hybrid event. You can attend virtually or in person."
                            : "This is a virtual event. Click below to join."}
                        </p>
                        <a href={joinUrl} target="_blank" rel="noopener noreferrer">
                          <Button
                            size="lg"
                            className="bg-accent text-accent-foreground border-accent-border"
                            data-testid="button-event-join"
                          >
                            <ExternalLink className="mr-2 h-4 w-4" />
                            Join Virtual Event
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
                    )}

                    {event.registrationEnabled && event.registrationType === "free" && (
                      <RegistrationSection
                        event={event}
                        user={user as any}
                        isPast={isPast}
                        isCanceled={isCanceled}
                      />
                    )}

                    {!event.registrationEnabled && !event.isVirtual && (
                      <div className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                          {displayLocationName
                            ? `This event will be held at ${displayLocationName}. Registration details will be provided soon.`
                            : "Registration details will be provided soon. Please check back for updates."}
                        </p>
                      </div>
                    )}

                    {!event.registrationEnabled && event.isVirtual && !joinUrl && (
                      <div className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                          Virtual event details will be provided soon. Please check back for updates.
                        </p>
                      </div>
                    )}
                  </>
                )}

                {event.memberOnly && !event.registrationEnabled && (
                  <p className="text-sm text-muted-foreground">
                    This event is exclusive to Core Platform members.{" "}
                    <Link href="/join" className="text-accent underline underline-offset-2">
                      Join the network
                    </Link>{" "}
                    to get access.
                  </p>
                )}
              </div>
            )}

            {isPast && !event.recordingUrl && (
              <div className="pt-4" data-testid="section-event-past-notice">
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
              <div className="pt-4" data-testid="section-event-canceled-notice">
                <p className="text-sm text-muted-foreground">
                  This event has been canceled. Check our{" "}
                  <Link href="/events" className="text-accent underline underline-offset-2">
                    events page
                  </Link>{" "}
                  for other upcoming events.
                </p>
              </div>
            )}
        </section>
      )}
    </PageLayout>
  );
}

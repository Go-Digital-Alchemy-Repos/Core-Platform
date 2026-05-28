import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { apiRequest, getQueryFn, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { TherapistSubscription, MembershipTier } from "@shared/schema";
import { TherapistLayout } from "./therapist-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle, AlertCircle, Clock, CreditCard, ExternalLink, Loader2, Check, Lock, ClipboardList } from "lucide-react";

function getStatusBadge(status: string | undefined) {
  switch (status) {
    case "active":
      return <Badge variant="default"><CheckCircle className="w-3 h-3 mr-1" /> Active</Badge>;
    case "trialing":
      return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" /> Trial</Badge>;
    case "past_due":
      return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" /> Past Due</Badge>;
    case "suspended":
      return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" /> Suspended</Badge>;
    case "canceled":
      return <Badge variant="outline"><AlertCircle className="w-3 h-3 mr-1" /> Canceled</Badge>;
    default:
      return <Badge variant="outline">Inactive</Badge>;
  }
}

export default function SubscriptionPage() {
  const { toast } = useToast();

  const { data: subscription, isLoading: subLoading } = useQuery<TherapistSubscription | null>({
    queryKey: ["/api/stripe/subscription-status"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const { data: tiers, isLoading: tiersLoading } = useQuery<MembershipTier[]>({
    queryKey: ["/api/membership-tiers"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const { data: application } = useQuery<any>({
    queryKey: ["/api/therapist/application"],
  });

  const checkoutMutation = useMutation({
    mutationFn: async (priceId: string) => {
      const res = await apiRequest("POST", "/api/stripe/create-checkout-session", { priceId });
      return await res.json();
    },
    onSuccess: (data: { url: string }) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const portalMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/stripe/create-portal-session");
      return await res.json();
    },
    onSuccess: (data: { url: string }) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const retryPaymentMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/stripe/retry-latest-invoice");
      return await res.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/stripe/subscription-status"] });
      toast({ title: "Payment retry started", description: "Stripe is retrying your latest renewal payment now." });
    },
    onError: (error: Error) => {
      toast({ title: "Retry failed", description: error.message, variant: "destructive" });
    },
  });

  if (subLoading || tiersLoading) {
    return (
      <TherapistLayout>
      <div className="p-6 space-y-6 max-w-4xl mx-auto" data-testid="subscription-loading">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
      </TherapistLayout>
    );
  }

  const isApprovedForSubscription = application &&
    ["approved_pending_subscription", "active_member"].includes(application.status);

  const activeTiers = (tiers ?? []).filter((t) => t.isActive).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

  return (
    <TherapistLayout>
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-heading font-semibold" data-testid="text-subscription-title">
        Subscription
      </h1>

      <Card data-testid="card-current-plan">
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
          <div>
            <CardTitle className="text-base">Current Plan</CardTitle>
            <CardDescription>
              {subscription?.status === "active"
                ? "Your subscription is active"
                : subscription?.status === "past_due"
                  ? "Your renewal payment needs attention"
                  : subscription?.status === "suspended"
                    ? "Your membership is suspended until payment is resolved"
                    : "No active subscription"}
            </CardDescription>
          </div>
          <CreditCard className="h-5 w-5 text-muted-foreground" />
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            {getStatusBadge(subscription?.status ?? undefined)}
            {subscription?.currentPeriodEnd && (
              <span className="text-sm text-muted-foreground">
                Current period ends {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
              </span>
            )}
          </div>
          {subscription?.stripeCustomerId && (
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={() => portalMutation.mutate()}
                disabled={portalMutation.isPending}
                data-testid="button-manage-billing"
              >
                {portalMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <ExternalLink className="w-4 h-4 mr-2" />
                )}
                Manage Billing
              </Button>
              {["past_due", "suspended"].includes(subscription.status) && (
                <Button
                  onClick={() => retryPaymentMutation.mutate()}
                  disabled={retryPaymentMutation.isPending}
                  data-testid="button-retry-payment"
                >
                  {retryPaymentMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <CreditCard className="w-4 h-4 mr-2" />
                  )}
                  Retry Payment
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {subscription?.status === "past_due" && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Payment failed</AlertTitle>
          <AlertDescription>
            Your latest renewal charge did not go through. Please update your billing details and retry the payment within the grace window to avoid suspension.
          </AlertDescription>
        </Alert>
      )}

      {subscription?.status === "suspended" && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Membership suspended</AlertTitle>
          <AlertDescription>
            Your directory listing is currently suspended because the renewal payment is still unresolved. Update billing and retry the payment to restore access.
          </AlertDescription>
        </Alert>
      )}

      {!isApprovedForSubscription && (
        <Alert data-testid="alert-subscription-gated">
          <Lock className="h-4 w-4" />
          <AlertTitle>Application Required</AlertTitle>
          <AlertDescription className="space-y-3">
            <p>Membership subscriptions are available after your application has been approved. Please complete the application process first.</p>
            {!application || application.status === "draft" ? (
              <Link href="/therapist/apply">
                <Button size="sm" variant="outline" data-testid="button-start-application">
                  <ClipboardList className="w-4 h-4 mr-2" />
                  Start Application
                </Button>
              </Link>
            ) : application.status === "denied" ? (
              <p className="text-sm text-muted-foreground">Your application was not approved. Please contact support for more information.</p>
            ) : (
              <Link href="/therapist/application/status">
                <Button size="sm" variant="outline" data-testid="button-view-app-status">
                  <ClipboardList className="w-4 h-4 mr-2" />
                  View Application Status
                </Button>
              </Link>
            )}
          </AlertDescription>
        </Alert>
      )}

      {isApprovedForSubscription && activeTiers.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-4" data-testid="text-available-plans">
            Available Plans
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {activeTiers.map((tier) => (
              <Card key={tier.id} data-testid={`card-tier-${tier.id}`}>
                <CardHeader>
                  <CardTitle className="text-base">{tier.name}</CardTitle>
                  {tier.description && (
                    <CardDescription>{tier.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-bold" data-testid={`text-price-${tier.id}`}>
                        ${(tier.monthlyPrice / 100).toFixed(2)}
                      </span>
                      <span className="text-sm text-muted-foreground">/month</span>
                    </div>
                    {tier.annualPrice > 0 && (
                      <p className="text-sm text-muted-foreground mt-1">
                        or ${(tier.annualPrice / 100).toFixed(2)}/year
                      </p>
                    )}
                  </div>
                  {tier.features && tier.features.length > 0 && (
                    <ul className="space-y-1">
                      {tier.features.map((feature, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <Check className="w-4 h-4 mt-0.5 text-primary shrink-0" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {tier.stripePriceIdMonthly && (
                    <Button
                      className="w-full"
                      onClick={() => checkoutMutation.mutate(tier.stripePriceIdMonthly!)}
                      disabled={checkoutMutation.isPending}
                      data-testid={`button-subscribe-${tier.id}`}
                    >
                      {checkoutMutation.isPending ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : null}
                      Subscribe Monthly
                    </Button>
                  )}
                  {tier.stripePriceIdAnnual && (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => checkoutMutation.mutate(tier.stripePriceIdAnnual!)}
                      disabled={checkoutMutation.isPending}
                      data-testid={`button-subscribe-annual-${tier.id}`}
                    >
                      {checkoutMutation.isPending ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : null}
                      Subscribe Annually
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
    </TherapistLayout>
  );
}

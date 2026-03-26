import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import type { TherapistSubscription, MembershipTier } from "@shared/schema";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle, AlertCircle, Clock, CreditCard, Check } from "lucide-react";

function getStatusBadge(status: string | undefined) {
  switch (status) {
    case "active":
      return <Badge variant="default"><CheckCircle className="w-3 h-3 mr-1" /> Active</Badge>;
    case "trialing":
      return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" /> Trial</Badge>;
    case "past_due":
      return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" /> Past Due</Badge>;
    case "canceled":
      return <Badge variant="outline"><AlertCircle className="w-3 h-3 mr-1" /> Canceled</Badge>;
    default:
      return <Badge variant="outline">Inactive</Badge>;
  }
}

export default function SubscriptionPage() {
  const { data: subscription, isLoading: subLoading } = useQuery<TherapistSubscription | null>({
    queryKey: ["/api/membership-tiers"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const { data: tiers, isLoading: tiersLoading } = useQuery<MembershipTier[]>({
    queryKey: ["/api/membership-tiers"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  if (subLoading || tiersLoading) {
    return (
      <div className="p-6 space-y-6 max-w-4xl mx-auto" data-testid="subscription-loading">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  const activeTiers = (tiers ?? []).filter((t) => t.isActive).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-heading font-semibold" data-testid="text-subscription-title">
        Membership
      </h1>

      <Card data-testid="card-current-plan">
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
          <div>
            <CardTitle className="text-base">Current Plan</CardTitle>
            <CardDescription>
              {subscription ? "Your membership details" : "No active membership"}
            </CardDescription>
          </div>
          <CreditCard className="h-5 w-5 text-muted-foreground" />
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            {getStatusBadge(undefined)}
          </div>
          <p className="text-sm text-muted-foreground">
            Online payments are not currently enabled. Please contact us for membership details.
          </p>
        </CardContent>
      </Card>

      {activeTiers.length > 0 && (
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
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

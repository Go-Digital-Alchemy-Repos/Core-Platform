import { useQuery, useMutation } from "@tanstack/react-query";
import { PageLayout } from "@/components/layout/page-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { MembershipPlan, MembershipPlanEntitlement, MembershipPlanPrice } from "@shared/schema";

interface PlanWithDetails extends MembershipPlan {
  prices: MembershipPlanPrice[];
  entitlements: MembershipPlanEntitlement[];
}

function formatPrice(price: MembershipPlanPrice) {
  if (price.amount === 0) return "Free";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: price.currency.toUpperCase(),
  }).format(price.amount / 100);
}

export default function MembershipPage() {
  const { toast } = useToast();
  const { data: plans = [], isLoading } = useQuery<PlanWithDetails[]>({
    queryKey: ["/api/membership/plans"],
  });

  const checkoutMutation = useMutation({
    mutationFn: async ({ planId, priceId }: { planId: string; priceId: string }) => {
      const origin = window.location.origin;
      const res = await apiRequest("POST", "/api/membership/checkout/session", {
        planId,
        priceId,
        successUrl: `${origin}/membership?checkout=success`,
        cancelUrl: `${origin}/membership?checkout=cancelled`,
      });
      return res.json() as Promise<{ url?: string }>;
    },
    onSuccess: (data) => {
      if (data.url) window.location.href = data.url;
    },
    onError: (error: Error) => {
      toast({
        title: "Could not start membership checkout",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <PageLayout>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14 sm:py-20">
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-heading font-semibold">Membership</h1>
          <p className="mt-3 text-muted-foreground max-w-2xl">
            Choose a membership level to access member-only content and resources.
          </p>
        </div>

        {isLoading ? (
          <div className="py-20 flex justify-center"><LoadingSpinner /></div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {plans.map((plan) => {
              const primaryPrice = plan.prices.find((price) => price.active) ?? plan.prices[0];
              return (
                <Card key={plan.id} className="rounded-lg">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-3">
                      <CardTitle>{plan.name}</CardTitle>
                      {plan.isFree ? <Badge variant="secondary">Free</Badge> : null}
                    </div>
                    {primaryPrice ? (
                      <div className="text-2xl font-semibold">
                        {formatPrice(primaryPrice)}
                        {primaryPrice.amount > 0 ? (
                          <span className="text-sm font-normal text-muted-foreground"> / {primaryPrice.interval}</span>
                        ) : null}
                      </div>
                    ) : null}
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {plan.description ? <p className="text-sm text-muted-foreground">{plan.description}</p> : null}
                    <ul className="space-y-2 text-sm">
                      {plan.entitlements.map((entitlement) => (
                        <li key={entitlement.id}>{entitlement.label || entitlement.entitlement}</li>
                      ))}
                    </ul>
                    <Button
                      className="w-full"
                      disabled={!primaryPrice || checkoutMutation.isPending}
                      onClick={() => primaryPrice && checkoutMutation.mutate({ planId: plan.id, priceId: primaryPrice.id })}
                    >
                      {plan.isFree ? "Start Free Membership" : "Join Now"}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </PageLayout>
  );
}

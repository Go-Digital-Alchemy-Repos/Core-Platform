import { useQuery } from "@tanstack/react-query";
import { Calendar, Clock, FileEdit, LogIn } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/shared/loading-spinner";

interface ActivityData {
  stats: {
    lastLoginAt: string | null;
    accountCreated: string | null;
    profileEditCount: number;
    loginCount: number;
  };
  logs: Array<{
    id: string;
    action: string;
    details: string | null;
    createdAt: string;
  }>;
}

interface SubscriptionData {
  subscription: {
    id: string;
    status: string;
    currentPeriodStart: string | null;
    currentPeriodEnd: string | null;
    stripeSubscriptionId: string | null;
  } | null;
  tier: {
    id: string;
    name: string;
    price: number;
    interval: string;
  } | null;
}

function formatDate(date: string | null | undefined) {
  if (!date) return "Never";
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function MembershipTab({ therapistId }: { therapistId: string }) {
  const { data, isLoading } = useQuery<SubscriptionData>({
    queryKey: ["/api/admin/therapists", therapistId, "subscription"],
    queryFn: async () => {
      const res = await fetch(`/api/admin/therapists/${therapistId}/subscription`);
      if (!res.ok) throw new Error("Failed to load subscription");
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  if (!data?.subscription) {
    return (
      <div className="text-center py-12 text-muted-foreground" data-testid="text-no-subscription">
        <p className="text-lg font-medium">No Active Subscription</p>
        <p className="text-sm mt-1">This profile does not have an active subscription.</p>
      </div>
    );
  }

  const { subscription, tier } = data;
  const statusColors: Record<string, string> = {
    active: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    trialing: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    past_due: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
    canceled: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    inactive: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Plan</p>
            <p className="text-lg font-semibold mt-1" data-testid="text-tier-name">
              {tier?.name ?? "Unknown"}
            </p>
            {tier && (
              <p className="text-sm text-muted-foreground" data-testid="text-tier-price">
                ${(tier.price / 100).toFixed(2)} / {tier.interval}
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Status</p>
            <Badge
              className={`mt-2 ${statusColors[subscription.status] ?? statusColors.inactive} no-default-hover-elevate no-default-active-elevate`}
              data-testid="badge-subscription-status"
            >
              {subscription.status}
            </Badge>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Current Period</p>
            <p className="text-sm mt-1" data-testid="text-period-start">
              Start: {formatDate(subscription.currentPeriodStart)}
            </p>
            <p className="text-sm" data-testid="text-period-end">
              End: {formatDate(subscription.currentPeriodEnd)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Stripe ID</p>
            <p
              className="text-sm mt-1 font-mono text-muted-foreground truncate"
              data-testid="text-stripe-id"
            >
              {subscription.stripeSubscriptionId ?? "N/A"}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function ActivityTab({ therapistId }: { therapistId: string }) {
  const { data, isLoading } = useQuery<ActivityData>({
    queryKey: ["/api/admin/therapists", therapistId, "activity"],
    queryFn: async () => {
      const res = await fetch(`/api/admin/therapists/${therapistId}/activity`);
      if (!res.ok) throw new Error("Failed to load activity");
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  const stats = data?.stats;
  const logs = data?.logs ?? [];

  const statCards = [
    { icon: LogIn, label: "Last Login", value: formatDate(stats?.lastLoginAt) },
    { icon: Calendar, label: "Account Created", value: formatDate(stats?.accountCreated) },
    { icon: FileEdit, label: "Profile Edits", value: String(stats?.profileEditCount ?? 0) },
    { icon: LogIn, label: "Total Logins", value: String(stats?.loginCount ?? 0) },
  ];

  const actionLabels: Record<string, string> = {
    login: "Logged in",
    profile_update: "Profile updated",
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((s) => (
          <Card key={s.label}>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <s.icon className="w-4 h-4" />
                <p className="text-xs uppercase tracking-wide">{s.label}</p>
              </div>
              <p
                className="text-sm font-semibold"
                data-testid={`text-stat-${s.label.toLowerCase().replace(/\s/g, "-")}`}
              >
                {s.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div>
        <h3 className="text-sm font-medium mb-3">Activity Log</h3>
        {logs.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4" data-testid="text-no-activity">
            No activity recorded yet.
          </p>
        ) : (
          <div className="border rounded-lg divide-y max-h-[400px] overflow-y-auto">
            {logs.map((log) => (
              <div
                key={log.id}
                className="flex items-start gap-3 px-4 py-3"
                data-testid={`row-activity-${log.id}`}
              >
                <Clock className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium">{actionLabels[log.action] ?? log.action}</p>
                  {log.details && <p className="text-xs text-muted-foreground">{log.details}</p>}
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatDate(log.createdAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

import { useQuery } from "@tanstack/react-query";
import { STALE_TIMES } from "@/lib/queryClient";
import { ProtectedRoute } from "@/components/shared/protected-route";
import { AdminSidebar } from "./admin-sidebar";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserCheck, CreditCard, Clock, Mail } from "lucide-react";

interface DashboardStats {
  totalTherapists: number;
  activeSubscriptions: number;
  pendingTherapists: number;
  unreadMessages: number;
}

export default function AdminDashboardPage() {
  return (
    <ProtectedRoute roles={["admin"]}>
      <AdminSidebar>
        <DashboardContent />
      </AdminSidebar>
    </ProtectedRoute>
  );
}

function DashboardContent() {
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/admin/dashboard-stats"],
    staleTime: STALE_TIMES.LIVE,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <LoadingSpinner />
      </div>
    );
  }

  const cards = [
    {
      title: "Total Therapists",
      value: stats?.totalTherapists ?? 0,
      icon: UserCheck,
    },
    {
      title: "Active Subscriptions",
      value: stats?.activeSubscriptions ?? 0,
      icon: CreditCard,
    },
    {
      title: "Pending Approvals",
      value: stats?.pendingTherapists ?? 0,
      icon: Clock,
    },
    {
      title: "Unread Messages",
      value: stats?.unreadMessages ?? 0,
      icon: Mail,
    },
  ];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-heading font-semibold mb-6" data-testid="text-admin-dashboard-title">
        Dashboard
      </h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <Card key={card.title} data-testid={`card-stat-${card.title.toLowerCase().replace(/\s+/g, "-")}`}>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
              <card.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid={`text-stat-value-${card.title.toLowerCase().replace(/\s+/g, "-")}`}>
                {card.value}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

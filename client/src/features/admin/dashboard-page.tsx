import { useQuery } from "@tanstack/react-query";
import { STALE_TIMES } from "@/lib/queryClient";
import { ProtectedRoute } from "@/components/shared/protected-route";
import { AdminSidebar } from "./admin-sidebar";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import {
  UserCheck,
  CreditCard,
  Clock,
  Mail,
  Users,
  CalendarDays,
  TrendingUp,
  Activity,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface DashboardStats {
  totalTherapists: number;
  activeSubscriptions: number;
  pendingTherapists: number;
  approvedTherapists: number;
  unreadMessages: number;
}

interface AnalyticsData {
  usersByRole: { role: string; count: number }[];
  therapistsByStatus: { status: string; count: number }[];
  subscriptionsByStatus: { status: string; count: number }[];
  registrationTrend: { month: string; count: number }[];
  contactsTrend: { month: string; count: number }[];
  topSpecializations: { name: string; count: number }[];
  recentActivity: {
    id: string;
    userId: string;
    action: string;
    details: string | null;
    createdAt: string;
    userName: string;
  }[];
  totalUsers: number;
  totalEvents: number;
  upcomingEvents: number;
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

const PIE_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

const registrationConfig = {
  count: { label: "Registrations", color: "hsl(var(--chart-1))" },
} satisfies ChartConfig;

const contactsConfig = {
  count: { label: "Messages", color: "hsl(var(--chart-3))" },
} satisfies ChartConfig;

const specConfig = {
  count: { label: "Mental Health Professionals", color: "hsl(var(--chart-2))" },
} satisfies ChartConfig;

const pieConfig = {
  count: { label: "Count" },
} satisfies ChartConfig;

function formatMonth(monthStr: string) {
  const [year, month] = monthStr.split("-");
  const date = new Date(Number(year), Number(month) - 1);
  return date.toLocaleDateString("en-US", { month: "short" });
}

function formatAction(action: string) {
  return action
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function DashboardContent() {
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/admin/dashboard-stats"],
    staleTime: STALE_TIMES.LIVE,
    refetchOnWindowFocus: true,
    refetchInterval: 60_000,
  });

  const { data: analytics, isLoading: analyticsLoading } = useQuery<AnalyticsData>({
    queryKey: ["/api/admin/dashboard-analytics"],
    staleTime: STALE_TIMES.OPERATIONAL,
    refetchOnWindowFocus: true,
    refetchInterval: 5 * 60_000,
  });

  if (statsLoading || analyticsLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <LoadingSpinner />
      </div>
    );
  }

  const statCards = [
    { title: "Total Users", value: analytics?.totalUsers ?? 0, icon: Users, color: "text-blue-500" },
    { title: "Total Mental Health Professionals", value: stats?.totalTherapists ?? 0, icon: UserCheck, color: "text-emerald-500" },
    { title: "Active Subscriptions", value: stats?.activeSubscriptions ?? 0, icon: CreditCard, color: "text-violet-500" },
    { title: "Pending Approvals", value: stats?.pendingTherapists ?? 0, icon: Clock, color: "text-amber-500" },
    { title: "Unread Messages", value: stats?.unreadMessages ?? 0, icon: Mail, color: "text-rose-500" },
    { title: "Upcoming Events", value: analytics?.upcomingEvents ?? 0, icon: CalendarDays, color: "text-cyan-500" },
  ];

  const registrationData = (analytics?.registrationTrend ?? []).map((r) => ({
    ...r,
    label: formatMonth(r.month),
  }));

  const contactsData = (analytics?.contactsTrend ?? []).map((r) => ({
    ...r,
    label: formatMonth(r.month),
  }));

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-heading font-semibold" data-testid="text-admin-dashboard-title">
          Dashboard
        </h1>
        <Badge variant="outline" className="text-xs text-muted-foreground" data-testid="badge-last-refresh">
          <Activity className="h-3 w-3 mr-1" />
          Live
        </Badge>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {statCards.map((card) => (
          <Card key={card.title} data-testid={`card-stat-${card.title.toLowerCase().replace(/\s+/g, "-")}`}>
            <CardContent className="pt-4 pb-3 px-4">
              <div className="flex items-center justify-between mb-2">
                <card.icon className={`h-4 w-4 ${card.color}`} />
              </div>
              <div className="text-2xl font-bold" data-testid={`text-stat-value-${card.title.toLowerCase().replace(/\s+/g, "-")}`}>
                {card.value}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{card.title}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card data-testid="card-registration-trend">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              User Registrations
            </CardTitle>
            <CardDescription>New signups over the last 6 months</CardDescription>
          </CardHeader>
          <CardContent>
            {registrationData.length > 0 ? (
              <ChartContainer config={registrationConfig} className="h-[220px] w-full">
                <LineChart data={registrationData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="var(--color-count)"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ChartContainer>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">
                No registration data yet
              </div>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-contacts-trend">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Contact Messages
            </CardTitle>
            <CardDescription>Incoming inquiries over the last 6 months</CardDescription>
          </CardHeader>
          <CardContent>
            {contactsData.length > 0 ? (
              <ChartContainer config={contactsConfig} className="h-[220px] w-full">
                <BarChart data={contactsData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" fill="var(--color-count)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">
                No contact data yet
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card data-testid="card-therapist-status">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Mental Health Professional Status</CardTitle>
            <CardDescription>Approval breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            {(analytics?.therapistsByStatus ?? []).length > 0 ? (
              <ChartContainer config={pieConfig} className="h-[200px] w-full">
                <PieChart>
                  <Pie
                    data={analytics?.therapistsByStatus}
                    dataKey="count"
                    nameKey="status"
                    cx="50%"
                    cy="50%"
                    outerRadius={75}
                    innerRadius={40}
                    paddingAngle={2}
                    label={({ status, count }) => `${status} (${count})`}
                    labelLine={false}
                  >
                    {(analytics?.therapistsByStatus ?? []).map((_entry, idx) => (
                      <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent nameKey="status" />} />
                </PieChart>
              </ChartContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
                No data
              </div>
            )}
            <div className="flex flex-wrap gap-2 mt-2 justify-center">
              {(analytics?.therapistsByStatus ?? []).map((s, idx) => (
                <Badge key={s.status} variant="outline" className="text-xs capitalize">
                  <span
                    className="w-2 h-2 rounded-full mr-1.5 inline-block"
                    style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }}
                  />
                  {s.status}: {s.count}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-user-roles">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Users by Role</CardTitle>
            <CardDescription>Role distribution</CardDescription>
          </CardHeader>
          <CardContent>
            {(analytics?.usersByRole ?? []).length > 0 ? (
              <ChartContainer config={pieConfig} className="h-[200px] w-full">
                <PieChart>
                  <Pie
                    data={analytics?.usersByRole}
                    dataKey="count"
                    nameKey="role"
                    cx="50%"
                    cy="50%"
                    outerRadius={75}
                    innerRadius={40}
                    paddingAngle={2}
                    label={({ role, count }) => `${role} (${count})`}
                    labelLine={false}
                  >
                    {(analytics?.usersByRole ?? []).map((_entry, idx) => (
                      <Cell key={idx} fill={PIE_COLORS[(idx + 1) % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent nameKey="role" />} />
                </PieChart>
              </ChartContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
                No data
              </div>
            )}
            <div className="flex flex-wrap gap-2 mt-2 justify-center">
              {(analytics?.usersByRole ?? []).map((r, idx) => (
                <Badge key={r.role} variant="outline" className="text-xs capitalize">
                  <span
                    className="w-2 h-2 rounded-full mr-1.5 inline-block"
                    style={{ backgroundColor: PIE_COLORS[(idx + 1) % PIE_COLORS.length] }}
                  />
                  {r.role}: {r.count}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-subscription-status">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Subscriptions</CardTitle>
            <CardDescription>Status breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            {(analytics?.subscriptionsByStatus ?? []).length > 0 ? (
              <ChartContainer config={pieConfig} className="h-[200px] w-full">
                <PieChart>
                  <Pie
                    data={analytics?.subscriptionsByStatus}
                    dataKey="count"
                    nameKey="status"
                    cx="50%"
                    cy="50%"
                    outerRadius={75}
                    innerRadius={40}
                    paddingAngle={2}
                    label={({ status, count }) => `${status} (${count})`}
                    labelLine={false}
                  >
                    {(analytics?.subscriptionsByStatus ?? []).map((_entry, idx) => (
                      <Cell key={idx} fill={PIE_COLORS[(idx + 2) % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent nameKey="status" />} />
                </PieChart>
              </ChartContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
                No subscriptions yet
              </div>
            )}
            <div className="flex flex-wrap gap-2 mt-2 justify-center">
              {(analytics?.subscriptionsByStatus ?? []).map((s, idx) => (
                <Badge key={s.status} variant="outline" className="text-xs capitalize">
                  <span
                    className="w-2 h-2 rounded-full mr-1.5 inline-block"
                    style={{ backgroundColor: PIE_COLORS[(idx + 2) % PIE_COLORS.length] }}
                  />
                  {s.status}: {s.count}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card data-testid="card-top-specializations">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Top Specializations</CardTitle>
            <CardDescription>Most common mental health professional specializations</CardDescription>
          </CardHeader>
          <CardContent>
            {(analytics?.topSpecializations ?? []).length > 0 ? (
              <ChartContainer config={specConfig} className="h-[260px] w-full">
                <BarChart
                  data={analytics?.topSpecializations}
                  layout="vertical"
                  margin={{ top: 5, right: 20, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={140}
                    tick={{ fontSize: 11 }}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" fill="var(--color-count)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ChartContainer>
            ) : (
              <div className="h-[260px] flex items-center justify-center text-muted-foreground text-sm">
                No specialization data yet
              </div>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-recent-activity">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Recent Activity
            </CardTitle>
            <CardDescription>Latest system actions</CardDescription>
          </CardHeader>
          <CardContent>
            {(analytics?.recentActivity ?? []).length > 0 ? (
              <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                {analytics?.recentActivity.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-start gap-3 py-2 border-b last:border-b-0"
                    data-testid={`activity-row-${entry.id}`}
                  >
                    <div className="w-2 h-2 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">
                        <span className="font-medium">{entry.userName}</span>
                        {" "}
                        <span className="text-muted-foreground">{formatAction(entry.action)}</span>
                      </p>
                      {entry.details && (
                        <p className="text-xs text-muted-foreground truncate">{entry.details}</p>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap flex-shrink-0">
                      {timeAgo(entry.createdAt)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-[260px] flex items-center justify-center text-muted-foreground text-sm">
                No recent activity
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

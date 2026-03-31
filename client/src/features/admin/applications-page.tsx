import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { ClipboardList, Eye, Loader2 } from "lucide-react";
import { AdminSidebar } from "./admin-sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { APPLICATION_STATUS_LABELS, type ApplicationStatus } from "@shared/types";

function statusBadgeVariant(status: ApplicationStatus): "default" | "secondary" | "destructive" | "outline" {
  if (["active_member", "approved_pending_subscription"].includes(status)) return "default";
  if (status === "denied") return "destructive";
  if (status === "withdrawn") return "secondary";
  return "outline";
}

export default function AdminApplicationsPage() {
  const { data: applications, isLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/applications"],
  });

  const { data: stats } = useQuery<Record<string, number>>({
    queryKey: ["/api/admin/applications/stats"],
  });

  const totalApps = applications?.length ?? 0;
  const pendingCount = (stats?.submitted ?? 0) +
    (stats?.awaiting_background_check ?? 0) +
    (stats?.background_check_in_progress ?? 0) +
    (stats?.awaiting_references ?? 0) +
    (stats?.references_in_progress ?? 0) +
    (stats?.ready_for_interview ?? 0) +
    (stats?.interview_scheduled ?? 0) +
    (stats?.interview_completed ?? 0);

  return (
    <AdminSidebar>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-heading font-bold" data-testid="text-page-title">Applications</h1>
            <p className="text-muted-foreground text-sm">Manage provider membership applications</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Total</p>
              <p className="text-2xl font-bold" data-testid="text-total-apps">{totalApps}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Pending Review</p>
              <p className="text-2xl font-bold text-blue-600" data-testid="text-pending-apps">{pendingCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Approved</p>
              <p className="text-2xl font-bold text-green-600" data-testid="text-approved-apps">{(stats?.approved_pending_subscription ?? 0) + (stats?.active_member ?? 0)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Denied</p>
              <p className="text-2xl font-bold text-red-600" data-testid="text-denied-apps">{stats?.denied ?? 0}</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ClipboardList className="w-4 h-4" />
              All Applications
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : applications && applications.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Applicant</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {applications.map((app: any) => (
                    <TableRow key={app.id} data-testid={`row-application-${app.id}`}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{app.userName}</p>
                          <p className="text-xs text-muted-foreground">{app.userEmail}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusBadgeVariant(app.status as ApplicationStatus)}>
                          {APPLICATION_STATUS_LABELS[app.status as ApplicationStatus] ?? app.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {app.submittedAt ? new Date(app.submittedAt).toLocaleDateString() : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Link href={`/admin/applications/${app.id}`}>
                          <Button variant="ghost" size="sm" data-testid={`button-view-${app.id}`}>
                            <Eye className="w-4 h-4 mr-1" />
                            View
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>No applications yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminSidebar>
  );
}

import { useQuery, useMutation } from "@tanstack/react-query";
import { ProtectedRoute } from "@/components/shared/protected-route";
import { AdminSidebar } from "./admin-sidebar";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
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
interface TherapistWithUser {
  id: string;
  userId: string;
  title: string | null;
  bio: string | null;
  specializations: string[] | null;
  languages: string[] | null;
  credentials: string | null;
  licenseNumber: string | null;
  practiceMode: string | null;
  addressLine1: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  phone: string | null;
  website: string | null;
  acceptingClients: boolean | null;
  isApproved: boolean | null;
  isActive: boolean | null;
  user?: {
    firstName: string | null;
    lastName: string | null;
    email: string;
    profileImageUrl: string | null;
  };
}

export default function AdminTherapistsPage() {
  return (
    <ProtectedRoute roles={["admin"]}>
      <AdminSidebar>
        <TherapistsContent />
      </AdminSidebar>
    </ProtectedRoute>
  );
}

function TherapistsContent() {
  const { toast } = useToast();
  const { data: therapists, isLoading } = useQuery<TherapistWithUser[]>({
    queryKey: ["/api/admin/therapists"],
  });

  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("PUT", `/api/admin/therapists/${id}/approve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/therapists"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/dashboard-stats"] });
      toast({ title: "Therapist approved" });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("PUT", `/api/admin/therapists/${id}/reject`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/therapists"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/dashboard-stats"] });
      toast({ title: "Therapist rejected" });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-heading font-semibold mb-6" data-testid="text-admin-therapists-title">
        Therapists
      </h1>
      <Table data-testid="table-therapists">
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Practice Mode</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {therapists?.map((t) => (
            <TableRow key={t.id} data-testid={`row-therapist-${t.id}`}>
              <TableCell data-testid={`text-therapist-name-${t.id}`}>
                {t.user ? `${t.user.firstName ?? ""} ${t.user.lastName ?? ""}`.trim() : "Unknown"}
              </TableCell>
              <TableCell data-testid={`text-therapist-email-${t.id}`}>
                {t.user?.email ?? "—"}
              </TableCell>
              <TableCell>
                <Badge variant={t.isApproved ? "default" : "secondary"} data-testid={`badge-status-${t.id}`}>
                  {t.isApproved ? "Approved" : "Pending"}
                </Badge>
              </TableCell>
              <TableCell data-testid={`text-practice-mode-${t.id}`}>
                {t.practiceMode ?? "—"}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2 flex-wrap">
                  {!t.isApproved && (
                    <Button
                      size="sm"
                      onClick={() => approveMutation.mutate(t.id)}
                      disabled={approveMutation.isPending}
                      data-testid={`button-approve-${t.id}`}
                    >
                      Approve
                    </Button>
                  )}
                  {t.isApproved && (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => rejectMutation.mutate(t.id)}
                      disabled={rejectMutation.isPending}
                      data-testid={`button-reject-${t.id}`}
                    >
                      Reject
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
          {(!therapists || therapists.length === 0) && (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                No therapists found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

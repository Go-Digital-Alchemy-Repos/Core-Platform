import { useQuery, useMutation } from "@tanstack/react-query";
import { ProtectedRoute } from "@/components/shared/protected-route";
import { AdminSidebar } from "./admin-sidebar";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { User } from "@shared/schema";

type SafeUser = Omit<User, "password">;

export default function AdminUsersPage() {
  return (
    <ProtectedRoute roles={["admin"]}>
      <AdminSidebar>
        <UsersContent />
      </AdminSidebar>
    </ProtectedRoute>
  );
}

function UsersContent() {
  const { toast } = useToast();
  const { data: users, isLoading } = useQuery<SafeUser[]>({
    queryKey: ["/api/admin/users"],
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: string }) => {
      await apiRequest("PUT", `/api/admin/users/${id}`, { role });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "User role updated" });
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
      <h1 className="text-2xl font-heading font-semibold mb-6" data-testid="text-admin-users-title">
        Users
      </h1>
      <Table data-testid="table-users">
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Created</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users?.map((u) => (
            <TableRow key={u.id} data-testid={`row-user-${u.id}`}>
              <TableCell data-testid={`text-user-name-${u.id}`}>
                {`${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || "—"}
              </TableCell>
              <TableCell data-testid={`text-user-email-${u.id}`}>
                {u.email}
              </TableCell>
              <TableCell>
                <Select
                  value={u.role}
                  onValueChange={(role) =>
                    updateRoleMutation.mutate({ id: u.id, role })
                  }
                  data-testid={`select-role-${u.id}`}
                >
                  <SelectTrigger className="w-32" data-testid={`select-trigger-role-${u.id}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="therapist">Therapist</SelectItem>
                    <SelectItem value="client">Client</SelectItem>
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell data-testid={`text-user-created-${u.id}`}>
                {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "—"}
              </TableCell>
            </TableRow>
          ))}
          {(!users || users.length === 0) && (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                No users found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

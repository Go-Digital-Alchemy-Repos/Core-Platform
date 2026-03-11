import { useState } from "react";
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetBody,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import type { User } from "@shared/schema";
import {
  Plus,
  Search,
  KeyRound,
  Trash2,
  Mail,
  MoreHorizontal,
  UserPlus,
  Eye,
  EyeOff,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";

type SafeUser = Omit<User, "password"> & { country?: string | null };

function displayRole(role: string): string {
  if (role === "therapist") return "Counselor";
  return role.charAt(0).toUpperCase() + role.slice(1);
}

export default function AdminUsersPage() {
  return (
    <ProtectedRoute roles={["admin"]}>
      <AdminSidebar>
        <UsersContent />
      </AdminSidebar>
    </ProtectedRoute>
  );
}

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  therapist: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  client: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
};

function UsersContent() {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [detailUser, setDetailUser] = useState<SafeUser | null>(null);

  const { data: users, isLoading } = useQuery<SafeUser[]>({
    queryKey: ["/api/admin/users"],
  });

  const filtered = users?.filter((u) => {
    const matchesRole = roleFilter === "all" || u.role === roleFilter;
    const matchesSearch =
      !search ||
      `${u.firstName ?? ""} ${u.lastName ?? ""}`.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    return matchesRole && matchesSearch;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <LoadingSpinner />
      </div>
    );
  }

  const counts = {
    all: users?.length ?? 0,
    admin: users?.filter((u) => u.role === "admin").length ?? 0,
    therapist: users?.filter((u) => u.role === "therapist").length ?? 0,
    client: users?.filter((u) => u.role === "client").length ?? 0,
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1
          className="text-2xl font-heading font-semibold"
          data-testid="text-admin-users-title"
        >
          User Management
        </h1>
        <Button onClick={() => setCreateOpen(true)} data-testid="button-create-user">
          <Plus className="mr-2 h-4 w-4" />
          Add User
        </Button>
      </div>

      <Tabs value={roleFilter} onValueChange={setRoleFilter}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <TabsList data-testid="tabs-role-filter">
            <TabsTrigger value="all" data-testid="tab-all">
              All ({counts.all})
            </TabsTrigger>
            <TabsTrigger value="admin" data-testid="tab-admin">
              Admins ({counts.admin})
            </TabsTrigger>
            <TabsTrigger value="therapist" data-testid="tab-therapist">
              Counselors ({counts.therapist})
            </TabsTrigger>
            <TabsTrigger value="client" data-testid="tab-client">
              Clients ({counts.client})
            </TabsTrigger>
          </TabsList>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
              data-testid="input-search-users"
            />
          </div>
        </div>
      </Tabs>

      <div className="rounded-lg border">
        <Table data-testid="table-users">
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered?.map((u) => (
              <TableRow key={u.id} data-testid={`row-user-${u.id}`}>
                <TableCell data-testid={`text-user-name-${u.id}`}>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      {`${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || "—"}
                    </span>
                    {u.isSuspended && (
                      <Badge variant="secondary" className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 text-xs">
                        Suspended
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground" data-testid={`text-user-country-${u.id}`}>
                  {u.country ?? "—"}
                </TableCell>
                <TableCell>
                  <Badge
                    variant="secondary"
                    className={ROLE_COLORS[u.role] || ""}
                    data-testid={`badge-role-${u.id}`}
                  >
                    {displayRole(u.role)}
                  </Badge>
                </TableCell>
                <TableCell data-testid={`text-user-created-${u.id}`}>
                  {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "—"}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDetailUser(u)}
                    data-testid={`button-actions-${u.id}`}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {(!filtered || filtered.length === 0) && (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center text-muted-foreground py-8"
                >
                  {search || roleFilter !== "all"
                    ? "No users match your filters."
                    : "No users found."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <CreateUserSheet open={createOpen} onOpenChange={setCreateOpen} />
      <UserDetailSheet
        user={detailUser}
        onClose={() => setDetailUser(null)}
        onUserUpdated={(updated) => setDetailUser(updated)}
      />
    </div>
  );
}

function CreateUserSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [role, setRole] = useState("client");
  const [sendWelcome, setSendWelcome] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  const createMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/admin/users", {
        email,
        password,
        firstName,
        lastName,
        role,
        sendWelcomeEmail: sendWelcome,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/dashboard-stats"] });
      toast({ title: "User created successfully" });
      setEmail("");
      setPassword("");
      setFirstName("");
      setLastName("");
      setRole("client");
      setSendWelcome(true);
      setShowPassword(false);
      onOpenChange(false);
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" size="default">
        <SheetHeader>
          <SheetTitle className="font-heading">Create New User</SheetTitle>
          <SheetDescription>
            Add a new user to the platform.
          </SheetDescription>
        </SheetHeader>
        <SheetBody>
          <form
            id="create-user-form"
            onSubmit={(e) => {
              e.preventDefault();
              createMutation.mutate();
            }}
            className="space-y-4"
          >
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="create-first">First Name</Label>
                <Input
                  id="create-first"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  data-testid="input-create-first-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-last">Last Name</Label>
                <Input
                  id="create-last"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                  data-testid="input-create-last-name"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-email">Email</Label>
              <Input
                id="create-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                data-testid="input-create-email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-password">Password</Label>
              <div className="relative">
                <Input
                  id="create-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="At least 6 characters"
                  data-testid="input-create-password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-role">Role</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger data-testid="select-create-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="client">Client</SelectItem>
                  <SelectItem value="therapist">Counselor</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="send-welcome"
                checked={sendWelcome}
                onCheckedChange={(v) => setSendWelcome(!!v)}
                data-testid="checkbox-send-welcome"
              />
              <Label htmlFor="send-welcome" className="font-normal cursor-pointer">
                Send welcome email
              </Label>
            </div>
          </form>
        </SheetBody>
        <SheetFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            data-testid="button-cancel-create"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="create-user-form"
            disabled={createMutation.isPending}
            data-testid="button-submit-create"
          >
            {createMutation.isPending ? "Creating..." : "Create User"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function UserDetailSheet({
  user,
  onClose,
  onUserUpdated,
}: {
  user: SafeUser | null;
  onClose: () => void;
  onUserUpdated: (u: SafeUser) => void;
}) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("profile");
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("client");

  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  function handleOpen() {
    if (user) {
      setFirstName(user.firstName ?? "");
      setLastName(user.lastName ?? "");
      setEmail(user.email);
      setRole(user.role);
      setNewPassword("");
      setShowPassword(false);
      setActiveTab("profile");
    }
  }

  const updateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PUT", `/api/admin/users/${user!.id}`, {
        firstName: firstName || null,
        lastName: lastName || null,
        email,
        role,
      });
      return res.json();
    },
    onSuccess: (updated: SafeUser) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "Profile updated successfully" });
      onUserUpdated({ ...user!, ...updated });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/admin/users/${user!.id}/reset-password`, { newPassword });
    },
    onSuccess: () => {
      toast({ title: "Password reset successfully" });
      setNewPassword("");
      setShowPassword(false);
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const sendResetLinkMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/admin/users/${user!.id}/reset-password`, {});
    },
    onSuccess: () => {
      toast({ title: "Password reset email sent", description: `Reset link sent to ${user?.email}` });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const suspendMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PATCH", `/api/admin/users/${user!.id}/suspend`);
      return res.json();
    },
    onSuccess: (updated: SafeUser) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      const action = updated.isSuspended ? "suspended" : "reactivated";
      toast({ title: `Account ${action}`, description: `${user?.firstName} ${user?.lastName}'s account has been ${action}.` });
      onUserUpdated({ ...user!, isSuspended: updated.isSuspended });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/admin/users/${user!.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/dashboard-stats"] });
      toast({ title: "User deleted" });
      setDeleteConfirmOpen(false);
      onClose();
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const fullName = user ? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.email : "";

  return (
    <>
      <Sheet
        open={!!user}
        onOpenChange={(v) => {
          if (!v) onClose();
          else handleOpen();
        }}
      >
        <SheetContent side="right" size="default" onOpenAutoFocus={handleOpen}>
          <SheetHeader>
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <SheetTitle className="font-heading" data-testid="text-detail-name">
                  {fullName}
                </SheetTitle>
                <SheetDescription data-testid="text-detail-email">
                  {user?.email}
                </SheetDescription>
              </div>
              {user && (
                <div className="flex flex-col items-end gap-1 pt-1">
                  <Badge
                    variant="secondary"
                    className={ROLE_COLORS[user.role] || ""}
                    data-testid="badge-detail-role"
                  >
                    {displayRole(user.role)}
                  </Badge>
                  {user.isSuspended && (
                    <Badge variant="secondary" className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 text-xs">
                      Suspended
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </SheetHeader>

          <SheetBody>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="w-full mb-4">
                <TabsTrigger value="profile" className="flex-1" data-testid="tab-detail-profile">
                  Profile
                </TabsTrigger>
                <TabsTrigger value="security" className="flex-1" data-testid="tab-detail-security">
                  Access &amp; Security
                </TabsTrigger>
              </TabsList>

              <TabsContent value="profile" className="mt-0">
                {user && (
                  <form
                    id="detail-profile-form"
                    onSubmit={(e) => {
                      e.preventDefault();
                      updateMutation.mutate();
                    }}
                    className="space-y-4"
                  >
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="detail-first">First Name</Label>
                        <Input
                          id="detail-first"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          data-testid="input-detail-first-name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="detail-last">Last Name</Label>
                        <Input
                          id="detail-last"
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          data-testid="input-detail-last-name"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="detail-email">Email</Label>
                      <Input
                        id="detail-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        data-testid="input-detail-email"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="detail-role">Role</Label>
                      <Select value={role} onValueChange={setRole}>
                        <SelectTrigger data-testid="select-detail-role">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="client">Client</SelectItem>
                          <SelectItem value="therapist">Counselor</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </form>
                )}
              </TabsContent>

              <TabsContent value="security" className="mt-0 space-y-4">
                <div className="rounded-lg border p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <KeyRound className="h-4 w-4 text-muted-foreground" />
                    <h3 className="font-medium text-sm">Reset Password</h3>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Set a new password directly for this account.
                  </p>
                  <form
                    id="detail-reset-form"
                    onSubmit={(e) => {
                      e.preventDefault();
                      resetPasswordMutation.mutate();
                    }}
                    className="flex gap-2"
                  >
                    <div className="relative flex-1">
                      <Input
                        type={showPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="New password (min 6 chars)"
                        minLength={6}
                        required
                        data-testid="input-detail-new-password"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                    <Button
                      type="submit"
                      disabled={resetPasswordMutation.isPending || !newPassword.trim()}
                      data-testid="button-detail-reset-password"
                    >
                      {resetPasswordMutation.isPending ? "Saving..." : "Set"}
                    </Button>
                  </form>
                </div>

                <div className="rounded-lg border p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <h3 className="font-medium text-sm">Send Reset Email</h3>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Email a password reset link to <span className="font-medium">{user?.email}</span>.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => sendResetLinkMutation.mutate()}
                    disabled={sendResetLinkMutation.isPending}
                    data-testid="button-detail-send-reset-link"
                  >
                    {sendResetLinkMutation.isPending ? "Sending..." : "Send Reset Link"}
                  </Button>
                </div>

                <div className="rounded-lg border p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {user?.isSuspended ? (
                        <ShieldAlert className="h-4 w-4 text-red-500" />
                      ) : (
                        <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                      )}
                      <h3 className="font-medium text-sm">Suspend Account</h3>
                    </div>
                    <Switch
                      checked={user?.isSuspended ?? false}
                      onCheckedChange={() => suspendMutation.mutate()}
                      disabled={suspendMutation.isPending}
                      data-testid="switch-suspend-account"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {user?.isSuspended
                      ? "This account is suspended. The user cannot log in."
                      : "Suspending this account will prevent the user from logging in."}
                  </p>
                </div>

                <Separator />

                <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                    <h3 className="font-medium text-sm text-destructive">Danger Zone</h3>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Permanently delete this account. This action cannot be undone.
                  </p>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setDeleteConfirmOpen(true)}
                    data-testid="button-detail-delete"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Account
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </SheetBody>

          {activeTab === "profile" && (
            <SheetFooter>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                data-testid="button-detail-cancel"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                form="detail-profile-form"
                disabled={updateMutation.isPending}
                data-testid="button-detail-save"
              >
                {updateMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </SheetFooter>
          )}
        </SheetContent>
      </Sheet>

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User Account</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete <strong>{fullName}</strong> ({user?.email})?
              This action is irreversible — all data associated with this account will be lost and cannot be recovered.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-delete-cancel">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-delete-confirm"
            >
              {deleteMutation.isPending ? "Deleting..." : "Yes, delete account"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

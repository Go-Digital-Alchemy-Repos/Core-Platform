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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { User } from "@shared/schema";
import {
  Plus,
  Search,
  KeyRound,
  Trash2,
  Mail,
  MoreHorizontal,
  UserPlus,
  Shield,
  Eye,
  EyeOff,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  therapist: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  client: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
};

function UsersContent() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [editUser, setEditUser] = useState<SafeUser | null>(null);
  const [resetUser, setResetUser] = useState<SafeUser | null>(null);
  const [deleteUser, setDeleteUser] = useState<SafeUser | null>(null);
  const [sendResetLinkUser, setSendResetLinkUser] = useState<SafeUser | null>(null);

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
              <TableHead>Role</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered?.map((u) => (
              <TableRow key={u.id} data-testid={`row-user-${u.id}`}>
                <TableCell data-testid={`text-user-name-${u.id}`}>
                  <span className="font-medium">
                    {`${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || "—"}
                  </span>
                </TableCell>
                <TableCell>
                  <Badge
                    variant="secondary"
                    className={ROLE_COLORS[u.role] || ""}
                    data-testid={`badge-role-${u.id}`}
                  >
                    {u.role.charAt(0).toUpperCase() + u.role.slice(1)}
                  </Badge>
                </TableCell>
                <TableCell data-testid={`text-user-created-${u.id}`}>
                  {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "—"}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        data-testid={`button-actions-${u.id}`}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => setEditUser(u)}
                        data-testid={`action-edit-${u.id}`}
                      >
                        <UserPlus className="mr-2 h-4 w-4" />
                        Edit User
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setResetUser(u)}
                        data-testid={`action-reset-password-${u.id}`}
                      >
                        <KeyRound className="mr-2 h-4 w-4" />
                        Reset Password
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setSendResetLinkUser(u)}
                        data-testid={`action-send-reset-link-${u.id}`}
                      >
                        <Mail className="mr-2 h-4 w-4" />
                        Send Reset Link
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => setDeleteUser(u)}
                        className="text-destructive focus:text-destructive"
                        data-testid={`action-delete-${u.id}`}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete User
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
            {(!filtered || filtered.length === 0) && (
              <TableRow>
                <TableCell
                  colSpan={5}
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
      <EditUserSheet user={editUser} onClose={() => setEditUser(null)} />
      <ResetPasswordSheet user={resetUser} onClose={() => setResetUser(null)} />
      <SendResetLinkConfirm
        user={sendResetLinkUser}
        onClose={() => setSendResetLinkUser(null)}
      />
      <DeleteUserConfirm user={deleteUser} onClose={() => setDeleteUser(null)} />
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
      resetForm();
      onOpenChange(false);
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  function resetForm() {
    setEmail("");
    setPassword("");
    setFirstName("");
    setLastName("");
    setRole("client");
    setSendWelcome(true);
    setShowPassword(false);
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(v) => {
        if (!v) resetForm();
        onOpenChange(v);
      }}
    >
      <SheetContent side="right" size="default">
        <SheetHeader>
          <SheetTitle className="font-heading">Create New User</SheetTitle>
          <SheetDescription>
            Create a new account for a customer, counselor, or admin.
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
                  data-testid="input-create-password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                  onClick={() => setShowPassword(!showPassword)}
                  data-testid="button-toggle-password-visibility"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
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
                onCheckedChange={(v) => setSendWelcome(v === true)}
                data-testid="checkbox-send-welcome"
              />
              <Label htmlFor="send-welcome" className="text-sm font-normal cursor-pointer">
                Send welcome email with login credentials
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

function EditUserSheet({
  user,
  onClose,
}: {
  user: SafeUser | null;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("client");

  const isOpen = !!user;

  function handleOpen() {
    if (user) {
      setFirstName(user.firstName ?? "");
      setLastName(user.lastName ?? "");
      setEmail(user.email);
      setRole(user.role);
    }
  }

  const updateMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("PUT", `/api/admin/users/${user!.id}`, {
        firstName: firstName || null,
        lastName: lastName || null,
        email,
        role,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "User updated successfully" });
      onClose();
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  return (
    <Sheet
      open={isOpen}
      onOpenChange={(v) => {
        if (!v) onClose();
        else handleOpen();
      }}
    >
      <SheetContent side="right" size="default" onOpenAutoFocus={handleOpen}>
        <SheetHeader>
          <SheetTitle className="font-heading">Edit User</SheetTitle>
          <SheetDescription>
            Update user account details.
          </SheetDescription>
        </SheetHeader>
        <SheetBody>
          {user && (
            <form
              id="edit-user-form"
              onSubmit={(e) => {
                e.preventDefault();
                updateMutation.mutate();
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-first">First Name</Label>
                  <Input
                    id="edit-first"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    data-testid="input-edit-first-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-last">Last Name</Label>
                  <Input
                    id="edit-last"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    data-testid="input-edit-last-name"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  data-testid="input-edit-email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-role">Role</Label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger data-testid="select-edit-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="client">Client</SelectItem>
                    <SelectItem value="therapist">Therapist</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </form>
          )}
        </SheetBody>
        <SheetFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            data-testid="button-cancel-edit"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="edit-user-form"
            disabled={updateMutation.isPending}
            data-testid="button-submit-edit"
          >
            {updateMutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function ResetPasswordSheet({
  user,
  onClose,
}: {
  user: SafeUser | null;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const resetMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/admin/users/${user!.id}/reset-password`, {
        newPassword,
      });
    },
    onSuccess: () => {
      toast({ title: "Password reset successfully" });
      setNewPassword("");
      setShowPassword(false);
      onClose();
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  return (
    <Sheet
      open={!!user}
      onOpenChange={(v) => {
        if (!v) {
          setNewPassword("");
          setShowPassword(false);
          onClose();
        }
      }}
    >
      <SheetContent side="right" size="default">
        <SheetHeader>
          <SheetTitle className="font-heading flex items-center gap-2">
            <KeyRound className="h-5 w-5" />
            Reset Password
          </SheetTitle>
          <SheetDescription>
            Set a new password for {user?.firstName} {user?.lastName} ({user?.email}).
          </SheetDescription>
        </SheetHeader>
        <SheetBody>
          <form
            id="reset-password-form"
            onSubmit={(e) => {
              e.preventDefault();
              resetMutation.mutate();
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="At least 6 characters"
                  data-testid="input-admin-new-password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </form>
        </SheetBody>
        <SheetFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setNewPassword("");
              setShowPassword(false);
              onClose();
            }}
            data-testid="button-cancel-reset"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="reset-password-form"
            disabled={resetMutation.isPending || !newPassword.trim()}
            data-testid="button-submit-reset"
          >
            {resetMutation.isPending ? "Resetting..." : "Reset Password"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function SendResetLinkConfirm({
  user,
  onClose,
}: {
  user: SafeUser | null;
  onClose: () => void;
}) {
  const { toast } = useToast();

  const sendMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/admin/users/${user!.id}/send-reset-link`);
    },
    onSuccess: () => {
      toast({ title: "Password reset link sent" });
      onClose();
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  return (
    <AlertDialog open={!!user} onOpenChange={(v) => !v && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Send Password Reset Link</AlertDialogTitle>
          <AlertDialogDescription>
            Send a password reset email to {user?.email}?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel data-testid="button-cancel-send-link">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={() => sendMutation.mutate()}
            disabled={sendMutation.isPending}
            data-testid="button-confirm-send-link"
          >
            {sendMutation.isPending ? "Sending..." : "Send Link"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function DeleteUserConfirm({
  user,
  onClose,
}: {
  user: SafeUser | null;
  onClose: () => void;
}) {
  const { toast } = useToast();

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/admin/users/${user!.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/dashboard-stats"] });
      toast({ title: "User deleted" });
      onClose();
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  return (
    <AlertDialog open={!!user} onOpenChange={(v) => !v && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete User</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete {user?.firstName} {user?.lastName} ({user?.email})? This
            action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel data-testid="button-cancel-delete">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={() => deleteMutation.mutate()}
            disabled={deleteMutation.isPending}
            className="bg-destructive text-destructive-foreground"
            data-testid="button-confirm-delete"
          >
            {deleteMutation.isPending ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

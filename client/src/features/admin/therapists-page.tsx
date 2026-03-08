import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ProtectedRoute } from "@/components/shared/protected-route";
import { AdminSidebar } from "./admin-sidebar";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { SPECIALIZATIONS, LANGUAGES, PracticeMode } from "@shared/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Search, Loader2, Trash2, CheckCircle, XCircle, Pencil } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

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
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  zipCode: string | null;
  phone: string | null;
  website: string | null;
  acceptingClients: boolean | null;
  isApproved: boolean | null;
  isActive: boolean | null;
  rejectionReason: string | null;
  user?: {
    firstName: string | null;
    lastName: string | null;
    email: string;
    profileImageUrl: string | null;
  };
}

type StatusFilter = "all" | "pending" | "approved" | "rejected";

function getStatusInfo(t: TherapistWithUser) {
  if (t.isApproved) return { label: "Approved", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" };
  if (t.rejectionReason) return { label: "Rejected", color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" };
  return { label: "Pending", color: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200" };
}

function getInitials(t: TherapistWithUser) {
  const f = t.user?.firstName?.[0] ?? "";
  const l = t.user?.lastName?.[0] ?? "";
  return (f + l).toUpperCase() || "?";
}

const createTherapistSchema = z.object({
  email: z.string().email("Valid email required"),
  password: z.string().min(6, "Min 6 characters"),
  firstName: z.string().min(1, "First name required"),
  lastName: z.string().min(1, "Last name required"),
  title: z.string().optional(),
  bio: z.string().optional(),
  specializations: z.array(z.string()).optional(),
  languages: z.array(z.string()).optional(),
  credentials: z.string().optional(),
  licenseNumber: z.string().optional(),
  practiceMode: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  phone: z.string().optional(),
  website: z.string().optional(),
  acceptingClients: z.boolean().optional(),
  isApproved: z.boolean().optional(),
});
type CreateTherapistValues = z.infer<typeof createTherapistSchema>;

const editProfileSchema = z.object({
  title: z.string().optional(),
  bio: z.string().optional(),
  specializations: z.array(z.string()).optional(),
  languages: z.array(z.string()).optional(),
  credentials: z.string().optional(),
  licenseNumber: z.string().optional(),
  practiceMode: z.string().optional(),
  addressLine1: z.string().optional(),
  addressLine2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  zipCode: z.string().optional(),
  phone: z.string().optional(),
  website: z.string().optional(),
  acceptingClients: z.boolean().optional(),
  isApproved: z.boolean().optional(),
});
type EditProfileValues = z.infer<typeof editProfileSchema>;

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
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedTherapist, setSelectedTherapist] = useState<TherapistWithUser | null>(null);
  const [approveTarget, setApproveTarget] = useState<TherapistWithUser | null>(null);
  const [rejectTarget, setRejectTarget] = useState<TherapistWithUser | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<TherapistWithUser | null>(null);

  const { data: therapists, isLoading } = useQuery<TherapistWithUser[]>({
    queryKey: ["/api/admin/therapists"],
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/admin/therapists"] });
    queryClient.invalidateQueries({ queryKey: ["/api/admin/dashboard-stats"] });
  };

  const createMutation = useMutation({
    mutationFn: async (data: CreateTherapistValues) => {
      const res = await apiRequest("POST", "/api/admin/therapists", data);
      return await res.json();
    },
    onSuccess: () => {
      invalidateAll();
      setAddDialogOpen(false);
      toast({ title: "Therapist created successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: EditProfileValues }) => {
      const res = await apiRequest("PUT", `/api/admin/therapists/${id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      invalidateAll();
      setEditDialogOpen(false);
      setSelectedTherapist(null);
      toast({ title: "Therapist updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("PUT", `/api/admin/therapists/${id}/approve`);
    },
    onSuccess: () => {
      invalidateAll();
      setApproveTarget(null);
      toast({ title: "Therapist approved" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      await apiRequest("PUT", `/api/admin/therapists/${id}/reject`, { reason });
    },
    onSuccess: () => {
      invalidateAll();
      setRejectTarget(null);
      setRejectReason("");
      toast({ title: "Therapist rejected" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/admin/therapists/${id}`);
    },
    onSuccess: () => {
      invalidateAll();
      setDeleteTarget(null);
      toast({ title: "Therapist removed" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const filtered = (therapists ?? []).filter((t) => {
    if (statusFilter === "pending" && (t.isApproved || t.rejectionReason)) return false;
    if (statusFilter === "approved" && !t.isApproved) return false;
    if (statusFilter === "rejected" && (t.isApproved || !t.rejectionReason)) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const name = `${t.user?.firstName ?? ""} ${t.user?.lastName ?? ""}`.toLowerCase();
      const email = (t.user?.email ?? "").toLowerCase();
      if (!name.includes(q) && !email.includes(q)) return false;
    }

    return true;
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
      <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
        <h1 className="text-2xl font-heading font-semibold" data-testid="text-admin-therapists-title">
          Therapists
        </h1>
        <Button onClick={() => setAddDialogOpen(true)} data-testid="button-add-therapist">
          <Plus className="w-4 h-4 mr-2" />
          Add Therapist
        </Button>
      </div>

      <div className="flex flex-col gap-4 mb-6">
        <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
          <TabsList data-testid="tabs-status-filter">
            <TabsTrigger value="all" data-testid="tab-all">All</TabsTrigger>
            <TabsTrigger value="pending" data-testid="tab-pending">Pending</TabsTrigger>
            <TabsTrigger value="approved" data-testid="tab-approved">Approved</TabsTrigger>
            <TabsTrigger value="rejected" data-testid="tab-rejected">Rejected/Inactive</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="input-search-therapists"
          />
        </div>
      </div>

      <Table data-testid="table-therapists">
        <TableHeader>
          <TableRow>
            <TableHead className="w-[50px]"></TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Location</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Session Format</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((t) => {
            const status = getStatusInfo(t);
            return (
              <TableRow
                key={t.id}
                data-testid={`row-therapist-${t.id}`}
                className="cursor-pointer"
                onClick={() => {
                  setSelectedTherapist(t);
                  setEditDialogOpen(true);
                }}
              >
                <TableCell>
                  <Avatar className="h-10 w-10" data-testid={`avatar-therapist-${t.id}`}>
                    {t.user?.profileImageUrl && (
                      <AvatarImage src={t.user.profileImageUrl} alt={`${t.user?.firstName ?? ""} ${t.user?.lastName ?? ""}`} />
                    )}
                    <AvatarFallback className="text-xs">{getInitials(t)}</AvatarFallback>
                  </Avatar>
                </TableCell>
                <TableCell data-testid={`text-therapist-name-${t.id}`}>
                  {t.user ? `${t.user.firstName ?? ""} ${t.user.lastName ?? ""}`.trim() : "Unknown"}
                </TableCell>
                <TableCell data-testid={`text-therapist-email-${t.id}`}>
                  {t.user?.email ?? "\u2014"}
                </TableCell>
                <TableCell data-testid={`text-therapist-location-${t.id}`}>
                  {[t.city, t.country].filter(Boolean).join(", ") || "\u2014"}
                </TableCell>
                <TableCell>
                  <Badge className={`${status.color} no-default-hover-elevate no-default-active-elevate`} data-testid={`badge-status-${t.id}`}>
                    {status.label}
                  </Badge>
                </TableCell>
                <TableCell data-testid={`text-practice-mode-${t.id}`}>
                  {t.practiceMode === "in_person" ? "In-Person" : t.practiceMode === "virtual" ? "Virtual" : t.practiceMode === "both" ? "Both" : "\u2014"}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1 flex-wrap" onClick={(e) => e.stopPropagation()}>
                    {!t.isApproved && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setApproveTarget(t)}
                        data-testid={`button-approve-${t.id}`}
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Approve
                      </Button>
                    )}
                    {(t.isApproved || !t.rejectionReason) && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setRejectTarget(t)}
                        data-testid={`button-reject-${t.id}`}
                      >
                        <XCircle className="w-4 h-4 mr-1" />
                        Reject
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setSelectedTherapist(t);
                        setEditDialogOpen(true);
                      }}
                      data-testid={`button-edit-${t.id}`}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setDeleteTarget(t)}
                      data-testid={`button-delete-${t.id}`}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
          {filtered.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                No therapists found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <AddTherapistDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onSubmit={(data) => createMutation.mutate(data)}
        isPending={createMutation.isPending}
      />

      {selectedTherapist && (
        <EditTherapistDialog
          open={editDialogOpen}
          onOpenChange={(open) => {
            setEditDialogOpen(open);
            if (!open) setSelectedTherapist(null);
          }}
          therapist={selectedTherapist}
          onSubmit={(data) => updateMutation.mutate({ id: selectedTherapist.id, data })}
          isPending={updateMutation.isPending}
        />
      )}

      <AlertDialog open={!!approveTarget} onOpenChange={(open) => !open && setApproveTarget(null)}>
        <AlertDialogContent data-testid="dialog-approve-confirm">
          <AlertDialogHeader>
            <AlertDialogTitle>Approve Therapist</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to approve {approveTarget?.user?.firstName} {approveTarget?.user?.lastName}? They will be listed in the public directory.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-approve-cancel">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => approveTarget && approveMutation.mutate(approveTarget.id)}
              disabled={approveMutation.isPending}
              data-testid="button-approve-confirm"
            >
              {approveMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Approve
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!rejectTarget} onOpenChange={(open) => { if (!open) { setRejectTarget(null); setRejectReason(""); } }}>
        <DialogContent data-testid="dialog-reject">
          <DialogHeader>
            <DialogTitle>Reject Therapist</DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting {rejectTarget?.user?.firstName} {rejectTarget?.user?.lastName}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reject-reason">Rejection Reason</Label>
            <Textarea
              id="reject-reason"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Enter the reason for rejection..."
              className="min-h-[100px]"
              data-testid="textarea-reject-reason"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRejectTarget(null); setRejectReason(""); }} data-testid="button-reject-cancel">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => rejectTarget && rejectMutation.mutate({ id: rejectTarget.id, reason: rejectReason })}
              disabled={!rejectReason.trim() || rejectMutation.isPending}
              data-testid="button-reject-confirm"
            >
              {rejectMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent data-testid="dialog-delete-confirm">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Therapist</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {deleteTarget?.user?.firstName} {deleteTarget?.user?.lastName}? This action will deactivate their profile.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-delete-cancel">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground"
              data-testid="button-delete-confirm"
            >
              {deleteMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function AddTherapistDialog({
  open,
  onOpenChange,
  onSubmit,
  isPending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateTherapistValues) => void;
  isPending: boolean;
}) {
  const form = useForm<CreateTherapistValues>({
    resolver: zodResolver(createTherapistSchema),
    defaultValues: {
      email: "",
      password: "",
      firstName: "",
      lastName: "",
      title: "",
      bio: "",
      specializations: [],
      languages: [],
      credentials: "",
      licenseNumber: "",
      practiceMode: "both",
      city: "",
      state: "",
      country: "",
      phone: "",
      website: "",
      acceptingClients: true,
      isApproved: true,
    },
  });

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) form.reset(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col" data-testid="dialog-add-therapist">
        <DialogHeader>
          <DialogTitle>Add New Therapist</DialogTitle>
          <DialogDescription>Create a new therapist account and profile.</DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-1 pr-4">
          <Form {...form}>
            <form id="add-therapist-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pb-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="firstName" render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <FormControl><Input {...field} data-testid="input-add-firstName" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="lastName" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name</FormLabel>
                    <FormControl><Input {...field} data-testid="input-add-lastName" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl><Input type="email" {...field} data-testid="input-add-email" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="password" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl><Input type="password" {...field} data-testid="input-add-password" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <FormField control={form.control} name="title" render={({ field }) => (
                <FormItem>
                  <FormLabel>Professional Title</FormLabel>
                  <FormControl><Input placeholder="e.g. Licensed Clinical Psychologist" {...field} data-testid="input-add-title" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="bio" render={({ field }) => (
                <FormItem>
                  <FormLabel>Bio</FormLabel>
                  <FormControl><Textarea placeholder="About the therapist..." className="min-h-[80px]" {...field} data-testid="input-add-bio" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="credentials" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Credentials</FormLabel>
                    <FormControl><Input placeholder="e.g. PhD, LMFT" {...field} data-testid="input-add-credentials" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="licenseNumber" render={({ field }) => (
                  <FormItem>
                    <FormLabel>License Number</FormLabel>
                    <FormControl><Input placeholder="e.g. PSY12345" {...field} data-testid="input-add-licenseNumber" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <FormField control={form.control} name="practiceMode" render={({ field }) => (
                <FormItem>
                  <FormLabel>Session Format</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-add-practiceMode">
                        <SelectValue placeholder="Select session format" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={PracticeMode.IN_PERSON}>In-Person</SelectItem>
                      <SelectItem value={PracticeMode.VIRTUAL}>Virtual</SelectItem>
                      <SelectItem value={PracticeMode.BOTH}>Both</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="grid grid-cols-3 gap-4">
                <FormField control={form.control} name="city" render={({ field }) => (
                  <FormItem>
                    <FormLabel>City</FormLabel>
                    <FormControl><Input {...field} data-testid="input-add-city" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="state" render={({ field }) => (
                  <FormItem>
                    <FormLabel>State</FormLabel>
                    <FormControl><Input {...field} data-testid="input-add-state" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="country" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Country</FormLabel>
                    <FormControl><Input {...field} data-testid="input-add-country" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="phone" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl><Input placeholder="(555) 123-4567" {...field} data-testid="input-add-phone" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="website" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Website</FormLabel>
                    <FormControl><Input placeholder="https://example.com" {...field} data-testid="input-add-website" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <div>
                <Label className="text-sm font-medium">Specializations</Label>
                <FormField control={form.control} name="specializations" render={({ field }) => (
                  <FormItem>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {SPECIALIZATIONS.map((spec) => (
                        <div key={spec} className="flex items-center space-x-2">
                          <Checkbox
                            id={`add-spec-${spec}`}
                            checked={field.value?.includes(spec)}
                            onCheckedChange={(checked) => {
                              const current = field.value ?? [];
                              field.onChange(checked ? [...current, spec] : current.filter((s) => s !== spec));
                            }}
                            data-testid={`checkbox-add-spec-${spec}`}
                          />
                          <Label htmlFor={`add-spec-${spec}`} className="text-sm cursor-pointer">{spec}</Label>
                        </div>
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <div>
                <Label className="text-sm font-medium">Languages</Label>
                <FormField control={form.control} name="languages" render={({ field }) => (
                  <FormItem>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {LANGUAGES.map((lang) => (
                        <div key={lang} className="flex items-center space-x-2">
                          <Checkbox
                            id={`add-lang-${lang}`}
                            checked={field.value?.includes(lang)}
                            onCheckedChange={(checked) => {
                              const current = field.value ?? [];
                              field.onChange(checked ? [...current, lang] : current.filter((l) => l !== lang));
                            }}
                            data-testid={`checkbox-add-lang-${lang}`}
                          />
                          <Label htmlFor={`add-lang-${lang}`} className="text-sm cursor-pointer">{lang}</Label>
                        </div>
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <div className="flex items-center gap-4 flex-wrap">
                <FormField control={form.control} name="acceptingClients" render={({ field }) => (
                  <FormItem className="flex items-center gap-2">
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-add-acceptingClients" />
                    </FormControl>
                    <FormLabel className="!mt-0">Accepting Clients</FormLabel>
                  </FormItem>
                )} />
                <FormField control={form.control} name="isApproved" render={({ field }) => (
                  <FormItem className="flex items-center gap-2">
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-add-isApproved" />
                    </FormControl>
                    <FormLabel className="!mt-0">Pre-Approved</FormLabel>
                  </FormItem>
                )} />
              </div>
            </form>
          </Form>
        </ScrollArea>
        <DialogFooter>
          <Button variant="outline" onClick={() => { onOpenChange(false); form.reset(); }} data-testid="button-add-cancel">Cancel</Button>
          <Button type="submit" form="add-therapist-form" disabled={isPending} data-testid="button-add-submit">
            {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Create Therapist
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditTherapistDialog({
  open,
  onOpenChange,
  therapist,
  onSubmit,
  isPending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  therapist: TherapistWithUser;
  onSubmit: (data: EditProfileValues) => void;
  isPending: boolean;
}) {
  const form = useForm<EditProfileValues>({
    resolver: zodResolver(editProfileSchema),
    values: {
      title: therapist.title ?? "",
      bio: therapist.bio ?? "",
      specializations: therapist.specializations ?? [],
      languages: therapist.languages ?? [],
      credentials: therapist.credentials ?? "",
      licenseNumber: therapist.licenseNumber ?? "",
      practiceMode: therapist.practiceMode ?? "both",
      addressLine1: therapist.addressLine1 ?? "",
      addressLine2: therapist.addressLine2 ?? "",
      city: therapist.city ?? "",
      state: therapist.state ?? "",
      country: therapist.country ?? "",
      zipCode: therapist.zipCode ?? "",
      phone: therapist.phone ?? "",
      website: therapist.website ?? "",
      acceptingClients: therapist.acceptingClients ?? true,
      isApproved: therapist.isApproved ?? false,
    },
  });

  const status = getStatusInfo(therapist);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col" data-testid="dialog-edit-therapist">
        <DialogHeader>
          <div className="flex items-center gap-3 flex-wrap">
            <Avatar className="h-12 w-12">
              {therapist.user?.profileImageUrl && (
                <AvatarImage src={therapist.user.profileImageUrl} />
              )}
              <AvatarFallback>{getInitials(therapist)}</AvatarFallback>
            </Avatar>
            <div>
              <DialogTitle>
                {therapist.user?.firstName} {therapist.user?.lastName}
              </DialogTitle>
              <p className="text-sm text-muted-foreground">{therapist.user?.email}</p>
            </div>
            <Badge className={`${status.color} no-default-hover-elevate no-default-active-elevate ml-auto`} data-testid="badge-edit-status">
              {status.label}
            </Badge>
          </div>
          <DialogDescription className="sr-only">Edit therapist profile details</DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-1 pr-4">
          <Form {...form}>
            <form id="edit-therapist-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pb-4">
              <FormField control={form.control} name="title" render={({ field }) => (
                <FormItem>
                  <FormLabel>Professional Title</FormLabel>
                  <FormControl><Input {...field} data-testid="input-edit-title" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="bio" render={({ field }) => (
                <FormItem>
                  <FormLabel>Bio</FormLabel>
                  <FormControl><Textarea className="min-h-[80px]" {...field} data-testid="input-edit-bio" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="credentials" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Credentials</FormLabel>
                    <FormControl><Input {...field} data-testid="input-edit-credentials" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="licenseNumber" render={({ field }) => (
                  <FormItem>
                    <FormLabel>License Number</FormLabel>
                    <FormControl><Input {...field} data-testid="input-edit-licenseNumber" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <FormField control={form.control} name="practiceMode" render={({ field }) => (
                <FormItem>
                  <FormLabel>Session Format</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-edit-practiceMode">
                        <SelectValue placeholder="Select session format" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={PracticeMode.IN_PERSON}>In-Person</SelectItem>
                      <SelectItem value={PracticeMode.VIRTUAL}>Virtual</SelectItem>
                      <SelectItem value={PracticeMode.BOTH}>Both</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="addressLine1" render={({ field }) => (
                <FormItem>
                  <FormLabel>Address Line 1</FormLabel>
                  <FormControl><Input {...field} data-testid="input-edit-addressLine1" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="addressLine2" render={({ field }) => (
                <FormItem>
                  <FormLabel>Address Line 2</FormLabel>
                  <FormControl><Input {...field} data-testid="input-edit-addressLine2" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <FormField control={form.control} name="city" render={({ field }) => (
                  <FormItem>
                    <FormLabel>City</FormLabel>
                    <FormControl><Input {...field} data-testid="input-edit-city" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="state" render={({ field }) => (
                  <FormItem>
                    <FormLabel>State</FormLabel>
                    <FormControl><Input {...field} data-testid="input-edit-state" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="country" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Country</FormLabel>
                    <FormControl><Input {...field} data-testid="input-edit-country" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="zipCode" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Zip Code</FormLabel>
                    <FormControl><Input {...field} data-testid="input-edit-zipCode" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="phone" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl><Input {...field} data-testid="input-edit-phone" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="website" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Website</FormLabel>
                    <FormControl><Input {...field} data-testid="input-edit-website" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <div>
                <Label className="text-sm font-medium">Specializations</Label>
                <FormField control={form.control} name="specializations" render={({ field }) => (
                  <FormItem>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {SPECIALIZATIONS.map((spec) => (
                        <div key={spec} className="flex items-center space-x-2">
                          <Checkbox
                            id={`edit-spec-${spec}`}
                            checked={field.value?.includes(spec)}
                            onCheckedChange={(checked) => {
                              const current = field.value ?? [];
                              field.onChange(checked ? [...current, spec] : current.filter((s) => s !== spec));
                            }}
                            data-testid={`checkbox-edit-spec-${spec}`}
                          />
                          <Label htmlFor={`edit-spec-${spec}`} className="text-sm cursor-pointer">{spec}</Label>
                        </div>
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <div>
                <Label className="text-sm font-medium">Languages</Label>
                <FormField control={form.control} name="languages" render={({ field }) => (
                  <FormItem>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {LANGUAGES.map((lang) => (
                        <div key={lang} className="flex items-center space-x-2">
                          <Checkbox
                            id={`edit-lang-${lang}`}
                            checked={field.value?.includes(lang)}
                            onCheckedChange={(checked) => {
                              const current = field.value ?? [];
                              field.onChange(checked ? [...current, lang] : current.filter((l) => l !== lang));
                            }}
                            data-testid={`checkbox-edit-lang-${lang}`}
                          />
                          <Label htmlFor={`edit-lang-${lang}`} className="text-sm cursor-pointer">{lang}</Label>
                        </div>
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <div className="flex items-center gap-4 flex-wrap">
                <FormField control={form.control} name="acceptingClients" render={({ field }) => (
                  <FormItem className="flex items-center gap-2">
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-edit-acceptingClients" />
                    </FormControl>
                    <FormLabel className="!mt-0">Accepting Clients</FormLabel>
                  </FormItem>
                )} />
                <FormField control={form.control} name="isApproved" render={({ field }) => (
                  <FormItem className="flex items-center gap-2">
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-edit-isApproved" />
                    </FormControl>
                    <FormLabel className="!mt-0">Approved</FormLabel>
                  </FormItem>
                )} />
              </div>

              {therapist.rejectionReason && (
                <div className="rounded-md border border-destructive/50 p-3">
                  <p className="text-sm font-medium text-destructive">Rejection Reason</p>
                  <p className="text-sm text-muted-foreground mt-1" data-testid="text-rejection-reason">{therapist.rejectionReason}</p>
                </div>
              )}
            </form>
          </Form>
        </ScrollArea>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="button-edit-cancel">Cancel</Button>
          <Button type="submit" form="edit-therapist-form" disabled={isPending} data-testid="button-edit-save">
            {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

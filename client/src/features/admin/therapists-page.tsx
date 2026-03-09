import { useState, useRef, useMemo, useCallback } from "react";
import { ImageCropperSheet } from "@/components/shared/image-cropper-sheet";
import { PhoneInput } from "@/components/shared/phone-input";
import { phoneSchema } from "@/lib/phone-utils";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ProtectedRoute } from "@/components/shared/protected-route";
import { AdminSidebar } from "./admin-sidebar";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { LANGUAGES, ALL_LANGUAGES, PracticeMode } from "@shared/types";
import { useSpecializations } from "@/hooks/use-specializations";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetBody,
  SheetFooter,
} from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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
import { Plus, Search, Loader2, Trash2, CheckCircle, XCircle, Pencil, Camera, Calendar, LogIn, FileEdit, Clock, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

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
  isFeatured: boolean | null;
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
  phone: phoneSchema,
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
  phone: phoneSchema,
  website: z.string().optional(),
  acceptingClients: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
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
  const [addSheetOpen, setAddSheetOpen] = useState(false);
  const [editSheetOpen, setEditSheetOpen] = useState(false);
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
      setAddSheetOpen(false);
      toast({ title: "Counselor created successfully" });
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
      setEditSheetOpen(false);
      setSelectedTherapist(null);
      toast({ title: "Counselor updated successfully" });
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
      toast({ title: "Counselor approved" });
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
      toast({ title: "Counselor rejected" });
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
      toast({ title: "Counselor removed" });
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
          Counselors
        </h1>
        <Button onClick={() => setAddSheetOpen(true)} data-testid="button-add-therapist">
          <Plus className="w-4 h-4 mr-2" />
          Add Counselor
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
                  setEditSheetOpen(true);
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
                        setEditSheetOpen(true);
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

      <AddTherapistSheet
        open={addSheetOpen}
        onOpenChange={setAddSheetOpen}
        onSubmit={(data) => createMutation.mutate(data)}
        isPending={createMutation.isPending}
      />

      {selectedTherapist && (
        <EditTherapistSheet
          open={editSheetOpen}
          onOpenChange={(open) => {
            setEditSheetOpen(open);
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
            <AlertDialogTitle>Approve Counselor</AlertDialogTitle>
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

      <Sheet open={!!rejectTarget} onOpenChange={(open) => { if (!open) { setRejectTarget(null); setRejectReason(""); } }}>
        <SheetContent side="right" size="default" data-testid="dialog-reject">
          <SheetHeader>
            <SheetTitle>Reject Counselor</SheetTitle>
            <SheetDescription>
              Provide a reason for rejecting {rejectTarget?.user?.firstName} {rejectTarget?.user?.lastName}.
            </SheetDescription>
          </SheetHeader>
          <SheetBody>
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
          </SheetBody>
          <SheetFooter>
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
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent data-testid="dialog-delete-confirm">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Counselor</AlertDialogTitle>
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

function AddTherapistSheet({
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
  const { specializations: specList } = useSpecializations();
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
    <Sheet open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) form.reset(); }}>
      <SheetContent side="right" size="lg" data-testid="dialog-add-therapist">
        <SheetHeader>
          <SheetTitle>Add New Counselor</SheetTitle>
          <SheetDescription>Create a new counselor account and profile.</SheetDescription>
        </SheetHeader>
        <SheetBody>
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
                  <FormControl><Textarea placeholder="About the counselor..." className="min-h-[80px]" {...field} data-testid="input-add-bio" /></FormControl>
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
                    <FormControl><PhoneInput {...field} data-testid="input-add-phone" /></FormControl>
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
                      {specList.map(({ name: spec }) => (
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
        </SheetBody>
        <SheetFooter>
          <Button variant="outline" onClick={() => { onOpenChange(false); form.reset(); }} data-testid="button-add-cancel">Cancel</Button>
          <Button type="submit" form="add-therapist-form" disabled={isPending} data-testid="button-add-submit">
            {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Create Therapist
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

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
    year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function SearchableLanguageInput({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (langs: string[]) => void;
}) {
  const [search, setSearch] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    if (!search.trim()) return [];
    const q = search.toLowerCase();
    return ALL_LANGUAGES.filter(
      (lang) => lang.toLowerCase().includes(q) && !selected.includes(lang)
    ).slice(0, 8);
  }, [search, selected]);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5 min-h-[32px]">
        {selected.map((lang) => (
          <Badge
            key={lang}
            variant="secondary"
            className="gap-1 no-default-hover-elevate no-default-active-elevate"
            data-testid={`badge-lang-${lang}`}
          >
            {lang}
            <button
              type="button"
              onClick={() => onChange(selected.filter((l) => l !== lang))}
              className="ml-0.5 hover:text-destructive"
              data-testid={`button-remove-lang-${lang}`}
            >
              <X className="w-3 h-3" />
            </button>
          </Badge>
        ))}
      </div>
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <Input
          ref={inputRef}
          value={search}
          onChange={(e) => { setSearch(e.target.value); setDropdownOpen(true); }}
          onFocus={() => setDropdownOpen(true)}
          onBlur={() => setTimeout(() => setDropdownOpen(false), 200)}
          placeholder="Search languages..."
          className="pl-8 h-9"
          data-testid="input-search-languages"
        />
        {dropdownOpen && filtered.length > 0 && (
          <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-md max-h-48 overflow-y-auto">
            {filtered.map((lang) => (
              <button
                key={lang}
                type="button"
                className="w-full text-left px-3 py-1.5 text-sm hover:bg-accent cursor-pointer"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onChange([...selected, lang]);
                  setSearch("");
                  inputRef.current?.focus();
                }}
                data-testid={`option-lang-${lang}`}
              >
                {lang}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function OverviewTab({
  therapist,
  form,
  onSubmit,
  isPending,
  userForm,
  onUserSubmit,
  isUserPending,
  onAvatarUpload,
  isAvatarUploading,
}: {
  therapist: TherapistWithUser;
  form: ReturnType<typeof useForm<EditProfileValues>>;
  onSubmit: (data: EditProfileValues) => void;
  isPending: boolean;
  userForm: ReturnType<typeof useForm<UserEditValues>>;
  onUserSubmit: (data: UserEditValues) => void;
  isUserPending: boolean;
  onAvatarUpload: (file: File) => void;
  isAvatarUploading: boolean;
}) {
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const { specializations: specList } = useSpecializations();
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [cropFileName, setCropFileName] = useState("avatar.jpg");

  const handleAvatarFile = useCallback((file: File) => {
    if (!file.type.match(/^image\/(png|jpeg|webp|gif)$/)) return;
    setCropFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => setCropSrc(reader.result as string);
    reader.readAsDataURL(file);
  }, []);

  return (
    <>
    <ImageCropperSheet
      imageSrc={cropSrc}
      fileName={cropFileName}
      onConfirm={(file) => { setCropSrc(null); onAvatarUpload(file); }}
      onCancel={() => setCropSrc(null)}
    />
    <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
      <div className="space-y-6">
        <div className="flex flex-col items-center gap-3 p-4 rounded-lg border bg-muted/30">
          <div className="relative group">
            <Avatar className="h-24 w-24" data-testid="avatar-edit-profile">
              {therapist.user?.profileImageUrl && (
                <AvatarImage src={therapist.user.profileImageUrl} />
              )}
              <AvatarFallback className="text-xl">{getInitials(therapist)}</AvatarFallback>
            </Avatar>
            <button
              type="button"
              className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              onClick={() => avatarInputRef.current?.click()}
              disabled={isAvatarUploading}
              data-testid="button-change-avatar"
            >
              {isAvatarUploading ? (
                <Loader2 className="w-5 h-5 text-white animate-spin" />
              ) : (
                <Camera className="w-5 h-5 text-white" />
              )}
            </button>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleAvatarFile(file);
                e.target.value = "";
              }}
            />
          </div>
          <form onSubmit={userForm.handleSubmit(onUserSubmit)} className="w-full space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs text-muted-foreground">First Name</Label>
                <Input {...userForm.register("firstName")} className="h-8 text-sm" data-testid="input-edit-firstName" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Last Name</Label>
                <Input {...userForm.register("lastName")} className="h-8 text-sm" data-testid="input-edit-lastName" />
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Email</Label>
              <Input {...userForm.register("email")} type="email" className="h-8 text-sm" data-testid="input-edit-email" />
            </div>
            <Button
              type="submit"
              size="sm"
              variant="outline"
              className="w-full"
              disabled={isUserPending}
              data-testid="button-save-user"
            >
              {isUserPending && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
              Update Account
            </Button>
          </form>
        </div>

        <div className="p-4 rounded-lg border space-y-3">
          <Label className="text-sm font-medium">Status & Visibility</Label>
          <Form {...form}>
            <div className="space-y-3">
              <FormField control={form.control} name="acceptingClients" render={({ field }) => (
                <FormItem className="flex items-center justify-between">
                  <FormLabel className="!mt-0 text-sm">Accepting Clients</FormLabel>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-edit-acceptingClients" />
                  </FormControl>
                </FormItem>
              )} />
              <FormField control={form.control} name="isFeatured" render={({ field }) => (
                <FormItem className="flex items-center justify-between">
                  <FormLabel className="!mt-0 text-sm">Featured Counselor</FormLabel>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-edit-isFeatured" />
                  </FormControl>
                </FormItem>
              )} />
              <FormField control={form.control} name="isApproved" render={({ field }) => (
                <FormItem className="flex items-center justify-between">
                  <FormLabel className="!mt-0 text-sm">Approved</FormLabel>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-edit-isApproved" />
                  </FormControl>
                </FormItem>
              )} />
            </div>
          </Form>
          {therapist.rejectionReason && (
            <div className="rounded-md border border-destructive/50 p-2 mt-2">
              <p className="text-xs font-medium text-destructive">Rejection Reason</p>
              <p className="text-xs text-muted-foreground mt-0.5" data-testid="text-rejection-reason">{therapist.rejectionReason}</p>
            </div>
          )}
        </div>
      </div>

      <Form {...form}>
        <form id="edit-therapist-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
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
              <FormControl><Textarea className="min-h-[100px]" {...field} data-testid="input-edit-bio" /></FormControl>
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
                <FormControl><PhoneInput {...field} data-testid="input-edit-phone" /></FormControl>
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
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                  {specList.map(({ name: spec }) => (
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
            <Label className="text-sm font-medium mb-2 block">Languages</Label>
            <FormField control={form.control} name="languages" render={({ field }) => (
              <FormItem>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
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
                <Label className="text-xs text-muted-foreground mb-1 block">Additional Languages</Label>
                <SearchableLanguageInput
                  selected={(field.value ?? []).filter((l) => !LANGUAGES.includes(l as any))}
                  onChange={(extra) => {
                    const common = (field.value ?? []).filter((l) => LANGUAGES.includes(l as any));
                    field.onChange([...common, ...extra]);
                  }}
                />
                <FormMessage />
              </FormItem>
            )} />
          </div>
        </form>
      </Form>
    </div>
    </>
  );
}

function MembershipTab({ therapistId }: { therapistId: string }) {
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
        <p className="text-sm mt-1">This counselor does not have an active subscription.</p>
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
            <p className="text-lg font-semibold mt-1" data-testid="text-tier-name">{tier?.name ?? "Unknown"}</p>
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
            <p className="text-sm mt-1 font-mono text-muted-foreground truncate" data-testid="text-stripe-id">
              {subscription.stripeSubscriptionId ?? "N/A"}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ActivityTab({ therapistId }: { therapistId: string }) {
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
              <p className="text-sm font-semibold" data-testid={`text-stat-${s.label.toLowerCase().replace(/\s/g, "-")}`}>
                {s.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div>
        <h3 className="text-sm font-medium mb-3">Activity Log</h3>
        {logs.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4" data-testid="text-no-activity">No activity recorded yet.</p>
        ) : (
          <div className="border rounded-lg divide-y max-h-[400px] overflow-y-auto">
            {logs.map((log) => (
              <div key={log.id} className="flex items-start gap-3 px-4 py-3" data-testid={`row-activity-${log.id}`}>
                <Clock className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium">
                    {actionLabels[log.action] ?? log.action}
                  </p>
                  {log.details && (
                    <p className="text-xs text-muted-foreground">{log.details}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-0.5">{formatDate(log.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const userEditSchema = z.object({
  firstName: z.string().min(1, "First name required"),
  lastName: z.string().min(1, "Last name required"),
  email: z.string().email("Valid email required"),
});
type UserEditValues = z.infer<typeof userEditSchema>;

function EditTherapistSheet({
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
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");

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
      isFeatured: therapist.isFeatured ?? false,
      isApproved: therapist.isApproved ?? false,
    },
  });

  const userForm = useForm<UserEditValues>({
    resolver: zodResolver(userEditSchema),
    values: {
      firstName: therapist.user?.firstName ?? "",
      lastName: therapist.user?.lastName ?? "",
      email: therapist.user?.email ?? "",
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: async (data: UserEditValues) => {
      const res = await apiRequest("PUT", `/api/admin/users/${therapist.userId}`, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/therapists"] });
      toast({ title: "Account details updated" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const avatarMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("avatar", file);
      formData.append("userId", therapist.userId);
      const res = await fetch("/api/uploads/avatar", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Upload failed");
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/therapists"] });
      toast({ title: "Avatar updated" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const status = getStatusInfo(therapist);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" size="full" data-testid="dialog-edit-therapist">
        <SheetHeader>
          <div className="flex items-center gap-3 flex-wrap">
            <Avatar className="h-10 w-10">
              {therapist.user?.profileImageUrl && (
                <AvatarImage src={therapist.user.profileImageUrl} />
              )}
              <AvatarFallback>{getInitials(therapist)}</AvatarFallback>
            </Avatar>
            <div>
              <SheetTitle>
                {therapist.user?.firstName} {therapist.user?.lastName}
              </SheetTitle>
              <p className="text-sm text-muted-foreground">{therapist.user?.email}</p>
            </div>
            <Badge className={`${status.color} no-default-hover-elevate no-default-active-elevate ml-auto`} data-testid="badge-edit-status">
              {status.label}
            </Badge>
          </div>
          <SheetDescription className="sr-only">Edit counselor profile details</SheetDescription>
        </SheetHeader>
        <SheetBody>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList data-testid="tabs-edit-therapist">
              <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
              <TabsTrigger value="membership" data-testid="tab-membership">Membership</TabsTrigger>
              <TabsTrigger value="activity" data-testid="tab-activity">Activity</TabsTrigger>
            </TabsList>
            <TabsContent value="overview" className="mt-4">
              <OverviewTab
                therapist={therapist}
                form={form}
                onSubmit={onSubmit}
                isPending={isPending}
                userForm={userForm}
                onUserSubmit={(data) => updateUserMutation.mutate(data)}
                isUserPending={updateUserMutation.isPending}
                onAvatarUpload={(file) => avatarMutation.mutate(file)}
                isAvatarUploading={avatarMutation.isPending}
              />
            </TabsContent>
            <TabsContent value="membership" className="mt-4">
              <MembershipTab therapistId={therapist.id} />
            </TabsContent>
            <TabsContent value="activity" className="mt-4">
              <ActivityTab therapistId={therapist.id} />
            </TabsContent>
          </Tabs>
        </SheetBody>
        {activeTab === "overview" && (
          <SheetFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="button-edit-cancel">Cancel</Button>
            <Button type="submit" form="edit-therapist-form" disabled={isPending} data-testid="button-edit-save">
              {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}

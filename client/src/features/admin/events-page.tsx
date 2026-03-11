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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Plus, Pencil, Trash2, CalendarDays, MapPin, Users, Download, MoreHorizontal, CheckCircle, Clock, XCircle, Copy, BarChart3, Bell, Square, CheckSquare } from "lucide-react";
import { CmsImageUpload } from "@/features/admin/cms/components/cms-image-upload";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { Event, EventRegistration } from "@shared/schema";

const eventFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  date: z.string().min(1, "Date is required"),
  endDate: z.string().optional(),
  location: z.string().optional(),
  isVirtual: z.boolean().optional(),
  zoomLink: z.string().optional(),
  memberOnly: z.boolean().optional(),
  imageUrl: z.string().optional(),
  status: z.string().optional(),
  visibility: z.string().optional(),
  timezone: z.string().optional(),
  locationName: z.string().optional(),
  locationAddress: z.string().optional(),
  latitude: z.string().optional(),
  longitude: z.string().optional(),
  virtualJoinUrl: z.string().optional(),
  virtualDialInInfo: z.string().optional(),
  registrationEnabled: z.boolean().optional(),
  registrationType: z.string().optional(),
  registrationFee: z.coerce.number().optional(),
  registrationCurrency: z.string().optional(),
  registrationOpensAt: z.string().optional(),
  registrationClosesAt: z.string().optional(),
  capacity: z.coerce.number().optional(),
  waitlistEnabled: z.boolean().optional(),
  recordingUrl: z.string().optional(),
  speakerName: z.string().optional(),
  speakerBio: z.string().optional(),
  speakerImageUrl: z.string().optional(),
});

type EventFormValues = z.infer<typeof eventFormSchema>;

const defaultFormValues: EventFormValues = {
  title: "",
  description: "",
  date: "",
  endDate: "",
  location: "",
  isVirtual: false,
  zoomLink: "",
  memberOnly: false,
  imageUrl: "",
  status: "published",
  visibility: "public",
  timezone: "",
  locationName: "",
  locationAddress: "",
  latitude: "",
  longitude: "",
  virtualJoinUrl: "",
  virtualDialInInfo: "",
  registrationEnabled: false,
  registrationType: "free",
  registrationFee: undefined,
  registrationCurrency: "usd",
  registrationOpensAt: "",
  registrationClosesAt: "",
  capacity: undefined,
  waitlistEnabled: false,
  recordingUrl: "",
  speakerName: "",
  speakerBio: "",
  speakerImageUrl: "",
};

function statusVariant(status: string | null | undefined): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "draft": return "outline";
    case "canceled": return "destructive";
    case "completed": return "secondary";
    default: return "default";
  }
}

function visibilityLabel(v: string | null | undefined): string {
  switch (v) {
    case "members_only": return "Members Only";
    case "counselors_only": return "Counselors Only";
    case "admins_only": return "Admins Only";
    default: return "Public";
  }
}

export default function AdminEventsPage() {
  return (
    <ProtectedRoute roles={["admin"]}>
      <AdminSidebar>
        <EventsContent />
      </AdminSidebar>
    </ProtectedRoute>
  );
}

function registrationStatusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "confirmed": return "default";
    case "waitlisted": return "secondary";
    case "canceled": return "destructive";
    default: return "outline";
  }
}

function paymentStatusVariant(status: string | null | undefined): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "paid": return "default";
    case "pending": return "secondary";
    case "failed": return "destructive";
    case "refunded": return "outline";
    default: return "outline";
  }
}

function downloadCsv(registrations: EventRegistration[], eventTitle: string) {
  const headers = ["Name", "Email", "Phone", "Status", "Payment Status", "Amount Paid", "Registered At", "Canceled At", "Attended", "Checked In At", "Notes"];
  const escCsv = (v: string) => {
    if (v.includes(",") || v.includes('"') || v.includes("\n")) {
      return `"${v.replace(/"/g, '""')}"`;
    }
    return v;
  };
  const rows = registrations.map((r) => [
    escCsv(r.fullName),
    escCsv(r.email),
    escCsv(r.phone || ""),
    escCsv(r.status),
    escCsv(r.paymentStatus || ""),
    escCsv(r.amountPaid ? (r.amountPaid / 100).toFixed(2) : "0.00"),
    escCsv(r.registeredAt ? new Date(r.registeredAt).toISOString() : ""),
    escCsv(r.canceledAt ? new Date(r.canceledAt).toISOString() : ""),
    escCsv(r.attended ? "Yes" : "No"),
    escCsv(r.checkedInAt ? new Date(r.checkedInAt).toISOString() : ""),
    escCsv(r.notes || ""),
  ]);
  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `registrations-${eventTitle.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase()}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function EventAnalytics({ eventId, registrationEnabled }: { eventId: string; registrationEnabled: boolean }) {
  const { data: analytics, isLoading } = useQuery<{
    confirmed: number;
    waitlisted: number;
    canceled: number;
    attended: number;
    totalRevenueCents: number;
  }>({
    queryKey: ["/api/admin/events", eventId, "analytics"],
    enabled: registrationEnabled,
  });

  if (isLoading) return <LoadingSpinner />;
  if (!analytics) return null;

  return (
    <div className="space-y-3 p-2 min-w-[200px]">
      <h4 className="font-semibold text-sm border-b pb-2">Event Analytics</h4>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <span className="text-muted-foreground">Confirmed:</span>
        <span className="font-medium text-right">{analytics.confirmed}</span>
        <span className="text-muted-foreground">Waitlisted:</span>
        <span className="font-medium text-right">{analytics.waitlisted}</span>
        <span className="text-muted-foreground">Attended:</span>
        <span className="font-medium text-right">{analytics.attended}</span>
        {analytics.totalRevenueCents > 0 && (
          <>
            <span className="text-muted-foreground">Revenue:</span>
            <span className="font-medium text-right">${(analytics.totalRevenueCents / 100).toFixed(2)}</span>
          </>
        )}
      </div>
    </div>
  );
}

function CapacityBadge({ eventId, capacity }: { eventId: string; capacity: number }) {
  const { data: analytics } = useQuery<{ confirmed: number }>({
    queryKey: ["/api/admin/events", eventId, "analytics"],
  });

  return (
    <Badge variant="outline" className="ml-auto" data-testid={`badge-capacity-${eventId}`}>
      {analytics?.confirmed ?? 0} / {capacity} seats
    </Badge>
  );
}

function EventsContent() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [registrantsEvent, setRegistrantsEvent] = useState<Event | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Event | null>(null);

  const { data: events, isLoading } = useQuery<Event[]>({
    queryKey: ["/api/admin/events"],
  });

  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: defaultFormValues,
  });

  const watchRegistrationEnabled = form.watch("registrationEnabled");
  const watchRegistrationType = form.watch("registrationType");

  const { data: registrations, isLoading: registrantsLoading } = useQuery<EventRegistration[]>({
    queryKey: ["/api/admin/events", registrantsEvent?.id, "registrations"],
    enabled: !!registrantsEvent,
  });

  const duplicateMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("POST", `/api/admin/events/${id}/duplicate`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/events"] });
      toast({ title: "Event duplicated successfully" });
    },
    onError: (err: Error) => {
      toast({ title: "Error duplicating event", description: err.message, variant: "destructive" });
    },
  });

  const notifyMutation = useMutation({
    mutationFn: async ({ id, type }: { id: string; type: "reminder" | "recording" }) => {
      const res = await apiRequest("POST", `/api/admin/events/${id}/notify`, { type });
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: "Notifications sent", description: data.message });
    },
    onError: (err: Error) => {
      toast({ title: "Error sending notifications", description: err.message, variant: "destructive" });
    },
  });

  const checkInMutation = useMutation({
    mutationFn: async ({ id, attended }: { id: string; attended: boolean }) => {
      await apiRequest("PUT", `/api/admin/registrations/${id}/checkin`, { attended });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/events", registrantsEvent?.id, "registrations"] });
      toast({ title: "Attendance updated" });
    },
    onError: (err: Error) => {
      toast({ title: "Error updating attendance", description: err.message, variant: "destructive" });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      await apiRequest("PUT", `/api/admin/registrations/${id}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/events", registrantsEvent?.id, "registrations"] });
      toast({ title: "Registration status updated" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteRegistrationMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/admin/registrations/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/events", registrantsEvent?.id, "registrations"] });
      toast({ title: "Registration removed" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const confirmedCount = registrations?.filter((r) => r.status === "confirmed").length ?? 0;
  const waitlistedCount = registrations?.filter((r) => r.status === "waitlisted").length ?? 0;
  const canceledCount = registrations?.filter((r) => r.status === "canceled").length ?? 0;
  const attendedCount = registrations?.filter((r) => r.attended).length ?? 0;

  const createMutation = useMutation({
    mutationFn: async (data: EventFormValues) => {
      const payload = buildPayload(data);
      await apiRequest("POST", "/api/admin/events", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/events"] });
      toast({ title: "Event created" });
      setDialogOpen(false);
      form.reset(defaultFormValues);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create event", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: EventFormValues }) => {
      const payload = buildPayload(data);
      await apiRequest("PUT", `/api/admin/events/${id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/events"] });
      toast({ title: "Event saved" });
      setDialogOpen(false);
      setEditingEvent(null);
      form.reset(defaultFormValues);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to save event", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/admin/events/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/events"] });
      toast({ title: "Event deleted" });
    },
  });

  function buildPayload(data: EventFormValues) {
    return {
      ...data,
      date: new Date(data.date).toISOString(),
      endDate: data.endDate ? new Date(data.endDate).toISOString() : null,
      registrationOpensAt: data.registrationOpensAt ? new Date(data.registrationOpensAt).toISOString() : null,
      registrationClosesAt: data.registrationClosesAt ? new Date(data.registrationClosesAt).toISOString() : null,
      registrationFee: data.registrationFee || null,
      capacity: data.capacity || null,
    };
  }

  function openCreate() {
    setEditingEvent(null);
    form.reset(defaultFormValues);
    setDialogOpen(true);
  }

  function openEdit(event: Event) {
    setEditingEvent(event);
    form.reset({
      title: event.title,
      description: event.description ?? "",
      date: event.date ? new Date(event.date).toISOString().slice(0, 16) : "",
      endDate: event.endDate ? new Date(event.endDate).toISOString().slice(0, 16) : "",
      location: event.location ?? "",
      isVirtual: event.isVirtual ?? false,
      zoomLink: event.zoomLink ?? "",
      memberOnly: event.memberOnly ?? false,
      imageUrl: event.imageUrl ?? "",
      status: event.status ?? "published",
      visibility: event.visibility ?? "public",
      timezone: event.timezone ?? "",
      locationName: event.locationName ?? "",
      locationAddress: event.locationAddress ?? "",
      latitude: event.latitude ?? "",
      longitude: event.longitude ?? "",
      virtualJoinUrl: event.virtualJoinUrl ?? "",
      virtualDialInInfo: event.virtualDialInInfo ?? "",
      registrationEnabled: event.registrationEnabled ?? false,
      registrationType: event.registrationType ?? "free",
      registrationFee: event.registrationFee ?? undefined,
      registrationCurrency: event.registrationCurrency ?? "usd",
      registrationOpensAt: event.registrationOpensAt ? new Date(event.registrationOpensAt).toISOString().slice(0, 16) : "",
      registrationClosesAt: event.registrationClosesAt ? new Date(event.registrationClosesAt).toISOString().slice(0, 16) : "",
      capacity: event.capacity ?? undefined,
      waitlistEnabled: event.waitlistEnabled ?? false,
      recordingUrl: event.recordingUrl ?? "",
      speakerName: event.speakerName ?? "",
      speakerBio: event.speakerBio ?? "",
      speakerImageUrl: event.speakerImageUrl ?? "",
    });
    setDialogOpen(true);
  }

  function onSubmit(values: EventFormValues) {
    if (editingEvent) {
      updateMutation.mutate({ id: editingEvent.id, data: values });
    } else {
      createMutation.mutate(values);
    }
  }

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
        <h1 className="text-2xl font-heading font-semibold" data-testid="text-admin-events-title">
          Events
        </h1>
        <Button onClick={openCreate} data-testid="button-create-event">
          <Plus className="h-4 w-4 mr-2" />
          Create Event
        </Button>
      </div>

      <div className="space-y-4">
        {events?.map((event) => (
          <Card key={event.id} data-testid={`card-event-${event.id}`}>
            <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 pb-2">
              <div>
                <CardTitle className="text-lg flex items-center gap-2" data-testid={`text-event-title-${event.id}`}>
                  {event.title}
                  {event.registrationEnabled && event.capacity && (
                    <CapacityBadge eventId={event.id} capacity={event.capacity} />
                  )}
                </CardTitle>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className="flex items-center gap-1 text-sm text-muted-foreground">
                    <CalendarDays className="h-3 w-3" />
                    {event.date ? new Date(event.date).toLocaleDateString() : "—"}
                  </span>
                  {event.location && (
                    <span className="flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      {event.location}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                {event.registrationEnabled && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        size="icon"
                        variant="ghost"
                        data-testid={`button-analytics-${event.id}`}
                      >
                        <BarChart3 className="h-4 w-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align="end">
                      <EventAnalytics eventId={event.id} registrationEnabled={event.registrationEnabled} />
                    </PopoverContent>
                  </Popover>
                )}
                {new Date(event.date) > new Date() && (
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => notifyMutation.mutate({ id: event.id, type: "reminder" })}
                    disabled={notifyMutation.isPending}
                    data-testid={`button-notify-reminder-${event.id}`}
                    title="Send Reminder"
                  >
                    <Bell className="h-4 w-4" />
                  </Button>
                )}
                {event.recordingUrl && new Date(event.date) < new Date() && (
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => notifyMutation.mutate({ id: event.id, type: "recording" })}
                    disabled={notifyMutation.isPending}
                    data-testid={`button-notify-recording-${event.id}`}
                    title="Notify Recording"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => duplicateMutation.mutate(event.id)}
                  disabled={duplicateMutation.isPending}
                  data-testid={`button-duplicate-event-${event.id}`}
                  title="Duplicate Event"
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setRegistrantsEvent(event)}
                  data-testid={`button-registrants-${event.id}`}
                >
                  <Users className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => openEdit(event)}
                  data-testid={`button-edit-event-${event.id}`}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setDeleteTarget(event)}
                  disabled={deleteMutation.isPending}
                  data-testid={`button-delete-event-${event.id}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {event.description && (
                <p className="text-sm text-muted-foreground mb-2" data-testid={`text-event-desc-${event.id}`}>
                  {event.description}
                </p>
              )}
              <div className="flex gap-2 flex-wrap">
                <Badge variant={statusVariant(event.status)} data-testid={`badge-status-${event.id}`}>
                  {(event.status ?? "published").charAt(0).toUpperCase() + (event.status ?? "published").slice(1)}
                </Badge>
                <Badge variant="outline" data-testid={`badge-visibility-${event.id}`}>
                  {visibilityLabel(event.visibility)}
                </Badge>
                {event.isVirtual && (
                  <Badge variant="secondary" data-testid={`badge-virtual-${event.id}`}>
                    Virtual
                  </Badge>
                )}
                {event.memberOnly && (
                  <Badge variant="secondary" data-testid={`badge-member-only-${event.id}`}>
                    Members Only
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
        {(!events || events.length === 0) && (
          <p className="text-center text-muted-foreground py-8">No events found.</p>
        )}
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Event</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteTarget?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteTarget) {
                  deleteMutation.mutate(deleteTarget.id);
                  setDeleteTarget(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Sheet open={dialogOpen} onOpenChange={setDialogOpen}>
        <SheetContent side="right" size="md">
          <SheetHeader>
            <SheetTitle data-testid="text-event-dialog-title">
              {editingEvent ? "Edit Event" : "Create Event"}
            </SheetTitle>
            <SheetDescription className="sr-only">
              {editingEvent ? "Edit event details" : "Create a new event"}
            </SheetDescription>
          </SheetHeader>
          <SheetBody>
            <Form {...form}>
              <form id="event-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-3">Basic Info</h3>
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Title</FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-event-title" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea {...field} data-testid="input-event-description" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="imageUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Event Image</FormLabel>
                          <CmsImageUpload
                            value={field.value ?? ""}
                            onChange={field.onChange}
                            data-testid="input-event-image-url"
                          />
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Status</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || "published"}>
                            <FormControl>
                              <SelectTrigger data-testid="select-event-status">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="draft">Draft</SelectItem>
                              <SelectItem value="published">Published</SelectItem>
                              <SelectItem value="canceled">Canceled</SelectItem>
                              <SelectItem value="completed">Completed</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-3">Schedule</h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="date"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Start Date</FormLabel>
                            <FormControl>
                              <Input type="datetime-local" {...field} data-testid="input-event-date" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="endDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>End Date</FormLabel>
                            <FormControl>
                              <Input type="datetime-local" {...field} data-testid="input-event-end-date" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={form.control}
                      name="timezone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Timezone</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g. America/New_York" data-testid="input-event-timezone" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-3">Location & Attendance</h3>
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="isVirtual"
                      render={({ field }) => (
                        <FormItem className="flex items-center gap-2">
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="switch-event-virtual"
                            />
                          </FormControl>
                          <FormLabel className="!mt-0">Virtual Event</FormLabel>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="location"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Location</FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-event-location" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="locationName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Location Name</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g. Conference Center" data-testid="input-event-location-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="locationAddress"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Location Address</FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-event-location-address" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="latitude"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Latitude</FormLabel>
                            <FormControl>
                              <Input {...field} data-testid="input-event-latitude" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="longitude"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Longitude</FormLabel>
                            <FormControl>
                              <Input {...field} data-testid="input-event-longitude" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={form.control}
                      name="virtualJoinUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Virtual Join URL</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="https://..." data-testid="input-event-virtual-join-url" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="virtualDialInInfo"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Dial-In Info</FormLabel>
                          <FormControl>
                            <Textarea {...field} placeholder="Phone number, access code, etc." data-testid="input-event-dial-in-info" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-3">Registration</h3>
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="registrationEnabled"
                      render={({ field }) => (
                        <FormItem className="flex items-center gap-2">
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="switch-event-registration"
                            />
                          </FormControl>
                          <FormLabel className="!mt-0">Enable Registration</FormLabel>
                        </FormItem>
                      )}
                    />
                    {watchRegistrationEnabled && (
                      <>
                        <FormField
                          control={form.control}
                          name="registrationType"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Registration Type</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value || "free"}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-event-registration-type">
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="free">Free</SelectItem>
                                  <SelectItem value="paid">Paid</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        {watchRegistrationType === "paid" && (
                          <div className="grid grid-cols-2 gap-4">
                            <FormField
                              control={form.control}
                              name="registrationFee"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Fee (cents)</FormLabel>
                                  <FormControl>
                                    <Input type="number" {...field} value={field.value ?? ""} data-testid="input-event-registration-fee" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="registrationCurrency"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Currency</FormLabel>
                                  <FormControl>
                                    <Input {...field} placeholder="usd" data-testid="input-event-registration-currency" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        )}
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="registrationOpensAt"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Opens At</FormLabel>
                                <FormControl>
                                  <Input type="datetime-local" {...field} data-testid="input-event-reg-opens" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="registrationClosesAt"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Closes At</FormLabel>
                                <FormControl>
                                  <Input type="datetime-local" {...field} data-testid="input-event-reg-closes" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <FormField
                          control={form.control}
                          name="capacity"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Capacity</FormLabel>
                              <FormControl>
                                <Input type="number" {...field} value={field.value ?? ""} data-testid="input-event-capacity" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="waitlistEnabled"
                          render={({ field }) => (
                            <FormItem className="flex items-center gap-2">
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                  data-testid="switch-event-waitlist"
                                />
                              </FormControl>
                              <FormLabel className="!mt-0">Enable Waitlist</FormLabel>
                            </FormItem>
                          )}
                        />
                      </>
                    )}
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-3">Visibility</h3>
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="visibility"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Visibility</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || "public"}>
                            <FormControl>
                              <SelectTrigger data-testid="select-event-visibility">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="public">Public</SelectItem>
                              <SelectItem value="members_only">Members Only</SelectItem>
                              <SelectItem value="counselors_only">Counselors Only</SelectItem>
                              <SelectItem value="admins_only">Admins Only</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="memberOnly"
                      render={({ field }) => (
                        <FormItem className="flex items-center gap-2">
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="switch-event-member-only"
                            />
                          </FormControl>
                          <FormLabel className="!mt-0">Members Only (legacy)</FormLabel>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-3">Recording</h3>
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="recordingUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Recording URL</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="https://..." data-testid="input-event-recording-url" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-3">Speaker / Host</h3>
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="speakerName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Speaker Name</FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-event-speaker-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="speakerBio"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Speaker Bio</FormLabel>
                          <FormControl>
                            <Textarea {...field} data-testid="input-event-speaker-bio" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="speakerImageUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Speaker Image</FormLabel>
                          <CmsImageUpload
                            value={field.value ?? ""}
                            onChange={field.onChange}
                            data-testid="input-event-speaker-image-url"
                          />
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

              </form>
            </Form>
          </SheetBody>
          <SheetFooter>
            <Button
              type="submit"
              form="event-form"
              className="w-full"
              disabled={createMutation.isPending || updateMutation.isPending}
              data-testid="button-submit-event"
            >
              {createMutation.isPending || updateMutation.isPending
                ? "Saving..."
                : editingEvent
                  ? "Save Event"
                  : "Create Event"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Sheet open={!!registrantsEvent} onOpenChange={(open) => { if (!open) setRegistrantsEvent(null); }}>
        <SheetContent side="right" size="md">
          <SheetHeader>
            <SheetTitle data-testid="text-registrants-title">
              Registrants — {registrantsEvent?.title}
            </SheetTitle>
            <SheetDescription className="sr-only">
              View and manage registrants for this event
            </SheetDescription>
          </SheetHeader>
          <SheetBody>
            <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
              <div className="flex gap-2 flex-wrap text-xs md:text-sm">
                <Badge variant="default" data-testid="badge-confirmed-count" className="flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" />
                  {confirmedCount} Confirmed
                </Badge>
                <Badge variant="secondary" data-testid="badge-waitlisted-count" className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {waitlistedCount} Waitlisted
                </Badge>
                <Badge variant="outline" data-testid="badge-attended-count" className="flex items-center gap-1">
                  <CheckSquare className="h-3 w-3" />
                  {attendedCount} Attended
                </Badge>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (registrations && registrantsEvent) {
                    downloadCsv(registrations, registrantsEvent.title);
                  }
                }}
                disabled={!registrations || registrations.length === 0}
                data-testid="button-export-csv"
              >
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>

            {registrantsLoading ? (
              <div className="flex items-center justify-center p-8">
                <LoadingSpinner />
              </div>
            ) : !registrations || registrations.length === 0 ? (
              <p className="text-center text-muted-foreground py-8" data-testid="text-no-registrants">
                No registrants yet.
              </p>
            ) : (
              <div className="space-y-3">
                {registrations.map((reg) => (
                  <Card key={reg.id} data-testid={`card-registrant-${reg.id}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              onClick={() => checkInMutation.mutate({ id: reg.id, attended: !reg.attended })}
                              disabled={checkInMutation.isPending}
                              data-testid={`button-checkin-${reg.id}`}
                              title={reg.attended ? "Remove check-in" : "Check-in"}
                            >
                              {reg.attended ? (
                                <CheckSquare className="h-4 w-4 text-primary" />
                              ) : (
                                <Square className="h-4 w-4 text-muted-foreground" />
                              )}
                            </Button>
                            <div>
                              <p className="font-medium truncate" data-testid={`text-registrant-name-${reg.id}`}>
                                {reg.fullName}
                              </p>
                              <p className="text-sm text-muted-foreground truncate" data-testid={`text-registrant-email-${reg.id}`}>
                                {reg.email}
                              </p>
                            </div>
                          </div>
                          {reg.phone && (
                            <p className="text-sm text-muted-foreground ml-10" data-testid={`text-registrant-phone-${reg.id}`}>
                              {reg.phone}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-2 flex-wrap ml-10">
                            <Badge
                              variant={registrationStatusVariant(reg.status)}
                              data-testid={`badge-registrant-status-${reg.id}`}
                            >
                              {reg.status.charAt(0).toUpperCase() + reg.status.slice(1)}
                            </Badge>
                            {registrantsEvent?.registrationType === "paid" && (
                              <>
                                <Badge
                                  variant={paymentStatusVariant(reg.paymentStatus)}
                                  data-testid={`badge-payment-status-${reg.id}`}
                                >
                                  {reg.paymentStatus ? reg.paymentStatus.replace("_", " ").charAt(0).toUpperCase() + reg.paymentStatus.replace("_", " ").slice(1) : "Not required"}
                                </Badge>
                                {reg.amountPaid ? (
                                  <span className="text-xs font-medium" data-testid={`text-amount-paid-${reg.id}`}>
                                    ${(reg.amountPaid / 100).toFixed(2)}
                                  </span>
                                ) : (
                                  <span className="text-xs text-muted-foreground" data-testid={`text-amount-paid-${reg.id}`}>
                                    —
                                  </span>
                                )}
                              </>
                            )}
                            <span className="text-xs text-muted-foreground" data-testid={`text-registrant-date-${reg.id}`}>
                              {reg.registeredAt
                                ? new Date(reg.registeredAt).toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                  })
                                : "—"}
                            </span>
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              size="icon"
                              variant="ghost"
                              data-testid={`button-registrant-actions-${reg.id}`}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {reg.status !== "confirmed" && (
                              <DropdownMenuItem
                                onClick={() => updateStatusMutation.mutate({ id: reg.id, status: "confirmed" })}
                                data-testid={`action-confirm-${reg.id}`}
                              >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Confirm
                              </DropdownMenuItem>
                            )}
                            {reg.status !== "waitlisted" && (
                              <DropdownMenuItem
                                onClick={() => updateStatusMutation.mutate({ id: reg.id, status: "waitlisted" })}
                                data-testid={`action-waitlist-${reg.id}`}
                              >
                                <Clock className="h-4 w-4 mr-2" />
                                Waitlist
                              </DropdownMenuItem>
                            )}
                            {reg.status !== "canceled" && (
                              <DropdownMenuItem
                                onClick={() => updateStatusMutation.mutate({ id: reg.id, status: "canceled" })}
                                data-testid={`action-cancel-${reg.id}`}
                              >
                                <XCircle className="h-4 w-4 mr-2" />
                                Cancel
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              onClick={() => deleteRegistrationMutation.mutate(reg.id)}
                              className="text-destructive"
                              data-testid={`action-remove-${reg.id}`}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Remove
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </SheetBody>
        </SheetContent>
      </Sheet>
    </div>
  );
}

import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ProtectedRoute } from "@/components/shared/protected-route";
import { AdminSidebar } from "./admin-sidebar";
import { EditorLockBanner } from "@/components/shared/editor-lock-banner";
import { EditorSaveIndicator } from "@/components/shared/editor-save-indicator";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { apiRequest, queryClient, STALE_TIMES } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
  Plus,
  Pencil,
  Trash2,
  CalendarDays,
  MapPin,
  Users,
  Download,
  MoreHorizontal,
  CheckCircle,
  Clock,
  XCircle,
  Copy,
  BarChart3,
  Bell,
  Square,
  CheckSquare,
  Video,
  Repeat,
  DollarSign,
  Globe,
} from "lucide-react";
import { CmsImageUpload } from "@/features/admin/cms/components/cms-image-upload";
import { CmsRichTextEditor } from "@/features/admin/cms/builder/cms-rich-text-editor";
import { ImagePositionPicker } from "@/features/admin/cms/components/image-position-picker";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { StructuredDataStatus } from "@/components/shared/structured-data-status";
import { getImageObjectPositionStyle } from "@/lib/image-focus";
import { stripHtml } from "@/lib/html";
import {
  formatEventDate,
  fromDateTimeLocalValue,
  getDefaultEventTimeZone,
  toDateTimeLocalValue,
} from "@/lib/event-datetime";
import type { Event, EventRegistration } from "@shared/schema";
import { useEditorLock } from "@/hooks/use-editor-lock";
import { useLockConflictGuard } from "@/hooks/use-lock-conflict-guard";
import { useEditorSaveState } from "@/hooks/use-editor-save-state";
import { useUnsavedChangesGuard } from "@/hooks/use-unsaved-changes-guard";

const eventFormSchema = z
  .object({
    title: z.string().min(1, "Title is required"),
    slug: z.string().optional(),
    description: z.string().optional(),
    date: z.string().min(1, "Date is required"),
    endDate: z.string().optional(),
    location: z.string().optional(),
    isVirtual: z.boolean().optional(),
    zoomLink: z.string().optional(),
    memberOnly: z.boolean().optional(),
    imageUrl: z.string().optional(),
    imagePositionX: z.number().default(50),
    imagePositionY: z.number().default(50),
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
    showInArchives: z.boolean().optional(),
    recordingAccess: z.string().optional(),
    recordingPrice: z.coerce.number().optional(),
    speakerName: z.string().optional(),
    speakerBio: z.string().optional(),
    speakerImageUrl: z.string().optional(),
    isRecurring: z.boolean().optional(),
    recurrencePattern: z.string().optional(),
    recurrenceInterval: z.coerce.number().optional(),
    recurrenceDaysOfWeek: z.string().optional(),
    recurrenceEndDate: z.string().optional(),
    recurrenceCount: z.coerce.number().optional(),
  })
  .superRefine((values, ctx) => {
    if (values.date && values.endDate && values.endDate < values.date) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endDate"],
        message: "End date must be after the start date.",
      });
    }

    if (
      values.registrationOpensAt &&
      values.registrationClosesAt &&
      values.registrationClosesAt < values.registrationOpensAt
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["registrationClosesAt"],
        message: "Registration close date must be after the open date.",
      });
    }

    if (values.date && values.recurrenceEndDate && values.recurrenceEndDate < values.date) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["recurrenceEndDate"],
        message: "Recurrence end date must be after the event start date.",
      });
    }
  });

type EventFormValues = z.infer<typeof eventFormSchema>;

const defaultFormValues: EventFormValues = {
  title: "",
  slug: "",
  description: "",
  date: "",
  endDate: "",
  location: "",
  isVirtual: false,
  zoomLink: "",
  memberOnly: false,
  imageUrl: "",
  imagePositionX: 50,
  imagePositionY: 50,
  status: "published",
  visibility: "public",
  timezone: getDefaultEventTimeZone(),
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
  showInArchives: false,
  recordingAccess: "free",
  recordingPrice: undefined,
  speakerName: "",
  speakerBio: "",
  speakerImageUrl: "",
  isRecurring: false,
  recurrencePattern: "",
  recurrenceInterval: 1,
  recurrenceDaysOfWeek: "",
  recurrenceEndDate: "",
  recurrenceCount: undefined,
};

function statusVariant(
  status: string | null | undefined,
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "published":
      return "default";
    case "draft":
      return "outline";
    case "canceled":
      return "destructive";
    case "completed":
      return "secondary";
    default:
      return "default";
  }
}

function visibilityLabel(v: string | null | undefined): string {
  switch (v) {
    case "members_only":
      return "Members Only";
    case "counselors_only":
      return "Mental Health Professionals Only";
    case "admins_only":
      return "Admins Only";
    default:
      return "Public";
  }
}

function slugifyEventTitle(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

export default function AdminEventsPage() {
  return (
    <ProtectedRoute roles={["admin", "editor"]} adminPermissions={["content"]}>
      <AdminSidebar>
        <EventsContent />
      </AdminSidebar>
    </ProtectedRoute>
  );
}

function registrationStatusVariant(
  status: string,
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "confirmed":
      return "default";
    case "waitlisted":
      return "secondary";
    case "canceled":
      return "destructive";
    default:
      return "outline";
  }
}

function paymentStatusVariant(
  status: string | null | undefined,
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "paid":
      return "default";
    case "pending":
      return "secondary";
    case "failed":
      return "destructive";
    case "refunded":
      return "outline";
    default:
      return "outline";
  }
}

function downloadCsv(registrations: EventRegistration[], eventTitle: string) {
  const headers = [
    "Name",
    "Email",
    "Phone",
    "Status",
    "Payment Status",
    "Amount Paid",
    "Registered At",
    "Canceled At",
    "Attended",
    "Checked In At",
    "Notes",
  ];
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

function EventAnalytics({
  eventId,
  registrationEnabled,
}: {
  eventId: string;
  registrationEnabled: boolean;
}) {
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
            <span className="font-medium text-right">
              ${(analytics.totalRevenueCents / 100).toFixed(2)}
            </span>
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

const DAYS_OF_WEEK = [
  { value: "MO", label: "Mon" },
  { value: "TU", label: "Tue" },
  { value: "WE", label: "Wed" },
  { value: "TH", label: "Thu" },
  { value: "FR", label: "Fri" },
  { value: "SA", label: "Sat" },
  { value: "SU", label: "Sun" },
];

function EventsContent() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Event | null>(null);
  const [activeTab, setActiveTab] = useState("details");
  const saveFeedbackRef = useRef({
    markSaved: () => {},
    markError: () => {},
    clearFeedback: () => {},
  });
  const editorLock = useEditorLock({
    resourceType: "event",
    resourceId: dialogOpen && editingEvent?.id ? editingEvent.id : null,
    enabled: dialogOpen && Boolean(editingEvent?.id),
  });

  const { data: events, isLoading } = useQuery<Event[]>({
    queryKey: ["/api/admin/events"],
    staleTime: STALE_TIMES.OPERATIONAL,
    refetchOnWindowFocus: true,
  });

  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: defaultFormValues,
  });

  const watchRegistrationEnabled = form.watch("registrationEnabled");
  const watchRegistrationType = form.watch("registrationType");
  const watchEventTitle = form.watch("title");
  const watchEventSlug = form.watch("slug");
  const watchEventDescription = form.watch("description");
  const watchEventImageUrl = form.watch("imageUrl");
  const watchEventImagePositionX = form.watch("imagePositionX");
  const watchEventImagePositionY = form.watch("imagePositionY");
  const watchEventDate = form.watch("date");
  const watchEventLocation = form.watch("location");
  const watchEventRecordingUrl = form.watch("recordingUrl");
  const watchShowInArchives = form.watch("showInArchives");
  const watchRecordingAccess = form.watch("recordingAccess");
  const watchIsRecurring = form.watch("isRecurring");
  const watchRecurrencePattern = form.watch("recurrencePattern");

  useEffect(() => {
    if (editingEvent) return;
    const slugState = form.getFieldState("slug");
    if (slugState.isDirty) return;
    form.setValue("slug", slugifyEventTitle(watchEventTitle || ""), { shouldDirty: false });
  }, [editingEvent, form, watchEventTitle]);

  useLockConflictGuard({
    active: dialogOpen && Boolean(editingEvent?.id),
    resourceId: dialogOpen && editingEvent?.id ? editingEvent.id : null,
    resourceLabel: "event",
    editorLock,
    onConflict: () => {
      setDialogOpen(false);
      setEditingEvent(null);
      form.reset(defaultFormValues);
    },
  });

  const { data: registrations, isLoading: registrantsLoading } = useQuery<EventRegistration[]>({
    queryKey: ["/api/admin/events", editingEvent?.id, "registrations"],
    enabled: !!editingEvent,
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
      toast({
        title: "Error sending notifications",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const checkInMutation = useMutation({
    mutationFn: async ({ id, attended }: { id: string; attended: boolean }) => {
      await apiRequest("PUT", `/api/admin/registrations/${id}/checkin`, { attended });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/admin/events", editingEvent?.id, "registrations"],
      });
      toast({ title: "Attendance updated" });
    },
    onError: (err: Error) => {
      toast({
        title: "Error updating attendance",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      await apiRequest("PUT", `/api/admin/registrations/${id}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/admin/events", editingEvent?.id, "registrations"],
      });
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
      queryClient.invalidateQueries({
        queryKey: ["/api/admin/events", editingEvent?.id, "registrations"],
      });
      toast({ title: "Registration removed" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const confirmedCount = registrations?.filter((r) => r.status === "confirmed").length ?? 0;
  const waitlistedCount = registrations?.filter((r) => r.status === "waitlisted").length ?? 0;
  const attendedCount = registrations?.filter((r) => r.attended).length ?? 0;

  const createMutation = useMutation({
    mutationFn: async (data: EventFormValues) => {
      const payload = buildPayload(data);
      await apiRequest("POST", "/api/admin/events", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/events"] });
      toast({ title: "Event created" });
      saveFeedbackRef.current.markSaved();
      setDialogOpen(false);
      form.reset(defaultFormValues);
    },
    onError: (error: Error) => {
      applySaveErrorToForm(error);
      saveFeedbackRef.current.markError();
      toast({
        title: "Failed to create event",
        description: error.message,
        variant: "destructive",
      });
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
      saveFeedbackRef.current.markSaved();
      setDialogOpen(false);
      setEditingEvent(null);
      form.reset(defaultFormValues);
    },
    onError: (error: Error) => {
      applySaveErrorToForm(error);
      saveFeedbackRef.current.markError();
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
      slug: data.slug?.trim() ?? "",
      timezone: data.timezone?.trim() || "",
      date: fromDateTimeLocalValue(data.date, data.timezone),
      endDate: fromDateTimeLocalValue(data.endDate, data.timezone),
      registrationOpensAt: fromDateTimeLocalValue(data.registrationOpensAt, data.timezone),
      registrationClosesAt: fromDateTimeLocalValue(data.registrationClosesAt, data.timezone),
      registrationFee: data.registrationFee || null,
      capacity: data.capacity || null,
      recurrenceEndDate: fromDateTimeLocalValue(data.recurrenceEndDate, data.timezone),
      recurrenceCount: data.recurrenceCount || null,
      recurrenceInterval: data.recurrenceInterval || null,
    };
  }

  function applySaveErrorToForm(error: Error) {
    const message = error.message || "Save failed";
    if (/end date must not precede start date/i.test(message)) {
      form.setError("endDate", { type: "server", message });
      setActiveTab("details");
      return;
    }
    if (/registration close date must not precede registration open date/i.test(message)) {
      form.setError("registrationClosesAt", { type: "server", message });
      setActiveTab("registration");
      return;
    }
    if (/recurrence end date must not precede/i.test(message)) {
      form.setError("recurrenceEndDate", { type: "server", message });
      setActiveTab("recurrence");
    }
  }

  function openCreate() {
    setEditingEvent(null);
    form.reset({
      ...defaultFormValues,
      timezone: getDefaultEventTimeZone(),
    });
    saveFeedbackRef.current.clearFeedback();
    setActiveTab("details");
    setDialogOpen(true);
  }

  function openEdit(event: Event) {
    setEditingEvent(event);
    const eventTimeZone = event.timezone ?? "";
    form.reset({
      title: event.title,
      slug: event.slug ?? "",
      description: event.description ?? "",
      date: toDateTimeLocalValue(event.date, eventTimeZone),
      endDate: toDateTimeLocalValue(event.endDate, eventTimeZone),
      location: event.location ?? "",
      isVirtual: event.isVirtual ?? false,
      zoomLink: event.zoomLink ?? "",
      memberOnly: event.memberOnly ?? false,
      imageUrl: event.imageUrl ?? "",
      imagePositionX: event.imagePositionX ?? 50,
      imagePositionY: event.imagePositionY ?? 50,
      status: event.status ?? "published",
      visibility: event.visibility ?? "public",
      timezone: eventTimeZone,
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
      registrationOpensAt: toDateTimeLocalValue(event.registrationOpensAt, eventTimeZone),
      registrationClosesAt: toDateTimeLocalValue(event.registrationClosesAt, eventTimeZone),
      capacity: event.capacity ?? undefined,
      waitlistEnabled: event.waitlistEnabled ?? false,
      recordingUrl: event.recordingUrl ?? "",
      showInArchives: event.showInArchives ?? false,
      recordingAccess: event.recordingAccess ?? "free",
      recordingPrice: event.recordingPrice ?? undefined,
      speakerName: event.speakerName ?? "",
      speakerBio: event.speakerBio ?? "",
      speakerImageUrl: event.speakerImageUrl ?? "",
      isRecurring: event.isRecurring ?? false,
      recurrencePattern: event.recurrencePattern ?? "",
      recurrenceInterval: event.recurrenceInterval ?? 1,
      recurrenceDaysOfWeek: event.recurrenceDaysOfWeek ?? "",
      recurrenceEndDate: toDateTimeLocalValue(event.recurrenceEndDate, eventTimeZone),
      recurrenceCount: event.recurrenceCount ?? undefined,
    });
    saveFeedbackRef.current.clearFeedback();
    setActiveTab("details");
    setDialogOpen(true);
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;
  const isDirty = dialogOpen && form.formState.isDirty;
  const saveState = useEditorSaveState({
    isDirty,
    isSaving,
  });
  const unsavedChangesGuard = useUnsavedChangesGuard({
    isDirty,
    message: "You have unsaved changes to this event. Close without saving?",
  });
  saveFeedbackRef.current = saveState;

  const handleDialogOpenChange = (open: boolean) => {
    if (open) {
      setDialogOpen(true);
      return;
    }

    unsavedChangesGuard.confirmDiscardChanges(() => setDialogOpen(false));
  };

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
          <Card
            key={event.id}
            data-testid={`card-event-${event.id}`}
            className="cursor-pointer hover:border-primary/40 transition-colors overflow-hidden"
            onClick={() => openEdit(event)}
          >
            <div className={event.imageUrl ? "flex flex-col sm:flex-row" : ""}>
              {event.imageUrl && (
                <div
                  className="sm:w-32 sm:min-w-[8rem] shrink-0"
                  data-testid={`img-event-thumbnail-${event.id}`}
                >
                  <img
                    src={event.imageUrl}
                    alt={event.title}
                    className="h-32 sm:h-full w-full object-cover"
                    style={getImageObjectPositionStyle(event.imagePositionX, event.imagePositionY)}
                  />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 pb-2">
                  <div>
                    <CardTitle
                      className="text-lg flex items-center gap-2"
                      data-testid={`text-event-title-${event.id}`}
                    >
                      {event.title}
                      {event.registrationEnabled && event.capacity && (
                        <CapacityBadge eventId={event.id} capacity={event.capacity} />
                      )}
                    </CardTitle>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="flex items-center gap-1 text-sm text-muted-foreground">
                        <CalendarDays className="h-3 w-3" />
                        {event.date
                          ? formatEventDate(event.date, event.timezone, {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })
                          : "—"}
                      </span>
                      {event.location && (
                        <span className="flex items-center gap-1 text-sm text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          {event.location}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
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
                          <EventAnalytics
                            eventId={event.id}
                            registrationEnabled={event.registrationEnabled}
                          />
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
                    <p
                      className="text-sm text-muted-foreground mb-2 line-clamp-2"
                      data-testid={`text-event-desc-${event.id}`}
                    >
                      {stripHtml(event.description)}
                    </p>
                  )}
                  <div className="flex gap-2 flex-wrap">
                    <Badge
                      variant={statusVariant(event.status)}
                      data-testid={`badge-status-${event.id}`}
                    >
                      {(event.status ?? "published").charAt(0).toUpperCase() +
                        (event.status ?? "published").slice(1)}
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
                    {event.isRecurring && (
                      <Badge variant="secondary" data-testid={`badge-recurring-${event.id}`}>
                        <Repeat className="h-3 w-3 mr-1" />
                        Recurring
                      </Badge>
                    )}
                    {event.showInArchives && (
                      <Badge variant="secondary" data-testid={`badge-archived-${event.id}`}>
                        <Video className="h-3 w-3 mr-1" />
                        In Archives
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </div>
            </div>
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

      <Sheet open={dialogOpen} onOpenChange={handleDialogOpenChange}>
        <SheetContent side="right" size="full">
          <SheetHeader>
            <SheetTitle data-testid="text-event-dialog-title">
              {editingEvent ? "Edit Event" : "Create Event"}
            </SheetTitle>
            <SheetDescription className="sr-only">
              {editingEvent ? "Edit event details" : "Create a new event"}
            </SheetDescription>
          </SheetHeader>
          <SheetBody>
            {editorLock.summary ? (
              <div className="mb-4">
                <EditorLockBanner
                  variant={editorLock.summary.variant}
                  title={editorLock.summary.title}
                  description={editorLock.summary.description}
                  isLoading={editorLock.isLoading}
                  onRefresh={editorLock.acquire}
                />
              </div>
            ) : null}
            <div
              className={cn(
                editorLock.hasLocking &&
                  editorLock.isReadOnly &&
                  "pointer-events-none select-none opacity-70",
              )}
            >
              <Form {...form}>
                <form id="event-form" onSubmit={form.handleSubmit(onSubmit)}>
                  <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList
                      className="w-full grid grid-cols-4 mb-6"
                      data-testid="tabs-event-editor"
                    >
                      <TabsTrigger
                        value="details"
                        className="text-xs sm:text-sm"
                        data-testid="tab-details"
                      >
                        <CalendarDays className="h-3.5 w-3.5 mr-1.5 hidden sm:inline-block" />
                        Details
                      </TabsTrigger>
                      <TabsTrigger
                        value="registrations"
                        className="text-xs sm:text-sm"
                        data-testid="tab-registrations"
                      >
                        <Users className="h-3.5 w-3.5 mr-1.5 hidden sm:inline-block" />
                        Registrants
                      </TabsTrigger>
                      <TabsTrigger
                        value="video-archive"
                        className="text-xs sm:text-sm"
                        data-testid="tab-video-archive"
                      >
                        <Video className="h-3.5 w-3.5 mr-1.5 hidden sm:inline-block" />
                        Video Archive
                      </TabsTrigger>
                      <TabsTrigger
                        value="recurring"
                        className="text-xs sm:text-sm"
                        data-testid="tab-recurring"
                      >
                        <Repeat className="h-3.5 w-3.5 mr-1.5 hidden sm:inline-block" />
                        Recurring
                      </TabsTrigger>
                    </TabsList>

                    {/* ===== DETAILS TAB ===== */}
                    <TabsContent value="details" className="space-y-6">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Left column */}
                        <div className="space-y-6">
                          <Card>
                            <CardHeader className="pb-3">
                              <CardTitle className="text-base">Basic Info</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
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
                                name="slug"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>URL Slug</FormLabel>
                                    <FormControl>
                                      <Input
                                        {...field}
                                        value={field.value ?? ""}
                                        onChange={(event) =>
                                          field.onChange(slugifyEventTitle(event.target.value))
                                        }
                                        placeholder={slugifyEventTitle(
                                          watchEventTitle || "event-name",
                                        )}
                                        data-testid="input-event-slug"
                                      />
                                    </FormControl>
                                    <p className="text-xs text-muted-foreground">
                                      Public URL: /events/
                                      {watchEventSlug ||
                                        slugifyEventTitle(watchEventTitle || "event-name")}
                                    </p>
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
                                      <CmsRichTextEditor
                                        value={field.value ?? ""}
                                        onChange={field.onChange}
                                        placeholder="Add the event overview, key details, and any helpful registration notes..."
                                        data-testid="input-event-description"
                                      />
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
                              {watchEventImageUrl && (
                                <ImagePositionPicker
                                  imageUrl={watchEventImageUrl}
                                  positionX={watchEventImagePositionX ?? 50}
                                  positionY={watchEventImagePositionY ?? 50}
                                  onPositionChange={(x, y) => {
                                    form.setValue("imagePositionX", x, { shouldDirty: true });
                                    form.setValue("imagePositionY", y, { shouldDirty: true });
                                  }}
                                />
                              )}
                              <div className="grid grid-cols-2 gap-4">
                                <FormField
                                  control={form.control}
                                  name="status"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Status</FormLabel>
                                      <Select
                                        onValueChange={field.onChange}
                                        value={field.value || "published"}
                                      >
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
                                <FormField
                                  control={form.control}
                                  name="visibility"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Visibility</FormLabel>
                                      <Select
                                        onValueChange={field.onChange}
                                        value={field.value || "public"}
                                      >
                                        <FormControl>
                                          <SelectTrigger data-testid="select-event-visibility">
                                            <SelectValue />
                                          </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                          <SelectItem value="public">Public</SelectItem>
                                          <SelectItem value="members_only">Members Only</SelectItem>
                                          <SelectItem value="counselors_only">
                                            Mental Health Professionals Only
                                          </SelectItem>
                                          <SelectItem value="admins_only">Admins Only</SelectItem>
                                        </SelectContent>
                                      </Select>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </div>
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
                            </CardContent>
                          </Card>

                          <Card>
                            <CardHeader className="pb-3">
                              <CardTitle className="text-base">Schedule</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <FormField
                                  control={form.control}
                                  name="date"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Start Date</FormLabel>
                                      <FormControl>
                                        <Input
                                          type="datetime-local"
                                          {...field}
                                          data-testid="input-event-date"
                                        />
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
                                        <Input
                                          type="datetime-local"
                                          {...field}
                                          data-testid="input-event-end-date"
                                        />
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
                                      <Input
                                        {...field}
                                        placeholder="e.g. America/New_York"
                                        data-testid="input-event-timezone"
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </CardContent>
                          </Card>

                          <Card>
                            <CardHeader className="pb-3">
                              <CardTitle className="text-base">Structured Data (JSON-LD)</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <StructuredDataStatus
                                contentType="event"
                                fields={{
                                  hasTitle: !!watchEventTitle,
                                  hasDescription: !!watchEventDescription,
                                  hasDate: !!watchEventDate,
                                  hasLocation: !!watchEventLocation,
                                  hasRecordingUrl: !!watchEventRecordingUrl,
                                }}
                                data-testid="structured-data-status-event"
                              />
                            </CardContent>
                          </Card>
                        </div>

                        {/* Right column */}
                        <div className="space-y-6">
                          <Card>
                            <CardHeader className="pb-3">
                              <CardTitle className="text-base">Location & Attendance</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
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
                                      <Input
                                        {...field}
                                        placeholder="e.g. Conference Center"
                                        data-testid="input-event-location-name"
                                      />
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
                                      <Input
                                        {...field}
                                        data-testid="input-event-location-address"
                                      />
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
                                name="zoomLink"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Zoom / Meeting Link</FormLabel>
                                    <FormControl>
                                      <Input
                                        {...field}
                                        placeholder="https://zoom.us/j/..."
                                        autoPrependHttps
                                        data-testid="input-event-zoom-link"
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name="virtualJoinUrl"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Virtual Join URL</FormLabel>
                                    <FormControl>
                                      <Input
                                        {...field}
                                        placeholder="https://..."
                                        autoPrependHttps
                                        data-testid="input-event-virtual-join-url"
                                      />
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
                                      <Textarea
                                        {...field}
                                        placeholder="Phone number, access code, etc."
                                        data-testid="input-event-dial-in-info"
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </CardContent>
                          </Card>

                          <Card>
                            <CardHeader className="pb-3">
                              <CardTitle className="text-base">Speaker / Host</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
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
                            </CardContent>
                          </Card>
                        </div>
                      </div>
                    </TabsContent>

                    {/* ===== REGISTRANTS TAB ===== */}
                    <TabsContent value="registrations" className="space-y-6">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Card>
                          <CardHeader className="pb-3">
                            <CardTitle className="text-base">Registration Settings</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <FormField
                              control={form.control}
                              name="registrationEnabled"
                              render={({ field }) => (
                                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                                  <div className="space-y-0.5">
                                    <FormLabel className="text-sm font-medium">
                                      Enable Registration
                                    </FormLabel>
                                    <p className="text-xs text-muted-foreground">
                                      Allow users to register for this event
                                    </p>
                                  </div>
                                  <FormControl>
                                    <Switch
                                      checked={field.value}
                                      onCheckedChange={field.onChange}
                                      data-testid="switch-event-registration"
                                    />
                                  </FormControl>
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
                                      <Select
                                        onValueChange={field.onChange}
                                        value={field.value || "free"}
                                      >
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
                                            <Input
                                              type="number"
                                              {...field}
                                              value={field.value ?? ""}
                                              data-testid="input-event-registration-fee"
                                            />
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
                                            <Input
                                              {...field}
                                              placeholder="usd"
                                              data-testid="input-event-registration-currency"
                                            />
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
                                          <Input
                                            type="datetime-local"
                                            {...field}
                                            data-testid="input-event-reg-opens"
                                          />
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
                                          <Input
                                            type="datetime-local"
                                            {...field}
                                            data-testid="input-event-reg-closes"
                                          />
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
                                        <Input
                                          type="number"
                                          {...field}
                                          value={field.value ?? ""}
                                          data-testid="input-event-capacity"
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={form.control}
                                  name="waitlistEnabled"
                                  render={({ field }) => (
                                    <FormItem className="flex items-center justify-between rounded-lg border p-3">
                                      <div className="space-y-0.5">
                                        <FormLabel className="text-sm font-medium">
                                          Enable Waitlist
                                        </FormLabel>
                                        <p className="text-xs text-muted-foreground">
                                          Allow users to join a waitlist when event is full
                                        </p>
                                      </div>
                                      <FormControl>
                                        <Switch
                                          checked={field.value}
                                          onCheckedChange={field.onChange}
                                          data-testid="switch-event-waitlist"
                                        />
                                      </FormControl>
                                    </FormItem>
                                  )}
                                />
                              </>
                            )}
                          </CardContent>
                        </Card>

                        <Card>
                          <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-base">Registrants & Waitlist</CardTitle>
                              {editingEvent && registrations && registrations.length > 0 && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    if (registrations && editingEvent) {
                                      downloadCsv(registrations, editingEvent.title);
                                    }
                                  }}
                                  data-testid="button-export-csv"
                                >
                                  <Download className="h-4 w-4 mr-2" />
                                  Export CSV
                                </Button>
                              )}
                            </div>
                          </CardHeader>
                          <CardContent>
                            {!editingEvent ? (
                              <p className="text-sm text-muted-foreground text-center py-8">
                                Save the event first to manage registrants.
                              </p>
                            ) : registrantsLoading ? (
                              <div className="flex items-center justify-center p-8">
                                <LoadingSpinner />
                              </div>
                            ) : !registrations || registrations.length === 0 ? (
                              <p
                                className="text-center text-muted-foreground py-8"
                                data-testid="text-no-registrants"
                              >
                                No registrants yet.
                              </p>
                            ) : (
                              <>
                                <div className="flex gap-2 flex-wrap mb-4">
                                  <Badge
                                    variant="default"
                                    data-testid="badge-confirmed-count"
                                    className="flex items-center gap-1"
                                  >
                                    <CheckCircle className="h-3 w-3" />
                                    {confirmedCount} Confirmed
                                  </Badge>
                                  <Badge
                                    variant="secondary"
                                    data-testid="badge-waitlisted-count"
                                    className="flex items-center gap-1"
                                  >
                                    <Clock className="h-3 w-3" />
                                    {waitlistedCount} Waitlisted
                                  </Badge>
                                  <Badge
                                    variant="outline"
                                    data-testid="badge-attended-count"
                                    className="flex items-center gap-1"
                                  >
                                    <CheckSquare className="h-3 w-3" />
                                    {attendedCount} Attended
                                  </Badge>
                                </div>
                                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                                  {registrations.map((reg) => (
                                    <Card
                                      key={reg.id}
                                      data-testid={`card-registrant-${reg.id}`}
                                      className="shadow-none"
                                    >
                                      <CardContent className="p-3">
                                        <div className="flex items-start justify-between gap-2">
                                          <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                              <Button
                                                size="icon"
                                                variant="ghost"
                                                className="h-7 w-7"
                                                onClick={() =>
                                                  checkInMutation.mutate({
                                                    id: reg.id,
                                                    attended: !reg.attended,
                                                  })
                                                }
                                                disabled={checkInMutation.isPending}
                                                data-testid={`button-checkin-${reg.id}`}
                                                title={
                                                  reg.attended ? "Remove check-in" : "Check-in"
                                                }
                                              >
                                                {reg.attended ? (
                                                  <CheckSquare className="h-4 w-4 text-primary" />
                                                ) : (
                                                  <Square className="h-4 w-4 text-muted-foreground" />
                                                )}
                                              </Button>
                                              <div className="min-w-0">
                                                <p
                                                  className="font-medium text-sm truncate flex items-center gap-1.5"
                                                  data-testid={`text-registrant-name-${reg.id}`}
                                                >
                                                  {reg.fullName}
                                                  {!reg.userId && (
                                                    <Badge
                                                      variant="outline"
                                                      className="text-[10px] px-1.5 py-0"
                                                      data-testid={`badge-guest-${reg.id}`}
                                                    >
                                                      Guest
                                                    </Badge>
                                                  )}
                                                </p>
                                                <p
                                                  className="text-xs text-muted-foreground truncate"
                                                  data-testid={`text-registrant-email-${reg.id}`}
                                                >
                                                  {reg.email}
                                                </p>
                                                {reg.phone && (
                                                  <p
                                                    className="text-xs text-muted-foreground truncate"
                                                    data-testid={`text-registrant-phone-${reg.id}`}
                                                  >
                                                    {reg.phone}
                                                  </p>
                                                )}
                                              </div>
                                            </div>
                                            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap ml-9">
                                              {reg.registeredAt && (
                                                <span
                                                  className="text-[10px] text-muted-foreground"
                                                  data-testid={`text-registrant-date-${reg.id}`}
                                                >
                                                  Registered{" "}
                                                  {new Date(reg.registeredAt).toLocaleDateString()}
                                                </span>
                                              )}
                                            </div>
                                            <div className="flex items-center gap-1.5 mt-1 flex-wrap ml-9">
                                              <Badge
                                                variant={registrationStatusVariant(reg.status)}
                                                className="text-[10px]"
                                                data-testid={`badge-registrant-status-${reg.id}`}
                                              >
                                                {reg.status.charAt(0).toUpperCase() +
                                                  reg.status.slice(1)}
                                              </Badge>
                                              {editingEvent?.registrationType === "paid" && (
                                                <>
                                                  <Badge
                                                    variant={paymentStatusVariant(
                                                      reg.paymentStatus,
                                                    )}
                                                    className="text-[10px]"
                                                    data-testid={`badge-payment-status-${reg.id}`}
                                                  >
                                                    {reg.paymentStatus
                                                      ? reg.paymentStatus
                                                          .replace("_", " ")
                                                          .charAt(0)
                                                          .toUpperCase() +
                                                        reg.paymentStatus.replace("_", " ").slice(1)
                                                      : "N/A"}
                                                  </Badge>
                                                  {reg.amountPaid ? (
                                                    <span
                                                      className="text-[10px] font-medium"
                                                      data-testid={`text-amount-paid-${reg.id}`}
                                                    >
                                                      ${(reg.amountPaid / 100).toFixed(2)}
                                                    </span>
                                                  ) : null}
                                                </>
                                              )}
                                            </div>
                                          </div>
                                          <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                              <Button
                                                size="icon"
                                                variant="ghost"
                                                className="h-7 w-7"
                                                data-testid={`button-registrant-actions-${reg.id}`}
                                              >
                                                <MoreHorizontal className="h-4 w-4" />
                                              </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                              {reg.status !== "confirmed" && (
                                                <DropdownMenuItem
                                                  onClick={() =>
                                                    updateStatusMutation.mutate({
                                                      id: reg.id,
                                                      status: "confirmed",
                                                    })
                                                  }
                                                  data-testid={`action-confirm-${reg.id}`}
                                                >
                                                  <CheckCircle className="h-4 w-4 mr-2" />
                                                  Confirm
                                                </DropdownMenuItem>
                                              )}
                                              {reg.status !== "waitlisted" && (
                                                <DropdownMenuItem
                                                  onClick={() =>
                                                    updateStatusMutation.mutate({
                                                      id: reg.id,
                                                      status: "waitlisted",
                                                    })
                                                  }
                                                  data-testid={`action-waitlist-${reg.id}`}
                                                >
                                                  <Clock className="h-4 w-4 mr-2" />
                                                  Waitlist
                                                </DropdownMenuItem>
                                              )}
                                              {reg.status !== "canceled" && (
                                                <DropdownMenuItem
                                                  onClick={() =>
                                                    updateStatusMutation.mutate({
                                                      id: reg.id,
                                                      status: "canceled",
                                                    })
                                                  }
                                                  data-testid={`action-cancel-${reg.id}`}
                                                >
                                                  <XCircle className="h-4 w-4 mr-2" />
                                                  Cancel
                                                </DropdownMenuItem>
                                              )}
                                              <DropdownMenuItem
                                                onClick={() =>
                                                  deleteRegistrationMutation.mutate(reg.id)
                                                }
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
                              </>
                            )}
                          </CardContent>
                        </Card>
                      </div>
                    </TabsContent>

                    {/* ===== VIDEO ARCHIVE TAB ===== */}
                    <TabsContent value="video-archive" className="space-y-6">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Card>
                          <CardHeader className="pb-3">
                            <CardTitle className="text-base flex items-center gap-2">
                              <Video className="h-4 w-4" />
                              Recording Link
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <FormField
                              control={form.control}
                              name="recordingUrl"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Recording URL</FormLabel>
                                  <FormControl>
                                    <Input
                                      {...field}
                                      placeholder="https://youtube.com/watch?v=... or https://vimeo.com/..."
                                      autoPrependHttps
                                      data-testid="input-event-recording-url"
                                    />
                                  </FormControl>
                                  <p className="text-xs text-muted-foreground">
                                    YouTube and Vimeo links are automatically embeddable
                                  </p>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            {watchEventRecordingUrl && (
                              <FormField
                                control={form.control}
                                name="showInArchives"
                                render={({ field }) => (
                                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                                    <div className="space-y-0.5">
                                      <FormLabel className="text-sm font-medium">
                                        Show in Video Archives
                                      </FormLabel>
                                      <p className="text-xs text-muted-foreground">
                                        Display this recording on the public Video Archives page
                                      </p>
                                    </div>
                                    <FormControl>
                                      <Switch
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                        data-testid="switch-show-in-archives"
                                      />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                            )}
                          </CardContent>
                        </Card>

                        {watchEventRecordingUrl && watchShowInArchives && (
                          <Card>
                            <CardHeader className="pb-3">
                              <CardTitle className="text-base flex items-center gap-2">
                                <DollarSign className="h-4 w-4" />
                                Pricing & Access
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                              <FormField
                                control={form.control}
                                name="recordingAccess"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Access Type</FormLabel>
                                    <Select
                                      value={field.value || "free"}
                                      onValueChange={field.onChange}
                                    >
                                      <FormControl>
                                        <SelectTrigger data-testid="select-recording-access">
                                          <SelectValue placeholder="Select access type" />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        <SelectItem value="free">
                                          Free — Open to all mental health professionals
                                        </SelectItem>
                                        <SelectItem value="paid">
                                          Paid — One-time purchase via Stripe
                                        </SelectItem>
                                      </SelectContent>
                                    </Select>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              {watchRecordingAccess === "paid" && (
                                <FormField
                                  control={form.control}
                                  name="recordingPrice"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Price (USD)</FormLabel>
                                      <FormControl>
                                        <div className="relative">
                                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                                            $
                                          </span>
                                          <Input
                                            type="number"
                                            step="0.01"
                                            min="0.50"
                                            className="pl-7"
                                            placeholder="29.99"
                                            value={
                                              field.value ? (field.value / 100).toFixed(2) : ""
                                            }
                                            onChange={(e) => {
                                              const cents = Math.round(
                                                parseFloat(e.target.value || "0") * 100,
                                              );
                                              field.onChange(cents);
                                            }}
                                            data-testid="input-recording-price"
                                          />
                                        </div>
                                      </FormControl>
                                      <p className="text-xs text-muted-foreground">
                                        One-time purchase price. Mental health professionals will
                                        pay via Stripe and have permanent access after purchase.
                                      </p>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              )}

                              <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
                                <h4 className="text-sm font-medium">How it works</h4>
                                {watchRecordingAccess === "paid" ? (
                                  <ul className="text-xs text-muted-foreground space-y-1.5 list-disc pl-4">
                                    <li>
                                      Mental health professionals see a "Purchase" button on the
                                      Video Archives page
                                    </li>
                                    <li>
                                      They're redirected to Stripe Checkout to complete payment
                                    </li>
                                    <li>
                                      After payment, they have permanent access to the recording
                                    </li>
                                    <li>
                                      The recording URL is protected — only purchasers can access it
                                    </li>
                                  </ul>
                                ) : (
                                  <ul className="text-xs text-muted-foreground space-y-1.5 list-disc pl-4">
                                    <li>
                                      All mental health professionals can view this recording for
                                      free
                                    </li>
                                    <li>
                                      The recording will appear in the Video Archives with a "Free"
                                      badge
                                    </li>
                                  </ul>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        )}
                      </div>
                    </TabsContent>

                    {/* ===== RECURRING TAB ===== */}
                    <TabsContent value="recurring" className="space-y-6">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Card>
                          <CardHeader className="pb-3">
                            <CardTitle className="text-base flex items-center gap-2">
                              <Repeat className="h-4 w-4" />
                              Recurring Event
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <FormField
                              control={form.control}
                              name="isRecurring"
                              render={({ field }) => (
                                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                                  <div className="space-y-0.5">
                                    <FormLabel className="text-sm font-medium">
                                      Make this a recurring event
                                    </FormLabel>
                                    <p className="text-xs text-muted-foreground">
                                      Automatically generate future instances of this event
                                    </p>
                                  </div>
                                  <FormControl>
                                    <Switch
                                      checked={field.value}
                                      onCheckedChange={field.onChange}
                                      data-testid="switch-is-recurring"
                                    />
                                  </FormControl>
                                </FormItem>
                              )}
                            />

                            {watchIsRecurring && (
                              <>
                                <FormField
                                  control={form.control}
                                  name="recurrencePattern"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Repeat Frequency</FormLabel>
                                      <Select
                                        value={field.value || ""}
                                        onValueChange={field.onChange}
                                      >
                                        <FormControl>
                                          <SelectTrigger data-testid="select-recurrence-pattern">
                                            <SelectValue placeholder="Select frequency" />
                                          </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                          <SelectItem value="daily">Daily</SelectItem>
                                          <SelectItem value="weekly">Weekly</SelectItem>
                                          <SelectItem value="biweekly">Every 2 Weeks</SelectItem>
                                          <SelectItem value="monthly">Monthly</SelectItem>
                                          <SelectItem value="quarterly">
                                            Quarterly (Every 3 Months)
                                          </SelectItem>
                                          <SelectItem value="yearly">Yearly</SelectItem>
                                          <SelectItem value="custom">Custom Interval</SelectItem>
                                        </SelectContent>
                                      </Select>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />

                                {watchRecurrencePattern === "custom" && (
                                  <FormField
                                    control={form.control}
                                    name="recurrenceInterval"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Repeat Every (days)</FormLabel>
                                        <FormControl>
                                          <Input
                                            type="number"
                                            min={1}
                                            {...field}
                                            value={field.value ?? ""}
                                            data-testid="input-recurrence-interval"
                                          />
                                        </FormControl>
                                        <p className="text-xs text-muted-foreground">
                                          Number of days between each occurrence
                                        </p>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                )}

                                {(watchRecurrencePattern === "weekly" ||
                                  watchRecurrencePattern === "biweekly") && (
                                  <FormField
                                    control={form.control}
                                    name="recurrenceDaysOfWeek"
                                    render={({ field }) => {
                                      const selected = field.value
                                        ? field.value.split(",").filter(Boolean)
                                        : [];
                                      const toggle = (day: string) => {
                                        const newVal = selected.includes(day)
                                          ? selected.filter((d) => d !== day)
                                          : [...selected, day];
                                        field.onChange(newVal.join(","));
                                      };
                                      return (
                                        <FormItem>
                                          <FormLabel>Repeat On</FormLabel>
                                          <div className="flex flex-wrap gap-2">
                                            {DAYS_OF_WEEK.map((day) => (
                                              <Button
                                                key={day.value}
                                                type="button"
                                                size="sm"
                                                variant={
                                                  selected.includes(day.value)
                                                    ? "default"
                                                    : "outline"
                                                }
                                                onClick={() => toggle(day.value)}
                                                data-testid={`button-day-${day.value}`}
                                              >
                                                {day.label}
                                              </Button>
                                            ))}
                                          </div>
                                          <FormMessage />
                                        </FormItem>
                                      );
                                    }}
                                  />
                                )}
                              </>
                            )}
                          </CardContent>
                        </Card>

                        {watchIsRecurring && (
                          <Card>
                            <CardHeader className="pb-3">
                              <CardTitle className="text-base">End Conditions</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                              <FormField
                                control={form.control}
                                name="recurrenceEndDate"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>End Date</FormLabel>
                                    <FormControl>
                                      <Input
                                        type="datetime-local"
                                        {...field}
                                        data-testid="input-recurrence-end-date"
                                      />
                                    </FormControl>
                                    <p className="text-xs text-muted-foreground">
                                      Stop generating events after this date
                                    </p>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              <div className="relative flex items-center py-2">
                                <Separator className="flex-1" />
                                <span className="px-3 text-xs text-muted-foreground">OR</span>
                                <Separator className="flex-1" />
                              </div>

                              <FormField
                                control={form.control}
                                name="recurrenceCount"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Number of Occurrences</FormLabel>
                                    <FormControl>
                                      <Input
                                        type="number"
                                        min={1}
                                        max={365}
                                        {...field}
                                        value={field.value ?? ""}
                                        placeholder="e.g. 12"
                                        data-testid="input-recurrence-count"
                                      />
                                    </FormControl>
                                    <p className="text-xs text-muted-foreground">
                                      Total number of event instances to generate
                                    </p>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
                                <h4 className="text-sm font-medium">Recurrence Summary</h4>
                                <p className="text-xs text-muted-foreground">
                                  {!watchRecurrencePattern &&
                                    "Select a frequency to see the recurrence summary."}
                                  {watchRecurrencePattern === "daily" &&
                                    "This event will repeat every day."}
                                  {watchRecurrencePattern === "weekly" &&
                                    `This event will repeat every week${form.getValues("recurrenceDaysOfWeek") ? ` on ${form.getValues("recurrenceDaysOfWeek")?.split(",").join(", ")}` : ""}.`}
                                  {watchRecurrencePattern === "biweekly" &&
                                    `This event will repeat every 2 weeks${form.getValues("recurrenceDaysOfWeek") ? ` on ${form.getValues("recurrenceDaysOfWeek")?.split(",").join(", ")}` : ""}.`}
                                  {watchRecurrencePattern === "monthly" &&
                                    "This event will repeat on the same day each month."}
                                  {watchRecurrencePattern === "quarterly" &&
                                    "This event will repeat every 3 months."}
                                  {watchRecurrencePattern === "yearly" &&
                                    "This event will repeat on the same date each year."}
                                  {watchRecurrencePattern === "custom" &&
                                    form.getValues("recurrenceInterval") &&
                                    ` This event will repeat every ${form.getValues("recurrenceInterval")} day(s).`}
                                </p>
                                {(form.getValues("recurrenceEndDate") ||
                                  form.getValues("recurrenceCount")) && (
                                  <p className="text-xs text-muted-foreground">
                                    {form.getValues("recurrenceEndDate") &&
                                      `Ends: ${new Date(form.getValues("recurrenceEndDate")!).toLocaleDateString()}`}
                                    {form.getValues("recurrenceCount") &&
                                      `${form.getValues("recurrenceEndDate") ? " · " : ""}${form.getValues("recurrenceCount")} occurrence(s)`}
                                  </p>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        )}
                      </div>
                    </TabsContent>
                  </Tabs>
                </form>
              </Form>
            </div>
          </SheetBody>
          <SheetFooter>
            <div className="flex w-full items-center justify-between gap-3">
              <EditorSaveIndicator state={saveState.state} />
              <Button
                type="submit"
                form="event-form"
                className="min-w-[160px]"
                disabled={isSaving || editorLock.isReadOnly}
                data-testid="button-submit-event"
              >
                {isSaving ? "Saving..." : editingEvent ? "Save Event" : "Create Event"}
              </Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}

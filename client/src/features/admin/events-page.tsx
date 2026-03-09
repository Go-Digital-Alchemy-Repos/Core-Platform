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
import { Plus, Pencil, Trash2, CalendarDays, MapPin } from "lucide-react";
import type { Event } from "@shared/schema";

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
});

type EventFormValues = z.infer<typeof eventFormSchema>;

export default function AdminEventsPage() {
  return (
    <ProtectedRoute roles={["admin"]}>
      <AdminSidebar>
        <EventsContent />
      </AdminSidebar>
    </ProtectedRoute>
  );
}

function EventsContent() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);

  const { data: events, isLoading } = useQuery<Event[]>({
    queryKey: ["/api/admin/events"],
  });

  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
      title: "",
      description: "",
      date: "",
      endDate: "",
      location: "",
      isVirtual: false,
      zoomLink: "",
      memberOnly: false,
      imageUrl: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: EventFormValues) => {
      const payload = {
        ...data,
        date: new Date(data.date).toISOString(),
        endDate: data.endDate ? new Date(data.endDate).toISOString() : null,
      };
      await apiRequest("POST", "/api/admin/events", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/events"] });
      toast({ title: "Event created" });
      setDialogOpen(false);
      form.reset();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: EventFormValues }) => {
      const payload = {
        ...data,
        date: new Date(data.date).toISOString(),
        endDate: data.endDate ? new Date(data.endDate).toISOString() : null,
      };
      await apiRequest("PUT", `/api/admin/events/${id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/events"] });
      toast({ title: "Event updated" });
      setDialogOpen(false);
      setEditingEvent(null);
      form.reset();
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

  function openCreate() {
    setEditingEvent(null);
    form.reset({
      title: "",
      description: "",
      date: "",
      endDate: "",
      location: "",
      isVirtual: false,
      zoomLink: "",
      memberOnly: false,
      imageUrl: "",
    });
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
                <CardTitle className="text-lg" data-testid={`text-event-title-${event.id}`}>
                  {event.title}
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
                  onClick={() => deleteMutation.mutate(event.id)}
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
              <form id="event-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                  name="zoomLink"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Zoom Link</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-event-zoom-link" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex items-center gap-6 flex-wrap">
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
                        <FormLabel className="!mt-0">Virtual</FormLabel>
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
                        <FormLabel className="!mt-0">Members Only</FormLabel>
                      </FormItem>
                    )}
                  />
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
                  ? "Update Event"
                  : "Create Event"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}

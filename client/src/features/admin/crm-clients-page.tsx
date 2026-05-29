import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  CRM_CLIENT_ONBOARDING_STATUS_LABELS,
  CRM_CLIENT_ONBOARDING_STATUSES,
  CRM_CLIENT_STATUS_LABELS,
  CRM_CLIENT_STATUSES,
  CRM_CLIENT_TYPE_LABELS,
  CRM_CLIENT_TYPES,
  CRM_CONTACT_METHOD_LABELS,
  CRM_CONTACT_METHODS,
  type CrmClient,
  type CrmClientOnboardingStatus,
  type CrmClientNote,
  type CrmClientStatus,
  type CrmClientTask,
  type CrmClientType,
  type CrmClientUpdate,
  type CrmContactMethod,
  type CrmLead,
} from "@shared/schema";
import { AdminSidebar } from "./admin-sidebar";
import { ProtectedRoute } from "@/components/shared/protected-route";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { CalendarClock, ClipboardList, Search, UserRound } from "lucide-react";

type ClientDetail = CrmClient & {
  sourceLead?: CrmLead;
  notes: CrmClientNote[];
  tasks: CrmClientTask[];
};

const STATUS_COLORS: Record<CrmClientStatus, string> = {
  onboarding: "border-amber-200 bg-amber-50 text-amber-800",
  active: "border-emerald-200 bg-emerald-50 text-emerald-800",
  inactive: "border-slate-200 bg-slate-50 text-slate-700",
};

function formatDate(value: string | Date | null | undefined) {
  if (!value) return "No date";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

function formatDateInput(value: string | Date | null | undefined) {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 10);
}

function textOrNull(value: string) {
  const trimmed = value.trim();
  return trimmed || null;
}

function tagsToInput(value: string[] | null | undefined) {
  return Array.isArray(value) ? value.join(", ") : "";
}

function tagsFromInput(value: string) {
  return value.split(",").map((tag) => tag.trim()).filter(Boolean);
}

function Field({
  label,
  value,
  type = "text",
  placeholder,
  onSave,
}: {
  label: string;
  value: string | Date | null | undefined;
  type?: string;
  placeholder?: string;
  onSave: (value: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input
        type={type}
        defaultValue={type === "date" ? formatDateInput(value) : String(value ?? "")}
        placeholder={placeholder}
        onBlur={(event) => onSave(event.target.value)}
      />
    </div>
  );
}

function ClientDetailSheet({ clientId, onClose }: { clientId: string | null; onClose: () => void }) {
  const { toast } = useToast();
  const [note, setNote] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDueAt, setTaskDueAt] = useState("");
  const { data: client } = useQuery<ClientDetail>({
    queryKey: ["/api/admin/crm/clients", clientId ?? ""],
    enabled: Boolean(clientId),
  });

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["/api/admin/crm/clients"] }),
      queryClient.invalidateQueries({ queryKey: ["/api/admin/crm/clients", clientId ?? ""] }),
    ]);
  };

  const updateClientMutation = useMutation({
    mutationFn: async (data: CrmClientUpdate) => apiRequest("PATCH", `/api/admin/crm/clients/${clientId}`, data),
    onSuccess: refresh,
    onError: (error: Error) => toast({ title: "Could not update client", description: error.message, variant: "destructive" }),
  });
  const addNoteMutation = useMutation({
    mutationFn: async () => apiRequest("POST", `/api/admin/crm/clients/${clientId}/notes`, { body: note }),
    onSuccess: async () => {
      setNote("");
      await refresh();
    },
  });
  const addTaskMutation = useMutation({
    mutationFn: async () => apiRequest("POST", `/api/admin/crm/clients/${clientId}/tasks`, { title: taskTitle, dueAt: taskDueAt || null }),
    onSuccess: async () => {
      setTaskTitle("");
      setTaskDueAt("");
      await refresh();
    },
  });
  const updateTaskMutation = useMutation({
    mutationFn: async ({ id, completed }: { id: string; completed: boolean }) => apiRequest("PATCH", `/api/admin/crm/clients/tasks/${id}`, { completed }),
    onSuccess: refresh,
  });
  const updateClient = (data: CrmClientUpdate) => updateClientMutation.mutate(data);
  const saveText = (field: keyof CrmClientUpdate, value: string, extras: CrmClientUpdate = {}) => {
    updateClient({ [field]: textOrNull(value), ...extras } as CrmClientUpdate);
  };
  const saveDate = (field: keyof CrmClientUpdate, value: string) => {
    updateClient({ [field]: value ? new Date(value) : null } as CrmClientUpdate);
  };
  const contactLine = client?.primaryEmail || client?.email || client?.primaryPhone || client?.phone || "No contact info";
  const companyLine = client?.companyName || client?.company || "No company";

  return (
    <Sheet open={Boolean(clientId)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" size="xl">
        <SheetHeader>
          <SheetTitle>{client?.name ?? "Client"}</SheetTitle>
          <SheetDescription>{client ? `${CRM_CLIENT_TYPE_LABELS[client.clientType ?? "individual"]} · ${contactLine}` : "Loading client..."}</SheetDescription>
        </SheetHeader>
        <SheetBody className="space-y-5">
          {client ? (
            <>
              <Tabs defaultValue="overview" className="space-y-4">
                <TabsList className="flex h-auto flex-wrap justify-start">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="contact">Contact</TabsTrigger>
                  <TabsTrigger value="company">Company</TabsTrigger>
                  <TabsTrigger value="billing">Billing/Admin</TabsTrigger>
                  <TabsTrigger value="notes">Notes</TabsTrigger>
                  <TabsTrigger value="tasks">Tasks</TabsTrigger>
                  <TabsTrigger value="data">Data</TabsTrigger>
                </TabsList>
                <TabsContent value="overview" className="space-y-4">
                  <div className="grid gap-4 rounded-lg border p-4 sm:grid-cols-2">
                    <Field label="Client Name" value={client.name} onSave={(value) => saveText("name", value)} />
                    <div className="space-y-1.5">
                      <Label>Client Type</Label>
                      <Select value={client.clientType ?? "individual"} onValueChange={(value) => updateClient({ clientType: value as CrmClientType })}>
                        <SelectTrigger data-testid="select-crm-client-type"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {CRM_CLIENT_TYPES.map((type) => <SelectItem key={type} value={type}>{CRM_CLIENT_TYPE_LABELS[type]}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Status</Label>
                      <Select value={client.status} onValueChange={(status) => updateClient({ status: status as CrmClientStatus })}>
                        <SelectTrigger data-testid="select-crm-client-status"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {CRM_CLIENT_STATUSES.map((status) => <SelectItem key={status} value={status}>{CRM_CLIENT_STATUS_LABELS[status]}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Onboarding</Label>
                      <Select value={client.onboardingStatus ?? "not_started"} onValueChange={(value) => updateClient({ onboardingStatus: value as CrmClientOnboardingStatus })}>
                        <SelectTrigger data-testid="select-crm-onboarding-status"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {CRM_CLIENT_ONBOARDING_STATUSES.map((status) => <SelectItem key={status} value={status}>{CRM_CLIENT_ONBOARDING_STATUS_LABELS[status]}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <Field label="Next Follow-Up" type="date" value={client.nextFollowUpAt} onSave={(value) => saveDate("nextFollowUpAt", value)} />
                    <Field label="Client Since" type="date" value={client.clientSince} onSave={(value) => saveDate("clientSince", value)} />
                    <p className="text-sm"><span className="font-medium">Source:</span> {client.source}</p>
                    <p className="text-sm"><span className="font-medium">Company:</span> {companyLine}</p>
                    <p className="text-sm sm:col-span-2"><span className="font-medium">Source Lead:</span> {client.sourceLead?.name ?? "Not linked"}</p>
                  </div>
                </TabsContent>
                <TabsContent value="contact" className="space-y-4">
                  <div className="grid gap-4 rounded-lg border p-4 sm:grid-cols-2">
                    <Field label="Primary Email" value={client.primaryEmail ?? client.email} onSave={(value) => saveText("primaryEmail", value, { email: textOrNull(value) })} />
                    <Field label="Secondary Email" value={client.secondaryEmail} onSave={(value) => saveText("secondaryEmail", value)} />
                    <Field label="Primary Phone" value={client.primaryPhone ?? client.phone} onSave={(value) => saveText("primaryPhone", value, { phone: textOrNull(value) })} />
                    <Field label="Alternate Phone" value={client.alternatePhone} onSave={(value) => saveText("alternatePhone", value)} />
                    <div className="space-y-1.5">
                      <Label>Preferred Contact</Label>
                      <Select value={client.preferredContactMethod ?? "no_preference"} onValueChange={(value) => updateClient({ preferredContactMethod: value as CrmContactMethod })}>
                        <SelectTrigger data-testid="select-crm-contact-method"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {CRM_CONTACT_METHODS.map((method) => <SelectItem key={method} value={method}>{CRM_CONTACT_METHOD_LABELS[method]}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <Field label="Address Line 1" value={client.addressLine1} onSave={(value) => saveText("addressLine1", value)} />
                    <Field label="Address Line 2" value={client.addressLine2} onSave={(value) => saveText("addressLine2", value)} />
                    <Field label="City" value={client.city} onSave={(value) => saveText("city", value)} />
                    <Field label="State/Region" value={client.region} onSave={(value) => saveText("region", value)} />
                    <Field label="Postal Code" value={client.postalCode} onSave={(value) => saveText("postalCode", value)} />
                    <Field label="Country" value={client.country} onSave={(value) => saveText("country", value)} />
                  </div>
                </TabsContent>
                <TabsContent value="company" className="space-y-4">
                  <div className="grid gap-4 rounded-lg border p-4 sm:grid-cols-2">
                    <Field label="Company Name" value={client.companyName ?? client.company} onSave={(value) => saveText("companyName", value, { company: textOrNull(value) })} />
                    <Field label="Legal Name" value={client.legalName} onSave={(value) => saveText("legalName", value)} />
                    <Field label="Website" value={client.website} onSave={(value) => saveText("website", value)} />
                    <Field label="Industry" value={client.industry} onSave={(value) => saveText("industry", value)} />
                    <Field label="Company Size" value={client.companySize} onSave={(value) => saveText("companySize", value)} />
                    <Field label="Business Type" value={client.businessType} onSave={(value) => saveText("businessType", value)} />
                    <Field label="Company Phone" value={client.companyPhone} onSave={(value) => saveText("companyPhone", value)} />
                    <Field label="Company Email" value={client.companyEmail} onSave={(value) => saveText("companyEmail", value)} />
                  </div>
                </TabsContent>
                <TabsContent value="billing" className="space-y-4">
                  <div className="grid gap-4 rounded-lg border p-4 sm:grid-cols-2">
                    <Field label="Billing Contact" value={client.billingContactName} onSave={(value) => saveText("billingContactName", value)} />
                    <Field label="Billing Email" value={client.billingEmail} onSave={(value) => saveText("billingEmail", value)} />
                    <Field label="Billing Phone" value={client.billingPhone} onSave={(value) => saveText("billingPhone", value)} />
                    <Field label="Account Owner ID" value={client.accountOwnerId} onSave={(value) => saveText("accountOwnerId", value)} />
                    <Field label="Service Start" type="date" value={client.serviceStartDate} onSave={(value) => saveDate("serviceStartDate", value)} />
                    <Field label="Renewal Date" type="date" value={client.renewalDate} onSave={(value) => saveDate("renewalDate", value)} />
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label>Internal Tags</Label>
                      <Input defaultValue={tagsToInput(client.internalTags)} placeholder="vip, newsletter, renewal" onBlur={(event) => updateClient({ internalTags: tagsFromInput(event.target.value) })} />
                    </div>
                  </div>
                </TabsContent>
                <TabsContent value="notes" className="space-y-3">
                  <Textarea rows={3} placeholder="Add a client note..." value={note} onChange={(event) => setNote(event.target.value)} />
                  <Button size="sm" onClick={() => addNoteMutation.mutate()} disabled={!note.trim() || addNoteMutation.isPending}>Add Note</Button>
                  <div className="space-y-2">
                    {client.notes.map((item) => (
                      <div key={item.id} className="rounded-md border p-3 text-sm">
                        <p className="whitespace-pre-wrap">{item.body}</p>
                        <p className="mt-2 text-xs text-muted-foreground">{formatDate(item.createdAt)}</p>
                      </div>
                    ))}
                  </div>
                </TabsContent>
                <TabsContent value="tasks" className="space-y-3">
                  <div className="grid gap-2 sm:grid-cols-[1fr_160px_auto]">
                    <Input placeholder="Client task" value={taskTitle} onChange={(event) => setTaskTitle(event.target.value)} />
                    <Input type="date" value={taskDueAt} onChange={(event) => setTaskDueAt(event.target.value)} />
                    <Button onClick={() => addTaskMutation.mutate()} disabled={!taskTitle.trim() || addTaskMutation.isPending}>Add</Button>
                  </div>
                  {client.tasks.map((task) => (
                    <label key={task.id} className="flex items-start gap-3 rounded-md border p-3">
                      <Checkbox checked={task.completed} onCheckedChange={(checked) => updateTaskMutation.mutate({ id: task.id, completed: checked === true })} />
                      <span className={cn("text-sm", task.completed && "text-muted-foreground line-through")}>{task.title}</span>
                      <span className="ml-auto text-xs text-muted-foreground">{formatDate(task.dueAt)}</span>
                    </label>
                  ))}
                </TabsContent>
                <TabsContent value="data">
                  <pre className="max-h-96 overflow-auto rounded-md bg-muted p-4 text-xs">{JSON.stringify({ formData: client.formData, metadata: client.metadata }, null, 2)}</pre>
                </TabsContent>
              </Tabs>
            </>
          ) : (
            <div className="p-8 text-center text-sm text-muted-foreground">Loading client...</div>
          )}
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}

function CrmClientsContent() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<CrmClientStatus | "all">("all");
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const { data: clients = [], isLoading } = useQuery<CrmClient[]>({
    queryKey: ["/api/admin/crm/clients", { status, query }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (status !== "all") params.set("status", status);
      if (query.trim()) params.set("q", query.trim());
      const response = await fetch(`/api/admin/crm/clients${params.toString() ? `?${params}` : ""}`, { credentials: "include" });
      if (!response.ok) throw new Error("Failed to load CRM clients");
      return response.json();
    },
  });

  return (
    <div className="flex min-h-screen flex-col gap-5 p-6">
      <div>
        <h1 className="text-2xl font-heading font-bold" data-testid="text-crm-clients-title">CRM Clients</h1>
        <p className="text-sm text-muted-foreground">Track won leads through onboarding, active service, and inactive status.</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative min-w-64 flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search clients..." value={query} onChange={(event) => setQuery(event.target.value)} />
        </div>
        <Select value={status} onValueChange={(value) => setStatus(value as CrmClientStatus | "all")}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {CRM_CLIENT_STATUSES.map((item) => <SelectItem key={item} value={item}>{CRM_CLIENT_STATUS_LABELS[item]}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border">
        <div className="grid grid-cols-[1fr_120px_140px_150px_120px] gap-3 border-b px-4 py-3 text-xs font-medium text-muted-foreground">
          <span><UserRound className="mr-1 inline h-3 w-3" />Client</span>
          <span>Type</span>
          <span><ClipboardList className="mr-1 inline h-3 w-3" />Status</span>
          <span>Company</span>
          <span><CalendarClock className="mr-1 inline h-3 w-3" />Follow-Up</span>
        </div>
        {clients.map((client) => (
          <button key={client.id} type="button" onClick={() => setSelectedClientId(client.id)} className="grid w-full grid-cols-[1fr_120px_140px_150px_120px] gap-3 px-4 py-3 text-left text-sm hover:bg-muted/40">
            <span className="min-w-0"><span className="block truncate font-medium">{client.name}</span><span className="block truncate text-xs text-muted-foreground">{client.primaryEmail || client.email || client.primaryPhone || client.phone || "No contact info"}</span></span>
            <span>{CRM_CLIENT_TYPE_LABELS[client.clientType ?? "individual"]}</span>
            <span><Badge variant="outline" className={STATUS_COLORS[client.status]}>{CRM_CLIENT_STATUS_LABELS[client.status]}</Badge></span>
            <span className="truncate">{client.companyName || client.company || "—"}</span>
            <span>{formatDate(client.nextFollowUpAt)}</span>
          </button>
        ))}
        {!isLoading && clients.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">No clients yet. Move a lead to Won to create one.</div>
        ) : null}
      </div>

      <ClientDetailSheet clientId={selectedClientId} onClose={() => setSelectedClientId(null)} />
    </div>
  );
}

export default function AdminCrmClientsPage() {
  return (
    <ProtectedRoute roles={["admin", "editor"]} adminPermissions={["crm"]}>
      <AdminSidebar>
        <CrmClientsContent />
      </AdminSidebar>
    </ProtectedRoute>
  );
}

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { AdminSidebar } from "./admin-sidebar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
  CreditCard,
  Mail,
  Cloud,
  Eye,
  EyeOff,
  Save,
  Plug,
  CheckCircle2,
  XCircle,
  Loader2,
  Send,
  FileText,
  Pencil,
  AlertCircle,
  Plus,
  Trash2,
  Tag,
} from "lucide-react";

type SettingsData = Record<
  string,
  Record<string, { value: string; isSecret: boolean }>
>;

interface EmailTemplate {
  id: number;
  slug: string;
  name: string;
  subject: string;
  htmlBody: string;
  description: string;
  variables: string[];
  isActive: boolean;
  updatedAt: string;
}

interface IntegrationField {
  key: string;
  label: string;
  isSecret: boolean;
  placeholder: string;
}

interface IntegrationConfig {
  category: string;
  title: string;
  description: string;
  icon: typeof CreditCard;
  fields: IntegrationField[];
}

const INTEGRATIONS: IntegrationConfig[] = [
  {
    category: "stripe",
    title: "Stripe",
    description: "Payment processing for therapist subscriptions",
    icon: CreditCard,
    fields: [
      {
        key: "stripe_secret_key",
        label: "Secret Key",
        isSecret: true,
        placeholder: "sk_live_...",
      },
      {
        key: "stripe_publishable_key",
        label: "Publishable Key",
        isSecret: false,
        placeholder: "pk_live_...",
      },
      {
        key: "stripe_webhook_secret",
        label: "Webhook Secret",
        isSecret: true,
        placeholder: "whsec_...",
      },
    ],
  },
  {
    category: "mailgun",
    title: "Mailgun",
    description: "Transactional email delivery service",
    icon: Mail,
    fields: [
      {
        key: "mailgun_api_key",
        label: "API Key",
        isSecret: true,
        placeholder: "key-...",
      },
      {
        key: "mailgun_domain",
        label: "Domain",
        isSecret: false,
        placeholder: "mg.yourdomain.com",
      },
      {
        key: "mailgun_from_address",
        label: "From Address",
        isSecret: false,
        placeholder: "TCK Wellness <noreply@yourdomain.com>",
      },
    ],
  },
  {
    category: "cloudflare_r2",
    title: "Cloudflare R2",
    description: "Object storage for images and file uploads",
    icon: Cloud,
    fields: [
      {
        key: "r2_account_id",
        label: "Account ID",
        isSecret: false,
        placeholder: "Your Cloudflare Account ID",
      },
      {
        key: "r2_access_key_id",
        label: "Access Key ID",
        isSecret: true,
        placeholder: "Access key for R2",
      },
      {
        key: "r2_secret_access_key",
        label: "Secret Access Key",
        isSecret: true,
        placeholder: "Secret access key for R2",
      },
      {
        key: "r2_bucket_name",
        label: "Bucket Name",
        isSecret: false,
        placeholder: "tck-wellness-uploads",
      },
      {
        key: "r2_public_url",
        label: "Public URL",
        isSecret: false,
        placeholder: "https://cdn.yourdomain.com",
      },
    ],
  },
];

function IntegrationCard({
  config,
  settings,
}: {
  config: IntegrationConfig;
  settings: SettingsData;
}) {
  const { toast } = useToast();
  const categorySettings = settings[config.category] || {};
  const [values, setValues] = useState<Record<string, string>>({});
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});

  const hasAnyValue = config.fields.some(
    (f) => categorySettings[f.key]?.value && categorySettings[f.key].value !== ""
  );

  const saveMutation = useMutation({
    mutationFn: async (field: IntegrationField) => {
      const val = values[field.key];
      if (val === undefined || val === "") return;
      await apiRequest("PUT", "/api/admin/settings", {
        key: field.key,
        value: val,
        category: config.category,
        isSecret: field.isSecret,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings"] });
      toast({ title: "Setting saved" });
    },
    onError: (err: Error) => {
      toast({ title: "Error saving setting", description: err.message, variant: "destructive" });
    },
  });

  const saveAll = async () => {
    for (const field of config.fields) {
      const val = values[field.key];
      if (val !== undefined && val !== "") {
        await saveMutation.mutateAsync(field);
      }
    }
    setValues({});
  };

  const testMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/settings/test-connection", {
        integration: config.category,
      });
      return res.json();
    },
    onSuccess: (data: { success: boolean; message: string }) => {
      toast({
        title: data.success ? "Connection successful" : "Connection failed",
        description: data.message,
        variant: data.success ? "default" : "destructive",
      });
    },
    onError: (err: Error) => {
      toast({ title: "Test failed", description: err.message, variant: "destructive" });
    },
  });

  const Icon = config.icon;

  return (
    <Card data-testid={`card-integration-${config.category}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-md bg-primary/10">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">{config.title}</CardTitle>
              <CardDescription>{config.description}</CardDescription>
            </div>
          </div>
          <Badge variant={hasAnyValue ? "default" : "outline"} data-testid={`badge-status-${config.category}`}>
            {hasAnyValue ? (
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> Configured
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <XCircle className="h-3 w-3" /> Not configured
              </span>
            )}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {config.fields.map((field) => {
          const existing = categorySettings[field.key];
          const hasExisting = existing && existing.value && existing.value !== "";
          const currentVal = values[field.key] ?? "";
          const isVisible = showSecrets[field.key];

          return (
            <div key={field.key} className="space-y-1.5">
              <Label htmlFor={field.key}>{field.label}</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    id={field.key}
                    type={field.isSecret && !isVisible ? "password" : "text"}
                    placeholder={
                      hasExisting
                        ? field.isSecret
                          ? "••••••••  (saved — enter new value to update)"
                          : existing.value
                        : field.placeholder
                    }
                    value={currentVal}
                    onChange={(e) =>
                      setValues((prev) => ({ ...prev, [field.key]: e.target.value }))
                    }
                    data-testid={`input-${field.key}`}
                  />
                </div>
                {field.isSecret && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      setShowSecrets((prev) => ({
                        ...prev,
                        [field.key]: !prev[field.key],
                      }))
                    }
                    data-testid={`button-toggle-${field.key}`}
                  >
                    {isVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                )}
              </div>
            </div>
          );
        })}
        <div className="flex gap-2 pt-2">
          <Button
            onClick={saveAll}
            disabled={saveMutation.isPending || Object.values(values).every((v) => !v)}
            data-testid={`button-save-${config.category}`}
          >
            {saveMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save
          </Button>
          <Button
            variant="outline"
            onClick={() => testMutation.mutate()}
            disabled={testMutation.isPending || !hasAnyValue}
            data-testid={`button-test-${config.category}`}
          >
            {testMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Plug className="h-4 w-4 mr-2" />
            )}
            Test Connection
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function IntegrationsTab({ settings }: { settings: SettingsData }) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold" data-testid="text-integrations-heading">
          Integrations
        </h3>
        <p className="text-sm text-muted-foreground">
          Configure third-party service connections. Secret values are encrypted at rest.
        </p>
      </div>
      {INTEGRATIONS.map((config) => (
        <IntegrationCard key={config.category} config={config} settings={settings} />
      ))}
    </div>
  );
}

function TemplateEditor({
  template,
  open,
  onClose,
}: {
  template: EmailTemplate;
  open: boolean;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const [subject, setSubject] = useState(template.subject);
  const [htmlBody, setHtmlBody] = useState(template.htmlBody);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);

  const updateMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("PUT", `/api/admin/email-templates/${template.slug}`, {
        subject,
        htmlBody,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/email-templates"] });
      toast({ title: "Template saved" });
      onClose();
    },
    onError: (err: Error) => {
      toast({ title: "Error saving template", description: err.message, variant: "destructive" });
    },
  });

  const previewMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest(
        "POST",
        `/api/admin/email-templates/${template.slug}/preview`,
        { htmlBody, subject }
      );
      return res.json();
    },
    onSuccess: (data: { subject: string; html: string }) => {
      setPreviewHtml(data.html);
    },
    onError: (err: Error) => {
      toast({ title: "Preview failed", description: err.message, variant: "destructive" });
    },
  });

  const testMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest(
        "POST",
        `/api/admin/email-templates/${template.slug}/test`
      );
      return res.json();
    },
    onSuccess: (data: { success: boolean; message: string }) => {
      toast({
        title: data.success ? "Test email sent" : "Email not sent",
        description: data.message,
        variant: data.success ? "default" : "destructive",
      });
    },
    onError: (err: Error) => {
      toast({ title: "Test email failed", description: err.message, variant: "destructive" });
    },
  });

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" size="xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Edit: {template.name}
          </SheetTitle>
          <SheetDescription className="sr-only">Edit email template</SheetDescription>
        </SheetHeader>
        <SheetBody>
          <p className="text-sm text-muted-foreground">{template.description}</p>

          <div className="flex flex-wrap gap-1.5 mt-2">
            <span className="text-xs text-muted-foreground mr-1">Variables:</span>
            {template.variables.map((v) => (
              <Badge key={v} variant="secondary" className="text-xs font-mono">
                {`{{${v}}}`}
              </Badge>
            ))}
          </div>

          <div className="space-y-4 mt-4">
            <div className="space-y-1.5">
              <Label htmlFor="template-subject">Subject</Label>
              <Input
                id="template-subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                data-testid="input-template-subject"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="template-body">HTML Body</Label>
              <Textarea
                id="template-body"
                value={htmlBody}
                onChange={(e) => setHtmlBody(e.target.value)}
                rows={16}
                className="font-mono text-xs"
                data-testid="input-template-body"
              />
            </div>
          </div>

          {previewHtml && (
            <div className="mt-4 border rounded-md overflow-hidden">
              <div className="bg-muted px-3 py-2 text-xs font-medium flex items-center justify-between">
                <span>Preview</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPreviewHtml(null)}
                  data-testid="button-close-preview"
                >
                  Close
                </Button>
              </div>
              <iframe
                srcDoc={previewHtml}
                className="w-full h-[400px] bg-white"
                title="Email preview"
                data-testid="iframe-email-preview"
              />
            </div>
          )}
        </SheetBody>
        <SheetFooter>
          <Button
            onClick={() => updateMutation.mutate()}
            disabled={updateMutation.isPending}
            data-testid="button-save-template"
          >
            {updateMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Template
          </Button>
          <Button
            variant="outline"
            onClick={() => previewMutation.mutate()}
            disabled={previewMutation.isPending}
            data-testid="button-preview-template"
          >
            {previewMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Eye className="h-4 w-4 mr-2" />
            )}
            Preview
          </Button>
          <Button
            variant="outline"
            onClick={() => testMutation.mutate()}
            disabled={testMutation.isPending}
            data-testid="button-test-email"
          >
            {testMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            Send Test
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function EmailTemplatesTab() {
  const { toast } = useToast();
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);

  const { data: templates, isLoading } = useQuery<EmailTemplate[]>({
    queryKey: ["/api/admin/email-templates"],
  });

  const toggleMutation = useMutation({
    mutationFn: async ({
      slug,
      isActive,
    }: {
      slug: string;
      isActive: boolean;
    }) => {
      await apiRequest("PUT", `/api/admin/email-templates/${slug}`, {
        isActive,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/email-templates"] });
      toast({ title: "Template updated" });
    },
    onError: (err: Error) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/email-templates"] });
      toast({ title: "Update failed", description: err.message, variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold" data-testid="text-templates-heading">
          Email Templates
        </h3>
        <p className="text-sm text-muted-foreground">
          Manage system email templates. Templates use {"{{variable}}"} placeholders for dynamic content.
        </p>
      </div>

      {!templates?.length && (
        <Card>
          <CardContent className="flex items-center gap-3 py-8 justify-center text-muted-foreground">
            <AlertCircle className="h-5 w-5" />
            <span>No email templates found. Run the seed script to populate defaults.</span>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {templates?.map((t) => (
          <Card key={t.slug} data-testid={`card-template-${t.slug}`}>
            <CardContent className="py-4 px-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium text-sm">{t.name}</h4>
                    <Badge
                      variant={t.isActive ? "default" : "outline"}
                      className="text-xs"
                      data-testid={`badge-active-${t.slug}`}
                    >
                      {t.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mb-1">{t.description}</p>
                  <p className="text-xs">
                    <span className="text-muted-foreground">Subject: </span>
                    <span className="font-mono">{t.subject}</span>
                  </p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <Switch
                    checked={t.isActive}
                    onCheckedChange={(checked) =>
                      toggleMutation.mutate({ slug: t.slug, isActive: checked })
                    }
                    data-testid={`switch-active-${t.slug}`}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingTemplate(t)}
                    data-testid={`button-edit-${t.slug}`}
                  >
                    <Pencil className="h-3.5 w-3.5 mr-1.5" />
                    Edit
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {editingTemplate && (
        <TemplateEditor
          template={editingTemplate}
          open={!!editingTemplate}
          onClose={() => setEditingTemplate(null)}
        />
      )}
    </div>
  );
}

type Specialization = { id: number; name: string; sortOrder: number };

function SpecializationsTab() {
  const { toast } = useToast();
  const [addName, setAddName] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Specialization | null>(null);
  const [editName, setEditName] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Specialization | null>(null);

  const { data: specs, isLoading } = useQuery<Specialization[]>({
    queryKey: ["/api/specializations"],
  });

  const addMutation = useMutation({
    mutationFn: (name: string) => apiRequest("POST", "/api/specializations", { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/specializations"] });
      setAddName("");
      setAddOpen(false);
      toast({ title: "Specialization added" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const editMutation = useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) =>
      apiRequest("PUT", `/api/specializations/${id}`, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/specializations"] });
      setEditTarget(null);
      toast({ title: "Specialization updated" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/specializations/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/specializations"] });
      setDeleteTarget(null);
      toast({ title: "Specialization deleted" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  function handleStartEdit(spec: Specialization) {
    setEditTarget(spec);
    setEditName(spec.name);
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Tag className="h-4 w-4" />
                Specialization Settings
              </CardTitle>
              <CardDescription className="mt-1">
                Manage the list of specializations available in counselor profiles and the directory filter.
              </CardDescription>
            </div>
            <Button
              size="sm"
              onClick={() => setAddOpen(true)}
              className="bg-accent text-accent-foreground flex-shrink-0"
              data-testid="button-add-specialization"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Add
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : !specs?.length ? (
            <div className="text-center py-10 text-muted-foreground text-sm">No specializations yet.</div>
          ) : (
            <div className="divide-y rounded-md border">
              {specs.map((spec) => (
                <div
                  key={spec.id}
                  className="flex items-center justify-between gap-3 px-4 py-2.5"
                  data-testid={`specialization-row-${spec.id}`}
                >
                  <span className="text-sm">{spec.name}</span>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={() => handleStartEdit(spec)}
                      data-testid={`button-edit-specialization-${spec.id}`}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => setDeleteTarget(spec)}
                      data-testid={`button-delete-specialization-${spec.id}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Sheet open={addOpen} onOpenChange={setAddOpen}>
        <SheetContent side="right" className="sm:max-w-md z-[1300]">
          <SheetHeader>
            <SheetTitle>Add Specialization</SheetTitle>
            <SheetDescription>Enter a name for the new specialization.</SheetDescription>
          </SheetHeader>
          <SheetBody>
            <div className="space-y-2">
              <Label htmlFor="add-spec-name">Name</Label>
              <Input
                id="add-spec-name"
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
                placeholder="e.g. Parenting Challenges"
                onKeyDown={(e) => { if (e.key === "Enter" && addName.trim()) addMutation.mutate(addName.trim()); }}
                data-testid="input-add-specialization-name"
                autoFocus
              />
            </div>
          </SheetBody>
          <SheetFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button
              onClick={() => addMutation.mutate(addName.trim())}
              disabled={!addName.trim() || addMutation.isPending}
              data-testid="button-save-add-specialization"
            >
              {addMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Add Specialization
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Sheet open={!!editTarget} onOpenChange={(open) => { if (!open) setEditTarget(null); }}>
        <SheetContent side="right" className="sm:max-w-md z-[1300]">
          <SheetHeader>
            <SheetTitle>Edit Specialization</SheetTitle>
            <SheetDescription>Update the name of this specialization.</SheetDescription>
          </SheetHeader>
          <SheetBody>
            <div className="space-y-2">
              <Label htmlFor="edit-spec-name">Name</Label>
              <Input
                id="edit-spec-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && editName.trim() && editTarget) {
                    editMutation.mutate({ id: editTarget.id, name: editName.trim() });
                  }
                }}
                data-testid="input-edit-specialization-name"
                autoFocus
              />
            </div>
          </SheetBody>
          <SheetFooter>
            <Button variant="outline" onClick={() => setEditTarget(null)}>Cancel</Button>
            <Button
              onClick={() => editTarget && editMutation.mutate({ id: editTarget.id, name: editName.trim() })}
              disabled={!editName.trim() || editMutation.isPending}
              data-testid="button-save-edit-specialization"
            >
              {editMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Sheet open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <SheetContent side="right" className="sm:max-w-md z-[1300]">
          <SheetHeader>
            <SheetTitle>Delete Specialization</SheetTitle>
            <SheetDescription>
              This will remove <strong>{deleteTarget?.name}</strong> from the directory filters and counselor profile options. Existing profiles that already have this specialization will retain it until they save changes.
            </SheetDescription>
          </SheetHeader>
          <SheetFooter className="mt-6">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete-specialization"
            >
              {deleteMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}

export default function AdminSettingsPage() {
  const { data: settings, isLoading } = useQuery<SettingsData>({
    queryKey: ["/api/admin/settings"],
  });

  return (
    <AdminSidebar>
      <div className="p-6 max-w-4xl">
        <h1 className="text-2xl font-heading font-bold mb-1" data-testid="text-settings-title">
          System Settings
        </h1>
        <p className="text-muted-foreground mb-6">
          Manage integrations and email templates
        </p>

        <Tabs defaultValue="integrations">
          <TabsList data-testid="tabs-settings">
            <TabsTrigger value="integrations" data-testid="tab-integrations">
              Integrations
            </TabsTrigger>
            <TabsTrigger value="templates" data-testid="tab-templates">
              Email Templates
            </TabsTrigger>
            <TabsTrigger value="specializations" data-testid="tab-specializations">
              Specializations
            </TabsTrigger>
          </TabsList>

          <TabsContent value="integrations" className="mt-6">
            {isLoading ? (
              <div className="flex items-center justify-center p-12">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <IntegrationsTab settings={settings || {}} />
            )}
          </TabsContent>

          <TabsContent value="templates" className="mt-6">
            <EmailTemplatesTab />
          </TabsContent>

          <TabsContent value="specializations" className="mt-6">
            <SpecializationsTab />
          </TabsContent>
        </Tabs>
      </div>
    </AdminSidebar>
  );
}

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  type CmsForm,
  type CmsFormField,
  type CmsFormFieldOption,
  type CmsFormFieldType,
  type CmsFormKind,
} from "@shared/schema";
import { ProtectedRoute } from "@/components/shared/protected-route";
import { AdminSidebar } from "./admin-sidebar";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  GripVertical,
  Trash2,
  Mail,
  Save,
  PanelTopOpen,
} from "lucide-react";

type EditableForm = Omit<CmsForm, "createdAt" | "updatedAt">;

const FIELD_LIBRARY: Array<{
  type: CmsFormFieldType;
  label: string;
  description: string;
}> = [
  { type: "text", label: "Single Line Text", description: "Names, short answers, labels, titles." },
  { type: "email", label: "Email", description: "Validated email address field." },
  { type: "textarea", label: "Paragraph Text", description: "Longer messages and open-ended responses." },
  { type: "tel", label: "Phone", description: "Phone number or WhatsApp field." },
  { type: "select", label: "Dropdown", description: "Choose from predefined options." },
];

const KIND_OPTIONS: Array<{ value: CmsFormKind; label: string }> = [
  { value: "contact", label: "Contact" },
  { value: "newsletter", label: "Newsletter" },
  { value: "interest", label: "Interest" },
  { value: "application", label: "Application / System" },
  { value: "custom", label: "Custom" },
];

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function generateId() {
  return Math.random().toString(36).slice(2, 10);
}

function createField(type: CmsFormFieldType): CmsFormField {
  const id = generateId();
  const libraryItem = FIELD_LIBRARY.find((item) => item.type === type);
  const label = libraryItem?.label ?? "Field";
  const baseKey = slugify(label) || "field";

  return {
    id,
    key: `${baseKey}-${id.slice(0, 4)}`,
    label,
    type,
    placeholder: "",
    helpText: "",
    required: false,
    width: type === "textarea" ? "full" : "half",
    options:
      type === "select"
        ? [
            { label: "Option One", value: "option-one" },
            { label: "Option Two", value: "option-two" },
          ]
        : [],
  };
}

function createBlankForm(): EditableForm {
  return {
    id: `draft-${generateId()}`,
    name: "Untitled Form",
    slug: `form-${generateId().slice(0, 6)}`,
    description: "",
    kind: "custom",
    isSystem: false,
    isActive: true,
    fields: [],
    settings: {
      submitButtonText: "Submit",
      successMessage: "Thanks! Your submission has been received.",
      mailchimpEnabled: false,
      mailchimpTag: "",
      notifyAdmins: false,
      storeAsContactMessage: false,
    },
  };
}

function normalizeEditableForm(form: CmsForm): EditableForm {
  return {
    id: form.id,
    name: form.name,
    slug: form.slug,
    description: form.description ?? "",
    kind: form.kind,
    isSystem: Boolean(form.isSystem),
    isActive: Boolean(form.isActive),
    fields: Array.isArray(form.fields) ? form.fields : [],
    settings: {
      submitButtonText:
        typeof form.settings?.submitButtonText === "string" ? form.settings.submitButtonText : "Submit",
      successMessage:
        typeof form.settings?.successMessage === "string"
          ? form.settings.successMessage
          : "Thanks! Your submission has been received.",
      mailchimpEnabled: Boolean(form.settings?.mailchimpEnabled),
      mailchimpTag: typeof form.settings?.mailchimpTag === "string" ? form.settings.mailchimpTag : "",
      notifyAdmins: Boolean(form.settings?.notifyAdmins),
      storeAsContactMessage: Boolean(form.settings?.storeAsContactMessage),
    },
  };
}

function moveItem<T>(items: T[], fromIndex: number, toIndex: number) {
  const next = [...items];
  const [item] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, item);
  return next;
}

export default function AdminFormsPage() {
  return (
    <ProtectedRoute roles={["admin"]}>
      <AdminSidebar>
        <FormsPageContent />
      </AdminSidebar>
    </ProtectedRoute>
  );
}

function FormsPageContent() {
  const { toast } = useToast();
  const [selectedFormId, setSelectedFormId] = useState<string | null>(null);
  const [draft, setDraft] = useState<EditableForm | null>(null);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [draggingFieldType, setDraggingFieldType] = useState<CmsFormFieldType | null>(null);
  const [draggingFieldId, setDraggingFieldId] = useState<string | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);

  const { data: forms = [], isLoading } = useQuery<CmsForm[]>({
    queryKey: ["/api/admin/forms"],
    staleTime: 60_000,
  });

  useEffect(() => {
    if (draft) return;
    if (!selectedFormId && forms.length > 0) {
      setSelectedFormId(forms[0].id);
      setDraft(normalizeEditableForm(forms[0]));
      return;
    }

    if (selectedFormId) {
      const match = forms.find((form) => form.id === selectedFormId);
      if (match) {
        setDraft(normalizeEditableForm(match));
      }
    }
  }, [forms, selectedFormId, draft]);

  const saveMutation = useMutation({
    mutationFn: async (form: EditableForm) => {
      const payload = {
        name: form.name,
        slug: form.slug,
        description: form.description,
        kind: form.kind,
        isSystem: form.isSystem,
        isActive: form.isActive,
        fields: form.fields,
        settings: form.settings,
      };

      if (form.id.startsWith("draft-")) {
        const response = await apiRequest("POST", "/api/admin/forms", payload);
        return (await response.json()) as CmsForm;
      }

      const response = await apiRequest("PUT", `/api/admin/forms/${form.id}`, payload);
      return (await response.json()) as CmsForm;
    },
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/forms"] });
      setSelectedFormId(saved.id);
      setDraft(normalizeEditableForm(saved));
      toast({ title: "Form saved" });
    },
    onError: (error: Error) => {
      toast({
        title: "Unable to save form",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/admin/forms/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/forms"] });
      setSelectedFieldId(null);
      setSelectedFormId(null);
      setDraft(null);
      toast({ title: "Form deleted" });
    },
    onError: (error: Error) => {
      toast({
        title: "Unable to delete form",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const selectedField = useMemo(
    () => draft?.fields.find((field) => field.id === selectedFieldId) ?? null,
    [draft?.fields, selectedFieldId]
  );

  const updateDraft = (updater: (current: EditableForm) => EditableForm) => {
    setDraft((current) => (current ? updater(current) : current));
  };

  const addField = (type: CmsFormFieldType, index?: number) => {
    updateDraft((current) => {
      const field = createField(type);
      const insertAt = typeof index === "number" ? index : current.fields.length;
      const nextFields = [...current.fields];
      nextFields.splice(insertAt, 0, field);
      setSelectedFieldId(field.id);
      return { ...current, fields: nextFields };
    });
  };

  const updateField = (fieldId: string, updates: Partial<CmsFormField>) => {
    updateDraft((current) => ({
      ...current,
      fields: current.fields.map((field) => (field.id === fieldId ? { ...field, ...updates } : field)),
    }));
  };

  const updateFieldOptionsFromText = (fieldId: string, rawValue: string) => {
    const options: CmsFormFieldOption[] = rawValue
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [label, explicitValue] = line.split("|").map((item) => item.trim());
        return {
          label,
          value: explicitValue || slugify(label),
        };
      });

    updateField(fieldId, { options });
  };

  const removeField = (fieldId: string) => {
    updateDraft((current) => ({
      ...current,
      fields: current.fields.filter((field) => field.id !== fieldId),
    }));
    if (selectedFieldId === fieldId) {
      setSelectedFieldId(null);
    }
  };

  const onDropFieldAtIndex = (index: number) => {
    if (draggingFieldType) {
      addField(draggingFieldType, index);
    } else if (draggingFieldId && draft) {
      const currentIndex = draft.fields.findIndex((field) => field.id === draggingFieldId);
      if (currentIndex !== -1) {
        updateDraft((current) => ({
          ...current,
          fields: moveItem(current.fields, currentIndex, index),
        }));
      }
    }

    setDraggingFieldType(null);
    setDraggingFieldId(null);
    setDropIndex(null);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-heading font-semibold" data-testid="text-admin-forms-title">
            Forms
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Build reusable forms, route submissions, and assign per-form Mailchimp tags for content blocks, widgets, and system workflows.
          </p>
        </div>
        <Button
          onClick={() => {
            const blank = createBlankForm();
            setSelectedFormId(blank.id);
            setSelectedFieldId(null);
            setDraft(blank);
          }}
          data-testid="button-create-form"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Form
        </Button>
      </div>

      <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="text-base">Form Library</CardTitle>
            <CardDescription>System forms, newsletter forms, and reusable embeds all live here.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading forms…</p>
            ) : (
              forms.map((form) => {
                const active = selectedFormId === form.id;
                return (
                  <button
                    key={form.id}
                    type="button"
                    onClick={() => {
                      setSelectedFormId(form.id);
                      setSelectedFieldId(null);
                      setDraft(normalizeEditableForm(form));
                    }}
                    className={cn(
                      "w-full rounded-lg border px-3 py-3 text-left transition-colors",
                      active ? "border-primary bg-primary/5" : "hover:bg-muted/40"
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-sm">{form.name}</p>
                        <p className="text-xs text-muted-foreground mt-1">{form.slug}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        {form.isSystem ? <Badge variant="secondary">System</Badge> : null}
                        <Badge variant={form.isActive ? "default" : "outline"}>{form.isActive ? "Active" : "Inactive"}</Badge>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </CardContent>
        </Card>

        {draft ? (
          <div className="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_340px]">
            <div className="space-y-6">
              <Card>
                <CardHeader className="flex flex-row items-start justify-between gap-4">
                  <div>
                    <CardTitle className="text-base">Form Settings</CardTitle>
                    <CardDescription>Control the form identity, success behavior, and Mailchimp mapping.</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    {!draft.isSystem ? (
                      <Button
                        type="button"
                        variant="outline"
                        className="text-destructive"
                        onClick={() => deleteMutation.mutate(draft.id)}
                        disabled={deleteMutation.isPending || draft.id.startsWith("draft-")}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </Button>
                    ) : null}
                    <Button onClick={() => saveMutation.mutate(draft)} disabled={saveMutation.isPending}>
                      <Save className="h-4 w-4 mr-2" />
                      Save Form
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label>Name</Label>
                      <Input
                        value={draft.name}
                        onChange={(event) =>
                          updateDraft((current) => ({
                            ...current,
                            name: event.target.value,
                            slug:
                              current.id.startsWith("draft-") && (!current.slug || current.slug.startsWith("form-"))
                                ? slugify(event.target.value)
                                : current.slug,
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Slug</Label>
                      <Input
                        value={draft.slug}
                        onChange={(event) =>
                          updateDraft((current) => ({ ...current, slug: slugify(event.target.value) }))
                        }
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label>Form Type</Label>
                      <Select
                        value={draft.kind}
                        onValueChange={(value: CmsFormKind) =>
                          updateDraft((current) => ({ ...current, kind: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {KIND_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Active</Label>
                      <div className="flex h-10 items-center rounded-md border px-3">
                        <Switch
                          checked={draft.isActive}
                          onCheckedChange={(checked) =>
                            updateDraft((current) => ({ ...current, isActive: checked }))
                          }
                        />
                        <span className="ml-3 text-sm text-muted-foreground">
                          {draft.isActive ? "Form is live and embeddable" : "Form is hidden from public usage"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Description</Label>
                    <Textarea
                      value={draft.description ?? ""}
                      onChange={(event) =>
                        updateDraft((current) => ({ ...current, description: event.target.value }))
                      }
                      rows={3}
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label>Submit Button Text</Label>
                      <Input
                        value={String(draft.settings.submitButtonText ?? "Submit")}
                        onChange={(event) =>
                          updateDraft((current) => ({
                            ...current,
                            settings: { ...current.settings, submitButtonText: event.target.value },
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Success Message</Label>
                      <Textarea
                        value={String(draft.settings.successMessage ?? "")}
                        onChange={(event) =>
                          updateDraft((current) => ({
                            ...current,
                            settings: { ...current.settings, successMessage: event.target.value },
                          }))
                        }
                        rows={2}
                      />
                    </div>
                  </div>

                  <div className="rounded-xl border bg-muted/20 p-4 space-y-4">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-primary" />
                      <div>
                        <p className="text-sm font-semibold">Mailchimp Routing</p>
                        <p className="text-xs text-muted-foreground">
                          Each form owns its own Mailchimp tag. Credentials stay in Integrations.
                        </p>
                      </div>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label>Mailchimp Enabled</Label>
                        <div className="flex h-10 items-center rounded-md border px-3">
                          <Switch
                            checked={Boolean(draft.settings.mailchimpEnabled)}
                            onCheckedChange={(checked) =>
                              updateDraft((current) => ({
                                ...current,
                                settings: { ...current.settings, mailchimpEnabled: checked },
                              }))
                            }
                          />
                          <span className="ml-3 text-sm text-muted-foreground">
                            Sync submissions to Mailchimp
                          </span>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label>Mailchimp Tag</Label>
                        <Input
                          value={String(draft.settings.mailchimpTag ?? "")}
                          onChange={(event) =>
                            updateDraft((current) => ({
                              ...current,
                              settings: { ...current.settings, mailchimpTag: event.target.value },
                            }))
                          }
                          placeholder="TCK Newsletter"
                        />
                      </div>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="flex h-10 items-center rounded-md border px-3">
                        <Switch
                          checked={Boolean(draft.settings.notifyAdmins)}
                          onCheckedChange={(checked) =>
                            updateDraft((current) => ({
                              ...current,
                              settings: { ...current.settings, notifyAdmins: checked },
                            }))
                          }
                        />
                        <span className="ml-3 text-sm text-muted-foreground">Email admins on submission</span>
                      </div>
                      <div className="flex h-10 items-center rounded-md border px-3">
                        <Switch
                          checked={Boolean(draft.settings.storeAsContactMessage)}
                          onCheckedChange={(checked) =>
                            updateDraft((current) => ({
                              ...current,
                              settings: { ...current.settings, storeAsContactMessage: checked },
                            }))
                          }
                        />
                        <span className="ml-3 text-sm text-muted-foreground">Store in contact inbox</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Form Builder</CardTitle>
                  <CardDescription>
                    Drag fields in from the library or click to add them. Drag existing fields to reorder the form canvas.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {FIELD_LIBRARY.map((item) => (
                      <button
                        key={item.type}
                        type="button"
                        draggable
                        onDragStart={(event) => {
                          event.dataTransfer.setData("text/plain", item.type);
                          setDraggingFieldType(item.type);
                        }}
                        onDragEnd={() => {
                          setDraggingFieldType(null);
                          setDropIndex(null);
                        }}
                        onClick={() => addField(item.type)}
                        className="rounded-lg border border-dashed px-4 py-3 text-left transition-colors hover:bg-muted/40"
                      >
                        <div className="flex items-start gap-3">
                          <PanelTopOpen className="mt-0.5 h-4 w-4 text-primary" />
                          <div>
                            <p className="text-sm font-semibold">{item.label}</p>
                            <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>

                  <div className="rounded-xl border bg-muted/10 p-4">
                    {draft.fields.length === 0 ? (
                      <div
                        className="rounded-lg border border-dashed px-6 py-12 text-center text-sm text-muted-foreground"
                        onDragOver={(event) => {
                          event.preventDefault();
                          setDropIndex(0);
                        }}
                        onDrop={(event) => {
                          event.preventDefault();
                          onDropFieldAtIndex(0);
                        }}
                      >
                        Drop a field here or click a field from the library to start building this form.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {draft.fields.map((field, index) => (
                          <div key={field.id} className="space-y-3">
                            <div
                              className={cn(
                                "h-2 rounded-full transition-colors",
                                dropIndex === index ? "bg-primary/40" : "bg-transparent"
                              )}
                              onDragOver={(event) => {
                                event.preventDefault();
                                setDropIndex(index);
                              }}
                              onDrop={(event) => {
                                event.preventDefault();
                                onDropFieldAtIndex(index);
                              }}
                            />
                            <div
                              draggable
                              onDragStart={() => setDraggingFieldId(field.id)}
                              onDragEnd={() => {
                                setDraggingFieldId(null);
                                setDropIndex(null);
                              }}
                              onClick={() => setSelectedFieldId(field.id)}
                              className={cn(
                                "rounded-xl border bg-background p-4 transition-colors",
                                selectedFieldId === field.id ? "border-primary ring-2 ring-primary/10" : "hover:bg-muted/20"
                              )}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex items-start gap-3">
                                  <GripVertical className="mt-0.5 h-4 w-4 text-muted-foreground" />
                                  <div>
                                    <p className="text-sm font-semibold">{field.label || "Untitled Field"}</p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                      {field.type} • {field.key}
                                      {field.required ? " • required" : ""}
                                      {field.width === "half" ? " • half width" : " • full width"}
                                    </p>
                                  </div>
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    removeField(field.id);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                        <div
                          className={cn(
                            "h-2 rounded-full transition-colors",
                            dropIndex === draft.fields.length ? "bg-primary/40" : "bg-transparent"
                          )}
                          onDragOver={(event) => {
                            event.preventDefault();
                            setDropIndex(draft.fields.length);
                          }}
                          onDrop={(event) => {
                            event.preventDefault();
                            onDropFieldAtIndex(draft.fields.length);
                          }}
                        />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="h-fit">
              <CardHeader>
                <CardTitle className="text-base">Field Settings</CardTitle>
                <CardDescription>
                  Select a field from the form canvas to edit its label, validation, width, and options.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedField ? (
                  <>
                    <div className="space-y-1.5">
                      <Label>Label</Label>
                      <Input
                        value={selectedField.label}
                        onChange={(event) => updateField(selectedField.id, { label: event.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Field Key</Label>
                      <Input
                        value={selectedField.key}
                        onChange={(event) =>
                          updateField(selectedField.id, { key: slugify(event.target.value) || selectedField.key })
                        }
                      />
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label>Field Type</Label>
                        <Select
                          value={selectedField.type}
                          onValueChange={(value: CmsFormFieldType) =>
                            updateField(selectedField.id, {
                              type: value,
                              options:
                                value === "select"
                                  ? selectedField.options?.length
                                    ? selectedField.options
                                    : [
                                        { label: "Option One", value: "option-one" },
                                        { label: "Option Two", value: "option-two" },
                                      ]
                                  : [],
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {FIELD_LIBRARY.map((item) => (
                              <SelectItem key={item.type} value={item.type}>
                                {item.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label>Width</Label>
                        <Select
                          value={selectedField.width}
                          onValueChange={(value: "full" | "half") =>
                            updateField(selectedField.id, { width: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="full">Full Width</SelectItem>
                            <SelectItem value="half">Half Width</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Placeholder</Label>
                      <Input
                        value={selectedField.placeholder ?? ""}
                        onChange={(event) => updateField(selectedField.id, { placeholder: event.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Help Text</Label>
                      <Textarea
                        rows={2}
                        value={selectedField.helpText ?? ""}
                        onChange={(event) => updateField(selectedField.id, { helpText: event.target.value })}
                      />
                    </div>
                    <div className="flex h-10 items-center rounded-md border px-3">
                      <Switch
                        checked={Boolean(selectedField.required)}
                        onCheckedChange={(checked) => updateField(selectedField.id, { required: checked })}
                      />
                      <span className="ml-3 text-sm text-muted-foreground">Required field</span>
                    </div>
                    {selectedField.type === "select" ? (
                      <div className="space-y-1.5">
                        <Label>Options</Label>
                        <Textarea
                          rows={5}
                          value={(selectedField.options ?? [])
                            .map((option) => `${option.label}${option.value !== slugify(option.label) ? `|${option.value}` : ""}`)
                            .join("\n")}
                          onChange={(event) => updateFieldOptionsFromText(selectedField.id, event.target.value)}
                          placeholder={"Option One\nOption Two\nLabel|custom-value"}
                        />
                        <p className="text-xs text-muted-foreground">
                          One option per line. Use <code>Label|value</code> if you need a custom stored value.
                        </p>
                      </div>
                    ) : null}
                  </>
                ) : (
                  <div className="rounded-lg border border-dashed px-4 py-8 text-sm text-muted-foreground">
                    Choose a field from the canvas to edit its settings. This is where we can fine-tune labels, placeholders, validation, and dropdown options.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              Select a form from the library or create a new one to start building.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

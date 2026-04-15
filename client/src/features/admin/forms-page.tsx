import { useEffect, useMemo, useState, type ElementType } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  type CmsForm,
  type CmsFormField,
  type CmsFormFieldConfig,
  type CmsFormFieldOption,
  type CmsFormFieldType,
  type CmsFormKind,
  type CmsFormListColumn,
  cmsFormFieldConfigSchema,
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CmsImageUpload } from "./cms/components/cms-image-upload";
import {
  Plus,
  GripVertical,
  Trash2,
  Mail,
  Save,
  PanelTopOpen,
  Type,
  Pilcrow,
  Hash,
  CheckSquare,
  CircleDot,
  EyeOff,
  Code2,
  SeparatorHorizontal,
  FileStack,
  Image,
  UserRound,
  CalendarDays,
  Clock3,
  Phone,
  MapPin,
  Link2,
  ListChecks,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  LayoutTemplate,
  ArrowLeft,
} from "lucide-react";

type EditableForm = Omit<CmsForm, "createdAt" | "updatedAt">;

type FieldLibraryItem = {
  type: CmsFormFieldType;
  label: string;
  description: string;
  icon: ElementType;
  group: "standard" | "advanced";
};

const FIELD_LIBRARY: FieldLibraryItem[] = [
  { type: "text", label: "Single Line Text", description: "Names, titles, and short answers.", icon: Type, group: "standard" },
  { type: "textarea", label: "Paragraph Text", description: "Longer written responses.", icon: Pilcrow, group: "standard" },
  { type: "select", label: "Drop Down", description: "One choice from a menu.", icon: ChevronDown, group: "standard" },
  { type: "number", label: "Number", description: "Numeric values and counts.", icon: Hash, group: "standard" },
  { type: "checkbox", label: "Checkboxes", description: "Multiple selectable choices.", icon: CheckSquare, group: "standard" },
  { type: "radio", label: "Radio Buttons", description: "Choose one option from a list.", icon: CircleDot, group: "standard" },
  { type: "hidden", label: "Hidden", description: "Pass along hidden values in the submission.", icon: EyeOff, group: "standard" },
  { type: "html", label: "HTML / Embed", description: "Raw HTML, widget embeds, or iframe code.", icon: Code2, group: "standard" },
  { type: "section", label: "Section", description: "Break the form into titled sections with dividers.", icon: SeparatorHorizontal, group: "standard" },
  { type: "page", label: "Page", description: "Create multi-step forms with progress.", icon: FileStack, group: "standard" },
  { type: "image-choice", label: "Image Choice", description: "Visual choices with images.", icon: Image, group: "standard" },
  { type: "name", label: "Name", description: "Full name or split first and last name.", icon: UserRound, group: "advanced" },
  { type: "date", label: "Date", description: "Date picker style field.", icon: CalendarDays, group: "advanced" },
  { type: "time", label: "Time", description: "Time-specific input.", icon: Clock3, group: "advanced" },
  { type: "tel", label: "Phone", description: "Phone or WhatsApp number.", icon: Phone, group: "advanced" },
  { type: "address", label: "Address", description: "Street, city, state, postal code, and country.", icon: MapPin, group: "advanced" },
  { type: "website", label: "Website", description: "URL field for websites or social links.", icon: Link2, group: "advanced" },
  { type: "email", label: "Email", description: "Validated email address.", icon: Mail, group: "advanced" },
  { type: "multiselect", label: "Multi Select", description: "Select multiple options from one field.", icon: ListChecks, group: "advanced" },
  { type: "consent", label: "Consent", description: "Agreement checkbox with supporting copy.", icon: ShieldCheck, group: "advanced" },
  { type: "list", label: "List", description: "Repeatable rows with one or more columns.", icon: LayoutTemplate, group: "advanced" },
];

const FIELD_LIBRARY_GROUPS: Array<{ key: "standard" | "advanced"; label: string }> = [
  { key: "standard", label: "Standard Fields" },
  { key: "advanced", label: "Advanced Fields" },
];

const KIND_OPTIONS: Array<{ value: CmsFormKind; label: string }> = [
  { value: "contact", label: "Contact" },
  { value: "newsletter", label: "Newsletter" },
  { value: "interest", label: "Interest" },
  { value: "application", label: "Application / System" },
  { value: "custom", label: "Custom" },
];

const FIELD_TYPE_OPTIONS = FIELD_LIBRARY.map((item) => ({ value: item.type, label: item.label }));
const CHOICE_LAYOUT_OPTIONS = [
  { value: "stacked", label: "Stacked" },
  { value: "inline", label: "Inline" },
  { value: "grid", label: "Grid" },
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

function getFieldLibraryItem(type: CmsFormFieldType) {
  return FIELD_LIBRARY.find((item) => item.type === type);
}

function supportsChoices(type: CmsFormFieldType) {
  return ["select", "multiselect", "checkbox", "radio", "image-choice"].includes(type);
}

function isStructuralField(type: CmsFormFieldType) {
  return ["html", "section", "page"].includes(type);
}

function isFullWidthField(type: CmsFormFieldType) {
  return ["textarea", "html", "section", "page", "address", "consent", "list", "image-choice"].includes(type);
}

function createDefaultOptions(type: CmsFormFieldType): CmsFormFieldOption[] {
  if (!supportsChoices(type)) return [];
  return [
    { label: "Option One", value: "option-one", imageUrl: "" },
    { label: "Option Two", value: "option-two", imageUrl: "" },
  ];
}

function createDefaultListColumns(): CmsFormListColumn[] {
  return [
    { id: generateId(), label: "Item", placeholder: "" },
  ];
}

function createDefaultConfig(type: CmsFormFieldType): Partial<CmsFormFieldConfig> {
  switch (type) {
    case "name":
      return { nameFormat: "full" };
    case "section":
      return {
        sectionTitle: "Section Title",
        sectionSubtitle: "Optional supporting description",
        showDivider: true,
        dividerColor: "#e2e8f0",
      };
    case "html":
      return {
        htmlContent: "<p>Add custom instructions, embed code, or HTML here.</p>",
      };
    case "page":
      return {
        pageTitle: "Step Title",
        pageDescription: "Optional progress guidance or step introduction.",
        nextButtonText: "Next",
        previousButtonText: "Previous",
      };
    case "image-choice":
      return {
        selectionMode: "single",
        choiceLayout: "grid",
      };
    case "checkbox":
    case "radio":
    case "select":
    case "multiselect":
      return {
        choiceLayout: type === "select" || type === "multiselect" ? "stacked" : "inline",
      };
    case "consent":
      return {
        consentCheckboxLabel: "I agree to the terms above.",
        consentDescription: "Explain what the person is agreeing to before they submit.",
      };
    case "address":
      return {
        showStreet2: false,
        showCountry: true,
        addressLayout: "stacked",
      };
    case "list":
      return {
        listColumns: createDefaultListColumns(),
        maxRows: 10,
      };
    case "hidden":
      return {
        defaultValue: "",
      };
    case "time":
      return {
        timeFormat: "12",
      };
    default:
      return {};
  }
}

function normalizeField(field: CmsFormField): CmsFormField {
  return {
    ...field,
    placeholder: field.placeholder ?? "",
    helpText: field.helpText ?? "",
    required: Boolean(field.required),
    width: field.width ?? (isFullWidthField(field.type) ? "full" : "half"),
    options: Array.isArray(field.options) ? field.options.map((option) => ({
      label: option.label,
      value: option.value,
      imageUrl: option.imageUrl ?? "",
    })) : createDefaultOptions(field.type),
    config: cmsFormFieldConfigSchema.parse({
      ...createDefaultConfig(field.type),
      ...(typeof field.config === "object" && field.config ? field.config : {}),
    }),
  };
}

function createField(type: CmsFormFieldType): CmsFormField {
  const id = generateId();
  const libraryItem = getFieldLibraryItem(type);
  const label = libraryItem?.label ?? "Field";
  const baseKey = slugify(label) || "field";

  return normalizeField({
    id,
    key: `${baseKey}-${id.slice(0, 4)}`,
    label,
    type,
    placeholder: "",
    helpText: "",
    required: !isStructuralField(type) && type !== "hidden",
    width: isFullWidthField(type) ? "full" : "half",
    options: createDefaultOptions(type),
    config: cmsFormFieldConfigSchema.parse(createDefaultConfig(type)),
  });
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
    fields: Array.isArray(form.fields) ? form.fields.map(normalizeField) : [],
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
  const adjustedIndex = fromIndex < toIndex ? toIndex - 1 : toIndex;
  next.splice(Math.max(0, adjustedIndex), 0, item);
  return next;
}

function choiceSummary(field: CmsFormField) {
  const count = field.options?.length ?? 0;
  return count > 0 ? `${count} choice${count === 1 ? "" : "s"}` : "No choices yet";
}

function fieldSubtitle(field: CmsFormField) {
  if (field.type === "section") return "Section break";
  if (field.type === "page") return "Page break / step";
  if (field.type === "html") return "HTML / embed block";
  if (supportsChoices(field.type)) return choiceSummary(field);
  if (field.type === "name" && field.config?.nameFormat === "split") return "First and last name";
  if (field.type === "list") return `${field.config?.listColumns?.length ?? 0} column list`;
  return field.required ? "Required field" : "Optional field";
}

function FieldLibraryCard({
  item,
  onAdd,
  onDragStart,
  onDragEnd,
}: {
  item: FieldLibraryItem;
  onAdd: (type: CmsFormFieldType) => void;
  onDragStart: (type: CmsFormFieldType) => void;
  onDragEnd: () => void;
}) {
  const Icon = item.icon;

  return (
    <button
      type="button"
      draggable
      onClick={() => onAdd(item.type)}
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = "copyMove";
        event.dataTransfer.setData("text/plain", item.type);
        onDragStart(item.type);
      }}
      onDragEnd={onDragEnd}
      className="flex w-full items-start gap-3 rounded-xl border bg-background px-3 py-3 text-left transition-colors hover:border-primary hover:bg-primary/5"
    >
      <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-4.5 w-4.5" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold leading-tight">{item.label}</p>
        <p className="mt-1 text-xs leading-snug text-muted-foreground">{item.description}</p>
      </div>
    </button>
  );
}

function ToggleCardGroup({
  title,
  open,
  onToggle,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between text-left"
      >
        <h3 className="text-base font-semibold">{title}</h3>
        {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>
      {open ? children : null}
    </div>
  );
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
  const [formSettingsOpen, setFormSettingsOpen] = useState(true);
  const [openGroups, setOpenGroups] = useState<Record<"standard" | "advanced", boolean>>({
    standard: true,
    advanced: true,
  });

  const { data: forms = [], isLoading } = useQuery<CmsForm[]>({
    queryKey: ["/api/admin/forms"],
    staleTime: 60_000,
  });

  useEffect(() => {
    if (draft) return;
    if (!selectedFormId && forms.length > 0) {
      setSelectedFormId(forms[0].id);
      setFormSettingsOpen(true);
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

  const groupedFieldLibrary = useMemo(
    () =>
      FIELD_LIBRARY_GROUPS.map((group) => ({
        ...group,
        items: FIELD_LIBRARY.filter((item) => item.group === group.key),
      })),
    []
  );

  const selectedFieldLibraryItem = selectedField ? getFieldLibraryItem(selectedField.type) : null;

  const updateDraft = (updater: (current: EditableForm) => EditableForm) => {
    setDraft((current) => (current ? updater(current) : current));
  };

  const updateField = (fieldId: string, updates: Partial<CmsFormField>) => {
    updateDraft((current) => ({
      ...current,
      fields: current.fields.map((field) =>
        field.id === fieldId ? normalizeField({ ...field, ...updates }) : field
      ),
    }));
  };

  const updateFieldConfig = (fieldId: string, updates: Partial<CmsFormFieldConfig>) => {
    updateDraft((current) => ({
      ...current,
      fields: current.fields.map((field) =>
        field.id === fieldId
          ? normalizeField({
              ...field,
              config: { ...(field.config ?? {}), ...updates },
            })
          : field
      ),
    }));
  };

  const replaceFieldType = (fieldId: string, type: CmsFormFieldType) => {
    updateDraft((current) => ({
      ...current,
      fields: current.fields.map((field) =>
        field.id === fieldId
          ? normalizeField({
              ...field,
              type,
              options: createDefaultOptions(type),
              config: cmsFormFieldConfigSchema.parse(createDefaultConfig(type)),
              width: isFullWidthField(type) ? "full" : "half",
              required: !isStructuralField(type) && type !== "hidden" ? field.required : false,
            })
          : field
      ),
    }));
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

  const removeField = (fieldId: string) => {
    updateDraft((current) => ({
      ...current,
      fields: current.fields.filter((field) => field.id !== fieldId),
    }));
    if (selectedFieldId === fieldId) {
      setSelectedFieldId(null);
    }
  };

  const updateChoice = (fieldId: string, optionId: string, updates: Partial<CmsFormFieldOption>) => {
    updateDraft((current) => ({
      ...current,
      fields: current.fields.map((field) =>
        field.id === fieldId
          ? normalizeField({
              ...field,
              options: (field.options ?? []).map((option) =>
                option.value === optionId ? { ...option, ...updates } : option
              ),
            })
          : field
      ),
    }));
  };

  const addChoice = (fieldId: string) => {
    updateDraft((current) => ({
      ...current,
      fields: current.fields.map((field) =>
        field.id === fieldId
          ? normalizeField({
              ...field,
              options: [
                ...(field.options ?? []),
                { label: "New Option", value: slugify(`new-option-${generateId().slice(0, 4)}`), imageUrl: "" },
              ],
            })
          : field
      ),
    }));
  };

  const removeChoice = (fieldId: string, optionId: string) => {
    updateDraft((current) => ({
      ...current,
      fields: current.fields.map((field) =>
        field.id === fieldId
          ? normalizeField({
              ...field,
              options: (field.options ?? []).filter((option) => option.value !== optionId),
            })
          : field
      ),
    }));
  };

  const addListColumn = (fieldId: string) => {
    const nextColumn: CmsFormListColumn = {
      id: generateId(),
      label: "Column",
      placeholder: "",
    };
    const listColumns = Array.isArray(selectedField?.config?.listColumns) ? selectedField.config.listColumns : [];
    updateFieldConfig(fieldId, { listColumns: [...listColumns, nextColumn] });
  };

  const updateListColumn = (fieldId: string, columnId: string, updates: Partial<CmsFormListColumn>) => {
    const listColumns = Array.isArray(selectedField?.config?.listColumns) ? selectedField.config.listColumns : [];
    updateFieldConfig(fieldId, {
      listColumns: listColumns.map((column) => (column.id === columnId ? { ...column, ...updates } : column)),
    });
  };

  const removeListColumn = (fieldId: string, columnId: string) => {
    const listColumns = Array.isArray(selectedField?.config?.listColumns) ? selectedField.config.listColumns : [];
    updateFieldConfig(fieldId, {
      listColumns: listColumns.filter((column) => column.id !== columnId),
    });
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
        setSelectedFieldId(draggingFieldId);
      }
    }

    setDraggingFieldType(null);
    setDraggingFieldId(null);
    setDropIndex(null);
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-semibold" data-testid="text-admin-forms-title">
            Forms
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Build reusable forms, wire them to Mailchimp tags, and assign them to blocks, widgets, and system workflows.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {draft ? (
            <Button onClick={() => saveMutation.mutate(draft)} disabled={saveMutation.isPending}>
              <Save className="mr-2 h-4 w-4" />
              Save Form
            </Button>
          ) : null}
          <Button
            onClick={() => {
              const blank = createBlankForm();
              setSelectedFormId(blank.id);
              setSelectedFieldId(null);
              setFormSettingsOpen(true);
              setDraft(blank);
            }}
            data-testid="button-create-form"
          >
            <Plus className="mr-2 h-4 w-4" />
            New Form
          </Button>
        </div>
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
                      setFormSettingsOpen(true);
                      setDraft(normalizeEditableForm(form));
                    }}
                    className={cn(
                      "w-full rounded-lg border px-3 py-3 text-left transition-colors",
                      active ? "border-primary bg-primary/5" : "hover:bg-muted/40"
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium">{form.name}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{form.slug}</p>
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
          <div className="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_380px]">
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
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </Button>
                    ) : null}
                    <Button type="button" variant="outline" size="icon" onClick={() => setFormSettingsOpen((current) => !current)}>
                      {formSettingsOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                  </div>
                </CardHeader>
                {formSettingsOpen ? <CardContent className="space-y-5">
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
                        onChange={(event) => updateDraft((current) => ({ ...current, slug: slugify(event.target.value) }))}
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label>Form Type</Label>
                      <Select value={draft.kind} onValueChange={(value: CmsFormKind) => updateDraft((current) => ({ ...current, kind: value }))}>
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
                          onCheckedChange={(checked) => updateDraft((current) => ({ ...current, isActive: checked }))}
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
                      rows={3}
                      value={draft.description ?? ""}
                      onChange={(event) => updateDraft((current) => ({ ...current, description: event.target.value }))}
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
                        rows={2}
                        value={String(draft.settings.successMessage ?? "")}
                        onChange={(event) =>
                          updateDraft((current) => ({
                            ...current,
                            settings: { ...current.settings, successMessage: event.target.value },
                          }))
                        }
                      />
                    </div>
                  </div>

                  <div className="space-y-4 rounded-xl border bg-muted/20 p-4">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-primary" />
                      <div>
                        <p className="text-sm font-semibold">Mailchimp Routing</p>
                        <p className="text-xs text-muted-foreground">Each form owns its own Mailchimp tag. Credentials stay in Integrations.</p>
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
                          <span className="ml-3 text-sm text-muted-foreground">Sync submissions to Mailchimp</span>
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
                </CardContent> : null}
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Form Canvas</CardTitle>
                  <CardDescription>
                    Drag fields into order here. Select a field to edit its settings in the right sidebar.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div
                    className="rounded-xl border bg-muted/10 p-4"
                    onDragOver={(event) => {
                      event.preventDefault();
                      if (draft.fields.length > 0 && dropIndex === null) {
                        setDropIndex(draft.fields.length);
                      }
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                      onDropFieldAtIndex(dropIndex ?? draft.fields.length);
                    }}
                  >
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
                        Drag a field from the right sidebar or click one there to start building this form.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {draft.fields.map((field, index) => {
                          const libraryItem = getFieldLibraryItem(field.type);
                          const Icon = libraryItem?.icon ?? PanelTopOpen;

                          return (
                            <div key={field.id} className="space-y-3">
                              <div
                                className={cn("h-2 rounded-full transition-colors", dropIndex === index ? "bg-primary/40" : "bg-transparent")}
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
                                onDragStart={(event) => {
                                  event.dataTransfer.effectAllowed = "move";
                                  event.dataTransfer.setData("text/plain", field.id);
                                  setDraggingFieldId(field.id);
                                }}
                                onDragEnd={() => {
                                  setDraggingFieldId(null);
                                  setDropIndex(null);
                                }}
                                onDragOver={(event) => {
                                  event.preventDefault();
                                  setDropIndex(index);
                                }}
                                onDrop={(event) => {
                                  event.preventDefault();
                                  onDropFieldAtIndex(index);
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
                                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                      <Icon className="h-4 w-4" />
                                    </div>
                                    <div>
                                      <div className="flex flex-wrap items-center gap-2">
                                        <p className="text-sm font-semibold">{field.label || "Untitled Field"}</p>
                                        <Badge variant="outline" className="text-[10px] uppercase">{field.type}</Badge>
                                      </div>
                                      <p className="mt-1 text-xs text-muted-foreground">
                                        {fieldSubtitle(field)} • {field.width === "half" ? "Half width" : "Full width"}
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
                          );
                        })}
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

            <Card className="h-fit 2xl:sticky 2xl:top-24">
              <CardHeader>
                <CardTitle className="text-base">{selectedField ? "Field Settings" : "Add Fields"}</CardTitle>
                <CardDescription>
                  {selectedField
                    ? "Update the selected field’s labels, behavior, and advanced configuration here."
                    : "Standard and advanced fields live here. Click or drag them into the form canvas."}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedField ? (
                  <>
                    <Button type="button" variant="outline" className="w-full justify-center" onClick={() => setSelectedFieldId(null)}>
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Back to Fields
                    </Button>
                    <div className="flex items-start gap-3 rounded-xl border bg-muted/20 p-3">
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          {selectedFieldLibraryItem ? <selectedFieldLibraryItem.icon className="h-4.5 w-4.5" /> : <PanelTopOpen className="h-4.5 w-4.5" />}
                        </div>
                        <div>
                          <p className="text-sm font-semibold leading-tight">{selectedField.label || "Untitled Field"}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{selectedFieldLibraryItem?.label ?? selectedField.type}</p>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Label</Label>
                      <Input value={selectedField.label} onChange={(event) => updateField(selectedField.id, { label: event.target.value })} />
                    </div>

                    <div className="space-y-1.5">
                      <Label>Field Key</Label>
                      <Input
                        value={selectedField.key}
                        onChange={(event) => updateField(selectedField.id, { key: slugify(event.target.value) || selectedField.key })}
                      />
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label>Field Type</Label>
                        <Select value={selectedField.type} onValueChange={(value: CmsFormFieldType) => replaceFieldType(selectedField.id, value)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {FIELD_TYPE_OPTIONS.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      {!isStructuralField(selectedField.type) && selectedField.type !== "hidden" ? (
                        <div className="space-y-1.5">
                          <Label>Width</Label>
                          <Select value={selectedField.width} onValueChange={(value: "full" | "half") => updateField(selectedField.id, { width: value })}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="full">Full Width</SelectItem>
                              <SelectItem value="half">Half Width</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      ) : null}
                    </div>

                    {!["section", "page", "html", "consent", "hidden", "checkbox", "radio", "select", "multiselect", "image-choice", "list"].includes(selectedField.type) ? (
                      <div className="space-y-1.5">
                        <Label>Placeholder</Label>
                        <Input
                          value={selectedField.placeholder ?? ""}
                          onChange={(event) => updateField(selectedField.id, { placeholder: event.target.value })}
                        />
                      </div>
                    ) : null}

                    {!["html", "section", "page", "hidden"].includes(selectedField.type) ? (
                      <div className="space-y-1.5">
                        <Label>Help Text</Label>
                        <Textarea
                          rows={2}
                          value={selectedField.helpText ?? ""}
                          onChange={(event) => updateField(selectedField.id, { helpText: event.target.value })}
                        />
                      </div>
                    ) : null}

                    {!isStructuralField(selectedField.type) && selectedField.type !== "hidden" ? (
                      <div className="flex h-10 items-center rounded-md border px-3">
                        <Switch
                          checked={Boolean(selectedField.required)}
                          onCheckedChange={(checked) => updateField(selectedField.id, { required: checked })}
                        />
                        <span className="ml-3 text-sm text-muted-foreground">Required field</span>
                      </div>
                    ) : null}

                    {selectedField.type === "name" ? (
                      <div className="space-y-1.5">
                        <Label>Name Format</Label>
                        <Select
                          value={selectedField.config?.nameFormat === "split" ? "split" : "full"}
                          onValueChange={(value: "full" | "split") => updateFieldConfig(selectedField.id, { nameFormat: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="full">Full Name</SelectItem>
                            <SelectItem value="split">First + Last Name</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    ) : null}

                    {selectedField.type === "section" ? (
                      <div className="space-y-4 rounded-xl border bg-muted/20 p-4">
                        <div className="space-y-1.5">
                          <Label>Section Title</Label>
                          <Input
                            value={String(selectedField.config?.sectionTitle ?? "")}
                            onChange={(event) => updateFieldConfig(selectedField.id, { sectionTitle: event.target.value })}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label>Section Subtitle</Label>
                          <Textarea
                            rows={2}
                            value={String(selectedField.config?.sectionSubtitle ?? "")}
                            onChange={(event) => updateFieldConfig(selectedField.id, { sectionSubtitle: event.target.value })}
                          />
                        </div>
                        <div className="flex h-10 items-center rounded-md border px-3">
                          <Switch
                            checked={Boolean(selectedField.config?.showDivider)}
                            onCheckedChange={(checked) => updateFieldConfig(selectedField.id, { showDivider: checked })}
                          />
                          <span className="ml-3 text-sm text-muted-foreground">Show horizontal rule</span>
                        </div>
                        <div className="space-y-1.5">
                          <Label>Divider Color</Label>
                          <Input
                            type="color"
                            value={String(selectedField.config?.dividerColor ?? "#e2e8f0")}
                            onChange={(event) => updateFieldConfig(selectedField.id, { dividerColor: event.target.value })}
                          />
                        </div>
                      </div>
                    ) : null}

                    {selectedField.type === "html" ? (
                      <div className="space-y-1.5 rounded-xl border bg-muted/20 p-4">
                        <Label>HTML / Embed Code</Label>
                        <Textarea
                          rows={8}
                          value={String(selectedField.config?.htmlContent ?? "")}
                          onChange={(event) => updateFieldConfig(selectedField.id, { htmlContent: event.target.value })}
                          placeholder="<iframe ...></iframe>"
                        />
                        <p className="text-xs text-muted-foreground">
                          Use this for custom instructions, trusted 3rd-party embeds, or raw HTML snippets inside a form.
                        </p>
                      </div>
                    ) : null}

                    {selectedField.type === "page" ? (
                      <div className="space-y-4 rounded-xl border bg-muted/20 p-4">
                        <div className="space-y-1.5">
                          <Label>Page Title</Label>
                          <Input
                            value={String(selectedField.config?.pageTitle ?? "")}
                            onChange={(event) => updateFieldConfig(selectedField.id, { pageTitle: event.target.value })}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label>Page Description</Label>
                          <Textarea
                            rows={2}
                            value={String(selectedField.config?.pageDescription ?? "")}
                            onChange={(event) => updateFieldConfig(selectedField.id, { pageDescription: event.target.value })}
                          />
                        </div>
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-1.5">
                            <Label>Next Button Text</Label>
                            <Input
                              value={String(selectedField.config?.nextButtonText ?? "Next")}
                              onChange={(event) => updateFieldConfig(selectedField.id, { nextButtonText: event.target.value })}
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label>Previous Button Text</Label>
                            <Input
                              value={String(selectedField.config?.previousButtonText ?? "Previous")}
                              onChange={(event) => updateFieldConfig(selectedField.id, { previousButtonText: event.target.value })}
                            />
                          </div>
                        </div>
                      </div>
                    ) : null}

                    {selectedField.type === "hidden" ? (
                      <div className="space-y-1.5 rounded-xl border bg-muted/20 p-4">
                        <Label>Default Value</Label>
                        <Input
                          value={String(selectedField.config?.defaultValue ?? "")}
                          onChange={(event) => updateFieldConfig(selectedField.id, { defaultValue: event.target.value })}
                        />
                      </div>
                    ) : null}

                    {selectedField.type === "consent" ? (
                      <div className="space-y-4 rounded-xl border bg-muted/20 p-4">
                        <div className="space-y-1.5">
                          <Label>Consent Label</Label>
                          <Input
                            value={String(selectedField.config?.consentCheckboxLabel ?? "")}
                            onChange={(event) => updateFieldConfig(selectedField.id, { consentCheckboxLabel: event.target.value })}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label>Consent Description</Label>
                          <Textarea
                            rows={3}
                            value={String(selectedField.config?.consentDescription ?? "")}
                            onChange={(event) => updateFieldConfig(selectedField.id, { consentDescription: event.target.value })}
                          />
                        </div>
                      </div>
                    ) : null}

                    {selectedField.type === "time" ? (
                      <div className="space-y-1.5">
                        <Label>Time Format</Label>
                        <Select
                          value={selectedField.config?.timeFormat === "24" ? "24" : "12"}
                          onValueChange={(value: "12" | "24") => updateFieldConfig(selectedField.id, { timeFormat: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="12">12-hour</SelectItem>
                            <SelectItem value="24">24-hour</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    ) : null}

                    {selectedField.type === "address" ? (
                      <div className="space-y-4 rounded-xl border bg-muted/20 p-4">
                        <div className="flex h-10 items-center rounded-md border px-3">
                          <Switch
                            checked={Boolean(selectedField.config?.showStreet2)}
                            onCheckedChange={(checked) => updateFieldConfig(selectedField.id, { showStreet2: checked })}
                          />
                          <span className="ml-3 text-sm text-muted-foreground">Include Street Address 2</span>
                        </div>
                        <div className="flex h-10 items-center rounded-md border px-3">
                          <Switch
                            checked={Boolean(selectedField.config?.showCountry)}
                            onCheckedChange={(checked) => updateFieldConfig(selectedField.id, { showCountry: checked })}
                          />
                          <span className="ml-3 text-sm text-muted-foreground">Include Country field</span>
                        </div>
                        <div className="space-y-1.5">
                          <Label>Address Layout</Label>
                          <Select
                            value={selectedField.config?.addressLayout === "compact" ? "compact" : "stacked"}
                            onValueChange={(value: "stacked" | "compact") => updateFieldConfig(selectedField.id, { addressLayout: value })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="stacked">Stacked</SelectItem>
                              <SelectItem value="compact">Compact Grid</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    ) : null}

                    {selectedField.type === "list" ? (
                      <div className="space-y-4 rounded-xl border bg-muted/20 p-4">
                        <div className="flex items-center justify-between">
                          <Label>List Columns</Label>
                          <Button type="button" size="sm" variant="outline" onClick={() => addListColumn(selectedField.id)}>
                            <Plus className="mr-1.5 h-3.5 w-3.5" />
                            Add Column
                          </Button>
                        </div>
                        <div className="space-y-3">
                          {(selectedField.config?.listColumns ?? []).map((column) => (
                            <div key={column.id} className="rounded-lg border bg-background p-3">
                              <div className="grid gap-3">
                                <div className="space-y-1.5">
                                  <Label>Column Label</Label>
                                  <Input
                                    value={column.label}
                                    onChange={(event) => updateListColumn(selectedField.id, column.id, { label: event.target.value })}
                                  />
                                </div>
                                <div className="space-y-1.5">
                                  <Label>Placeholder</Label>
                                  <Input
                                    value={column.placeholder ?? ""}
                                    onChange={(event) => updateListColumn(selectedField.id, column.id, { placeholder: event.target.value })}
                                  />
                                </div>
                                <Button type="button" variant="ghost" size="sm" className="justify-start text-destructive" onClick={() => removeListColumn(selectedField.id, column.id)}>
                                  <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                                  Remove Column
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="space-y-1.5">
                          <Label>Max Rows</Label>
                          <Input
                            type="number"
                            min={1}
                            value={String(selectedField.config?.maxRows ?? 10)}
                            onChange={(event) => updateFieldConfig(selectedField.id, { maxRows: Number(event.target.value) || 10 })}
                          />
                        </div>
                      </div>
                    ) : null}

                    {supportsChoices(selectedField.type) ? (
                      <div className="space-y-4 rounded-xl border bg-muted/20 p-4">
                        <div className="flex items-center justify-between">
                          <Label>Choices</Label>
                          <Button type="button" size="sm" variant="outline" onClick={() => addChoice(selectedField.id)}>
                            <Plus className="mr-1.5 h-3.5 w-3.5" />
                            Add Choice
                          </Button>
                        </div>

                        {selectedField.type === "image-choice" ? (
                          <div className="space-y-1.5">
                            <Label>Selection Mode</Label>
                            <Select
                              value={selectedField.config?.selectionMode === "multiple" ? "multiple" : "single"}
                              onValueChange={(value: "single" | "multiple") => updateFieldConfig(selectedField.id, { selectionMode: value })}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="single">Single Choice</SelectItem>
                                <SelectItem value="multiple">Multiple Choice</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        ) : null}

                        {selectedField.type !== "select" && selectedField.type !== "multiselect" ? (
                          <div className="space-y-1.5">
                            <Label>Choice Layout</Label>
                            <Select
                              value={selectedField.config?.choiceLayout === "grid" ? "grid" : selectedField.config?.choiceLayout === "inline" ? "inline" : "stacked"}
                              onValueChange={(value: "stacked" | "inline" | "grid") => updateFieldConfig(selectedField.id, { choiceLayout: value })}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {CHOICE_LAYOUT_OPTIONS.map((option) => (
                                  <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        ) : null}

                        <div className="space-y-3">
                          {(selectedField.options ?? []).map((option, index) => (
                            <div key={`${option.value}-${index}`} className="rounded-lg border bg-background p-3">
                              <div className="grid gap-3">
                                <div className="space-y-1.5">
                                  <Label>Choice Label</Label>
                                  <Input
                                    value={option.label}
                                    onChange={(event) => updateChoice(selectedField.id, option.value, { label: event.target.value })}
                                  />
                                </div>
                                <div className="space-y-1.5">
                                  <Label>Stored Value</Label>
                                  <Input
                                    value={option.value}
                                    onChange={(event) => updateChoice(selectedField.id, option.value, { value: slugify(event.target.value) || option.value })}
                                  />
                                </div>
                                {selectedField.type === "image-choice" ? (
                                  <div className="space-y-1.5">
                                    <Label>Choice Image</Label>
                                    <CmsImageUpload
                                      value={option.imageUrl ?? ""}
                                      onChange={(value) => updateChoice(selectedField.id, option.value, { imageUrl: value ?? "" })}
                                      label="Choice image"
                                    />
                                  </div>
                                ) : null}
                                <Button type="button" variant="ghost" size="sm" className="justify-start text-destructive" onClick={() => removeChoice(selectedField.id, option.value)}>
                                  <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                                  Remove Choice
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </>
                ) : (
                  <div className="space-y-5">
                    {groupedFieldLibrary.map((group) => (
                      <ToggleCardGroup
                        key={group.key}
                        title={group.label}
                        open={openGroups[group.key]}
                        onToggle={() => setOpenGroups((current) => ({ ...current, [group.key]: !current[group.key] }))}
                      >
                        <div className="space-y-2">
                          {group.items.map((item) => (
                            <FieldLibraryCard
                              key={item.type}
                              item={item}
                              onAdd={addField}
                              onDragStart={setDraggingFieldType}
                              onDragEnd={() => {
                                setDraggingFieldType(null);
                                setDropIndex(null);
                              }}
                            />
                          ))}
                        </div>
                      </ToggleCardGroup>
                    ))}
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

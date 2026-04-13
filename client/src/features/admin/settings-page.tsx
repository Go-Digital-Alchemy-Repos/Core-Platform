import { useEffect, useRef, useState, type ChangeEvent } from "react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  Link2,
  RefreshCw,
  ImageIcon,
  Type,
  Check,
  Palette,
} from "lucide-react";
import {
  BRANDING_FONT_OPTIONS,
  BRANDING_SANS_FONT_OPTIONS,
  BRANDING_SERIF_FONT_OPTIONS,
  fontFamilyForBrandingOption,
  normalizeHexColor,
  type BrandingFontOption,
} from "@/lib/branding";
import { cn } from "@/lib/utils";

type SettingsData = Record<
  string,
  Record<string, { value: string; isSecret: boolean }>
>;

type BrandingSettingKey = "frontend_logo_url" | "favicon_url";

type BrandingColorSettingKey =
  | "brand_primary_color"
  | "brand_secondary_color"
  | "brand_tertiary_color"
  | "text_h1_color"
  | "text_h2_color"
  | "text_h3_h6_color"
  | "text_body_color"
  | "text_muted_color"
  | "text_meta_color"
  | "text_link_color"
  | "text_link_hover_color"
  | "text_inverse_color"
  | "text_primary_foreground_color"
  | "text_secondary_foreground_color"
  | "text_tertiary_foreground_color";

const BRANDING_CORE_COLOR_FIELDS: Array<{
  key: BrandingColorSettingKey;
  label: string;
  description: string;
}> = [
  { key: "brand_primary_color", label: "Primary Color", description: "Main brand and button color." },
  { key: "brand_secondary_color", label: "Secondary Color", description: "Support color for secondary UI states." },
  { key: "brand_tertiary_color", label: "Tertiary Color", description: "Accent color used across highlights and links." },
];

const BRANDING_TYPOGRAPHY_COLOR_FIELDS: Array<{
  key: BrandingColorSettingKey;
  label: string;
  description: string;
}> = [
  { key: "text_h1_color", label: "H1 Color", description: "Primary color for main page headings." },
  { key: "text_h2_color", label: "H2 Color", description: "Color for section-level headings and major titles." },
  { key: "text_h3_h6_color", label: "H3-H6 Color", description: "Color for smaller heading levels and card titles." },
  { key: "text_body_color", label: "Paragraph Text", description: "Default reading color for paragraphs, excerpts, and body copy." },
  { key: "text_muted_color", label: "Heading Subtext", description: "Supporting color for section subtitles and helper copy." },
  { key: "text_meta_color", label: "Meta Text", description: "Use for dates, authors, categories, labels, and small metadata." },
  { key: "text_link_color", label: "Link Color", description: "Default color for editorial links and linked text actions." },
  { key: "text_link_hover_color", label: "Link Hover Color", description: "Hover color for links and lightweight text actions." },
  { key: "text_inverse_color", label: "Inverse Text", description: "Text shown on dark surfaces, image overlays, and high-contrast areas." },
];

const BRANDING_UI_TEXT_COLOR_FIELDS: Array<{
  key: BrandingColorSettingKey;
  label: string;
  description: string;
}> = [
  { key: "text_primary_foreground_color", label: "Primary Text on Color", description: "Text shown on primary-colored buttons and badges." },
  { key: "text_secondary_foreground_color", label: "Secondary Text on Color", description: "Text shown on secondary-colored UI surfaces." },
  { key: "text_tertiary_foreground_color", label: "Tertiary Text on Color", description: "Text shown on tertiary/accent-colored UI surfaces." },
];

const BRANDING_COLOR_FIELDS = [
  ...BRANDING_CORE_COLOR_FIELDS,
  ...BRANDING_TYPOGRAPHY_COLOR_FIELDS,
  ...BRANDING_UI_TEXT_COLOR_FIELDS,
] as const;

interface EmailTemplate {
  id: string;
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
  replitConnected?: boolean;
}

const INTEGRATIONS: IntegrationConfig[] = [
  {
    category: "stripe",
    title: "Stripe",
    description: "Payment processing for therapist subscriptions",
    icon: CreditCard,
    replitConnected: false,
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
          <div className="flex items-center gap-2">
            {config.replitConnected && (
              <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" data-testid={`badge-replit-${config.category}`}>
                <span className="flex items-center gap-1">
                  <Link2 className="h-3 w-3" /> Auto-connected
                </span>
              </Badge>
            )}
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
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {config.replitConnected && (
          <div className="rounded-md border border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-400 flex items-start gap-2" data-testid={`notice-replit-${config.category}`}>
            <Link2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>This service is auto-connected via Replit integration. The fields below are optional overrides for custom or production keys.</span>
          </div>
        )}
        {config.fields.map((field) => {
          const existing = categorySettings[field.key];
          const hasExisting = existing && existing.value && existing.value !== "";
          const currentVal = values[field.key] ?? "";
          const isVisible = showSecrets[field.key];
          const shouldAutoPrependHttps =
            /url/i.test(field.label) ||
            field.key.toLowerCase().endsWith("_url") ||
            field.placeholder?.startsWith("https://") === true;

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
                    autoPrependHttps={shouldAutoPrependHttps}
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

function BrandingImageCard({
  settingKey,
  title,
  description,
  currentUrl,
}: {
  settingKey: BrandingSettingKey;
  title: string;
  description: string;
  currentUrl: string;
}) {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("settingKey", settingKey);

      const response = await fetch("/api/admin/branding/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || payload.message || "Upload failed");
      }

      return response.json() as Promise<{ key: BrandingSettingKey; url: string }>;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/admin/settings"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/branding"] }),
      ]);
      toast({ title: `${title} updated` });
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    },
    onError: (error: Error) => {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    },
  });

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    uploadMutation.mutate(file);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ImageIcon className="h-4 w-4 text-primary" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex min-h-[120px] items-center justify-center rounded-xl border border-dashed bg-muted/20 p-4">
          {currentUrl ? (
            <img
              src={currentUrl}
              alt={title}
              className="max-h-16 w-auto object-contain"
            />
          ) : (
            <div className="text-center text-sm text-muted-foreground">
              <p>No image uploaded yet.</p>
              <p className="mt-1 text-xs">Images uploaded here are stored in R2 under the `branding/` directory.</p>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="hidden"
            onChange={handleFileChange}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => inputRef.current?.click()}
            disabled={uploadMutation.isPending}
            data-testid={`button-upload-${settingKey}`}
          >
            {uploadMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <ImageIcon className="mr-2 h-4 w-4" />
            )}
            Upload Image
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function BrandingTab({ settings }: { settings: SettingsData }) {
  const { toast } = useToast();
  const brandingSettings = settings.branding || {};
  const [bodyFont, setBodyFont] = useState(brandingSettings.frontend_body_font?.value || "__default__");
  const [headingFont, setHeadingFont] = useState(brandingSettings.frontend_heading_font?.value || "__default__");
  const [colorValues, setColorValues] = useState<Record<BrandingColorSettingKey, string>>({
    brand_primary_color: brandingSettings.brand_primary_color?.value || "",
    brand_secondary_color: brandingSettings.brand_secondary_color?.value || "",
    brand_tertiary_color: brandingSettings.brand_tertiary_color?.value || "",
    text_h1_color: brandingSettings.text_h1_color?.value || "",
    text_h2_color: brandingSettings.text_h2_color?.value || "",
    text_h3_h6_color: brandingSettings.text_h3_h6_color?.value || "",
    text_body_color: brandingSettings.text_body_color?.value || "",
    text_muted_color: brandingSettings.text_muted_color?.value || "",
    text_meta_color: brandingSettings.text_meta_color?.value || "",
    text_link_color: brandingSettings.text_link_color?.value || "",
    text_link_hover_color: brandingSettings.text_link_hover_color?.value || "",
    text_inverse_color: brandingSettings.text_inverse_color?.value || "",
    text_primary_foreground_color: brandingSettings.text_primary_foreground_color?.value || "",
    text_secondary_foreground_color: brandingSettings.text_secondary_foreground_color?.value || "",
    text_tertiary_foreground_color: brandingSettings.text_tertiary_foreground_color?.value || "",
  });

  useEffect(() => {
    setBodyFont(brandingSettings.frontend_body_font?.value || "__default__");
    setHeadingFont(brandingSettings.frontend_heading_font?.value || "__default__");
    setColorValues({
      brand_primary_color: brandingSettings.brand_primary_color?.value || "",
      brand_secondary_color: brandingSettings.brand_secondary_color?.value || "",
      brand_tertiary_color: brandingSettings.brand_tertiary_color?.value || "",
      text_h1_color: brandingSettings.text_h1_color?.value || "",
      text_h2_color: brandingSettings.text_h2_color?.value || "",
      text_h3_h6_color: brandingSettings.text_h3_h6_color?.value || "",
      text_body_color: brandingSettings.text_body_color?.value || "",
      text_muted_color: brandingSettings.text_muted_color?.value || "",
      text_meta_color: brandingSettings.text_meta_color?.value || "",
      text_link_color: brandingSettings.text_link_color?.value || "",
      text_link_hover_color: brandingSettings.text_link_hover_color?.value || "",
      text_inverse_color: brandingSettings.text_inverse_color?.value || "",
      text_primary_foreground_color: brandingSettings.text_primary_foreground_color?.value || "",
      text_secondary_foreground_color: brandingSettings.text_secondary_foreground_color?.value || "",
      text_tertiary_foreground_color: brandingSettings.text_tertiary_foreground_color?.value || "",
    });
  }, [
    brandingSettings.frontend_body_font?.value,
    brandingSettings.frontend_heading_font?.value,
    brandingSettings.brand_primary_color?.value,
    brandingSettings.brand_secondary_color?.value,
    brandingSettings.brand_tertiary_color?.value,
    brandingSettings.text_h1_color?.value,
    brandingSettings.text_h2_color?.value,
    brandingSettings.text_h3_h6_color?.value,
    brandingSettings.text_body_color?.value,
    brandingSettings.text_muted_color?.value,
    brandingSettings.text_meta_color?.value,
    brandingSettings.text_link_color?.value,
    brandingSettings.text_link_hover_color?.value,
    brandingSettings.text_inverse_color?.value,
    brandingSettings.text_primary_foreground_color?.value,
    brandingSettings.text_secondary_foreground_color?.value,
    brandingSettings.text_tertiary_foreground_color?.value,
  ]);

  const saveFontsMutation = useMutation({
    mutationFn: async () => {
      const requests = [
        apiRequest("PUT", "/api/admin/settings", {
          key: "frontend_body_font",
          value: bodyFont === "__default__" ? "" : bodyFont,
          category: "branding",
          isSecret: false,
        }),
        apiRequest("PUT", "/api/admin/settings", {
          key: "frontend_heading_font",
          value: headingFont === "__default__" ? "" : headingFont,
          category: "branding",
          isSecret: false,
        }),
      ];

      await Promise.all(requests);
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/admin/settings"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/branding"] }),
      ]);
      toast({ title: "Branding fonts updated" });
    },
    onError: (error: Error) => {
      toast({ title: "Could not save branding fonts", description: error.message, variant: "destructive" });
    },
  });

  const hasFontChanges =
    bodyFont !== (brandingSettings.frontend_body_font?.value || "__default__") ||
    headingFont !== (brandingSettings.frontend_heading_font?.value || "__default__");

  const saveColorsMutation = useMutation({
    mutationFn: async () => {
      await Promise.all(
        BRANDING_COLOR_FIELDS.map((field) =>
          apiRequest("PUT", "/api/admin/settings", {
            key: field.key,
            value: normalizeHexColor(colorValues[field.key]) || "",
            category: "branding",
            isSecret: false,
          })
        )
      );
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/admin/settings"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/branding"] }),
      ]);
      toast({ title: "Brand color palette updated" });
    },
    onError: (error: Error) => {
      toast({ title: "Could not save brand colors", description: error.message, variant: "destructive" });
    },
  });

  const hasColorChanges = BRANDING_COLOR_FIELDS.some(
    (field) => colorValues[field.key] !== (brandingSettings[field.key]?.value || "")
  );

  const previewBodyStyle = {
    fontFamily: fontFamilyForBrandingOption(bodyFont === "__default__" ? null : bodyFont) ?? undefined,
  };
  const previewHeadingStyle = {
    fontFamily: fontFamilyForBrandingOption(headingFont === "__default__" ? null : headingFont) ?? undefined,
  };

  const previewPaletteStyle = {
    backgroundColor: colorValues.brand_primary_color || undefined,
    color: colorValues.text_primary_foreground_color || undefined,
  };
  const previewLinkStyle = {
    color: colorValues.text_link_color || undefined,
  };
  const previewLinkHoverStyle = {
    color: colorValues.text_link_hover_color || colorValues.text_link_color || undefined,
  };

  const updateColorValue = (key: BrandingColorSettingKey, value: string) => {
    setColorValues((current) => ({ ...current, [key]: value }));
  };

  const renderFontOptionCard = (
    option: BrandingFontOption,
    selectedValue: string,
    onSelect: (value: string) => void,
    sampleKind: "heading" | "body"
  ) => (
    <button
      key={option.value}
      type="button"
      onClick={() => onSelect(option.value)}
      className={cn(
        "w-full rounded-xl border p-4 text-left transition-all hover:border-primary/50 hover:bg-primary/5",
        selectedValue === option.value
          ? "border-primary bg-primary/5 ring-1 ring-primary/20"
          : "border-border/70 bg-background"
      )}
      data-testid={`button-branding-font-${sampleKind}-${option.value}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm font-semibold" style={{ fontFamily: option.family }}>
            {option.label}
          </p>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            {option.category === "sans" ? "Sans Serif" : "Serif"}
          </p>
        </div>
        {selectedValue === option.value && (
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Check className="h-3.5 w-3.5" />
          </span>
        )}
      </div>
      <p
        className={cn("mt-3 text-balance text-slate-900", sampleKind === "heading" ? "text-xl font-semibold" : "text-sm")}
        style={{ fontFamily: option.family }}
      >
        {sampleKind === "heading" ? "The right words should feel understood." : "Thoughtful typography helps editors preview the real feeling of the brand before publishing."}
      </p>
      <p className="mt-2 text-xs text-muted-foreground">{option.preview}</p>
    </button>
  );

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold" data-testid="text-branding-heading">
          Branding
        </h3>
        <p className="text-sm text-muted-foreground">
          Control the public logo, favicon, color palette, and frontend typography. Branding images are stored in Cloudflare R2 under the `branding/` directory.
        </p>
      </div>

      <Tabs defaultValue="branding" className="space-y-6">
        <TabsList className="grid w-full max-w-lg grid-cols-3" data-testid="tabs-branding-subtabs">
          <TabsTrigger value="branding" data-testid="tab-branding-subtab-branding">
            Branding
          </TabsTrigger>
          <TabsTrigger value="colors" data-testid="tab-branding-subtab-colors">
            Color Palette
          </TabsTrigger>
          <TabsTrigger value="typography" data-testid="tab-branding-subtab-typography">
            Typography
          </TabsTrigger>
        </TabsList>

        <TabsContent value="branding" className="space-y-6">
          <div className="grid gap-6 xl:grid-cols-2">
            <BrandingImageCard
              settingKey="frontend_logo_url"
              title="Frontend Logo"
              description="Shown in the site header and footer."
              currentUrl={brandingSettings.frontend_logo_url?.value || ""}
            />
            <BrandingImageCard
              settingKey="favicon_url"
              title="Favicon"
              description="Shown in the browser tab, bookmarks, and saved shortcuts."
              currentUrl={brandingSettings.favicon_url?.value || ""}
            />
          </div>
        </TabsContent>

        <TabsContent value="colors" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Palette className="h-4 w-4 text-primary" />
                Color Palette
              </CardTitle>
              <CardDescription>
                Set the core frontend brand colors, typography colors, and UI foreground colors. This keeps headings, body copy, supporting text, metadata, and links distinct without needing one-off overrides.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {[
                {
                  title: "Core Colors",
                  description: "These power the main brand accents, buttons, and highlighted interface states on the public site.",
                  fields: BRANDING_CORE_COLOR_FIELDS,
                },
                {
                  title: "Typography Colors",
                  description: "Use these to separate major headings, paragraph copy, section subtext, metadata, and editorial links.",
                  fields: BRANDING_TYPOGRAPHY_COLOR_FIELDS,
                },
                {
                  title: "Text on Color Surfaces",
                  description: "These colors are used when text appears on branded buttons, badges, and other colored UI surfaces.",
                  fields: BRANDING_UI_TEXT_COLOR_FIELDS,
                },
              ].map((group) => (
                <div key={group.title} className="space-y-4">
                  <div>
                    <h4 className="text-sm font-semibold">{group.title}</h4>
                    <p className="mt-1 text-xs text-muted-foreground">{group.description}</p>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    {group.fields.map((field) => (
                      <div key={field.key} className="space-y-1.5 rounded-xl border p-4">
                        <div>
                          <Label>{field.label}</Label>
                          <p className="mt-1 text-xs text-muted-foreground">{field.description}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <input
                            type="color"
                            value={normalizeHexColor(colorValues[field.key]) || "#000000"}
                            onChange={(event) => updateColorValue(field.key, event.target.value.toUpperCase())}
                            className="h-10 w-12 cursor-pointer rounded-md border bg-background p-1"
                            data-testid={`input-color-${field.key}`}
                          />
                          <Input
                            value={colorValues[field.key]}
                            onChange={(event) => updateColorValue(field.key, event.target.value)}
                            placeholder="#000000"
                            data-testid={`input-hex-${field.key}`}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              <div className="rounded-xl border bg-muted/10 p-5">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Palette Preview</p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <div className="rounded-lg px-4 py-2 text-sm font-medium" style={previewPaletteStyle}>
                    Primary Action
                  </div>
                  <div
                    className="rounded-lg px-4 py-2 text-sm font-medium"
                    style={{
                      backgroundColor: colorValues.brand_secondary_color || undefined,
                      color: colorValues.text_secondary_foreground_color || undefined,
                    }}
                  >
                    Secondary Action
                  </div>
                  <div
                    className="rounded-lg px-4 py-2 text-sm font-medium"
                    style={{
                      backgroundColor: colorValues.brand_tertiary_color || undefined,
                      color: colorValues.text_tertiary_foreground_color || undefined,
                    }}
                  >
                    Tertiary Action
                  </div>
                </div>
                <div className="mt-5 rounded-xl border bg-background p-5 space-y-3">
                  <p className="text-3xl font-semibold" style={{ ...previewHeadingStyle, color: colorValues.text_h1_color || colorValues.text_body_color || undefined }}>
                    H1 headline preview
                  </p>
                  <p className="text-2xl font-semibold" style={{ ...previewHeadingStyle, color: colorValues.text_h2_color || colorValues.text_h1_color || colorValues.text_body_color || undefined }}>
                    H2 section heading preview
                  </p>
                  <p className="text-lg font-semibold" style={{ ...previewHeadingStyle, color: colorValues.text_h3_h6_color || colorValues.text_h2_color || colorValues.text_body_color || undefined }}>
                    H3-H6 card and supporting heading preview
                  </p>
                  <p className="text-sm" style={{ ...previewBodyStyle, color: colorValues.text_muted_color || undefined }}>
                    Heading sub-text / supporting copy preview for section introductions and helper messaging.
                  </p>
                  <p className="text-sm" style={{ ...previewBodyStyle, color: colorValues.text_body_color || undefined }}>
                    Paragraph text preview for reading content, blog excerpts, and general body copy throughout the site.
                  </p>
                  <p className="text-xs uppercase tracking-wide" style={{ color: colorValues.text_meta_color || colorValues.text_muted_color || undefined }}>
                    Meta text preview for dates, authors, categories, and labels
                  </p>
                  <div className="flex flex-wrap items-center gap-4 text-sm">
                    <a href="#branding-preview-link" className="underline underline-offset-4" style={previewLinkStyle}>
                      Link color preview
                    </a>
                    <span className="underline underline-offset-4" style={previewLinkHoverStyle}>
                      Link hover preview
                    </span>
                  </div>
                  <div
                    className="rounded-lg px-4 py-3 text-sm font-medium"
                    style={{
                      backgroundColor: colorValues.brand_primary_color || "#1F2A44",
                      color: colorValues.text_inverse_color || colorValues.text_primary_foreground_color || undefined,
                    }}
                  >
                    Inverse text preview on dark or branded surfaces
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  onClick={() => saveColorsMutation.mutate()}
                  disabled={!hasColorChanges || saveColorsMutation.isPending}
                  data-testid="button-save-branding-colors"
                >
                  {saveColorsMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Save Color Palette
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="typography" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Type className="h-4 w-4 text-primary" />
                Frontend Typography
              </CardTitle>
              <CardDescription>
                Choose one font for headings and another for body copy on the public-facing website. Each option includes an inline sample so editors can compare type directly in the admin.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Heading Font</Label>
                  <Select value={headingFont} onValueChange={setHeadingFont}>
                    <SelectTrigger data-testid="select-branding-heading-font">
                      <SelectValue placeholder="Use current theme font" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__default__">Use current theme font</SelectItem>
                      {BRANDING_FONT_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">Choose from 10 sans serif and 10 serif Google fonts.</p>
                </div>

                <div className="space-y-1.5">
                  <Label>Body Font</Label>
                  <Select value={bodyFont} onValueChange={setBodyFont}>
                    <SelectTrigger data-testid="select-branding-body-font">
                      <SelectValue placeholder="Use current theme font" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__default__">Use current theme font</SelectItem>
                      {BRANDING_FONT_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">Choose from the same balanced font library for paragraph copy.</p>
                </div>
              </div>

              <div className="grid gap-6 xl:grid-cols-2">
                <Card className="border-dashed">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Heading Font Picker</CardTitle>
                    <CardDescription>Preview how each font feels in large editorial headings.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Sans Serif Options</p>
                      </div>
                      <div className="grid gap-3">
                        {BRANDING_SANS_FONT_OPTIONS.map((option) =>
                          renderFontOptionCard(option, headingFont, setHeadingFont, "heading")
                        )}
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Serif Options</p>
                      </div>
                      <div className="grid gap-3">
                        {BRANDING_SERIF_FONT_OPTIONS.map((option) =>
                          renderFontOptionCard(option, headingFont, setHeadingFont, "heading")
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-dashed">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Body Font Picker</CardTitle>
                    <CardDescription>Preview how each font reads in paragraph-sized content.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Sans Serif Options</p>
                      </div>
                      <div className="grid gap-3">
                        {BRANDING_SANS_FONT_OPTIONS.map((option) =>
                          renderFontOptionCard(option, bodyFont, setBodyFont, "body")
                        )}
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Serif Options</p>
                      </div>
                      <div className="grid gap-3">
                        {BRANDING_SERIF_FONT_OPTIONS.map((option) =>
                          renderFontOptionCard(option, bodyFont, setBodyFont, "body")
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="rounded-xl border bg-muted/10 p-5">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Preview</p>
                <h4 className="mt-3 text-2xl font-semibold" style={previewHeadingStyle}>
                  TCK Wellness helps globally mobile families feel understood.
                </h4>
                <p className="mt-3 text-sm text-muted-foreground" style={previewBodyStyle}>
                  Use this preview to compare heading and body combinations before saving. These font selections only apply to the public-facing website, not the admin dashboard.
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  onClick={() => saveFontsMutation.mutate()}
                  disabled={!hasFontChanges || saveFontsMutation.isPending}
                  data-testid="button-save-branding-fonts"
                >
                  {saveFontsMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Save Typography
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
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

  const restoreMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/email-templates/restore");
      return res.json();
    },
    onSuccess: async (payload: { restored: number }) => {
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/email-templates"] });
      toast({
        title: "System email templates restored",
        description: `${payload.restored} templates are now available in the library.`,
      });
    },
    onError: (err: Error) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/email-templates"] });
      toast({ title: "Restore failed", description: err.message, variant: "destructive" });
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

      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          onClick={() => restoreMutation.mutate()}
          disabled={restoreMutation.isPending}
          data-testid="button-restore-email-templates"
        >
          {restoreMutation.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          Restore System Templates
        </Button>
      </div>

      {!templates?.length && (
        <Card>
          <CardContent className="flex items-center gap-3 py-8 justify-center text-muted-foreground">
            <AlertCircle className="h-5 w-5" />
            <span>No email templates found. Use “Restore System Templates” to repopulate the defaults.</span>
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
                Manage the list of specializations available in mental health professional profiles and the directory filter.
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
              This will remove <strong>{deleteTarget?.name}</strong> from the directory filters and mental health professional profile options. Existing profiles that already have this specialization will retain it until they save changes.
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
          Manage integrations, branding, and system templates
        </p>

        <Tabs defaultValue="integrations">
          <TabsList data-testid="tabs-settings">
            <TabsTrigger value="integrations" data-testid="tab-integrations">
              Integrations
            </TabsTrigger>
            <TabsTrigger value="branding" data-testid="tab-branding">
              Branding
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

          <TabsContent value="branding" className="mt-6">
            {isLoading ? (
              <div className="flex items-center justify-center p-12">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <BrandingTab settings={settings || {}} />
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

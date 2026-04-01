import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Palette, Check, Eye, Undo2, Settings2, X, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { THEME_PRESETS, getPresetById, applyThemeTokens, clearThemeTokens, ALL_TOKEN_KEYS, type ThemePreset } from "@/lib/theme-presets";
import { useTheme } from "@/components/shared/theme-provider";

interface ActiveThemeData {
  presetId: string;
  customOverrides: Record<string, string> | null;
}

const OVERRIDE_GROUPS = [
  {
    label: "Colors",
    keys: ["primary", "primary-foreground", "secondary", "secondary-foreground", "accent", "accent-foreground", "background", "foreground", "muted", "muted-foreground", "border", "input", "ring"],
  },
  {
    label: "Card & Popover",
    keys: ["card", "card-foreground", "card-border", "popover", "popover-foreground", "popover-border"],
  },
  {
    label: "Typography",
    keys: ["font-sans", "font-serif", "heading-weight", "heading-tracking", "body-leading"],
  },
  {
    label: "Spacing",
    keys: ["spacing-xs", "spacing-sm", "spacing-md", "spacing-lg", "spacing-xl"],
  },
  {
    label: "Shadows",
    keys: ["shadow-sm", "shadow-md", "shadow-lg"],
  },
  {
    label: "Buttons",
    keys: ["btn-radius", "btn-padding-x", "btn-padding-y", "btn-font-weight", "btn-text-transform"],
  },
  {
    label: "Border Radius & Charts",
    keys: ["radius", "chart-1", "chart-2", "chart-3", "chart-4", "chart-5"],
  },
  {
    label: "Destructive",
    keys: ["destructive", "destructive-foreground"],
  },
];

export default function CmsThemesPage() {
  const { toast } = useToast();
  const { theme, activePresetId, setActivePresetId, customOverrides: globalOverrides, setCustomOverrides: setGlobalOverrides } = useTheme();
  const [previewingId, setPreviewingId] = useState<string | null>(null);
  const [showOverrides, setShowOverrides] = useState(false);
  const [overrideDraft, setOverrideDraft] = useState<Record<string, string>>({});

  const { data: activeTheme, isLoading } = useQuery<ActiveThemeData>({
    queryKey: ["/api/theme/active"],
  });

  useEffect(() => {
    if (activeTheme?.customOverrides) {
      setOverrideDraft({ ...activeTheme.customOverrides });
    }
  }, [activeTheme?.customOverrides]);

  const saveMutation = useMutation({
    mutationFn: async ({ presetId, customOverrides }: { presetId: string; customOverrides?: Record<string, string> | null }) => {
      const res = await apiRequest("PUT", "/api/admin/theme", { presetId, customOverrides: customOverrides || null });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/theme/active"] });
      setActivePresetId(data.presetId);
      setGlobalOverrides(data.customOverrides || null);
      setPreviewingId(null);
      toast({ title: "Theme saved", description: "The theme has been applied site-wide." });
    },
    onError: (err: Error) => {
      toast({ title: "Error saving theme", description: err.message, variant: "destructive" });
    },
  });

  const handlePreview = (preset: ThemePreset) => {
    if (previewingId === preset.id) {
      cancelPreview();
      return;
    }
    setPreviewingId(preset.id);
    if (preset.id === "tck-default") {
      clearThemeTokens();
    } else {
      applyThemeTokens(preset[theme], theme);
    }
  };

  const cancelPreview = () => {
    setPreviewingId(null);
    const savedId = activeTheme?.presetId || "tck-default";
    const savedPreset = getPresetById(savedId);
    if (!savedPreset || savedId === "tck-default") {
      clearThemeTokens();
    } else {
      applyThemeTokens(savedPreset[theme], theme, activeTheme?.customOverrides);
    }
  };

  const handleActivate = (presetId: string) => {
    saveMutation.mutate({ presetId });
  };

  const handleOverrideChange = (key: string, value: string) => {
    setOverrideDraft((prev) => {
      if (!value.trim()) {
        const next = { ...prev };
        delete next[key];
        return next;
      }
      return { ...prev, [key]: value };
    });
  };

  const handleSaveOverrides = () => {
    const cleaned = Object.keys(overrideDraft).length > 0 ? overrideDraft : null;
    saveMutation.mutate({ presetId: currentSavedId, customOverrides: cleaned });
  };

  const handleClearOverrides = () => {
    setOverrideDraft({});
    saveMutation.mutate({ presetId: currentSavedId, customOverrides: null });
  };

  const currentSavedId = activeTheme?.presetId || "tck-default";
  const savedIdRef = useRef(currentSavedId);
  const overridesRef = useRef(activeTheme?.customOverrides || null);
  savedIdRef.current = currentSavedId;
  overridesRef.current = activeTheme?.customOverrides || null;

  useEffect(() => {
    return () => {
      const id = savedIdRef.current;
      const preset = getPresetById(id);
      if (!preset || id === "tck-default") {
        clearThemeTokens();
      } else {
        const mode = document.documentElement.classList.contains("dark") ? "dark" : "light";
        applyThemeTokens(preset[mode], mode, overridesRef.current);
      }
    };
  }, []);

  return (
    <div className="space-y-6" data-testid="cms-themes-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-themes-title">
            <Palette className="h-6 w-6 text-violet-600" />
            Theme Presets
          </h1>
          <p className="text-muted-foreground mt-1">
            Choose a visual theme for your site. Themes control colors, typography, border radius, shadows, spacing, and button styles across all pages.
          </p>
        </div>
        <div className="flex gap-2">
          {previewingId && (
            <Button variant="outline" onClick={cancelPreview} data-testid="button-cancel-preview">
              <Undo2 className="h-4 w-4 mr-2" />
              Cancel Preview
            </Button>
          )}
          <Button
            variant={showOverrides ? "default" : "outline"}
            onClick={() => setShowOverrides(!showOverrides)}
            data-testid="button-toggle-overrides"
          >
            <Settings2 className="h-4 w-4 mr-2" />
            Custom Overrides
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6 h-48" />
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {THEME_PRESETS.map((preset) => {
            const isActive = currentSavedId === preset.id;
            const isPreviewing = previewingId === preset.id;

            return (
              <Card
                key={preset.id}
                className={`relative transition-all ${
                  isActive ? "ring-2 ring-primary" : ""
                } ${isPreviewing ? "ring-2 ring-accent" : ""}`}
                data-testid={`card-theme-${preset.id}`}
              >
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-sm leading-tight" data-testid={`text-theme-name-${preset.id}`}>
                        {preset.name}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {preset.description}
                      </p>
                    </div>
                    {isActive && (
                      <Badge variant="default" className="shrink-0 text-[10px]" data-testid={`badge-active-${preset.id}`}>
                        <Check className="h-3 w-3 mr-1" />
                        Active
                      </Badge>
                    )}
                  </div>

                  <ThemeColorPreview preset={preset} />

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handlePreview(preset)}
                      data-testid={`button-preview-${preset.id}`}
                    >
                      <Eye className="h-3.5 w-3.5 mr-1.5" />
                      {isPreviewing ? "Stop Preview" : "Preview"}
                    </Button>
                    {!isActive && (
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={() => handleActivate(preset.id)}
                        disabled={saveMutation.isPending}
                        data-testid={`button-activate-${preset.id}`}
                      >
                        <Check className="h-3.5 w-3.5 mr-1.5" />
                        Activate
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {showOverrides && (
        <>
          <Separator />
          <div className="space-y-4" data-testid="section-custom-overrides">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Custom Token Overrides</h2>
                <p className="text-sm text-muted-foreground">
                  Override individual design tokens on top of the active preset. Leave a field blank to use the preset default.
                </p>
              </div>
              <div className="flex gap-2">
                {Object.keys(overrideDraft).length > 0 && (
                  <Button variant="outline" size="sm" onClick={handleClearOverrides} data-testid="button-clear-overrides">
                    <X className="h-3.5 w-3.5 mr-1.5" />
                    Clear All
                  </Button>
                )}
                <Button size="sm" onClick={handleSaveOverrides} disabled={saveMutation.isPending} data-testid="button-save-overrides">
                  <Save className="h-3.5 w-3.5 mr-1.5" />
                  Save Overrides
                </Button>
              </div>
            </div>

            {OVERRIDE_GROUPS.map((group) => (
              <Card key={group.label}>
                <CardContent className="p-4">
                  <h3 className="text-sm font-medium mb-3">{group.label}</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {group.keys.map((key) => {
                      const preset = getPresetById(currentSavedId);
                      const defaultVal = preset ? preset[theme]?.[key as keyof typeof preset.light] : "";
                      return (
                        <div key={key} className="space-y-1">
                          <Label className="text-xs text-muted-foreground">{key}</Label>
                          <Input
                            className="h-8 text-xs font-mono"
                            placeholder={defaultVal || "—"}
                            value={overrideDraft[key] || ""}
                            onChange={(e) => handleOverrideChange(key, e.target.value)}
                            data-testid={`input-override-${key}`}
                          />
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function ThemeColorPreview({ preset }: { preset: ThemePreset }) {
  const { bg, primary, accent } = preset.preview;

  return (
    <div
      className="rounded-md border overflow-hidden"
      style={{ backgroundColor: bg }}
      data-testid={`preview-colors-${preset.id}`}
    >
      <div className="p-3 space-y-2">
        <div className="flex gap-2">
          <div className="h-8 rounded flex-1" style={{ backgroundColor: primary }} />
          <div className="h-8 rounded flex-1" style={{ backgroundColor: accent }} />
        </div>
        <div className="flex gap-1.5">
          <div className="h-2 rounded-full flex-[3]" style={{ backgroundColor: primary, opacity: 0.7 }} />
          <div className="h-2 rounded-full flex-[2]" style={{ backgroundColor: accent, opacity: 0.5 }} />
          <div className="h-2 rounded-full flex-1" style={{ backgroundColor: primary, opacity: 0.3 }} />
        </div>
        <div className="flex gap-1.5">
          <div className="h-2 rounded-full flex-[2]" style={{ backgroundColor: accent, opacity: 0.4 }} />
          <div className="h-2 rounded-full flex-[4]" style={{ backgroundColor: primary, opacity: 0.2 }} />
        </div>
      </div>
    </div>
  );
}

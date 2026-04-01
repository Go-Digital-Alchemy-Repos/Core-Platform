import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Palette, Check, Eye, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { THEME_PRESETS, getPresetById, applyThemeTokens, clearThemeTokens, type ThemePreset } from "@/lib/theme-presets";
import { useTheme } from "@/components/shared/theme-provider";

interface ActiveThemeData {
  presetId: string;
  customOverrides: Record<string, string> | null;
}

export default function CmsThemesPage() {
  const { toast } = useToast();
  const { theme, activePresetId, setActivePresetId } = useTheme();
  const [previewingId, setPreviewingId] = useState<string | null>(null);

  const { data: activeTheme, isLoading } = useQuery<ActiveThemeData>({
    queryKey: ["/api/theme/active"],
  });

  const saveMutation = useMutation({
    mutationFn: async (presetId: string) => {
      const res = await apiRequest("PUT", "/api/admin/theme", { presetId });
      return res.json();
    },
    onSuccess: (_data, presetId) => {
      queryClient.invalidateQueries({ queryKey: ["/api/theme/active"] });
      setActivePresetId(presetId);
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
      applyThemeTokens(savedPreset[theme], theme);
    }
  };

  const handleActivate = (presetId: string) => {
    saveMutation.mutate(presetId);
  };

  const currentSavedId = activeTheme?.presetId || "tck-default";
  const savedIdRef = useRef(currentSavedId);
  savedIdRef.current = currentSavedId;

  useEffect(() => {
    return () => {
      const id = savedIdRef.current;
      const preset = getPresetById(id);
      if (!preset || id === "tck-default") {
        clearThemeTokens();
      } else {
        const mode = document.documentElement.classList.contains("dark") ? "dark" : "light";
        applyThemeTokens(preset[mode], mode);
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
            Choose a visual theme for your site. Themes control colors, typography, border radius, and shadows across all pages.
          </p>
        </div>
        {previewingId && (
          <Button variant="outline" onClick={cancelPreview} data-testid="button-cancel-preview">
            <Undo2 className="h-4 w-4 mr-2" />
            Cancel Preview
          </Button>
        )}
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
          <div
            className="h-8 rounded flex-1"
            style={{ backgroundColor: primary }}
          />
          <div
            className="h-8 rounded flex-1"
            style={{ backgroundColor: accent }}
          />
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

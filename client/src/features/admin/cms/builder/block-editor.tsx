import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2 } from "lucide-react";
import type { BlockDef, PropDef } from "./block-registry";
import { CmsImageUpload } from "../components/cms-image-upload";
import { ImagePositionPicker } from "../components/image-position-picker";
import { CmsRichTextEditor } from "./cms-rich-text-editor";

interface BlockEditorProps {
  blockDef: BlockDef;
  props: Record<string, unknown>;
  onChange: (props: Record<string, unknown>) => void;
  mode?: "full" | "contextual";
  onOpenAdvanced?: () => void;
}

const PROP_DISPLAY_PRIORITY: Record<string, number> = {
  badge: 5,
  eyebrow: 10,
  sectionEyebrow: 11,
  title: 20,
  heading: 21,
  accentHeading: 22,
  headingColor: 23,
  accentHeadingColor: 24,
  subtitle: 30,
  subheading: 31,
  subheadingColor: 32,
  headingLevel: 35,
  sectionHeadingLevel: 36,
  alignment: 40,
  textAlign: 41,
  sectionHeadingAlignment: 42,
  content: 50,
  body: 51,
};

const DEFAULT_COLOR_VALUE = "#ffffff";
const DEFAULT_RADIAL_GRADIENT_COLOR = "#89cda1";
const POSITION_PICKER_KEYS = new Set([
  "backgroundPositionX",
  "backgroundPositionY",
  "sectionBackgroundPositionX",
  "sectionBackgroundPositionY",
]);

const SECTION_STYLE_KEYS = new Set([
  "sectionBackgroundColor",
  "sectionBackgroundImageUrl",
  "sectionBackgroundPositionX",
  "sectionBackgroundPositionY",
  "sectionBackgroundOverlayColor",
  "sectionBackgroundOverlayOpacity",
  "sectionShowRadialGradient",
  "sectionRadialGradientColor",
  "sectionRadialGradientPosition",
  "sectionPaddingTop",
  "sectionPaddingBottom",
]);

const SECTION_SETTING_KEYS = new Set([
  ...SECTION_STYLE_KEYS,
  "backgroundImageUrl",
  "backgroundPositionX",
  "backgroundPositionY",
  "videoBackgroundUrl",
  "overlayColor",
  "overlayOpacity",
  "layout",
  "minHeight",
]);

const IMAGE_POSITION_FIELD_GROUPS = [
  {
    imageKey: "imageUrl",
    positionXKey: "mobileImagePositionX",
    positionYKey: "mobileImagePositionY",
  },
  {
    imageKey: "backgroundImageUrl",
    positionXKey: "backgroundPositionX",
    positionYKey: "backgroundPositionY",
  },
  {
    imageKey: "sectionBackgroundImageUrl",
    positionXKey: "sectionBackgroundPositionX",
    positionYKey: "sectionBackgroundPositionY",
  },
];

type InspectorGroup = "content" | "media" | "layout" | "settings";

const GROUP_METADATA: Record<InspectorGroup, { label: string; description: string }> = {
  content: {
    label: "Content",
    description: "Headings, copy, calls to action, and the words people actually read.",
  },
  media: {
    label: "Media",
    description: "Images, videos, thumbnails, and image focal positioning.",
  },
  layout: {
    label: "Layout",
    description: "Alignment, column counts, widths, spacing, and structural arrangement.",
  },
  settings: {
    label: "Settings",
    description: "Section backgrounds, overlays, styles, visibility toggles, and appearance controls.",
  },
};

const LAYOUT_KEYS = new Set([
  "alignment",
  "textAlign",
  "sectionHeadingAlignment",
  "sectionHeadingLevel",
  "headingLevel",
  "columns",
  "layout",
  "position",
  "imagePosition",
  "imageWidth",
  "videoAspect",
  "minHeight",
  "experienceLevel",
  "topSpacing",
  "bottomSpacing",
]);

const SETTINGS_KEY_FRAGMENTS = [
  "color",
  "variant",
  "style",
  "theme",
  "show",
  "enable",
  "opacity",
  "icon",
];

const MEDIA_KEY_FRAGMENTS = [
  "image",
  "background",
  "thumbnail",
  "video",
  "media",
  "focal",
  "positionx",
  "positiony",
];

const CONTEXTUAL_PRIORITY: Record<string, number> = {
  badge: 5,
  eyebrow: 8,
  title: 10,
  heading: 11,
  accentHeading: 12,
  subtitle: 20,
  subheading: 21,
  content: 30,
  body: 31,
  ctaText: 40,
  ctaLink: 41,
  ctaSecondaryText: 42,
  ctaSecondaryLink: 43,
  imageUrl: 50,
  backgroundImageUrl: 51,
  thumbnailUrl: 52,
  sectionBackgroundImageUrl: 53,
  alignment: 60,
  textAlign: 61,
  layout: 62,
  columns: 63,
  imageWidth: 64,
  imagePosition: 65,
};

function defaultColorValueForKey(key: string) {
  if (key === "overlayColor" || key === "sectionBackgroundOverlayColor") return "#000000";
  return key === "sectionRadialGradientColor" ? DEFAULT_RADIAL_GRADIENT_COLOR : DEFAULT_COLOR_VALUE;
}

function normalizeColorValue(value: string, key: string) {
  const trimmed = value.trim();
  return /^#([0-9a-f]{6}|[0-9a-f]{3})$/i.test(trimmed) ? trimmed : defaultColorValueForKey(key);
}

function orderPropDefs(propDefs: PropDef[]) {
  return propDefs
    .map((propDef, index) => ({ propDef, index }))
    .sort((a, b) => {
      const aPriority = PROP_DISPLAY_PRIORITY[a.propDef.key] ?? 1000;
      const bPriority = PROP_DISPLAY_PRIORITY[b.propDef.key] ?? 1000;
      if (aPriority !== bPriority) return aPriority - bPriority;
      return a.index - b.index;
    })
    .map(({ propDef }) => propDef);
}

function inferInspectorGroup(propDef: PropDef): InspectorGroup {
  const normalizedKey = propDef.key.toLowerCase();

  if (SECTION_SETTING_KEYS.has(propDef.key)) return "settings";
  if (propDef.type === "image-url") return "media";
  if (POSITION_PICKER_KEYS.has(propDef.key)) return "media";
  if (MEDIA_KEY_FRAGMENTS.some((fragment) => normalizedKey.includes(fragment))) return "media";
  if (LAYOUT_KEYS.has(propDef.key)) return "layout";
  if (SETTINGS_KEY_FRAGMENTS.some((fragment) => normalizedKey.includes(fragment))) return "settings";
  if (propDef.type === "color" || propDef.type === "boolean") return "settings";

  return "content";
}

function getContextualPropDefs(propDefs: PropDef[]) {
  const filtered = propDefs.filter((propDef) => {
    const key = propDef.key.toLowerCase();

    if (SECTION_SETTING_KEYS.has(propDef.key)) return false;
    if (propDef.type === "color") return false;
    if (key.includes("overlay") || key.includes("padding")) return false;

    if (propDef.type === "image-url") return true;
    if (propDef.type === "richtext") return true;
    if (propDef.type === "array-items") return true;
    if (Object.prototype.hasOwnProperty.call(CONTEXTUAL_PRIORITY, propDef.key)) return true;
    if (LAYOUT_KEYS.has(propDef.key)) return true;

    return false;
  });

  const sorted = filtered.sort((a, b) => {
    const aPriority = CONTEXTUAL_PRIORITY[a.key] ?? 1000;
    const bPriority = CONTEXTUAL_PRIORITY[b.key] ?? 1000;
    if (aPriority !== bPriority) return aPriority - bPriority;
    return propDefs.indexOf(a) - propDefs.indexOf(b);
  });

  if (sorted.length > 0) {
    return sorted.slice(0, 8);
  }

  return propDefs.filter((propDef) => !SECTION_SETTING_KEYS.has(propDef.key)).slice(0, 6);
}

function ArrayItemsField({
  propDef,
  value,
  onChange,
}: {
  propDef: PropDef;
  value: Record<string, unknown>[];
  onChange: (val: Record<string, unknown>[]) => void;
}) {
  const schema = propDef.itemSchema ?? [];

  const addItem = () => {
    const blank: Record<string, unknown> = {};
    schema.forEach((s) => (blank[s.key] = s.type === "boolean" ? false : ""));
    onChange([...value, blank]);
  };

  const removeItem = (idx: number) => {
    onChange(value.filter((_, i) => i !== idx));
  };

  const updateItem = (idx: number, key: string, val: unknown) => {
    const next = value.map((item, i) =>
      i === idx ? { ...item, [key]: val } : item
    );
    onChange(next);
  };

  return (
    <div className="space-y-3">
      {value.map((item, idx) => (
        <div key={idx} className="border rounded-lg p-3 space-y-2 bg-muted/20 relative">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
              Item {idx + 1}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-destructive"
              onClick={() => removeItem(idx)}
              data-testid={`array-item-remove-${idx}`}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
          {schema.map((field) => (
            <div key={field.key} className="space-y-1">
              <Label className="text-[11px] text-muted-foreground">{field.label}</Label>
              {field.type === "boolean" ? (
                <div className="flex items-center gap-2 pt-1">
                  <Switch
                    checked={Boolean(item[field.key])}
                    onCheckedChange={(checked) => updateItem(idx, field.key, checked)}
                    data-testid={`array-item-${idx}-${field.key}`}
                  />
                  <span className="text-xs text-muted-foreground">{Boolean(item[field.key]) ? "Yes" : "No"}</span>
                </div>
              ) : field.type === "image-url" ? (
                <CmsImageUpload
                  value={String(item[field.key] ?? "")}
                  onChange={(url) => updateItem(idx, field.key, url)}
                  data-testid={`array-item-${idx}-${field.key}`}
                />
              ) : field.type === "textarea" ? (
                <Textarea
                  value={String(item[field.key] ?? "")}
                  onChange={(e) => updateItem(idx, field.key, e.target.value)}
                  placeholder={field.placeholder}
                  rows={2}
                  className="text-xs"
                />
              ) : field.type === "select" ? (
                <Select
                  value={String(item[field.key] ?? "")}
                  onValueChange={(val) => updateItem(idx, field.key, val)}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(field.options ?? []).map((opt) => (
                      <SelectItem key={opt.value} value={opt.value} className="text-xs">
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  value={String(item[field.key] ?? "")}
                  onChange={(e) => updateItem(idx, field.key, e.target.value)}
                  placeholder={field.placeholder}
                  className="h-8 text-xs"
                />
              )}
            </div>
          ))}
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full text-xs"
        onClick={addItem}
        data-testid="array-items-add"
      >
        <Plus className="h-3 w-3 mr-1" />
        Add {propDef.label.replace(/s$/, "")}
      </Button>
    </div>
  );
}

function PropField({
  propDef,
  value,
  onChange,
}: {
  propDef: PropDef;
  value: unknown;
  onChange: (val: unknown) => void;
}) {
  const strVal = String(value ?? "");
  const numVal = Number(value ?? 0);
  const boolVal = Boolean(value);

  switch (propDef.type) {
    case "text":
    case "url":
      return (
        <Input
          value={strVal}
          onChange={(e) => onChange(e.target.value)}
          placeholder={propDef.placeholder}
          className="text-sm"
          data-testid={`prop-input-${propDef.key}`}
        />
      );
    case "textarea":
      return (
        <Textarea
          value={strVal}
          onChange={(e) => onChange(e.target.value)}
          placeholder={propDef.placeholder}
          rows={4}
          className="text-sm"
          data-testid={`prop-textarea-${propDef.key}`}
        />
      );
    case "richtext":
      return (
        <CmsRichTextEditor
          value={strVal}
          onChange={onChange}
          placeholder={propDef.placeholder}
          data-testid={`prop-richtext-${propDef.key}`}
        />
      );
    case "image-url":
      return (
        <CmsImageUpload
          value={strVal}
          onChange={(url) => onChange(url)}
          data-testid={`prop-image-${propDef.key}`}
        />
      );
    case "select":
      return (
        <Select value={strVal} onValueChange={onChange} data-testid={`prop-select-${propDef.key}`}>
          <SelectTrigger>
            <SelectValue placeholder="Select…" />
          </SelectTrigger>
          <SelectContent>
            {(propDef.options ?? []).map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    case "boolean":
      return (
        <div className="flex items-center gap-2">
          <Switch
            checked={boolVal}
            onCheckedChange={onChange}
            data-testid={`prop-switch-${propDef.key}`}
          />
          <span className="text-sm text-muted-foreground">{boolVal ? "Enabled" : "Disabled"}</span>
        </div>
      );
    case "number":
      return (
        <Input
          type="number"
          value={numVal}
          min={propDef.min}
          max={propDef.max}
          onChange={(e) => onChange(Number(e.target.value))}
          className="text-sm"
          data-testid={`prop-number-${propDef.key}`}
        />
      );
    case "color":
      return (
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={normalizeColorValue(strVal, propDef.key)}
            onChange={(e) => onChange(e.target.value)}
            className="h-10 w-12 rounded-md border border-input bg-background p-1 cursor-pointer"
            data-testid={`prop-color-swatch-${propDef.key}`}
          />
          <Input
            value={strVal}
            onChange={(e) => onChange(e.target.value)}
            placeholder={propDef.placeholder ?? defaultColorValueForKey(propDef.key)}
            className="text-sm font-mono"
            data-testid={`prop-color-${propDef.key}`}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onChange("")}
            data-testid={`prop-color-clear-${propDef.key}`}
          >
            Clear
          </Button>
        </div>
      );
    case "array-items":
      return (
        <ArrayItemsField
          propDef={propDef}
          value={Array.isArray(value) ? (value as Record<string, unknown>[]) : []}
          onChange={onChange}
        />
      );
    default:
      return null;
  }
}

export function BlockEditor({
  blockDef,
  props,
  onChange,
  mode = "full",
  onOpenAdvanced,
}: BlockEditorProps) {
  const setProp = (key: string, val: unknown) => {
    onChange({ ...props, [key]: val });
  };
  const orderedPropDefs = orderPropDefs(blockDef.propDefs);
  const groupedPropDefs = useMemo(() => {
    const groups: Record<InspectorGroup, PropDef[]> = {
      content: [],
      media: [],
      layout: [],
      settings: [],
    };

    for (const propDef of orderedPropDefs) {
      groups[inferInspectorGroup(propDef)].push(propDef);
    }

    return groups;
  }, [orderedPropDefs]);

  const availableGroups = (Object.keys(groupedPropDefs) as InspectorGroup[]).filter(
    (group) => groupedPropDefs[group].length > 0
  );
  const defaultGroup = availableGroups[0] ?? "content";
  const contextualPropDefs = useMemo(() => getContextualPropDefs(orderedPropDefs), [orderedPropDefs]);
  const contextualGroups = useMemo(() => {
    const groups: Record<InspectorGroup, PropDef[]> = {
      content: [],
      media: [],
      layout: [],
      settings: [],
    };

    for (const propDef of contextualPropDefs) {
      groups[inferInspectorGroup(propDef)].push(propDef);
    }

    return (Object.keys(groups) as InspectorGroup[]).filter((group) => groups[group].length > 0).map((group) => ({
      group,
      propDefs: groups[group],
    }));
  }, [contextualPropDefs]);

  const renderPropList = (propDefs: PropDef[]) =>
    propDefs.map((propDef, idx) => {
      if (POSITION_PICKER_KEYS.has(propDef.key)) return null;

      const imagePositionFieldGroup = IMAGE_POSITION_FIELD_GROUPS.find(
        (group) => group.imageKey === propDef.key
      );
      const backgroundImageUrl = imagePositionFieldGroup
        ? String(props[imagePositionFieldGroup.imageKey] ?? "")
        : "";
      const hasPositionProps = imagePositionFieldGroup
        ? propDefs.some((p) => p.key === imagePositionFieldGroup.positionXKey)
        : false;

      return (
        <div key={propDef.key}>
          {idx > 0 && propDef.type === "array-items" && <Separator className="mb-4" />}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">{propDef.label}</Label>
            <PropField
              propDef={propDef}
              value={props[propDef.key]}
              onChange={(val) => setProp(propDef.key, val)}
            />
          </div>
          {imagePositionFieldGroup && hasPositionProps && backgroundImageUrl && (
            <div className="mt-3">
              <ImagePositionPicker
                imageUrl={backgroundImageUrl}
                positionX={Number(props[imagePositionFieldGroup.positionXKey] ?? 50)}
                positionY={Number(props[imagePositionFieldGroup.positionYKey] ?? 50)}
                onPositionChange={(x, y) => {
                  onChange({
                    ...props,
                    [imagePositionFieldGroup.positionXKey]: x,
                    [imagePositionFieldGroup.positionYKey]: y,
                  });
                }}
              />
            </div>
          )}
        </div>
      );
    });

  const editorIntro = (
    <div className="space-y-1 bg-background">
      <p className="text-sm font-semibold">{blockDef.label}</p>
      <p className="text-xs text-muted-foreground">{blockDef.description}</p>
    </div>
  );

  return (
    <div className="space-y-5">
      {mode === "contextual" ? (
        <div className="space-y-4">
          {editorIntro}
          <Separator />
          {contextualGroups.length > 0 ? (
            contextualGroups.map(({ group, propDefs }) => (
              <div key={group} className="space-y-3">
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {GROUP_METADATA[group].label}
                  </p>
                  <p className="text-xs text-muted-foreground">{GROUP_METADATA[group].description}</p>
                </div>
                {renderPropList(propDefs)}
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">
              This section does not have common inline controls yet. Use advanced settings for full editing.
            </p>
          )}

          <Separator />
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              Need backgrounds, overlays, detailed styling, or less common fields?
            </p>
            {onOpenAdvanced && (
              <Button type="button" variant="outline" size="sm" onClick={onOpenAdvanced}>
                More Settings
              </Button>
            )}
          </div>
        </div>
      ) : availableGroups.length <= 1 ? (
        <div className="space-y-4">
          <div className="sticky top-0 z-10 -mx-4 border-b border-border/70 bg-background/95 px-4 pb-3 pt-1 backdrop-blur">
            {editorIntro}
          </div>
          <div className="px-0 pb-1">
            {renderPropList(groupedPropDefs[defaultGroup])}
          </div>
        </div>
      ) : (
        <Tabs defaultValue={defaultGroup} className="space-y-4">
          <div className="sticky top-0 z-10 -mx-4 space-y-3 border-b border-border/70 bg-background/95 px-4 pb-3 pt-1 backdrop-blur">
            {editorIntro}
            <TabsList
              className={`grid w-full ${
                availableGroups.length === 2
                  ? "grid-cols-2"
                  : availableGroups.length === 3
                    ? "grid-cols-3"
                    : "grid-cols-4"
              }`}
            >
              {availableGroups.map((group) => (
                <TabsTrigger key={group} value={group} className="text-xs">
                  {GROUP_METADATA[group].label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
          {availableGroups.map((group) => (
            <TabsContent key={group} value={group} className="mt-0 space-y-4">
              <div className="space-y-1">
                <p className="text-sm font-semibold">{GROUP_METADATA[group].label}</p>
                <p className="text-xs text-muted-foreground">{GROUP_METADATA[group].description}</p>
              </div>
              {renderPropList(groupedPropDefs[group])}
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
}

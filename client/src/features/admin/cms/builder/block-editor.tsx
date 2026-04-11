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
import { Plus, Trash2 } from "lucide-react";
import type { BlockDef, PropDef } from "./block-registry";
import { CmsImageUpload } from "../components/cms-image-upload";
import { ImagePositionPicker } from "../components/image-position-picker";
import { CmsRichTextEditor } from "./cms-rich-text-editor";

interface BlockEditorProps {
  blockDef: BlockDef;
  props: Record<string, unknown>;
  onChange: (props: Record<string, unknown>) => void;
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
]);

const IMAGE_POSITION_FIELD_GROUPS = [
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

export function BlockEditor({ blockDef, props, onChange }: BlockEditorProps) {
  const setProp = (key: string, val: unknown) => {
    onChange({ ...props, [key]: val });
  };
  const orderedPropDefs = orderPropDefs(blockDef.propDefs);

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-semibold">{blockDef.label}</p>
        <p className="text-xs text-muted-foreground">{blockDef.description}</p>
      </div>
      <Separator />
      {orderedPropDefs.map((propDef, idx) => {
        if (POSITION_PICKER_KEYS.has(propDef.key)) return null;
        const showSectionStyleHeading =
          SECTION_STYLE_KEYS.has(propDef.key) &&
          !orderedPropDefs.slice(0, idx).some((previous) => SECTION_STYLE_KEYS.has(previous.key));

        const imagePositionFieldGroup = IMAGE_POSITION_FIELD_GROUPS.find(
          (group) => group.imageKey === propDef.key
        );
        const backgroundImageUrl = imagePositionFieldGroup
          ? String(props[imagePositionFieldGroup.imageKey] ?? "")
          : "";
        const hasPositionProps = imagePositionFieldGroup
          ? orderedPropDefs.some((p) => p.key === imagePositionFieldGroup.positionXKey)
          : false;

        return (
          <div key={propDef.key}>
            {showSectionStyleHeading && (
              <>
                <Separator className="mb-4" />
                <div className="space-y-1 mb-4">
                  <p className="text-sm font-semibold">Section Background</p>
                  <p className="text-xs text-muted-foreground">
                    Add a background color or image, then tune image overlay and radial gradient options.
                  </p>
                </div>
              </>
            )}
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
      })}
    </div>
  );
}

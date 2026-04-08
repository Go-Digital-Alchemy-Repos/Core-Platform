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

interface BlockEditorProps {
  blockDef: BlockDef;
  props: Record<string, unknown>;
  onChange: (props: Record<string, unknown>) => void;
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
    case "richtext":
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

const POSITION_PICKER_KEYS = new Set(["backgroundPositionX", "backgroundPositionY"]);

export function BlockEditor({ blockDef, props, onChange }: BlockEditorProps) {
  const setProp = (key: string, val: unknown) => {
    onChange({ ...props, [key]: val });
  };

  const hasPositionProps = blockDef.propDefs.some((p) => p.key === "backgroundPositionX");
  const bgImageUrl = String(props.backgroundImageUrl ?? "");

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-semibold">{blockDef.label}</p>
        <p className="text-xs text-muted-foreground">{blockDef.description}</p>
      </div>
      <Separator />
      {blockDef.propDefs.map((propDef, idx) => {
        if (POSITION_PICKER_KEYS.has(propDef.key)) return null;

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
            {propDef.key === "backgroundImageUrl" && hasPositionProps && bgImageUrl && (
              <div className="mt-3">
                <ImagePositionPicker
                  imageUrl={bgImageUrl}
                  positionX={Number(props.backgroundPositionX ?? 50)}
                  positionY={Number(props.backgroundPositionY ?? 50)}
                  onPositionChange={(x, y) => {
                    onChange({ ...props, backgroundPositionX: x, backgroundPositionY: y });
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

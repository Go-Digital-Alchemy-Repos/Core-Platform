import { useRef } from "react";
import { useMutation } from "@tanstack/react-query";
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
import { useToast } from "@/hooks/use-toast";
import { Upload, Plus, Trash2, GripVertical, AlertCircle } from "lucide-react";
import type { BlockDef, PropDef } from "./block-registry";

interface BlockEditorProps {
  blockDef: BlockDef;
  props: Record<string, unknown>;
  onChange: (props: Record<string, unknown>) => void;
}

function ImageUrlField({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
}) {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/uploads/attachment", {
        method: "POST",
        credentials: "include",
        body: fd,
      });
      if (!res.ok) throw new Error("Upload failed");
      return res.json() as Promise<{ url: string }>;
    },
    onSuccess: (data) => {
      onChange(data.url);
      toast({ title: "Image uploaded" });
    },
    onError: () => toast({ title: "Upload failed", variant: "destructive" }),
  });

  return (
    <div className="space-y-1.5">
      <div className="flex gap-2">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder ?? "Upload or enter image URL"}
          className="font-mono text-xs"
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="flex-shrink-0"
          onClick={() => fileRef.current?.click()}
          disabled={uploadMutation.isPending}
          title="Upload image"
        >
          <Upload className="h-3.5 w-3.5" />
        </Button>
      </div>
      <p className="flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400">
        <AlertCircle className="h-3 w-3 flex-shrink-0" />
        R2 media picker coming in next phase — direct upload active now
      </p>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) uploadMutation.mutate(f);
          e.target.value = "";
        }}
      />
    </div>
  );
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
    schema.forEach((s) => (blank[s.key] = ""));
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
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
          {schema.map((field) => (
            <div key={field.key} className="space-y-1">
              <Label className="text-[11px] text-muted-foreground">{field.label}</Label>
              {field.type === "textarea" ? (
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
        />
      );
    case "image-url":
      return (
        <ImageUrlField
          value={strVal}
          onChange={onChange}
          placeholder={propDef.placeholder}
        />
      );
    case "select":
      return (
        <Select value={strVal} onValueChange={onChange}>
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
          <Switch checked={boolVal} onCheckedChange={onChange} />
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

export function BlockEditor({ blockDef, props, onChange }: BlockEditorProps) {
  const setProp = (key: string, val: unknown) => {
    onChange({ ...props, [key]: val });
  };

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-semibold">{blockDef.label}</p>
        <p className="text-xs text-muted-foreground">{blockDef.description}</p>
      </div>
      <Separator />
      {blockDef.propDefs.map((propDef, idx) => (
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
        </div>
      ))}
    </div>
  );
}

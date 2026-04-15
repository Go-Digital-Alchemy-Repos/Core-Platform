import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import type { CmsForm, CmsFormField } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface PublicFormRendererProps {
  slug: string;
  className?: string;
  showHeader?: boolean;
  descriptionOverride?: string;
  buttonTextOverride?: string;
  compact?: boolean;
}

function renderFieldInput(
  field: CmsFormField,
  value: string,
  setValue: (next: string) => void,
  compact: boolean
) {
  if (field.type === "textarea") {
    return (
      <Textarea
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={field.placeholder}
        rows={compact ? 3 : 5}
      />
    );
  }

  if (field.type === "select") {
    return (
      <Select value={value} onValueChange={setValue}>
        <SelectTrigger>
          <SelectValue placeholder={field.placeholder || `Select ${field.label.toLowerCase()}`} />
        </SelectTrigger>
        <SelectContent>
          {(field.options ?? []).map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  return (
    <Input
      type={field.type === "email" ? "email" : field.type === "tel" ? "tel" : "text"}
      value={value}
      onChange={(event) => setValue(event.target.value)}
      placeholder={field.placeholder}
      autoPrependHttps={false}
    />
  );
}

export function PublicFormRenderer({
  slug,
  className,
  showHeader = true,
  descriptionOverride,
  buttonTextOverride,
  compact = false,
}: PublicFormRendererProps) {
  const { toast } = useToast();
  const [values, setValues] = useState<Record<string, string>>({});

  const { data: form, isLoading } = useQuery<CmsForm>({
    queryKey: ["/api/forms", slug],
    queryFn: async () => {
      const response = await fetch(`/api/forms/${slug}`, { credentials: "include" });
      if (!response.ok) {
        throw new Error("Form not found");
      }
      return response.json();
    },
    staleTime: 60_000,
  });

  const fields = useMemo(() => (Array.isArray(form?.fields) ? form.fields : []), [form?.fields]);
  const description =
    descriptionOverride ??
    (typeof form?.description === "string" && form.description.trim() ? form.description : "");
  const submitLabel =
    buttonTextOverride ??
    (typeof form?.settings === "object" &&
    form?.settings &&
    typeof form.settings.submitButtonText === "string" &&
    form.settings.submitButtonText.trim()
      ? form.settings.submitButtonText.trim()
      : "Submit");

  const mutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/forms/${slug}/submit`, values);
    },
    onSuccess: async (response) => {
      const payload = (await response.json()) as { message?: string };
      toast({
        title: "Form submitted",
        description: payload.message || "Thanks! Your submission has been received.",
      });
      setValues({});
    },
    onError: (error: Error) => {
      toast({
        title: "Submission failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className={cn("flex items-center justify-center py-10", className)}>
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!form) {
    return (
      <div className={cn("rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground", className)}>
        This form is unavailable right now.
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)} data-testid={`public-form-${slug}`}>
      {showHeader && (
        <div className="space-y-1">
          <h3 className="font-semibold public-heading-3">{form.name}</h3>
          {description ? <p className="text-sm public-supporting-copy">{description}</p> : null}
        </div>
      )}
      {!showHeader && description ? <p className="text-sm public-supporting-copy">{description}</p> : null}

      <form
        className={cn("space-y-4", compact ? "space-y-3" : "space-y-4")}
        onSubmit={(event) => {
          event.preventDefault();
          mutation.mutate();
        }}
      >
        <div className={cn("grid gap-4", compact ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2")}>
          {fields.map((field) => (
            <div
              key={field.id}
              className={cn(
                "space-y-1.5",
                field.type === "textarea" || field.width !== "half" || compact ? "md:col-span-2" : "md:col-span-1"
              )}
            >
              <Label htmlFor={`${slug}-${field.key}`}>{field.label}</Label>
              {renderFieldInput(
                field,
                values[field.key] ?? "",
                (next) => setValues((current) => ({ ...current, [field.key]: next })),
                compact
              )}
              {field.helpText ? <p className="text-xs public-helper-text">{field.helpText}</p> : null}
            </div>
          ))}
        </div>

        <Button type="submit" disabled={mutation.isPending} className={compact ? "w-full" : undefined}>
          {mutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {submitLabel}
        </Button>
      </form>
    </div>
  );
}

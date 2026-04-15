import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button, type ButtonProps } from "@/components/ui/button";
import { PublicFormRenderer } from "./public-form-renderer";

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export interface FormModalButtonProps extends Omit<ButtonProps, "children"> {
  label: string;
  action?: unknown;
  href?: unknown;
  formSlug?: unknown;
  modalTitle?: unknown;
  modalDescription?: unknown;
  testId?: string;
}

export function FormModalButton({
  label,
  action,
  href,
  formSlug,
  modalTitle,
  modalDescription,
  testId,
  ...buttonProps
}: FormModalButtonProps) {
  const [open, setOpen] = useState(false);
  const closeTimeoutRef = useRef<number | null>(null);
  const normalizedAction = text(action) === "form-modal" ? "form-modal" : "url";
  const normalizedHref = text(href) || "#";
  const normalizedFormSlug = text(formSlug);
  const resolvedModalTitle = text(modalTitle) || label;
  const resolvedModalDescription = text(modalDescription);

  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current !== null) {
        window.clearTimeout(closeTimeoutRef.current);
      }
    };
  }, []);

  if (normalizedAction === "form-modal" && normalizedFormSlug) {
    return (
      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          if (!nextOpen && closeTimeoutRef.current !== null) {
            window.clearTimeout(closeTimeoutRef.current);
            closeTimeoutRef.current = null;
          }
          setOpen(nextOpen);
        }}
      >
        <DialogTrigger asChild>
          <Button {...buttonProps} data-testid={testId}>
            {label}
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{resolvedModalTitle}</DialogTitle>
            {resolvedModalDescription ? (
              <DialogDescription>{resolvedModalDescription}</DialogDescription>
            ) : null}
          </DialogHeader>
          <PublicFormRenderer
            slug={normalizedFormSlug}
            showHeader={false}
            descriptionOverride={resolvedModalDescription || undefined}
            onSubmitSuccess={() => {
              if (closeTimeoutRef.current !== null) {
                window.clearTimeout(closeTimeoutRef.current);
              }
              closeTimeoutRef.current = window.setTimeout(() => {
                setOpen(false);
                closeTimeoutRef.current = null;
              }, 1200);
            }}
          />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Link href={normalizedHref}>
      <Button {...buttonProps} data-testid={testId}>
        {label}
      </Button>
    </Link>
  );
}

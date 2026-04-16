import { type HTMLAttributes, useMemo } from "react";
import { cn } from "@/lib/utils";
import { markdownToHtml } from "@/lib/markdown";

type MarkdownDocumentProps = HTMLAttributes<HTMLDivElement> & {
  content: string;
};

export function MarkdownDocument({ content, className, ...props }: MarkdownDocumentProps) {
  const html = useMemo(() => markdownToHtml(content), [content]);

  return (
    <div
      {...props}
      className={cn("prose prose-sm max-w-none", className)}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

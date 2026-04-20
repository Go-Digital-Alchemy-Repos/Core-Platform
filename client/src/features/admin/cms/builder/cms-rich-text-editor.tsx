import { useEffect, useState, type ReactNode } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import Underline from "@tiptap/extension-underline";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Bold,
  Code,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Quote,
  Redo2,
  Strikethrough,
  Underline as UnderlineIcon,
  Undo2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { createCmsLinkExtension, createStarterKit } from "@/lib/tiptap";

interface CmsRichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  "data-testid"?: string;
}

function ToolbarSep() {
  return <div className="mx-0.5 h-5 w-px shrink-0 bg-border" />;
}

function ToolbarButton({
  active,
  children,
  disabled,
  onClick,
  title,
}: {
  active?: boolean;
  children: ReactNode;
  disabled?: boolean;
  onClick: () => void;
  title: string;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      disabled={disabled}
      onClick={onClick}
      title={title}
      className={cn(
        "h-8 min-w-8 shrink-0 rounded-md px-2 text-xs",
        active && "bg-primary/10 text-primary ring-1 ring-primary/20"
      )}
    >
      {children}
    </Button>
  );
}

export function CmsRichTextEditor({
  value,
  onChange,
  placeholder,
  "data-testid": testId,
}: CmsRichTextEditorProps) {
  const [activeTab, setActiveTab] = useState<"visual" | "html">("visual");
  const [showLinkPanel, setShowLinkPanel] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkText, setLinkText] = useState("");
  const [linkOpenInNewTab, setLinkOpenInNewTab] = useState(false);

  const editor = useEditor({
    extensions: [
      createStarterKit({
        heading: { levels: [2, 3] },
      }),
      Underline,
      createCmsLinkExtension(),
      Placeholder.configure({
        placeholder: placeholder ?? "Write and format your content here...",
      }),
    ],
    content: value || "",
    onUpdate({ editor }) {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          "prose prose-slate max-w-none min-h-[220px] px-4 py-3 text-sm leading-relaxed outline-none focus:outline-none",
      },
    },
  });

  useEffect(() => {
    if (!editor) return;
    const nextValue = value || "";
    if (nextValue !== editor.getHTML()) {
      editor.commands.setContent(nextValue);
    }
  }, [editor, value]);

  const insertLink = () => {
    if (!editor || !linkUrl.trim()) return;
    let url = linkUrl.trim();
    if (!/^https?:\/\//i.test(url)) url = `https://${url}`;

    const { from, to } = editor.state.selection;
    if (from === to && linkText.trim()) {
      editor
        .chain()
        .focus()
        .insertContent({
          type: "text",
          text: linkText.trim(),
          marks: [{
            type: "link",
            attrs: {
              href: url,
              target: linkOpenInNewTab ? "_blank" : null,
              rel: linkOpenInNewTab ? "noopener noreferrer" : null,
            },
          }],
        })
        .run();
    } else {
      editor
        .chain()
        .focus()
        .extendMarkRange("link")
        .setLink({
          href: url,
          target: linkOpenInNewTab ? "_blank" : null,
          rel: linkOpenInNewTab ? "noopener noreferrer" : null,
        })
        .run();
    }

    setLinkUrl("");
    setLinkText("");
    setLinkOpenInNewTab(false);
    setShowLinkPanel(false);
  };

  if (!editor) return null;

  return (
    <Tabs value={activeTab} onValueChange={(tab) => setActiveTab(tab as "visual" | "html")} className="w-full">
      <div className="mb-2 flex items-center justify-between gap-3">
        <TabsList className="h-9 rounded-full">
          <TabsTrigger value="visual" className="rounded-full px-3 text-xs" data-testid={`${testId}-visual-tab`}>
            Visual
          </TabsTrigger>
          <TabsTrigger value="html" className="rounded-full px-3 text-xs" data-testid={`${testId}-html-tab`}>
            HTML
          </TabsTrigger>
        </TabsList>
        <p className="text-[11px] text-muted-foreground">Use HTML only when you need advanced control.</p>
      </div>

      <TabsContent value="visual" className="mt-0">
        <div
          className="overflow-hidden rounded-xl border bg-background shadow-sm focus-within:ring-1 focus-within:ring-ring"
          data-testid={testId}
        >
          <div className="flex flex-wrap items-center gap-1 border-b bg-muted/40 px-2 py-2">
            <ToolbarButton onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="Undo">
              <Undo2 className="h-3.5 w-3.5" />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="Redo">
              <Redo2 className="h-3.5 w-3.5" />
            </ToolbarButton>
            <ToolbarSep />
            <ToolbarButton active={editor.isActive("paragraph")} onClick={() => editor.chain().focus().setParagraph().run()} title="Paragraph">
              <span className="font-semibold leading-none">P</span>
            </ToolbarButton>
            <ToolbarButton active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} title="Heading">
              <span className="font-semibold leading-none">H2</span>
            </ToolbarButton>
            <ToolbarSep />
            <ToolbarButton active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()} title="Bold">
              <Bold className="h-3.5 w-3.5" />
            </ToolbarButton>
            <ToolbarButton active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()} title="Italic">
              <Italic className="h-3.5 w-3.5" />
            </ToolbarButton>
            <ToolbarButton active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()} title="Underline">
              <UnderlineIcon className="h-3.5 w-3.5" />
            </ToolbarButton>
            <ToolbarButton active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()} title="Strikethrough">
              <Strikethrough className="h-3.5 w-3.5" />
            </ToolbarButton>
            <ToolbarButton active={editor.isActive("code")} onClick={() => editor.chain().focus().toggleCode().run()} title="Inline code">
              <Code className="h-3.5 w-3.5" />
            </ToolbarButton>
            <ToolbarSep />
            <ToolbarButton active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Bullet list">
              <List className="h-3.5 w-3.5" />
            </ToolbarButton>
            <ToolbarButton active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Numbered list">
              <ListOrdered className="h-3.5 w-3.5" />
            </ToolbarButton>
            <ToolbarButton active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()} title="Quote">
              <Quote className="h-3.5 w-3.5" />
            </ToolbarButton>
            <ToolbarSep />
            <ToolbarButton
              active={showLinkPanel || editor.isActive("link")}
              onClick={() => {
                const existingUrl = editor.getAttributes("link").href as string | undefined;
                const existingTarget = editor.getAttributes("link").target as string | undefined;
                setLinkUrl(existingUrl ?? "");
                setLinkOpenInNewTab(existingTarget === "_blank");
                setShowLinkPanel((open) => !open);
              }}
              title="Insert or edit link"
            >
              <LinkIcon className="h-3.5 w-3.5" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
              title="Clear formatting"
            >
              <span className="font-semibold leading-none">Tx</span>
            </ToolbarButton>
          </div>

          {showLinkPanel && (
            <div className="space-y-2 border-b bg-muted/20 px-3 py-3">
              <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                <div className="space-y-1">
                  <Label className="text-xs">Link URL</Label>
                  <Input
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    placeholder="https://example.com"
                    autoPrependHttps
                    className="h-8 text-xs"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        insertLink();
                      }
                    }}
                    data-testid={`${testId}-link-url`}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Link text if nothing is selected</Label>
                  <Input
                    value={linkText}
                    onChange={(e) => setLinkText(e.target.value)}
                    placeholder="Read more"
                    className="h-8 text-xs"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        insertLink();
                      }
                    }}
                    data-testid={`${testId}-link-text`}
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <div className="flex items-center gap-2 pt-1">
                    <Checkbox
                      id={`${testId ?? "cms-richtext"}-link-new-tab`}
                      checked={linkOpenInNewTab}
                      onCheckedChange={(checked) => setLinkOpenInNewTab(checked === true)}
                    />
                    <Label htmlFor={`${testId ?? "cms-richtext"}-link-new-tab`} className="text-xs font-normal">
                      Open in new tab
                    </Label>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button type="button" size="sm" className="h-8 text-xs" onClick={insertLink} disabled={!linkUrl.trim()}>
                    {editor.isActive("link") ? "Update" : "Insert"}
                  </Button>
                  {editor.isActive("link") && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() => {
                        editor.chain().focus().unsetLink().run();
                        setLinkOpenInNewTab(false);
                        setShowLinkPanel(false);
                      }}
                    >
                      Remove
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => {
                      setShowLinkPanel(false);
                      setLinkUrl("");
                      setLinkText("");
                      setLinkOpenInNewTab(false);
                    }}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          <EditorContent editor={editor} data-testid={testId ? `${testId}-content` : "cms-richtext-content"} />
        </div>
      </TabsContent>

      <TabsContent value="html" className="mt-0">
        <Textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          rows={12}
          className="min-h-[300px] rounded-xl font-mono text-xs leading-relaxed"
          data-testid={testId ? `${testId}-html` : "cms-richtext-html"}
        />
      </TabsContent>
    </Tabs>
  );
}

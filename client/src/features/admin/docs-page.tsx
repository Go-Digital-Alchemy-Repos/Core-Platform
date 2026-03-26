import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { AdminSidebar } from "./admin-sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetBody,
  SheetFooter,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, FileText, Edit, Trash2, Eye, EyeOff } from "lucide-react";
import type { Doc } from "@shared/schema";

const DOC_CATEGORIES = [
  "Getting Started",
  "User Management",
  "Mental Health Professional Management",
  "Subscriptions & Billing",
  "Directory & Search",
  "Events",
  "API Reference",
  "System Architecture",
];

export default function DocsPage() {
  const { toast } = useToast();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<Doc | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingDoc, setEditingDoc] = useState<Partial<Doc> | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  const { data: allDocs = [], isLoading } = useQuery<Doc[]>({
    queryKey: ["/api/admin/docs"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: Partial<Doc>) => {
      const res = await apiRequest("POST", "/api/admin/docs", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/docs"] });
      setSheetOpen(false);
      setEditingDoc(null);
      toast({ title: "Document created" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: Partial<Doc> & { id: string }) => {
      const res = await apiRequest("PUT", `/api/admin/docs/${id}`, data);
      return res.json();
    },
    onSuccess: (updated: Doc) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/docs"] });
      setSheetOpen(false);
      setEditingDoc(null);
      if (selectedDoc?.id === updated.id) {
        setSelectedDoc(updated);
      }
      toast({ title: "Document updated" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/admin/docs/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/docs"] });
      setSelectedDoc(null);
      toast({ title: "Document deleted" });
    },
  });

  const filteredDocs = allDocs.filter((doc) => {
    const matchesCategory = !selectedCategory || doc.category === selectedCategory;
    const matchesSearch =
      !searchQuery ||
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.content.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const categories = DOC_CATEGORIES.filter((cat) =>
    allDocs.some((doc) => doc.category === cat)
  );

  const handleSave = () => {
    if (!editingDoc?.title || !editingDoc?.slug || !editingDoc?.category || !editingDoc?.content) {
      toast({ title: "Please fill in all required fields", variant: "destructive" });
      return;
    }
    if (editingDoc.id) {
      updateMutation.mutate(editingDoc as Partial<Doc> & { id: string });
    } else {
      createMutation.mutate(editingDoc);
    }
  };

  const openCreate = () => {
    setEditingDoc({ title: "", slug: "", category: DOC_CATEGORIES[0], content: "", isPublished: true, sortOrder: 0 });
    setShowPreview(false);
    setSheetOpen(true);
  };

  const openEdit = (doc: Doc) => {
    setEditingDoc({ ...doc });
    setShowPreview(false);
    setSheetOpen(true);
  };

  if (isLoading) {
    return (
      <AdminSidebar>
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner />
        </div>
      </AdminSidebar>
    );
  }

  return (
    <AdminSidebar>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-heading font-bold" data-testid="text-page-title">Documentation Library</h1>
          <Button onClick={openCreate} data-testid="button-create-doc">
            <Plus className="w-4 h-4 mr-2" />
            New Document
          </Button>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search documentation..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="input-search-docs"
          />
        </div>

        <div className="flex gap-6">
          <div className="w-56 shrink-0 space-y-1">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`w-full text-left px-3 py-2 rounded-md text-sm ${!selectedCategory ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
              data-testid="button-category-all"
            >
              All Documents
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => { setSelectedCategory(cat); setSelectedDoc(null); }}
                className={`w-full text-left px-3 py-2 rounded-md text-sm ${selectedCategory === cat ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                data-testid={`button-category-${cat.toLowerCase().replace(/\s+/g, "-")}`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="flex-1 min-w-0">
            {selectedDoc ? (
              <Card>
                <CardHeader className="flex flex-row items-start justify-between">
                  <div>
                    <CardTitle className="font-heading" data-testid="text-doc-title">{selectedDoc.title}</CardTitle>
                    <div className="flex gap-2 mt-2">
                      <Badge variant="outline">{selectedDoc.category}</Badge>
                      {selectedDoc.isPublished ? (
                        <Badge data-testid="badge-published">Published</Badge>
                      ) : (
                        <Badge variant="secondary" data-testid="badge-draft">Draft</Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => openEdit(selectedDoc)} data-testid="button-edit-doc">
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => deleteMutation.mutate(selectedDoc.id)} data-testid="button-delete-doc">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setSelectedDoc(null)}>Back</Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-sm max-w-none dark:prose-invert whitespace-pre-wrap" data-testid="text-doc-content">
                    {selectedDoc.content}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3">
                {filteredDocs.length === 0 ? (
                  <Card>
                    <CardContent className="py-8 text-center text-muted-foreground">
                      <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No documents found</p>
                    </CardContent>
                  </Card>
                ) : (
                  filteredDocs.map((doc) => (
                    <Card
                      key={doc.id}
                      className="cursor-pointer hover:border-primary/50 transition-colors"
                      onClick={() => setSelectedDoc(doc)}
                      data-testid={`card-doc-${doc.id}`}
                    >
                      <CardContent className="py-4 flex items-center justify-between">
                        <div>
                          <h3 className="font-medium">{doc.title}</h3>
                          <div className="flex gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">{doc.category}</Badge>
                            {!doc.isPublished && <Badge variant="secondary" className="text-xs">Draft</Badge>}
                          </div>
                        </div>
                        <FileText className="w-5 h-5 text-muted-foreground" />
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" size="xl">
          <SheetHeader>
            <SheetTitle>{editingDoc?.id ? "Edit Document" : "New Document"}</SheetTitle>
            <SheetDescription className="sr-only">
              {editingDoc?.id ? "Edit document content" : "Create a new document"}
            </SheetDescription>
          </SheetHeader>
          <SheetBody>
            {editingDoc && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Title</Label>
                    <Input
                      value={editingDoc.title || ""}
                      onChange={(e) => setEditingDoc({ ...editingDoc, title: e.target.value })}
                      data-testid="input-doc-title"
                    />
                  </div>
                  <div>
                    <Label>Slug</Label>
                    <Input
                      value={editingDoc.slug || ""}
                      onChange={(e) => setEditingDoc({ ...editingDoc, slug: e.target.value })}
                      data-testid="input-doc-slug"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Category</Label>
                    <Select
                      value={editingDoc.category || ""}
                      onValueChange={(v) => setEditingDoc({ ...editingDoc, category: v })}
                    >
                      <SelectTrigger data-testid="select-doc-category">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DOC_CATEGORIES.map((cat) => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end gap-4">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={editingDoc.isPublished ?? true}
                        onCheckedChange={(v) => setEditingDoc({ ...editingDoc, isPublished: v })}
                        data-testid="switch-doc-published"
                      />
                      <Label>{editingDoc.isPublished ? "Published" : "Draft"}</Label>
                    </div>
                    <div>
                      <Label>Sort Order</Label>
                      <Input
                        type="number"
                        value={editingDoc.sortOrder || 0}
                        onChange={(e) => setEditingDoc({ ...editingDoc, sortOrder: parseInt(e.target.value) || 0 })}
                        className="w-20"
                        data-testid="input-doc-sort"
                      />
                    </div>
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label>Content (Markdown)</Label>
                    <Button variant="ghost" size="sm" onClick={() => setShowPreview(!showPreview)}>
                      {showPreview ? <><EyeOff className="w-4 h-4 mr-1" /> Edit</> : <><Eye className="w-4 h-4 mr-1" /> Preview</>}
                    </Button>
                  </div>
                  {showPreview ? (
                    <div className="prose prose-sm max-w-none dark:prose-invert border rounded-md p-4 min-h-[300px] whitespace-pre-wrap">
                      {editingDoc.content}
                    </div>
                  ) : (
                    <Textarea
                      value={editingDoc.content || ""}
                      onChange={(e) => setEditingDoc({ ...editingDoc, content: e.target.value })}
                      rows={15}
                      className="font-mono text-sm"
                      data-testid="textarea-doc-content"
                    />
                  )}
                </div>
              </div>
            )}
          </SheetBody>
          <SheetFooter>
            <Button variant="outline" onClick={() => setSheetOpen(false)}>Cancel</Button>
            <Button
              onClick={handleSave}
              disabled={createMutation.isPending || updateMutation.isPending}
              data-testid="button-save-doc"
            >
              {(createMutation.isPending || updateMutation.isPending) && <LoadingSpinner />}
              Save
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </AdminSidebar>
  );
}

import { useState, useCallback, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { AdminSidebar } from "@/features/admin/admin-sidebar";
import { EditorLockBanner } from "@/components/shared/editor-lock-banner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  Trash2,
  GripVertical,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Pencil,
  MoreVertical,
  ArrowUp,
  ArrowDown,
  CornerDownRight,
  CornerUpLeft,
  Menu as MenuIcon,
  Loader2,
  MapPin,
  LayoutTemplate,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  MENU_LOCATION_LABELS,
  STANDARD_MENU_LOCATIONS,
  LEGACY_MENU_LOCATIONS,
  type CmsMenu,
  type MenuItem,
  type MenuLocation,
} from "@shared/schema";
import { useEditorLock } from "@/hooks/use-editor-lock";
import { useLockConflictGuard } from "@/hooks/use-lock-conflict-guard";

function generateId() {
  return Math.random().toString(36).substring(2, 10);
}

const STANDARD_LOCATION_OPTIONS = STANDARD_MENU_LOCATIONS.map((location) => ({
  value: location,
  label: MENU_LOCATION_LABELS[location],
}));

const LEGACY_LOCATION_OPTIONS = LEGACY_MENU_LOCATIONS.map((location) => ({
  value: location,
  label: MENU_LOCATION_LABELS[location],
}));

function MenuItemEditor({
  item,
  depth,
  index,
  totalSiblings,
  onUpdate,
  onDelete,
  onMoveUp,
  onMoveDown,
  onIndent,
  onOutdent,
}: {
  item: MenuItem;
  depth: number;
  index: number;
  totalSiblings: number;
  onUpdate: (id: string, updates: Partial<MenuItem>) => void;
  onDelete: (id: string) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
  onIndent: (id: string) => void;
  onOutdent: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = item.children && item.children.length > 0;
  const canNest = depth < 3;

  const updateChild = useCallback(
    (childId: string, updates: Partial<MenuItem>) => {
      const updatedChildren = item.children.map((c) =>
        c.id === childId ? { ...c, ...updates } : c
      );
      onUpdate(item.id, { children: updatedChildren });
    },
    [item, onUpdate]
  );

  const deleteChild = useCallback(
    (childId: string) => {
      onUpdate(item.id, {
        children: item.children.filter((c) => c.id !== childId),
      });
    },
    [item, onUpdate]
  );

  const moveChildUp = useCallback(
    (childId: string) => {
      const idx = item.children.findIndex((c) => c.id === childId);
      if (idx <= 0) return;
      const arr = [...item.children];
      [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
      onUpdate(item.id, { children: arr });
    },
    [item, onUpdate]
  );

  const moveChildDown = useCallback(
    (childId: string) => {
      const idx = item.children.findIndex((c) => c.id === childId);
      if (idx < 0 || idx >= item.children.length - 1) return;
      const arr = [...item.children];
      [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]];
      onUpdate(item.id, { children: arr });
    },
    [item, onUpdate]
  );

  const addChild = useCallback(() => {
    const newChild: MenuItem = {
      id: generateId(),
      label: "",
      url: "/",
      openInNewTab: false,
      children: [],
    };
    onUpdate(item.id, { children: [...item.children, newChild] });
  }, [item, onUpdate]);

  return (
    <div className="border rounded-lg bg-card" data-testid={`menu-item-${item.id}`}>
      <div className="flex items-center gap-2 p-3">
        <GripVertical className="h-4 w-4 text-muted-foreground shrink-0 cursor-grab" />

        {hasChildren ? (
          <button
            onClick={() => setExpanded(!expanded)}
            className="shrink-0"
            data-testid={`toggle-children-${item.id}`}
          >
            {expanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
        ) : (
          <div className="w-4 shrink-0" />
        )}

        <div className="flex-1 grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2 items-center">
          <Input
            value={item.label}
            onChange={(e) => onUpdate(item.id, { label: e.target.value })}
            placeholder="Label"
            className="h-8 text-sm"
            data-testid={`input-label-${item.id}`}
          />
          <Input
            value={item.url}
            onChange={(e) => onUpdate(item.id, { url: e.target.value })}
            placeholder="/url or https://..."
            className="h-8 text-sm"
            data-testid={`input-url-${item.id}`}
          />
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground whitespace-nowrap cursor-pointer">
            <input
              type="checkbox"
              checked={item.openInNewTab}
              onChange={(e) => onUpdate(item.id, { openInNewTab: e.target.checked })}
              className="rounded"
              data-testid={`checkbox-newtab-${item.id}`}
            />
            <ExternalLink className="h-3 w-3" />
            New tab
          </label>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" data-testid={`menu-item-actions-${item.id}`}>
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onMoveUp(item.id)} disabled={index === 0}>
              <ArrowUp className="mr-2 h-4 w-4" /> Move up
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onMoveDown(item.id)} disabled={index === totalSiblings - 1}>
              <ArrowDown className="mr-2 h-4 w-4" /> Move down
            </DropdownMenuItem>
            {depth > 1 && (
              <DropdownMenuItem onClick={() => onOutdent(item.id)}>
                <CornerUpLeft className="mr-2 h-4 w-4" /> Outdent
              </DropdownMenuItem>
            )}
            {depth < 3 && index > 0 && (
              <DropdownMenuItem onClick={() => onIndent(item.id)}>
                <CornerDownRight className="mr-2 h-4 w-4" /> Indent
              </DropdownMenuItem>
            )}
            {canNest && (
              <DropdownMenuItem onClick={addChild}>
                <Plus className="mr-2 h-4 w-4" /> Add child item
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              onClick={() => onDelete(item.id)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {hasChildren && expanded && (
        <div className="pl-6 pr-3 pb-3 space-y-2">
          {item.children.map((child, cIdx) => (
            <MenuItemEditor
              key={child.id}
              item={child}
              depth={depth + 1}
              index={cIdx}
              totalSiblings={item.children.length}
              onUpdate={updateChild}
              onDelete={deleteChild}
              onMoveUp={moveChildUp}
              onMoveDown={moveChildDown}
              onIndent={(childId) => {
                if (cIdx === 0) return;
                const arr = [...item.children];
                const prevSibling = arr[cIdx - 1];
                const child = arr[cIdx];
                arr.splice(cIdx, 1);
                prevSibling.children = [...prevSibling.children, child];
                onUpdate(item.id, { children: arr });
              }}
              onOutdent={onOutdent}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function MenuEditor({
  menu,
  draft,
  onClose,
}: {
  menu: CmsMenu | null;
  draft?: Partial<Pick<CmsMenu, "name" | "location">>;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const isNew = !menu;
  const [name, setName] = useState(menu?.name || draft?.name || "");
  const [location, setLocation] = useState<MenuLocation>((menu?.location as MenuLocation) || (draft?.location as MenuLocation) || "unassigned");
  const [items, setItems] = useState<MenuItem[]>((menu?.items as MenuItem[]) || []);
  const editorLock = useEditorLock({
    resourceType: "cms_menu",
    resourceId: isNew ? null : menu?.id ?? null,
    enabled: !isNew,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const body = { name, location, items };
      if (isNew) {
        return apiRequest("POST", "/api/admin/cms/menus", body);
      }
      return apiRequest("PUT", `/api/admin/cms/menus/${menu!.id}`, body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/cms/menus"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cms/menus"] });
      toast({ title: isNew ? "Menu created" : "Menu saved" });
      onClose();
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  useLockConflictGuard({
    active: !isNew && Boolean(menu?.id),
    resourceId: isNew ? null : menu?.id ?? null,
    resourceLabel: "menu",
    editorLock,
    onConflict: onClose,
  });

  const updateItem = useCallback((id: string, updates: Partial<MenuItem>) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
  }, []);

  const deleteItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const moveItemUp = useCallback((id: string) => {
    setItems((prev) => {
      const idx = prev.findIndex((i) => i.id === id);
      if (idx <= 0) return prev;
      const arr = [...prev];
      [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
      return arr;
    });
  }, []);

  const moveItemDown = useCallback((id: string) => {
    setItems((prev) => {
      const idx = prev.findIndex((i) => i.id === id);
      if (idx < 0 || idx >= prev.length - 1) return prev;
      const arr = [...prev];
      [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]];
      return arr;
    });
  }, []);

  const indentItem = useCallback((id: string) => {
    setItems((prev) => {
      const idx = prev.findIndex((i) => i.id === id);
      if (idx <= 0) return prev;
      const arr = [...prev];
      const item = arr[idx];
      const prevSibling = arr[idx - 1];
      arr.splice(idx, 1);
      prevSibling.children = [...prevSibling.children, item];
      return arr;
    });
  }, []);

  const outdentItem = useCallback((id: string) => {
    setItems((prev) => {
      const result: MenuItem[] = [];
      for (let i = 0; i < prev.length; i++) {
        const parent = prev[i];
        const childIdx = parent.children.findIndex((c) => c.id === id);
        if (childIdx >= 0) {
          const child = parent.children[childIdx];
          const newParentChildren = parent.children.filter((_, idx) => idx !== childIdx);
          result.push({ ...parent, children: newParentChildren });
          result.push({ ...child });
        } else {
          const outdented = outdentFromChildren(parent, id);
          result.push(outdented.item);
          if (outdented.extracted) {
            result.push(outdented.extracted);
          }
        }
      }
      return result;
    });
  }, []);

  function outdentFromChildren(parent: MenuItem, targetId: string): { item: MenuItem; extracted?: MenuItem } {
    const newChildren: MenuItem[] = [];
    let extracted: MenuItem | undefined;
    for (const child of parent.children) {
      const childIdx = child.children.findIndex((c) => c.id === targetId);
      if (childIdx >= 0) {
        const target = child.children[childIdx];
        const updatedChild = { ...child, children: child.children.filter((_, idx) => idx !== childIdx) };
        newChildren.push(updatedChild);
        newChildren.push({ ...target });
      } else {
        const result = outdentFromChildren(child, targetId);
        newChildren.push(result.item);
        if (result.extracted) {
          newChildren.push(result.extracted);
        }
      }
    }
    return { item: { ...parent, children: newChildren } };
  }

  const addItem = useCallback(() => {
    setItems((prev) => [
      ...prev,
      {
        id: generateId(),
        label: "",
        url: "/",
        openInNewTab: false,
        children: [],
      },
    ]);
  }, []);

  return (
    <div className="space-y-6">
      {editorLock.summary ? (
        <EditorLockBanner
          variant={editorLock.summary.variant}
          title={editorLock.summary.title}
          description={editorLock.summary.description}
          isLoading={editorLock.isLoading}
          onRefresh={editorLock.acquire}
        />
      ) : null}

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold" data-testid="text-menu-editor-title">
          {isNew ? "Create Menu" : `Edit: ${menu!.name}`}
        </h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={onClose} data-testid="button-cancel-menu">
            Cancel
          </Button>
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={!name.trim() || saveMutation.isPending || editorLock.isReadOnly}
            data-testid="button-save-menu"
          >
            {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isNew ? "Create" : "Save"}
          </Button>
        </div>
      </div>

      <div className={cn("grid grid-cols-1 sm:grid-cols-2 gap-4", editorLock.hasLocking && editorLock.isReadOnly && "pointer-events-none select-none opacity-70")}>
        <div className="space-y-2">
          <Label htmlFor="menu-name">Menu Name</Label>
          <Input
            id="menu-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Main Navigation"
            data-testid="input-menu-name"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="menu-location">Location</Label>
          <select
            id="menu-location"
            value={location}
            onChange={(e) => setLocation(e.target.value as MenuLocation)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            data-testid="select-menu-location"
          >
            <option value="unassigned">Unassigned</option>
            <optgroup label="Theme Locations">
              {STANDARD_LOCATION_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </optgroup>
            <optgroup label="Legacy Locations">
              {LEGACY_LOCATION_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </optgroup>
          </select>
        </div>
      </div>

      <div className={cn("space-y-3", editorLock.hasLocking && editorLock.isReadOnly && "pointer-events-none select-none opacity-70")}>
        <div className="flex items-center justify-between">
          <Label>Menu Items</Label>
          <Button variant="outline" size="sm" onClick={addItem} data-testid="button-add-menu-item">
            <Plus className="mr-1 h-4 w-4" /> Add Item
          </Button>
        </div>

        {items.length === 0 ? (
          <div className="border border-dashed rounded-lg p-8 text-center text-muted-foreground" data-testid="text-no-items">
            <MenuIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No menu items yet. Click "Add Item" to get started.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((item, idx) => (
              <MenuItemEditor
                key={item.id}
                item={item}
                depth={1}
                index={idx}
                totalSiblings={items.length}
                onUpdate={updateItem}
                onDelete={deleteItem}
                onMoveUp={moveItemUp}
                onMoveDown={moveItemDown}
                onIndent={indentItem}
                onOutdent={outdentItem}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function CmsMenusPage() {
  const { toast } = useToast();
  const [editingMenu, setEditingMenu] = useState<CmsMenu | null | "new">(null);
  const [draftMenuDefaults, setDraftMenuDefaults] = useState<Partial<Pick<CmsMenu, "name" | "location">> | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<CmsMenu | null>(null);

  const { data: menus, isLoading } = useQuery<CmsMenu[]>({
    queryKey: ["/api/admin/cms/menus"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/admin/cms/menus/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/cms/menus"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cms/menus"] });
      toast({ title: "Menu deleted" });
      setDeleteConfirm(null);
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const countItems = (items: MenuItem[]): number => {
    let count = 0;
    for (const item of items) {
      count += 1;
      if (item.children) count += countItems(item.children);
    }
    return count;
  };

  const menusByLocation = new Map<MenuLocation, CmsMenu>();
  for (const menu of menus || []) {
    const location = menu.location as MenuLocation;
    if (!menusByLocation.has(location)) {
      menusByLocation.set(location, menu);
    }
  }

  if (editingMenu !== null) {
    return (
      <AdminSidebar>
        <div className="p-6 max-w-4xl mx-auto">
          <MenuEditor
            menu={editingMenu === "new" ? null : editingMenu}
            draft={draftMenuDefaults || undefined}
            onClose={() => {
              setEditingMenu(null);
              setDraftMenuDefaults(null);
            }}
          />
        </div>
      </AdminSidebar>
    );
  }

  return (
    <AdminSidebar>
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-menus-title">Navigation Menus</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Create reusable menus and assign them to theme locations like the main navigation and footer areas.
            </p>
          </div>
          <Button
            onClick={() => {
              setDraftMenuDefaults(null);
              setEditingMenu("new");
            }}
            data-testid="button-create-menu"
          >
            <Plus className="mr-2 h-4 w-4" /> Create Menu
          </Button>
        </div>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <LayoutTemplate className="h-5 w-5 text-violet-500" />
              Theme Locations
            </CardTitle>
            <CardDescription>
              Each location can have one assigned menu, similar to a WordPress theme menu location.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {STANDARD_MENU_LOCATIONS.map((location) => {
              const legacyFallback =
                location === "main_navigation"
                  ? menusByLocation.get("header")
                  : menusByLocation.get("footer");
              const assignedMenu = menusByLocation.get(location);
              const displayMenu = assignedMenu || legacyFallback;
              const isLegacyFallback = !assignedMenu && Boolean(legacyFallback);
              const locationStatus = assignedMenu
                ? assignedMenu.name
                : isLegacyFallback && displayMenu
                  ? `${displayMenu.name} (${location === "main_navigation" ? "legacy header menu" : "legacy footer menu"})`
                  : "No menu assigned yet";
              return (
                <div key={location} className="rounded-lg border p-4" data-testid={`card-menu-location-${location}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">{MENU_LOCATION_LABELS[location]}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{locationStatus}</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (assignedMenu) {
                          setEditingMenu(assignedMenu);
                          setDraftMenuDefaults(null);
                          return;
                        }
                        if (isLegacyFallback && legacyFallback) {
                          setEditingMenu(legacyFallback);
                          setDraftMenuDefaults(null);
                          return;
                        }
                        setDraftMenuDefaults({
                          name: MENU_LOCATION_LABELS[location],
                          location,
                        });
                        setEditingMenu("new");
                      }}
                      data-testid={`button-manage-location-${location}`}
                    >
                      {assignedMenu ? "Edit" : isLegacyFallback ? "Edit Legacy" : "Assign"}
                    </Button>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : !menus || menus.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <MenuIcon className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-medium mb-1" data-testid="text-no-menus">No Menus Yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Create a menu and assign it to a theme location to replace the default navigation.
              </p>
              <Button
                onClick={() => {
                  setDraftMenuDefaults(null);
                  setEditingMenu("new");
                }}
                data-testid="button-create-menu-empty"
              >
                <Plus className="mr-2 h-4 w-4" /> Create Your First Menu
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {menus.map((menu) => {
              const menuItems = (menu.items as MenuItem[]) || [];
              const itemCount = countItems(menuItems);
              return (
                <Card key={menu.id} data-testid={`card-menu-${menu.id}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base">{menu.name}</CardTitle>
                        <CardDescription className="flex items-center gap-2 mt-1">
                          <MapPin className="h-3 w-3" />
                          {MENU_LOCATION_LABELS[(menu.location as MenuLocation) || "unassigned"]}
                          <span className="text-muted-foreground">·</span>
                          {itemCount} item{itemCount !== 1 ? "s" : ""}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingMenu(menu)}
                          data-testid={`button-edit-menu-${menu.id}`}
                        >
                          <Pencil className="mr-1 h-3.5 w-3.5" /> Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDeleteConfirm(menu)}
                          className="text-destructive hover:text-destructive"
                          data-testid={`button-delete-menu-${menu.id}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  {menuItems.length > 0 && (
                    <CardContent className="pt-0">
                      <div className="text-xs text-muted-foreground space-y-0.5">
                        {menuItems.slice(0, 5).map((item) => (
                          <div key={item.id} className="flex items-center gap-1">
                            <span>{item.label || "(no label)"}</span>
                            <span className="opacity-50">→</span>
                            <span className="opacity-75">{item.url}</span>
                            {item.children?.length > 0 && (
                              <span className="opacity-50">
                                (+{countItems(item.children)} nested)
                              </span>
                            )}
                          </div>
                        ))}
                        {menuItems.length > 5 && (
                          <div className="opacity-50">...and {menuItems.length - 5} more</div>
                        )}
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Menu</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deleteConfirm?.name}"? This action cannot be undone.
              {deleteConfirm?.location !== "unassigned" && (
                <span className="block mt-1 font-medium text-destructive">
                  This menu is currently assigned to the {MENU_LOCATION_LABELS[(deleteConfirm?.location as MenuLocation) || "unassigned"]}.
                  Deleting it will revert that area to the default navigation.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)} data-testid="button-cancel-delete">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirm && deleteMutation.mutate(deleteConfirm.id)}
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminSidebar>
  );
}

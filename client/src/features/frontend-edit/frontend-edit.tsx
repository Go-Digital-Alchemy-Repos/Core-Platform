import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Link, useLocation } from "wouter";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";
import type { User } from "@shared/schema";
import type { AdminPermission } from "@shared/types";

export type FrontendEditTargetKind =
  | "cms-page"
  | "blog-post"
  | "event"
  | "career-job"
  | "directory-listing"
  | "product";

export interface FrontendEditTarget {
  id: string;
  kind: FrontendEditTargetKind;
  label: string;
}

type FrontendEditRequirement = AdminPermission | "admin";

interface RegisteredFrontendEditTarget extends FrontendEditTarget {
  key: string;
}

interface FrontendEditContextValue {
  registerTarget: (target: FrontendEditTarget) => () => void;
}

const FrontendEditContext = createContext<FrontendEditContextValue | null>(null);

const FRONTEND_EDIT_REQUIREMENTS: Record<FrontendEditTargetKind, FrontendEditRequirement> = {
  "cms-page": "content",
  "blog-post": "content",
  event: "content",
  "career-job": "content",
  "directory-listing": "directory",
  product: "admin",
};

const HIDDEN_PATH_PREFIXES = [
  "/admin",
  "/auth",
  "/setup",
  "/account",
  "/cart",
  "/checkout",
  "/order-success",
  "/orders",
  "/forms",
  "/reference",
  "/therapist",
];

function getTargetKey(target: FrontendEditTarget) {
  return `${target.kind}:${target.id}`;
}

function appendParams(path: string, params: Record<string, string>) {
  const searchParams = new URLSearchParams(params);
  return `${path}?${searchParams.toString()}`;
}

export function buildFrontendEditHref(target: FrontendEditTarget, returnTo: string) {
  switch (target.kind) {
    case "cms-page":
      return appendParams(`/admin/cms/pages/${target.id}`, { returnTo });
    case "blog-post":
      return appendParams(`/admin/cms/blog/${target.id}`, { returnTo });
    case "event":
      return appendParams("/admin/events", { edit: target.id, returnTo });
    case "career-job":
      return appendParams("/admin/careers", { tab: "jobs", edit: target.id, returnTo });
    case "directory-listing":
      return appendParams("/admin/therapists", { edit: target.id, returnTo });
    case "product":
      return appendParams("/admin/ecommerce/products", { edit: target.id, returnTo });
  }
}

export function shouldHideFrontendEditButton(pathname: string) {
  return HIDDEN_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function canUseFrontendEditTarget(
  user: User | null,
  adminPermissions: AdminPermission[],
  target: FrontendEditTarget,
) {
  if (!user) return false;
  if (user.role === "admin") return true;
  if (user.role !== "editor") return false;

  const requirement = FRONTEND_EDIT_REQUIREMENTS[target.kind];
  if (requirement === "admin") return false;
  return adminPermissions.includes(requirement);
}

export function FrontendEditProvider({ children }: { children: ReactNode }) {
  const [targets, setTargets] = useState<Map<string, RegisteredFrontendEditTarget>>(new Map());

  const value = useMemo<FrontendEditContextValue>(
    () => ({
      registerTarget: (target) => {
        const key = getTargetKey(target);
        setTargets((current) => {
          const next = new Map(current);
          next.set(key, { ...target, key });
          return next;
        });
        return () => {
          setTargets((current) => {
            const next = new Map(current);
            next.delete(key);
            return next;
          });
        };
      },
    }),
    [],
  );

  return (
    <FrontendEditContext.Provider value={value}>
      {children}
      <FrontendEditButton targets={Array.from(targets.values())} />
    </FrontendEditContext.Provider>
  );
}

export function useFrontendEditTarget(target: FrontendEditTarget | null | undefined) {
  const context = useContext(FrontendEditContext);
  const targetKey = target ? getTargetKey(target) : "";
  const label = target?.label ?? "";

  useEffect(() => {
    if (!context || !target) return undefined;
    return context.registerTarget(target);
  }, [context, targetKey, label]);
}

export function getFrontendEditQueryParam(name: string, search = window.location.search) {
  return new URLSearchParams(search).get(name);
}

export function useAdminEditDeepLink<T>(
  items: T[] | null | undefined,
  getItemId: (item: T) => string,
  openItem: (item: T) => void,
) {
  const openedEditIdRef = useRef<string | null>(null);

  useEffect(() => {
    const editId = getFrontendEditQueryParam("edit");
    if (!editId || openedEditIdRef.current === editId) return;

    const item = items?.find((candidate) => getItemId(candidate) === editId);
    if (!item) return;

    openedEditIdRef.current = editId;
    openItem(item);
  }, [items, getItemId, openItem]);
}

function getReturnTo() {
  if (typeof window === "undefined") return "/";
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

function FrontendEditButton({ targets }: { targets: RegisteredFrontendEditTarget[] }) {
  const [location] = useLocation();
  const { user, isLoading, adminPermissions } = useAuth();
  const pathname = location.split(/[?#]/)[0] || "/";

  if (isLoading || shouldHideFrontendEditButton(pathname)) return null;

  const visibleTargets = targets
    .filter((target) => canUseFrontendEditTarget(user, adminPermissions, target))
    .sort((a, b) => a.label.localeCompare(b.label));

  if (visibleTargets.length === 0) return null;

  const returnTo = getReturnTo();
  const buttonClassName =
    "fixed bottom-24 right-5 z-[1200] h-11 rounded-full border border-primary/70 bg-primary px-4 text-primary-foreground shadow-xl shadow-black/20 backdrop-blur transition hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:bottom-8 sm:right-8";

  if (visibleTargets.length === 1) {
    const target = visibleTargets[0];
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Link href={buildFrontendEditHref(target, returnTo)}>
            <Button
              type="button"
              variant="outline"
              className={buttonClassName}
              aria-label="Edit this page"
              data-testid="button-frontend-edit"
            >
              <Pencil className="h-4 w-4" />
              <span className="ml-2 hidden text-sm font-medium sm:inline">Edit</span>
            </Button>
          </Link>
        </TooltipTrigger>
        <TooltipContent side="left">Edit this page</TooltipContent>
      </Tooltip>
    );
  }

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className={buttonClassName}
              aria-label="Edit this page"
              data-testid="button-frontend-edit"
            >
              <Pencil className="h-4 w-4" />
              <span className="ml-2 hidden text-sm font-medium sm:inline">Edit</span>
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent side="left">Edit this page</TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="end" side="top" className="z-[1000] w-56">
        {visibleTargets.map((target) => (
          <DropdownMenuItem key={target.key} asChild>
            <Link href={buildFrontendEditHref(target, returnTo)}>{target.label}</Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  Users,
  UserCheck,
  CreditCard,
  CalendarDays,
  FileText,
  Settings,
  LogOut,
  User,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  BookOpen,
  Globe,
  FileCode,
  Image,
  SearchIcon,
  SquarePen,
  Blocks,
  ClipboardList,
  Menu as MenuIcon,
  PanelRight,
  Database,
  Palette,
  Type,
  Tag,
  Handshake,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import logoIcon from "@assets/Core-Platform_Icon.webp";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { UserProfileDialog } from "@/components/shared/user-profile-dialog";
import { DEFAULT_SITE_FEATURES, type SiteFeatures } from "@shared/site-features";
import type { AdminPermission } from "@shared/types";
import type { User as AppUser } from "@shared/schema";

interface NavItem {
  title: string;
  href?: string;
  icon: React.ElementType;
  iconColor: string;
  children?: NavItem[];
}

interface NavGroup {
  label?: string;
  items: NavItem[];
}

function buildNavGroups(
  siteFeatures: SiteFeatures,
  user: AppUser | null,
  hasAdminPermission: (permission: AdminPermission) => boolean,
): NavGroup[] {
  const groups: NavGroup[] = [
    {
      items: [
        ...(user?.role === "admin"
          ? [
              {
                title: "Dashboard",
                href: "/admin",
                icon: LayoutDashboard,
                iconColor: "text-teal-600",
              } satisfies NavItem,
            ]
          : []),
      ],
    },
    ...(siteFeatures.directoryEnabled && hasAdminPermission("directory")
      ? ([
          {
            label: "Directory System",
            items: [
              {
                title: "Directory",
                href: "/admin/therapists",
                icon: UserCheck,
                iconColor: "text-emerald-600",
                children: [
                  {
                    title: "Profiles",
                    href: "/admin/therapists",
                    icon: UserCheck,
                    iconColor: "text-emerald-600",
                  },
                  {
                    title: "Specializations",
                    href: "/admin/therapists/specializations",
                    icon: Tag,
                    iconColor: "text-emerald-500",
                  },
                  {
                    title: "Settings",
                    href: "/admin/directory/settings",
                    icon: CreditCard,
                    iconColor: "text-amber-600",
                  },
                ],
              },
              {
                title: "Applications",
                href: "/admin/applications",
                icon: ClipboardList,
                iconColor: "text-orange-600",
              },
            ],
          },
        ] satisfies NavGroup[])
      : []),
    ...(siteFeatures.eventsEnabled && hasAdminPermission("content")
      ? ([
          {
            label: "Event Management",
            items: [
              {
                title: "Events",
                href: "/admin/events",
                icon: CalendarDays,
                iconColor: "text-purple-600",
              },
            ],
          },
        ] satisfies NavGroup[])
      : []),
    ...(siteFeatures.crmEnabled && hasAdminPermission("crm")
      ? ([
          {
            label: "CRM",
            items: [
              {
                title: "Pipeline",
                href: "/admin/crm",
                icon: Handshake,
                iconColor: "text-blue-600",
              },
              {
                title: "Clients",
                href: "/admin/crm/clients",
                icon: UserCheck,
                iconColor: "text-emerald-600",
              },
            ],
          },
        ] satisfies NavGroup[])
      : []),
    ...(hasAdminPermission("content")
      ? ([
          {
            label: "Content",
            items: [
              {
                title: "CMS Overview",
                href: "/admin/cms",
                icon: Globe,
                iconColor: "text-violet-600",
              },
              {
                title: "Pages",
                href: "/admin/cms/pages",
                icon: FileCode,
                iconColor: "text-violet-500",
              },
              {
                title: "Forms",
                href: "/admin/forms",
                icon: SquarePen,
                iconColor: "text-violet-500",
              },
              ...(siteFeatures.blogEnabled
                ? [
                    {
                      title: "Blog",
                      href: "/admin/cms/blog",
                      icon: BookOpen,
                      iconColor: "text-purple-600",
                    } satisfies NavItem,
                  ]
                : []),
              {
                title: "Media",
                href: "/admin/cms/media",
                icon: Image,
                iconColor: "text-violet-400",
              },
              {
                title: "Sections",
                href: "/admin/cms/sections",
                icon: Blocks,
                iconColor: "text-violet-400",
              },
              {
                title: "SEO",
                href: "/admin/cms/seo",
                icon: SearchIcon,
                iconColor: "text-violet-400",
              },
            ],
          },
        ] satisfies NavGroup[])
      : []),
    ...(hasAdminPermission("design")
      ? ([
          {
            label: "Design",
            items: [
              {
                title: "Branding",
                href: "/admin/design/branding",
                icon: Image,
                iconColor: "text-pink-500",
              },
              {
                title: "Color Palette",
                href: "/admin/design/colors",
                icon: Palette,
                iconColor: "text-rose-500",
              },
              {
                title: "Typography",
                href: "/admin/design/typography",
                icon: Type,
                iconColor: "text-sky-600",
              },
              {
                title: "Menus",
                href: "/admin/cms/menus",
                icon: MenuIcon,
                iconColor: "text-violet-500",
              },
              {
                title: "Sidebars & Widgets",
                href: "/admin/cms/sidebars",
                icon: PanelRight,
                iconColor: "text-emerald-500",
              },
            ],
          },
        ] satisfies NavGroup[])
      : []),
    ...(user?.role === "admin"
      ? ([
          {
            label: "System",
            items: [
              {
                title: "Documentation",
                href: "/admin/docs",
                icon: FileText,
                iconColor: "text-indigo-600",
              },
              {
                title: "System Backups",
                href: "/admin/system/backups",
                icon: Database,
                iconColor: "text-cyan-600",
              },
              {
                title: "System Users",
                href: "/admin/users",
                icon: Users,
                iconColor: "text-blue-600",
              },
              {
                title: "Settings",
                href: "/admin/settings",
                icon: Settings,
                iconColor: "text-slate-500",
              },
            ],
          },
        ] satisfies NavGroup[])
      : []),
  ];

  return groups;
}

interface AdminSidebarProps {
  children: React.ReactNode;
}

export function AdminSidebar({ children }: AdminSidebarProps) {
  const [location] = useLocation();
  const { user, logout, hasAdminPermission } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const adminLogo = logoIcon;
  const { data: siteFeaturesData } = useQuery<SiteFeatures>({
    queryKey: ["/api/site-config"],
    staleTime: 60_000,
  });
  const siteFeatures = siteFeaturesData ?? DEFAULT_SITE_FEATURES;
  const navGroups = buildNavGroups(siteFeatures, user, hasAdminPermission).filter(
    (group) => group.items.length > 0,
  );
  const toggleGroup = (label: string, open: boolean) => {
    setOpenGroup(open ? label : null);
  };
  const exactOnlyRoutes = ["/admin", "/admin/cms", "/admin/crm"];
  const isRouteActive = (href?: string) => Boolean(
    href &&
      (location === href ||
        (!exactOnlyRoutes.includes(href) && location.startsWith(href))),
  );
  const isChildRouteActive = (child: NavItem) => {
    if (!child.href) return false;
    if (child.href === "/admin/cms/blog") {
      return (
        location === child.href ||
        location === "/admin/cms/blog/new" ||
        /^\/admin\/cms\/blog\/[^/]+$/.test(location)
      );
    }
    return isRouteActive(child.href);
  };
  const isNavItemActive = (item: NavItem) =>
    isRouteActive(item.href) || Boolean(item.children?.some(isChildRouteActive));
  const activeGroupLabel = navGroups.find((group) =>
    group.label && group.items.some(isNavItemActive)
  )?.label ?? null;

  useEffect(() => {
    setOpenGroup(activeGroupLabel);
  }, [activeGroupLabel]);

  const renderNavItem = (item: NavItem) => {
    const isActive = isRouteActive(item.href);
    const childIsActive = Boolean(item.children?.some(isChildRouteActive));
    const parentIsActive = isActive || childIsActive;
    const linkContent = (
      <Link key={item.href ?? item.title} href={item.href ?? "#"}>
        <span
          className={cn(
            "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium cursor-pointer hover-elevate whitespace-nowrap overflow-hidden",
            parentIsActive ? "bg-primary text-primary-foreground" : "text-muted-foreground",
          )}
          data-testid={`link-admin-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
        >
          <item.icon
            className={cn("h-4 w-4 flex-shrink-0", parentIsActive ? "" : item.iconColor)}
          />
          <span
            className={cn(
              "transition-opacity duration-200 flex-1",
              collapsed ? "opacity-0" : "opacity-100",
            )}
          >
            {item.title}
          </span>
          {item.children && !collapsed && (
            <ChevronDown
              className={cn("h-4 w-4 transition-transform", childIsActive ? "rotate-180" : "")}
            />
          )}
        </span>
      </Link>
    );

    if (collapsed) {
      return (
        <Tooltip key={item.href}>
          <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
          <TooltipContent side="right" sideOffset={8}>
            {item.title}
          </TooltipContent>
        </Tooltip>
      );
    }

    if (item.children && !collapsed) {
      return (
        <div key={item.href ?? item.title} className="space-y-0.5">
          {linkContent}
          <div className="ml-5 border-l border-border/60 pl-2 space-y-0.5">
            {item.children.map((child) => {
              const childActive = isChildRouteActive(child);
              return (
                <Link key={child.href} href={child.href!}>
                  <span
                    className={cn(
                      "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm cursor-pointer",
                      childActive
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                    data-testid={`link-admin-${child.title.toLowerCase().replace(/\s+/g, "-")}`}
                  >
                    <child.icon
                      className={cn(
                        "h-3.5 w-3.5 flex-shrink-0",
                        childActive ? "text-primary" : child.iconColor,
                      )}
                    />
                    <span>{child.title}</span>
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      );
    }

    return linkContent;
  };

  return (
    <TooltipProvider delayDuration={0}>
      <div className="admin-shell flex min-h-screen relative">
        <div className="relative flex-shrink-0">
          <aside
            className={cn(
              "border-r bg-muted/30 h-full flex flex-col transition-[width] duration-300 ease-in-out overflow-hidden",
              collapsed ? "w-[68px]" : "w-64",
            )}
          >
            <div className="p-4">
              <div className="flex items-center gap-3" data-testid="text-admin-title">
                <img
                  src={adminLogo}
                  alt="Core Platform"
                  className="h-9 w-9 object-contain flex-shrink-0"
                  data-testid="img-admin-logo"
                />
                <h2
                  className={cn(
                    "font-heading text-lg font-semibold whitespace-nowrap transition-opacity duration-200",
                    collapsed ? "opacity-0 w-0" : "opacity-100",
                  )}
                >
                  Admin Dashboard
                </h2>
              </div>
            </div>

            <nav
              className="flex flex-col gap-1 px-2 flex-1 overflow-y-auto"
              data-testid="nav-admin-sidebar"
            >
              {navGroups.map((group, groupIdx) => {
                const groupKey = group.label ?? `group-${groupIdx}`;
                const groupIsOpen = !group.label || openGroup === group.label;

                if (!group.label || collapsed) {
                  return (
                    <div key={groupKey} className="flex flex-col gap-0.5">
                      {groupIdx > 0 && <Separator className="my-2" />}
                      {group.label && !collapsed && (
                        <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                          {group.label}
                        </p>
                      )}
                      {group.items.map(renderNavItem)}
                    </div>
                  );
                }

                return (
                  <Collapsible
                    key={groupKey}
                    open={groupIsOpen}
                    onOpenChange={(open) => toggleGroup(group.label!, open)}
                    className="flex flex-col gap-0.5"
                  >
                    {groupIdx > 0 && <Separator className="my-2" />}
                    <CollapsibleTrigger asChild>
                      <button
                        type="button"
                        className="flex w-full items-center gap-2 rounded-md px-3 py-1 text-left text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 transition-colors hover:bg-muted hover:text-muted-foreground"
                        aria-label={`${groupIsOpen ? "Collapse" : "Expand"} ${group.label}`}
                        data-testid={`button-toggle-admin-section-${group.label.toLowerCase().replace(/\s+/g, "-")}`}
                      >
                        <ChevronRight
                          className={cn(
                            "h-3 w-3 flex-shrink-0 transition-transform",
                            groupIsOpen ? "rotate-90" : "",
                          )}
                        />
                        <span className="min-w-0 flex-1 truncate">{group.label}</span>
                      </button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="flex flex-col gap-0.5 overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
                      {group.items.map(renderNavItem)}
                    </CollapsibleContent>
                  </Collapsible>
                );
              })}
            </nav>

            {user && (
              <div className="px-2 pb-4">
                <Separator className="mb-3" />
                {!collapsed && (
                  <div className="px-3 mb-2">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-semibold text-primary">
                          {user.firstName?.[0]}
                          {user.lastName?.[0]}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p
                          className="text-sm font-medium truncate"
                          data-testid="text-sidebar-username"
                        >
                          {user.firstName} {user.lastName}
                        </p>
                        <Badge
                          variant="outline"
                          className="text-[10px] capitalize"
                          data-testid="badge-sidebar-role"
                        >
                          {user.role}
                        </Badge>
                      </div>
                    </div>
                  </div>
                )}
                <div className="flex flex-col gap-1">
                  {collapsed ? (
                    <>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            className="mx-auto h-7 w-7 rounded-full border border-border bg-background flex items-center justify-center overflow-hidden hover:ring-2 hover:ring-ring hover:ring-offset-1 transition-shadow"
                            onClick={() => setProfileOpen(true)}
                            data-testid="button-sidebar-profile"
                          >
                            {user?.profileImageUrl ? (
                              <img
                                src={user.profileImageUrl}
                                alt=""
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <User className="h-4 w-4 text-muted-foreground" />
                            )}
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="right" sideOffset={8}>
                          My Profile
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-center text-muted-foreground"
                            onClick={() => logout.mutate()}
                            data-testid="button-sidebar-logout"
                          >
                            <LogOut className="h-4 w-4 text-rose-500" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="right" sideOffset={8}>
                          Logout
                        </TooltipContent>
                      </Tooltip>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        className="w-full flex items-center gap-2 px-2 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                        onClick={() => setProfileOpen(true)}
                        data-testid="button-sidebar-profile"
                      >
                        <span className="h-6 w-6 rounded-full border border-border bg-background flex items-center justify-center overflow-hidden shrink-0">
                          {user?.profileImageUrl ? (
                            <img
                              src={user.profileImageUrl}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <User className="h-4 w-4 text-muted-foreground" />
                          )}
                        </span>
                        My Profile
                      </button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start text-muted-foreground"
                        onClick={() => logout.mutate()}
                        data-testid="button-sidebar-logout"
                      >
                        <LogOut className="h-4 w-4 mr-2 text-rose-500" />
                        Logout
                      </Button>
                    </>
                  )}
                </div>
              </div>
            )}
          </aside>

          <button
            onClick={() => setCollapsed(!collapsed)}
            className="absolute top-6 -right-3.5 z-20 h-7 w-7 rounded-full border bg-background shadow-sm flex items-center justify-center text-muted-foreground hover:text-foreground hover:shadow-md transition-all"
            data-testid="button-toggle-sidebar"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>

        <main className="flex-1 overflow-auto">{children}</main>

        <UserProfileDialog open={profileOpen} onOpenChange={setProfileOpen} />
      </div>
    </TooltipProvider>
  );
}

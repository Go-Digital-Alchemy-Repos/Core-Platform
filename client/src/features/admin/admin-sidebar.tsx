import { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  Users,
  UserCheck,
  CreditCard,
  CalendarDays,
  Mail,
  FileText,
  Settings,
  LogOut,
  User,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Globe,
  FileCode,
  Image,
  SearchIcon,
  Blocks,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import logoIcon from "@assets/TCK-Wellness_Icon_1773155859136.png";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { UserProfileDialog } from "@/components/shared/user-profile-dialog";

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
  iconColor: string;
}

interface NavGroup {
  label?: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    items: [
      { title: "Dashboard", href: "/admin", icon: LayoutDashboard, iconColor: "text-teal-600" },
      { title: "Mental Health Professionals", href: "/admin/therapists", icon: UserCheck, iconColor: "text-emerald-600" },
      { title: "User Manager", href: "/admin/users", icon: Users, iconColor: "text-blue-600" },
      { title: "Membership Tiers", href: "/admin/membership-tiers", icon: CreditCard, iconColor: "text-amber-600" },
      { title: "Events", href: "/admin/events", icon: CalendarDays, iconColor: "text-purple-600" },
      { title: "Messages", href: "/admin/messages", icon: Mail, iconColor: "text-rose-600" },
    ],
  },
  {
    label: "CMS",
    items: [
      { title: "CMS Overview", href: "/admin/cms", icon: Globe, iconColor: "text-violet-600" },
      { title: "Pages", href: "/admin/cms/pages", icon: FileCode, iconColor: "text-violet-500" },
      { title: "Blog", href: "/admin/cms/blog", icon: BookOpen, iconColor: "text-purple-600" },
      { title: "Media", href: "/admin/cms/media", icon: Image, iconColor: "text-violet-400" },
      { title: "Sections", href: "/admin/cms/sections", icon: Blocks, iconColor: "text-violet-400" },
      { title: "SEO", href: "/admin/cms/seo", icon: SearchIcon, iconColor: "text-violet-400" },
    ],
  },
  {
    items: [
      { title: "Documentation", href: "/admin/docs", icon: FileText, iconColor: "text-indigo-600" },
      { title: "Settings", href: "/admin/settings", icon: Settings, iconColor: "text-slate-500" },
    ],
  },
];

interface AdminSidebarProps {
  children: React.ReactNode;
}

export function AdminSidebar({ children }: AdminSidebarProps) {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const renderNavItem = (item: NavItem) => {
    const exactOnlyRoutes = ["/admin", "/admin/cms"];
    const isActive = location === item.href || (!exactOnlyRoutes.includes(item.href) && location.startsWith(item.href));
    const linkContent = (
      <Link key={item.href} href={item.href}>
        <span
          className={cn(
            "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium cursor-pointer hover-elevate whitespace-nowrap overflow-hidden",
            isActive
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground"
          )}
          data-testid={`link-admin-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
        >
          <item.icon className={cn("h-4 w-4 flex-shrink-0", isActive ? "" : item.iconColor)} />
          <span
            className={cn(
              "transition-opacity duration-200",
              collapsed ? "opacity-0" : "opacity-100"
            )}
          >
            {item.title}
          </span>
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

    return linkContent;
  };

  return (
    <TooltipProvider delayDuration={0}>
      <div className="flex min-h-screen relative">
        <div className="relative flex-shrink-0">
          <aside
            className={cn(
              "border-r bg-muted/30 h-full flex flex-col transition-[width] duration-300 ease-in-out overflow-hidden",
              collapsed ? "w-[68px]" : "w-64"
            )}
          >
            <div className="p-4">
              <div className="flex items-center gap-3" data-testid="text-admin-title">
                <img
                  src={logoIcon}
                  alt="TCK Wellness"
                  className="h-9 w-9 object-contain flex-shrink-0"
                  data-testid="img-admin-logo"
                />
                <h2
                  className={cn(
                    "font-heading text-lg font-semibold whitespace-nowrap transition-opacity duration-200",
                    collapsed ? "opacity-0 w-0" : "opacity-100"
                  )}
                >Admin Dashboard</h2>
              </div>
            </div>

            <nav className="flex flex-col gap-1 px-2 flex-1 overflow-y-auto" data-testid="nav-admin-sidebar">
              {navGroups.map((group, groupIdx) => (
                <div key={groupIdx} className="flex flex-col gap-0.5">
                  {groupIdx > 0 && <Separator className="my-2" />}
                  {group.label && !collapsed && (
                    <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                      {group.label}
                    </p>
                  )}
                  {group.items.map(renderNavItem)}
                </div>
              ))}
            </nav>

            {user && (
              <div className="px-2 pb-4">
                <Separator className="mb-3" />
                {!collapsed && (
                  <div className="px-3 mb-2">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-semibold text-primary">
                          {user.firstName?.[0]}{user.lastName?.[0]}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate" data-testid="text-sidebar-username">
                          {user.firstName} {user.lastName}
                        </p>
                        <Badge variant="outline" className="text-[10px] capitalize" data-testid="badge-sidebar-role">
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
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-center text-muted-foreground"
                            onClick={() => setProfileOpen(true)}
                            data-testid="button-sidebar-profile"
                          >
                            <User className="h-4 w-4 text-blue-600" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="right" sideOffset={8}>My Profile</TooltipContent>
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
                        <TooltipContent side="right" sideOffset={8}>Logout</TooltipContent>
                      </Tooltip>
                    </>
                  ) : (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start text-muted-foreground"
                        onClick={() => setProfileOpen(true)}
                        data-testid="button-sidebar-profile"
                      >
                        <User className="h-4 w-4 mr-2 text-blue-600" />
                        My Profile
                      </Button>
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
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </button>
        </div>

        <main className="flex-1 overflow-auto">
          {children}
        </main>

        <UserProfileDialog open={profileOpen} onOpenChange={setProfileOpen} />
      </div>
    </TooltipProvider>
  );
}

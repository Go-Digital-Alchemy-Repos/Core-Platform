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
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import logoIcon from "@assets/TCK-Wellness_Icon_1773155859136.png";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { UserProfileDialog } from "@/components/shared/user-profile-dialog";

const navItems = [
  { title: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { title: "Counselors", href: "/admin/therapists", icon: UserCheck },
  { title: "Users", href: "/admin/users", icon: Users },
  { title: "Membership Tiers", href: "/admin/membership-tiers", icon: CreditCard },
  { title: "Events", href: "/admin/events", icon: CalendarDays },
  { title: "Messages", href: "/admin/messages", icon: Mail },
  { title: "Documentation", href: "/admin/docs", icon: FileText },
  { title: "Settings", href: "/admin/settings", icon: Settings },
];

interface AdminSidebarProps {
  children: React.ReactNode;
}

export function AdminSidebar({ children }: AdminSidebarProps) {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  return (
    <TooltipProvider delayDuration={0}>
      <div className="flex min-h-screen">
        <aside
          className={cn(
            "border-r bg-muted/30 flex-shrink-0 flex flex-col transition-[width] duration-300 ease-in-out overflow-hidden",
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
              >
                Admin Panel
              </h2>
              <button
                onClick={() => setCollapsed(!collapsed)}
                className="ml-auto flex-shrink-0 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                data-testid="button-toggle-sidebar"
              >
                {collapsed ? (
                  <PanelLeftOpen className="h-4 w-4" />
                ) : (
                  <PanelLeftClose className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
          <nav className="flex flex-col gap-1 px-2 flex-1" data-testid="nav-admin-sidebar">
            {navItems.map((item) => {
              const isActive = location === item.href;
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
                    <item.icon className="h-4 w-4 flex-shrink-0" />
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
                          <User className="h-4 w-4" />
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
                          <LogOut className="h-4 w-4" />
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
                      <User className="h-4 w-4 mr-2" />
                      My Profile
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start text-muted-foreground"
                      onClick={() => logout.mutate()}
                      data-testid="button-sidebar-logout"
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Logout
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}
        </aside>
        <main className="flex-1 overflow-auto">
          {children}
        </main>

        <UserProfileDialog open={profileOpen} onOpenChange={setProfileOpen} />
      </div>
    </TooltipProvider>
  );
}

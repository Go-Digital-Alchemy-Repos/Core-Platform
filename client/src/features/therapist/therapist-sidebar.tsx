import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";

interface ApplicationData {
  status?: string;
}
import {
  LayoutDashboard,
  UserPen,
  CreditCard,
  FileText,
  ClipboardCheck,
  LogOut,
  User,
  ChevronLeft,
  ChevronRight,
  Menu as MenuIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import logoIcon from "@assets/Core-Platform_Icon.webp";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { UserProfileDialog } from "@/components/shared/user-profile-dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetBody } from "@/components/ui/sheet";

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
  iconColor: string;
  show?: boolean;
}

interface TherapistSidebarProps {
  children: React.ReactNode;
}

export function TherapistSidebar({ children }: TherapistSidebarProps) {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const { data: application } = useQuery<ApplicationData | null>({
    queryKey: ["/api/therapist/application"],
  });

  const hasSubmittedApplication = Boolean(application?.status && application.status !== "draft");
  const hasDraftOrNoApplication = !application || !application.status || application.status === "draft";
  const isActiveMember = application?.status === "active_member";

  const navItems: NavItem[] = [
    { title: "Dashboard", href: "/therapist", icon: LayoutDashboard, iconColor: "text-teal-600" },
    { title: "Edit Profile", href: "/therapist/profile", icon: UserPen, iconColor: "text-emerald-600" },
    { title: "Subscription", href: "/therapist/subscription", icon: CreditCard, iconColor: "text-amber-600" },
    { title: "Application", href: "/therapist/apply", icon: FileText, iconColor: "text-blue-600", show: !isActiveMember && hasDraftOrNoApplication },
    { title: "Application Status", href: "/therapist/application/status", icon: ClipboardCheck, iconColor: "text-purple-600", show: hasSubmittedApplication },
  ];

  const visibleItems = navItems.filter((item) => item.show !== false);

  const renderNavItem = (item: NavItem) => {
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
          data-testid={`link-therapist-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
          onClick={() => setMobileOpen(false)}
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

  const renderMobileNavItem = (item: NavItem) => {
    const isActive = location === item.href;
    return (
      <Link key={item.href} href={item.href}>
        <span
          className={cn(
            "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium cursor-pointer",
            isActive
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          )}
          data-testid={`link-therapist-mobile-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
          onClick={() => setMobileOpen(false)}
        >
          <item.icon className={cn("h-4 w-4 flex-shrink-0", isActive ? "" : item.iconColor)} />
          <span>{item.title}</span>
        </span>
      </Link>
    );
  };

  const sidebarContent = (
    <>
      <div className="p-4">
        <div className="flex items-center gap-3" data-testid="text-therapist-title">
          <img
            src={logoIcon}
            alt="Core Platform"
            className="h-9 w-9 object-contain flex-shrink-0"
            data-testid="img-therapist-logo"
          />
          <h2
            className={cn(
              "font-heading text-lg font-semibold whitespace-nowrap transition-opacity duration-200",
              collapsed ? "opacity-0 w-0" : "opacity-100"
            )}
          >My Account</h2>
        </div>
      </div>

      <nav className="flex flex-col gap-1 px-2 flex-1 overflow-y-auto" data-testid="nav-therapist-sidebar">
        {visibleItems.map(renderNavItem)}
      </nav>

      {user && (
        <div className="px-2 pb-4">
          <Separator className="mb-3" />
          {!collapsed && (
            <div className="px-3 mb-2">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {user.profileImageUrl ? (
                    <img src={user.profileImageUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-xs font-semibold text-primary">
                      {user.firstName?.[0]}{user.lastName?.[0]}
                    </span>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate" data-testid="text-therapist-sidebar-username">
                    {user.firstName} {user.lastName}
                  </p>
                  <Badge variant="outline" className="text-[10px]" data-testid="badge-therapist-sidebar-role">
                    Counselor
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
                      data-testid="button-therapist-sidebar-profile"
                    >
                      {user?.profileImageUrl ? (
                        <img src={user.profileImageUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <User className="h-4 w-4 text-muted-foreground" />
                      )}
                    </button>
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
                      data-testid="button-therapist-sidebar-logout"
                    >
                      <LogOut className="h-4 w-4 text-rose-500" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right" sideOffset={8}>Logout</TooltipContent>
                </Tooltip>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className="w-full flex items-center gap-2 px-2 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setProfileOpen(true)}
                  data-testid="button-therapist-sidebar-profile"
                >
                  <span className="h-6 w-6 rounded-full border border-border bg-background flex items-center justify-center overflow-hidden shrink-0">
                    {user?.profileImageUrl ? (
                      <img src={user.profileImageUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <User className="h-4 w-4 text-muted-foreground" />
                    )}
                  </span>
                  Account Settings
                </button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-muted-foreground"
                  onClick={() => logout.mutate()}
                  data-testid="button-therapist-sidebar-logout"
                >
                  <LogOut className="h-4 w-4 mr-2 text-rose-500" />
                  Logout
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );

  return (
    <TooltipProvider delayDuration={0}>
      <div className="flex min-h-screen relative">
        <div className="relative flex-shrink-0 hidden md:block">
          <aside
            className={cn(
              "border-r bg-muted/30 h-full flex flex-col transition-[width] duration-300 ease-in-out overflow-hidden",
              collapsed ? "w-[68px]" : "w-64"
            )}
          >
            {sidebarContent}
          </aside>

          <button
            onClick={() => setCollapsed(!collapsed)}
            className="absolute top-6 -right-3.5 z-20 h-7 w-7 rounded-full border bg-background shadow-sm flex items-center justify-center text-muted-foreground hover:text-foreground hover:shadow-md transition-all"
            data-testid="button-therapist-toggle-sidebar"
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </button>
        </div>

        <div className="md:hidden fixed top-[64px] left-0 right-0 z-30 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 px-4 py-2 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setMobileOpen(true)}
            data-testid="button-therapist-mobile-menu"
          >
            <MenuIcon className="h-5 w-5" />
          </Button>
          <span className="text-sm font-medium text-muted-foreground">My Account</span>
        </div>

        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent side="left" className="w-72 p-0">
            <SheetHeader className="p-4 border-b">
              <SheetTitle className="flex items-center gap-3">
                <img src={logoIcon} alt="Core Platform" className="h-8 w-8 object-contain" />
                <span className="font-heading text-base">My Account</span>
              </SheetTitle>
            </SheetHeader>
            <SheetBody className="p-0">
              <nav className="flex flex-col gap-1 p-2" data-testid="nav-therapist-mobile-sidebar">
                {visibleItems.map(renderMobileNavItem)}
              </nav>
              {user && (
                <div className="px-2 mt-auto pt-4">
                  <Separator className="mb-3" />
                  <div className="px-3 mb-2">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {user.profileImageUrl ? (
                          <img src={user.profileImageUrl} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-xs font-semibold text-primary">
                            {user.firstName?.[0]}{user.lastName?.[0]}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{user.firstName} {user.lastName}</p>
                        <Badge variant="outline" className="text-[10px]">Counselor</Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <button
                      type="button"
                      className="w-full flex items-center gap-2 px-2 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                      onClick={() => { setProfileOpen(true); setMobileOpen(false); }}
                      data-testid="button-therapist-mobile-profile"
                    >
                      <User className="h-4 w-4" />
                      Account Settings
                    </button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start text-muted-foreground"
                      onClick={() => logout.mutate()}
                      data-testid="button-therapist-mobile-logout"
                    >
                      <LogOut className="h-4 w-4 mr-2 text-rose-500" />
                      Logout
                    </Button>
                  </div>
                </div>
              )}
            </SheetBody>
          </SheetContent>
        </Sheet>

        <main className="flex-1 overflow-auto md:pt-0 pt-12">
          {children}
        </main>

        <UserProfileDialog open={profileOpen} onOpenChange={setProfileOpen} />
      </div>
    </TooltipProvider>
  );
}

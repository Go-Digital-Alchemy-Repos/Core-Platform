import { useState, useMemo } from "react";
import { Link, useLocation } from "wouter";
import { Menu, User, LogOut, LayoutDashboard, Shield, UserCog, ChevronDown, Bell } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useUnreadNotificationCount } from "@/hooks/use-unread-notification-count";
import logoImg from "@assets/IMG_0002_1772999718659.png";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useBranding } from "@/components/shared/branding-provider";
import { useAuth } from "@/hooks/use-auth";
import { UserProfileDialog } from "@/components/shared/user-profile-dialog";
import { NotificationBell } from "@/components/shared/notification-bell";
import { NavbarSearchPopover } from "@/components/layout/navbar-search-popover";
import type { CmsMenu, MenuItem, PublicMenuLocation } from "@shared/schema";

const defaultNavLinks = [
  { label: "About", href: "/about" },
  { label: "Find a Mental Health Professional", href: "/directory" },
  { label: "Join the Network", href: "/join" },
];

const allResourceLinks = [
  { label: "Events", href: "/events" },
  { label: "Recording Archives", href: "/recordings", hideFromClients: true },
  { label: "Insights & Articles", href: "/insights" },
];

function flattenItems(items: MenuItem[], depth = 0): { item: MenuItem; depth: number }[] {
  const result: { item: MenuItem; depth: number }[] = [];
  for (const item of items) {
    result.push({ item, depth });
    if (item.children?.length > 0) {
      result.push(...flattenItems(item.children, depth + 1));
    }
  }
  return result;
}

function isActiveRecursive(items: MenuItem[], currentPath: string): boolean {
  for (const item of items) {
    if (currentPath === item.url) return true;
    if (item.children?.length > 0 && isActiveRecursive(item.children, currentPath)) return true;
  }
  return false;
}

function DynamicDropdown({ item, location: currentPath }: { item: MenuItem; location: string }) {
  const isActive = isActiveRecursive(item.children || [], currentPath);
  const flatChildren = flattenItems(item.children || []);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className={isActive ? "toggle-elevate toggle-elevated" : ""}
          data-testid={`link-nav-${item.label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
        >
          {item.label}
          <ChevronDown className="ml-1 h-3.5 w-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="z-[1000]">
        {flatChildren.map(({ item: child, depth }) => (
          <DropdownMenuItem key={child.id} asChild className={depth > 0 ? `pl-${4 + depth * 4}` : ""}>
            {child.openInNewTab ? (
              <a
                href={child.url}
                target="_blank"
                rel="noopener noreferrer"
                data-testid={`link-nav-child-${child.id}`}
                style={depth > 0 ? { paddingLeft: `${12 + depth * 16}px` } : undefined}
              >
                {child.label}
              </a>
            ) : (
              <Link
                href={child.url}
                data-testid={`link-nav-child-${child.id}`}
                style={depth > 0 ? { paddingLeft: `${12 + depth * 16}px` } : undefined}
              >
                {child.label}
              </Link>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function Navbar() {
  const [location] = useLocation();
  const { user, isLoading, logout, isAdmin, isTherapist } = useAuth();
  const { frontendLogoUrl } = useBranding();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  const { data: publicMenus } = useQuery<Partial<Record<PublicMenuLocation, CmsMenu>>>({
    queryKey: ["/api/cms/menus"],
    queryFn: async () => {
      const res = await fetch("/api/cms/menus");
      if (!res.ok) return null;
      return res.json();
    },
    staleTime: 60000,
  });

  const dynamicItems = useMemo(() => {
    const headerMenu = publicMenus?.main_navigation ?? publicMenus?.header;
    if (!headerMenu?.items) return null;
    const items = headerMenu.items as MenuItem[];
    return items.length > 0 ? items : null;
  }, [publicMenus]);

  const isClient = user && user.role === "client";
  const resourceLinks = allResourceLinks.filter(
    (link) => !(link.hideFromClients && isClient)
  );

  const unreadNotifCount = useUnreadNotificationCount();
  const brandLogo = frontendLogoUrl || logoImg;

  return (
    <nav className="sticky top-0 z-[999] bg-background/95 backdrop-blur-sm border-b" data-testid="navbar">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 sm:gap-6 px-4 sm:px-6 py-3 sm:py-4">
        <Link href="/" data-testid="link-brand">
          <img src={brandLogo} alt="Core Platform" className="h-8 sm:h-10 w-auto" />
        </Link>

        <div className="hidden md:flex items-center gap-2 flex-wrap">
          {dynamicItems ? (
            dynamicItems.map((item) =>
              item.children && item.children.length > 0 ? (
                <DynamicDropdown key={item.id} item={item} location={location} />
              ) : item.openInNewTab ? (
                <a key={item.id} href={item.url} target="_blank" rel="noopener noreferrer">
                  <Button
                    variant="ghost"
                    data-testid={`link-nav-${item.label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
                  >
                    {item.label}
                  </Button>
                </a>
              ) : (
                <Link key={item.id} href={item.url}>
                  <Button
                    variant="ghost"
                    className={location === item.url ? "toggle-elevate toggle-elevated" : ""}
                    data-testid={`link-nav-${item.label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
                    aria-current={location === item.url ? "page" : undefined}
                  >
                    {item.label}
                  </Button>
                </Link>
              )
            )
          ) : (
            <>
              {defaultNavLinks.map((link) => (
                <Link key={link.href} href={link.href}>
                  <Button
                    variant="ghost"
                    className={location === link.href ? "toggle-elevate toggle-elevated" : ""}
                    data-testid={`link-nav-${link.label.toLowerCase()}`}
                    aria-current={location === link.href ? "page" : undefined}
                  >
                    {link.label}
                  </Button>
                </Link>
              ))}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className={resourceLinks.some((r) => location === r.href) ? "toggle-elevate toggle-elevated" : ""}
                    data-testid="link-nav-resources"
                  >
                    Resources
                    <ChevronDown className="ml-1 h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="z-[1000]">
                  {resourceLinks.map((link) => (
                    <DropdownMenuItem key={link.href} asChild>
                      <Link href={link.href} data-testid={`link-nav-resource-${link.label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}>
                        {link.label}
                      </Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <Link href="/contact">
                <Button
                  variant="ghost"
                  className={location === "/contact" ? "toggle-elevate toggle-elevated" : ""}
                  data-testid="link-nav-contact"
                  aria-current={location === "/contact" ? "page" : undefined}
                >
                  Contact
                </Button>
              </Link>
            </>
          )}
        </div>

        <div className="hidden md:flex items-center gap-3 flex-wrap">
          <NavbarSearchPopover />
          {isLoading ? null : user ? (
            <>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="relative h-8 w-8 rounded-full border border-border bg-background flex items-center justify-center overflow-hidden hover:ring-2 hover:ring-ring hover:ring-offset-1 transition-shadow"
                    data-testid="button-user-menu"
                  >
                    {user.profileImageUrl ? (
                      <img src={user.profileImageUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <User className="h-4 w-4 text-muted-foreground" />
                    )}
                    {unreadNotifCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-accent text-accent-foreground text-[10px] font-bold rounded-full h-4 min-w-4 flex items-center justify-center px-1 leading-none">
                        {unreadNotifCount > 99 ? "99+" : unreadNotifCount}
                      </span>
                    )}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="z-[1000]">
                  {isTherapist && (
                    <DropdownMenuItem asChild>
                      <Link href="/therapist" data-testid="link-therapist-dashboard">
                        <LayoutDashboard className="mr-2 h-4 w-4" />
                        Mental Health Professional Dashboard
                      </Link>
                    </DropdownMenuItem>
                  )}
                  {isAdmin && (
                    <DropdownMenuItem asChild>
                      <Link href="/admin" data-testid="link-admin-dashboard">
                        <Shield className="mr-2 h-4 w-4" />
                        Admin Dashboard
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setNotifOpen(true)}
                    data-testid="button-notifications-menu"
                  >
                    <Bell className="mr-2 h-4 w-4" />
                    Notifications
                    {unreadNotifCount > 0 && (
                      <span className="ml-auto bg-accent text-accent-foreground text-xs font-semibold rounded-full h-5 min-w-5 flex items-center justify-center px-1.5">
                        {unreadNotifCount}
                      </span>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setProfileOpen(true)}
                    data-testid="button-my-profile"
                  >
                    <UserCog className="mr-2 h-4 w-4" />
                    My Profile
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => logout.mutate()}
                    data-testid="button-logout"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Link href="/auth/login">
                <Button variant="ghost" data-testid="link-login">
                  Login
                </Button>
              </Link>
            </>
          )}
        </div>

        <div className="flex md:hidden items-center gap-2">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button size="icon" variant="ghost" data-testid="button-mobile-menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <SheetHeader>
                <SheetTitle>
                  <img src={brandLogo} alt="Core Platform" className="h-8 w-auto" />
                </SheetTitle>
              </SheetHeader>
              <div className="flex flex-col gap-1 mt-6">
                {dynamicItems ? (
                  flattenItems(dynamicItems).map(({ item, depth }) => (
                    item.children && item.children.length > 0 ? (
                      <p
                        key={item.id}
                        className="px-4 pt-3 pb-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider"
                        style={depth > 0 ? { paddingLeft: `${16 + depth * 16}px` } : undefined}
                        data-testid={`text-mobile-group-${item.id}`}
                      >
                        {item.label}
                      </p>
                    ) : item.openInNewTab ? (
                      <a key={item.id} href={item.url} target="_blank" rel="noopener noreferrer" onClick={() => setMobileOpen(false)}>
                        <Button
                          variant="ghost"
                          className="w-full justify-start"
                          style={depth > 0 ? { paddingLeft: `${16 + depth * 16}px` } : undefined}
                          data-testid={`link-mobile-${item.id}`}
                        >
                          {item.label}
                        </Button>
                      </a>
                    ) : (
                      <Link key={item.id} href={item.url} onClick={() => setMobileOpen(false)}>
                        <Button
                          variant="ghost"
                          className={`w-full justify-start ${location === item.url ? "toggle-elevate toggle-elevated" : ""}`}
                          style={depth > 0 ? { paddingLeft: `${16 + depth * 16}px` } : undefined}
                          data-testid={`link-mobile-${item.id}`}
                          aria-current={location === item.url ? "page" : undefined}
                        >
                          {item.label}
                        </Button>
                      </Link>
                    )
                  ))
                ) : (
                  <>
                    {defaultNavLinks.map((link) => (
                      <Link key={link.href} href={link.href} onClick={() => setMobileOpen(false)}>
                        <Button
                          variant="ghost"
                          className={`w-full justify-start ${location === link.href ? "toggle-elevate toggle-elevated" : ""}`}
                          data-testid={`link-mobile-${link.label.toLowerCase()}`}
                          aria-current={location === link.href ? "page" : undefined}
                        >
                          {link.label}
                        </Button>
                      </Link>
                    ))}
                    <p className="px-4 pt-3 pb-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Resources</p>
                    {resourceLinks.map((link) => (
                      <Link key={link.href} href={link.href} onClick={() => setMobileOpen(false)}>
                        <Button
                          variant="ghost"
                          className={`w-full justify-start pl-6 ${location === link.href ? "toggle-elevate toggle-elevated" : ""}`}
                          data-testid={`link-mobile-resource-${link.label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
                          aria-current={location === link.href ? "page" : undefined}
                        >
                          {link.label}
                        </Button>
                      </Link>
                    ))}
                    <Link href="/contact" onClick={() => setMobileOpen(false)}>
                      <Button
                        variant="ghost"
                        className={`w-full justify-start ${location === "/contact" ? "toggle-elevate toggle-elevated" : ""}`}
                        data-testid="link-mobile-contact"
                        aria-current={location === "/contact" ? "page" : undefined}
                      >
                        Contact
                      </Button>
                    </Link>
                  </>
                )}

                <div className="my-3 border-t" />

                {isLoading ? null : user ? (
                  <>
                    <p className="px-4 py-2 text-sm text-muted-foreground">
                      Signed in as {user.firstName} {user.lastName}
                    </p>
                    {isTherapist && (
                      <Link href="/therapist" onClick={() => setMobileOpen(false)}>
                        <Button variant="ghost" className="w-full justify-start" data-testid="link-mobile-therapist">
                          <LayoutDashboard className="mr-2 h-4 w-4" />
                          Mental Health Professional Dashboard
                        </Button>
                      </Link>
                    )}
                    {isAdmin && (
                      <Link href="/admin" onClick={() => setMobileOpen(false)}>
                        <Button variant="ghost" className="w-full justify-start" data-testid="link-mobile-admin">
                          <Shield className="mr-2 h-4 w-4" />
                          Admin Dashboard
                        </Button>
                      </Link>
                    )}
                    <Button
                      variant="ghost"
                      className="w-full justify-start"
                      onClick={() => {
                        setNotifOpen(true);
                        setMobileOpen(false);
                      }}
                      data-testid="button-mobile-notifications"
                    >
                      <Bell className="mr-2 h-4 w-4" />
                      Notifications
                      {unreadNotifCount > 0 && (
                        <span className="ml-auto bg-accent text-accent-foreground text-xs font-semibold rounded-full h-5 min-w-5 flex items-center justify-center px-1.5">
                          {unreadNotifCount}
                        </span>
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      className="w-full justify-start"
                      onClick={() => {
                        setProfileOpen(true);
                        setMobileOpen(false);
                      }}
                      data-testid="button-mobile-profile"
                    >
                      <UserCog className="mr-2 h-4 w-4" />
                      My Profile
                    </Button>
                    <div className="my-1 border-t" />
                    <Button
                      variant="ghost"
                      className="w-full justify-start"
                      onClick={() => {
                        logout.mutate();
                        setMobileOpen(false);
                      }}
                      data-testid="button-mobile-logout"
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Logout
                    </Button>
                  </>
                ) : (
                  <>
                    <Link href="/auth/login" onClick={() => setMobileOpen(false)}>
                      <Button variant="ghost" className="w-full justify-start" data-testid="link-mobile-login">
                        Login
                      </Button>
                    </Link>
                  </>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {user && <NotificationBell open={notifOpen} onOpenChange={setNotifOpen} showTrigger={false} />}
      <UserProfileDialog open={profileOpen} onOpenChange={setProfileOpen} />
    </nav>
  );
}

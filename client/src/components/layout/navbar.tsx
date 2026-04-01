import { useState, useRef, useEffect, useMemo } from "react";
import { Link, useLocation } from "wouter";
import { Menu, User, LogOut, LayoutDashboard, Shield, UserCog, Search, X, ChevronDown, Bell, Moon, Sun } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
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
import { ThemeToggle, useTheme } from "@/components/shared/theme-provider";
import { useAuth } from "@/hooks/use-auth";
import { UserProfileDialog } from "@/components/shared/user-profile-dialog";
import { NotificationBell } from "@/components/shared/notification-bell";
import { RegisterDialog } from "@/components/shared/register-dialog";
import type { CmsMenu, MenuItem } from "@shared/schema";

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

function DynamicDropdown({ item, location: currentPath }: { item: MenuItem; location: string }) {
  const isActive = item.children?.some((c) => currentPath === c.url);
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
        {item.children.map((child) => (
          <DropdownMenuItem key={child.id} asChild>
            {child.openInNewTab ? (
              <a href={child.url} target="_blank" rel="noopener noreferrer" data-testid={`link-nav-child-${child.id}`}>
                {child.label}
              </a>
            ) : (
              <Link href={child.url} data-testid={`link-nav-child-${child.id}`}>
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
  const { theme, toggleTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [, navigate] = useLocation();

  const { data: headerMenu } = useQuery<CmsMenu>({
    queryKey: ["/api/cms/menus", "header"],
    queryFn: async () => {
      const res = await fetch("/api/cms/menus/header");
      if (!res.ok) return null;
      return res.json();
    },
    staleTime: 60000,
  });

  const dynamicItems = useMemo(() => {
    if (!headerMenu?.items) return null;
    const items = headerMenu.items as MenuItem[];
    return items.length > 0 ? items : null;
  }, [headerMenu]);

  const isClient = user && user.role === "client";
  const resourceLinks = allResourceLinks.filter(
    (link) => !(link.hideFromClients && isClient)
  );

  useEffect(() => {
    if (searchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [searchOpen]);

  const { data: unreadNotifData } = useQuery<{ count: number }>({
    queryKey: ["/api/notifications/unread-count"],
    enabled: !!user,
    refetchInterval: 30000,
  });
  const unreadNotifCount = unreadNotifData?.count ?? 0;

  return (
    <nav className="sticky top-0 z-[999] bg-background/95 backdrop-blur-sm border-b" data-testid="navbar">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 sm:gap-6 px-4 sm:px-6 py-3 sm:py-4">
        <Link href="/" data-testid="link-brand">
          <img src={logoImg} alt="TCK Wellness" className="h-8 sm:h-10 w-auto dark:brightness-[1.8] dark:contrast-[0.9]" />
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
          <div className="relative flex items-center">
            {searchOpen && (
              <form
                className="flex items-center mr-1"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (searchQuery.trim()) {
                    navigate(`/directory?search=${encodeURIComponent(searchQuery.trim())}`);
                    setSearchOpen(false);
                    setSearchQuery("");
                  }
                }}
              >
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search..."
                  className="h-9 w-48 rounded-md border bg-background px-3 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 transition-all"
                  data-testid="input-search"
                />
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-9 w-9 ml-0.5"
                  onClick={() => { setSearchOpen(false); setSearchQuery(""); }}
                  data-testid="button-search-close"
                >
                  <X className="h-4 w-4" />
                </Button>
              </form>
            )}
            {!searchOpen && (
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setSearchOpen(true)}
                data-testid="button-search-open"
              >
                <Search className="h-4 w-4" />
              </Button>
            )}
          </div>
          {isLoading ? null : user ? (
            <>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" className="relative" data-testid="button-user-menu">
                    <User className="h-4 w-4" />
                    {unreadNotifCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-accent text-accent-foreground text-[10px] font-bold rounded-full h-4 min-w-4 flex items-center justify-center px-1 leading-none">
                        {unreadNotifCount > 99 ? "99+" : unreadNotifCount}
                      </span>
                    )}
                  </Button>
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
                  <DropdownMenuItem
                    onClick={toggleTheme}
                    data-testid="button-theme-toggle-menu"
                  >
                    {theme === "light" ? <Moon className="mr-2 h-4 w-4" /> : <Sun className="mr-2 h-4 w-4" />}
                    {theme === "light" ? "Dark Mode" : "Light Mode"}
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
              <ThemeToggle />
              <Link href="/auth/login">
                <Button variant="ghost" data-testid="link-login">
                  Login
                </Button>
              </Link>
              <Button
                variant="outline"
                onClick={() => setRegisterOpen(true)}
                data-testid="button-register"
              >
                Register
              </Button>
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
                  <img src={logoImg} alt="TCK Wellness" className="h-8 w-auto dark:brightness-[1.8] dark:contrast-[0.9]" />
                </SheetTitle>
              </SheetHeader>
              <div className="flex flex-col gap-1 mt-6">
                {dynamicItems ? (
                  dynamicItems.map((item) => (
                    <div key={item.id}>
                      {item.openInNewTab ? (
                        <a href={item.url} target="_blank" rel="noopener noreferrer" onClick={() => setMobileOpen(false)}>
                          <Button variant="ghost" className="w-full justify-start" data-testid={`link-mobile-${item.id}`}>
                            {item.label}
                          </Button>
                        </a>
                      ) : (
                        <Link href={item.url} onClick={() => setMobileOpen(false)}>
                          <Button
                            variant="ghost"
                            className={`w-full justify-start ${location === item.url ? "toggle-elevate toggle-elevated" : ""}`}
                            data-testid={`link-mobile-${item.id}`}
                            aria-current={location === item.url ? "page" : undefined}
                          >
                            {item.label}
                          </Button>
                        </Link>
                      )}
                      {item.children?.length > 0 && item.children.map((child) => (
                        child.openInNewTab ? (
                          <a key={child.id} href={child.url} target="_blank" rel="noopener noreferrer" onClick={() => setMobileOpen(false)}>
                            <Button variant="ghost" className="w-full justify-start pl-6" data-testid={`link-mobile-child-${child.id}`}>
                              {child.label}
                            </Button>
                          </a>
                        ) : (
                          <Link key={child.id} href={child.url} onClick={() => setMobileOpen(false)}>
                            <Button
                              variant="ghost"
                              className={`w-full justify-start pl-6 ${location === child.url ? "toggle-elevate toggle-elevated" : ""}`}
                              data-testid={`link-mobile-child-${child.id}`}
                              aria-current={location === child.url ? "page" : undefined}
                            >
                              {child.label}
                            </Button>
                          </Link>
                        )
                      ))}
                    </div>
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
                    <Button
                      variant="ghost"
                      className="w-full justify-start"
                      onClick={() => {
                        toggleTheme();
                      }}
                      data-testid="button-mobile-theme-toggle"
                    >
                      {theme === "light" ? <Moon className="mr-2 h-4 w-4" /> : <Sun className="mr-2 h-4 w-4" />}
                      {theme === "light" ? "Dark Mode" : "Light Mode"}
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
                    <Button
                      variant="ghost"
                      className="w-full justify-start"
                      onClick={() => {
                        toggleTheme();
                      }}
                      data-testid="button-mobile-theme-toggle-loggedout"
                    >
                      {theme === "light" ? <Moon className="mr-2 h-4 w-4" /> : <Sun className="mr-2 h-4 w-4" />}
                      {theme === "light" ? "Dark Mode" : "Light Mode"}
                    </Button>
                    <div className="my-1 border-t" />
                    <Link href="/auth/login" onClick={() => setMobileOpen(false)}>
                      <Button variant="ghost" className="w-full justify-start" data-testid="link-mobile-login">
                        Login
                      </Button>
                    </Link>
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => {
                        setRegisterOpen(true);
                        setMobileOpen(false);
                      }}
                      data-testid="button-mobile-register"
                    >
                      Register
                    </Button>
                  </>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {user && <NotificationBell open={notifOpen} onOpenChange={setNotifOpen} showTrigger={false} />}
      <UserProfileDialog open={profileOpen} onOpenChange={setProfileOpen} />
      <RegisterDialog open={registerOpen} onOpenChange={setRegisterOpen} />
    </nav>
  );
}

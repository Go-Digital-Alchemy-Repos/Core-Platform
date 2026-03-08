import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Menu, User, LogOut, LayoutDashboard, Shield, ChevronDown } from "lucide-react";
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
import { ThemeToggle } from "@/components/shared/theme-provider";
import { useAuth } from "@/hooks/use-auth";

const navLinks = [
  { label: "Home", href: "/" },
  { label: "Directory", href: "/directory" },
  { label: "Events", href: "/events" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
];

export function Navbar() {
  const [location] = useLocation();
  const { user, isLoading, logout, isAdmin, isTherapist } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-[999] bg-background border-b" data-testid="navbar">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 px-4 py-3">
        <Link href="/" data-testid="link-brand">
          <img src={logoImg} alt="TCK Wellness" className="h-10 w-auto dark:brightness-[1.8] dark:contrast-[0.9]" />
        </Link>

        <div className="hidden md:flex items-center gap-1 flex-wrap">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href}>
              <Button
                variant="ghost"
                size="sm"
                className={location === link.href ? "toggle-elevate toggle-elevated" : ""}
                data-testid={`link-nav-${link.label.toLowerCase()}`}
              >
                {link.label}
              </Button>
            </Link>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-2 flex-wrap">
          <ThemeToggle />
          {isLoading ? null : user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" data-testid="button-user-menu">
                  <User className="h-4 w-4" />
                  <span className="ml-1">{user.firstName}</span>
                  <ChevronDown className="ml-1 h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {isTherapist && (
                  <DropdownMenuItem asChild>
                    <Link href="/therapist" data-testid="link-therapist-dashboard">
                      <LayoutDashboard className="mr-2 h-4 w-4" />
                      Therapist Dashboard
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
                  onClick={() => logout.mutate()}
                  data-testid="button-logout"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Link href="/auth/login">
                <Button variant="ghost" size="sm" data-testid="link-login">
                  Login
                </Button>
              </Link>
              <Link href="/auth/register">
                <Button size="sm" data-testid="link-register">
                  Register
                </Button>
              </Link>
            </>
          )}
        </div>

        <div className="flex md:hidden items-center gap-2">
          <ThemeToggle />
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
              <div className="flex flex-col gap-1 mt-4">
                {navLinks.map((link) => (
                  <Link key={link.href} href={link.href} onClick={() => setMobileOpen(false)}>
                    <Button
                      variant="ghost"
                      className={`w-full justify-start ${location === link.href ? "toggle-elevate toggle-elevated" : ""}`}
                      data-testid={`link-mobile-${link.label.toLowerCase()}`}
                    >
                      {link.label}
                    </Button>
                  </Link>
                ))}

                <div className="my-2 border-t" />

                {isLoading ? null : user ? (
                  <>
                    <p className="px-4 py-2 text-sm text-muted-foreground">
                      Signed in as {user.firstName} {user.lastName}
                    </p>
                    {isTherapist && (
                      <Link href="/therapist" onClick={() => setMobileOpen(false)}>
                        <Button variant="ghost" className="w-full justify-start" data-testid="link-mobile-therapist">
                          <LayoutDashboard className="mr-2 h-4 w-4" />
                          Therapist Dashboard
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
                    <Link href="/auth/register" onClick={() => setMobileOpen(false)}>
                      <Button className="w-full justify-start" data-testid="link-mobile-register">
                        Register
                      </Button>
                    </Link>
                  </>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  );
}

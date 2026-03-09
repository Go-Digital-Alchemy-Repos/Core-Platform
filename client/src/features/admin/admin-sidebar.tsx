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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
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

  return (
    <div className="flex min-h-screen">
      <aside className="w-64 border-r bg-muted/30 flex-shrink-0 flex flex-col">
        <div className="p-4">
          <h2 className="font-heading text-lg font-semibold" data-testid="text-admin-title">
            Admin Panel
          </h2>
        </div>
        <nav className="flex flex-col gap-1 px-2 flex-1" data-testid="nav-admin-sidebar">
          {navItems.map((item) => {
            const isActive = location === item.href;
            return (
              <Link key={item.href} href={item.href}>
                <span
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium cursor-pointer hover-elevate",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground"
                  )}
                  data-testid={`link-admin-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
                >
                  <item.icon className="h-4 w-4" />
                  {item.title}
                </span>
              </Link>
            );
          })}
        </nav>

        {user && (
          <div className="px-2 pb-4">
            <Separator className="mb-3" />
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
            <div className="flex flex-col gap-1">
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
            </div>
          </div>
        )}
      </aside>
      <main className="flex-1 overflow-auto">
        {children}
      </main>

      <UserProfileDialog open={profileOpen} onOpenChange={setProfileOpen} />
    </div>
  );
}

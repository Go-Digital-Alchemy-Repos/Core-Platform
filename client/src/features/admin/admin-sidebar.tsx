import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  Users,
  UserCheck,
  CreditCard,
  CalendarDays,
  Mail,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { title: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { title: "Therapists", href: "/admin/therapists", icon: UserCheck },
  { title: "Users", href: "/admin/users", icon: Users },
  { title: "Membership Tiers", href: "/admin/membership-tiers", icon: CreditCard },
  { title: "Events", href: "/admin/events", icon: CalendarDays },
  { title: "Messages", href: "/admin/messages", icon: Mail },
  { title: "Documentation", href: "/admin/docs", icon: FileText },
];

interface AdminSidebarProps {
  children: React.ReactNode;
}

export function AdminSidebar({ children }: AdminSidebarProps) {
  const [location] = useLocation();

  return (
    <div className="flex min-h-screen">
      <aside className="w-64 border-r bg-muted/30 flex-shrink-0">
        <div className="p-4">
          <h2 className="font-heading text-lg font-semibold" data-testid="text-admin-title">
            Admin Panel
          </h2>
        </div>
        <nav className="flex flex-col gap-1 px-2 pb-4" data-testid="nav-admin-sidebar">
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
      </aside>
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}

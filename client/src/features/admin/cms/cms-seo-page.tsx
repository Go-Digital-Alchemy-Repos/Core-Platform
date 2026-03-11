import { AdminSidebar } from "@/features/admin/admin-sidebar";
import { Card, CardContent } from "@/components/ui/card";
import { SearchIcon, Globe } from "lucide-react";

export default function CmsSeoPage() {
  return (
    <AdminSidebar>
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-heading font-semibold" data-testid="text-seo-title">
            SEO Settings
          </h1>
          <p className="text-muted-foreground mt-1">
            Configure global SEO defaults for your website
          </p>
        </div>

        <Card>
          <CardContent className="pt-12 pb-12 text-center">
            <div className="h-16 w-16 rounded-2xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center mx-auto mb-4">
              <Globe className="h-8 w-8 text-violet-500" />
            </div>
            <h2 className="text-lg font-semibold mb-2">Global SEO Settings Coming Soon</h2>
            <p className="text-muted-foreground text-sm max-w-md mx-auto">
              This module will allow you to configure site-wide SEO settings including default title templates,
              meta descriptions, Open Graph images, robots.txt rules, and sitemap generation.
            </p>
            <div className="mt-6 grid grid-cols-3 gap-3 max-w-sm mx-auto text-left">
              {["Default meta tags", "Sitemap generation", "Open Graph config"].map((feature) => (
                <div key={feature} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <div className="h-1.5 w-1.5 rounded-full bg-violet-400 flex-shrink-0" />
                  {feature}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminSidebar>
  );
}

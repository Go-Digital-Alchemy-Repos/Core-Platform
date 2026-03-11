import { AdminSidebar } from "@/features/admin/admin-sidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Image, CloudUpload } from "lucide-react";

export default function CmsMediaPage() {
  return (
    <AdminSidebar>
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-heading font-semibold" data-testid="text-media-title">
            Media Library
          </h1>
          <p className="text-muted-foreground mt-1">
            Upload and manage images and files
          </p>
        </div>

        <Card>
          <CardContent className="pt-12 pb-12 text-center">
            <div className="h-16 w-16 rounded-2xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center mx-auto mb-4">
              <CloudUpload className="h-8 w-8 text-violet-500" />
            </div>
            <h2 className="text-lg font-semibold mb-2">Media Library Coming Soon</h2>
            <p className="text-muted-foreground text-sm max-w-md mx-auto">
              The Media Library will provide a centralized place to upload and manage images, documents, and other files.
              It will be backed by Cloudflare R2 for reliable, global delivery.
            </p>
            <div className="mt-6 grid grid-cols-3 gap-3 max-w-sm mx-auto text-left">
              {["R2-backed uploads", "Image optimization", "File organization"].map((feature) => (
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

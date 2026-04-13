import { AdminSidebar } from "./admin-sidebar";
import { SpecializationsTab } from "./settings-page";

export default function AdminSpecializationsPage() {
  return (
    <AdminSidebar>
      <div className="p-6 max-w-4xl">
        <h1 className="text-2xl font-heading font-bold mb-1" data-testid="text-specializations-page-title">
          Specializations
        </h1>
        <p className="text-muted-foreground mb-6" data-testid="text-specializations-page-description">
          Manage the professional specialization taxonomy used in therapist profiles and directory filters.
        </p>
        <SpecializationsTab showHeader={false} />
      </div>
    </AdminSidebar>
  );
}

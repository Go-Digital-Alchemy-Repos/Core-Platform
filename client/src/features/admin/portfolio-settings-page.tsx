import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { FolderKanban, Save } from "lucide-react";
import { AdminSidebar } from "./admin-sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { PORTFOLIO_INDUSTRY_LABELS, type PortfolioSettings } from "@shared/schema";

const DEFAULT_SETTINGS: PortfolioSettings = {
  industryPreset: "generic",
  archiveLayout: "grid",
  archiveEyebrow: "Portfolio",
  archiveHeading: "Selected Work",
  archiveSubheading: "Explore case studies, projects, and outcomes from our portfolio.",
  projectsLabel: "Projects",
  projectLabel: "Project",
  showSearch: true,
  showIndustryFilter: true,
  showCategoryFilter: true,
  showLocationFilter: true,
  sharingEnabled: true,
  defaultCtaLabel: "Start a Project",
  defaultCtaUrl: "/contact",
};

export default function AdminPortfolioSettingsPage() {
  const { toast } = useToast();
  const { data } = useQuery<PortfolioSettings>({ queryKey: ["/api/admin/portfolio/settings"] });
  const [settings, setSettings] = useState<PortfolioSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    if (data) setSettings(data);
  }, [data]);

  const set = <K extends keyof PortfolioSettings>(key: K, value: PortfolioSettings[K]) =>
    setSettings((current) => ({ ...current, [key]: value }));

  const mutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("PUT", "/api/admin/portfolio/settings", settings);
      return response.json();
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/admin/portfolio/settings"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/portfolio/settings"] }),
      ]);
      toast({ title: "Portfolio settings saved" });
    },
    onError: (error: Error) => toast({ title: "Could not save settings", description: error.message, variant: "destructive" }),
  });

  return (
    <AdminSidebar>
      <main className="flex-1 space-y-6 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-heading font-semibold">
              <FolderKanban className="h-6 w-6 text-indigo-600" />
              Portfolio Settings
            </h1>
            <p className="text-sm text-muted-foreground">Tune public archive labels, filters, sharing, and default calls to action.</p>
          </div>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}><Save className="mr-2 h-4 w-4" />Save Settings</Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Archive Defaults</CardTitle>
              <CardDescription>These values power the fallback portfolio page and CMS live block defaults.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Industry preset</Label>
                <Select value={settings.industryPreset} onValueChange={(value) => set("industryPreset", value as PortfolioSettings["industryPreset"])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(PORTFOLIO_INDUSTRY_LABELS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Archive layout</Label>
                <Select value={settings.archiveLayout} onValueChange={(value) => set("archiveLayout", value as PortfolioSettings["archiveLayout"])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="grid">Grid</SelectItem><SelectItem value="list">List</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>Eyebrow</Label><Input value={settings.archiveEyebrow} onChange={(event) => set("archiveEyebrow", event.target.value)} /></div>
              <div className="space-y-1.5"><Label>Heading</Label><Input value={settings.archiveHeading} onChange={(event) => set("archiveHeading", event.target.value)} /></div>
              <div className="space-y-1.5"><Label>Subheading</Label><Textarea value={settings.archiveSubheading} onChange={(event) => set("archiveSubheading", event.target.value)} rows={3} /></div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1.5"><Label>Project label</Label><Input value={settings.projectLabel} onChange={(event) => set("projectLabel", event.target.value)} /></div>
                <div className="space-y-1.5"><Label>Projects label</Label><Input value={settings.projectsLabel} onChange={(event) => set("projectsLabel", event.target.value)} /></div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Filters And Actions</CardTitle>
              <CardDescription>Control visitor browsing tools and default conversion action.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {([
                ["showSearch", "Show search"],
                ["showIndustryFilter", "Show industry filter"],
                ["showCategoryFilter", "Show category filter"],
                ["showLocationFilter", "Show location filter"],
                ["sharingEnabled", "Enable share actions"],
              ] as const).map(([key, label]) => (
                <label key={key} className="flex items-center gap-2 text-sm">
                  <Checkbox checked={settings[key]} onCheckedChange={(value) => set(key, value === true)} />
                  {label}
                </label>
              ))}
              <div className="space-y-1.5"><Label>Default CTA label</Label><Input value={settings.defaultCtaLabel} onChange={(event) => set("defaultCtaLabel", event.target.value)} /></div>
              <div className="space-y-1.5"><Label>Default CTA URL</Label><Input value={settings.defaultCtaUrl} onChange={(event) => set("defaultCtaUrl", event.target.value)} /></div>
            </CardContent>
          </Card>
        </div>
      </main>
    </AdminSidebar>
  );
}

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { ExternalLink, FolderKanban, Pencil, Plus, Trash2 } from "lucide-react";
import { AdminSidebar } from "./admin-sidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  PORTFOLIO_INDUSTRY_LABELS,
  PORTFOLIO_STATUS_LABELS,
  PORTFOLIO_STATUSES,
  type PortfolioIndustry,
  type PortfolioProject,
} from "@shared/schema";

export default function AdminPortfolioPage() {
  const { toast } = useToast();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [industry, setIndustry] = useState("all");
  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (status !== "all") params.set("status", status);
    if (industry !== "all") params.set("industry", industry);
    const qs = params.toString();
    return `/api/admin/portfolio/projects${qs ? `?${qs}` : ""}`;
  }, [q, status, industry]);
  const { data: projects = [] } = useQuery<PortfolioProject[]>({ queryKey: [query] });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/admin/portfolio/projects/${id}`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        predicate: (query) => String(query.queryKey[0] ?? "").startsWith("/api/admin/portfolio/projects"),
      });
      toast({ title: "Portfolio project deleted" });
    },
    onError: (error: Error) => toast({ title: "Could not delete project", description: error.message, variant: "destructive" }),
  });

  return (
    <AdminSidebar>
      <main className="flex-1 space-y-6 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-heading font-semibold">
              <FolderKanban className="h-6 w-6 text-indigo-600" />
              Portfolio
            </h1>
            <p className="text-sm text-muted-foreground">Manage case studies, project media, outcomes, and public portfolio pages.</p>
          </div>
          <Button asChild><Link href="/admin/portfolio/new"><Plus className="mr-2 h-4 w-4" />Add New</Link></Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Projects</CardTitle>
            <CardDescription>Search, edit, preview, and publish portfolio work.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-[1fr_200px_220px]">
              <Input value={q} onChange={(event) => setQ(event.target.value)} placeholder="Search portfolio projects" />
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {PORTFOLIO_STATUSES.map((value) => <SelectItem key={value} value={value}>{PORTFOLIO_STATUS_LABELS[value]}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={industry} onValueChange={setIndustry}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All industries</SelectItem>
                  {Object.entries(PORTFOLIO_INDUSTRY_LABELS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Industry</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projects.map((project) => (
                  <TableRow key={project.id}>
                    <TableCell>
                      <div className="font-medium">{project.title}</div>
                      <div className="text-xs text-muted-foreground">/portfolio/{project.slug}</div>
                    </TableCell>
                    <TableCell><Badge variant={project.status === "published" ? "default" : "outline"}>{PORTFOLIO_STATUS_LABELS[project.status]}</Badge></TableCell>
                    <TableCell>{PORTFOLIO_INDUSTRY_LABELS[project.industry as PortfolioIndustry]}</TableCell>
                    <TableCell>{project.location || "Unspecified"}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" asChild aria-label="Preview project">
                        <a href={`/portfolio/${project.slug}`} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" /></a>
                      </Button>
                      <Button variant="ghost" size="icon" asChild aria-label="Edit project">
                        <Link href={`/admin/portfolio/${project.id}`}><Pencil className="h-4 w-4" /></Link>
                      </Button>
                      <Button variant="ghost" size="icon" aria-label="Delete project" onClick={() => deleteMutation.mutate(project.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {projects.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">No portfolio projects found.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </AdminSidebar>
  );
}

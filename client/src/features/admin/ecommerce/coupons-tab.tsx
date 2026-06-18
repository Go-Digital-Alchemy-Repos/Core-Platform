import { FormEvent, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Copy, Eye, Pencil, Save, Search, TicketPercent, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatMoney } from "@/features/ecommerce/cart-store";

import type { Category, Coupon, CouponReport, Product } from "./ecommerce-page.types";
import { cents, couponStatus, csv, dateTimeInput, moneyInput, nullableCents, nullableInt } from "./ecommerce-page.utils";
import { Metric } from "./metric";

export function CouponsTab() {
  const { toast } = useToast();
  const { data: products = [] } = useQuery<Product[]>({ queryKey: ["/api/admin/ecommerce/products"] });
  const { data: categories = [] } = useQuery<Category[]>({ queryKey: ["/api/admin/ecommerce/categories"] });
  const { data: coupons = [] } = useQuery<Coupon[]>({ queryKey: ["/api/admin/ecommerce/coupons"] });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [form, setForm] = useState({
    code: "",
    name: "",
    description: "",
    notes: "",
    type: "fixed",
    value: "",
    minOrderAmount: "",
    maxDiscountAmount: "",
    maxRedemptions: "",
    perCustomerLimit: "",
    startDate: "",
    endDate: "",
    active: true,
    customerEligibility: "all",
    eligibleCustomerEmails: "",
    eligibleProductIds: [] as string[],
    eligibleCategoryIds: [] as string[],
    excludedProductIds: [] as string[],
    excludedCategoryIds: [] as string[],
    allowStacking: false,
    appliesTo: "subtotal",
    applyBeforeTax: true,
  });

  const { data: report } = useQuery<CouponReport>({
    queryKey: [`/api/admin/ecommerce/coupons/${selectedReportId}/report`],
    enabled: Boolean(selectedReportId),
  });

  const resetForm = () => {
    setEditingId(null);
    setForm({
      code: "",
      name: "",
      description: "",
      notes: "",
      type: "fixed",
      value: "",
      minOrderAmount: "",
      maxDiscountAmount: "",
      maxRedemptions: "",
      perCustomerLimit: "",
      startDate: "",
      endDate: "",
      active: true,
      customerEligibility: "all",
      eligibleCustomerEmails: "",
      eligibleProductIds: [],
      eligibleCategoryIds: [],
      excludedProductIds: [],
      excludedCategoryIds: [],
      allowStacking: false,
      appliesTo: "subtotal",
      applyBeforeTax: true,
    });
  };

  const openEdit = (coupon: Coupon) => {
    setEditingId(coupon.id);
    setForm({
      code: coupon.code,
      name: coupon.name ?? "",
      description: coupon.description ?? "",
      notes: coupon.notes ?? "",
      type: coupon.type,
      value: coupon.type === "percentage" ? String(coupon.value) : moneyInput(coupon.value),
      minOrderAmount: moneyInput(coupon.minOrderAmount),
      maxDiscountAmount: moneyInput(coupon.maxDiscountAmount),
      maxRedemptions: coupon.maxRedemptions == null ? "" : String(coupon.maxRedemptions),
      perCustomerLimit: coupon.perCustomerLimit == null ? "" : String(coupon.perCustomerLimit),
      startDate: dateTimeInput(coupon.startDate),
      endDate: dateTimeInput(coupon.endDate),
      active: coupon.active,
      customerEligibility: coupon.customerEligibility ?? "all",
      eligibleCustomerEmails: coupon.eligibleCustomerEmails.join(", "),
      eligibleProductIds: coupon.eligibleProductIds ?? [],
      eligibleCategoryIds: coupon.eligibleCategoryIds ?? [],
      excludedProductIds: coupon.excludedProductIds ?? [],
      excludedCategoryIds: coupon.excludedCategoryIds ?? [],
      allowStacking: coupon.allowStacking,
      appliesTo: coupon.appliesTo ?? "subtotal",
      applyBeforeTax: coupon.applyBeforeTax,
    });
  };

  const payload = () => ({
    code: form.code.trim().toUpperCase(),
    name: form.name.trim() || null,
    description: form.description.trim() || null,
    notes: form.notes.trim() || null,
    type: form.type,
    value: form.type === "percentage" ? Number(form.value) || 0 : cents(form.value),
    minOrderAmount: nullableCents(form.minOrderAmount),
    maxDiscountAmount: nullableCents(form.maxDiscountAmount),
    maxRedemptions: nullableInt(form.maxRedemptions),
    perCustomerLimit: nullableInt(form.perCustomerLimit),
    startDate: form.startDate ? new Date(form.startDate).toISOString() : null,
    endDate: form.endDate ? new Date(form.endDate).toISOString() : null,
    active: form.active,
    customerEligibility: form.customerEligibility,
    eligibleCustomerEmails: csv(form.eligibleCustomerEmails).map((email) => email.toLowerCase()),
    eligibleProductIds: form.eligibleProductIds,
    eligibleCategoryIds: form.eligibleCategoryIds,
    excludedProductIds: form.excludedProductIds,
    excludedCategoryIds: form.excludedCategoryIds,
    allowStacking: form.allowStacking,
    appliesTo: form.appliesTo,
    applyBeforeTax: form.applyBeforeTax,
  });

  const saveMutation = useMutation({
    mutationFn: async () => apiRequest(
      editingId ? "PUT" : "POST",
      editingId ? `/api/admin/ecommerce/coupons/${editingId}` : "/api/admin/ecommerce/coupons",
      payload(),
    ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/ecommerce/coupons"] });
      toast({ title: editingId ? "Coupon updated" : "Coupon created" });
      resetForm();
    },
    onError: (error) => toast({
      title: "Coupon could not be saved",
      description: error instanceof Error ? error.message : "Please review the coupon settings.",
      variant: "destructive",
    }),
  });

  const duplicateMutation = useMutation({
    mutationFn: async (coupon: Coupon) => apiRequest("POST", `/api/admin/ecommerce/coupons/${coupon.id}/duplicate`, {
      code: `${coupon.code}-COPY-${Math.floor(Math.random() * 1000)}`,
    }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/admin/ecommerce/coupons"] }),
  });

  const archiveMutation = useMutation({
    mutationFn: async (couponId: string) => apiRequest("DELETE", `/api/admin/ecommerce/coupons/${couponId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/admin/ecommerce/coupons"] }),
  });

  const toggleIdInForm = (key: "eligibleProductIds" | "eligibleCategoryIds" | "excludedProductIds" | "excludedCategoryIds", id: string) => {
    setForm((current) => ({
      ...current,
      [key]: current[key].includes(id) ? current[key].filter((item) => item !== id) : [...current[key], id],
    }));
  };

  const filteredCoupons = coupons.filter((coupon) => {
    const status = couponStatus(coupon).label.toLowerCase();
    const term = search.trim().toLowerCase();
    if (term && !`${coupon.code} ${coupon.name ?? ""}`.toLowerCase().includes(term)) return false;
    if (statusFilter !== "all" && status !== statusFilter) return false;
    if (typeFilter !== "all" && coupon.type !== typeFilter) return false;
    return true;
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    saveMutation.mutate();
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[460px_1fr]">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><TicketPercent className="h-5 w-5" /> {editingId ? "Edit coupon" : "Coupon editor"}</CardTitle>
          <CardDescription>Configure discount rules, limits, eligibility, and lifecycle dates.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="grid gap-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2"><Label>Code</Label><Input value={form.code} onChange={(e) => setForm((c) => ({ ...c, code: e.target.value.toUpperCase() }))} required /></div>
              <div className="space-y-2"><Label>Internal name</Label><Input value={form.name} onChange={(e) => setForm((c) => ({ ...c, name: e.target.value }))} /></div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2"><Label>Discount type</Label><Select value={form.type} onValueChange={(type) => setForm((c) => ({ ...c, type }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="fixed">Fixed amount</SelectItem><SelectItem value="percentage">Percentage</SelectItem><SelectItem value="freeShipping">Free shipping</SelectItem></SelectContent></Select></div>
              <div className="space-y-2"><Label>Discount value</Label><Input value={form.value} onChange={(e) => setForm((c) => ({ ...c, value: e.target.value }))} placeholder={form.type === "percentage" ? "15" : "25.00"} disabled={form.type === "freeShipping"} /></div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2"><Label>Minimum subtotal</Label><Input value={form.minOrderAmount} onChange={(e) => setForm((c) => ({ ...c, minOrderAmount: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Maximum discount</Label><Input value={form.maxDiscountAmount} onChange={(e) => setForm((c) => ({ ...c, maxDiscountAmount: e.target.value }))} /></div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2"><Label>Overall usage limit</Label><Input type="number" value={form.maxRedemptions} onChange={(e) => setForm((c) => ({ ...c, maxRedemptions: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Per customer limit</Label><Input type="number" value={form.perCustomerLimit} onChange={(e) => setForm((c) => ({ ...c, perCustomerLimit: e.target.value }))} /></div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2"><Label>Start</Label><Input type="datetime-local" value={form.startDate} onChange={(e) => setForm((c) => ({ ...c, startDate: e.target.value }))} /></div>
              <div className="space-y-2"><Label>End</Label><Input type="datetime-local" value={form.endDate} onChange={(e) => setForm((c) => ({ ...c, endDate: e.target.value }))} /></div>
            </div>
            <div className="space-y-2"><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm((c) => ({ ...c, description: e.target.value }))} rows={2} /></div>
            <div className="space-y-2"><Label>Internal notes</Label><Textarea value={form.notes} onChange={(e) => setForm((c) => ({ ...c, notes: e.target.value }))} rows={2} /></div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2"><Label>Customer eligibility</Label><Select value={form.customerEligibility} onValueChange={(customerEligibility) => setForm((c) => ({ ...c, customerEligibility }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All customers</SelectItem><SelectItem value="specific_emails">Specific emails</SelectItem></SelectContent></Select></div>
              <div className="space-y-2"><Label>Eligible emails</Label><Input value={form.eligibleCustomerEmails} onChange={(e) => setForm((c) => ({ ...c, eligibleCustomerEmails: e.target.value }))} placeholder="name@example.com, ..." /></div>
            </div>
            <CouponCheckboxGroup title="Eligible products" items={products.map((product) => ({ id: product.id, label: product.name }))} selected={form.eligibleProductIds} onToggle={(id) => toggleIdInForm("eligibleProductIds", id)} />
            <CouponCheckboxGroup title="Eligible categories" items={categories.map((category) => ({ id: category.id, label: category.name }))} selected={form.eligibleCategoryIds} onToggle={(id) => toggleIdInForm("eligibleCategoryIds", id)} />
            <CouponCheckboxGroup title="Excluded products" items={products.map((product) => ({ id: product.id, label: product.name }))} selected={form.excludedProductIds} onToggle={(id) => toggleIdInForm("excludedProductIds", id)} />
            <CouponCheckboxGroup title="Excluded categories" items={categories.map((category) => ({ id: category.id, label: category.name }))} selected={form.excludedCategoryIds} onToggle={(id) => toggleIdInForm("excludedCategoryIds", id)} />
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="flex items-center gap-3"><Switch checked={form.active} onCheckedChange={(active) => setForm((c) => ({ ...c, active }))} /><Label>Active</Label></div>
              <div className="flex items-center gap-3"><Switch checked={form.allowStacking} onCheckedChange={(allowStacking) => setForm((c) => ({ ...c, allowStacking }))} /><Label>Stacking</Label></div>
              <div className="flex items-center gap-3"><Switch checked={form.applyBeforeTax} onCheckedChange={(applyBeforeTax) => setForm((c) => ({ ...c, applyBeforeTax }))} /><Label>Before tax</Label></div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={saveMutation.isPending || !form.code.trim()}><Save className="mr-2 h-4 w-4" /> {editingId ? "Update coupon" : "Create coupon"}</Button>
              {editingId ? <Button type="button" variant="outline" onClick={resetForm}>Cancel</Button> : null}
            </div>
          </form>
        </CardContent>
      </Card>
      <div className="space-y-6">
        <Card>
          <CardHeader><CardTitle>Coupons</CardTitle><CardDescription>Search, filter, edit, duplicate, archive, and review coupon performance.</CardDescription></CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-3 lg:grid-cols-[1fr_180px_180px]">
              <div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search code or name" /></div>
              <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All statuses</SelectItem><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem><SelectItem value="scheduled">Scheduled</SelectItem><SelectItem value="expired">Expired</SelectItem><SelectItem value="usage limit reached">Usage limit reached</SelectItem></SelectContent></Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All types</SelectItem><SelectItem value="fixed">Fixed</SelectItem><SelectItem value="percentage">Percentage</SelectItem><SelectItem value="freeShipping">Free shipping</SelectItem></SelectContent></Select>
            </div>
            <Table><TableHeader><TableRow><TableHead>Code</TableHead><TableHead>Status</TableHead><TableHead>Discount</TableHead><TableHead>Used</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader><TableBody>{filteredCoupons.map((coupon) => {
              const status = couponStatus(coupon);
              return <TableRow key={coupon.id} role="button" tabIndex={0} className="cursor-pointer transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" onClick={() => openEdit(coupon)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); openEdit(coupon); } }}><TableCell><div className="font-medium">{coupon.code}</div><div className="text-xs text-muted-foreground">{coupon.name || coupon.description || "-"}</div></TableCell><TableCell><Badge variant={status.variant}>{status.label}</Badge></TableCell><TableCell>{coupon.type === "percentage" ? `${coupon.value}%` : coupon.type === "freeShipping" ? "Free shipping" : formatMoney(coupon.value)}</TableCell><TableCell>{coupon.timesUsed}{coupon.maxRedemptions ? ` / ${coupon.maxRedemptions}` : ""}</TableCell><TableCell><div className="flex justify-end gap-2"><Button size="sm" variant="outline" onClick={(event) => { event.stopPropagation(); setSelectedReportId(coupon.id); }}><Eye className="mr-2 h-4 w-4" />Report</Button><Button size="sm" variant="outline" onClick={(event) => { event.stopPropagation(); openEdit(coupon); }}><Pencil className="mr-2 h-4 w-4" />Edit</Button><Button size="sm" variant="outline" onClick={(event) => { event.stopPropagation(); duplicateMutation.mutate(coupon); }}><Copy className="mr-2 h-4 w-4" />Copy</Button><Button size="sm" variant="outline" onClick={(event) => { event.stopPropagation(); archiveMutation.mutate(coupon.id); }}><Trash2 className="mr-2 h-4 w-4" />Archive</Button></div></TableCell></TableRow>;
            })}</TableBody></Table>
          </CardContent>
        </Card>
        {selectedReportId && report ? (
          <Card>
            <CardHeader><CardTitle>Coupon usage</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-4">
                <Metric label="Uses" value={String(report.totalUses)} />
                <Metric label="Revenue" value={formatMoney(report.totalRevenue)} />
                <Metric label="Discounts" value={formatMoney(report.totalDiscountGiven)} />
                <Metric label="Remaining" value={report.remainingUses == null ? "Unlimited" : String(report.remainingUses)} />
              </div>
              <Table><TableHeader><TableRow><TableHead>Order</TableHead><TableHead>Customer</TableHead><TableHead>Total</TableHead><TableHead>Discount</TableHead></TableRow></TableHeader><TableBody>{report.recentOrders.map((order) => <TableRow key={order.orderId}><TableCell className="font-mono text-xs">{order.orderId}</TableCell><TableCell>{order.customerEmail || "-"}</TableCell><TableCell>{formatMoney(order.totalAmount)}</TableCell><TableCell>{formatMoney(order.discountAmount)}</TableCell></TableRow>)}</TableBody></Table>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}

function CouponCheckboxGroup({ title, items, selected, onToggle }: { title: string; items: Array<{ id: string; label: string }>; selected: string[]; onToggle: (id: string) => void }) {
  if (items.length === 0) return null;
  return (
    <div className="space-y-2">
      <Label>{title}</Label>
      <div className="max-h-32 overflow-auto rounded-lg border p-2">
        {items.map((item) => (
          <label key={item.id} className="flex items-center gap-2 rounded-md px-2 py-1 text-sm">
            <input type="checkbox" checked={selected.includes(item.id)} onChange={() => onToggle(item.id)} />
            <span>{item.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ProtectedRoute } from "@/components/shared/protected-route";
import { AdminSidebar } from "./admin-sidebar";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetBody,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Plus, Pencil } from "lucide-react";
import type { MembershipTier } from "@shared/schema";

const currencyInputSchema = z
  .string()
  .trim()
  .regex(/^\d+(\.\d{1,2})?$/, "Enter a valid US dollar amount")
  .transform((value) => Number.parseFloat(value));

const tierFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  monthlyPrice: currencyInputSchema,
  annualPrice: currencyInputSchema,
  features: z.string().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.coerce.number().optional(),
});

type TierFormValues = z.input<typeof tierFormSchema>;
type TierFormSubmitValues = z.output<typeof tierFormSchema>;

function centsToDollars(cents: number) {
  return (cents / 100).toFixed(2);
}

function dollarsToCents(dollars: number) {
  return Math.round(dollars * 100);
}

export default function AdminMembershipTiersPage() {
  return (
    <ProtectedRoute roles={["admin"]}>
      <AdminSidebar>
        <TiersContent />
      </AdminSidebar>
    </ProtectedRoute>
  );
}

export function TiersContent({ embedded = false }: { embedded?: boolean } = {}) {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTier, setEditingTier] = useState<MembershipTier | null>(null);

  const { data: tiers, isLoading } = useQuery<MembershipTier[]>({
    queryKey: ["/api/admin/membership-tiers"],
  });

  const form = useForm<TierFormValues>({
    resolver: zodResolver(tierFormSchema),
    defaultValues: {
      name: "",
      description: "",
      monthlyPrice: "0.00",
      annualPrice: "0.00",
      features: "",
      isActive: true,
      sortOrder: 0,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: TierFormSubmitValues) => {
      const payload = {
        ...data,
        monthlyPrice: dollarsToCents(data.monthlyPrice),
        annualPrice: dollarsToCents(data.annualPrice),
        features: data.features
          ? data.features.split("\n").filter((f) => f.trim())
          : [],
      };
      await apiRequest("POST", "/api/admin/membership-tiers", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/membership-tiers"] });
      toast({ title: "Tier created" });
      setDialogOpen(false);
      form.reset();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: TierFormSubmitValues }) => {
      const payload = {
        ...data,
        monthlyPrice: dollarsToCents(data.monthlyPrice),
        annualPrice: dollarsToCents(data.annualPrice),
        features: data.features
          ? data.features.split("\n").filter((f) => f.trim())
          : [],
      };
      await apiRequest("PUT", `/api/admin/membership-tiers/${id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/membership-tiers"] });
      toast({ title: "Tier updated" });
      setDialogOpen(false);
      setEditingTier(null);
      form.reset();
    },
  });

  function openCreate() {
    setEditingTier(null);
    form.reset({
      name: "",
      description: "",
      monthlyPrice: "0.00",
      annualPrice: "0.00",
      features: "",
      isActive: true,
      sortOrder: 0,
    });
    setDialogOpen(true);
  }

  function openEdit(tier: MembershipTier) {
    setEditingTier(tier);
    form.reset({
      name: tier.name,
      description: tier.description ?? "",
      monthlyPrice: centsToDollars(tier.monthlyPrice),
      annualPrice: centsToDollars(tier.annualPrice),
      features: tier.features?.join("\n") ?? "",
      isActive: tier.isActive ?? true,
      sortOrder: tier.sortOrder ?? 0,
    });
    setDialogOpen(true);
  }

  function onSubmit(values: TierFormValues) {
    const parsedValues = tierFormSchema.parse(values);
    if (editingTier) {
      updateMutation.mutate({ id: editingTier.id, data: parsedValues });
    } else {
      createMutation.mutate(parsedValues);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className={embedded ? "space-y-6" : "p-6"}>
      <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h1 className="text-2xl font-heading font-semibold" data-testid="text-admin-tiers-title">
            Membership Tiers
          </h1>
          {embedded && (
            <p className="text-sm text-muted-foreground mt-1">
              Create and maintain the subscription plans that control directory access and membership billing.
            </p>
          )}
        </div>
        <Button onClick={openCreate} data-testid="button-create-tier">
          <Plus className="h-4 w-4 mr-2" />
          Create Tier
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tiers?.map((tier) => (
          <Card key={tier.id} data-testid={`card-tier-${tier.id}`}>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-lg">{tier.name}</CardTitle>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => openEdit(tier)}
                data-testid={`button-edit-tier-${tier.id}`}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
                  <div className="flex items-baseline gap-2 mb-2 flex-wrap">
                    <span className="text-2xl font-bold" data-testid={`text-tier-price-${tier.id}`}>
                  ${centsToDollars(tier.monthlyPrice)}
                    </span>
                    <span className="text-sm text-muted-foreground">/month</span>
                  </div>
              {tier.annualPrice > 0 && (
                <p className="mb-3 text-sm text-muted-foreground">
                  ${centsToDollars(tier.annualPrice)}/year
                </p>
              )}
              {tier.description && (
                <p className="text-sm text-muted-foreground mb-3" data-testid={`text-tier-desc-${tier.id}`}>
                  {tier.description}
                </p>
              )}
              {tier.features && tier.features.length > 0 && (
                <ul className="space-y-1">
                  {tier.features.map((f, i) => (
                    <li key={i} className="text-sm">
                      {f}
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-3">
                <Badge variant={tier.isActive ? "default" : "secondary"} data-testid={`badge-tier-status-${tier.id}`}>
                  {tier.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Sheet open={dialogOpen} onOpenChange={setDialogOpen}>
        <SheetContent side="right" size="default">
          <SheetHeader>
            <SheetTitle data-testid="text-tier-dialog-title">
              {editingTier ? "Edit Tier" : "Create Tier"}
            </SheetTitle>
            <SheetDescription className="sr-only">
              {editingTier ? "Edit membership tier details" : "Create a new membership tier"}
            </SheetDescription>
          </SheetHeader>
          <SheetBody>
            <Form {...form}>
              <form id="tier-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-tier-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea {...field} data-testid="input-tier-description" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="monthlyPrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Monthly Price (USD)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            inputMode="decimal"
                            min="0"
                            step="0.01"
                            placeholder="0.00"
                            {...field}
                            data-testid="input-tier-monthly-price"
                          />
                        </FormControl>
                        <p className="text-xs text-muted-foreground">$ per month</p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="annualPrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Annual Price (USD)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            inputMode="decimal"
                            min="0"
                            step="0.01"
                            placeholder="0.00"
                            {...field}
                            data-testid="input-tier-annual-price"
                          />
                        </FormControl>
                        <p className="text-xs text-muted-foreground">$ per year</p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="features"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Features (one per line)</FormLabel>
                      <FormControl>
                        <Textarea {...field} data-testid="input-tier-features" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="sortOrder"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sort Order</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} data-testid="input-tier-sort-order" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="isActive"
                    render={({ field }) => (
                      <FormItem className="flex items-center gap-2 pt-6">
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="switch-tier-active"
                          />
                        </FormControl>
                        <FormLabel className="!mt-0">Active</FormLabel>
                      </FormItem>
                    )}
                  />
                </div>
              </form>
            </Form>
          </SheetBody>
          <SheetFooter>
            <Button
              type="submit"
              form="tier-form"
              className="w-full"
              disabled={createMutation.isPending || updateMutation.isPending}
              data-testid="button-submit-tier"
            >
              {createMutation.isPending || updateMutation.isPending
                ? "Saving..."
                : editingTier
                  ? "Update Tier"
                  : "Create Tier"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}

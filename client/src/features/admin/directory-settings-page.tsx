import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AdminSidebar } from "./admin-sidebar";
import { TiersContent } from "./membership-tiers-page";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Save, Loader2, CreditCard, ClipboardList } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type SettingsData = Record<
  string,
  Record<string, { value: string; isSecret: boolean }>
>;

type DirectorySettingsValues = {
  application_fee_amount_usd: string;
  application_fee_notice_title: string;
  application_fee_notice_body: string;
  application_fee_policy_summary: string;
  application_fee_credit_on_approval: boolean;
  application_fee_credit_amount_usd: string;
  renewal_reminder_days: string;
  payment_failure_grace_hours: string;
  suspend_listing_on_past_due: boolean;
  directory_requires_approved_application: boolean;
  directory_requires_active_subscription: boolean;
};

const DEFAULT_VALUES: DirectorySettingsValues = {
  application_fee_amount_usd: "150.00",
  application_fee_notice_title: "Application Fee",
  application_fee_notice_body:
    "Before your directory listing can be reviewed, an application fee is required. If you are approved, that amount can be credited toward your first membership invoice. If your application is denied, the fee is non-refundable.",
  application_fee_policy_summary:
    "The application fee is collected before your application enters review. Approved applicants can have that amount credited toward their first membership invoice. Denied applications do not receive a refund.",
  application_fee_credit_on_approval: true,
  application_fee_credit_amount_usd: "150.00",
  renewal_reminder_days: "30",
  payment_failure_grace_hours: "48",
  suspend_listing_on_past_due: true,
  directory_requires_approved_application: true,
  directory_requires_active_subscription: true,
};

function normalizeBoolean(value: string | undefined, fallback: boolean) {
  if (!value) return fallback;
  const normalized = value.trim().toLowerCase();
  if (["true", "1", "yes", "on", "enabled"].includes(normalized)) return true;
  if (["false", "0", "no", "off", "disabled"].includes(normalized)) return false;
  return fallback;
}

function DirectoryApplicationSettingsTab() {
  const { toast } = useToast();
  const { data: settings } = useQuery<SettingsData>({
    queryKey: ["/api/admin/settings"],
  });

  const stored = settings?.directory_settings || {};

  const computedDefaults = useMemo<DirectorySettingsValues>(() => ({
    application_fee_amount_usd: stored.application_fee_amount_usd?.value || DEFAULT_VALUES.application_fee_amount_usd,
    application_fee_notice_title: stored.application_fee_notice_title?.value || DEFAULT_VALUES.application_fee_notice_title,
    application_fee_notice_body: stored.application_fee_notice_body?.value || DEFAULT_VALUES.application_fee_notice_body,
    application_fee_policy_summary: stored.application_fee_policy_summary?.value || DEFAULT_VALUES.application_fee_policy_summary,
    application_fee_credit_on_approval: normalizeBoolean(
      stored.application_fee_credit_on_approval?.value,
      DEFAULT_VALUES.application_fee_credit_on_approval,
    ),
    application_fee_credit_amount_usd: stored.application_fee_credit_amount_usd?.value || DEFAULT_VALUES.application_fee_credit_amount_usd,
    renewal_reminder_days: stored.renewal_reminder_days?.value || DEFAULT_VALUES.renewal_reminder_days,
    payment_failure_grace_hours: stored.payment_failure_grace_hours?.value || DEFAULT_VALUES.payment_failure_grace_hours,
    suspend_listing_on_past_due: normalizeBoolean(
      stored.suspend_listing_on_past_due?.value,
      DEFAULT_VALUES.suspend_listing_on_past_due,
    ),
    directory_requires_approved_application: normalizeBoolean(
      stored.directory_requires_approved_application?.value,
      DEFAULT_VALUES.directory_requires_approved_application,
    ),
    directory_requires_active_subscription: normalizeBoolean(
      stored.directory_requires_active_subscription?.value,
      DEFAULT_VALUES.directory_requires_active_subscription,
    ),
  }), [stored]);

  const [values, setValues] = useState<DirectorySettingsValues>(computedDefaults);

  useEffect(() => {
    setValues(computedDefaults);
  }, [computedDefaults]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payloads = [
        { key: "application_fee_amount_usd", value: values.application_fee_amount_usd },
        { key: "application_fee_notice_title", value: values.application_fee_notice_title },
        { key: "application_fee_notice_body", value: values.application_fee_notice_body },
        { key: "application_fee_policy_summary", value: values.application_fee_policy_summary },
        { key: "application_fee_credit_on_approval", value: values.application_fee_credit_on_approval ? "true" : "false" },
        { key: "application_fee_credit_amount_usd", value: values.application_fee_credit_amount_usd },
        { key: "renewal_reminder_days", value: values.renewal_reminder_days },
        { key: "payment_failure_grace_hours", value: values.payment_failure_grace_hours },
        { key: "suspend_listing_on_past_due", value: values.suspend_listing_on_past_due ? "true" : "false" },
        { key: "directory_requires_approved_application", value: values.directory_requires_approved_application ? "true" : "false" },
        { key: "directory_requires_active_subscription", value: values.directory_requires_active_subscription ? "true" : "false" },
      ];

      await Promise.all(
        payloads.map((entry) =>
          apiRequest("PUT", "/api/admin/settings", {
            key: entry.key,
            value: entry.value,
            category: "directory_settings",
            isSecret: false,
          }),
        ),
      );
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/admin/settings"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/directory-settings"] }),
      ]);
      toast({ title: "Directory application settings updated" });
    },
    onError: (error: Error) => {
      toast({ title: "Could not save directory settings", description: error.message, variant: "destructive" });
    },
  });

  const hasChanges = JSON.stringify(values) !== JSON.stringify(computedDefaults);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-heading font-semibold">Application Settings</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Control the application fee experience, approval gating, and renewal / delinquency rules for the directory app.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CreditCard className="h-4 w-4 text-primary" />
            Fee Policy
          </CardTitle>
          <CardDescription>
            These settings shape the first two therapist application steps and determine how membership credits are handled.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="application_fee_amount_usd">Application Fee (USD)</Label>
              <Input
                id="application_fee_amount_usd"
                value={values.application_fee_amount_usd}
                onChange={(event) => setValues((current) => ({ ...current, application_fee_amount_usd: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="application_fee_credit_amount_usd">Credit Amount on Approval (USD)</Label>
              <Input
                id="application_fee_credit_amount_usd"
                value={values.application_fee_credit_amount_usd}
                onChange={(event) => setValues((current) => ({ ...current, application_fee_credit_amount_usd: event.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="application_fee_notice_title">Fee Step Heading</Label>
            <Input
              id="application_fee_notice_title"
              value={values.application_fee_notice_title}
              onChange={(event) => setValues((current) => ({ ...current, application_fee_notice_title: event.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="application_fee_notice_body">Fee Step Message</Label>
            <Textarea
              id="application_fee_notice_body"
              rows={4}
              value={values.application_fee_notice_body}
              onChange={(event) => setValues((current) => ({ ...current, application_fee_notice_body: event.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="application_fee_policy_summary">Payment Summary Copy</Label>
            <Textarea
              id="application_fee_policy_summary"
              rows={3}
              value={values.application_fee_policy_summary}
              onChange={(event) => setValues((current) => ({ ...current, application_fee_policy_summary: event.target.value }))}
            />
          </div>

          <div className="flex items-start justify-between gap-4 rounded-xl border p-4">
            <div className="space-y-1">
              <Label>Credit the fee after approval</Label>
              <p className="text-xs text-muted-foreground">
                When enabled, the application fee is applied as a one-time credit toward the member&apos;s first membership invoice.
              </p>
            </div>
            <Switch
              checked={values.application_fee_credit_on_approval}
              onCheckedChange={(checked) => setValues((current) => ({ ...current, application_fee_credit_on_approval: checked }))}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ClipboardList className="h-4 w-4 text-primary" />
            Approval And Billing Rules
          </CardTitle>
          <CardDescription>
            Define when listings become visible, when reminders are sent, and how long a failed payment can remain unresolved before suspension.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="renewal_reminder_days">Renewal Reminder Lead Time (days)</Label>
              <Input
                id="renewal_reminder_days"
                value={values.renewal_reminder_days}
                onChange={(event) => setValues((current) => ({ ...current, renewal_reminder_days: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="payment_failure_grace_hours">Failed Payment Grace Window (hours)</Label>
              <Input
                id="payment_failure_grace_hours"
                value={values.payment_failure_grace_hours}
                onChange={(event) => setValues((current) => ({ ...current, payment_failure_grace_hours: event.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-3">
            {[
              {
                key: "directory_requires_approved_application" as const,
                label: "Require approved application before listing",
                description: "Profiles remain hidden from the public directory until the application review is approved.",
              },
              {
                key: "directory_requires_active_subscription" as const,
                label: "Require active subscription before listing",
                description: "Profiles remain hidden if billing is inactive, past due, canceled, or suspended.",
              },
              {
                key: "suspend_listing_on_past_due" as const,
                label: "Suspend listings after failed-payment grace window",
                description: "After the warning period passes, the member remains able to log in but the public directory listing is disabled until billing is resolved.",
              },
            ].map((field) => (
              <div key={field.key} className="flex items-start justify-between gap-4 rounded-xl border p-4">
                <div className="space-y-1">
                  <Label>{field.label}</Label>
                  <p className="text-xs text-muted-foreground">{field.description}</p>
                </div>
                <Switch
                  checked={values[field.key]}
                  onCheckedChange={(checked) => setValues((current) => ({ ...current, [field.key]: checked }))}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button
          type="button"
          onClick={() => saveMutation.mutate()}
          disabled={!hasChanges || saveMutation.isPending}
        >
          {saveMutation.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Save Directory Settings
        </Button>
      </div>
    </div>
  );
}

export default function DirectorySettingsPage() {
  return (
    <AdminSidebar>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-heading font-semibold">Directory Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage membership plans and application rules for the directory app.
          </p>
        </div>

        <Tabs defaultValue="tiers" className="space-y-6">
          <TabsList>
            <TabsTrigger value="tiers">
              Membership Tiers
            </TabsTrigger>
            <TabsTrigger value="application">
              Application Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tiers" className="space-y-0">
            <TiersContent embedded />
          </TabsContent>

          <TabsContent value="application">
            <DirectoryApplicationSettingsTab />
          </TabsContent>
        </Tabs>
      </div>
    </AdminSidebar>
  );
}

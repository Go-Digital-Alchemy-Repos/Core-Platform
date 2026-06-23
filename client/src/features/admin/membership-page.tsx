import { useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AdminSidebar } from "./admin-sidebar";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CreditCard, LockKeyhole, Plus, RefreshCw, Save, Settings, Users } from "lucide-react";
import type {
  MembershipAccessRule,
  MembershipAuditEvent,
  MembershipPlan,
  MembershipPlanEntitlement,
  MembershipPlanPrice,
  MembershipSubscription,
  User,
} from "@shared/schema";

interface PlanWithDetails extends MembershipPlan {
  prices: MembershipPlanPrice[];
  entitlements: MembershipPlanEntitlement[];
}

interface SubscriptionWithDetails extends MembershipSubscription {
  plan: MembershipPlan | null;
  price: MembershipPlanPrice | null;
  user: Pick<User, "id" | "email" | "firstName" | "lastName" | "role"> | null;
}

interface StripeStatus {
  mode: "test" | "live";
  publishableKey: string | null;
  secretKeyConfigured: boolean;
  webhookSecretConfigured: boolean;
  customerPortalEnabled: boolean;
}

type MembershipAdminView = "plans" | "members" | "rules" | "settings" | "activity";

const membershipViews = new Set<MembershipAdminView>([
  "plans",
  "members",
  "rules",
  "settings",
  "activity",
]);

function normalizeMembershipView(pathSegment: string | undefined): MembershipAdminView {
  if (!pathSegment || pathSegment === "membership") return "plans";
  return membershipViews.has(pathSegment as MembershipAdminView)
    ? (pathSegment as MembershipAdminView)
    : "plans";
}

function cents(value: string) {
  return Math.round(Number(value || "0") * 100);
}

function dollars(value: number) {
  return (value / 100).toFixed(2);
}

function statusBadge(status: string) {
  return (
    <Badge
      variant={
        status === "active" || status === "manual" || status === "trialing"
          ? "default"
          : "secondary"
      }
    >
      {status}
    </Badge>
  );
}

export default function AdminMembershipPage() {
  const { toast } = useToast();
  const [location] = useLocation();
  const activeView = normalizeMembershipView(
    location.split("?")[0].split("/").filter(Boolean).pop(),
  );
  const [planForm, setPlanForm] = useState({
    name: "",
    slug: "",
    description: "",
    status: "draft",
    visibility: "public",
    isFree: false,
    trialDays: "0",
    priceLabel: "Monthly",
    priceInterval: "month",
    priceAmount: "0",
    stripePriceId: "",
    entitlements: "content.premium",
  });
  const [memberForm, setMemberForm] = useState({
    userId: "",
    planId: "",
    status: "manual",
    expiresAt: "",
    adminNotes: "",
  });
  const [ruleForm, setRuleForm] = useState({
    resourceType: "cms_page",
    resourceId: "",
    accessLevel: "public",
    planIds: "",
    entitlements: "",
    teaser: "",
  });
  const [stripeForm, setStripeForm] = useState({
    mode: "test",
    publishableKey: "",
    secretKey: "",
    webhookSecret: "",
    customerPortalEnabled: true,
  });

  const { data: plans = [] } = useQuery<PlanWithDetails[]>({
    queryKey: ["/api/admin/membership/plans"],
  });
  const { data: members = [] } = useQuery<SubscriptionWithDetails[]>({
    queryKey: ["/api/admin/membership/members"],
  });
  const { data: rules = [] } = useQuery<MembershipAccessRule[]>({
    queryKey: ["/api/admin/membership/access-rules"],
  });
  const { data: stripeStatus } = useQuery<StripeStatus>({
    queryKey: ["/api/admin/membership/payments/stripe"],
  });
  const { data: activity = [] } = useQuery<MembershipAuditEvent[]>({
    queryKey: ["/api/admin/membership/activity"],
  });

  const planOptions = useMemo(
    () => plans.map((plan) => ({ id: plan.id, label: plan.name })),
    [plans],
  );

  const createPlanMutation = useMutation({
    mutationFn: async () => {
      const entitlements = planForm.entitlements
        .split(/\n|,/)
        .map((value) => value.trim())
        .filter(Boolean);
      const payload = {
        name: planForm.name,
        slug: planForm.slug,
        description: planForm.description || null,
        status: planForm.status,
        visibility: planForm.visibility,
        isFree: planForm.isFree,
        trialDays: Number(planForm.trialDays || 0),
        prices: [
          {
            label: planForm.priceLabel,
            interval: planForm.priceInterval,
            amount: planForm.isFree ? 0 : cents(planForm.priceAmount),
            currency: "usd",
            stripePriceId: planForm.stripePriceId || null,
            active: true,
          },
        ],
        entitlements: entitlements.map((entitlement) => ({ entitlement, label: entitlement })),
      };
      await apiRequest("POST", "/api/admin/membership/plans", payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/membership/plans"] });
      toast({ title: "Membership plan created" });
      setPlanForm((current) => ({
        ...current,
        name: "",
        slug: "",
        description: "",
        stripePriceId: "",
      }));
    },
    onError: (error: Error) =>
      toast({ title: "Could not save plan", description: error.message, variant: "destructive" }),
  });

  const assignMemberMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/admin/membership/members", {
        userId: memberForm.userId,
        planId: memberForm.planId || null,
        status: memberForm.status,
        source: "manual",
        expiresAt: memberForm.expiresAt ? new Date(memberForm.expiresAt).toISOString() : null,
        adminNotes: memberForm.adminNotes || null,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/membership/members"] });
      toast({ title: "Membership assigned" });
    },
    onError: (error: Error) =>
      toast({
        title: "Could not assign membership",
        description: error.message,
        variant: "destructive",
      }),
  });

  const saveRuleMutation = useMutation({
    mutationFn: async () => {
      await apiRequest(
        "PUT",
        `/api/admin/membership/access-rules/${ruleForm.resourceType}/${ruleForm.resourceId}`,
        {
          accessLevel: ruleForm.accessLevel,
          planIds: ruleForm.planIds
            .split(/\n|,/)
            .map((value) => value.trim())
            .filter(Boolean),
          entitlements: ruleForm.entitlements
            .split(/\n|,/)
            .map((value) => value.trim())
            .filter(Boolean),
          teaser: ruleForm.teaser || null,
        },
      );
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/membership/access-rules"] });
      toast({ title: "Access rule saved" });
    },
    onError: (error: Error) =>
      toast({
        title: "Could not save access rule",
        description: error.message,
        variant: "destructive",
      }),
  });

  const saveStripeMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("PUT", "/api/admin/membership/payments/stripe", stripeForm);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/membership/payments/stripe"] });
      toast({ title: "Membership payment settings saved" });
      setStripeForm((current) => ({ ...current, secretKey: "", webhookSecret: "" }));
    },
    onError: (error: Error) =>
      toast({
        title: "Could not save Stripe settings",
        description: error.message,
        variant: "destructive",
      }),
  });

  return (
    <AdminSidebar>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Membership</h1>
          <p className="text-sm text-muted-foreground">
            Manage plans, member access, billing settings, and content restriction rules.
          </p>
        </div>

        <Tabs value={activeView} className="space-y-4">
          <TabsList>
            <TabsTrigger value="plans" asChild>
              <Link href="/admin/membership">Plans</Link>
            </TabsTrigger>
            <TabsTrigger value="members" asChild>
              <Link href="/admin/membership/members">Members</Link>
            </TabsTrigger>
            <TabsTrigger value="rules" asChild>
              <Link href="/admin/membership/rules">Access Rules</Link>
            </TabsTrigger>
            <TabsTrigger value="settings" asChild>
              <Link href="/admin/membership/settings">
                <Settings className="mr-1.5 h-4 w-4" />
                Settings
              </Link>
            </TabsTrigger>
            <TabsTrigger value="activity" asChild>
              <Link href="/admin/membership/activity">Activity</Link>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="plans" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Plus className="h-4 w-4" /> Create Plan
                </CardTitle>
                <CardDescription>
                  Paid plans need at least one active paid price before publishing.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input
                    value={planForm.name}
                    onChange={(event) => setPlanForm({ ...planForm, name: event.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Slug</Label>
                  <Input
                    value={planForm.slug}
                    onChange={(event) => setPlanForm({ ...planForm, slug: event.target.value })}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Description</Label>
                  <Textarea
                    value={planForm.description}
                    onChange={(event) =>
                      setPlanForm({ ...planForm, description: event.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={planForm.status}
                    onValueChange={(value) => setPlanForm({ ...planForm, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Trial Days</Label>
                  <Input
                    type="number"
                    value={planForm.trialDays}
                    onChange={(event) =>
                      setPlanForm({ ...planForm, trialDays: event.target.value })
                    }
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={planForm.isFree}
                    onCheckedChange={(checked) => setPlanForm({ ...planForm, isFree: checked })}
                  />
                  <Label>Free plan</Label>
                </div>
                <div className="space-y-2">
                  <Label>Price</Label>
                  <Input
                    value={planForm.priceAmount}
                    disabled={planForm.isFree}
                    onChange={(event) =>
                      setPlanForm({ ...planForm, priceAmount: event.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Stripe Price ID</Label>
                  <Input
                    value={planForm.stripePriceId}
                    disabled={planForm.isFree}
                    onChange={(event) =>
                      setPlanForm({ ...planForm, stripePriceId: event.target.value })
                    }
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Entitlements</Label>
                  <Textarea
                    value={planForm.entitlements}
                    onChange={(event) =>
                      setPlanForm({ ...planForm, entitlements: event.target.value })
                    }
                  />
                </div>
                <div className="md:col-span-2">
                  <Button
                    onClick={() => createPlanMutation.mutate()}
                    disabled={createPlanMutation.isPending}
                  >
                    <Save className="h-4 w-4 mr-2" /> Save Plan
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Plans</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Prices</TableHead>
                      <TableHead>Entitlements</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {plans.map((plan) => (
                      <TableRow key={plan.id}>
                        <TableCell className="font-medium">
                          {plan.name}
                          <div className="text-xs text-muted-foreground">{plan.slug}</div>
                        </TableCell>
                        <TableCell>{statusBadge(plan.status)}</TableCell>
                        <TableCell>
                          {plan.prices.map((price) => (
                            <div key={price.id}>
                              {dollars(price.amount)} / {price.interval}
                            </div>
                          ))}
                        </TableCell>
                        <TableCell>
                          {plan.entitlements.map((item) => item.entitlement).join(", ")}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="members" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Users className="h-4 w-4" /> Assign Membership
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>User ID</Label>
                  <Input
                    value={memberForm.userId}
                    onChange={(event) =>
                      setMemberForm({ ...memberForm, userId: event.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Plan</Label>
                  <Select
                    value={memberForm.planId}
                    onValueChange={(value) => setMemberForm({ ...memberForm, planId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose plan" />
                    </SelectTrigger>
                    <SelectContent>
                      {planOptions.map((plan) => (
                        <SelectItem key={plan.id} value={plan.id}>
                          {plan.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={memberForm.status}
                    onValueChange={(value) => setMemberForm({ ...memberForm, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">Manual</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="trialing">Trialing</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Expires At</Label>
                  <Input
                    type="date"
                    value={memberForm.expiresAt}
                    onChange={(event) =>
                      setMemberForm({ ...memberForm, expiresAt: event.target.value })
                    }
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Admin Notes</Label>
                  <Textarea
                    value={memberForm.adminNotes}
                    onChange={(event) =>
                      setMemberForm({ ...memberForm, adminNotes: event.target.value })
                    }
                  />
                </div>
                <div className="md:col-span-2">
                  <Button
                    onClick={() => assignMemberMutation.mutate()}
                    disabled={assignMemberMutation.isPending}
                  >
                    Assign Membership
                  </Button>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Members</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Member</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Renews/Expires</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {members.map((member) => (
                      <TableRow key={member.id}>
                        <TableCell>{member.user?.email ?? member.userId}</TableCell>
                        <TableCell>{member.plan?.name ?? "No plan"}</TableCell>
                        <TableCell>{statusBadge(member.status)}</TableCell>
                        <TableCell>
                          {member.currentPeriodEnd
                            ? new Date(member.currentPeriodEnd).toLocaleDateString()
                            : member.expiresAt
                              ? new Date(member.expiresAt).toLocaleDateString()
                              : "Open"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="rules" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <LockKeyhole className="h-4 w-4" /> Access Rule
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Resource Type</Label>
                  <Select
                    value={ruleForm.resourceType}
                    onValueChange={(value) => setRuleForm({ ...ruleForm, resourceType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cms_page">CMS Page</SelectItem>
                      <SelectItem value="blog_post">Blog Post</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Resource ID</Label>
                  <Input
                    value={ruleForm.resourceId}
                    onChange={(event) =>
                      setRuleForm({ ...ruleForm, resourceId: event.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Access Level</Label>
                  <Select
                    value={ruleForm.accessLevel}
                    onValueChange={(value) => setRuleForm({ ...ruleForm, accessLevel: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public">Public</SelectItem>
                      <SelectItem value="logged_in">Logged In</SelectItem>
                      <SelectItem value="any_member">Any Member</SelectItem>
                      <SelectItem value="plans">Specific Plans</SelectItem>
                      <SelectItem value="entitlements">Specific Entitlements</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Plan IDs</Label>
                  <Input
                    value={ruleForm.planIds}
                    onChange={(event) => setRuleForm({ ...ruleForm, planIds: event.target.value })}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Entitlements</Label>
                  <Input
                    value={ruleForm.entitlements}
                    onChange={(event) =>
                      setRuleForm({ ...ruleForm, entitlements: event.target.value })
                    }
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Teaser</Label>
                  <Textarea
                    value={ruleForm.teaser}
                    onChange={(event) => setRuleForm({ ...ruleForm, teaser: event.target.value })}
                  />
                </div>
                <div className="md:col-span-2">
                  <Button
                    onClick={() => saveRuleMutation.mutate()}
                    disabled={saveRuleMutation.isPending}
                  >
                    Save Rule
                  </Button>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Rules</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Resource</TableHead>
                      <TableHead>Level</TableHead>
                      <TableHead>Plans</TableHead>
                      <TableHead>Entitlements</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rules.map((rule) => (
                      <TableRow key={rule.id}>
                        <TableCell>
                          {rule.resourceType}: {rule.resourceId}
                        </TableCell>
                        <TableCell>{rule.accessLevel}</TableCell>
                        <TableCell>{rule.planIds.join(", ")}</TableCell>
                        <TableCell>{rule.entitlements.join(", ")}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <CreditCard className="h-4 w-4" /> Stripe Settings
                </CardTitle>
                <CardDescription>
                  Membership billing is independent from e-commerce and can use its own Stripe
                  account.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                {stripeStatus ? (
                  <div className="md:col-span-2 text-sm text-muted-foreground">
                    Current: {stripeStatus.mode}, secret{" "}
                    {stripeStatus.secretKeyConfigured ? "configured" : "missing"}, webhook{" "}
                    {stripeStatus.webhookSecretConfigured ? "configured" : "missing"}
                  </div>
                ) : null}
                <div className="space-y-2">
                  <Label>Mode</Label>
                  <Select
                    value={stripeForm.mode}
                    onValueChange={(value) => setStripeForm({ ...stripeForm, mode: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="test">Test</SelectItem>
                      <SelectItem value="live">Live</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Publishable Key</Label>
                  <Input
                    value={stripeForm.publishableKey}
                    onChange={(event) =>
                      setStripeForm({ ...stripeForm, publishableKey: event.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Secret Key</Label>
                  <Input
                    type="password"
                    value={stripeForm.secretKey}
                    onChange={(event) =>
                      setStripeForm({ ...stripeForm, secretKey: event.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Webhook Secret</Label>
                  <Input
                    type="password"
                    value={stripeForm.webhookSecret}
                    onChange={(event) =>
                      setStripeForm({ ...stripeForm, webhookSecret: event.target.value })
                    }
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={stripeForm.customerPortalEnabled}
                    onCheckedChange={(checked) =>
                      setStripeForm({ ...stripeForm, customerPortalEnabled: checked })
                    }
                  />
                  <Label>Enable customer portal</Label>
                </div>
                <div className="md:col-span-2">
                  <Button
                    onClick={() => saveStripeMutation.mutate()}
                    disabled={saveStripeMutation.isPending}
                  >
                    <Save className="h-4 w-4 mr-2" /> Save Stripe Settings
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="activity">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <RefreshCw className="h-4 w-4" /> Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Action</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>When</TableHead>
                      <TableHead>Note</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activity.map((event) => (
                      <TableRow key={event.id}>
                        <TableCell>{event.action}</TableCell>
                        <TableCell>{event.userId ?? "System"}</TableCell>
                        <TableCell>
                          {event.createdAt ? new Date(event.createdAt).toLocaleString() : ""}
                        </TableCell>
                        <TableCell>{event.note}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminSidebar>
  );
}

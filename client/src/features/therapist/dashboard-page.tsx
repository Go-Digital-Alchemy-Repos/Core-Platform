import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { getQueryFn } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import type { TherapistProfile, TherapistSubscription } from "@shared/schema";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { UserPen, CreditCard, CheckCircle, AlertCircle, Clock, XCircle, AlertTriangle, Send } from "lucide-react";


function computeProfileCompletion(profile: TherapistProfile | null): number {
  if (!profile) return 0;
  const fields = [
    profile.title,
    profile.bio,
    profile.specializations && profile.specializations.length > 0,
    profile.languages && profile.languages.length > 0,
    profile.credentials,
    profile.licenseNumber,
    profile.practiceMode,
    profile.phone,
    profile.city || profile.country,
  ];
  const filled = fields.filter(Boolean).length;
  return Math.round((filled / fields.length) * 100);
}

function getStatusBadge(status: string | undefined) {
  switch (status) {
    case "active":
      return <Badge data-testid="badge-subscription-status" variant="default"><CheckCircle className="w-3 h-3 mr-1" /> Active</Badge>;
    case "trialing":
      return <Badge data-testid="badge-subscription-status" variant="secondary"><Clock className="w-3 h-3 mr-1" /> Trial</Badge>;
    case "past_due":
      return <Badge data-testid="badge-subscription-status" variant="destructive"><AlertCircle className="w-3 h-3 mr-1" /> Past Due</Badge>;
    case "canceled":
      return <Badge data-testid="badge-subscription-status" variant="outline"><AlertCircle className="w-3 h-3 mr-1" /> Canceled</Badge>;
    default:
      return <Badge data-testid="badge-subscription-status" variant="outline">Inactive</Badge>;
  }
}

function ApprovalBanner({ profile }: { profile: TherapistProfile | null }) {
  if (!profile) return null;

  if (profile.isApproved) {
    return (
      <Alert data-testid="banner-approval-status" className="border-green-500/50 bg-green-50 dark:bg-green-950/30 text-green-900 dark:text-green-100">
        <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
        <AlertTitle data-testid="text-approval-title">Approved</AlertTitle>
        <AlertDescription data-testid="text-approval-message">
          Your profile is approved and live in the directory!
        </AlertDescription>
      </Alert>
    );
  }

  if (profile.rejectionReason) {
    return (
      <Alert data-testid="banner-approval-status" variant="destructive">
        <XCircle className="h-4 w-4" />
        <AlertTitle data-testid="text-approval-title">Application Not Approved</AlertTitle>
        <AlertDescription data-testid="text-approval-message" className="space-y-2">
          <p>Your application was not approved.</p>
          <p className="font-medium" data-testid="text-rejection-reason">Reason: {profile.rejectionReason}</p>
          <Link href="/contact">
            <Button variant="outline" size="sm" data-testid="link-contact-support" className="mt-1">
              <AlertTriangle className="w-4 h-4 mr-2" />
              Contact Support
            </Button>
          </Link>
        </AlertDescription>
      </Alert>
    );
  }

  const hasProfileContent = profile.title || profile.bio || (profile.specializations && profile.specializations.length > 0);

  if (hasProfileContent) {
    return (
      <Alert data-testid="banner-approval-status" className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-100">
        <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        <AlertTitle data-testid="text-approval-title">Under Review</AlertTitle>
        <AlertDescription data-testid="text-approval-message">
          Your application is under review. You'll receive an email once it's been reviewed.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert data-testid="banner-approval-status" className="border-blue-500/50 bg-blue-50 dark:bg-blue-950/30 text-blue-900 dark:text-blue-100">
      <Send className="h-4 w-4 text-blue-600 dark:text-blue-400" />
      <AlertTitle data-testid="text-approval-title">Registered</AlertTitle>
      <AlertDescription data-testid="text-approval-message" className="space-y-3">
        <p>Welcome! To be listed in our counselor directory, you'll need to complete your profile and submit an application for review.</p>
        <div className="flex gap-2">
          <Link href="/therapist/profile">
            <Button size="sm" data-testid="button-complete-profile">
              <UserPen className="w-4 h-4 mr-2" />
              Complete Your Profile
            </Button>
          </Link>
        </div>
      </AlertDescription>
    </Alert>
  );
}

export default function TherapistDashboardPage() {
  const { user } = useAuth();

  const { data: profile, isLoading: profileLoading } = useQuery<TherapistProfile | null>({
    queryKey: ["/api/therapist/profile"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const { data: subscription, isLoading: subLoading } = useQuery<TherapistSubscription | null>({
    queryKey: ["/api/therapist/subscription"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const completion = computeProfileCompletion(profile ?? null);
  const isApproved = profile?.isApproved === true;

  if (profileLoading || subLoading) {
    return (
      <div className="p-6 space-y-6 max-w-4xl mx-auto" data-testid="dashboard-loading">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
        <Skeleton className="h-32" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-heading font-semibold" data-testid="text-dashboard-title">
          Welcome, {user?.firstName || "Mental Health Professional"}
        </h1>
        <p className="text-muted-foreground mt-1" data-testid="text-dashboard-subtitle">
          Manage your profile and subscription from your dashboard.
        </p>
      </div>

      <ApprovalBanner profile={profile ?? null} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card data-testid="card-profile-completion">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <div>
              <CardTitle className="text-base">Profile Completion</CardTitle>
              <CardDescription>{completion}% complete</CardDescription>
            </div>
            <UserPen className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Progress value={completion} className="h-2" data-testid="progress-profile" />
            {completion < 100 && (
              <p className="text-sm text-muted-foreground">
                Complete your profile to appear in the directory and attract clients.
              </p>
            )}
            <Link href="/therapist/profile">
              <Button variant="outline" className="w-full" data-testid="button-edit-profile">
                <UserPen className="w-4 h-4 mr-2" />
                Edit Profile
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card data-testid="card-subscription-status">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <div>
              <CardTitle className="text-base">Subscription</CardTitle>
              <CardDescription>
                {subscription?.status === "active" ? "Your listing is live" : "Subscribe to get listed"}
              </CardDescription>
            </div>
            <CreditCard className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
              {getStatusBadge(subscription?.status ?? undefined)}
              {subscription?.currentPeriodEnd && (
                <span className="text-sm text-muted-foreground">
                  Renews {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                </span>
              )}
            </div>
            {!isApproved && (
              <p className="text-sm text-muted-foreground" data-testid="text-approval-note">
                Complete the approval process before subscribing
              </p>
            )}
            <Link href="/therapist/subscription">
              <Button variant="outline" className="w-full" data-testid="button-manage-subscription">
                <CreditCard className="w-4 h-4 mr-2" />
                Manage Subscription
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {profile && (
        <Card data-testid="card-profile-summary">
          <CardHeader>
            <CardTitle className="text-base">Profile Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium">Status:</span>
              {profile.isApproved ? (
                <Badge variant="default"><CheckCircle className="w-3 h-3 mr-1" /> Approved</Badge>
              ) : (
                <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" /> Pending Approval</Badge>
              )}
              {profile.acceptingClients && (
                <Badge variant="outline">Accepting Clients</Badge>
              )}
              {profile.willingToTravel && (
                <Badge variant="outline">Willing to Travel</Badge>
              )}
            </div>
            {profile.title && (
              <p className="text-sm text-muted-foreground">{profile.title}</p>
            )}
            {profile.specializations && profile.specializations.length > 0 && (
              <div className="flex items-center gap-1 flex-wrap">
                {profile.specializations.slice(0, 5).map((s) => (
                  <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                ))}
                {profile.specializations.length > 5 && (
                  <span className="text-xs text-muted-foreground">+{profile.specializations.length - 5} more</span>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

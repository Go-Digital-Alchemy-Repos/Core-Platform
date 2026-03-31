import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { ArrowLeft, Clock, CheckCircle2, XCircle, AlertCircle, FileSearch, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { APPLICATION_STATUS_LABELS, type ApplicationStatus } from "@shared/types";

function statusIcon(status: ApplicationStatus) {
  if (["active_member", "approved_pending_subscription"].includes(status)) {
    return <CheckCircle2 className="w-5 h-5 text-green-600" />;
  }
  if (status === "denied") return <XCircle className="w-5 h-5 text-red-600" />;
  if (status === "withdrawn") return <AlertCircle className="w-5 h-5 text-gray-500" />;
  return <Clock className="w-5 h-5 text-blue-600" />;
}

function statusColor(status: ApplicationStatus) {
  if (["active_member", "approved_pending_subscription"].includes(status)) return "bg-green-50 dark:bg-green-950/30 border-green-500/50";
  if (status === "denied") return "bg-red-50 dark:bg-red-950/30 border-red-500/50";
  if (status === "withdrawn") return "bg-gray-50 dark:bg-gray-900/30 border-gray-500/50";
  return "bg-blue-50 dark:bg-blue-950/30 border-blue-500/50";
}

export default function ApplicationStatusPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const { data: application, isLoading } = useQuery<any>({
    queryKey: ["/api/therapist/application"],
  });

  const withdraw = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/therapist/application/withdraw");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/therapist/application"] });
      toast({ title: "Application withdrawn" });
    },
    onError: () => {
      toast({ title: "Failed to withdraw", variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!application) {
    return (
      <div className="container max-w-2xl mx-auto py-8 px-4">
        <div className="mb-4">
          <Link href="/therapist">
            <Button variant="ghost" size="sm" data-testid="button-back-dashboard">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
        </div>
        <Card>
          <CardContent className="p-8 text-center">
            <FileSearch className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">No Application Found</h2>
            <p className="text-muted-foreground mb-4">You haven't started an application yet.</p>
            <Link href="/therapist/apply">
              <Button data-testid="button-start-application">Start Application</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (application.status === "draft") {
    setLocation("/therapist/apply");
    return null;
  }

  const status = application.status as ApplicationStatus;
  const canWithdraw = !["active_member", "denied", "withdrawn"].includes(status);
  const timeline = application.timeline ?? [];

  return (
    <div className="container max-w-2xl mx-auto py-8 px-4">
      <div className="mb-4">
        <Link href="/therapist">
          <Button variant="ghost" size="sm" data-testid="button-back-dashboard">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </Link>
      </div>

      <h1 className="text-2xl font-heading font-bold mb-6" data-testid="text-page-title">Application Status</h1>

      <Alert className={statusColor(status)} data-testid="banner-application-status">
        {statusIcon(status)}
        <AlertTitle data-testid="text-status-label">
          {APPLICATION_STATUS_LABELS[status] ?? status}
        </AlertTitle>
        <AlertDescription>
          {status === "submitted" && "Your application has been received and is being reviewed by our team."}
          {status === "awaiting_background_check" && "We are preparing to initiate a background check."}
          {status === "background_check_in_progress" && "Your background check is currently being processed."}
          {status === "awaiting_references" && "We are reaching out to your professional references."}
          {status === "references_in_progress" && "Waiting for responses from your references."}
          {status === "ready_for_interview" && "Your application is ready for an interview. We'll be in touch to schedule."}
          {status === "interview_scheduled" && "Your interview has been scheduled. Check your email for details."}
          {status === "interview_completed" && "Your interview is complete. A decision will be made soon."}
          {status === "approved_pending_subscription" && "Congratulations! You've been approved. Activate your membership subscription to be listed in our directory."}
          {status === "active_member" && "You are an active member of the TCK Wellness counselor network!"}
          {status === "denied" && "We appreciate your interest, but we are unable to approve your application at this time."}
          {status === "withdrawn" && "You have withdrawn your application."}
        </AlertDescription>
      </Alert>

      {status === "approved_pending_subscription" && (
        <div className="mt-4">
          <Link href="/therapist/subscription">
            <Button size="lg" className="w-full" data-testid="button-activate-subscription">
              Activate Membership Subscription
            </Button>
          </Link>
        </div>
      )}

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Application Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center justify-between p-2 rounded-md bg-muted/50">
              <span className="text-sm">Credentials</span>
              <Badge variant="outline">{application.credentials?.length ?? 0} added</Badge>
            </div>
            <div className="flex items-center justify-between p-2 rounded-md bg-muted/50">
              <span className="text-sm">References</span>
              <Badge variant="outline">{application.references?.length ?? 0} added</Badge>
            </div>
            <div className="flex items-center justify-between p-2 rounded-md bg-muted/50">
              <span className="text-sm">Background Check</span>
              <Badge variant="outline">{application.backgroundCheckStatus}</Badge>
            </div>
            <div className="flex items-center justify-between p-2 rounded-md bg-muted/50">
              <span className="text-sm">Interview</span>
              <Badge variant="outline">{application.interviewStatus}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {timeline.length > 0 && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="text-base">Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {timeline.map((entry: any) => (
                <div key={entry.id} className="flex gap-3 text-sm">
                  <div className="w-2 h-2 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">{entry.action.replace(/_/g, " ")}</p>
                    {entry.note && <p className="text-muted-foreground text-xs">{entry.note}</p>}
                    <p className="text-muted-foreground text-xs">
                      {entry.createdAt && new Date(entry.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {canWithdraw && (
        <div className="mt-6 text-center">
          <Button
            variant="outline"
            className="text-red-600 hover:text-red-700"
            onClick={() => withdraw.mutate()}
            disabled={withdraw.isPending}
            data-testid="button-withdraw-application"
          >
            {withdraw.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Withdraw Application
          </Button>
        </div>
      )}
    </div>
  );
}

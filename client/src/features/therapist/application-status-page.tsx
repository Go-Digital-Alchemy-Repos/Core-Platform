import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { TherapistLayout } from "./therapist-layout";
import {
  Clock, CheckCircle2, XCircle, AlertCircle, FileSearch, Loader2,
  Shield, Users, Video, FileCheck, Mail, CreditCard, AlertTriangle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
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

function statusDescription(status: ApplicationStatus) {
  const map: Record<string, string> = {
    submitted: "Your application has been received and is being reviewed by our team.",
    awaiting_background_check: "We are preparing to initiate a background check. You will receive an email with instructions.",
    background_check_in_progress: "Your background check is currently being processed.",
    awaiting_references: "We are reaching out to your professional references.",
    references_in_progress: "Waiting for responses from your references.",
    ready_for_interview: "Your application is ready for an interview. We'll be in touch to schedule.",
    interview_scheduled: "Your interview has been scheduled. Check your email for details.",
    interview_completed: "Your interview is complete. A decision will be made soon.",
    approved_pending_subscription: "Congratulations! You've been approved. Activate your membership subscription to be listed in our directory.",
    active_member: "You are an active member of the Core Platform counselor network!",
    denied: "We appreciate your interest, but we are unable to approve your application at this time. The application fee is non-refundable.",
    withdrawn: "You have withdrawn your application.",
  };
  return map[status] || "";
}

interface ProgressStep {
  label: string;
  icon: typeof Clock;
  status: "complete" | "current" | "upcoming" | "failed";
  detail?: string;
}

function getProgressSteps(application: any): ProgressStep[] {
  const status = application.status as ApplicationStatus;
  const bgStatus = application.backgroundCheckStatus;
  const refStatus = application.referencesStatus;
  const intStatus = application.interviewStatus;
  const decStatus = application.decisionStatus;

  const statusOrder = [
    "submitted",
    "awaiting_background_check", "background_check_in_progress",
    "awaiting_references", "references_in_progress",
    "ready_for_interview", "interview_scheduled", "interview_completed",
    "approved_pending_subscription", "active_member",
  ];
  const currentIdx = statusOrder.indexOf(status);

  function stepState(checkStatuses: string[], thresholdIdx: number): ProgressStep["status"] {
    if (checkStatuses.includes("completed")) return "complete";
    if (checkStatuses.includes("failed")) return "failed";
    if (currentIdx >= thresholdIdx) return "current";
    return "upcoming";
  }

  const refs = application.references ?? [];
  const totalRefs = refs.length;
  const completedRefs = refs.filter((r: any) => r.status === "completed").length;

  let refStepStatus: ProgressStep["status"];
  if (refStatus === "completed" || completedRefs >= totalRefs && totalRefs > 0) {
    refStepStatus = "complete";
  } else if (refStatus === "in_progress" || completedRefs > 0) {
    refStepStatus = "current";
  } else if (currentIdx >= 3) {
    refStepStatus = "current";
  } else {
    refStepStatus = "upcoming";
  }

  return [
    {
      label: "Application Submitted",
      icon: FileCheck,
      status: currentIdx >= 0 ? "complete" : "upcoming",
      detail: application.submittedAt ? `Submitted ${new Date(application.submittedAt).toLocaleDateString()}` : undefined,
    },
    {
      label: "Application Fee",
      icon: CreditCard,
      status: application.paymentStatus === "paid" ? "complete" : "upcoming",
      detail: application.paidAt ? `Paid ${new Date(application.paidAt).toLocaleDateString()}` : undefined,
    },
    {
      label: "Background Check",
      icon: Shield,
      status: bgStatus === "completed" ? "complete" : bgStatus === "in_progress" ? "current" : stepState([bgStatus], 1),
      detail: application.backgroundCheck?.providerFacingLabel || (bgStatus === "completed" ? "Completed" : bgStatus === "in_progress" ? "In progress" : undefined),
    },
    {
      label: "References",
      icon: Users,
      status: refStepStatus,
      detail: totalRefs > 0 ? `${completedRefs}/${totalRefs} completed` : "Awaiting references",
    },
    {
      label: "Interview",
      icon: Video,
      status: stepState([intStatus], 5),
      detail: intStatus === "completed" ? "Completed" : intStatus === "in_progress" ? "Scheduled" : undefined,
    },
    {
      label: "Final Review",
      icon: FileSearch,
      status: stepState([decStatus], 7),
      detail: decStatus === "completed" ? (status === "denied" ? "Not approved" : "Approved") : undefined,
    },
  ];
}

function ProgressTracker({ steps }: { steps: ProgressStep[] }) {
  return (
    <div className="space-y-0">
      {steps.map((step, idx) => {
        const Icon = step.icon;
        const isLast = idx === steps.length - 1;
        return (
          <div key={step.label} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                step.status === "complete" ? "bg-green-100 dark:bg-green-900/30 text-green-600" :
                step.status === "current" ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600" :
                step.status === "failed" ? "bg-red-100 dark:bg-red-900/30 text-red-600" :
                "bg-muted text-muted-foreground"
              }`}>
                {step.status === "complete" ? <CheckCircle2 className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
              </div>
              {!isLast && (
                <div className={`w-0.5 h-6 ${
                  step.status === "complete" ? "bg-green-300 dark:bg-green-700" : "bg-muted-foreground/20"
                }`} />
              )}
            </div>
            <div className={`pb-4 ${isLast ? "pb-0" : ""}`}>
              <p className={`text-sm font-medium ${
                step.status === "current" ? "text-blue-700 dark:text-blue-400" :
                step.status === "complete" ? "text-green-700 dark:text-green-400" :
                step.status === "failed" ? "text-red-700 dark:text-red-400" :
                "text-muted-foreground"
              }`}>{step.label}</p>
              {step.detail && <p className="text-xs text-muted-foreground mt-0.5">{step.detail}</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function WhatHappensNext({ status }: { status: ApplicationStatus }) {
  if (["active_member", "denied", "withdrawn"].includes(status)) return null;

  const items = [
    {
      icon: Shield,
      title: "Background Check",
      description: "You will receive an email with instructions to complete a background check. Please complete it within 48 hours of receiving the link.",
      highlight: ["submitted", "awaiting_background_check"].includes(status),
    },
    {
      icon: Mail,
      title: "Reference Verification",
      description: "Your 3 professional references will receive a confidential reference form via email. We recommend letting them know to expect it.",
      highlight: ["submitted", "awaiting_references", "references_in_progress"].includes(status),
    },
    {
      icon: Video,
      title: "Interview",
      description: "After your background check and references are complete, you may be invited for a brief video interview with our team.",
      highlight: ["ready_for_interview", "interview_scheduled"].includes(status),
    },
    {
      icon: FileCheck,
      title: "Final Review & Decision",
      description: "Our team will review your complete application and make a decision. You will be notified via email.",
      highlight: ["interview_completed"].includes(status),
    },
    {
      icon: CreditCard,
      title: "Membership Billing",
      description: "Once approved, you will activate a membership subscription before your profile can go live in the directory. If your application is denied, the application fee is non-refundable.",
      highlight: false,
    },
  ];

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="text-base">What Happens Next</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className={`flex items-start gap-3 p-3 rounded-lg transition-colors ${
                  item.highlight ? "bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800" : ""
                }`}
              >
                <Icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${item.highlight ? "text-blue-600" : "text-muted-foreground"}`} />
                <div>
                  <p className={`text-sm font-medium ${item.highlight ? "text-blue-900 dark:text-blue-300" : ""}`}>{item.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
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
      <TherapistLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </TherapistLayout>
    );
  }

  if (!application) {
    return (
      <TherapistLayout>
      <div className="container max-w-2xl mx-auto py-8 px-4">
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
      </TherapistLayout>
    );
  }

  if (application.status === "draft") {
    setLocation("/therapist/apply");
    return null;
  }

  const status = application.status as ApplicationStatus;
  const canWithdraw = !["active_member", "denied", "withdrawn"].includes(status);
  const timeline = application.timeline ?? [];
  const progressSteps = getProgressSteps(application);

  return (
    <TherapistLayout>
    <div className="container max-w-2xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-heading font-bold mb-6" data-testid="text-page-title">Application Status</h1>

      <Alert className={statusColor(status)} data-testid="banner-application-status">
        {statusIcon(status)}
        <AlertTitle data-testid="text-status-label">
          {APPLICATION_STATUS_LABELS[status] ?? status}
        </AlertTitle>
        <AlertDescription>
          {statusDescription(status)}
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

      {status === "denied" && application.decision?.reason && (
        <Alert variant="destructive" className="mt-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Reason</AlertTitle>
          <AlertDescription>{application.decision.reason}</AlertDescription>
        </Alert>
      )}

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Application Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <ProgressTracker steps={progressSteps} />
        </CardContent>
      </Card>

      {application.backgroundCheck && !["draft", "withdrawn"].includes(status) && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Background Check
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Status</span>
              <span className={`text-sm font-medium ${
                application.backgroundCheck.status === "clear" || application.backgroundCheck.status === "completed" ? "text-green-600" :
                application.backgroundCheck.status === "issue" || application.backgroundCheck.status === "expired" ? "text-red-600" :
                application.backgroundCheck.status === "invited" ? "text-orange-600" :
                application.backgroundCheck.status === "in_progress" ? "text-blue-600" :
                "text-muted-foreground"
              }`} data-testid="text-bg-check-status">
                {application.backgroundCheck.status === "clear" || application.backgroundCheck.status === "completed" ? (
                  <CheckCircle2 className="w-3.5 h-3.5 inline mr-1" />
                ) : null}
                {application.backgroundCheck.providerFacingLabel || "Not Started"}
              </span>
            </div>
            {application.backgroundCheck.status === "invited" && (
              <p className="text-xs text-orange-600 mt-2">
                Please check your email for instructions to complete the background check.
              </p>
            )}
            {application.backgroundCheck.status === "issue" && (
              <p className="text-xs text-red-600 mt-2">
                There is an issue with your background check. Our team will be in touch.
              </p>
            )}
            {application.backgroundCheck.completedAt && (
              <p className="text-xs text-muted-foreground mt-2">
                Completed {new Date(application.backgroundCheck.completedAt).toLocaleDateString()}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {application.references && application.references.length > 0 && !["draft", "withdrawn"].includes(status) && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="w-4 h-4" />
              Reference Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {application.references.map((ref: any, idx: number) => {
                const refStatus = ref.status || "pending";
                const statusLabel = refStatus === "completed" ? "Completed" : refStatus === "opened" ? "Form opened" : refStatus === "email_sent" ? "Email sent" : "Pending";
                const statusColor = refStatus === "completed" ? "text-green-600" : refStatus === "opened" ? "text-blue-600" : "text-muted-foreground";
                return (
                  <div key={ref.id || idx} className="flex items-center justify-between text-sm py-2 border-b last:border-0">
                    <span className="font-medium">Reference {idx + 1}</span>
                    <span className={`${statusColor} font-medium`} data-testid={`text-ref-status-${idx}`}>
                      {refStatus === "completed" && <CheckCircle2 className="w-3.5 h-3.5 inline mr-1" />}
                      {statusLabel}
                    </span>
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Reference identities and responses are confidential and not shared with applicants.
            </p>
          </CardContent>
        </Card>
      )}

      {application.paymentStatus === "paid" && application.paidAt && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              Payment Receipt
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Amount Paid</p>
                <p className="font-medium">${((application.amountPaid || 15000) / 100).toFixed(2)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Date</p>
                <p className="font-medium">{new Date(application.paidAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Fee Policy</p>
                <p className="font-medium">Non-refundable</p>
              </div>
              <div>
                <p className="text-muted-foreground">Approval Credit</p>
                <p className="font-medium">
                  {application.refundEligibleAmount
                    ? `$${(application.refundEligibleAmount / 100).toFixed(2)} toward first membership invoice`
                    : "Not configured"}
                </p>
              </div>
              {application.stripePaymentIntentId && (
                <div className="col-span-2">
                  <p className="text-muted-foreground">Transaction Reference</p>
                  <p className="font-mono text-xs">{application.stripePaymentIntentId}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <WhatHappensNext status={status} />

      {timeline.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">Activity Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {timeline.map((entry: any) => (
                <div key={entry.id} className="flex gap-3 text-sm">
                  <div className="w-2 h-2 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium capitalize">{entry.action.replace(/_/g, " ")}</p>
                    {entry.note && <p className="text-muted-foreground text-xs">{entry.note}</p>}
                    <p className="text-muted-foreground text-xs">
                      {entry.createdAt && new Date(entry.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}
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
          <Separator className="mb-6" />
          <p className="text-sm text-muted-foreground mb-3">If you need to withdraw your application, you can do so below. This action cannot be undone.</p>
          <Button
            variant="outline"
            className="text-red-600 hover:text-red-700 border-red-200 hover:border-red-300"
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
    </TherapistLayout>
  );
}

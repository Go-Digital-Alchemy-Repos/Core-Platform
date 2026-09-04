import { useMutation, useQuery } from "@tanstack/react-query";
import * as React from "react";
import { RefreshCw, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface StripeWebhookDelivery {
  eventId: string;
  eventType: string;
  status: "processing" | "processed" | "failed";
  attemptCount: number;
  startedAt: string;
  completedAt: string | null;
  processedAt: string | null;
  hasFailure: boolean;
}

interface EcommerceNotificationJob {
  id: string;
  type: "order_confirmation" | "refund_confirmation" | "shipment_confirmation" | "order_status";
  status: "failed";
  orderId: string;
  attemptCount: number;
  createdAt: string;
  failedAt: string | null;
  hasFailure: boolean;
}

function statusBadge(status: StripeWebhookDelivery["status"]) {
  if (status === "processed")
    return { label: "Processed", className: "bg-emerald-50 text-emerald-700 border-emerald-200" };
  if (status === "failed")
    return { label: "Needs replay", className: "bg-rose-50 text-rose-700 border-rose-200" };
  return { label: "Processing", className: "bg-amber-50 text-amber-700 border-amber-200" };
}

export function WebhookDeliveriesTab() {
  const { toast } = useToast();
  const [jobToRetry, setJobToRetry] = React.useState<EcommerceNotificationJob | null>(null);
  const { data: deliveries = [], isLoading } = useQuery<StripeWebhookDelivery[]>({
    queryKey: ["/api/admin/ecommerce/webhooks/stripe", { status: "failed", limit: 50 }],
  });
  const { data: notificationJobs = [], isLoading: notificationJobsLoading } = useQuery<
    EcommerceNotificationJob[]
  >({
    queryKey: ["/api/admin/ecommerce/notification-jobs", { status: "failed", limit: 50 }],
  });
  const replayMutation = useMutation({
    mutationFn: async (eventId: string) => {
      const response = await apiRequest(
        "POST",
        `/api/admin/ecommerce/webhooks/stripe/${encodeURIComponent(eventId)}/replay`,
      );
      return response.json() as Promise<{ status: string }>;
    },
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/ecommerce/webhooks/stripe"] });
      toast({
        title: result.status === "replayed" ? "Stripe event replayed" : "Stripe event unchanged",
        description:
          result.status === "replayed"
            ? "The provider event was reconciled through the durable delivery lifecycle."
            : "Another worker already owns or completed this event.",
      });
    },
    onError: (error) =>
      toast({
        title: "Stripe event could not be replayed",
        description:
          error instanceof Error ? error.message : "Review the delivery state and try again.",
        variant: "destructive",
      }),
  });
  const retryNotificationMutation = useMutation({
    mutationFn: async (jobId: string) => {
      const response = await apiRequest(
        "POST",
        `/api/admin/ecommerce/notification-jobs/${encodeURIComponent(jobId)}/retry`,
      );
      return response.json() as Promise<{ id: string }>;
    },
    onSuccess: async () => {
      setJobToRetry(null);
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/ecommerce/notification-jobs"] });
      toast({
        title: "Notification queued for one retry",
        description:
          "The worker will make one new delivery attempt using the current order details.",
      });
    },
    onError: (error) =>
      toast({
        title: "Notification could not be queued",
        description:
          error instanceof Error
            ? error.message
            : "Refresh the job list and review the order history.",
        variant: "destructive",
      }),
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-amber-600" /> Payment recovery
          </CardTitle>
          <CardDescription>
            Failed Stripe events can be replayed from Stripe by event ID. Raw webhook payloads and
            failure details are intentionally not displayed here.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading failed Stripe deliveries…</p>
          ) : deliveries.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No failed Stripe webhook deliveries need replay.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Event</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Attempts</TableHead>
                    <TableHead>Last started</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deliveries.map((delivery) => {
                    const badge = statusBadge(delivery.status);
                    return (
                      <TableRow key={delivery.eventId}>
                        <TableCell>
                          <div className="font-medium">{delivery.eventType}</div>
                          <div className="font-mono text-xs text-muted-foreground">
                            {delivery.eventId}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={badge.className}>
                            {badge.label}
                          </Badge>
                        </TableCell>
                        <TableCell>{delivery.attemptCount}</TableCell>
                        <TableCell>{new Date(delivery.startedAt).toLocaleString()}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={delivery.status !== "failed" || replayMutation.isPending}
                            onClick={() => replayMutation.mutate(delivery.eventId)}
                          >
                            <RefreshCw className="mr-2 h-4 w-4" /> Replay from Stripe
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Failed customer notifications</CardTitle>
          <CardDescription>
            Receipt delivery retries with bounded backoff. Failed jobs are retained here without
            recipient or provider details so an operator can investigate the mail configuration and
            order history safely before explicitly queuing one further attempt.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {notificationJobsLoading ? (
            <p className="text-sm text-muted-foreground">Loading failed receipt jobs…</p>
          ) : notificationJobs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No failed order receipt jobs.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Notification</TableHead>
                    <TableHead>Order</TableHead>
                    <TableHead>Attempts</TableHead>
                    <TableHead>Failed at</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {notificationJobs.map((job) => (
                    <TableRow key={job.id}>
                      <TableCell className="font-medium">{job.type.replaceAll("_", " ")}</TableCell>
                      <TableCell className="font-mono text-xs">{job.orderId}</TableCell>
                      <TableCell>{job.attemptCount}</TableCell>
                      <TableCell>
                        {job.failedAt ? new Date(job.failedAt).toLocaleString() : "Pending review"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={retryNotificationMutation.isPending}
                          onClick={() => setJobToRetry(job)}
                        >
                          <RefreshCw className="mr-2 h-4 w-4" /> Retry email
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog
        open={Boolean(jobToRetry)}
        onOpenChange={(open) => {
          if (!open && !retryNotificationMutation.isPending) setJobToRetry(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Queue this notification for one retry?</AlertDialogTitle>
            <AlertDialogDescription>
              Review the order history and mail-provider logs first. A provider may have accepted an
              earlier attempt before returning an error, so this action can result in a duplicate
              customer email.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={retryNotificationMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={retryNotificationMutation.isPending}
              onClick={(event) => {
                event.preventDefault();
                if (jobToRetry) retryNotificationMutation.mutate(jobToRetry.id);
              }}
            >
              Queue one retry
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { ArrowLeft, Loader2, Send, UserCheck, XCircle } from "lucide-react";
import { AdminSidebar } from "./admin-sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { APPLICATION_STATUS, APPLICATION_STATUS_LABELS, type ApplicationStatus } from "@shared/types";

function statusBadgeVariant(status: ApplicationStatus): "default" | "secondary" | "destructive" | "outline" {
  if (["active_member", "approved_pending_subscription"].includes(status)) return "default";
  if (status === "denied") return "destructive";
  if (status === "withdrawn") return "secondary";
  return "outline";
}

export default function AdminApplicationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const [newStatus, setNewStatus] = useState("");
  const [statusNote, setStatusNote] = useState("");
  const [adminNote, setAdminNote] = useState("");

  const { data: application, isLoading } = useQuery<any>({
    queryKey: ["/api/admin/applications", id],
  });

  const changeStatus = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PATCH", `/api/admin/applications/${id}/status`, {
        status: newStatus,
        note: statusNote || undefined,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/applications", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/applications"] });
      setNewStatus("");
      setStatusNote("");
      toast({ title: "Status updated" });
    },
    onError: () => {
      toast({ title: "Failed to update status", variant: "destructive" });
    },
  });

  const addNote = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/admin/applications/${id}/timeline`, {
        note: adminNote,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/applications", id] });
      setAdminNote("");
      toast({ title: "Note added" });
    },
  });

  if (isLoading) {
    return (
      <AdminSidebar>
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AdminSidebar>
    );
  }

  if (!application) {
    return (
      <AdminSidebar>
        <div className="p-6">
          <p>Application not found.</p>
          <Link href="/admin/applications">
            <Button variant="ghost" className="mt-4">Back to Applications</Button>
          </Link>
        </div>
      </AdminSidebar>
    );
  }

  const currentStatus = application.status as ApplicationStatus;
  const timeline = application.timeline ?? [];
  const credentials = application.credentials ?? [];
  const references = application.references ?? [];

  return (
    <AdminSidebar>
      <div className="p-6 max-w-4xl">
        <div className="mb-4">
          <Link href="/admin/applications">
            <Button variant="ghost" size="sm" data-testid="button-back-applications">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Applications
            </Button>
          </Link>
        </div>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-heading font-bold" data-testid="text-page-title">Application Detail</h1>
            <p className="text-muted-foreground text-sm">Application ID: {application.id}</p>
          </div>
          <Badge variant={statusBadgeVariant(currentStatus)} className="text-sm px-3 py-1">
            {APPLICATION_STATUS_LABELS[currentStatus] ?? currentStatus}
          </Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Applicant Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p><span className="text-muted-foreground">User ID:</span> {application.userId}</p>
                <p><span className="text-muted-foreground">Submitted:</span> {application.submittedAt ? new Date(application.submittedAt).toLocaleString() : "Not yet"}</p>
                <p><span className="text-muted-foreground">Created:</span> {application.createdAt && new Date(application.createdAt).toLocaleString()}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Credentials ({credentials.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {credentials.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No credentials submitted</p>
                ) : (
                  <div className="space-y-2">
                    {credentials.map((c: any) => (
                      <div key={c.id} className="flex items-center justify-between p-2 rounded bg-muted/50">
                        <div>
                          <p className="font-medium text-sm">{c.credentialType}</p>
                          <p className="text-xs text-muted-foreground">
                            {c.issuer}{c.licenseNumber && ` — #${c.licenseNumber}`}
                            {c.stateOrCountry && ` (${c.stateOrCountry})`}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-xs">{c.verificationStatus}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">References ({references.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {references.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No references submitted</p>
                ) : (
                  <div className="space-y-2">
                    {references.map((r: any) => (
                      <div key={r.id} className="flex items-center justify-between p-2 rounded bg-muted/50">
                        <div>
                          <p className="font-medium text-sm">{r.refereeName}</p>
                          <p className="text-xs text-muted-foreground">{r.refereeEmail} {r.relationship && `— ${r.relationship}`}</p>
                        </div>
                        <Badge variant="outline" className="text-xs">{r.status}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Sub-Status Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex justify-between p-2 bg-muted/50 rounded">
                    <span>Payment</span>
                    <Badge variant="outline">{application.paymentStatus}</Badge>
                  </div>
                  <div className="flex justify-between p-2 bg-muted/50 rounded">
                    <span>Background</span>
                    <Badge variant="outline">{application.backgroundCheckStatus}</Badge>
                  </div>
                  <div className="flex justify-between p-2 bg-muted/50 rounded">
                    <span>References</span>
                    <Badge variant="outline">{application.referencesStatus}</Badge>
                  </div>
                  <div className="flex justify-between p-2 bg-muted/50 rounded">
                    <span>Interview</span>
                    <Badge variant="outline">{application.interviewStatus}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Change Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label htmlFor="newStatus">New Status</Label>
                  <select
                    id="newStatus"
                    className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    data-testid="select-new-status"
                  >
                    <option value="">Select status...</option>
                    {APPLICATION_STATUS.filter((s) => s !== currentStatus).map((s) => (
                      <option key={s} value={s}>{APPLICATION_STATUS_LABELS[s]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="statusNote">Note (optional)</Label>
                  <Input
                    id="statusNote"
                    value={statusNote}
                    onChange={(e) => setStatusNote(e.target.value)}
                    placeholder="Reason for status change"
                    data-testid="input-status-note"
                  />
                </div>
                <div className="flex gap-2">
                  {newStatus === "approved_pending_subscription" && (
                    <Button
                      size="sm"
                      onClick={() => changeStatus.mutate()}
                      disabled={changeStatus.isPending}
                      className="bg-green-600 hover:bg-green-700"
                      data-testid="button-approve"
                    >
                      {changeStatus.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <UserCheck className="w-4 h-4 mr-1" />}
                      Approve
                    </Button>
                  )}
                  {newStatus === "denied" && (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => changeStatus.mutate()}
                      disabled={changeStatus.isPending}
                      data-testid="button-deny"
                    >
                      {changeStatus.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <XCircle className="w-4 h-4 mr-1" />}
                      Deny
                    </Button>
                  )}
                  {newStatus && !["approved_pending_subscription", "denied"].includes(newStatus) && (
                    <Button
                      size="sm"
                      onClick={() => changeStatus.mutate()}
                      disabled={changeStatus.isPending}
                      data-testid="button-update-status"
                    >
                      {changeStatus.isPending && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
                      Update Status
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Add Note</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Textarea
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  placeholder="Internal note about this application..."
                  data-testid="textarea-admin-note"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => addNote.mutate()}
                  disabled={!adminNote || addNote.isPending}
                  data-testid="button-add-note"
                >
                  {addNote.isPending && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
                  <Send className="w-4 h-4 mr-1" />
                  Add Note
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                {timeline.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No timeline entries</p>
                ) : (
                  <div className="space-y-3">
                    {timeline.map((entry: any) => (
                      <div key={entry.id} className="flex gap-2 text-sm">
                        <div className="w-2 h-2 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                        <div>
                          <p className="font-medium">{entry.action.replace(/_/g, " ")}</p>
                          {entry.fromStatus && entry.toStatus && (
                            <p className="text-xs text-muted-foreground">
                              {APPLICATION_STATUS_LABELS[entry.fromStatus as ApplicationStatus] ?? entry.fromStatus} → {APPLICATION_STATUS_LABELS[entry.toStatus as ApplicationStatus] ?? entry.toStatus}
                            </p>
                          )}
                          {entry.note && <p className="text-xs text-muted-foreground italic">{entry.note}</p>}
                          <p className="text-xs text-muted-foreground">
                            {entry.createdAt && new Date(entry.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AdminSidebar>
  );
}

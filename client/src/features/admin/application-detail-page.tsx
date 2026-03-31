import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { ArrowLeft, Loader2, Send, UserCheck, XCircle, Shield, RefreshCw, RotateCcw } from "lucide-react";
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
  const [bgStatus, setBgStatus] = useState("");
  const [bgNotes, setBgNotes] = useState("");
  const [bgAdminDetails, setBgAdminDetails] = useState("");
  const [bgExternalId, setBgExternalId] = useState("");
  const [bgReportUrl, setBgReportUrl] = useState("");

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
  const bgCheck = application.backgroundCheck;

  const initiateBgCheck = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/admin/applications/${id}/background-check/initiate`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/applications", id] });
      toast({ title: "Background check initiated" });
    },
    onError: () => {
      toast({ title: "Failed to initiate background check", variant: "destructive" });
    },
  });

  const syncBgCheck = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/admin/applications/${id}/background-check/sync`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/applications", id] });
      toast({ title: "Background check status synced" });
    },
    onError: () => {
      toast({ title: "Failed to sync status", variant: "destructive" });
    },
  });

  const resendBgInvite = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/admin/applications/${id}/background-check/resend`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/applications", id] });
      toast({ title: "Background check invite resent" });
    },
    onError: () => {
      toast({ title: "Failed to resend invite", variant: "destructive" });
    },
  });

  const updateBgCheck = useMutation({
    mutationFn: async () => {
      const body: Record<string, string> = {};
      if (bgStatus) body.status = bgStatus;
      if (bgNotes) body.notes = bgNotes;
      if (bgAdminDetails) body.adminStatusDetails = bgAdminDetails;
      if (bgExternalId) body.vendorExternalId = bgExternalId;
      if (bgReportUrl) body.reportUrl = bgReportUrl;
      const res = await apiRequest("PATCH", `/api/admin/applications/${id}/background-check`, body);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/applications", id] });
      setBgStatus("");
      setBgNotes("");
      setBgAdminDetails("");
      setBgExternalId("");
      setBgReportUrl("");
      toast({ title: "Background check updated" });
    },
    onError: () => {
      toast({ title: "Failed to update background check", variant: "destructive" });
    },
  });

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
                <CardTitle className="text-base flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Background Check
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!bgCheck ? (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">No background check record exists yet.</p>
                    <Button
                      size="sm"
                      onClick={() => initiateBgCheck.mutate()}
                      disabled={initiateBgCheck.isPending}
                      data-testid="button-initiate-bg-check"
                    >
                      {initiateBgCheck.isPending && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
                      <Shield className="w-4 h-4 mr-1" />
                      Initiate Background Check
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-muted-foreground">Status</p>
                        <Badge variant={bgCheck.status === "clear" || bgCheck.status === "completed" ? "default" : bgCheck.status === "issue" || bgCheck.status === "consider" ? "destructive" : "outline"} className="mt-0.5" data-testid="badge-bg-status">
                          {bgCheck.status}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Provider Label</p>
                        <p className="font-medium" data-testid="text-bg-provider-label">{bgCheck.providerFacingLabel || "—"}</p>
                      </div>
                      {bgCheck.vendorName && (
                        <div>
                          <p className="text-muted-foreground">Vendor</p>
                          <p className="font-medium">{bgCheck.vendorName}</p>
                        </div>
                      )}
                      {bgCheck.vendorExternalId && (
                        <div>
                          <p className="text-muted-foreground">External ID</p>
                          <p className="font-mono text-xs">{bgCheck.vendorExternalId}</p>
                        </div>
                      )}
                      {bgCheck.requestedAt && (
                        <div>
                          <p className="text-muted-foreground">Requested</p>
                          <p className="font-medium">{new Date(bgCheck.requestedAt).toLocaleString()}</p>
                        </div>
                      )}
                      {bgCheck.lastStatusSyncAt && (
                        <div>
                          <p className="text-muted-foreground">Last Synced</p>
                          <p className="font-medium">{new Date(bgCheck.lastStatusSyncAt).toLocaleString()}</p>
                        </div>
                      )}
                      {bgCheck.completedAt && (
                        <div>
                          <p className="text-muted-foreground">Completed</p>
                          <p className="font-medium">{new Date(bgCheck.completedAt).toLocaleString()}</p>
                        </div>
                      )}
                      {bgCheck.result && (
                        <div>
                          <p className="text-muted-foreground">Result</p>
                          <p className="font-medium">{bgCheck.result}</p>
                        </div>
                      )}
                    </div>

                    {bgCheck.adminStatusDetails && (
                      <div className="text-sm">
                        <p className="text-muted-foreground mb-1">Admin Details</p>
                        <p className="bg-muted/50 rounded p-2 text-xs">{bgCheck.adminStatusDetails}</p>
                      </div>
                    )}

                    {bgCheck.notes && (
                      <div className="text-sm">
                        <p className="text-muted-foreground mb-1">Notes</p>
                        <p className="bg-muted/50 rounded p-2 text-xs">{bgCheck.notes}</p>
                      </div>
                    )}

                    {bgCheck.reportUrl && (
                      <div className="text-sm">
                        <a href={bgCheck.reportUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-xs" data-testid="link-bg-report">
                          View Report
                        </a>
                      </div>
                    )}

                    <div className="flex gap-2 flex-wrap">
                      {bgCheck.status === "not_sent" && (
                        <Button
                          size="sm"
                          onClick={() => initiateBgCheck.mutate()}
                          disabled={initiateBgCheck.isPending}
                          data-testid="button-initiate-bg-check"
                        >
                          {initiateBgCheck.isPending && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
                          Initiate
                        </Button>
                      )}
                      {bgCheck.vendorExternalId && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => syncBgCheck.mutate()}
                          disabled={syncBgCheck.isPending}
                          data-testid="button-sync-bg-check"
                        >
                          {syncBgCheck.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-1" />}
                          Sync Status
                        </Button>
                      )}
                      {["invited", "expired"].includes(bgCheck.status) && bgCheck.vendorExternalId && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => resendBgInvite.mutate()}
                          disabled={resendBgInvite.isPending}
                          data-testid="button-resend-bg-invite"
                        >
                          {resendBgInvite.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <RotateCcw className="w-4 h-4 mr-1" />}
                          Resend Invite
                        </Button>
                      )}
                    </div>

                    <div className="border-t pt-4 space-y-3">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Manual Update</p>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label htmlFor="bgStatus" className="text-xs">Status</Label>
                          <select
                            id="bgStatus"
                            className="w-full border rounded-md px-2 py-1.5 text-sm bg-background"
                            value={bgStatus}
                            onChange={(e) => setBgStatus(e.target.value)}
                            data-testid="select-bg-status"
                          >
                            <option value="">No change</option>
                            {["not_sent", "pending", "invited", "in_progress", "clear", "consider", "issue", "expired", "completed"].map((s) => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <Label htmlFor="bgExternalId" className="text-xs">Vendor External ID</Label>
                          <Input
                            id="bgExternalId"
                            value={bgExternalId}
                            onChange={(e) => setBgExternalId(e.target.value)}
                            placeholder="External ID"
                            className="h-8 text-sm"
                            data-testid="input-bg-external-id"
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="bgAdminDetails" className="text-xs">Admin Status Details</Label>
                        <Input
                          id="bgAdminDetails"
                          value={bgAdminDetails}
                          onChange={(e) => setBgAdminDetails(e.target.value)}
                          placeholder="Internal status details"
                          className="h-8 text-sm"
                          data-testid="input-bg-admin-details"
                        />
                      </div>
                      <div>
                        <Label htmlFor="bgReportUrl" className="text-xs">Report URL</Label>
                        <Input
                          id="bgReportUrl"
                          value={bgReportUrl}
                          onChange={(e) => setBgReportUrl(e.target.value)}
                          placeholder="https://..."
                          className="h-8 text-sm"
                          data-testid="input-bg-report-url"
                        />
                      </div>
                      <div>
                        <Label htmlFor="bgNotes" className="text-xs">Notes</Label>
                        <Textarea
                          id="bgNotes"
                          value={bgNotes}
                          onChange={(e) => setBgNotes(e.target.value)}
                          placeholder="Internal notes..."
                          className="text-sm"
                          rows={2}
                          data-testid="textarea-bg-notes"
                        />
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateBgCheck.mutate()}
                        disabled={updateBgCheck.isPending || (!bgStatus && !bgNotes && !bgAdminDetails && !bgExternalId && !bgReportUrl)}
                        data-testid="button-update-bg-check"
                      >
                        {updateBgCheck.isPending && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
                        Update Background Check
                      </Button>
                    </div>
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

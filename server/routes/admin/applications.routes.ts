import { Router } from "express";
import { storage } from "../../storage/index";
import { asyncHandler } from "../../middleware/error-handler";
import { APPLICATION_STATUS } from "@shared/types";
import {
  initiateBackgroundCheck,
  syncBackgroundCheckStatus,
  resendBackgroundCheckInvite,
  adminUpdateBackgroundCheck,
  BACKGROUND_CHECK_STATUSES,
  type BackgroundCheckStatus,
} from "../../services/background-check.service";
import { sendReferenceRequestEmail } from "../../services/email.service";

const router = Router();

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const status = req.query.status as string | undefined;
    const applications = await storage.applications.getAll(status);
    res.json(applications);
  })
);

router.get(
  "/stats",
  asyncHandler(async (_req, res) => {
    const counts = await storage.applications.countByStatus();
    res.json(counts);
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const application = await storage.applications.getById(req.params.id);
    if (!application) {
      res.status(404).json({ message: "Application not found" });
      return;
    }

    const [timeline, credentials, references, backgroundCheck, interview, decision] = await Promise.all([
      storage.applications.getTimeline(application.id),
      storage.applications.getCredentials(application.id),
      storage.applications.getReferences(application.id),
      storage.applications.getBackgroundCheck(application.id),
      storage.applications.getInterview(application.id),
      storage.applications.getDecision(application.id),
    ]);

    res.json({
      ...application,
      timeline,
      credentials,
      references,
      backgroundCheck,
      interview,
      decision,
    });
  })
);

router.patch(
  "/:id/status",
  asyncHandler(async (req, res) => {
    const { status, note } = req.body;

    if (!status || !APPLICATION_STATUS.includes(status)) {
      res.status(400).json({ message: "Invalid application status" });
      return;
    }

    const application = await storage.applications.getById(req.params.id);
    if (!application) {
      res.status(404).json({ message: "Application not found" });
      return;
    }

    const updateData: Record<string, unknown> = { status };
    if (["approved_pending_subscription", "active_member", "denied"].includes(status)) {
      updateData.decidedAt = new Date();
    }

    const updated = await storage.applications.update(application.id, updateData as any);

    await storage.applications.addTimelineEntry({
      applicationId: application.id,
      action: "status_changed",
      fromStatus: application.status,
      toStatus: status,
      note,
      performedBy: req.user!.id,
    });

    if (status === "approved_pending_subscription") {
      await storage.applications.addDecision({
        applicationId: application.id,
        decision: "approved",
        reason: note,
        decidedBy: req.user!.id,
      });

      const user = await storage.users.getUser(application.userId);
      if (user) {
        await storage.users.updateUser(application.userId, { isApproved: true });
      }
    }

    if (status === "denied") {
      await storage.applications.addDecision({
        applicationId: application.id,
        decision: "denied",
        reason: note,
        decidedBy: req.user!.id,
      });

      await storage.users.updateUser(application.userId, { isApproved: false });
    }

    await storage.activity.log(req.user!.id, "application_status_changed", `Application ${application.id} status changed to ${status}`);

    res.json(updated);
  })
);

router.post(
  "/:id/background-check/initiate",
  asyncHandler(async (req, res) => {
    const application = await storage.applications.getById(req.params.id);
    if (!application) {
      res.status(404).json({ message: "Application not found" });
      return;
    }

    const applicantData = {
      applicationId: application.id,
      userId: application.userId,
      ...(typeof application.formData === "object" && application.formData !== null ? application.formData as Record<string, unknown> : {}),
    };

    const check = await initiateBackgroundCheck(
      application.id,
      applicantData,
      req.body.vendorName,
    );

    if (!check) {
      res.status(500).json({ message: "Failed to initiate background check" });
      return;
    }

    await storage.applications.addTimelineEntry({
      applicationId: application.id,
      action: "background_check_initiated",
      fromStatus: application.status,
      toStatus: application.status,
      note: `Background check initiated${req.body.vendorName ? ` via ${req.body.vendorName}` : ""}`,
      performedBy: req.user!.id,
    });

    res.status(201).json(check);
  })
);

router.post(
  "/:id/background-check/sync",
  asyncHandler(async (req, res) => {
    const check = await syncBackgroundCheckStatus(req.params.id);
    if (!check) {
      res.status(404).json({ message: "Background check not found" });
      return;
    }
    res.json(check);
  })
);

router.post(
  "/:id/background-check/resend",
  asyncHandler(async (req, res) => {
    const success = await resendBackgroundCheckInvite(req.params.id);
    if (!success) {
      res.status(400).json({ message: "Unable to resend invite" });
      return;
    }

    await storage.applications.addTimelineEntry({
      applicationId: req.params.id,
      action: "background_check_invite_resent",
      note: "Background check invite resent",
      performedBy: req.user!.id,
    });

    res.json({ success: true });
  })
);

router.patch(
  "/:id/background-check",
  asyncHandler(async (req, res) => {
    const { status, notes, result, adminStatusDetails, vendorExternalId, reportUrl } = req.body;

    if (status && !BACKGROUND_CHECK_STATUSES.includes(status)) {
      res.status(400).json({ message: "Invalid background check status", validStatuses: BACKGROUND_CHECK_STATUSES });
      return;
    }

    if (reportUrl && typeof reportUrl === "string" && !reportUrl.startsWith("https://")) {
      res.status(400).json({ message: "Report URL must use HTTPS" });
      return;
    }

    if (notes && typeof notes === "string" && notes.length > 2000) {
      res.status(400).json({ message: "Notes must be 2000 characters or fewer" });
      return;
    }

    if (adminStatusDetails && typeof adminStatusDetails === "string" && adminStatusDetails.length > 500) {
      res.status(400).json({ message: "Admin status details must be 500 characters or fewer" });
      return;
    }

    const updated = await adminUpdateBackgroundCheck(req.params.id, {
      status: status as BackgroundCheckStatus,
      notes,
      result,
      adminStatusDetails,
      vendorExternalId,
      reportUrl,
    });

    if (!updated) {
      res.status(404).json({ message: "Background check not found" });
      return;
    }

    await storage.applications.addTimelineEntry({
      applicationId: req.params.id,
      action: "background_check_updated",
      note: `Background check ${status ? `status changed to ${status}` : "updated"}${notes ? ` — ${notes}` : ""}`,
      performedBy: req.user!.id,
    });

    res.json(updated);
  })
);

router.post(
  "/:id/references/:refId/resend",
  asyncHandler(async (req, res) => {
    const application = await storage.applications.getById(req.params.id);
    if (!application) {
      res.status(404).json({ message: "Application not found" });
      return;
    }

    const refs = await storage.applications.getReferences(req.params.id);
    const ref = refs.find((r: any) => r.id === req.params.refId);
    if (!ref) {
      res.status(404).json({ message: "Reference not found" });
      return;
    }

    if (ref.status === "completed") {
      res.status(400).json({ message: "Reference already completed" });
      return;
    }

    const baseUrl = `${req.protocol}://${req.get("host")}`;
    const token = ref.secureToken;
    if (!token) {
      res.status(400).json({ message: "Reference has no secure token" });
      return;
    }

    const applicantName = ref.applicantNameSnapshot || "Applicant";
    const referenceUrl = `${baseUrl}/reference/${token}`;
    const sent = await sendReferenceRequestEmail(
      ref.refereeEmail,
      ref.refereeName,
      applicantName,
      referenceUrl
    );

    if (sent) {
      await storage.applications.updateReference(ref.id, {
        emailSentAt: new Date(),
        status: ref.status === "draft" ? "email_sent" : ref.status,
      });

      await storage.applications.addTimelineEntry({
        applicationId: application.id,
        action: "reference_email_resent",
        note: `Reference email resent to ${ref.refereeName} (${ref.refereeEmail})`,
        performedBy: req.user!.id,
      });

      res.json({ success: true });
    } else {
      res.status(500).json({ message: "Failed to send email" });
    }
  })
);

router.post(
  "/:id/interview",
  asyncHandler(async (req, res) => {
    const application = await storage.applications.getById(req.params.id);
    if (!application) {
      res.status(404).json({ message: "Application not found" });
      return;
    }

    const interview = await storage.applications.addInterview({
      applicationId: application.id,
      scheduledAt: req.body.scheduledAt ? new Date(req.body.scheduledAt) : undefined,
      interviewerUserId: req.body.interviewerUserId,
      format: req.body.format,
      meetingUrl: req.body.meetingUrl,
    });

    await storage.applications.update(application.id, {
      interviewStatus: "in_progress",
      status: "interview_scheduled",
    });

    await storage.applications.addTimelineEntry({
      applicationId: application.id,
      action: "interview_scheduled",
      fromStatus: application.status,
      toStatus: "interview_scheduled",
      performedBy: req.user!.id,
    });

    res.status(201).json(interview);
  })
);

router.patch(
  "/:id/interview",
  asyncHandler(async (req, res) => {
    const interview = await storage.applications.getInterview(req.params.id);
    if (!interview) {
      res.status(404).json({ message: "Interview not found" });
      return;
    }

    const updated = await storage.applications.updateInterview(interview.id, {
      completedAt: req.body.outcome ? new Date() : undefined,
      notes: req.body.notes,
      outcome: req.body.outcome,
    });

    if (req.body.outcome) {
      await storage.applications.update(req.params.id, {
        interviewStatus: "completed",
        status: "interview_completed",
      });

      await storage.applications.addTimelineEntry({
        applicationId: req.params.id,
        action: "interview_completed",
        toStatus: "interview_completed",
        note: `Outcome: ${req.body.outcome}`,
        performedBy: req.user!.id,
      });
    }

    res.json(updated);
  })
);

router.post(
  "/:id/timeline",
  asyncHandler(async (req, res) => {
    const application = await storage.applications.getById(req.params.id);
    if (!application) {
      res.status(404).json({ message: "Application not found" });
      return;
    }

    const entry = await storage.applications.addTimelineEntry({
      applicationId: application.id,
      action: "admin_note",
      note: req.body.note,
      performedBy: req.user!.id,
    });

    res.status(201).json(entry);
  })
);

export default router;

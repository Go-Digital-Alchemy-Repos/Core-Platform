import { Router } from "express";
import { storage } from "../../storage/index";
import { asyncHandler } from "../../middleware/error-handler";
import { APPLICATION_STATUS } from "@shared/types";

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
  "/:id/background-check",
  asyncHandler(async (req, res) => {
    const application = await storage.applications.getById(req.params.id);
    if (!application) {
      res.status(404).json({ message: "Application not found" });
      return;
    }

    const check = await storage.applications.addBackgroundCheck({
      applicationId: application.id,
      provider: req.body.provider,
      externalId: req.body.externalId,
    });

    await storage.applications.update(application.id, {
      backgroundCheckStatus: "in_progress",
      status: "background_check_in_progress",
    });

    await storage.applications.addTimelineEntry({
      applicationId: application.id,
      action: "background_check_initiated",
      fromStatus: application.status,
      toStatus: "background_check_in_progress",
      performedBy: req.user!.id,
    });

    res.status(201).json(check);
  })
);

router.patch(
  "/:id/background-check",
  asyncHandler(async (req, res) => {
    const bgCheck = await storage.applications.getBackgroundCheck(req.params.id);
    if (!bgCheck) {
      res.status(404).json({ message: "Background check not found" });
      return;
    }

    const updated = await storage.applications.updateBackgroundCheck(bgCheck.id, {
      status: req.body.status,
      result: req.body.result,
      completedAt: req.body.status === "completed" ? new Date() : undefined,
      reportUrl: req.body.reportUrl,
    });

    if (req.body.status === "completed") {
      await storage.applications.update(req.params.id, {
        backgroundCheckStatus: "completed",
      });
    }

    res.json(updated);
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

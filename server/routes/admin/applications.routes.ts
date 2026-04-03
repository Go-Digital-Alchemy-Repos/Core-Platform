import { Router } from "express";
import { storage } from "../../storage/index";
import { asyncHandler } from "../../middleware/error-handler";
import {
  getFullApplication,
  transitionStatus,
  scheduleInterview,
  updateInterview,
  resendReferenceEmail,
  addTimelineNote,
} from "../../services/application.service";
import {
  initiateBackgroundCheck,
  syncBackgroundCheckStatus,
  resendBackgroundCheckInvite,
  adminUpdateBackgroundCheck,
  BACKGROUND_CHECK_STATUSES,
  type BackgroundCheckStatus,
} from "../../services/background-check.service";

function paramStr(val: string | string[] | undefined): string {
  return Array.isArray(val) ? val[0] : (val ?? "");
}

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
    const application = await storage.applications.getById(paramStr(req.params.id));
    if (!application) {
      res.status(404).json({ message: "Application not found" });
      return;
    }

    const { timeline, credentials, references, backgroundCheck, interview, decision } =
      await getFullApplication(application.id);

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
    const result = await transitionStatus(paramStr(req.params.id), status, note, req.user!.id);

    if (!result.success) {
      res.status(result.statusCode || 400).json({
        message: result.error,
        ...(result.allowedTransitions && { allowedTransitions: result.allowedTransitions }),
      });
      return;
    }

    res.json(result.application);
  })
);

router.post(
  "/:id/background-check/initiate",
  asyncHandler(async (req, res) => {
    const application = await storage.applications.getById(paramStr(req.params.id));
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
    const check = await syncBackgroundCheckStatus(paramStr(req.params.id));
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
    const success = await resendBackgroundCheckInvite(paramStr(req.params.id));
    if (!success) {
      res.status(400).json({ message: "Unable to resend invite" });
      return;
    }

    await storage.applications.addTimelineEntry({
      applicationId: paramStr(req.params.id),
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

    const updated = await adminUpdateBackgroundCheck(paramStr(req.params.id), {
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
      applicationId: paramStr(req.params.id),
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
    const baseUrl = `${req.protocol}://${req.get("host")}`;
    const result = await resendReferenceEmail(
      paramStr(req.params.id),
      paramStr(req.params.refId),
      baseUrl,
      req.user!.id,
    );

    if (!result.success) {
      res.status(result.status).json({ message: result.error });
      return;
    }

    res.json({ success: true });
  })
);

router.post(
  "/:id/interview",
  asyncHandler(async (req, res) => {
    const result = await scheduleInterview(
      paramStr(req.params.id),
      req.body,
      req.user!.id,
    );

    if (!result.success) {
      res.status(result.status).json({
        message: result.error,
        ...("allowedTransitions" in result && { allowedTransitions: result.allowedTransitions }),
      });
      return;
    }

    res.status(201).json(result.interview);
  })
);

router.patch(
  "/:id/interview",
  asyncHandler(async (req, res) => {
    const result = await updateInterview(
      paramStr(req.params.id),
      req.body,
      req.user!.id,
    );

    if (!result.success) {
      res.status(result.status).json({
        message: result.error,
        ...("allowedTransitions" in result && { allowedTransitions: result.allowedTransitions }),
      });
      return;
    }

    res.json(result.interview);
  })
);

router.post(
  "/:id/timeline",
  asyncHandler(async (req, res) => {
    const result = await addTimelineNote(paramStr(req.params.id), req.body.note, req.user!.id);

    if (!result.success) {
      res.status(result.status).json({ message: result.error });
      return;
    }

    res.status(201).json(result.entry);
  })
);

export default router;

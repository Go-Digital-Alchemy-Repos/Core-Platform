import { Router } from "express";
import { storage } from "../storage/index";
import { authenticateToken, requireRole } from "../middleware/auth";
import { asyncHandler } from "../middleware/error-handler";

const router = Router();

router.use(authenticateToken);
router.use(requireRole("therapist"));

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const application = await storage.applications.getByUserId(req.user!.id);
    if (!application) {
      res.json(null);
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

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const existing = await storage.applications.getByUserId(req.user!.id);
    if (existing && !["denied", "withdrawn"].includes(existing.status)) {
      res.status(400).json({ message: "You already have an active application" });
      return;
    }

    const application = await storage.applications.create({
      userId: req.user!.id,
      status: "draft",
    });

    await storage.applications.addTimelineEntry({
      applicationId: application.id,
      action: "application_created",
      toStatus: "draft",
      performedBy: req.user!.id,
    });

    res.status(201).json(application);
  })
);

router.post(
  "/submit",
  asyncHandler(async (req, res) => {
    const application = await storage.applications.getByUserId(req.user!.id);
    if (!application) {
      res.status(404).json({ message: "Application not found" });
      return;
    }

    if (application.status !== "draft") {
      res.status(400).json({ message: "Application has already been submitted" });
      return;
    }

    const credentials = await storage.applications.getCredentials(application.id);
    if (credentials.length === 0) {
      res.status(400).json({ message: "At least one credential is required before submitting" });
      return;
    }

    const references = await storage.applications.getReferences(application.id);
    if (references.length < 2) {
      res.status(400).json({ message: "At least two professional references are required before submitting" });
      return;
    }

    const updated = await storage.applications.update(application.id, {
      status: "submitted",
      submittedAt: new Date(),
    });

    await storage.applications.addTimelineEntry({
      applicationId: application.id,
      action: "application_submitted",
      fromStatus: "draft",
      toStatus: "submitted",
      performedBy: req.user!.id,
    });

    await storage.activity.log(req.user!.id, "application_submitted", "Provider application submitted");

    res.json(updated);
  })
);

router.post(
  "/withdraw",
  asyncHandler(async (req, res) => {
    const application = await storage.applications.getByUserId(req.user!.id);
    if (!application) {
      res.status(404).json({ message: "Application not found" });
      return;
    }

    if (["active_member", "denied", "withdrawn"].includes(application.status)) {
      res.status(400).json({ message: "Cannot withdraw this application" });
      return;
    }

    const updated = await storage.applications.update(application.id, {
      status: "withdrawn",
    });

    await storage.applications.addTimelineEntry({
      applicationId: application.id,
      action: "application_withdrawn",
      fromStatus: application.status,
      toStatus: "withdrawn",
      performedBy: req.user!.id,
    });

    res.json(updated);
  })
);

router.post(
  "/credentials",
  asyncHandler(async (req, res) => {
    const application = await storage.applications.getByUserId(req.user!.id);
    if (!application) {
      res.status(404).json({ message: "Application not found" });
      return;
    }

    const { credentialType, issuer, licenseNumber, stateOrCountry, issuedAt, expiresAt, documentUrl } = req.body;

    if (!credentialType) {
      res.status(400).json({ message: "Credential type is required" });
      return;
    }

    const credential = await storage.applications.addCredential({
      applicationId: application.id,
      credentialType,
      issuer,
      licenseNumber,
      stateOrCountry,
      issuedAt: issuedAt ? new Date(issuedAt) : undefined,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      documentUrl,
    });

    res.status(201).json(credential);
  })
);

router.post(
  "/references",
  asyncHandler(async (req, res) => {
    const application = await storage.applications.getByUserId(req.user!.id);
    if (!application) {
      res.status(404).json({ message: "Application not found" });
      return;
    }

    const { refereeName, refereeEmail, refereePhone, relationship } = req.body;

    if (!refereeName || !refereeEmail) {
      res.status(400).json({ message: "Referee name and email are required" });
      return;
    }

    const reference = await storage.applications.addReference({
      applicationId: application.id,
      refereeName,
      refereeEmail,
      refereePhone,
      relationship,
    });

    res.status(201).json(reference);
  })
);

export default router;

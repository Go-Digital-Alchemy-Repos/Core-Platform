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

router.patch(
  "/autosave",
  asyncHandler(async (req, res) => {
    const application = await storage.applications.getByUserId(req.user!.id);
    if (!application) {
      res.status(404).json({ message: "Application not found" });
      return;
    }

    if (application.status !== "draft") {
      res.status(400).json({ message: "Cannot edit a submitted application" });
      return;
    }

    const { formData, currentStep } = req.body;
    const updateData: Record<string, unknown> = {};
    if (formData !== undefined && typeof formData === "object" && formData !== null) {
      updateData.formData = formData;
    }
    if (currentStep !== undefined && typeof currentStep === "number" && currentStep >= 0 && currentStep <= 6) {
      updateData.currentStep = currentStep;
    }

    if (Object.keys(updateData).length === 0) {
      res.status(400).json({ message: "No valid fields to update" });
      return;
    }

    const updated = await storage.applications.update(application.id, updateData as any);
    res.json(updated);
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
    if (references.length < 3) {
      res.status(400).json({ message: "Exactly three professional references are required before submitting" });
      return;
    }

    const formData = (application as any).formData as Record<string, any> || {};
    if (!formData.termsAccepted || !formData.termsSignature) {
      res.status(400).json({ message: "Terms and conditions must be accepted and signed" });
      return;
    }

    if (!formData.readyAcknowledgment) {
      res.status(400).json({ message: "You must acknowledge you have reviewed the pre-application information" });
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

    if (application.status !== "draft") {
      res.status(400).json({ message: "Cannot modify a submitted application" });
      return;
    }

    const { credentialType, issuer, licenseNumber, stateOrCountry, middleName, verificationUrl, issuedAt, expiresAt, documentUrl } = req.body;

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
      middleName,
      verificationUrl,
      issuedAt: issuedAt ? new Date(issuedAt) : undefined,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      documentUrl,
    });

    res.status(201).json(credential);
  })
);

router.delete(
  "/credentials/:credentialId",
  asyncHandler(async (req, res) => {
    const application = await storage.applications.getByUserId(req.user!.id);
    if (!application) {
      res.status(404).json({ message: "Application not found" });
      return;
    }

    if (application.status !== "draft") {
      res.status(400).json({ message: "Cannot modify a submitted application" });
      return;
    }

    await storage.applications.deleteCredential(req.params.credentialId, application.id);
    res.json({ success: true });
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

    if (application.status !== "draft") {
      res.status(400).json({ message: "Cannot modify a submitted application" });
      return;
    }

    const { refereeName, refereeEmail, refereePhone, relationship } = req.body;

    if (!refereeName || !refereeEmail) {
      res.status(400).json({ message: "Referee name and email are required" });
      return;
    }

    const existingRefs = await storage.applications.getReferences(application.id);
    if (existingRefs.length >= 3) {
      res.status(400).json({ message: "Maximum of 3 references allowed" });
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

router.delete(
  "/references/:referenceId",
  asyncHandler(async (req, res) => {
    const application = await storage.applications.getByUserId(req.user!.id);
    if (!application) {
      res.status(404).json({ message: "Application not found" });
      return;
    }

    if (application.status !== "draft") {
      res.status(400).json({ message: "Cannot modify a submitted application" });
      return;
    }

    await storage.applications.deleteReference(req.params.referenceId, application.id);
    res.json({ success: true });
  })
);

export default router;

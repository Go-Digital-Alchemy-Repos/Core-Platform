import { Router } from "express";
import { storage } from "../storage/index";
import { authenticateToken, requireRole } from "../middleware/auth";
import { asyncHandler } from "../middleware/error-handler";
import {
  getFullApplication,
  sanitizeReferencesForApplicant,
  sanitizeBackgroundCheckForApplicant,
  createApplication,
  autosaveApplication,
  createPaymentSession,
  confirmPayment,
  submitApplication,
  withdrawApplication,
  ServiceError,
} from "../services/application.service";

function paramStr(val: string | string[] | undefined): string {
  return Array.isArray(val) ? val[0] : (val ?? "");
}

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

    const { timeline, credentials, references, backgroundCheck, interview, decision } =
      await getFullApplication(application.id);

    res.json({
      ...application,
      timeline,
      credentials,
      references: sanitizeReferencesForApplicant(references),
      backgroundCheck: sanitizeBackgroundCheckForApplicant(backgroundCheck),
      interview,
      decision,
    });
  })
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const result = await createApplication(req.user!.id);
    if (!result.success) {
      res.status(400).json({ message: result.error });
      return;
    }
    res.status(201).json(result.application);
  })
);

router.patch(
  "/autosave",
  asyncHandler(async (req, res) => {
    const { formData, currentStep } = req.body;
    const result = await autosaveApplication(req.user!.id, formData, currentStep);
    if (!result.success) {
      res.status(result.status!).json({ message: result.error });
      return;
    }
    res.json(result.application);
  })
);

router.post(
  "/create-payment-session",
  asyncHandler(async (req, res) => {
    const result = await createPaymentSession(req.user!.id, req.user!.email, req.hostname);
    if ("error" in result && result.error) {
      res.status((result as { status: number }).status).json({ message: result.error });
      return;
    }
    res.json({ url: result.url });
  })
);

router.post(
  "/confirm-payment",
  asyncHandler(async (req, res) => {
    try {
      const result = await confirmPayment(req.user!.id);
      res.json(result);
    } catch (err) {
      if (err instanceof ServiceError) {
        res.status(err.statusCode).json({ message: err.message });
        return;
      }
      throw err;
    }
  })
);

router.post(
  "/submit",
  asyncHandler(async (req, res) => {
    const result = await submitApplication(req.user!.id);
    if (!result.success) {
      res.status(result.statusCode || 400).json({ message: result.error });
      return;
    }
    res.json(result.application);
  })
);

router.post(
  "/withdraw",
  asyncHandler(async (req, res) => {
    const result = await withdrawApplication(req.user!.id);
    if (!result.success) {
      res.status(result.status).json({ message: result.error });
      return;
    }
    res.json(result.application);
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

    await storage.applications.deleteCredential(paramStr(req.params.credentialId), application.id);
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

    await storage.applications.deleteReference(paramStr(req.params.referenceId), application.id);
    res.json({ success: true });
  })
);

export default router;

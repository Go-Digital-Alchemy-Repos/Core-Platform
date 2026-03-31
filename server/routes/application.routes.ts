import { Router } from "express";
import { storage } from "../storage/index";
import { authenticateToken, requireRole } from "../middleware/auth";
import { asyncHandler } from "../middleware/error-handler";
import { getUncachableStripeClient } from "../config/stripe";
import { logger } from "../utils/logger";

const APPLICATION_FEE_CENTS = 15000;
const REFUND_ELIGIBLE_CENTS = 10000;

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
  "/create-payment-session",
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

    if (application.paymentStatus === "paid") {
      res.status(400).json({ message: "Application fee has already been paid" });
      return;
    }

    const credentials = await storage.applications.getCredentials(application.id);
    if (credentials.length === 0) {
      res.status(400).json({ message: "At least one credential is required" });
      return;
    }

    const references = await storage.applications.getReferences(application.id);
    if (references.length < 3) {
      res.status(400).json({ message: "Three professional references are required" });
      return;
    }

    const formData = (application as any).formData as Record<string, any> || {};
    if (!formData.termsAccepted || !formData.termsSignature) {
      res.status(400).json({ message: "Terms and conditions must be accepted and signed" });
      return;
    }

    if (application.stripeCheckoutSessionId) {
      try {
        const stripe = await getUncachableStripeClient();
        const existingSession = await stripe.checkout.sessions.retrieve(application.stripeCheckoutSessionId);
        if (existingSession.status === "open") {
          res.json({ url: existingSession.url });
          return;
        }
      } catch (err) {
        logger.stripe.warn("Previous checkout session not found, creating new one");
      }
    }

    const stripe = await getUncachableStripeClient();
    const user = req.user!;
    const host = process.env.APP_URL || `https://${process.env.REPLIT_DOMAINS?.split(",")[0] || req.hostname}`;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: "TCK Wellness — Counselor Application Fee",
              description: "$50 non-refundable processing fee + $100 refundable deposit",
            },
            unit_amount: APPLICATION_FEE_CENTS,
          },
          quantity: 1,
        },
      ],
      success_url: `${host}/therapist/apply?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${host}/therapist/apply?payment=canceled`,
      metadata: {
        applicationId: application.id,
        userId: user.id,
        type: "application_fee",
      },
      customer_email: user.email,
    });

    await storage.applications.update(application.id, {
      stripeCheckoutSessionId: session.id,
      paymentStatus: "pending",
    } as any);

    await storage.applications.addTimelineEntry({
      applicationId: application.id,
      action: "payment_initiated",
      note: "Application fee payment initiated via Stripe",
      performedBy: req.user!.id,
    });

    res.json({ url: session.url });
  })
);

router.post(
  "/confirm-payment",
  asyncHandler(async (req, res) => {
    const application = await storage.applications.getByUserId(req.user!.id);
    if (!application) {
      res.status(404).json({ message: "Application not found" });
      return;
    }

    if (application.paymentStatus === "paid") {
      res.json({ paid: true, application });
      return;
    }

    if (!application.stripeCheckoutSessionId) {
      res.status(400).json({ message: "No payment session found" });
      return;
    }

    try {
      const stripe = await getUncachableStripeClient();
      const session = await stripe.checkout.sessions.retrieve(application.stripeCheckoutSessionId);

      if (session.payment_status === "paid") {
        const updated = await storage.applications.update(application.id, {
          paymentStatus: "paid",
          paidAt: new Date(),
          amountPaid: APPLICATION_FEE_CENTS,
          refundEligibleAmount: REFUND_ELIGIBLE_CENTS,
          stripePaymentIntentId: session.payment_intent as string,
        } as any);

        await storage.applications.addTimelineEntry({
          applicationId: application.id,
          action: "payment_completed",
          note: `Application fee of $${(APPLICATION_FEE_CENTS / 100).toFixed(2)} paid`,
          performedBy: req.user!.id,
        });

        res.json({ paid: true, application: updated });
        return;
      }
    } catch (err) {
      logger.stripe.error("Error confirming application payment", err);
    }

    res.json({ paid: false });
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

    if (application.paymentStatus !== "paid") {
      res.status(400).json({ message: "Application fee must be paid before submitting" });
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

    const snapshot = {
      formData,
      credentials: credentials.map(c => ({
        credentialType: c.credentialType,
        issuer: c.issuer,
        licenseNumber: c.licenseNumber,
        stateOrCountry: c.stateOrCountry,
        middleName: c.middleName,
        verificationUrl: c.verificationUrl,
      })),
      references: references.map(r => ({
        refereeName: r.refereeName,
        refereeEmail: r.refereeEmail,
        relationship: r.relationship,
      })),
      submittedAt: new Date().toISOString(),
    };

    const updated = await storage.applications.update(application.id, {
      status: "submitted",
      submittedAt: new Date(),
      submittedSnapshot: snapshot,
    } as any);

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

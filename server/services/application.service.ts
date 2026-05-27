import { storage } from "../storage/index";
import { logger } from "../utils/logger";
import { getUncachableStripeClient } from "../config/stripe";
import { sendReferenceRequestEmail } from "./email.service";
import { createBackgroundCheckRecord } from "./background-check.service";
import { syncSystemFormToMailchimp } from "./forms.service";
import { DEFAULT_DIRECTORY_SETTINGS, getDirectorySettings } from "./directory-settings.service";
import {
  APPLICATION_STATUS,
  type ApplicationStatus,
  type StatusTransitionResult,
  type SubmitApplicationResult,
  type PaymentConfirmationResult,
} from "@shared/types";
import type {
  ProviderApplication,
  ProviderApplicationReference,
  ProviderApplicationCredential,
  ProviderBackgroundCheck,
} from "@shared/schema";

export const APPLICATION_FEE_CENTS = DEFAULT_DIRECTORY_SETTINGS.applicationFeeAmountCents;
export const REFUND_ELIGIBLE_CENTS = DEFAULT_DIRECTORY_SETTINGS.applicationFeeCreditAmountCents;
export const RESEND_COOLDOWN_MS = 5 * 60 * 1000;

export type { StatusTransitionResult, SubmitApplicationResult, PaymentConfirmationResult };

export const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  draft: ["submitted", "withdrawn"],
  submitted: ["awaiting_background_check", "background_check_in_progress", "awaiting_references", "references_in_progress", "ready_for_interview", "denied", "withdrawn"],
  awaiting_background_check: ["background_check_in_progress", "awaiting_references", "references_in_progress", "ready_for_interview", "denied", "withdrawn"],
  background_check_in_progress: ["awaiting_references", "references_in_progress", "ready_for_interview", "denied", "withdrawn"],
  awaiting_references: ["references_in_progress", "ready_for_interview", "denied", "withdrawn"],
  references_in_progress: ["ready_for_interview", "denied", "withdrawn"],
  ready_for_interview: ["interview_scheduled", "approved_pending_subscription", "denied", "withdrawn"],
  interview_scheduled: ["interview_completed", "approved_pending_subscription", "denied", "withdrawn"],
  interview_completed: ["approved_pending_subscription", "denied", "withdrawn"],
  approved_pending_subscription: ["active_member", "denied", "withdrawn"],
  active_member: [],
  denied: [],
  withdrawn: [],
};

export function isValidTransition(fromStatus: string, toStatus: string): { valid: boolean; allowedTransitions?: string[] } {
  const allowed = ALLOWED_TRANSITIONS[fromStatus];
  if (!allowed) {
    return { valid: false, allowedTransitions: [] };
  }
  if (!allowed.includes(toStatus)) {
    return { valid: false, allowedTransitions: allowed };
  }
  return { valid: true };
}

export function isValidApplicationStatus(status: string): boolean {
  return APPLICATION_STATUS.includes(status as ApplicationStatus);
}

export async function getFullApplication(applicationId: string) {
  const [timeline, credentials, references, backgroundCheck, interview, decision] = await Promise.all([
    storage.applications.getTimeline(applicationId),
    storage.applications.getCredentials(applicationId),
    storage.applications.getReferences(applicationId),
    storage.applications.getBackgroundCheck(applicationId),
    storage.applications.getInterview(applicationId),
    storage.applications.getDecision(applicationId),
  ]);
  return { timeline, credentials, references, backgroundCheck, interview, decision };
}

export function sanitizeReferencesForApplicant(references: ProviderApplicationReference[]) {
  return references.map((r) => ({
    id: r.id,
    refereeName: r.refereeName,
    refereeEmail: r.refereeEmail,
    refereePhone: r.refereePhone,
    relationship: r.relationship,
    status: r.status,
    emailSentAt: r.emailSentAt,
    createdAt: r.createdAt,
  }));
}

export function sanitizeBackgroundCheckForApplicant(backgroundCheck: ProviderBackgroundCheck | null | undefined) {
  if (!backgroundCheck) return null;
  return {
    id: backgroundCheck.id,
    status: backgroundCheck.status,
    providerFacingLabel: backgroundCheck.providerFacingLabel,
    requestedAt: backgroundCheck.requestedAt,
    completedAt: backgroundCheck.completedAt,
    createdAt: backgroundCheck.createdAt,
  };
}

export async function createApplication(userId: string) {
  const existing = await storage.applications.getByUserId(userId);
  if (existing && !["denied", "withdrawn"].includes(existing.status)) {
    return { success: false, error: "You already have an active application" } as const;
  }

  const application = await storage.applications.create({
    userId,
    status: "draft",
  });

  await storage.applications.addTimelineEntry({
    applicationId: application.id,
    action: "application_created",
    toStatus: "draft",
    performedBy: userId,
  });

  const user = await storage.users.getUser(userId);
  if (user?.email) {
    syncSystemFormToMailchimp("directory-application-start", {
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
    }).catch((err) => {
      logger.email.warn("Failed to sync directory application start to Mailchimp", {
        userId,
        error: err instanceof Error ? err.message : String(err),
      });
    });
  }

  return { success: true, application } as const;
}

export async function autosaveApplication(userId: string, formData: unknown, currentStep: unknown) {
  const application = await storage.applications.getByUserId(userId);
  if (!application) {
    return { success: false, error: "Application not found", status: 404 } as const;
  }

  if (application.status !== "draft") {
    return { success: false, error: "Cannot edit a submitted application", status: 400 } as const;
  }

  const updateData: Record<string, unknown> = {};
  if (formData !== undefined && typeof formData === "object" && formData !== null) {
    updateData.formData = formData;
  }
  if (currentStep !== undefined && typeof currentStep === "number" && currentStep >= 0 && currentStep <= 8) {
    updateData.currentStep = currentStep;
  }

  if (Object.keys(updateData).length === 0) {
    return { success: false, error: "No valid fields to update", status: 400 } as const;
  }

  const updated = await storage.applications.update(application.id, updateData as any);
  return { success: true, application: updated } as const;
}

export async function createPaymentSession(userId: string, userEmail: string, hostname: string) {
  const application = await storage.applications.getByUserId(userId);
  if (!application) {
    return { error: "Application not found", status: 404 } as const;
  }

  if (application.status !== "draft") {
    return { error: "Application has already been submitted", status: 400 } as const;
  }

  if (application.paymentStatus === "paid") {
    return { error: "Application fee has already been paid", status: 400 } as const;
  }

  if (application.stripeCheckoutSessionId) {
    try {
      const stripe = await getUncachableStripeClient();
      const existingSession = await stripe.checkout.sessions.retrieve(application.stripeCheckoutSessionId);
      if (existingSession.status === "open") {
        return { url: existingSession.url } as const;
      }
    } catch (err) {
      logger.stripe.warn("Previous checkout session not found, creating new one");
    }
  }

  const stripe = await getUncachableStripeClient();
  const directorySettings = await getDirectorySettings();
  const host = process.env.APP_URL || `https://${process.env.REPLIT_DOMAINS?.split(",")[0] || hostname}`;

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: "Core Platform — Counselor Application Fee",
            description: directorySettings.applicationFeePolicySummary,
          },
          unit_amount: directorySettings.applicationFeeAmountCents,
        },
        quantity: 1,
      },
    ],
    success_url: `${host}/therapist/apply?payment=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${host}/therapist/apply?payment=canceled`,
    metadata: {
      applicationId: application.id,
      userId,
      type: "application_fee",
    },
    customer_email: userEmail,
  });

  await storage.applications.update(application.id, {
    stripeCheckoutSessionId: session.id,
    paymentStatus: "pending",
  } as any);

  await storage.applications.addTimelineEntry({
    applicationId: application.id,
    action: "payment_initiated",
    note: "Application fee payment initiated via Stripe",
    performedBy: userId,
  });

  return { url: session.url } as const;
}

export async function confirmPayment(userId: string): Promise<PaymentConfirmationResult> {
  const application = await storage.applications.getByUserId(userId);
  if (!application) {
    throw new ServiceError("Application not found", 404);
  }

  if (application.paymentStatus === "paid") {
    return { paid: true, application };
  }

  if (!application.stripeCheckoutSessionId) {
    throw new ServiceError("No payment session found", 400);
  }

  try {
    const directorySettings = await getDirectorySettings();
    const stripe = await getUncachableStripeClient();
    const session = await stripe.checkout.sessions.retrieve(application.stripeCheckoutSessionId);

    if (session.payment_status === "paid") {
      const updated = await storage.applications.update(application.id, {
        paymentStatus: "paid",
        paidAt: new Date(),
        amountPaid: directorySettings.applicationFeeAmountCents,
        refundEligibleAmount: directorySettings.applicationFeeCreditOnApproval
          ? directorySettings.applicationFeeCreditAmountCents
          : 0,
        stripePaymentIntentId: session.payment_intent as string,
      } as any);

      await storage.applications.addTimelineEntry({
        applicationId: application.id,
        action: "payment_completed",
        note: `Application fee of $${(directorySettings.applicationFeeAmountCents / 100).toFixed(2)} paid`,
        performedBy: userId,
      });

      return { paid: true, application: updated };
    }
  } catch (err) {
    logger.stripe.error("Error confirming application payment", err);
  }

  return { paid: false };
}

export async function submitApplication(userId: string): Promise<SubmitApplicationResult> {
  const application = await storage.applications.getByUserId(userId);
  if (!application) {
    return { success: false, error: "Application not found", statusCode: 404 };
  }

  if (application.status !== "draft") {
    return { success: false, error: "Application has already been submitted", statusCode: 400 };
  }

  if (application.paymentStatus !== "paid") {
    return { success: false, error: "Application fee must be paid before submitting", statusCode: 400 };
  }

  const credentials = await storage.applications.getCredentials(application.id);
  if (credentials.length === 0) {
    return { success: false, error: "At least one credential is required before submitting", statusCode: 400 };
  }

  const references = await storage.applications.getReferences(application.id);
  if (references.length < 3) {
    return { success: false, error: "Exactly three professional references are required before submitting", statusCode: 400 };
  }

  const formData = (application.formData ?? {}) as Record<string, unknown>;
  if (!formData.termsAccepted || !formData.termsSignature) {
    return { success: false, error: "Terms and conditions must be accepted and signed", statusCode: 400 };
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
    performedBy: userId,
  });

  await storage.activity.log(userId, "application_submitted", "Provider application submitted");

  await dispatchReferenceEmails(application.id, references, formData, userId);

  try {
    await createBackgroundCheckRecord(application.id);
    await storage.applications.addTimelineEntry({
      applicationId: application.id,
      action: "background_check_record_created",
      note: "Background check record created — awaiting initiation",
      performedBy: userId,
    });
  } catch (err) {
    logger.app.error("Failed to create background check record on submit", err, { applicationId: application.id });
  }

  return { success: true, application: updated };
}

async function dispatchReferenceEmails(
  applicationId: string,
  references: ProviderApplicationReference[],
  formData: Record<string, unknown>,
  userId: string,
) {
  const applicantName = (formData.fullName as string) || "the applicant";
  const baseUrl = process.env.APP_URL || `https://${process.env.REPLIT_DOMAINS?.split(",")[0] || "localhost:5000"}`;

  for (const ref of references) {
    try {
      const token = ref.secureToken || (await import("crypto")).randomBytes(48).toString("hex");
      if (!ref.secureToken) {
        await storage.applications.updateReference(ref.id, {
          secureToken: token,
          applicantNameSnapshot: applicantName,
        });
      } else if (!ref.applicantNameSnapshot) {
        await storage.applications.updateReference(ref.id, {
          applicantNameSnapshot: applicantName,
        });
      }

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
          status: "email_sent",
        });
      }
    } catch (err) {
      logger.app.error("Failed to send reference request email", err, { referenceId: ref.id });
    }
  }

  await storage.applications.update(applicationId, {
    referencesStatus: "in_progress",
  } as any);

  await storage.applications.addTimelineEntry({
    applicationId,
    action: "references_requested",
    note: `Reference request emails sent to ${references.length} references`,
    performedBy: userId,
  });
}

export async function withdrawApplication(userId: string) {
  const application = await storage.applications.getByUserId(userId);
  if (!application) {
    return { success: false, error: "Application not found", status: 404 } as const;
  }

  if (["active_member", "denied", "withdrawn"].includes(application.status)) {
    return { success: false, error: "Cannot withdraw this application", status: 400 } as const;
  }

  const updated = await storage.applications.update(application.id, {
    status: "withdrawn",
  });

  await storage.applications.addTimelineEntry({
    applicationId: application.id,
    action: "application_withdrawn",
    fromStatus: application.status,
    toStatus: "withdrawn",
    performedBy: userId,
  });

  return { success: true, application: updated } as const;
}

export async function transitionStatus(
  applicationId: string,
  newStatus: string,
  note: string | undefined,
  performedBy: string,
): Promise<StatusTransitionResult> {
  if (!isValidApplicationStatus(newStatus)) {
    return { success: false, error: "Invalid application status", statusCode: 400 };
  }

  const application = await storage.applications.getById(applicationId);
  if (!application) {
    return { success: false, error: "Application not found", statusCode: 404 };
  }

  const transition = isValidTransition(application.status, newStatus);
  if (!transition.valid) {
    return {
      success: false,
      error: `Cannot transition from "${application.status}" to "${newStatus}"`,
      statusCode: 400,
      allowedTransitions: transition.allowedTransitions,
    };
  }

  const updateData: Record<string, unknown> = { status: newStatus };
  if (["approved_pending_subscription", "active_member", "denied"].includes(newStatus)) {
    updateData.decidedAt = new Date();
  }

  const updated = await storage.applications.update(application.id, updateData as any);

  await storage.applications.addTimelineEntry({
    applicationId: application.id,
    action: "status_changed",
    fromStatus: application.status,
    toStatus: newStatus,
    note,
    performedBy,
  });

  if (newStatus === "approved_pending_subscription") {
    await handleApproval(application, note, performedBy);
  }

  if (newStatus === "denied") {
    await handleDenial(application, note, performedBy);
  }

  await storage.activity.log(performedBy, "application_status_changed", `Application ${application.id} status changed to ${newStatus}`);

  return { success: true, application: updated };
}

async function handleApproval(application: ProviderApplication, note: string | undefined, decidedBy: string) {
  await storage.applications.addDecision({
    applicationId: application.id,
    decision: "approved",
    reason: note,
    decidedBy,
  });

  const profile = await storage.therapists.getProfileByUserId(application.userId);
  if (profile) {
    await storage.therapists.updateProfile(profile.id, { isApproved: true });
  }
}

async function handleDenial(application: ProviderApplication, note: string | undefined, decidedBy: string) {
  await storage.applications.addDecision({
    applicationId: application.id,
    decision: "denied",
    reason: note,
    decidedBy,
  });

  const deniedProfile = await storage.therapists.getProfileByUserId(application.userId);
  if (deniedProfile) {
    await storage.therapists.updateProfile(deniedProfile.id, { isApproved: false });
  }

  if (application.paymentStatus === "paid") {
    await storage.applications.addTimelineEntry({
      applicationId: application.id,
      action: "application_fee_retained",
      note: "Application fee remains non-refundable because the application was denied.",
      performedBy: decidedBy,
    });
  }
}

export async function scheduleInterview(
  applicationId: string,
  data: { scheduledAt?: string; interviewerUserId?: string; format?: string; meetingUrl?: string },
  performedBy: string,
) {
  const application = await storage.applications.getById(applicationId);
  if (!application) {
    return { success: false, error: "Application not found", status: 404 } as const;
  }

  const allowed = ALLOWED_TRANSITIONS[application.status];
  if (allowed && !allowed.includes("interview_scheduled")) {
    return {
      success: false,
      error: `Cannot schedule interview from "${application.status}"`,
      allowedTransitions: allowed,
      status: 400,
    } as const;
  }

  const interview = await storage.applications.addInterview({
    applicationId: application.id,
    scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : undefined,
    interviewerUserId: data.interviewerUserId,
    format: data.format,
    meetingUrl: data.meetingUrl,
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
    performedBy,
  });

  return { success: true, interview } as const;
}

export async function updateInterview(
  applicationId: string,
  data: { notes?: string; outcome?: string },
  performedBy: string,
) {
  const interview = await storage.applications.getInterview(applicationId);
  if (!interview) {
    return { success: false, error: "Interview not found", status: 404 } as const;
  }

  if (data.outcome) {
    const application = await storage.applications.getById(applicationId);
    if (!application) {
      return { success: false, error: "Application not found", status: 404 } as const;
    }

    const allowed = ALLOWED_TRANSITIONS[application.status];
    if (allowed && !allowed.includes("interview_completed")) {
      return {
        success: false,
        error: `Cannot complete interview from "${application.status}"`,
        allowedTransitions: allowed,
        status: 400,
      } as const;
    }
  }

  const updated = await storage.applications.updateInterview(interview.id, {
    completedAt: data.outcome ? new Date() : undefined,
    notes: data.notes,
    outcome: data.outcome,
  });

  if (data.outcome) {
    await storage.applications.update(applicationId, {
      interviewStatus: "completed",
      status: "interview_completed",
    });

    await storage.applications.addTimelineEntry({
      applicationId,
      action: "interview_completed",
      toStatus: "interview_completed",
      note: `Outcome: ${data.outcome}`,
      performedBy,
    });
  }

  return { success: true, interview: updated } as const;
}

export async function resendReferenceEmail(
  applicationId: string,
  referenceId: string,
  baseUrl: string,
  performedBy: string,
) {
  const application = await storage.applications.getById(applicationId);
  if (!application) {
    return { success: false, error: "Application not found", status: 404 } as const;
  }

  const refs = await storage.applications.getReferences(applicationId);
  const ref = refs.find((r) => r.id === referenceId);
  if (!ref) {
    return { success: false, error: "Reference not found", status: 404 } as const;
  }

  if (ref.status === "completed") {
    return { success: false, error: "Reference already completed", status: 400 } as const;
  }

  if (ref.emailSentAt) {
    const elapsed = Date.now() - new Date(ref.emailSentAt).getTime();
    if (elapsed < RESEND_COOLDOWN_MS) {
      const waitMinutes = Math.ceil((RESEND_COOLDOWN_MS - elapsed) / 60000);
      return { success: false, error: `Please wait ${waitMinutes} minute(s) before resending`, status: 429 } as const;
    }
  }

  const token = ref.secureToken;
  if (!token) {
    return { success: false, error: "Reference has no secure token", status: 400 } as const;
  }

  const applicantName = ref.applicantNameSnapshot || "Applicant";
  const referenceUrl = `${baseUrl}/reference/${token}`;
  const sent = await sendReferenceRequestEmail(
    ref.refereeEmail,
    ref.refereeName,
    applicantName,
    referenceUrl
  );

  if (!sent) {
    return { success: false, error: "Failed to send email", status: 500 } as const;
  }

  await storage.applications.updateReference(ref.id, {
    emailSentAt: new Date(),
    status: ref.status === "draft" ? "email_sent" : ref.status,
  });

  await storage.applications.addTimelineEntry({
    applicationId: application.id,
    action: "reference_email_resent",
    note: `Reference email resent to ${ref.refereeName} (${ref.refereeEmail})`,
    performedBy,
  });

  return { success: true } as const;
}

export async function addTimelineNote(
  applicationId: string,
  note: string,
  performedBy: string,
) {
  const application = await storage.applications.getById(applicationId);
  if (!application) {
    return { success: false, error: "Application not found", status: 404 } as const;
  }

  if (!note || typeof note !== "string" || !note.trim()) {
    return { success: false, error: "Note text is required", status: 400 } as const;
  }

  if (note.length > 2000) {
    return { success: false, error: "Note must be 2000 characters or fewer", status: 400 } as const;
  }

  const entry = await storage.applications.addTimelineEntry({
    applicationId: application.id,
    action: "admin_note",
    note: note.trim(),
    performedBy,
  });

  return { success: true, entry } as const;
}

export class ServiceError extends Error {
  constructor(
    message: string,
    public statusCode: number = 400,
  ) {
    super(message);
    this.name = "ServiceError";
  }
}

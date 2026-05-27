import { Router } from "express";
import { storage } from "../storage/index";
import { asyncHandler } from "../middleware/error-handler";
import { logger } from "../utils/logger";

const router = Router();

router.get(
  "/:token",
  asyncHandler(async (req, res) => {
    const { token } = req.params;
    if (!token || typeof token !== "string" || !/^[a-f0-9]{96}$/.test(token)) {
      res.status(400).json({ message: "Invalid reference link" });
      return;
    }

    const reference = await storage.applications.getByToken(token);
    if (!reference) {
      res.status(404).json({ message: "Reference link not found or expired" });
      return;
    }

    const allowedAppStatuses = ["submitted", "awaiting_background_check", "background_check_in_progress", "awaiting_references", "references_in_progress", "ready_for_interview", "interview_scheduled", "interview_completed"];
    if (reference.applicationStatus && !allowedAppStatuses.includes(reference.applicationStatus)) {
      res.status(410).json({ message: "This reference request is no longer active" });
      return;
    }

    if (reference.status === "completed") {
      res.json({
        alreadyCompleted: true,
        applicantName: reference.applicantNameSnapshot,
        refereeName: reference.refereeName,
      });
      return;
    }

    if (!reference.openedAt) {
      await storage.applications.updateReferenceByToken(token, {
        openedAt: new Date(),
        status: "opened",
      });
    }

    res.json({
      alreadyCompleted: false,
      applicantName: reference.applicantNameSnapshot,
      refereeName: reference.refereeName,
      relationship: reference.relationship,
    });
  })
);

router.post(
  "/:token",
  asyncHandler(async (req, res) => {
    const { token } = req.params;
    if (!token || typeof token !== "string" || !/^[a-f0-9]{96}$/.test(token)) {
      res.status(400).json({ message: "Invalid reference link" });
      return;
    }

    const reference = await storage.applications.getByToken(token);
    if (!reference) {
      res.status(404).json({ message: "Reference link not found or expired" });
      return;
    }

    const allowedAppStatuses = ["submitted", "awaiting_background_check", "background_check_in_progress", "awaiting_references", "references_in_progress", "ready_for_interview", "interview_scheduled", "interview_completed"];
    if (reference.applicationStatus && !allowedAppStatuses.includes(reference.applicationStatus)) {
      res.status(410).json({ message: "This reference request is no longer active" });
      return;
    }

    if (reference.status === "completed") {
      res.status(400).json({ message: "This reference has already been submitted" });
      return;
    }

    const {
      firstName,
      applicantName,
      howKnown,
      corePlatformObservation,
      corePlatformUnderstanding,
      culturalConnection,
      safetyConcern,
      safetyConcernDetails,
      professionalConcern,
      professionalConcernDetails,
      recommendation,
      recommendationComments,
    } = req.body;

    const MAX_TEXT_LENGTH = 5000;
    const errors: string[] = [];
    if (!firstName || typeof firstName !== "string" || !firstName.trim()) errors.push("Your first name is required");
    if (typeof firstName === "string" && firstName.length > 200) errors.push("First name is too long");
    if (!howKnown || typeof howKnown !== "string" || !howKnown.trim()) errors.push("How you know the applicant is required");
    if (typeof howKnown === "string" && howKnown.length > MAX_TEXT_LENGTH) errors.push("Response is too long (max 5000 characters)");
    if (!corePlatformObservation || typeof corePlatformObservation !== "string" || !corePlatformObservation.trim()) errors.push("Core Platform observation response is required");
    if (typeof corePlatformObservation === "string" && corePlatformObservation.length > MAX_TEXT_LENGTH) errors.push("Response is too long (max 5000 characters)");
    if (!corePlatformUnderstanding || typeof corePlatformUnderstanding !== "string" || !corePlatformUnderstanding.trim()) errors.push("Core Platform understanding response is required");
    if (typeof corePlatformUnderstanding === "string" && corePlatformUnderstanding.length > MAX_TEXT_LENGTH) errors.push("Response is too long (max 5000 characters)");
    if (!culturalConnection || typeof culturalConnection !== "string" || !culturalConnection.trim()) errors.push("Cultural connection response is required");
    if (typeof culturalConnection === "string" && culturalConnection.length > MAX_TEXT_LENGTH) errors.push("Response is too long (max 5000 characters)");
    if (!safetyConcern || !["yes", "no"].includes(safetyConcern)) errors.push("Safety concern answer is required (yes/no)");
    if (typeof safetyConcernDetails === "string" && safetyConcernDetails.length > MAX_TEXT_LENGTH) errors.push("Details text is too long");
    if (!professionalConcern || !["yes", "no"].includes(professionalConcern)) errors.push("Professional concern answer is required (yes/no)");
    if (typeof professionalConcernDetails === "string" && professionalConcernDetails.length > MAX_TEXT_LENGTH) errors.push("Details text is too long");
    if (!recommendation || !["yes", "no"].includes(recommendation)) errors.push("Recommendation answer is required (yes/no)");
    if (typeof recommendationComments === "string" && recommendationComments.length > MAX_TEXT_LENGTH) errors.push("Comments are too long");

    if (errors.length > 0) {
      res.status(400).json({ message: errors[0] });
      return;
    }

    const concernFlags: Record<string, boolean> = {};
    if (safetyConcern === "yes") concernFlags.safetyConcern = true;
    if (professionalConcern === "yes") concernFlags.professionalConcern = true;
    if (recommendation === "no") concernFlags.notRecommended = true;

    const responseData = {
      firstName,
      applicantName,
      howKnown,
      corePlatformObservation,
      corePlatformUnderstanding,
      culturalConnection,
      safetyConcern,
      safetyConcernDetails: safetyConcern === "yes" ? safetyConcernDetails : null,
      professionalConcern,
      professionalConcernDetails: professionalConcern === "yes" ? professionalConcernDetails : null,
      recommendation,
      recommendationComments,
      submittedAt: new Date().toISOString(),
    };

    await storage.applications.updateReferenceByToken(token, {
      status: "completed",
      responseReceivedAt: new Date(),
      responseData,
      concernFlags: Object.keys(concernFlags).length > 0 ? concernFlags : null,
    });

    const completedCount = await storage.applications.getCompletedReferenceCount(reference.applicationId);
    const totalRefs = (await storage.applications.getReferences(reference.applicationId)).length;

    await storage.applications.addTimelineEntry({
      applicationId: reference.applicationId,
      action: "reference_received",
      note: `Reference from ${reference.refereeName} received (${completedCount}/${totalRefs} complete)${Object.keys(concernFlags).length > 0 ? " — flagged for review" : ""}`,
    });

    if (completedCount >= totalRefs) {
      await storage.applications.update(reference.applicationId, {
        referencesStatus: "completed",
      } as any);

      await storage.applications.addTimelineEntry({
        applicationId: reference.applicationId,
        action: "references_completed",
        note: "All references have been received",
      });
    }

    logger.app.info("Reference form submitted", {
      referenceId: reference.id,
      applicationId: reference.applicationId,
      hasConcernFlags: Object.keys(concernFlags).length > 0,
    });

    res.json({ success: true });
  })
);

export default router;

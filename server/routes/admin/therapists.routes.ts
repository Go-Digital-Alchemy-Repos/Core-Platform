import { Router } from "express";
import { z } from "zod";
import { storage } from "../../storage/index";
import { asyncHandler } from "../../middleware/error-handler";
import { hashPassword } from "../../middleware/auth";
import { sendApprovalEmail, sendRejectionEmail } from "../../services/email.service";
import { paramString } from "../../utils/params";
import { getBaseUrl, notFound, conflict } from "../../utils/route-helpers";
import { logger } from "../../utils/logger";
import * as r2Service from "../../services/r2.service";
import { enrichTherapistLocationFields } from "../../services/therapist-location.service";

const router = Router();

async function normalizeTherapistResult<T extends { user?: { profileImageUrl?: string | null } | null }>(item: T): Promise<T> {
  if (!item.user) return item;
  return {
    ...item,
    user: {
      ...item.user,
      profileImageUrl: (await r2Service.normalizePublicUrl(item.user.profileImageUrl)) ?? null,
    },
  };
}

router.get(
  "/",
  asyncHandler(async (_req, res) => {
    const profiles = await storage.therapists.getAllProfiles();
    res.json(await Promise.all(profiles.map(normalizeTherapistResult)));
  })
);

const createTherapistSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  title: z.string().optional(),
  bio: z.string().optional(),
  specializations: z.array(z.string()).optional(),
  languages: z.array(z.string()).optional(),
  credentials: z.string().optional(),
  licenseNumber: z.string().optional(),
  practiceMode: z.string().optional(),
  addressLine1: z.string().optional(),
  addressLine2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  zipCode: z.string().optional(),
  phone: z.string().optional().nullable().refine((v) => {
    if (!v) return true;
    const digits = v.replace(/\D/g, "");
    return v.startsWith("+") && digits.length >= 7 && digits.length <= 15;
  }, "Enter a valid phone number with country code, e.g. +1 (555) 123-4567"),
  website: z.string().optional(),
  acceptingClients: z.boolean().optional(),
  willingToTravel: z.boolean().optional(),
  isApproved: z.boolean().optional(),
});

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = createTherapistSchema.parse(req.body);

    const existing = await storage.users.getUserByEmail(data.email);
    if (existing) {
      conflict(res, "Email already registered");
      return;
    }

    const hashedPassword = await hashPassword(data.password);
    const user = await storage.users.createUser({
      email: data.email,
      password: hashedPassword,
      firstName: data.firstName,
      lastName: data.lastName,
      role: "therapist",
    });

    const { email, password, firstName, lastName, ...profileData } = data;
    const profilePayload = await enrichTherapistLocationFields(profileData);
    const profile = await storage.therapists.createProfile({
      userId: user.id,
      isApproved: data.isApproved ?? true,
      ...profilePayload,
    });

    const profileWithUser = await storage.therapists.getProfileWithUser(profile.id);

    if (profile.isApproved && profileWithUser?.user?.email) {
      const baseUrl = getBaseUrl(req);
      sendApprovalEmail(
        profileWithUser.user.email,
        profileWithUser.user.firstName || "Therapist",
        baseUrl
      ).catch((err) => logger.email.warn("Failed to send approval email on create", { error: err.message }));
    }

    res.status(201).json(profileWithUser ? await normalizeTherapistResult(profileWithUser) : profileWithUser);
  })
);

router.put(
  "/:id/approve",
  asyncHandler(async (req, res) => {
    const profile = await storage.therapists.updateProfile(paramString(req.params.id), {
      isApproved: true,
      rejectionReason: null,
    });
    if (!profile) {
      notFound(res, "Profile");
      return;
    }

    const profileWithUser = await storage.therapists.getProfileWithUser(profile.id);
    if (profileWithUser?.user?.email) {
      const baseUrl = getBaseUrl(req);
      sendApprovalEmail(
        profileWithUser.user.email,
        profileWithUser.user.firstName,
        `${baseUrl}/auth/login`
      ).catch((err) => logger.email.warn("Failed to send approval email", { error: err.message }));
    }

    res.json(profileWithUser ? await normalizeTherapistResult(profileWithUser) : profile);
  })
);

const rejectSchema = z.object({
  reason: z.string().optional(),
});

router.put(
  "/:id/reject",
  asyncHandler(async (req, res) => {
    const { reason } = rejectSchema.parse(req.body);
    const profile = await storage.therapists.updateProfile(paramString(req.params.id), {
      isApproved: false,
      rejectionReason: reason || null,
    });
    if (!profile) {
      notFound(res, "Profile");
      return;
    }

    const profileWithUser = await storage.therapists.getProfileWithUser(profile.id);
    if (profileWithUser?.user?.email) {
      sendRejectionEmail(
        profileWithUser.user.email,
        profileWithUser.user.firstName,
        reason || null
      ).catch((err) => logger.email.warn("Failed to send rejection email", { error: err.message }));
    }

    res.json(profileWithUser ? await normalizeTherapistResult(profileWithUser) : profile);
  })
);

const updateTherapistSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  title: z.string().optional().nullable(),
  bio: z.string().optional().nullable(),
  specializations: z.array(z.string()).optional().nullable(),
  languages: z.array(z.string()).optional().nullable(),
  credentials: z.string().optional().nullable(),
  licenseNumber: z.string().optional().nullable(),
  practiceMode: z.string().optional().nullable(),
  addressLine1: z.string().optional().nullable(),
  addressLine2: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  zipCode: z.string().optional().nullable(),
  latitude: z.string().optional().nullable(),
  longitude: z.string().optional().nullable(),
  phone: z.string().optional().nullable().refine((v) => {
    if (!v) return true;
    const digits = v.replace(/\D/g, "");
    return v.startsWith("+") && digits.length >= 7 && digits.length <= 15;
  }, "Enter a valid phone number with country code, e.g. +1 (555) 123-4567"),
  website: z.string().optional().nullable(),
  instagramHandle: z.string().optional().nullable(),
  facebookHandle: z.string().optional().nullable(),
  twitterHandle: z.string().optional().nullable(),
  linkedinHandle: z.string().optional().nullable(),
  youtubeHandle: z.string().optional().nullable(),
  tiktokHandle: z.string().optional().nullable(),
  acceptingClients: z.boolean().optional(),
  willingToTravel: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  isApproved: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

router.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const data = updateTherapistSchema.parse(req.body);
    const { firstName, lastName, ...profileData } = data;
    const existing = await storage.therapists.getProfile(paramString(req.params.id));
    if (!existing) {
      notFound(res, "Profile");
      return;
    }
    const enrichedProfileData = await enrichTherapistLocationFields(profileData, existing);
    const profile = await storage.therapists.updateProfile(existing.id, enrichedProfileData);
    if (!profile) {
      notFound(res, "Profile");
      return;
    }
    if (firstName !== undefined || lastName !== undefined) {
      await storage.users.updateUser(profile.userId, {
        ...(firstName !== undefined && { firstName }),
        ...(lastName !== undefined && { lastName }),
      });
    }
    await storage.activity.log(profile.userId, "profile_update", "Profile updated by admin");
    const profileWithUser = await storage.therapists.getProfileWithUser(profile.id);
    res.json(profileWithUser ? await normalizeTherapistResult(profileWithUser) : profile);
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const profile = await storage.therapists.getProfile(paramString(req.params.id));
    if (!profile) {
      notFound(res, "Profile");
      return;
    }

    if (profile.isApproved && profile.isActive) {
      res.status(400).json({ message: "Only rejected or inactive mental health professional profiles can be permanently deleted." });
      return;
    }

    const deleted = await storage.therapists.deleteProfile(profile.id);
    if (!deleted) {
      notFound(res, "Profile");
      return;
    }

    res.json({ message: "Mental health professional deleted" });
  })
);

router.get(
  "/:id/activity",
  asyncHandler(async (req, res) => {
    const profile = await storage.therapists.getProfile(paramString(req.params.id));
    if (!profile) {
      notFound(res, "Profile");
      return;
    }
    const user = await storage.users.getUser(profile.userId);
    const logs = await storage.activity.getByUser(profile.userId, 100);
    const profileEditCount = await storage.activity.countByAction(profile.userId, "profile_update");
    const loginCount = await storage.activity.countByAction(profile.userId, "login");

    res.json({
      stats: {
        lastLoginAt: user?.lastLoginAt ?? null,
        accountCreated: user?.createdAt ?? null,
        profileEditCount,
        loginCount,
      },
      logs,
    });
  })
);

router.get(
  "/:id/subscription",
  asyncHandler(async (req, res) => {
    const profile = await storage.therapists.getProfile(paramString(req.params.id));
    if (!profile) {
      notFound(res, "Profile");
      return;
    }
    const subscription = await storage.subscriptions.getSubscriptionByTherapist(profile.userId);
    if (!subscription) {
      res.json({ subscription: null, tier: null });
      return;
    }
    const tier = subscription.tierId ? await storage.tiers.getTier(subscription.tierId) : null;
    res.json({ subscription, tier });
  })
);

export default router;

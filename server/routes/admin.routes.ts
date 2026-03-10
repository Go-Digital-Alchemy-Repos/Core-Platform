import { Router } from "express";
import { z } from "zod";
import { storage } from "../storage/index";
import { authenticateToken, requireRole, hashPassword } from "../middleware/auth";
import { asyncHandler } from "../middleware/error-handler";
import { sendApprovalEmail, sendRejectionEmail, sendPasswordResetEmail, sendWelcomeEmail } from "../services/email.service";
import { paramString } from "../utils/params";

const router = Router();

router.use(authenticateToken);
router.use(requireRole("admin"));

router.get(
  "/dashboard-stats",
  asyncHandler(async (_req, res) => {
    const [totalTherapists, approvedTherapists, pendingTherapists, activeSubscriptions, unreadMessages] =
      await Promise.all([
        storage.therapists.countProfiles(),
        storage.therapists.countApproved(),
        storage.therapists.countPending(),
        storage.subscriptions.countByStatus("active"),
        storage.contacts.countUnread(),
      ]);

    res.json({
      totalTherapists,
      approvedTherapists,
      pendingTherapists,
      activeSubscriptions,
      unreadMessages,
    });
  })
);

router.get(
  "/therapists",
  asyncHandler(async (_req, res) => {
    const profiles = await storage.therapists.getAllProfiles();
    res.json(profiles);
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
  isApproved: z.boolean().optional(),
});

router.post(
  "/therapists",
  asyncHandler(async (req, res) => {
    const data = createTherapistSchema.parse(req.body);

    const existing = await storage.users.getUserByEmail(data.email);
    if (existing) {
      res.status(409).json({ message: "Email already registered" });
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
    const profile = await storage.therapists.createProfile({
      userId: user.id,
      isApproved: data.isApproved ?? true,
      ...profileData,
    });

    const profileWithUser = await storage.therapists.getProfileWithUser(profile.id);

    if (profile.isApproved && profileWithUser?.user?.email) {
      const baseUrl = `${req.protocol}://${req.get("host")}`;
      sendApprovalEmail(
        profileWithUser.user.email,
        profileWithUser.user.firstName || "Therapist",
        baseUrl
      ).catch(() => {});
    }

    res.status(201).json(profileWithUser);
  })
);

router.put(
  "/therapists/:id/approve",
  asyncHandler(async (req, res) => {
    const profile = await storage.therapists.updateProfile(paramString(req.params.id), {
      isApproved: true,
      rejectionReason: null,
    });
    if (!profile) {
      res.status(404).json({ message: "Profile not found" });
      return;
    }

    const profileWithUser = await storage.therapists.getProfileWithUser(profile.id);
    if (profileWithUser?.user?.email) {
      const baseUrl = `${req.protocol}://${req.get("host")}`;
      sendApprovalEmail(
        profileWithUser.user.email,
        profileWithUser.user.firstName,
        `${baseUrl}/auth/login`
      ).catch(() => {});
    }

    res.json(profileWithUser ?? profile);
  })
);

const rejectSchema = z.object({
  reason: z.string().optional(),
});

router.put(
  "/therapists/:id/reject",
  asyncHandler(async (req, res) => {
    const { reason } = rejectSchema.parse(req.body);
    const profile = await storage.therapists.updateProfile(paramString(req.params.id), {
      isApproved: false,
      rejectionReason: reason || null,
    });
    if (!profile) {
      res.status(404).json({ message: "Profile not found" });
      return;
    }

    const profileWithUser = await storage.therapists.getProfileWithUser(profile.id);
    if (profileWithUser?.user?.email) {
      sendRejectionEmail(
        profileWithUser.user.email,
        profileWithUser.user.firstName,
        reason || null
      ).catch(() => {});
    }

    res.json(profileWithUser ?? profile);
  })
);

const updateTherapistSchema = z.object({
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
  acceptingClients: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  isApproved: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

router.put(
  "/therapists/:id",
  asyncHandler(async (req, res) => {
    const data = updateTherapistSchema.parse(req.body);
    const profile = await storage.therapists.updateProfile(paramString(req.params.id), data);
    if (!profile) {
      res.status(404).json({ message: "Profile not found" });
      return;
    }
    await storage.activity.log(profile.userId, "profile_update", "Profile updated by admin");
    const profileWithUser = await storage.therapists.getProfileWithUser(profile.id);
    res.json(profileWithUser ?? profile);
  })
);

router.delete(
  "/therapists/:id",
  asyncHandler(async (req, res) => {
    const profile = await storage.therapists.updateProfile(paramString(req.params.id), {
      isActive: false,
      isApproved: false,
    });
    if (!profile) {
      res.status(404).json({ message: "Profile not found" });
      return;
    }
    res.json({ message: "Therapist removed" });
  })
);

router.get(
  "/users",
  asyncHandler(async (_req, res) => {
    const users = await storage.users.getAllUsers();
    const safeUsers = users.map(({ password, ...u }) => u);
    res.json(safeUsers);
  })
);

const updateUserSchema = z.object({
  firstName: z.string().optional().nullable(),
  lastName: z.string().optional().nullable(),
  email: z.string().email().optional(),
  role: z.enum(["admin", "therapist", "client"]).optional(),
});

router.put(
  "/users/:id",
  asyncHandler(async (req, res) => {
    const data = updateUserSchema.parse(req.body);
    if (data.email) {
      const existing = await storage.users.getUserByEmail(data.email);
      if (existing && existing.id !== paramString(req.params.id)) {
        res.status(409).json({ message: "Email already in use" });
        return;
      }
    }
    const user = await storage.users.updateUser(paramString(req.params.id), data);
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }
    const { password, ...safeUser } = user;
    res.json(safeUser);
  })
);

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  role: z.enum(["admin", "therapist", "client"]),
  sendWelcomeEmail: z.boolean().optional(),
});

router.post(
  "/users",
  asyncHandler(async (req, res) => {
    const data = createUserSchema.parse(req.body);

    const existing = await storage.users.getUserByEmail(data.email);
    if (existing) {
      res.status(409).json({ message: "Email already registered" });
      return;
    }

    const hashedPassword = await hashPassword(data.password);
    const user = await storage.users.createUser({
      email: data.email,
      password: hashedPassword,
      firstName: data.firstName,
      lastName: data.lastName,
      role: data.role,
    });

    if (data.role === "therapist") {
      await storage.therapists.createProfile({ userId: user.id, isApproved: true });
    }

    if (data.sendWelcomeEmail) {
      const baseUrl = `${req.protocol}://${req.get("host")}`;
      sendWelcomeEmail(user.email, user.firstName, `${baseUrl}/auth/login`, data.password).catch(() => {});
    }

    const { password, ...safeUser } = user;
    res.status(201).json(safeUser);
  })
);

router.delete(
  "/users/:id",
  asyncHandler(async (req, res) => {
    const userId = paramString(req.params.id);
    if (userId === req.user!.id) {
      res.status(400).json({ message: "Cannot delete your own account" });
      return;
    }
    const user = await storage.users.getUser(userId);
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }
    await storage.users.deleteUser(userId);
    res.json({ message: "User deleted" });
  })
);

router.post(
  "/users/:id/reset-password",
  asyncHandler(async (req, res) => {
    const user = await storage.users.getUser(paramString(req.params.id));
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    const { newPassword } = z.object({ newPassword: z.string().min(6).optional() }).parse(req.body);

    if (newPassword) {
      const hashed = await hashPassword(newPassword);
      await storage.users.updateUser(user.id, { password: hashed });
      res.json({ message: "Password reset successfully" });
    } else {
      const resetToken = await storage.passwordResets.createToken(user.id);
      const baseUrl = `${req.protocol}://${req.get("host")}`;
      const resetUrl = `${baseUrl}/auth/reset-password?token=${resetToken.token}`;
      sendPasswordResetEmail(user.email, user.firstName, resetUrl).catch(() => {});
      res.json({ message: "Password reset link sent" });
    }
  })
);

router.get(
  "/membership-tiers",
  asyncHandler(async (_req, res) => {
    const tiers = await storage.tiers.getAllTiers();
    res.json(tiers);
  })
);

router.post(
  "/membership-tiers",
  asyncHandler(async (req, res) => {
    const tier = await storage.tiers.createTier(req.body);
    res.status(201).json(tier);
  })
);

router.put(
  "/membership-tiers/:id",
  asyncHandler(async (req, res) => {
    const tier = await storage.tiers.updateTier(paramString(req.params.id), req.body);
    if (!tier) {
      res.status(404).json({ message: "Tier not found" });
      return;
    }
    res.json(tier);
  })
);

router.get(
  "/events",
  asyncHandler(async (_req, res) => {
    const eventsList = await storage.events.getAllEvents();
    res.json(eventsList);
  })
);

router.post(
  "/events",
  asyncHandler(async (req, res) => {
    const event = await storage.events.createEvent(req.body);
    res.status(201).json(event);
  })
);

router.put(
  "/events/:id",
  asyncHandler(async (req, res) => {
    const event = await storage.events.updateEvent(paramString(req.params.id), req.body);
    if (!event) {
      res.status(404).json({ message: "Event not found" });
      return;
    }
    res.json(event);
  })
);

router.delete(
  "/events/:id",
  asyncHandler(async (req, res) => {
    await storage.events.deleteEvent(paramString(req.params.id));
    res.json({ message: "Event deleted" });
  })
);

router.get(
  "/messages",
  asyncHandler(async (_req, res) => {
    const messages = await storage.contacts.getAllMessages();
    res.json(messages);
  })
);

router.put(
  "/messages/:id/read",
  asyncHandler(async (req, res) => {
    const msg = await storage.contacts.markAsRead(paramString(req.params.id));
    if (!msg) {
      res.status(404).json({ message: "Message not found" });
      return;
    }
    res.json(msg);
  })
);

router.get(
  "/therapists/:id/activity",
  asyncHandler(async (req, res) => {
    const profile = await storage.therapists.getProfile(paramString(req.params.id));
    if (!profile) {
      res.status(404).json({ message: "Profile not found" });
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
  "/therapists/:id/subscription",
  asyncHandler(async (req, res) => {
    const profile = await storage.therapists.getProfile(paramString(req.params.id));
    if (!profile) {
      res.status(404).json({ message: "Profile not found" });
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

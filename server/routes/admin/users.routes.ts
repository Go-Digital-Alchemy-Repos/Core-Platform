import { Router } from "express";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "../../db";
import { users, therapistProfiles } from "@shared/schema";
import { storage } from "../../storage/index";
import { asyncHandler } from "../../middleware/error-handler";
import { hashPassword } from "../../middleware/auth";
import { sendPasswordResetEmail, sendWelcomeEmail } from "../../services/email.service";
import { paramString } from "../../utils/params";
import { getBaseUrl, notFound, conflict } from "../../utils/route-helpers";
import { logger } from "../../utils/logger";
import * as r2Service from "../../services/r2.service";

const router = Router();

router.get(
  "/",
  asyncHandler(async (_req, res) => {
    const rows = await db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
        profileImageUrl: users.profileImageUrl,
        isSuspended: users.isSuspended,
        lastLoginAt: users.lastLoginAt,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
        country: therapistProfiles.country,
      })
      .from(users)
      .leftJoin(therapistProfiles, eq(therapistProfiles.userId, users.id));
    res.json(
      await Promise.all(
        rows.map(async (row) => ({
          ...row,
          profileImageUrl: (await r2Service.normalizePublicUrl(row.profileImageUrl)) ?? null,
        }))
      )
    );
  })
);

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  role: z.enum(["admin", "therapist"]),
  sendWelcomeEmail: z.boolean().optional(),
});

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = createUserSchema.parse(req.body);

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
      role: data.role,
    });

    if (data.role === "therapist") {
      await storage.therapists.createProfile({ userId: user.id, isApproved: true });
    }

    if (data.sendWelcomeEmail) {
      const baseUrl = getBaseUrl(req);
      sendWelcomeEmail(user.email, user.firstName, `${baseUrl}/auth/login`, data.password).catch((err) => logger.email.warn("Failed to send welcome email", { error: err.message }));
    }

    const { password, ...safeUser } = user;
    res.status(201).json(safeUser);
  })
);

const updateUserSchema = z.object({
  firstName: z.string().optional().nullable(),
  lastName: z.string().optional().nullable(),
  email: z.string().email().optional(),
  role: z.enum(["admin", "therapist"]).optional(),
});

router.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const data = updateUserSchema.parse(req.body);
    if (data.email) {
      const existing = await storage.users.getUserByEmail(data.email);
      if (existing && existing.id !== paramString(req.params.id)) {
        conflict(res, "Email already in use");
        return;
      }
    }
    const user = await storage.users.updateUser(paramString(req.params.id), data);
    if (!user) {
      notFound(res, "User");
      return;
    }
    const { password, ...safeUser } = user;
    res.json({
      ...safeUser,
      profileImageUrl: (await r2Service.normalizePublicUrl(safeUser.profileImageUrl)) ?? null,
    });
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const userId = paramString(req.params.id);
    if (userId === req.user!.id) {
      res.status(400).json({ message: "Cannot delete your own account" });
      return;
    }
    const user = await storage.users.getUser(userId);
    if (!user) {
      notFound(res, "User");
      return;
    }
    await storage.users.deleteUser(userId);
    res.json({ message: "User deleted" });
  })
);

router.patch(
  "/:id/suspend",
  asyncHandler(async (req, res) => {
    const userId = paramString(req.params.id);
    if (userId === req.user!.id) {
      res.status(400).json({ message: "Cannot suspend your own account" });
      return;
    }
    const user = await storage.users.getUser(userId);
    if (!user) {
      notFound(res, "User");
      return;
    }
    const updated = await storage.users.updateUser(userId, { isSuspended: !user.isSuspended } as any);
    const { password, ...safeUser } = updated!;
    res.json({
      ...safeUser,
      profileImageUrl: (await r2Service.normalizePublicUrl(safeUser.profileImageUrl)) ?? null,
    });
  })
);

router.post(
  "/:id/reset-password",
  asyncHandler(async (req, res) => {
    const user = await storage.users.getUser(paramString(req.params.id));
    if (!user) {
      notFound(res, "User");
      return;
    }

    const { newPassword } = z.object({ newPassword: z.string().min(6).optional() }).parse(req.body);

    if (newPassword) {
      const hashed = await hashPassword(newPassword);
      await storage.users.updateUser(user.id, { password: hashed });
      res.json({ message: "Password reset successfully" });
    } else {
      const resetToken = await storage.passwordResets.createToken(user.id);
      const baseUrl = getBaseUrl(req);
      const resetUrl = `${baseUrl}/auth/reset-password?token=${resetToken.token}`;
      sendPasswordResetEmail(user.email, user.firstName, resetUrl).catch((err) => logger.email.warn("Failed to send password reset email", { error: err.message }));
      res.json({ message: "Password reset link sent" });
    }
  })
);

export default router;

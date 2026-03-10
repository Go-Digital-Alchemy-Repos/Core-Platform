import { Router } from "express";
import { z } from "zod";
import { storage } from "../../storage/index";
import { asyncHandler } from "../../middleware/error-handler";
import { hashPassword } from "../../middleware/auth";
import { sendPasswordResetEmail, sendWelcomeEmail } from "../../services/email.service";
import { paramString } from "../../utils/params";
import { getBaseUrl, notFound, conflict } from "../../utils/route-helpers";

const router = Router();

router.get(
  "/",
  asyncHandler(async (_req, res) => {
    const users = await storage.users.getAllUsers();
    const safeUsers = users.map(({ password, ...u }) => u);
    res.json(safeUsers);
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
      sendWelcomeEmail(user.email, user.firstName, `${baseUrl}/auth/login`, data.password).catch(() => {});
    }

    const { password, ...safeUser } = user;
    res.status(201).json(safeUser);
  })
);

const updateUserSchema = z.object({
  firstName: z.string().optional().nullable(),
  lastName: z.string().optional().nullable(),
  email: z.string().email().optional(),
  role: z.enum(["admin", "therapist", "client"]).optional(),
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
    res.json(safeUser);
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
      sendPasswordResetEmail(user.email, user.firstName, resetUrl).catch(() => {});
      res.json({ message: "Password reset link sent" });
    }
  })
);

export default router;

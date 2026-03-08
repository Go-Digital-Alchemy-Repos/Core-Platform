import { Router } from "express";
import { z } from "zod";
import { storage } from "../storage/index";
import {
  hashPassword,
  comparePassword,
  generateToken,
  setTokenCookie,
  clearTokenCookie,
  authenticateToken,
} from "../middleware/auth";
import { validateBody } from "../middleware/validation";
import { asyncHandler } from "../middleware/error-handler";

const router = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  role: z.enum(["therapist", "client"]),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post(
  "/register",
  validateBody(registerSchema),
  asyncHandler(async (req, res) => {
    const { email, password, firstName, lastName, role } = req.body;

    const existing = await storage.users.getUserByEmail(email);
    if (existing) {
      res.status(409).json({ message: "Email already registered" });
      return;
    }

    const hashedPassword = await hashPassword(password);
    const user = await storage.users.createUser({
      email,
      password: hashedPassword,
      firstName,
      lastName,
      role,
    });

    if (role === "therapist") {
      await storage.therapists.createProfile({ userId: user.id });
    }

    const baseUrl = `${req.protocol}://${req.get("host")}`;
    const admins = await storage.users.getUsersByRole("admin");
    const adminEmails = admins.map((a) => a.email);
    if (adminEmails.length > 0) {
      if (role === "therapist") {
        const { sendNewTherapistRegistrationEmail } = await import("../services/email.service");
        sendNewTherapistRegistrationEmail(
          adminEmails,
          `${firstName} ${lastName}`,
          email,
          `${baseUrl}/admin/therapists`
        ).catch(() => {});
      } else {
        const { sendNewClientRegistrationEmail } = await import("../services/email.service");
        sendNewClientRegistrationEmail(
          adminEmails,
          `${firstName} ${lastName}`,
          email,
          `${baseUrl}/admin/users`
        ).catch(() => {});
      }
    }

    const token = generateToken(user);
    setTokenCookie(res, token);

    const { password: _, ...safeUser } = user;
    res.status(201).json(safeUser);
  })
);

router.post(
  "/login",
  validateBody(loginSchema),
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    const user = await storage.users.getUserByEmail(email);
    if (!user) {
      res.status(401).json({ message: "Invalid email or password" });
      return;
    }

    const valid = await comparePassword(password, user.password);
    if (!valid) {
      res.status(401).json({ message: "Invalid email or password" });
      return;
    }

    const token = generateToken(user);
    setTokenCookie(res, token);

    const { password: _, ...safeUser } = user;
    res.json(safeUser);
  })
);

router.post("/logout", (_req, res) => {
  clearTokenCookie(res);
  res.json({ message: "Logged out" });
});

router.get(
  "/me",
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { password: _, ...safeUser } = req.user!;
    res.json(safeUser);
  })
);

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

router.post(
  "/forgot-password",
  validateBody(forgotPasswordSchema),
  asyncHandler(async (req, res) => {
    const { email } = req.body;
    const user = await storage.users.getUserByEmail(email);
    if (user) {
      const resetToken = await storage.passwordResets.createToken(user.id);
      const baseUrl = `${req.protocol}://${req.get("host")}`;
      const resetUrl = `${baseUrl}/auth/reset-password?token=${resetToken.token}`;
      const { sendPasswordResetEmail } = await import("../services/email.service");
      sendPasswordResetEmail(user.email, user.firstName, resetUrl).catch(() => {});
    }
    res.json({ message: "If an account with that email exists, a password reset link has been sent." });
  })
);

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(6),
});

router.post(
  "/reset-password",
  validateBody(resetPasswordSchema),
  asyncHandler(async (req, res) => {
    const { token, password } = req.body;
    const resetToken = await storage.passwordResets.getValidToken(token);
    if (!resetToken) {
      res.status(400).json({ message: "Invalid or expired reset link" });
      return;
    }

    const hashed = await hashPassword(password);
    await storage.users.updateUser(resetToken.userId, { password: hashed });
    await storage.passwordResets.markUsed(resetToken.id);

    res.json({ message: "Password reset successfully. You can now log in." });
  })
);

export default router;

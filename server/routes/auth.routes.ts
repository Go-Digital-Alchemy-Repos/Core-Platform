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

export default router;

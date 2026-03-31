import { Router } from "express";
import { z } from "zod";
import { storage } from "../storage/index";
import { hashPassword } from "../middleware/auth";
import { validateBody } from "../middleware/validation";
import { asyncHandler } from "../middleware/error-handler";
import { logger } from "../utils/logger";
import { db } from "../db";
import { users } from "@shared/schema";
import { eq, sql } from "drizzle-orm";

const router = Router();

async function hasAdminUser(): Promise<boolean> {
  const admins = await storage.users.getUsersByRole("admin");
  return admins.length > 0;
}

router.get(
  "/status",
  asyncHandler(async (_req, res) => {
    const adminExists = await hasAdminUser();
    res.json({ needsSetup: !adminExists });
  })
);

const setupAdminSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  setupToken: z.string().optional(),
});

router.post(
  "/admin",
  validateBody(setupAdminSchema),
  asyncHandler(async (req, res) => {
    const expectedToken = process.env.SETUP_TOKEN;
    if (expectedToken) {
      const providedToken = req.body.setupToken || req.headers["x-setup-token"];
      if (providedToken !== expectedToken) {
        res.status(403).json({ message: "Invalid setup token" });
        return;
      }
    }

    const { email, password, firstName, lastName } = req.body;
    const hashedPassword = await hashPassword(password);

    try {
      const result = await db.execute(sql`
        INSERT INTO ${users} (id, email, password, first_name, last_name, role)
        SELECT gen_random_uuid(), ${email}, ${hashedPassword}, ${firstName}, ${lastName}, 'admin'
        WHERE NOT EXISTS (SELECT 1 FROM ${users} WHERE ${users.role} = 'admin')
        AND NOT EXISTS (SELECT 1 FROM ${users} WHERE ${users.email} = ${email})
        RETURNING id, email, first_name, last_name, role
      `);

      if (result.rows.length === 0) {
        const adminExists = await hasAdminUser();
        if (adminExists) {
          res.status(403).json({ message: "Admin account already exists. Setup is no longer available." });
        } else {
          res.status(409).json({ message: "An account with this email already exists" });
        }
        return;
      }

      const created = result.rows[0] as any;
      logger.app.info("Initial admin account created", { userId: created.id, email });

      res.status(201).json({
        id: created.id,
        email: created.email,
        firstName: created.first_name,
        lastName: created.last_name,
        role: created.role,
      });
    } catch (err: any) {
      if (err.code === "23505") {
        res.status(409).json({ message: "An account with this email already exists" });
        return;
      }
      throw err;
    }
  })
);

export default router;

import type { Express } from "express";
import authRoutes from "./auth.routes";
import directoryRoutes from "./directory.routes";
import therapistRoutes from "./therapist.routes";
import stripeRoutes from "./stripe.routes";
import adminRoutes from "./admin.routes";
import settingsRoutes from "./settings.routes";
import eventsRoutes from "./events.routes";
import contactRoutes from "./contact.routes";
import docsRoutes from "./docs.routes";
import uploadRoutes from "./upload.routes";
import messagesRoutes from "./messages.routes";
import notificationsRoutes from "./notifications.routes";
import specializationsRoutes from "./specializations.routes";
import { storage } from "../storage/index";

export function registerApiRoutes(app: Express) {
  app.use("/api/auth", authRoutes);
  app.use("/api/therapists", directoryRoutes);
  app.use("/api/therapist", therapistRoutes);
  app.use("/api/stripe", stripeRoutes);
  app.use("/api/admin", adminRoutes);
  app.use("/api/admin", settingsRoutes);
  app.use("/api/events", eventsRoutes);
  app.use("/api/contact", contactRoutes);
  app.use("/api/admin/docs", docsRoutes);
  app.use("/api/uploads", uploadRoutes);
  app.use("/api/messages", messagesRoutes);
  app.use("/api/notifications", notificationsRoutes);
  app.use("/api/specializations", specializationsRoutes);

  app.get("/api/membership-tiers", async (_req, res) => {
    const tiers = await storage.tiers.getActiveTiers();
    res.json(tiers);
  });
}

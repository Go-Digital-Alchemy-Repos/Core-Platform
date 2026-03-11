import { Router } from "express";
import { authenticateToken, requireRole } from "../../middleware/auth";
import dashboardRoutes from "./dashboard.routes";
import therapistsRoutes from "./therapists.routes";
import usersRoutes from "./users.routes";
import tiersRoutes from "./tiers.routes";
import eventsRoutes from "./events.routes";
import messagesRoutes from "./messages.routes";
import blogRoutes from "./blog.routes";
import registrationRoutes from "./registrations.routes";
import cmsRoutes from "./cms.routes";
import cmsMediaRoutes from "./cms-media.routes";
import cmsSectionsRoutes from "./cms-sections.routes";
import cmsSeoRoutes from "./cms-seo.routes";
import cmsRedirectsRoutes from "./cms-redirects.routes";
import cmsAuditRoutes from "./cms-audit.routes";

const router = Router();

router.use(authenticateToken);
router.use(requireRole("admin"));

router.use("/", dashboardRoutes);
router.use("/therapists", therapistsRoutes);
router.use("/users", usersRoutes);
router.use("/membership-tiers", tiersRoutes);
router.use("/events", eventsRoutes);
router.use("/messages", messagesRoutes);
router.use("/blog", blogRoutes);
router.use("/", registrationRoutes);
router.use("/cms", cmsRoutes);
router.use("/cms", cmsMediaRoutes);
router.use("/cms", cmsSectionsRoutes);
router.use("/cms", cmsSeoRoutes);
router.use("/cms", cmsRedirectsRoutes);
router.use("/cms", cmsAuditRoutes);

export default router;

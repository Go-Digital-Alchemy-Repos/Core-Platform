import { Router } from "express";
import { authenticateToken, requireAdminPermission, requireRole } from "../../middleware/auth";
import dashboardRoutes from "./dashboard.routes";
import therapistsRoutes from "./therapists.routes";
import usersRoutes from "./users.routes";
import tiersRoutes from "./tiers.routes";
import eventsRoutes from "./events.routes";
import blogRoutes from "./blog.routes";
import registrationRoutes from "./registrations.routes";
import cmsRoutes from "./cms.routes";
import cmsMediaRoutes from "./cms-media.routes";
import cmsSectionsRoutes from "./cms-sections.routes";
import cmsSeoRoutes from "./cms-seo.routes";
import cmsRedirectsRoutes from "./cms-redirects.routes";
import cmsAuditRoutes from "./cms-audit.routes";
import applicationsRoutes from "./applications.routes";
import cmsMenusRoutes from "./cms-menus.routes";
import cmsSidebarsRoutes from "./cms-sidebars.routes";
import systemBackupsRoutes from "./system-backups.routes";
import formsRoutes from "./forms.routes";
import editorLocksRoutes from "./editor-locks.routes";
import crmRoutes from "./crm.routes";

const router = Router();

router.use(authenticateToken);

router.use("/", requireRole("admin"), dashboardRoutes);
router.use("/therapists", requireAdminPermission("directory"), therapistsRoutes);
router.use("/users", requireRole("admin"), usersRoutes);
router.use("/membership-tiers", requireAdminPermission("directory"), tiersRoutes);
router.use("/events", requireAdminPermission("content"), eventsRoutes);
router.use("/blog", requireAdminPermission("content"), blogRoutes);
router.use("/", requireAdminPermission("content"), registrationRoutes);
router.use("/cms", requireAdminPermission("content"), cmsRoutes);
router.use("/cms", requireAdminPermission("content"), cmsMediaRoutes);
router.use("/cms", requireAdminPermission("content", "design"), cmsSectionsRoutes);
router.use("/cms", requireAdminPermission("content"), cmsSeoRoutes);
router.use("/cms", requireAdminPermission("content"), cmsRedirectsRoutes);
router.use("/cms", requireAdminPermission("content"), cmsAuditRoutes);
router.use("/cms", requireAdminPermission("design"), cmsMenusRoutes);
router.use("/cms", requireAdminPermission("design"), cmsSidebarsRoutes);
router.use("/", requireAdminPermission("content"), formsRoutes);
router.use("/crm", requireAdminPermission("crm"), crmRoutes);
router.use("/editor-locks", requireRole("admin", "editor"), editorLocksRoutes);
router.use("/", requireRole("admin"), systemBackupsRoutes);
router.use("/applications", requireAdminPermission("directory"), applicationsRoutes);

export default router;

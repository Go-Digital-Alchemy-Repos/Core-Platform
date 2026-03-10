import { Router } from "express";
import { authenticateToken, requireRole } from "../../middleware/auth";
import dashboardRoutes from "./dashboard.routes";
import therapistsRoutes from "./therapists.routes";
import usersRoutes from "./users.routes";
import tiersRoutes from "./tiers.routes";
import eventsRoutes from "./events.routes";
import messagesRoutes from "./messages.routes";

const router = Router();

router.use(authenticateToken);
router.use(requireRole("admin"));

router.use("/", dashboardRoutes);
router.use("/therapists", therapistsRoutes);
router.use("/users", usersRoutes);
router.use("/membership-tiers", tiersRoutes);
router.use("/events", eventsRoutes);
router.use("/messages", messagesRoutes);

export default router;

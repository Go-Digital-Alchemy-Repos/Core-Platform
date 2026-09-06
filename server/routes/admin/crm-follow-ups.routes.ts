import { Router } from "express";
import { asyncHandler } from "../../middleware/error-handler";
import { listCrmFollowUps, listCrmAssignees } from "../../services/crm-follow-ups.service";
const router = Router();
router.get(
  "/follow-ups",
  asyncHandler(async (req, res) => {
    res.json(await listCrmFollowUps(req.query, req.user!.id));
  }),
);
router.get(
  "/follow-ups/assignees",
  asyncHandler(async (req, res) => {
    res.json(await listCrmAssignees(req.query));
  }),
);
export default router;

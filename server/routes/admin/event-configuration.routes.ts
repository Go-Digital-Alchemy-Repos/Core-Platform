import { Router } from "express";
import { asyncHandler } from "../../middleware/error-handler";
import {
  readEventConfiguration,
  saveEventConfiguration,
} from "../../services/event-configuration.service";
import { ZodError } from "zod";
const router = Router();
router.get(
  "/",
  asyncHandler(async (_req, res) => {
    res.json(await readEventConfiguration());
  }),
);
router.put(
  "/",
  asyncHandler(async (req, res) => {
    try {
      if (!req.user?.id) return res.status(401).json({ message: "Authentication required" });
      res.json(await saveEventConfiguration(req.body, req.user.id));
    } catch (error) {
      if (error instanceof ZodError)
        return res.status(400).json({ message: error.issues.map((i) => i.message).join("; ") });
      if (error instanceof Error && "status" in error)
        return res.status(Number(error.status)).json({ message: error.message });
      throw error;
    }
  }),
);
export default router;

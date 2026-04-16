import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../../middleware/error-handler";
import {
  editorLockRequestSchema,
  editorLockResourceTypeSchema,
} from "@shared/schema";
import {
  acquireEditorLock,
  getEditorLock,
  heartbeatEditorLock,
  releaseEditorLock,
  takeoverEditorLock,
} from "../../services/editor-locks.service";

const router = Router();

const lockParamsSchema = z.object({
  resourceType: editorLockResourceTypeSchema,
  resourceId: z.string().min(1),
});

router.get(
  "/:resourceType/:resourceId",
  asyncHandler(async (req, res) => {
    const { resourceType, resourceId } = lockParamsSchema.parse(req.params);
    res.json(await getEditorLock(resourceType, resourceId, req.user));
  }),
);

router.post(
  "/acquire",
  asyncHandler(async (req, res) => {
    const { resourceType, resourceId } = editorLockRequestSchema.parse(req.body);
    res.json(await acquireEditorLock(resourceType, resourceId, req.user));
  }),
);

router.post(
  "/heartbeat",
  asyncHandler(async (req, res) => {
    const { resourceType, resourceId } = editorLockRequestSchema.parse(req.body);
    res.json(await heartbeatEditorLock(resourceType, resourceId, req.user));
  }),
);

router.post(
  "/release",
  asyncHandler(async (req, res) => {
    const { resourceType, resourceId } = editorLockRequestSchema.parse(req.body);
    res.json(await releaseEditorLock(resourceType, resourceId, req.user));
  }),
);

router.post(
  "/takeover",
  asyncHandler(async (req, res) => {
    const { resourceType, resourceId } = editorLockRequestSchema.parse(req.body);
    try {
      res.json(await takeoverEditorLock(resourceType, resourceId, req.user));
    } catch (error) {
      if (error instanceof Error && error.message === "Forbidden") {
        res.status(403).json({ message: "Forbidden" });
        return;
      }
      throw error;
    }
  }),
);

export default router;

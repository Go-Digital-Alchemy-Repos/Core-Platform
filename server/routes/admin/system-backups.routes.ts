import { Router } from "express";
import { asyncHandler } from "../../middleware/error-handler";
import { getBackupStatus, runSystemBackup } from "../../services/system-backup.service";

const router = Router();

router.get(
  "/system/backups/status",
  asyncHandler(async (_req, res) => {
    res.json(await getBackupStatus());
  })
);

router.post(
  "/system/backups/run",
  asyncHandler(async (req, res) => {
    const requestedReason = req.body?.reason === "manual" ? "manual" : "manual";
    const manifest = await runSystemBackup(requestedReason);
    res.status(201).json(manifest);
  })
);

export default router;

import { Router } from "express";
import { storage } from "../../storage/index";
import { asyncHandler } from "../../middleware/error-handler";

const router = Router();

router.get(
  "/dashboard-stats",
  asyncHandler(async (_req, res) => {
    const [totalTherapists, approvedTherapists, pendingTherapists, activeSubscriptions, unreadMessages] =
      await Promise.all([
        storage.therapists.countProfiles(),
        storage.therapists.countApproved(),
        storage.therapists.countPending(),
        storage.subscriptions.countByStatus("active"),
        storage.contacts.countUnread(),
      ]);

    res.json({
      totalTherapists,
      approvedTherapists,
      pendingTherapists,
      activeSubscriptions,
      unreadMessages,
    });
  })
);

export default router;

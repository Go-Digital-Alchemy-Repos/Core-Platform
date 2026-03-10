import { Router } from "express";
import { storage } from "../../storage/index";
import { asyncHandler } from "../../middleware/error-handler";
import { paramString } from "../../utils/params";
import { notFound } from "../../utils/route-helpers";

const router = Router();

router.get(
  "/",
  asyncHandler(async (_req, res) => {
    const messages = await storage.contacts.getAllMessages();
    res.json(messages);
  })
);

router.put(
  "/:id/read",
  asyncHandler(async (req, res) => {
    const msg = await storage.contacts.markAsRead(paramString(req.params.id));
    if (!msg) {
      notFound(res, "Message");
      return;
    }
    res.json(msg);
  })
);

export default router;

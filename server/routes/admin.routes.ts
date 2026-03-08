import { Router } from "express";
import { storage } from "../storage/index";
import { authenticateToken, requireRole } from "../middleware/auth";
import { asyncHandler } from "../middleware/error-handler";

const router = Router();

router.use(authenticateToken);
router.use(requireRole("admin"));

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

router.get(
  "/therapists",
  asyncHandler(async (_req, res) => {
    const profiles = await storage.therapists.getAllProfiles();
    res.json(profiles);
  })
);

router.put(
  "/therapists/:id/approve",
  asyncHandler(async (req, res) => {
    const profile = await storage.therapists.updateProfile(req.params.id, {
      isApproved: true,
    });
    if (!profile) {
      res.status(404).json({ message: "Profile not found" });
      return;
    }
    res.json(profile);
  })
);

router.put(
  "/therapists/:id/reject",
  asyncHandler(async (req, res) => {
    const profile = await storage.therapists.updateProfile(req.params.id, {
      isApproved: false,
    });
    if (!profile) {
      res.status(404).json({ message: "Profile not found" });
      return;
    }
    res.json(profile);
  })
);

router.put(
  "/therapists/:id",
  asyncHandler(async (req, res) => {
    const profile = await storage.therapists.updateProfile(req.params.id, req.body);
    if (!profile) {
      res.status(404).json({ message: "Profile not found" });
      return;
    }
    res.json(profile);
  })
);

router.get(
  "/users",
  asyncHandler(async (_req, res) => {
    const users = await storage.users.getAllUsers();
    const safeUsers = users.map(({ password, ...u }) => u);
    res.json(safeUsers);
  })
);

router.put(
  "/users/:id",
  asyncHandler(async (req, res) => {
    const user = await storage.users.updateUser(req.params.id, req.body);
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }
    const { password, ...safeUser } = user;
    res.json(safeUser);
  })
);

router.get(
  "/membership-tiers",
  asyncHandler(async (_req, res) => {
    const tiers = await storage.tiers.getAllTiers();
    res.json(tiers);
  })
);

router.post(
  "/membership-tiers",
  asyncHandler(async (req, res) => {
    const tier = await storage.tiers.createTier(req.body);
    res.status(201).json(tier);
  })
);

router.put(
  "/membership-tiers/:id",
  asyncHandler(async (req, res) => {
    const tier = await storage.tiers.updateTier(req.params.id, req.body);
    if (!tier) {
      res.status(404).json({ message: "Tier not found" });
      return;
    }
    res.json(tier);
  })
);

router.get(
  "/events",
  asyncHandler(async (_req, res) => {
    const eventsList = await storage.events.getAllEvents();
    res.json(eventsList);
  })
);

router.post(
  "/events",
  asyncHandler(async (req, res) => {
    const event = await storage.events.createEvent(req.body);
    res.status(201).json(event);
  })
);

router.put(
  "/events/:id",
  asyncHandler(async (req, res) => {
    const event = await storage.events.updateEvent(req.params.id, req.body);
    if (!event) {
      res.status(404).json({ message: "Event not found" });
      return;
    }
    res.json(event);
  })
);

router.delete(
  "/events/:id",
  asyncHandler(async (req, res) => {
    await storage.events.deleteEvent(req.params.id);
    res.json({ message: "Event deleted" });
  })
);

router.get(
  "/messages",
  asyncHandler(async (_req, res) => {
    const messages = await storage.contacts.getAllMessages();
    res.json(messages);
  })
);

router.put(
  "/messages/:id/read",
  asyncHandler(async (req, res) => {
    const msg = await storage.contacts.markAsRead(req.params.id);
    if (!msg) {
      res.status(404).json({ message: "Message not found" });
      return;
    }
    res.json(msg);
  })
);

export default router;

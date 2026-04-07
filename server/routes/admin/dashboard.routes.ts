import { Router } from "express";
import { sql } from "drizzle-orm";
import { db } from "../../db";
import { storage } from "../../storage/index";
import { asyncHandler } from "../../middleware/error-handler";
import { MemoryCache } from "../../lib/cache";
import { users, therapistProfiles, therapistSubscriptions, activityLogs, contactMessages, events } from "@shared/schema";

const router = Router();

const ANALYTICS_CACHE_TTL = parseInt(process.env.DASHBOARD_ANALYTICS_CACHE_TTL || "300", 10);
const analyticsCache = new MemoryCache<Record<string, unknown>>(ANALYTICS_CACHE_TTL);
const ANALYTICS_CACHE_KEY = "dashboard_analytics";

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
  "/dashboard-analytics",
  asyncHandler(async (_req, res) => {
    const cached = analyticsCache.get(ANALYTICS_CACHE_KEY);
    if (cached) {
      return res.json(cached);
    }

    const [
      usersByRole,
      therapistsByStatus,
      subscriptionsByStatus,
      registrationTrend,
      recentActivity,
      contactsTrend,
      topSpecializations,
      totalUsers,
      totalEvents,
      upcomingEvents,
    ] = await Promise.all([
      db
        .select({
          role: users.role,
          count: sql<number>`count(*)`,
        })
        .from(users)
        .groupBy(users.role),

      db
        .select({
          status: sql<string>`
            case
              when ${therapistProfiles.isApproved} = true and ${therapistProfiles.isActive} = true then 'approved'
              when ${therapistProfiles.isApproved} = false and ${therapistProfiles.isActive} = true and ${therapistProfiles.rejectionReason} is null then 'pending'
              when ${therapistProfiles.isApproved} = false and ${therapistProfiles.rejectionReason} is not null then 'rejected'
              else 'inactive'
            end
          `,
          count: sql<number>`count(*)`,
        })
        .from(therapistProfiles)
        .groupBy(
          sql`case
            when ${therapistProfiles.isApproved} = true and ${therapistProfiles.isActive} = true then 'approved'
            when ${therapistProfiles.isApproved} = false and ${therapistProfiles.isActive} = true and ${therapistProfiles.rejectionReason} is null then 'pending'
            when ${therapistProfiles.isApproved} = false and ${therapistProfiles.rejectionReason} is not null then 'rejected'
            else 'inactive'
          end`
        ),

      db
        .select({
          status: therapistSubscriptions.status,
          count: sql<number>`count(*)`,
        })
        .from(therapistSubscriptions)
        .groupBy(therapistSubscriptions.status),

      db
        .select({
          month: sql<string>`to_char(${users.createdAt}, 'YYYY-MM')`,
          count: sql<number>`count(*)`,
        })
        .from(users)
        .where(sql`${users.createdAt} >= now() - interval '6 months'`)
        .groupBy(sql`to_char(${users.createdAt}, 'YYYY-MM')`)
        .orderBy(sql`to_char(${users.createdAt}, 'YYYY-MM')`),

      db
        .select({
          id: activityLogs.id,
          userId: activityLogs.userId,
          action: activityLogs.action,
          details: activityLogs.details,
          createdAt: activityLogs.createdAt,
          firstName: users.firstName,
          lastName: users.lastName,
        })
        .from(activityLogs)
        .leftJoin(users, sql`${activityLogs.userId} = ${users.id}`)
        .orderBy(sql`${activityLogs.createdAt} desc`)
        .limit(15),

      db
        .select({
          month: sql<string>`to_char(${contactMessages.createdAt}, 'YYYY-MM')`,
          count: sql<number>`count(*)`,
        })
        .from(contactMessages)
        .where(sql`${contactMessages.createdAt} >= now() - interval '6 months'`)
        .groupBy(sql`to_char(${contactMessages.createdAt}, 'YYYY-MM')`)
        .orderBy(sql`to_char(${contactMessages.createdAt}, 'YYYY-MM')`),

      db
        .select({
          name: sql<string>`unnest(${therapistProfiles.specializations})`,
          count: sql<number>`count(*)`,
        })
        .from(therapistProfiles)
        .where(sql`${therapistProfiles.specializations} is not null`)
        .groupBy(sql`unnest(${therapistProfiles.specializations})`)
        .orderBy(sql`count(*) desc`)
        .limit(8),

      db
        .select({ count: sql<number>`count(*)` })
        .from(users),

      db
        .select({ count: sql<number>`count(*)` })
        .from(events),

      db
        .select({ count: sql<number>`count(*)` })
        .from(events)
        .where(sql`${events.date} >= now()`),
    ]);

    const result = {
      usersByRole: usersByRole.map((r) => ({ role: r.role, count: Number(r.count) })),
      therapistsByStatus: therapistsByStatus.map((r) => ({ status: r.status, count: Number(r.count) })),
      subscriptionsByStatus: subscriptionsByStatus.map((r) => ({ status: r.status, count: Number(r.count) })),
      registrationTrend: registrationTrend.map((r) => ({ month: r.month, count: Number(r.count) })),
      contactsTrend: contactsTrend.map((r) => ({ month: r.month, count: Number(r.count) })),
      topSpecializations: topSpecializations.map((r) => ({ name: r.name, count: Number(r.count) })),
      recentActivity: recentActivity.map((r) => ({
        id: r.id,
        userId: r.userId,
        action: r.action,
        details: r.details,
        createdAt: r.createdAt,
        userName: r.firstName && r.lastName ? `${r.firstName} ${r.lastName}` : "Unknown",
      })),
      totalUsers: Number(totalUsers[0].count),
      totalEvents: Number(totalEvents[0].count),
      upcomingEvents: Number(upcomingEvents[0].count),
    };

    analyticsCache.set(ANALYTICS_CACHE_KEY, result);
    res.json(result);
  })
);

export default router;

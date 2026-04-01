import { storage } from "../storage";
import { logger } from "../utils/logger";

const INTERVAL_MS = 60_000;

export function startScheduledPublishService() {
  async function check() {
    try {
      const pages = await storage.cmsPages.publishScheduledPages();
      const posts = await storage.blog.publishScheduledPosts();
      if (pages > 0 || posts > 0) {
        logger.app.info(`[scheduler] Auto-published ${pages} page(s) and ${posts} post(s)`);
      }
    } catch (err) {
      logger.app.error("[scheduler] Failed to check scheduled content:", err);
    }
  }

  check();
  setInterval(check, INTERVAL_MS);
  logger.app.info("[scheduler] Scheduled publishing service started (checking every 60s)");
}

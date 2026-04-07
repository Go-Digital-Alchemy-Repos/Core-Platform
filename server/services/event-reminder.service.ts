import { storage } from "../storage";
import { logger } from "../utils/logger";
import { sendEventReminderEmail } from "./email.service";

const CHECK_INTERVAL_MS = 15 * 60_000;

function formatEventDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function startEventReminderService() {
  async function run() {
    try {
      const now = new Date();
      const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      const upcomingEvents = await storage.events.getEventsInDateRange(now, in24Hours);
      if (upcomingEvents.length === 0) return;

      const eventIds = upcomingEvents.map((e) => e.id);
      const registrations = await storage.eventRegistrations.getConfirmedRegistrationsNeedingReminder(eventIds);
      if (registrations.length === 0) return;

      const eventMap = new Map(upcomingEvents.map((e) => [e.id, e]));
      const sentIds: string[] = [];

      for (const reg of registrations) {
        const event = eventMap.get(reg.eventId);
        if (!event) continue;

        const eventLocation = event.locationName || event.location || (event.isVirtual ? "Virtual" : null);
        const eventDate = formatEventDate(event.date);
        const firstName = reg.fullName.split(" ")[0];

        try {
          const sent = await sendEventReminderEmail(
            reg.email,
            firstName,
            event.title,
            eventDate,
            eventLocation,
            event
          );
          if (sent) {
            sentIds.push(reg.id);
          } else {
            logger.email.warn("Reminder email not sent (template inactive or transport failure)", {
              registrationId: reg.id,
            });
          }
        } catch (err) {
          logger.email.warn("Failed to send event reminder", {
            registrationId: reg.id,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }

      if (sentIds.length > 0) {
        await storage.eventRegistrations.markReminderSent(sentIds);
        logger.app.info(`[event-reminder] Sent ${sentIds.length} reminder(s) for ${upcomingEvents.length} event(s)`);
      }
    } catch (err) {
      logger.app.error("[event-reminder] Failed to process event reminders:", err);
    }
  }

  setInterval(run, CHECK_INTERVAL_MS);
  run();
  logger.app.info("[event-reminder] Event reminder service started");
}

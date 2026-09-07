import { activityLogs } from "@shared/schema/activity-logs";
import { eq, sql } from "drizzle-orm";
import { db } from "../db";
import { systemSettings } from "@shared/schema/system-settings";
import {
  defaultEventConfiguration,
  eventConfigurationSchema,
  validateConfigurationTransition,
  type EventConfiguration,
} from "@shared/event-configuration";
const key = "events_configuration_v1";
export async function readEventConfiguration(): Promise<EventConfiguration> {
  const [row] = await db.select().from(systemSettings).where(eq(systemSettings.key, key));
  return row ? eventConfigurationSchema.parse(JSON.parse(row.value)) : defaultEventConfiguration();
}
export async function saveEventConfiguration(
  input: unknown,
  actorId: string,
): Promise<EventConfiguration> {
  const next = eventConfigurationSchema.parse(input);
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${key}))`);
    const [row] = await tx.select().from(systemSettings).where(eq(systemSettings.key, key));
    const previous = row
      ? eventConfigurationSchema.parse(JSON.parse(row.value))
      : defaultEventConfiguration();
    if (previous.revision !== next.revision)
      throw Object.assign(new Error("Settings changed. Reload before saving again."), {
        status: 409,
      });
    const error = validateConfigurationTransition(previous, next);
    if (error) throw Object.assign(new Error(error), { status: 400 });
    const saved = { ...next, revision: next.revision + 1 };
    await tx
      .insert(systemSettings)
      .values({ key, value: JSON.stringify(saved), category: "events", isSecret: false })
      .onConflictDoUpdate({
        target: systemSettings.key,
        set: { value: JSON.stringify(saved), updatedAt: new Date() },
      });
    await tx.insert(activityLogs).values({
      userId: actorId,
      action: "event_configuration_updated",
      details: JSON.stringify({ previousRevision: previous.revision, revision: saved.revision }),
    });
    return saved;
  });
}

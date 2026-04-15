import { storage } from "../storage";
import { logger } from "../utils/logger";
import { getDirectorySettings } from "./directory-settings.service";
import {
  sendMembershipPaymentFailedEmail,
  sendMembershipReactivatedEmail,
  sendMembershipRenewalReminderEmail,
  sendMembershipSuspendedEmail,
} from "./email.service";

const CHECK_INTERVAL_MS = 15 * 60_000;

function getAppBaseUrl() {
  return process.env.APP_URL || `https://${process.env.REPLIT_DOMAINS?.split(",")[0] || "localhost:5000"}`;
}

function formatDateTime(date: Date) {
  return date.toLocaleString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function sameMoment(a?: Date | null, b?: Date | null) {
  if (!a || !b) return false;
  return new Date(a).getTime() === new Date(b).getTime();
}

async function deactivateProfileForTherapist(therapistId: string) {
  const profile = await storage.therapists.getProfileByUserId(therapistId);
  if (profile) {
    await storage.therapists.updateProfile(profile.id, { isActive: false });
  }
}

async function activateProfileForTherapist(therapistId: string) {
  const [application, profile] = await Promise.all([
    storage.applications.getByUserId(therapistId),
    storage.therapists.getProfileByUserId(therapistId),
  ]);

  if (application?.status === "active_member" && profile) {
    await storage.therapists.updateProfile(profile.id, { isActive: true });
  }
}

export async function processDirectoryMembershipLifecycle() {
  const settings = await getDirectorySettings();
  const now = new Date();
  const renewalWindowEnd = new Date(
    now.getTime() + settings.renewalReminderDays * 24 * 60 * 60 * 1000,
  );
  const subscriptions = await storage.subscriptions.getSubscriptionsByStatuses([
    "active",
    "past_due",
    "suspended",
  ]);

  for (const subscription of subscriptions) {
    try {
      const user = await storage.users.getUser(subscription.therapistId);
      if (!user) continue;

      const manageBillingUrl = `${getAppBaseUrl()}/therapist/subscription`;
      const retryPaymentUrl = `${getAppBaseUrl()}/therapist/subscription`;

      if (
        subscription.status === "active" &&
        subscription.currentPeriodEnd &&
        subscription.currentPeriodEnd > now &&
        subscription.currentPeriodEnd <= renewalWindowEnd &&
        !sameMoment(
          subscription.renewalReminderSentForPeriodEnd,
          subscription.currentPeriodEnd,
        )
      ) {
        const tier = subscription.tierId
          ? await storage.tiers.getTier(subscription.tierId)
          : null;

        const sent = await sendMembershipRenewalReminderEmail(
          user.email,
          user.firstName,
          formatDateTime(subscription.currentPeriodEnd),
          tier?.name ?? null,
          manageBillingUrl,
        );

        if (sent) {
          await storage.subscriptions.updateSubscription(subscription.id, {
            renewalReminderSentForPeriodEnd: subscription.currentPeriodEnd,
          });
        }
      }

      if (
        subscription.status === "past_due" &&
        subscription.gracePeriodEndsAt &&
        subscription.gracePeriodEndsAt <= now &&
        !subscription.suspendedAt
      ) {
        await storage.subscriptions.updateSubscription(subscription.id, {
          status: "suspended",
          suspendedAt: now,
        });

        if (settings.suspendListingOnPastDue) {
          await deactivateProfileForTherapist(subscription.therapistId);
        }

        await sendMembershipSuspendedEmail(
          user.email,
          user.firstName,
          manageBillingUrl,
          retryPaymentUrl,
        );

        logger.app.warn("[directory-membership] Subscription suspended after grace period", {
          subscriptionId: subscription.id,
          therapistId: subscription.therapistId,
        });
      }
    } catch (err) {
      logger.app.error("[directory-membership] Failed to process subscription lifecycle item", err, {
        subscriptionId: subscription.id,
      });
    }
  }
}

export async function notifyMembershipPaymentFailed(subscriptionId: string, therapistId: string) {
  const [subscription, user, settings] = await Promise.all([
    storage.subscriptions.getSubscription(subscriptionId),
    storage.users.getUser(therapistId),
    getDirectorySettings(),
  ]);

  if (!subscription || !user) return;

  const gracePeriodEndsAt = new Date(
    Date.now() + settings.paymentFailureGraceHours * 60 * 60 * 1000,
  );

  const sent = await sendMembershipPaymentFailedEmail(
    user.email,
    user.firstName,
    formatDateTime(gracePeriodEndsAt),
    `${getAppBaseUrl()}/therapist/subscription`,
    `${getAppBaseUrl()}/therapist/subscription`,
  );

  await storage.subscriptions.updateSubscription(subscription.id, {
    paymentFailureNoticeSentAt: sent ? new Date() : subscription.paymentFailureNoticeSentAt ?? null,
    gracePeriodEndsAt,
  });
}

export async function handleMembershipRecovered(subscriptionId: string, therapistId: string, hadBillingIssue: boolean) {
  const [subscription, user] = await Promise.all([
    storage.subscriptions.getSubscription(subscriptionId),
    storage.users.getUser(therapistId),
  ]);

  if (!subscription) return;

  await storage.subscriptions.updateSubscription(subscription.id, {
    status: "active",
    gracePeriodEndsAt: null,
    lastFailedInvoiceId: null,
    lastPaymentFailedAt: null,
    paymentFailureNoticeSentAt: null,
    suspendedAt: null,
  });

  await activateProfileForTherapist(therapistId);

  if (hadBillingIssue && user) {
    await sendMembershipReactivatedEmail(
      user.email,
      user.firstName,
      `${getAppBaseUrl()}/therapist`,
    );
  }
}

export function startDirectoryMembershipLifecycleService() {
  async function run() {
    try {
      await processDirectoryMembershipLifecycle();
    } catch (err) {
      logger.app.error("[directory-membership] Lifecycle service failed", err);
    }
  }

  setInterval(run, CHECK_INTERVAL_MS);
  run();
  logger.app.info("[directory-membership] Directory membership lifecycle service started");
}

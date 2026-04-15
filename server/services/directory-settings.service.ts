import { storage } from "../storage/index";

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value == null) return fallback;
  const normalized = value.trim().toLowerCase();
  if (["true", "1", "yes", "on", "enabled"].includes(normalized)) return true;
  if (["false", "0", "no", "off", "disabled"].includes(normalized)) return false;
  return fallback;
}

function parseInteger(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseMoneyToCents(value: string | undefined, fallbackCents: number): number {
  if (!value) return fallbackCents;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed * 100)) : fallbackCents;
}

export const DEFAULT_DIRECTORY_SETTINGS = {
  applicationFeeAmountCents: 15000,
  applicationFeeNoticeTitle: "Application Fee",
  applicationFeeNoticeBody:
    "Before your directory listing can be reviewed, an application fee is required. If you are approved, that amount can be credited toward your first membership invoice. If your application is denied, the fee is non-refundable.",
  applicationFeePolicySummary:
    "The application fee is collected before your application enters review. Approved applicants can have that amount credited toward their first membership invoice. Denied applications do not receive a refund.",
  applicationFeeCreditOnApproval: true,
  applicationFeeCreditAmountCents: 15000,
  renewalReminderDays: 30,
  paymentFailureGraceHours: 48,
  suspendListingOnPastDue: true,
  directoryRequiresApprovedApplication: true,
  directoryRequiresActiveSubscription: true,
};

export type DirectorySettings = typeof DEFAULT_DIRECTORY_SETTINGS;

export async function getDirectorySettings(): Promise<DirectorySettings> {
  const settings = await storage.settings.getDecryptedCategory("directory_settings");

  return {
    applicationFeeAmountCents: parseMoneyToCents(
      settings.application_fee_amount_usd,
      DEFAULT_DIRECTORY_SETTINGS.applicationFeeAmountCents,
    ),
    applicationFeeNoticeTitle:
      settings.application_fee_notice_title || DEFAULT_DIRECTORY_SETTINGS.applicationFeeNoticeTitle,
    applicationFeeNoticeBody:
      settings.application_fee_notice_body || DEFAULT_DIRECTORY_SETTINGS.applicationFeeNoticeBody,
    applicationFeePolicySummary:
      settings.application_fee_policy_summary || DEFAULT_DIRECTORY_SETTINGS.applicationFeePolicySummary,
    applicationFeeCreditOnApproval: parseBoolean(
      settings.application_fee_credit_on_approval,
      DEFAULT_DIRECTORY_SETTINGS.applicationFeeCreditOnApproval,
    ),
    applicationFeeCreditAmountCents: parseMoneyToCents(
      settings.application_fee_credit_amount_usd,
      DEFAULT_DIRECTORY_SETTINGS.applicationFeeCreditAmountCents,
    ),
    renewalReminderDays: parseInteger(
      settings.renewal_reminder_days,
      DEFAULT_DIRECTORY_SETTINGS.renewalReminderDays,
    ),
    paymentFailureGraceHours: parseInteger(
      settings.payment_failure_grace_hours,
      DEFAULT_DIRECTORY_SETTINGS.paymentFailureGraceHours,
    ),
    suspendListingOnPastDue: parseBoolean(
      settings.suspend_listing_on_past_due,
      DEFAULT_DIRECTORY_SETTINGS.suspendListingOnPastDue,
    ),
    directoryRequiresApprovedApplication: parseBoolean(
      settings.directory_requires_approved_application,
      DEFAULT_DIRECTORY_SETTINGS.directoryRequiresApprovedApplication,
    ),
    directoryRequiresActiveSubscription: parseBoolean(
      settings.directory_requires_active_subscription,
      DEFAULT_DIRECTORY_SETTINGS.directoryRequiresActiveSubscription,
    ),
  };
}

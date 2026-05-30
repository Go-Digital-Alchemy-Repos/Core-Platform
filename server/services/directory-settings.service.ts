import { storage } from "../storage";
import {
  DIRECTORY_LABEL_PRESETS,
  DIRECTORY_MODES,
  type DirectoryMode,
  type PublicDirectorySettings,
} from "@shared/types/directory-settings";

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

function parseDirectoryMode(value: string | undefined): DirectoryMode {
  return DIRECTORY_MODES.includes(value as DirectoryMode) ? (value as DirectoryMode) : "therapists";
}

function parseLabel(value: string | undefined, fallback: string): string {
  const trimmed = value?.trim();
  return trimmed || fallback;
}

export const DEFAULT_DIRECTORY_SETTINGS: PublicDirectorySettings = {
  directoryMode: "therapists",
  ...DIRECTORY_LABEL_PRESETS.therapists,
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
  directoryRequiresApplicationProcess: true,
  directoryRequiresApprovedApplication: true,
  directoryRequiresActiveSubscription: true,
};

export type DirectorySettings = PublicDirectorySettings;

export async function getDirectorySettings(): Promise<DirectorySettings> {
  const settings = await storage.settings.getDecryptedCategory("directory_settings");
  const directoryMode = parseDirectoryMode(settings.directory_mode);
  const labelDefaults = DIRECTORY_LABEL_PRESETS[directoryMode];

  return {
    directoryMode,
    directoryLabelSingular: parseLabel(settings.directory_label_singular, labelDefaults.directoryLabelSingular),
    directoryLabelPlural: parseLabel(settings.directory_label_plural, labelDefaults.directoryLabelPlural),
    listingLabelSingular: parseLabel(settings.listing_label_singular, labelDefaults.listingLabelSingular),
    listingLabelPlural: parseLabel(settings.listing_label_plural, labelDefaults.listingLabelPlural),
    participantLabelSingular: parseLabel(settings.participant_label_singular, labelDefaults.participantLabelSingular),
    participantLabelPlural: parseLabel(settings.participant_label_plural, labelDefaults.participantLabelPlural),
    specialtyLabelPlural: parseLabel(settings.specialty_label_plural, labelDefaults.specialtyLabelPlural),
    profileTitleLabel: parseLabel(settings.profile_title_label, labelDefaults.profileTitleLabel),
    profileTitlePlaceholder: parseLabel(settings.profile_title_placeholder, labelDefaults.profileTitlePlaceholder),
    profileBioLabel: parseLabel(settings.profile_bio_label, labelDefaults.profileBioLabel),
    profileBioPlaceholder: parseLabel(settings.profile_bio_placeholder, labelDefaults.profileBioPlaceholder),
    credentialsLabel: parseLabel(settings.credentials_label, labelDefaults.credentialsLabel),
    credentialsPlaceholder: parseLabel(settings.credentials_placeholder, labelDefaults.credentialsPlaceholder),
    licenseNumberLabel: parseLabel(settings.license_number_label, labelDefaults.licenseNumberLabel),
    licenseNumberPlaceholder: parseLabel(settings.license_number_placeholder, labelDefaults.licenseNumberPlaceholder),
    practiceDetailsLabel: parseLabel(settings.practice_details_label, labelDefaults.practiceDetailsLabel),
    practiceModeLabel: parseLabel(settings.practice_mode_label, labelDefaults.practiceModeLabel),
    acceptingClientsLabel: parseLabel(settings.accepting_clients_label, labelDefaults.acceptingClientsLabel),
    acceptingClientsHelpText: parseLabel(settings.accepting_clients_help_text, labelDefaults.acceptingClientsHelpText),
    willingToTravelLabel: parseLabel(settings.willing_to_travel_label, labelDefaults.willingToTravelLabel),
    willingToTravelHelpText: parseLabel(settings.willing_to_travel_help_text, labelDefaults.willingToTravelHelpText),
    locationContactLabel: parseLabel(settings.location_contact_label, labelDefaults.locationContactLabel),
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
    directoryRequiresApplicationProcess: parseBoolean(
      settings.directory_requires_application_process,
      DEFAULT_DIRECTORY_SETTINGS.directoryRequiresApplicationProcess,
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

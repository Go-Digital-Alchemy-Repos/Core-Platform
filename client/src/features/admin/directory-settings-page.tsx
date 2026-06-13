import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AdminSidebar } from "./admin-sidebar";
import { TiersContent } from "./membership-tiers-page";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Save,
  Loader2,
  CreditCard,
  ClipboardList,
  Settings2,
  Camera,
  Eye,
  Home,
  MapPin,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  DIRECTORY_LABEL_PRESETS,
  DIRECTORY_PRIMARY_CTA_TYPES,
  type DirectoryMode,
  type DirectoryPrimaryCtaType,
} from "@shared/types/directory-settings";
import { useDirectorySettings } from "@/hooks/use-directory-settings";

type SettingsData = Record<string, Record<string, { value: string; isSecret: boolean }>>;

type DirectorySettingsValues = {
  directory_mode: DirectoryMode;
  directory_label_singular: string;
  directory_label_plural: string;
  listing_label_singular: string;
  listing_label_plural: string;
  participant_label_singular: string;
  participant_label_plural: string;
  specialty_label_plural: string;
  profile_title_label: string;
  profile_title_placeholder: string;
  profile_bio_label: string;
  profile_bio_placeholder: string;
  credentials_label: string;
  credentials_placeholder: string;
  license_number_label: string;
  license_number_placeholder: string;
  practice_details_label: string;
  practice_mode_label: string;
  accepting_clients_label: string;
  accepting_clients_help_text: string;
  willing_to_travel_label: string;
  willing_to_travel_help_text: string;
  location_contact_label: string;
  primary_cta_type: DirectoryPrimaryCtaType;
  primary_cta_label: string;
  show_profile_title: boolean;
  require_profile_title: boolean;
  show_profile_bio: boolean;
  require_profile_bio: boolean;
  show_specialties: boolean;
  require_specialties: boolean;
  show_languages: boolean;
  require_languages: boolean;
  show_credentials: boolean;
  require_credentials: boolean;
  show_license_number: boolean;
  require_license_number: boolean;
  show_practice_mode: boolean;
  require_practice_mode: boolean;
  show_availability_status: boolean;
  show_travel_option: boolean;
  show_location_fields: boolean;
  require_location_fields: boolean;
  show_phone: boolean;
  require_phone: boolean;
  show_website: boolean;
  require_website: boolean;
  show_social_links: boolean;
  show_gallery: boolean;
  require_gallery: boolean;
  gallery_label: string;
  gallery_help_text: string;
  gallery_min_images: string;
  gallery_max_images: string;
  application_fee_amount_usd: string;
  application_fee_notice_title: string;
  application_fee_notice_body: string;
  application_fee_policy_summary: string;
  application_fee_credit_on_approval: boolean;
  application_fee_credit_amount_usd: string;
  renewal_reminder_days: string;
  payment_failure_grace_hours: string;
  suspend_listing_on_past_due: boolean;
  directory_requires_application_process: boolean;
  directory_requires_approved_application: boolean;
  directory_requires_active_subscription: boolean;
};

const DEFAULT_VALUES: DirectorySettingsValues = {
  directory_mode: "therapists",
  directory_label_singular: DIRECTORY_LABEL_PRESETS.therapists.directoryLabelSingular,
  directory_label_plural: DIRECTORY_LABEL_PRESETS.therapists.directoryLabelPlural,
  listing_label_singular: DIRECTORY_LABEL_PRESETS.therapists.listingLabelSingular,
  listing_label_plural: DIRECTORY_LABEL_PRESETS.therapists.listingLabelPlural,
  participant_label_singular: DIRECTORY_LABEL_PRESETS.therapists.participantLabelSingular,
  participant_label_plural: DIRECTORY_LABEL_PRESETS.therapists.participantLabelPlural,
  specialty_label_plural: DIRECTORY_LABEL_PRESETS.therapists.specialtyLabelPlural,
  profile_title_label: DIRECTORY_LABEL_PRESETS.therapists.profileTitleLabel,
  profile_title_placeholder: DIRECTORY_LABEL_PRESETS.therapists.profileTitlePlaceholder,
  profile_bio_label: DIRECTORY_LABEL_PRESETS.therapists.profileBioLabel,
  profile_bio_placeholder: DIRECTORY_LABEL_PRESETS.therapists.profileBioPlaceholder,
  credentials_label: DIRECTORY_LABEL_PRESETS.therapists.credentialsLabel,
  credentials_placeholder: DIRECTORY_LABEL_PRESETS.therapists.credentialsPlaceholder,
  license_number_label: DIRECTORY_LABEL_PRESETS.therapists.licenseNumberLabel,
  license_number_placeholder: DIRECTORY_LABEL_PRESETS.therapists.licenseNumberPlaceholder,
  practice_details_label: DIRECTORY_LABEL_PRESETS.therapists.practiceDetailsLabel,
  practice_mode_label: DIRECTORY_LABEL_PRESETS.therapists.practiceModeLabel,
  accepting_clients_label: DIRECTORY_LABEL_PRESETS.therapists.acceptingClientsLabel,
  accepting_clients_help_text: DIRECTORY_LABEL_PRESETS.therapists.acceptingClientsHelpText,
  willing_to_travel_label: DIRECTORY_LABEL_PRESETS.therapists.willingToTravelLabel,
  willing_to_travel_help_text: DIRECTORY_LABEL_PRESETS.therapists.willingToTravelHelpText,
  location_contact_label: DIRECTORY_LABEL_PRESETS.therapists.locationContactLabel,
  primary_cta_type: DIRECTORY_LABEL_PRESETS.therapists.primaryCtaType,
  primary_cta_label: DIRECTORY_LABEL_PRESETS.therapists.primaryCtaLabel,
  show_profile_title: DIRECTORY_LABEL_PRESETS.therapists.showProfileTitle,
  require_profile_title: DIRECTORY_LABEL_PRESETS.therapists.requireProfileTitle,
  show_profile_bio: DIRECTORY_LABEL_PRESETS.therapists.showProfileBio,
  require_profile_bio: DIRECTORY_LABEL_PRESETS.therapists.requireProfileBio,
  show_specialties: DIRECTORY_LABEL_PRESETS.therapists.showSpecialties,
  require_specialties: DIRECTORY_LABEL_PRESETS.therapists.requireSpecialties,
  show_languages: DIRECTORY_LABEL_PRESETS.therapists.showLanguages,
  require_languages: DIRECTORY_LABEL_PRESETS.therapists.requireLanguages,
  show_credentials: DIRECTORY_LABEL_PRESETS.therapists.showCredentials,
  require_credentials: DIRECTORY_LABEL_PRESETS.therapists.requireCredentials,
  show_license_number: DIRECTORY_LABEL_PRESETS.therapists.showLicenseNumber,
  require_license_number: DIRECTORY_LABEL_PRESETS.therapists.requireLicenseNumber,
  show_practice_mode: DIRECTORY_LABEL_PRESETS.therapists.showPracticeMode,
  require_practice_mode: DIRECTORY_LABEL_PRESETS.therapists.requirePracticeMode,
  show_availability_status: DIRECTORY_LABEL_PRESETS.therapists.showAvailabilityStatus,
  show_travel_option: DIRECTORY_LABEL_PRESETS.therapists.showTravelOption,
  show_location_fields: DIRECTORY_LABEL_PRESETS.therapists.showLocationFields,
  require_location_fields: DIRECTORY_LABEL_PRESETS.therapists.requireLocationFields,
  show_phone: DIRECTORY_LABEL_PRESETS.therapists.showPhone,
  require_phone: DIRECTORY_LABEL_PRESETS.therapists.requirePhone,
  show_website: DIRECTORY_LABEL_PRESETS.therapists.showWebsite,
  require_website: DIRECTORY_LABEL_PRESETS.therapists.requireWebsite,
  show_social_links: DIRECTORY_LABEL_PRESETS.therapists.showSocialLinks,
  show_gallery: DIRECTORY_LABEL_PRESETS.therapists.showGallery,
  require_gallery: DIRECTORY_LABEL_PRESETS.therapists.requireGallery,
  gallery_label: DIRECTORY_LABEL_PRESETS.therapists.galleryLabel,
  gallery_help_text: DIRECTORY_LABEL_PRESETS.therapists.galleryHelpText,
  gallery_min_images: String(DIRECTORY_LABEL_PRESETS.therapists.galleryMinImages),
  gallery_max_images: String(DIRECTORY_LABEL_PRESETS.therapists.galleryMaxImages),
  application_fee_amount_usd: "150.00",
  application_fee_notice_title: "Application Fee",
  application_fee_notice_body:
    "Before your directory listing can be reviewed, an application fee is required. If you are approved, that amount can be credited toward your first membership invoice. If your application is denied, the fee is non-refundable.",
  application_fee_policy_summary:
    "The application fee is collected before your application enters review. Approved applicants can have that amount credited toward their first membership invoice. Denied applications do not receive a refund.",
  application_fee_credit_on_approval: true,
  application_fee_credit_amount_usd: "150.00",
  renewal_reminder_days: "30",
  payment_failure_grace_hours: "48",
  suspend_listing_on_past_due: true,
  directory_requires_application_process: true,
  directory_requires_approved_application: true,
  directory_requires_active_subscription: true,
};

function normalizeBoolean(value: string | undefined, fallback: boolean) {
  if (!value) return fallback;
  const normalized = value.trim().toLowerCase();
  if (["true", "1", "yes", "on", "enabled"].includes(normalized)) return true;
  if (["false", "0", "no", "off", "disabled"].includes(normalized)) return false;
  return fallback;
}

function normalizeDirectoryMode(value: string | undefined): DirectoryMode {
  return value && value in DIRECTORY_LABEL_PRESETS
    ? (value as DirectoryMode)
    : DEFAULT_VALUES.directory_mode;
}

function normalizePrimaryCtaType(value: string | undefined, fallback: DirectoryPrimaryCtaType) {
  return DIRECTORY_PRIMARY_CTA_TYPES.includes(value as DirectoryPrimaryCtaType)
    ? (value as DirectoryPrimaryCtaType)
    : fallback;
}

function presetToStoredValues(
  mode: DirectoryMode,
): Pick<
  DirectorySettingsValues,
  | "directory_label_singular"
  | "directory_label_plural"
  | "listing_label_singular"
  | "listing_label_plural"
  | "participant_label_singular"
  | "participant_label_plural"
  | "specialty_label_plural"
  | "profile_title_label"
  | "profile_title_placeholder"
  | "profile_bio_label"
  | "profile_bio_placeholder"
  | "credentials_label"
  | "credentials_placeholder"
  | "license_number_label"
  | "license_number_placeholder"
  | "practice_details_label"
  | "practice_mode_label"
  | "accepting_clients_label"
  | "accepting_clients_help_text"
  | "willing_to_travel_label"
  | "willing_to_travel_help_text"
  | "location_contact_label"
  | "primary_cta_type"
  | "primary_cta_label"
  | "show_profile_title"
  | "require_profile_title"
  | "show_profile_bio"
  | "require_profile_bio"
  | "show_specialties"
  | "require_specialties"
  | "show_languages"
  | "require_languages"
  | "show_credentials"
  | "require_credentials"
  | "show_license_number"
  | "require_license_number"
  | "show_practice_mode"
  | "require_practice_mode"
  | "show_availability_status"
  | "show_travel_option"
  | "show_location_fields"
  | "require_location_fields"
  | "show_phone"
  | "require_phone"
  | "show_website"
  | "require_website"
  | "show_social_links"
  | "show_gallery"
  | "require_gallery"
  | "gallery_label"
  | "gallery_help_text"
  | "gallery_min_images"
  | "gallery_max_images"
> {
  const preset = DIRECTORY_LABEL_PRESETS[mode];
  return {
    directory_label_singular: preset.directoryLabelSingular,
    directory_label_plural: preset.directoryLabelPlural,
    listing_label_singular: preset.listingLabelSingular,
    listing_label_plural: preset.listingLabelPlural,
    participant_label_singular: preset.participantLabelSingular,
    participant_label_plural: preset.participantLabelPlural,
    specialty_label_plural: preset.specialtyLabelPlural,
    profile_title_label: preset.profileTitleLabel,
    profile_title_placeholder: preset.profileTitlePlaceholder,
    profile_bio_label: preset.profileBioLabel,
    profile_bio_placeholder: preset.profileBioPlaceholder,
    credentials_label: preset.credentialsLabel,
    credentials_placeholder: preset.credentialsPlaceholder,
    license_number_label: preset.licenseNumberLabel,
    license_number_placeholder: preset.licenseNumberPlaceholder,
    practice_details_label: preset.practiceDetailsLabel,
    practice_mode_label: preset.practiceModeLabel,
    accepting_clients_label: preset.acceptingClientsLabel,
    accepting_clients_help_text: preset.acceptingClientsHelpText,
    willing_to_travel_label: preset.willingToTravelLabel,
    willing_to_travel_help_text: preset.willingToTravelHelpText,
    location_contact_label: preset.locationContactLabel,
    primary_cta_type: preset.primaryCtaType,
    primary_cta_label: preset.primaryCtaLabel,
    show_profile_title: preset.showProfileTitle,
    require_profile_title: preset.requireProfileTitle,
    show_profile_bio: preset.showProfileBio,
    require_profile_bio: preset.requireProfileBio,
    show_specialties: preset.showSpecialties,
    require_specialties: preset.requireSpecialties,
    show_languages: preset.showLanguages,
    require_languages: preset.requireLanguages,
    show_credentials: preset.showCredentials,
    require_credentials: preset.requireCredentials,
    show_license_number: preset.showLicenseNumber,
    require_license_number: preset.requireLicenseNumber,
    show_practice_mode: preset.showPracticeMode,
    require_practice_mode: preset.requirePracticeMode,
    show_availability_status: preset.showAvailabilityStatus,
    show_travel_option: preset.showTravelOption,
    show_location_fields: preset.showLocationFields,
    require_location_fields: preset.requireLocationFields,
    show_phone: preset.showPhone,
    require_phone: preset.requirePhone,
    show_website: preset.showWebsite,
    require_website: preset.requireWebsite,
    show_social_links: preset.showSocialLinks,
    show_gallery: preset.showGallery,
    require_gallery: preset.requireGallery,
    gallery_label: preset.galleryLabel,
    gallery_help_text: preset.galleryHelpText,
    gallery_min_images: String(preset.galleryMinImages),
    gallery_max_images: String(preset.galleryMaxImages),
  };
}

function DirectoryApplicationSettingsTab() {
  const { toast } = useToast();
  const { data: settings } = useQuery<SettingsData>({
    queryKey: ["/api/admin/settings"],
  });

  const stored = settings?.directory_settings || {};
  const storedSnapshot = useMemo(() => JSON.stringify(stored), [stored]);

  const computedDefaults = useMemo<DirectorySettingsValues>(() => {
    const directoryMode = normalizeDirectoryMode(stored.directory_mode?.value);
    const preset = presetToStoredValues(directoryMode);

    return {
      directory_mode: directoryMode,
      directory_label_singular:
        stored.directory_label_singular?.value || preset.directory_label_singular,
      directory_label_plural: stored.directory_label_plural?.value || preset.directory_label_plural,
      listing_label_singular: stored.listing_label_singular?.value || preset.listing_label_singular,
      listing_label_plural: stored.listing_label_plural?.value || preset.listing_label_plural,
      participant_label_singular:
        stored.participant_label_singular?.value || preset.participant_label_singular,
      participant_label_plural:
        stored.participant_label_plural?.value || preset.participant_label_plural,
      specialty_label_plural: stored.specialty_label_plural?.value || preset.specialty_label_plural,
      profile_title_label: stored.profile_title_label?.value || preset.profile_title_label,
      profile_title_placeholder:
        stored.profile_title_placeholder?.value || preset.profile_title_placeholder,
      profile_bio_label: stored.profile_bio_label?.value || preset.profile_bio_label,
      profile_bio_placeholder:
        stored.profile_bio_placeholder?.value || preset.profile_bio_placeholder,
      credentials_label: stored.credentials_label?.value || preset.credentials_label,
      credentials_placeholder:
        stored.credentials_placeholder?.value || preset.credentials_placeholder,
      license_number_label: stored.license_number_label?.value || preset.license_number_label,
      license_number_placeholder:
        stored.license_number_placeholder?.value || preset.license_number_placeholder,
      practice_details_label: stored.practice_details_label?.value || preset.practice_details_label,
      practice_mode_label: stored.practice_mode_label?.value || preset.practice_mode_label,
      accepting_clients_label:
        stored.accepting_clients_label?.value || preset.accepting_clients_label,
      accepting_clients_help_text:
        stored.accepting_clients_help_text?.value || preset.accepting_clients_help_text,
      willing_to_travel_label:
        stored.willing_to_travel_label?.value || preset.willing_to_travel_label,
      willing_to_travel_help_text:
        stored.willing_to_travel_help_text?.value || preset.willing_to_travel_help_text,
      location_contact_label: stored.location_contact_label?.value || preset.location_contact_label,
      primary_cta_type: normalizePrimaryCtaType(
        stored.primary_cta_type?.value,
        preset.primary_cta_type,
      ),
      primary_cta_label: stored.primary_cta_label?.value || preset.primary_cta_label,
      show_profile_title: normalizeBoolean(
        stored.show_profile_title?.value,
        preset.show_profile_title,
      ),
      require_profile_title: normalizeBoolean(
        stored.require_profile_title?.value,
        preset.require_profile_title,
      ),
      show_profile_bio: normalizeBoolean(stored.show_profile_bio?.value, preset.show_profile_bio),
      require_profile_bio: normalizeBoolean(
        stored.require_profile_bio?.value,
        preset.require_profile_bio,
      ),
      show_specialties: normalizeBoolean(stored.show_specialties?.value, preset.show_specialties),
      require_specialties: normalizeBoolean(
        stored.require_specialties?.value,
        preset.require_specialties,
      ),
      show_languages: normalizeBoolean(stored.show_languages?.value, preset.show_languages),
      require_languages: normalizeBoolean(
        stored.require_languages?.value,
        preset.require_languages,
      ),
      show_credentials: normalizeBoolean(stored.show_credentials?.value, preset.show_credentials),
      require_credentials: normalizeBoolean(
        stored.require_credentials?.value,
        preset.require_credentials,
      ),
      show_license_number: normalizeBoolean(
        stored.show_license_number?.value,
        preset.show_license_number,
      ),
      require_license_number: normalizeBoolean(
        stored.require_license_number?.value,
        preset.require_license_number,
      ),
      show_practice_mode: normalizeBoolean(
        stored.show_practice_mode?.value,
        preset.show_practice_mode,
      ),
      require_practice_mode: normalizeBoolean(
        stored.require_practice_mode?.value,
        preset.require_practice_mode,
      ),
      show_availability_status: normalizeBoolean(
        stored.show_availability_status?.value,
        preset.show_availability_status,
      ),
      show_travel_option: normalizeBoolean(
        stored.show_travel_option?.value,
        preset.show_travel_option,
      ),
      show_location_fields: normalizeBoolean(
        stored.show_location_fields?.value,
        preset.show_location_fields,
      ),
      require_location_fields: normalizeBoolean(
        stored.require_location_fields?.value,
        preset.require_location_fields,
      ),
      show_phone: normalizeBoolean(stored.show_phone?.value, preset.show_phone),
      require_phone: normalizeBoolean(stored.require_phone?.value, preset.require_phone),
      show_website: normalizeBoolean(stored.show_website?.value, preset.show_website),
      require_website: normalizeBoolean(stored.require_website?.value, preset.require_website),
      show_social_links: normalizeBoolean(
        stored.show_social_links?.value,
        preset.show_social_links,
      ),
      show_gallery: normalizeBoolean(stored.show_gallery?.value, preset.show_gallery),
      require_gallery: normalizeBoolean(stored.require_gallery?.value, preset.require_gallery),
      gallery_label: stored.gallery_label?.value || preset.gallery_label,
      gallery_help_text: stored.gallery_help_text?.value || preset.gallery_help_text,
      gallery_min_images: stored.gallery_min_images?.value || preset.gallery_min_images,
      gallery_max_images: stored.gallery_max_images?.value || preset.gallery_max_images,
      application_fee_amount_usd:
        stored.application_fee_amount_usd?.value || DEFAULT_VALUES.application_fee_amount_usd,
      application_fee_notice_title:
        stored.application_fee_notice_title?.value || DEFAULT_VALUES.application_fee_notice_title,
      application_fee_notice_body:
        stored.application_fee_notice_body?.value || DEFAULT_VALUES.application_fee_notice_body,
      application_fee_policy_summary:
        stored.application_fee_policy_summary?.value ||
        DEFAULT_VALUES.application_fee_policy_summary,
      application_fee_credit_on_approval: normalizeBoolean(
        stored.application_fee_credit_on_approval?.value,
        DEFAULT_VALUES.application_fee_credit_on_approval,
      ),
      application_fee_credit_amount_usd:
        stored.application_fee_credit_amount_usd?.value ||
        DEFAULT_VALUES.application_fee_credit_amount_usd,
      renewal_reminder_days:
        stored.renewal_reminder_days?.value || DEFAULT_VALUES.renewal_reminder_days,
      payment_failure_grace_hours:
        stored.payment_failure_grace_hours?.value || DEFAULT_VALUES.payment_failure_grace_hours,
      suspend_listing_on_past_due: normalizeBoolean(
        stored.suspend_listing_on_past_due?.value,
        DEFAULT_VALUES.suspend_listing_on_past_due,
      ),
      directory_requires_application_process: normalizeBoolean(
        stored.directory_requires_application_process?.value,
        DEFAULT_VALUES.directory_requires_application_process,
      ),
      directory_requires_approved_application: normalizeBoolean(
        stored.directory_requires_approved_application?.value,
        DEFAULT_VALUES.directory_requires_approved_application,
      ),
      directory_requires_active_subscription: normalizeBoolean(
        stored.directory_requires_active_subscription?.value,
        DEFAULT_VALUES.directory_requires_active_subscription,
      ),
    };
  }, [stored]);

  const [values, setValues] = useState<DirectorySettingsValues>(computedDefaults);

  useEffect(() => {
    setValues(computedDefaults);
  }, [storedSnapshot]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payloads = [
        { key: "directory_mode", value: values.directory_mode },
        { key: "directory_label_singular", value: values.directory_label_singular },
        { key: "directory_label_plural", value: values.directory_label_plural },
        { key: "listing_label_singular", value: values.listing_label_singular },
        { key: "listing_label_plural", value: values.listing_label_plural },
        { key: "participant_label_singular", value: values.participant_label_singular },
        { key: "participant_label_plural", value: values.participant_label_plural },
        { key: "specialty_label_plural", value: values.specialty_label_plural },
        { key: "profile_title_label", value: values.profile_title_label },
        { key: "profile_title_placeholder", value: values.profile_title_placeholder },
        { key: "profile_bio_label", value: values.profile_bio_label },
        { key: "profile_bio_placeholder", value: values.profile_bio_placeholder },
        { key: "credentials_label", value: values.credentials_label },
        { key: "credentials_placeholder", value: values.credentials_placeholder },
        { key: "license_number_label", value: values.license_number_label },
        { key: "license_number_placeholder", value: values.license_number_placeholder },
        { key: "practice_details_label", value: values.practice_details_label },
        { key: "practice_mode_label", value: values.practice_mode_label },
        { key: "accepting_clients_label", value: values.accepting_clients_label },
        { key: "accepting_clients_help_text", value: values.accepting_clients_help_text },
        { key: "willing_to_travel_label", value: values.willing_to_travel_label },
        { key: "willing_to_travel_help_text", value: values.willing_to_travel_help_text },
        { key: "location_contact_label", value: values.location_contact_label },
        { key: "primary_cta_type", value: values.primary_cta_type },
        { key: "primary_cta_label", value: values.primary_cta_label },
        { key: "show_profile_title", value: values.show_profile_title ? "true" : "false" },
        { key: "require_profile_title", value: values.require_profile_title ? "true" : "false" },
        { key: "show_profile_bio", value: values.show_profile_bio ? "true" : "false" },
        { key: "require_profile_bio", value: values.require_profile_bio ? "true" : "false" },
        { key: "show_specialties", value: values.show_specialties ? "true" : "false" },
        { key: "require_specialties", value: values.require_specialties ? "true" : "false" },
        { key: "show_languages", value: values.show_languages ? "true" : "false" },
        { key: "require_languages", value: values.require_languages ? "true" : "false" },
        { key: "show_credentials", value: values.show_credentials ? "true" : "false" },
        { key: "require_credentials", value: values.require_credentials ? "true" : "false" },
        { key: "show_license_number", value: values.show_license_number ? "true" : "false" },
        { key: "require_license_number", value: values.require_license_number ? "true" : "false" },
        { key: "show_practice_mode", value: values.show_practice_mode ? "true" : "false" },
        { key: "require_practice_mode", value: values.require_practice_mode ? "true" : "false" },
        {
          key: "show_availability_status",
          value: values.show_availability_status ? "true" : "false",
        },
        { key: "show_travel_option", value: values.show_travel_option ? "true" : "false" },
        { key: "show_location_fields", value: values.show_location_fields ? "true" : "false" },
        {
          key: "require_location_fields",
          value: values.require_location_fields ? "true" : "false",
        },
        { key: "show_phone", value: values.show_phone ? "true" : "false" },
        { key: "require_phone", value: values.require_phone ? "true" : "false" },
        { key: "show_website", value: values.show_website ? "true" : "false" },
        { key: "require_website", value: values.require_website ? "true" : "false" },
        { key: "show_social_links", value: values.show_social_links ? "true" : "false" },
        { key: "show_gallery", value: values.show_gallery ? "true" : "false" },
        { key: "require_gallery", value: values.require_gallery ? "true" : "false" },
        { key: "gallery_label", value: values.gallery_label },
        { key: "gallery_help_text", value: values.gallery_help_text },
        { key: "gallery_min_images", value: values.gallery_min_images },
        { key: "gallery_max_images", value: values.gallery_max_images },
        { key: "application_fee_amount_usd", value: values.application_fee_amount_usd },
        { key: "application_fee_notice_title", value: values.application_fee_notice_title },
        { key: "application_fee_notice_body", value: values.application_fee_notice_body },
        { key: "application_fee_policy_summary", value: values.application_fee_policy_summary },
        {
          key: "application_fee_credit_on_approval",
          value: values.application_fee_credit_on_approval ? "true" : "false",
        },
        {
          key: "application_fee_credit_amount_usd",
          value: values.application_fee_credit_amount_usd,
        },
        { key: "renewal_reminder_days", value: values.renewal_reminder_days },
        { key: "payment_failure_grace_hours", value: values.payment_failure_grace_hours },
        {
          key: "suspend_listing_on_past_due",
          value: values.suspend_listing_on_past_due ? "true" : "false",
        },
        {
          key: "directory_requires_application_process",
          value: values.directory_requires_application_process ? "true" : "false",
        },
        {
          key: "directory_requires_approved_application",
          value: values.directory_requires_approved_application ? "true" : "false",
        },
        {
          key: "directory_requires_active_subscription",
          value: values.directory_requires_active_subscription ? "true" : "false",
        },
      ];

      await Promise.all(
        payloads.map((entry) =>
          apiRequest("PUT", "/api/admin/settings", {
            key: entry.key,
            value: entry.value,
            category: "directory_settings",
            isSecret: false,
          }),
        ),
      );
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/admin/settings"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/directory-settings"] }),
      ]);
      toast({ title: "Directory application settings updated" });
    },
    onError: (error: Error) => {
      toast({
        title: "Could not save directory settings",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const hasChanges = JSON.stringify(values) !== JSON.stringify(computedDefaults);
  const labelFields = [
    { key: "directory_label_singular" as const, label: "Directory Name" },
    { key: "directory_label_plural" as const, label: "Directory Navigation Label" },
    { key: "listing_label_singular" as const, label: "Single Listing Label" },
    { key: "listing_label_plural" as const, label: "Multiple Listings Label" },
    { key: "participant_label_singular" as const, label: "Single Participant Label" },
    { key: "participant_label_plural" as const, label: "Multiple Participants Label" },
    { key: "specialty_label_plural" as const, label: "Specialty/Category Label" },
  ];
  const profileFieldLabels = [
    { key: "profile_title_label" as const, label: "Title Field Label" },
    { key: "profile_bio_label" as const, label: "Bio/Description Label" },
    { key: "credentials_label" as const, label: "Credentials/Features Label" },
    { key: "license_number_label" as const, label: "License/Reference Label" },
    { key: "practice_details_label" as const, label: "Details Section Label" },
    { key: "practice_mode_label" as const, label: "Format Field Label" },
    { key: "accepting_clients_label" as const, label: "Availability Toggle Label" },
    { key: "willing_to_travel_label" as const, label: "Travel/Mobile Toggle Label" },
    { key: "location_contact_label" as const, label: "Location Section Label" },
  ];
  const profileFieldPlaceholders = [
    { key: "profile_title_placeholder" as const, label: "Title Placeholder" },
    { key: "profile_bio_placeholder" as const, label: "Bio/Description Placeholder" },
    { key: "credentials_placeholder" as const, label: "Credentials/Features Placeholder" },
    { key: "license_number_placeholder" as const, label: "License/Reference Placeholder" },
    { key: "accepting_clients_help_text" as const, label: "Availability Help Text" },
    { key: "willing_to_travel_help_text" as const, label: "Travel/Mobile Help Text" },
  ];
  const profileFieldControls = [
    {
      label: values.profile_title_label,
      showKey: "show_profile_title" as const,
      requireKey: "require_profile_title" as const,
    },
    {
      label: values.profile_bio_label,
      showKey: "show_profile_bio" as const,
      requireKey: "require_profile_bio" as const,
    },
    {
      label: values.specialty_label_plural,
      showKey: "show_specialties" as const,
      requireKey: "require_specialties" as const,
    },
    {
      label: "Languages",
      showKey: "show_languages" as const,
      requireKey: "require_languages" as const,
    },
    {
      label: values.credentials_label,
      showKey: "show_credentials" as const,
      requireKey: "require_credentials" as const,
    },
    {
      label: values.license_number_label,
      showKey: "show_license_number" as const,
      requireKey: "require_license_number" as const,
    },
    {
      label: values.practice_mode_label,
      showKey: "show_practice_mode" as const,
      requireKey: "require_practice_mode" as const,
    },
    {
      label: values.location_contact_label,
      showKey: "show_location_fields" as const,
      requireKey: "require_location_fields" as const,
    },
    { label: "Phone", showKey: "show_phone" as const, requireKey: "require_phone" as const },
    { label: "Website", showKey: "show_website" as const, requireKey: "require_website" as const },
  ];
  const profileToggleControls = [
    { label: values.accepting_clients_label, key: "show_availability_status" as const },
    { label: values.willing_to_travel_label, key: "show_travel_option" as const },
    { label: "Social links", key: "show_social_links" as const },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-heading font-semibold">Application Settings</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Control whether listings use the application workflow, then tune approval, billing, and
          fee rules.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ClipboardList className="h-4 w-4 text-primary" />
            Application Process
          </CardTitle>
          <CardDescription>
            Keep the current application workflow available, but make it optional for directories
            that only need direct profile setup.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-start justify-between gap-4 rounded-lg border p-4">
            <div className="space-y-1">
              <Label htmlFor="directory_requires_application_process">
                {values.directory_requires_application_process
                  ? "Application process enabled"
                  : "Application process disabled"}
              </Label>
              <p className="text-sm text-muted-foreground">
                {values.directory_requires_application_process
                  ? `New ${values.participant_label_plural.toLowerCase()} complete the existing application before they can move into approval and membership steps.`
                  : `New ${values.participant_label_plural.toLowerCase()} skip the application wizard and go directly to ${values.listing_label_singular.toLowerCase()} setup.`}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setValues((current) => ({
                    ...current,
                    directory_requires_application_process:
                      !current.directory_requires_application_process,
                  }))
                }
                data-testid="button-toggle-application-process"
              >
                {values.directory_requires_application_process ? "Disable" : "Enable"}
              </Button>
              <Switch
                id="directory_requires_application_process"
                checked={values.directory_requires_application_process}
                onCheckedChange={(checked) =>
                  setValues((current) => ({
                    ...current,
                    directory_requires_application_process: checked,
                  }))
                }
                aria-label="Toggle application process"
                data-testid="switch-directory-requires-application-process"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Settings2 className="h-4 w-4 text-primary" />
            Directory Identity
          </CardTitle>
          <CardDescription>
            Choose a preset and customize the visible language used for this directory experience.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="directory_mode">Directory Type</Label>
              <div className="flex gap-2">
                <Select
                  value={values.directory_mode}
                  onValueChange={(mode) => {
                    const nextMode = mode as DirectoryMode;
                    setValues((current) => ({
                      ...current,
                      directory_mode: nextMode,
                      ...(nextMode === "custom" ? {} : presetToStoredValues(nextMode)),
                    }));
                  }}
                >
                  <SelectTrigger id="directory_mode" data-testid="select-directory-mode">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="therapists">Therapists</SelectItem>
                    <SelectItem value="locations">Locations</SelectItem>
                    <SelectItem value="service_providers">Service Providers</SelectItem>
                    <SelectItem value="real_estate">Real Estate Listings</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
                {values.directory_mode !== "custom" && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      setValues((current) => ({
                        ...current,
                        ...presetToStoredValues(current.directory_mode),
                      }))
                    }
                    data-testid="button-apply-directory-preset"
                  >
                    Apply Preset
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Choosing a preset updates the labels and profile field settings below. Save to
                publish the changes.
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {labelFields.map((field) => (
              <div key={field.key} className="space-y-2">
                <Label htmlFor={field.key}>{field.label}</Label>
                <Input
                  id={field.key}
                  value={values[field.key]}
                  onChange={(event) =>
                    setValues((current) => ({
                      ...current,
                      directory_mode: "custom",
                      [field.key]: event.target.value,
                    }))
                  }
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Camera className="h-4 w-4 text-primary" />
            Profile Gallery
          </CardTitle>
          <CardDescription>
            Enable reusable photo galleries for any {values.listing_label_singular.toLowerCase()}{" "}
            type. Real estate listings require galleries by default.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start justify-between gap-4 rounded-lg border p-4">
            <div className="space-y-1">
              <Label htmlFor="show_gallery">
                {values.show_gallery ? `${values.gallery_label} enabled` : "Gallery disabled"}
              </Label>
              <p className="text-sm text-muted-foreground">{values.gallery_help_text}</p>
            </div>
            <Switch
              id="show_gallery"
              checked={values.show_gallery}
              onCheckedChange={(checked) =>
                setValues((current) => ({
                  ...current,
                  show_gallery: checked,
                  require_gallery: checked ? current.require_gallery : false,
                }))
              }
              data-testid="switch-show-gallery"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="gallery_label">Gallery Label</Label>
              <Input
                id="gallery_label"
                value={values.gallery_label}
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    directory_mode: "custom",
                    gallery_label: event.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gallery_help_text">Gallery Help Text</Label>
              <Input
                id="gallery_help_text"
                value={values.gallery_help_text}
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    directory_mode: "custom",
                    gallery_help_text: event.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gallery_min_images">Minimum Images</Label>
              <Input
                id="gallery_min_images"
                value={values.gallery_min_images}
                disabled={!values.show_gallery}
                onChange={(event) =>
                  setValues((current) => ({ ...current, gallery_min_images: event.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gallery_max_images">Maximum Images</Label>
              <Input
                id="gallery_max_images"
                value={values.gallery_max_images}
                disabled={!values.show_gallery}
                onChange={(event) =>
                  setValues((current) => ({ ...current, gallery_max_images: event.target.value }))
                }
              />
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
            <Label htmlFor="require_gallery" className="text-sm">
              Require gallery before publishing
            </Label>
            <Switch
              id="require_gallery"
              checked={values.require_gallery}
              disabled={!values.show_gallery}
              onCheckedChange={(checked) =>
                setValues((current) => ({ ...current, require_gallery: checked }))
              }
              data-testid="switch-require-gallery"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Settings2 className="h-4 w-4 text-primary" />
            Profile Field Labels
          </CardTitle>
          <CardDescription>
            Customize the visible labels and hints used when participants edit a{" "}
            {values.listing_label_singular.toLowerCase()}.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            {profileFieldLabels.map((field) => (
              <div key={field.key} className="space-y-2">
                <Label htmlFor={field.key}>{field.label}</Label>
                <Input
                  id={field.key}
                  value={values[field.key]}
                  onChange={(event) =>
                    setValues((current) => ({
                      ...current,
                      directory_mode: "custom",
                      [field.key]: event.target.value,
                    }))
                  }
                />
              </div>
            ))}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {profileFieldPlaceholders.map((field) => (
              <div key={field.key} className="space-y-2">
                <Label htmlFor={field.key}>{field.label}</Label>
                <Input
                  id={field.key}
                  value={values[field.key]}
                  onChange={(event) =>
                    setValues((current) => ({
                      ...current,
                      directory_mode: "custom",
                      [field.key]: event.target.value,
                    }))
                  }
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Settings2 className="h-4 w-4 text-primary" />
            Profile Field Visibility
          </CardTitle>
          <CardDescription>
            Choose which fields appear on participant edit screens and which visible fields must be
            completed.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="overflow-hidden rounded-lg border">
            <div className="grid grid-cols-[1fr_92px_92px] gap-3 bg-muted/40 px-4 py-2 text-xs font-medium text-muted-foreground">
              <span>Field</span>
              <span className="text-center">Show</span>
              <span className="text-center">Required</span>
            </div>
            {profileFieldControls.map((field) => (
              <div
                key={field.showKey}
                className="grid grid-cols-[1fr_92px_92px] items-center gap-3 border-t px-4 py-3"
              >
                <span className="text-sm font-medium">{field.label}</span>
                <div className="flex justify-center">
                  <Switch
                    checked={values[field.showKey]}
                    onCheckedChange={(checked) =>
                      setValues((current) => ({
                        ...current,
                        [field.showKey]: checked,
                        [field.requireKey]: checked ? current[field.requireKey] : false,
                      }))
                    }
                  />
                </div>
                <div className="flex justify-center">
                  <Switch
                    checked={values[field.requireKey]}
                    disabled={!values[field.showKey]}
                    onCheckedChange={(checked) =>
                      setValues((current) => ({ ...current, [field.requireKey]: checked }))
                    }
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            {profileToggleControls.map((field) => (
              <div
                key={field.key}
                className="flex items-center justify-between gap-3 rounded-lg border p-3"
              >
                <Label className="text-sm">{field.label}</Label>
                <Switch
                  checked={values[field.key]}
                  onCheckedChange={(checked) =>
                    setValues((current) => ({ ...current, [field.key]: checked }))
                  }
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Settings2 className="h-4 w-4 text-primary" />
            Profile Actions
          </CardTitle>
          <CardDescription>
            Configure the primary call to action shown on public{" "}
            {values.listing_label_plural.toLowerCase()}.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="primary_cta_type">Primary Action</Label>
            <Select
              value={values.primary_cta_type}
              onValueChange={(value) =>
                setValues((current) => ({
                  ...current,
                  primary_cta_type: value as DirectoryPrimaryCtaType,
                }))
              }
            >
              <SelectTrigger id="primary_cta_type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="contact_form">Contact Form</SelectItem>
                <SelectItem value="website">Website</SelectItem>
                <SelectItem value="phone">Phone</SelectItem>
                <SelectItem value="directions">Directions</SelectItem>
                <SelectItem value="none">None</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="primary_cta_label">Action Button Label</Label>
            <Input
              id="primary_cta_label"
              value={values.primary_cta_label}
              disabled={values.primary_cta_type === "none"}
              onChange={(event) =>
                setValues((current) => ({ ...current, primary_cta_label: event.target.value }))
              }
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CreditCard className="h-4 w-4 text-primary" />
            Fee Policy
          </CardTitle>
          <CardDescription>
            These settings only apply when the application process is enabled.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!values.directory_requires_application_process ? (
            <p className="rounded-md border bg-muted/40 p-3 text-sm text-muted-foreground">
              Application fees and fee-step copy are hidden because applicants are sent directly to{" "}
              {values.listing_label_singular.toLowerCase()} setup.
            </p>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="application_fee_amount_usd">Application Fee (USD)</Label>
                  <Input
                    id="application_fee_amount_usd"
                    value={values.application_fee_amount_usd}
                    onChange={(event) =>
                      setValues((current) => ({
                        ...current,
                        application_fee_amount_usd: event.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="application_fee_credit_amount_usd">
                    Credit Amount on Approval (USD)
                  </Label>
                  <Input
                    id="application_fee_credit_amount_usd"
                    value={values.application_fee_credit_amount_usd}
                    onChange={(event) =>
                      setValues((current) => ({
                        ...current,
                        application_fee_credit_amount_usd: event.target.value,
                      }))
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="application_fee_notice_title">Fee Step Heading</Label>
                <Input
                  id="application_fee_notice_title"
                  value={values.application_fee_notice_title}
                  onChange={(event) =>
                    setValues((current) => ({
                      ...current,
                      application_fee_notice_title: event.target.value,
                    }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="application_fee_notice_body">Fee Step Message</Label>
                <Textarea
                  id="application_fee_notice_body"
                  rows={4}
                  value={values.application_fee_notice_body}
                  onChange={(event) =>
                    setValues((current) => ({
                      ...current,
                      application_fee_notice_body: event.target.value,
                    }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="application_fee_policy_summary">Payment Summary Copy</Label>
                <Textarea
                  id="application_fee_policy_summary"
                  rows={3}
                  value={values.application_fee_policy_summary}
                  onChange={(event) =>
                    setValues((current) => ({
                      ...current,
                      application_fee_policy_summary: event.target.value,
                    }))
                  }
                />
              </div>

              <div className="flex items-start justify-between gap-4 rounded-xl border p-4">
                <div className="space-y-1">
                  <Label>Credit the fee after approval</Label>
                  <p className="text-xs text-muted-foreground">
                    When enabled, the application fee is applied as a one-time credit toward the
                    member&apos;s first membership invoice.
                  </p>
                </div>
                <Switch
                  checked={values.application_fee_credit_on_approval}
                  onCheckedChange={(checked) =>
                    setValues((current) => ({
                      ...current,
                      application_fee_credit_on_approval: checked,
                    }))
                  }
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ClipboardList className="h-4 w-4 text-primary" />
            Approval And Billing Rules
          </CardTitle>
          <CardDescription>
            Define when listings become visible, when reminders are sent, and how long a failed
            payment can remain unresolved before suspension.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="renewal_reminder_days">Renewal Reminder Lead Time (days)</Label>
              <Input
                id="renewal_reminder_days"
                value={values.renewal_reminder_days}
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    renewal_reminder_days: event.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="payment_failure_grace_hours">
                Failed Payment Grace Window (hours)
              </Label>
              <Input
                id="payment_failure_grace_hours"
                value={values.payment_failure_grace_hours}
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    payment_failure_grace_hours: event.target.value,
                  }))
                }
              />
            </div>
          </div>

          <div className="space-y-3">
            {[
              {
                key: "directory_requires_approved_application" as const,
                label: values.directory_requires_application_process
                  ? "Require approved application before listing"
                  : "Require admin approval before listing",
                description: `${values.listing_label_plural} remain hidden from the public ${values.directory_label_singular.toLowerCase()} until review is approved.`,
              },
              {
                key: "directory_requires_active_subscription" as const,
                label: "Require active subscription before listing",
                description:
                  "Profiles remain hidden if billing is inactive, past due, canceled, or suspended.",
              },
              {
                key: "suspend_listing_on_past_due" as const,
                label: "Suspend listings after failed-payment grace window",
                description:
                  "After the warning period passes, the member remains able to log in but the public directory listing is disabled until billing is resolved.",
              },
            ].map((field) => (
              <div
                key={field.key}
                className="flex items-start justify-between gap-4 rounded-xl border p-4"
              >
                <div className="space-y-1">
                  <Label>{field.label}</Label>
                  <p className="text-xs text-muted-foreground">{field.description}</p>
                </div>
                <Switch
                  checked={values[field.key]}
                  onCheckedChange={(checked) =>
                    setValues((current) => ({ ...current, [field.key]: checked }))
                  }
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button
          type="button"
          onClick={() => saveMutation.mutate()}
          disabled={!hasChanges || saveMutation.isPending}
        >
          {saveMutation.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Save Directory Settings
        </Button>
      </div>
    </div>
  );
}

type TemplateFixture = {
  mode: DirectoryMode;
  title: string;
  subtitle: string;
  location: string;
  meta: string[];
  details: string[];
  tags: string[];
  price?: string;
  cta: string;
  gallery: string[];
};

const TEMPLATE_FIXTURES: Record<DirectoryMode, TemplateFixture> = {
  therapists: {
    mode: "therapists",
    title: "Dr. Amara Olsen",
    subtitle: "Licensed Clinical Psychologist",
    location: "Amsterdam, Netherlands",
    meta: ["Virtual & in-person", "English, Dutch", "Accepting new clients"],
    details: ["PhD, Licensed Psychologist", "Identity, belonging, anxiety"],
    tags: ["Identity & Belonging", "Cross-Cultural", "Anxiety"],
    cta: "Contact Provider",
    gallery: [
      "https://images.unsplash.com/photo-1573497620053-ea5300f94f21?w=900&h=650&fit=crop",
      "https://images.unsplash.com/photo-1521791136064-7986c2920216?w=900&h=650&fit=crop",
      "https://images.unsplash.com/photo-1517048676732-d65bc937f952?w=900&h=650&fit=crop",
    ],
  },
  locations: {
    mode: "locations",
    title: "Downtown Wellness Studio",
    subtitle: "Flagship location with group rooms and private consult suites",
    location: "Austin, Texas",
    meta: ["Open to visitors", "Mobile services available", "Curbside pickup"],
    details: ["Showroom, repairs, consultations", "Parking, accessible entrance"],
    tags: ["Consultations", "Repairs", "Showroom"],
    cta: "Get Directions",
    gallery: [
      "https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=900&h=650&fit=crop",
      "https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=900&h=650&fit=crop",
      "https://images.unsplash.com/photo-1517502884422-41eaead166d4?w=900&h=650&fit=crop",
    ],
  },
  service_providers: {
    mode: "service_providers",
    title: "Atlas Relocation Partners",
    subtitle: "Certified relocation consultants for globally mobile teams",
    location: "Remote, North America & Europe",
    meta: ["Taking new projects", "Virtual delivery", "Enterprise ready"],
    details: ["Certified relocation consultants", "Corporate moves, family transitions"],
    tags: ["Relocation", "Consulting", "Global Mobility"],
    cta: "Request Information",
    gallery: [
      "https://images.unsplash.com/photo-1556761175-b413da4baf72?w=900&h=650&fit=crop",
      "https://images.unsplash.com/photo-1552664730-d307ca884978?w=900&h=650&fit=crop",
      "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=900&h=650&fit=crop",
    ],
  },
  real_estate: {
    mode: "real_estate",
    title: "Modern Hillside Residence",
    subtitle: "4 bed, 3.5 bath home with renovated kitchen and mountain views",
    location: "Boulder, Colorado",
    price: "$1,275,000",
    meta: ["For sale", "4 beds", "3.5 baths", "3,240 sq ft"],
    details: ["0.42 acre lot", "Built 2018", "MLS-2048127"],
    tags: ["Mountain View", "Garage", "Renovated Kitchen", "Open House"],
    cta: "Schedule Showing",
    gallery: [
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=900&h=650&fit=crop",
      "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=900&h=650&fit=crop",
      "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=900&h=650&fit=crop",
      "https://images.unsplash.com/photo-1600607687644-c7171b42498b?w=900&h=650&fit=crop",
    ],
  },
  custom: {
    mode: "custom",
    title: "Featured Community Resource",
    subtitle: "A flexible listing with neutral fields and configurable actions",
    location: "Global",
    meta: ["Active listing", "Approved", "Featured"],
    details: ["Category-driven", "Generic contact flow"],
    tags: ["Resource", "Featured", "Flexible"],
    cta: "Contact",
    gallery: [
      "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=900&h=650&fit=crop",
      "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=900&h=650&fit=crop",
      "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=900&h=650&fit=crop",
    ],
  },
};

function TemplatePreviewCard({ fixture }: { fixture: TemplateFixture }) {
  const preset = DIRECTORY_LABEL_PRESETS[fixture.mode];
  const primaryImage = fixture.gallery[0];
  const secondaryImages = fixture.gallery.slice(1, 4);

  return (
    <Card className="overflow-hidden" data-testid={`card-template-preview-${fixture.mode}`}>
      {preset.showGallery && primaryImage ? (
        <div className="grid aspect-[16/9] grid-cols-[1.4fr_0.8fr] gap-1 bg-muted">
          <img src={primaryImage} alt="" className="h-full w-full object-cover" />
          <div className="grid gap-1">
            {secondaryImages.slice(0, 2).map((image) => (
              <img key={image} src={image} alt="" className="h-full min-h-0 w-full object-cover" />
            ))}
          </div>
        </div>
      ) : (
        <div className="flex aspect-[16/9] items-center justify-center bg-muted text-muted-foreground">
          <Camera className="h-8 w-8" />
        </div>
      )}
      <CardContent className="space-y-4 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase text-muted-foreground">
              {preset.templateLabel}
            </p>
            <h3 className="mt-1 text-lg font-semibold leading-tight">{fixture.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{fixture.subtitle}</p>
          </div>
          {fixture.price ? <p className="shrink-0 text-sm font-semibold">{fixture.price}</p> : null}
        </div>
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          {fixture.mode === "real_estate" ? (
            <Home className="h-4 w-4" />
          ) : (
            <MapPin className="h-4 w-4" />
          )}
          <span>{fixture.location}</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {fixture.meta.map((item) => (
            <Badge key={item} variant="secondary">
              {item}
            </Badge>
          ))}
        </div>
        <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
          {fixture.details.map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {fixture.tags.map((tag) => (
            <Badge key={tag} variant="outline">
              {tag}
            </Badge>
          ))}
        </div>
        <Button className="w-full" variant={fixture.mode === "real_estate" ? "default" : "outline"}>
          {fixture.cta}
        </Button>
      </CardContent>
    </Card>
  );
}

function DirectoryTemplateLabTab() {
  const modes = Object.keys(DIRECTORY_LABEL_PRESETS) as DirectoryMode[];
  const [selectedMode, setSelectedMode] = useState<DirectoryMode>("real_estate");
  const fixture = TEMPLATE_FIXTURES[selectedMode];
  const preset = DIRECTORY_LABEL_PRESETS[selectedMode];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-heading font-semibold">Directory Template Lab</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Test template language, gallery expectations, CTAs, filters, and layout density before
          applying a preset to the live directory.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-5">
        {modes.map((mode) => {
          const item = DIRECTORY_LABEL_PRESETS[mode];
          return (
            <button
              key={mode}
              type="button"
              onClick={() => setSelectedMode(mode)}
              className={`rounded-lg border p-3 text-left transition-colors ${
                selectedMode === mode ? "border-primary bg-primary/5" : "hover:bg-muted/40"
              }`}
              data-testid={`button-template-${mode}`}
            >
              <p className="text-sm font-semibold">{item.templateLabel}</p>
              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                {item.templateDescription}
              </p>
            </button>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <TemplatePreviewCard fixture={fixture} />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Eye className="h-4 w-4 text-primary" />
              Template Anatomy
            </CardTitle>
            <CardDescription>{preset.templateDescription}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 text-sm">
            <div>
              <p className="font-medium">Structured data target</p>
              <Badge variant="secondary" className="mt-2">
                {preset.structuredDataType}
              </Badge>
            </div>
            <div>
              <p className="font-medium">Recommended layouts</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {preset.recommendedLayouts.map((layout) => (
                  <Badge key={layout} variant="outline">
                    {layout}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <p className="font-medium">Discovery filters</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {preset.recommendedFilters.map((filter) => (
                  <Badge key={filter} variant="outline">
                    {filter}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <p className="font-medium">Trust signals</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {preset.trustSignals.map((signal) => (
                  <Badge key={signal} variant="outline">
                    {signal}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="rounded-lg border p-3">
              <p className="font-medium">{preset.galleryLabel}</p>
              <p className="mt-1 text-muted-foreground">{preset.galleryHelpText}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                {preset.showGallery ? "Enabled" : "Disabled"} ·{" "}
                {preset.requireGallery ? "Required" : "Optional"} · {preset.galleryMinImages}-
                {preset.galleryMaxImages} images
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function DirectorySettingsPage() {
  const { settings: directorySettings } = useDirectorySettings();

  return (
    <AdminSidebar>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-heading font-semibold">
            {directorySettings.directoryLabelSingular} Settings
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage membership plans and application rules for the{" "}
            {directorySettings.directoryLabelSingular.toLowerCase()} app.
          </p>
        </div>

        <Tabs defaultValue="tiers" className="space-y-6">
          <TabsList>
            <TabsTrigger value="tiers">
              <CreditCard className="mr-1.5 h-4 w-4 text-amber-600" />
              Membership Tiers
            </TabsTrigger>
            <TabsTrigger value="application">
              <ClipboardList className="mr-1.5 h-4 w-4 text-orange-600" />
              Application Settings
            </TabsTrigger>
            <TabsTrigger value="templates">
              <Eye className="mr-1.5 h-4 w-4 text-blue-600" />
              Template Lab
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tiers" className="space-y-0">
            <TiersContent embedded />
          </TabsContent>

          <TabsContent value="application">
            <DirectoryApplicationSettingsTab />
          </TabsContent>

          <TabsContent value="templates">
            <DirectoryTemplateLabTab />
          </TabsContent>
        </Tabs>
      </div>
    </AdminSidebar>
  );
}

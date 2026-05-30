export const DIRECTORY_MODES = ["therapists", "locations", "service_providers", "custom"] as const;

export type DirectoryMode = (typeof DIRECTORY_MODES)[number];

export const DIRECTORY_PRIMARY_CTA_TYPES = ["contact_form", "website", "phone", "directions", "none"] as const;

export type DirectoryPrimaryCtaType = (typeof DIRECTORY_PRIMARY_CTA_TYPES)[number];

export type DirectoryLabelPreset = {
  directoryLabelSingular: string;
  directoryLabelPlural: string;
  listingLabelSingular: string;
  listingLabelPlural: string;
  participantLabelSingular: string;
  participantLabelPlural: string;
  specialtyLabelPlural: string;
  profileTitleLabel: string;
  profileTitlePlaceholder: string;
  profileBioLabel: string;
  profileBioPlaceholder: string;
  credentialsLabel: string;
  credentialsPlaceholder: string;
  licenseNumberLabel: string;
  licenseNumberPlaceholder: string;
  practiceDetailsLabel: string;
  practiceModeLabel: string;
  acceptingClientsLabel: string;
  acceptingClientsHelpText: string;
  willingToTravelLabel: string;
  willingToTravelHelpText: string;
  locationContactLabel: string;
  primaryCtaType: DirectoryPrimaryCtaType;
  primaryCtaLabel: string;
  showProfileTitle: boolean;
  requireProfileTitle: boolean;
  showProfileBio: boolean;
  requireProfileBio: boolean;
  showSpecialties: boolean;
  requireSpecialties: boolean;
  showLanguages: boolean;
  requireLanguages: boolean;
  showCredentials: boolean;
  requireCredentials: boolean;
  showLicenseNumber: boolean;
  requireLicenseNumber: boolean;
  showPracticeMode: boolean;
  requirePracticeMode: boolean;
  showAvailabilityStatus: boolean;
  showTravelOption: boolean;
  showLocationFields: boolean;
  requireLocationFields: boolean;
  showPhone: boolean;
  requirePhone: boolean;
  showWebsite: boolean;
  requireWebsite: boolean;
  showSocialLinks: boolean;
};

export const DIRECTORY_LABEL_PRESETS: Record<DirectoryMode, DirectoryLabelPreset> = {
  therapists: {
    directoryLabelSingular: "Directory",
    directoryLabelPlural: "Directory",
    listingLabelSingular: "Profile",
    listingLabelPlural: "Profiles",
    participantLabelSingular: "Therapist",
    participantLabelPlural: "Therapists",
    specialtyLabelPlural: "Specializations",
    profileTitleLabel: "Professional Title",
    profileTitlePlaceholder: "e.g. Licensed Clinical Psychologist",
    profileBioLabel: "Bio",
    profileBioPlaceholder: "Tell clients about your practice and approach...",
    credentialsLabel: "Credentials",
    credentialsPlaceholder: "e.g. PhD, LMFT",
    licenseNumberLabel: "License Number",
    licenseNumberPlaceholder: "e.g. PSY12345",
    practiceDetailsLabel: "Practice Details",
    practiceModeLabel: "Session Format",
    acceptingClientsLabel: "Accepting New Clients",
    acceptingClientsHelpText: "Toggle whether you are currently accepting new clients",
    willingToTravelLabel: "Willing to Travel",
    willingToTravelHelpText: "Toggle whether you are willing to travel for sessions",
    locationContactLabel: "Location & Contact",
    primaryCtaType: "contact_form",
    primaryCtaLabel: "Contact Provider",
    showProfileTitle: true,
    requireProfileTitle: false,
    showProfileBio: true,
    requireProfileBio: false,
    showSpecialties: true,
    requireSpecialties: false,
    showLanguages: true,
    requireLanguages: false,
    showCredentials: true,
    requireCredentials: false,
    showLicenseNumber: true,
    requireLicenseNumber: false,
    showPracticeMode: true,
    requirePracticeMode: false,
    showAvailabilityStatus: true,
    showTravelOption: true,
    showLocationFields: true,
    requireLocationFields: false,
    showPhone: true,
    requirePhone: false,
    showWebsite: true,
    requireWebsite: false,
    showSocialLinks: true,
  },
  locations: {
    directoryLabelSingular: "Location Directory",
    directoryLabelPlural: "Locations",
    listingLabelSingular: "Location",
    listingLabelPlural: "Locations",
    participantLabelSingular: "Location Manager",
    participantLabelPlural: "Location Managers",
    specialtyLabelPlural: "Services",
    profileTitleLabel: "Location Name",
    profileTitlePlaceholder: "e.g. Downtown Flagship Store",
    profileBioLabel: "Location Description",
    profileBioPlaceholder: "Describe this location, services, amenities, and what visitors can expect...",
    credentialsLabel: "Location Features",
    credentialsPlaceholder: "e.g. Curbside pickup, showroom, repairs",
    licenseNumberLabel: "Store or Location ID",
    licenseNumberPlaceholder: "e.g. STORE-1024",
    practiceDetailsLabel: "Service Details",
    practiceModeLabel: "Service Format",
    acceptingClientsLabel: "Accepting Visitors",
    acceptingClientsHelpText: "Toggle whether this location is currently open to new visitors or customers",
    willingToTravelLabel: "Mobile Service Available",
    willingToTravelHelpText: "Toggle whether this location or team can travel to customers",
    locationContactLabel: "Address & Contact",
    primaryCtaType: "directions",
    primaryCtaLabel: "Get Directions",
    showProfileTitle: true,
    requireProfileTitle: false,
    showProfileBio: true,
    requireProfileBio: false,
    showSpecialties: true,
    requireSpecialties: false,
    showLanguages: false,
    requireLanguages: false,
    showCredentials: true,
    requireCredentials: false,
    showLicenseNumber: true,
    requireLicenseNumber: false,
    showPracticeMode: true,
    requirePracticeMode: false,
    showAvailabilityStatus: true,
    showTravelOption: true,
    showLocationFields: true,
    requireLocationFields: false,
    showPhone: true,
    requirePhone: false,
    showWebsite: true,
    requireWebsite: false,
    showSocialLinks: true,
  },
  service_providers: {
    directoryLabelSingular: "Provider Directory",
    directoryLabelPlural: "Service Providers",
    listingLabelSingular: "Provider Profile",
    listingLabelPlural: "Provider Profiles",
    participantLabelSingular: "Service Provider",
    participantLabelPlural: "Service Providers",
    specialtyLabelPlural: "Services",
    profileTitleLabel: "Provider Title",
    profileTitlePlaceholder: "e.g. Certified Relocation Consultant",
    profileBioLabel: "Provider Bio",
    profileBioPlaceholder: "Describe your services, approach, and who you serve...",
    credentialsLabel: "Certifications",
    credentialsPlaceholder: "e.g. PMP, CLC, Certified Coach",
    licenseNumberLabel: "License or Certification Number",
    licenseNumberPlaceholder: "e.g. CERT-12345",
    practiceDetailsLabel: "Service Details",
    practiceModeLabel: "Delivery Format",
    acceptingClientsLabel: "Accepting New Customers",
    acceptingClientsHelpText: "Toggle whether you are currently accepting new customers",
    willingToTravelLabel: "Willing to Travel",
    willingToTravelHelpText: "Toggle whether you provide services at customer locations",
    locationContactLabel: "Location & Contact",
    primaryCtaType: "contact_form",
    primaryCtaLabel: "Request Information",
    showProfileTitle: true,
    requireProfileTitle: false,
    showProfileBio: true,
    requireProfileBio: false,
    showSpecialties: true,
    requireSpecialties: false,
    showLanguages: true,
    requireLanguages: false,
    showCredentials: true,
    requireCredentials: false,
    showLicenseNumber: true,
    requireLicenseNumber: false,
    showPracticeMode: true,
    requirePracticeMode: false,
    showAvailabilityStatus: true,
    showTravelOption: true,
    showLocationFields: true,
    requireLocationFields: false,
    showPhone: true,
    requirePhone: false,
    showWebsite: true,
    requireWebsite: false,
    showSocialLinks: true,
  },
  custom: {
    directoryLabelSingular: "Directory",
    directoryLabelPlural: "Directory",
    listingLabelSingular: "Listing",
    listingLabelPlural: "Listings",
    participantLabelSingular: "Provider",
    participantLabelPlural: "Providers",
    specialtyLabelPlural: "Specialties",
    profileTitleLabel: "Listing Title",
    profileTitlePlaceholder: "e.g. Featured provider, location, or service",
    profileBioLabel: "Description",
    profileBioPlaceholder: "Describe this listing...",
    credentialsLabel: "Qualifications",
    credentialsPlaceholder: "e.g. Certifications, features, or qualifications",
    licenseNumberLabel: "Reference Number",
    licenseNumberPlaceholder: "e.g. REF-12345",
    practiceDetailsLabel: "Details",
    practiceModeLabel: "Format",
    acceptingClientsLabel: "Accepting New Inquiries",
    acceptingClientsHelpText: "Toggle whether this listing is currently accepting new inquiries",
    willingToTravelLabel: "Travel Available",
    willingToTravelHelpText: "Toggle whether travel or mobile service is available",
    locationContactLabel: "Location & Contact",
    primaryCtaType: "contact_form",
    primaryCtaLabel: "Contact",
    showProfileTitle: true,
    requireProfileTitle: false,
    showProfileBio: true,
    requireProfileBio: false,
    showSpecialties: true,
    requireSpecialties: false,
    showLanguages: true,
    requireLanguages: false,
    showCredentials: true,
    requireCredentials: false,
    showLicenseNumber: true,
    requireLicenseNumber: false,
    showPracticeMode: true,
    requirePracticeMode: false,
    showAvailabilityStatus: true,
    showTravelOption: true,
    showLocationFields: true,
    requireLocationFields: false,
    showPhone: true,
    requirePhone: false,
    showWebsite: true,
    requireWebsite: false,
    showSocialLinks: true,
  },
};

export type PublicDirectorySettings = DirectoryLabelPreset & {
  directoryMode: DirectoryMode;
  applicationFeeAmountCents: number;
  applicationFeeNoticeTitle: string;
  applicationFeeNoticeBody: string;
  applicationFeePolicySummary: string;
  applicationFeeCreditOnApproval: boolean;
  applicationFeeCreditAmountCents: number;
  renewalReminderDays: number;
  paymentFailureGraceHours: number;
  suspendListingOnPastDue: boolean;
  directoryRequiresApplicationProcess: boolean;
  directoryRequiresApprovedApplication: boolean;
  directoryRequiresActiveSubscription: boolean;
};

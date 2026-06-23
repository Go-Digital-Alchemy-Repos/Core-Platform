export const DIRECTORY_MODES = [
  "therapists",
  "locations",
  "service_providers",
  "real_estate",
  "custom",
] as const;

export type DirectoryMode = (typeof DIRECTORY_MODES)[number];

export const DIRECTORY_PRIMARY_CTA_TYPES = [
  "contact_form",
  "website",
  "phone",
  "directions",
  "none",
] as const;

export type DirectoryPrimaryCtaType = (typeof DIRECTORY_PRIMARY_CTA_TYPES)[number];

export type DirectoryLabelPreset = {
  templateLabel: string;
  templateDescription: string;
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
  showGallery: boolean;
  requireGallery: boolean;
  galleryLabel: string;
  galleryHelpText: string;
  galleryMinImages: number;
  galleryMaxImages: number;
  structuredDataType:
    | "Person"
    | "LocalBusiness"
    | "ProfessionalService"
    | "RealEstateListing"
    | "Thing";
  recommendedLayouts: string[];
  recommendedFilters: string[];
  trustSignals: string[];
};

export const DIRECTORY_LABEL_PRESETS: Record<DirectoryMode, DirectoryLabelPreset> = {
  therapists: {
    templateLabel: "Professional / Practitioner",
    templateDescription:
      "For credentialed people such as therapists, coaches, consultants, clinicians, instructors, or advisors.",
    directoryLabelSingular: "Directory",
    directoryLabelPlural: "Directory",
    listingLabelSingular: "Profile",
    listingLabelPlural: "Profiles",
    participantLabelSingular: "Therapist",
    participantLabelPlural: "Therapists",
    specialtyLabelPlural: "Specializations",
    profileTitleLabel: "Professional Title",
    profileTitlePlaceholder: "e.g. Certified Strategy Consultant",
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
    showGallery: false,
    requireGallery: false,
    galleryLabel: "Photo Gallery",
    galleryHelpText:
      "Add optional photos that help visitors understand your practice, service, or professional presence.",
    galleryMinImages: 0,
    galleryMaxImages: 8,
    structuredDataType: "Person",
    recommendedLayouts: ["Compact list", "Profile cards", "Map/list split", "Detail profile"],
    recommendedFilters: [
      "Search",
      "Specializations",
      "Languages",
      "Location",
      "Session format",
      "Availability",
    ],
    trustSignals: [
      "Verified credentials",
      "Approved listing",
      "Accepting new clients",
      "Featured profile",
    ],
  },
  locations: {
    templateLabel: "Location / Branch",
    templateDescription:
      "For physical places such as clinics, stores, venues, offices, campuses, chapters, or service branches.",
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
    profileBioPlaceholder:
      "Describe this location, services, amenities, and what visitors can expect...",
    credentialsLabel: "Location Features",
    credentialsPlaceholder: "e.g. Curbside pickup, showroom, repairs",
    licenseNumberLabel: "Store or Location ID",
    licenseNumberPlaceholder: "e.g. STORE-1024",
    practiceDetailsLabel: "Service Details",
    practiceModeLabel: "Service Format",
    acceptingClientsLabel: "Accepting Visitors",
    acceptingClientsHelpText:
      "Toggle whether this location is currently open to new visitors or customers",
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
    showGallery: true,
    requireGallery: false,
    galleryLabel: "Location Photos",
    galleryHelpText:
      "Show storefront, interior, amenities, exterior, and arrival photos so visitors know what to expect.",
    galleryMinImages: 0,
    galleryMaxImages: 16,
    structuredDataType: "LocalBusiness",
    recommendedLayouts: ["Map/list split", "Card grid", "Detail profile"],
    recommendedFilters: [
      "Search",
      "Services",
      "Location",
      "Service format",
      "Open/accepting visitors",
    ],
    trustSignals: [
      "Verified location",
      "Active listing",
      "Accepting visitors",
      "Featured location",
    ],
  },
  service_providers: {
    templateLabel: "Service Provider / Vendor",
    templateDescription:
      "For vendors, partners, agencies, contractors, consultants, and service marketplaces.",
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
    showGallery: false,
    requireGallery: false,
    galleryLabel: "Project Gallery",
    galleryHelpText: "Add optional work samples, team photos, facilities, or service examples.",
    galleryMinImages: 0,
    galleryMaxImages: 12,
    structuredDataType: "ProfessionalService",
    recommendedLayouts: ["Profile cards", "Comparison grid", "Detail profile"],
    recommendedFilters: [
      "Search",
      "Services",
      "Industries",
      "Service area",
      "Delivery format",
      "Availability",
    ],
    trustSignals: [
      "Verified provider",
      "Approved partner",
      "Taking new projects",
      "Featured provider",
    ],
  },
  real_estate: {
    templateLabel: "Real Estate Listing",
    templateDescription:
      "For residential, commercial, rental, or portfolio property listings aligned with common MLS/RESO-style fields.",
    directoryLabelSingular: "Property Directory",
    directoryLabelPlural: "Properties",
    listingLabelSingular: "Property Listing",
    listingLabelPlural: "Property Listings",
    participantLabelSingular: "Listing Agent",
    participantLabelPlural: "Listing Agents",
    specialtyLabelPlural: "Property Features",
    profileTitleLabel: "Property Title",
    profileTitlePlaceholder: "e.g. Modern 3-bedroom home near downtown",
    profileBioLabel: "Property Description",
    profileBioPlaceholder:
      "Describe the property, neighborhood, layout, amenities, and what makes it stand out...",
    credentialsLabel: "Amenities & Features",
    credentialsPlaceholder: "e.g. Pool, garage, renovated kitchen, mountain view",
    licenseNumberLabel: "MLS or Listing ID",
    licenseNumberPlaceholder: "e.g. MLS-2048127",
    practiceDetailsLabel: "Property Details",
    practiceModeLabel: "Listing Type",
    acceptingClientsLabel: "Available for Showings",
    acceptingClientsHelpText:
      "Toggle whether this property is currently available for showings or inquiries",
    willingToTravelLabel: "Open House Available",
    willingToTravelHelpText: "Toggle whether this property has open house or tour availability",
    locationContactLabel: "Property Location & Agent Contact",
    primaryCtaType: "contact_form",
    primaryCtaLabel: "Schedule Showing",
    showProfileTitle: true,
    requireProfileTitle: true,
    showProfileBio: true,
    requireProfileBio: true,
    showSpecialties: true,
    requireSpecialties: false,
    showLanguages: false,
    requireLanguages: false,
    showCredentials: true,
    requireCredentials: false,
    showLicenseNumber: true,
    requireLicenseNumber: false,
    showPracticeMode: true,
    requirePracticeMode: true,
    showAvailabilityStatus: true,
    showTravelOption: true,
    showLocationFields: true,
    requireLocationFields: true,
    showPhone: true,
    requirePhone: false,
    showWebsite: true,
    requireWebsite: false,
    showSocialLinks: false,
    showGallery: true,
    requireGallery: true,
    galleryLabel: "Property Photos",
    galleryHelpText:
      "Add exterior, interior, room, view, amenity, floor plan, and neighborhood photos. The primary image appears on cards.",
    galleryMinImages: 3,
    galleryMaxImages: 40,
    structuredDataType: "RealEstateListing",
    recommendedLayouts: [
      "Photo-forward card grid",
      "Map/list split",
      "Detail profile with gallery",
    ],
    recommendedFilters: [
      "Search",
      "Price range",
      "Property type",
      "Beds",
      "Baths",
      "Location",
      "Listing status",
      "Square footage",
    ],
    trustSignals: [
      "Verified listing",
      "MLS/reference ID",
      "Available for showings",
      "Featured property",
    ],
  },
  custom: {
    templateLabel: "Custom / General Listing",
    templateDescription:
      "For neutral directories where the team defines labels, fields, filters, CTAs, and trust signals.",
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
    showGallery: false,
    requireGallery: false,
    galleryLabel: "Gallery",
    galleryHelpText: "Add optional images that help visitors evaluate this listing.",
    galleryMinImages: 0,
    galleryMaxImages: 12,
    structuredDataType: "Thing",
    recommendedLayouts: ["Compact list", "Card grid", "Detail profile"],
    recommendedFilters: ["Search", "Categories", "Location", "Availability"],
    trustSignals: ["Approved listing", "Active listing", "Featured listing"],
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

function normalizedLabel(value: string | null | undefined): string {
  return (value || "").trim().toLowerCase();
}

export function getDirectoryExperienceMode(
  settings: Pick<
    PublicDirectorySettings,
    | "directoryMode"
    | "directoryLabelPlural"
    | "listingLabelPlural"
    | "participantLabelPlural"
    | "specialtyLabelPlural"
  >,
): DirectoryMode {
  const directoryPlural = normalizedLabel(settings.directoryLabelPlural);
  const listingPlural = normalizedLabel(settings.listingLabelPlural);
  const participantPlural = normalizedLabel(settings.participantLabelPlural);
  const specialtyPlural = normalizedLabel(settings.specialtyLabelPlural);

  if (
    settings.directoryMode === "real_estate" ||
    participantPlural.includes("listing agent") ||
    listingPlural.includes("property") ||
    specialtyPlural.includes("property")
  ) {
    return "real_estate";
  }

  if (
    settings.directoryMode === "locations" ||
    directoryPlural.includes("location") ||
    listingPlural.includes("location")
  ) {
    return "locations";
  }

  if (
    settings.directoryMode === "service_providers" ||
    participantPlural.includes("service provider") ||
    listingPlural.includes("provider")
  ) {
    return "service_providers";
  }

  if (settings.directoryMode === "custom") return "custom";
  return "therapists";
}

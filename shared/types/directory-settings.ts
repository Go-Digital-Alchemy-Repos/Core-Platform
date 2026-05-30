export const DIRECTORY_MODES = ["therapists", "locations", "service_providers", "custom"] as const;

export type DirectoryMode = (typeof DIRECTORY_MODES)[number];

export type DirectoryLabelPreset = {
  directoryLabelSingular: string;
  directoryLabelPlural: string;
  listingLabelSingular: string;
  listingLabelPlural: string;
  participantLabelSingular: string;
  participantLabelPlural: string;
  specialtyLabelPlural: string;
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
  },
  locations: {
    directoryLabelSingular: "Location Directory",
    directoryLabelPlural: "Locations",
    listingLabelSingular: "Location",
    listingLabelPlural: "Locations",
    participantLabelSingular: "Location Manager",
    participantLabelPlural: "Location Managers",
    specialtyLabelPlural: "Services",
  },
  service_providers: {
    directoryLabelSingular: "Provider Directory",
    directoryLabelPlural: "Service Providers",
    listingLabelSingular: "Provider Profile",
    listingLabelPlural: "Provider Profiles",
    participantLabelSingular: "Service Provider",
    participantLabelPlural: "Service Providers",
    specialtyLabelPlural: "Services",
  },
  custom: {
    directoryLabelSingular: "Directory",
    directoryLabelPlural: "Directory",
    listingLabelSingular: "Listing",
    listingLabelPlural: "Listings",
    participantLabelSingular: "Provider",
    participantLabelPlural: "Providers",
    specialtyLabelPlural: "Specialties",
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

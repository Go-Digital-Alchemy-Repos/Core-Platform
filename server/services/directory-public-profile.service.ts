import type { TherapistWithUser } from "@shared/types/directory";
import {
  DIRECTORY_MODE_PROFILE_ALIASES,
  getDirectoryExperienceMode,
  type PublicDirectorySettings,
} from "@shared/types/directory-settings";

export function isPublicDirectoryProfile(
  profile: TherapistWithUser,
  settings: PublicDirectorySettings,
): boolean {
  const directoryMode = getDirectoryExperienceMode(settings);
  return Boolean(
    profile.isActive &&
    DIRECTORY_MODE_PROFILE_ALIASES[directoryMode].includes(profile.directoryMode) &&
    (!settings.directoryRequiresApprovedApplication || profile.isApproved),
  );
}

export function toPublicDirectoryProfile(
  profile: TherapistWithUser,
  settings: PublicDirectorySettings,
) {
  return {
    id: profile.id,
    directoryMode: profile.directoryMode,
    title: settings.showProfileTitle ? profile.title : null,
    bio: settings.showProfileBio ? profile.bio : null,
    specializations: settings.showSpecialties ? profile.specializations : null,
    languages: settings.showLanguages ? profile.languages : null,
    credentials: settings.showCredentials ? profile.credentials : null,
    licenseNumber: settings.showLicenseNumber ? profile.licenseNumber : null,
    practiceMode: settings.showPracticeMode ? profile.practiceMode : null,
    addressLine1: settings.showLocationFields ? profile.addressLine1 : null,
    addressLine2: settings.showLocationFields ? profile.addressLine2 : null,
    city: settings.showLocationFields ? profile.city : null,
    state: settings.showLocationFields ? profile.state : null,
    country: settings.showLocationFields ? profile.country : null,
    zipCode: settings.showLocationFields ? profile.zipCode : null,
    latitude: settings.showLocationFields ? profile.latitude : null,
    longitude: settings.showLocationFields ? profile.longitude : null,
    phone: settings.showPhone ? profile.phone : null,
    website: settings.showWebsite ? profile.website : null,
    instagramHandle: settings.showSocialLinks ? profile.instagramHandle : null,
    facebookHandle: settings.showSocialLinks ? profile.facebookHandle : null,
    twitterHandle: settings.showSocialLinks ? profile.twitterHandle : null,
    linkedinHandle: settings.showSocialLinks ? profile.linkedinHandle : null,
    youtubeHandle: settings.showSocialLinks ? profile.youtubeHandle : null,
    tiktokHandle: settings.showSocialLinks ? profile.tiktokHandle : null,
    acceptingClients: settings.showAvailabilityStatus ? profile.acceptingClients : null,
    willingToTravel: settings.showTravelOption ? profile.willingToTravel : null,
    isFeatured: profile.isFeatured,
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
    user: profile.user
      ? {
          firstName: profile.user.firstName,
          lastName: profile.user.lastName,
          profileImageUrl: profile.user.profileImageUrl,
        }
      : undefined,
  };
}

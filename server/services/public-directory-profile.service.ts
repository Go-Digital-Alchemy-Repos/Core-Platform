import type { TherapistWithUser } from "@shared/types/directory";
import type { PublicDirectorySettings } from "@shared/types/directory-settings";

export function serializePublicDirectoryProfile(
  item: TherapistWithUser,
  settings: PublicDirectorySettings,
  profileImageUrl: string | null,
) {
  const user = item.user
    ? { firstName: item.user.firstName, lastName: item.user.lastName, profileImageUrl }
    : undefined;

  return {
    id: item.id,
    directoryMode: item.directoryMode,
    ...(settings.showProfileTitle ? { title: item.title } : {}),
    ...(settings.showProfileBio ? { bio: item.bio } : {}),
    ...(settings.showSpecialties ? { specializations: item.specializations } : {}),
    ...(settings.showLanguages ? { languages: item.languages } : {}),
    ...(settings.showCredentials ? { credentials: item.credentials } : {}),
    ...(settings.showLicenseNumber ? { licenseNumber: item.licenseNumber } : {}),
    ...(settings.showPracticeMode ? { practiceMode: item.practiceMode } : {}),
    ...(settings.showLocationFields
      ? {
          addressLine1: item.addressLine1,
          addressLine2: item.addressLine2,
          city: item.city,
          state: item.state,
          country: item.country,
          zipCode: item.zipCode,
          latitude: item.latitude,
          longitude: item.longitude,
        }
      : {}),
    ...(settings.showPhone ? { phone: item.phone } : {}),
    ...(settings.showWebsite ? { website: item.website } : {}),
    ...(settings.showSocialLinks
      ? {
          instagramHandle: item.instagramHandle,
          facebookHandle: item.facebookHandle,
          twitterHandle: item.twitterHandle,
          linkedinHandle: item.linkedinHandle,
          youtubeHandle: item.youtubeHandle,
          tiktokHandle: item.tiktokHandle,
        }
      : {}),
    ...(settings.showAvailabilityStatus ? { acceptingClients: item.acceptingClients } : {}),
    ...(settings.showTravelOption ? { willingToTravel: item.willingToTravel } : {}),
    isFeatured: item.isFeatured,
    user,
  };
}

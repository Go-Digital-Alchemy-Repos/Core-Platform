import { describe, expect, it } from "vitest";
import type { TherapistWithUser } from "@shared/types/directory";
import {
  DIRECTORY_LABEL_PRESETS,
  type PublicDirectorySettings,
} from "@shared/types/directory-settings";
import {
  isPublicDirectoryProfile,
  toPublicDirectoryProfile,
} from "../services/directory-public-profile.service";

const settings = {
  ...DIRECTORY_LABEL_PRESETS.service_provider,
  directoryMode: "service_provider",
  directoryRequiresApprovedApplication: true,
} as PublicDirectorySettings;

const profile: TherapistWithUser = {
  id: "profile-1",
  userId: "user-1",
  directoryMode: "service_provider",
  title: "Counselor",
  bio: "Private bio",
  specializations: ["Anxiety"],
  languages: ["English"],
  credentials: "Licensed",
  licenseNumber: "SECRET-123",
  practiceMode: "both",
  addressLine1: "123 Private St",
  addressLine2: null,
  city: "Boston",
  state: "MA",
  country: "USA",
  zipCode: "02110",
  latitude: "42.36",
  longitude: "-71.06",
  phone: "555-0100",
  website: "example.com",
  instagramHandle: "private",
  facebookHandle: null,
  twitterHandle: null,
  linkedinHandle: null,
  youtubeHandle: null,
  tiktokHandle: null,
  acceptingClients: true,
  willingToTravel: true,
  isFeatured: false,
  featuredUntil: null,
  isApproved: true,
  isActive: true,
  rejectionReason: null,
  searchVector: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  user: {
    firstName: "Ada",
    lastName: "Lovelace",
    email: "private@example.com",
    profileImageUrl: null,
  },
};

describe("directory public profile projection", () => {
  it("removes internal identity fields and configured-hidden contact data", () => {
    const result = toPublicDirectoryProfile(profile, {
      ...settings,
      showLocationFields: false,
      showPhone: false,
      showWebsite: false,
      showSocialLinks: false,
      showLicenseNumber: false,
    });

    expect(result.user).toEqual({
      firstName: "Ada",
      lastName: "Lovelace",
      profileImageUrl: null,
    });
    expect(result).not.toHaveProperty("userId");
    expect(result).not.toHaveProperty("isApproved");
    expect(result.addressLine1).toBeNull();
    expect(result.latitude).toBeNull();
    expect(result.phone).toBeNull();
    expect(result.website).toBeNull();
    expect(result.instagramHandle).toBeNull();
    expect(result.licenseNumber).toBeNull();
  });

  it("rejects profiles outside the configured public mode", () => {
    expect(isPublicDirectoryProfile({ ...profile, directoryMode: "store_locator" }, settings)).toBe(
      false,
    );
  });
});

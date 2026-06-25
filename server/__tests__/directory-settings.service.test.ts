import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetDecryptedCategory = vi.fn();

vi.mock("../storage", () => ({
  storage: {
    settings: {
      getDecryptedCategory: mockGetDecryptedCategory,
    },
  },
}));

describe("directory-settings.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns generic service-provider defaults when no directory settings are stored", async () => {
    mockGetDecryptedCategory.mockResolvedValue({});
    const { getDirectorySettings } = await import("../services/directory-settings.service");

    const settings = await getDirectorySettings();

    expect(settings.directoryMode).toBe("service_provider");
    expect(settings.directoryLabelSingular).toBe("Provider Directory");
    expect(settings.listingLabelPlural).toBe("Profiles");
    expect(settings.participantLabelSingular).toBe("Service Provider");
    expect(settings.specialtyLabelPlural).toBe("Services");
    expect(settings.profileTitleLabel).toBe("Professional Title");
    expect(settings.acceptingClientsLabel).toBe("Accepting New Customers");
    expect(settings.primaryCtaType).toBe("contact_form");
    expect(settings.primaryCtaLabel).toBe("Request Information");
    expect(settings.showLanguages).toBe(true);
    expect(settings.showGallery).toBe(false);
    expect(settings.requireGallery).toBe(false);
    expect(settings.requireProfileBio).toBe(false);
    expect(settings.directoryRequiresApplicationProcess).toBe(true);
    expect(settings.directoryRequiresApprovedApplication).toBe(true);
  });

  it("applies preset labels and parses booleans for a store locator directory", async () => {
    mockGetDecryptedCategory.mockResolvedValue({
      directory_mode: "store_locator",
      directory_requires_application_process: "false",
      directory_requires_approved_application: "false",
      directory_requires_active_subscription: "true",
      directory_show_location_jobs: "true",
      application_fee_amount_usd: "25.50",
    });
    const { getDirectorySettings } = await import("../services/directory-settings.service");

    const settings = await getDirectorySettings();

    expect(settings.directoryMode).toBe("store_locator");
    expect(settings.directoryLabelPlural).toBe("Locations");
    expect(settings.listingLabelSingular).toBe("Location");
    expect(settings.participantLabelSingular).toBe("Location Manager");
    expect(settings.specialtyLabelPlural).toBe("Categories");
    expect(settings.profileTitleLabel).toBe("Location Name");
    expect(settings.credentialsLabel).toBe("Amenities & Attributes");
    expect(settings.acceptingClientsLabel).toBe("Open to Customers");
    expect(settings.primaryCtaType).toBe("directions");
    expect(settings.primaryCtaLabel).toBe("Get Directions");
    expect(settings.showLanguages).toBe(false);
    expect(settings.showLocationFields).toBe(true);
    expect(settings.showGallery).toBe(true);
    expect(settings.requireGallery).toBe(false);
    expect(settings.directoryRequiresApplicationProcess).toBe(false);
    expect(settings.directoryRequiresApprovedApplication).toBe(false);
    expect(settings.directoryRequiresActiveSubscription).toBe(true);
    expect(settings.directoryShowLocationJobs).toBe(true);
    expect(settings.applicationFeeAmountCents).toBe(2550);
  });

  it("maps legacy directory modes to the two canonical formats", async () => {
    mockGetDecryptedCategory.mockResolvedValue({
      directory_mode: "real_estate",
    });
    const { getDirectorySettings } = await import("../services/directory-settings.service");

    const settings = await getDirectorySettings();

    expect(settings.directoryMode).toBe("store_locator");
    expect(settings.listingLabelSingular).toBe("Location");
  });

  it("uses custom labels over preset labels", async () => {
    mockGetDecryptedCategory.mockResolvedValue({
      directory_mode: "service_provider",
      directory_label_singular: "Partner Network",
      listing_label_plural: "Partner Pages",
      participant_label_plural: "Partners",
      profile_title_label: "Partner Headline",
      accepting_clients_label: "Taking New Projects",
      primary_cta_type: "website",
      primary_cta_label: "Visit Partner",
      show_license_number: "false",
      require_phone: "yes",
    });
    const { getDirectorySettings } = await import("../services/directory-settings.service");

    const settings = await getDirectorySettings();

    expect(settings.directoryMode).toBe("service_provider");
    expect(settings.directoryLabelSingular).toBe("Partner Network");
    expect(settings.listingLabelPlural).toBe("Partner Pages");
    expect(settings.participantLabelPlural).toBe("Partners");
    expect(settings.profileTitleLabel).toBe("Partner Headline");
    expect(settings.acceptingClientsLabel).toBe("Taking New Projects");
    expect(settings.specialtyLabelPlural).toBe("Services");
    expect(settings.primaryCtaType).toBe("website");
    expect(settings.primaryCtaLabel).toBe("Visit Partner");
    expect(settings.showLicenseNumber).toBe(false);
    expect(settings.requirePhone).toBe(true);
  });

  it("uses store locator gallery defaults", async () => {
    mockGetDecryptedCategory.mockResolvedValue({
      directory_mode: "store_locator",
    });
    const { getDirectorySettings } = await import("../services/directory-settings.service");

    const settings = await getDirectorySettings();

    expect(settings.directoryMode).toBe("store_locator");
    expect(settings.directoryLabelPlural).toBe("Locations");
    expect(settings.listingLabelSingular).toBe("Location");
    expect(settings.participantLabelSingular).toBe("Location Manager");
    expect(settings.profileTitleLabel).toBe("Location Name");
    expect(settings.acceptingClientsLabel).toBe("Open to Customers");
    expect(settings.primaryCtaLabel).toBe("Get Directions");
    expect(settings.structuredDataType).toBe("LocalBusiness");
    expect(settings.showGallery).toBe(true);
    expect(settings.requireGallery).toBe(false);
    expect(settings.galleryMinImages).toBe(0);
    expect(settings.galleryMaxImages).toBe(16);
  });

  it("uses custom gallery settings over preset defaults", async () => {
    mockGetDecryptedCategory.mockResolvedValue({
      directory_mode: "store_locator",
      show_gallery: "false",
      require_gallery: "false",
      gallery_label: "Listing Media",
      gallery_help_text: "Upload approved listing photos.",
      gallery_min_images: "1",
      gallery_max_images: "12",
    });
    const { getDirectorySettings } = await import("../services/directory-settings.service");

    const settings = await getDirectorySettings();

    expect(settings.showGallery).toBe(false);
    expect(settings.requireGallery).toBe(false);
    expect(settings.galleryLabel).toBe("Listing Media");
    expect(settings.galleryHelpText).toBe("Upload approved listing photos.");
    expect(settings.galleryMinImages).toBe(1);
    expect(settings.galleryMaxImages).toBe(12);
  });
});

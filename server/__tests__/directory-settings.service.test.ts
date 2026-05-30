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

  it("returns therapist defaults when no directory settings are stored", async () => {
    mockGetDecryptedCategory.mockResolvedValue({});
    const { getDirectorySettings } = await import("../services/directory-settings.service");

    const settings = await getDirectorySettings();

    expect(settings.directoryMode).toBe("therapists");
    expect(settings.directoryLabelSingular).toBe("Directory");
    expect(settings.listingLabelPlural).toBe("Profiles");
    expect(settings.participantLabelSingular).toBe("Therapist");
    expect(settings.specialtyLabelPlural).toBe("Specializations");
    expect(settings.profileTitleLabel).toBe("Professional Title");
    expect(settings.acceptingClientsLabel).toBe("Accepting New Clients");
    expect(settings.primaryCtaType).toBe("contact_form");
    expect(settings.primaryCtaLabel).toBe("Contact Provider");
    expect(settings.showLanguages).toBe(true);
    expect(settings.requireProfileBio).toBe(false);
    expect(settings.directoryRequiresApplicationProcess).toBe(true);
    expect(settings.directoryRequiresApprovedApplication).toBe(true);
  });

  it("applies preset labels and parses booleans for a locations directory", async () => {
    mockGetDecryptedCategory.mockResolvedValue({
      directory_mode: "locations",
      directory_requires_application_process: "false",
      directory_requires_approved_application: "false",
      directory_requires_active_subscription: "true",
      application_fee_amount_usd: "25.50",
    });
    const { getDirectorySettings } = await import("../services/directory-settings.service");

    const settings = await getDirectorySettings();

    expect(settings.directoryMode).toBe("locations");
    expect(settings.directoryLabelPlural).toBe("Locations");
    expect(settings.listingLabelSingular).toBe("Location");
    expect(settings.participantLabelSingular).toBe("Location Manager");
    expect(settings.specialtyLabelPlural).toBe("Services");
    expect(settings.profileTitleLabel).toBe("Location Name");
    expect(settings.credentialsLabel).toBe("Location Features");
    expect(settings.acceptingClientsLabel).toBe("Accepting Visitors");
    expect(settings.primaryCtaType).toBe("directions");
    expect(settings.primaryCtaLabel).toBe("Get Directions");
    expect(settings.showLanguages).toBe(false);
    expect(settings.showLocationFields).toBe(true);
    expect(settings.directoryRequiresApplicationProcess).toBe(false);
    expect(settings.directoryRequiresApprovedApplication).toBe(false);
    expect(settings.directoryRequiresActiveSubscription).toBe(true);
    expect(settings.applicationFeeAmountCents).toBe(2550);
  });

  it("uses custom labels over preset labels", async () => {
    mockGetDecryptedCategory.mockResolvedValue({
      directory_mode: "service_providers",
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

    expect(settings.directoryMode).toBe("service_providers");
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
});

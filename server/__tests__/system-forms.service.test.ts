import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetBySlug = vi.fn();
const mockCreate = vi.fn();
const mockUpdate = vi.fn();

vi.mock("../storage", () => ({
  storage: {
    forms: {
      getBySlug: mockGetBySlug,
      create: mockCreate,
      update: mockUpdate,
    },
  },
}));

vi.mock("../utils/logger", () => ({
  logger: {
    app: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    },
  },
}));

describe("ensureSystemForms", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("preserves edited fields on existing system forms", async () => {
    mockGetBySlug.mockImplementation(async (slug: string) => {
      if (slug === "contact-form") {
        return {
          id: "contact-form-id",
          name: "Custom Contact Form",
          slug: "contact-form",
          description: "Custom contact description",
          kind: "contact",
          isSystem: true,
          isActive: true,
          fields: [
            {
              id: "message",
              key: "message",
              label: "How can we help?",
              type: "textarea",
              placeholder: "Tell us what you need",
              helpText: "",
              required: true,
              width: "full",
              options: [],
              config: {},
            },
          ],
          settings: {
            submitButtonText: "Send",
            successMessage: "Custom contact success",
            mailchimpEnabled: true,
            mailchimpTag: "TCK General Inquiry",
            notifyAdmins: true,
            storeAsContactMessage: true,
          },
        };
      }

      if (slug === "tck-interest") {
        return {
          id: "interest-form-id",
          name: "TCK Interest Form",
          slug: "tck-interest",
          description: "Custom description",
          kind: "interest",
          isSystem: true,
          isActive: true,
          fields: [
            {
              id: "name",
              key: "name",
              label: "Name",
              type: "name",
              placeholder: "",
              helpText: "",
              required: true,
              width: "full",
              options: [],
              config: { nameFormat: "split" },
            },
          ],
          settings: {
            submitButtonText: "Keep Me Informed",
            successMessage: "Custom success",
            mailchimpEnabled: true,
            mailchimpTag: "TCK Interest",
            notifyAdmins: false,
            storeAsContactMessage: false,
          },
        };
      }

      return undefined;
    });

    const mod = await import("../services/system-forms.service");
    await mod.ensureSystemForms();

    const tckInterestUpdate = mockUpdate.mock.calls.find(
      ([id]: [string]) => id === "interest-form-id"
    );
    const contactUpdate = mockUpdate.mock.calls.find(
      ([id]: [string]) => id === "contact-form-id"
    );

    expect(tckInterestUpdate).toBeTruthy();
    expect(tckInterestUpdate[1].fields).toHaveLength(1);
    expect(tckInterestUpdate[1].fields[0].label).toBe("Name");
    expect(
      tckInterestUpdate[1].fields.some((field: { label: string }) => field.label === "Introduction")
    ).toBe(false);

    expect(contactUpdate).toBeTruthy();
    expect(contactUpdate[1].name).toBe("Custom Contact Form");
    expect(contactUpdate[1].fields).toHaveLength(1);
    expect(contactUpdate[1].fields[0].label).toBe("How can we help?");
    expect(contactUpdate[1].settings.successMessage).toBe("Custom contact success");
  });

  it("creates missing system forms on a clean install", async () => {
    mockGetBySlug.mockResolvedValue(undefined);

    const mod = await import("../services/system-forms.service");
    await mod.ensureSystemForms();

    expect(mockCreate).toHaveBeenCalledTimes(4);
    const createdSlugs = mockCreate.mock.calls.map(([form]) => form.slug);
    expect(createdSlugs).toEqual(
      expect.arrayContaining([
        "contact-form",
        "newsletter-signup",
        "tck-interest",
        "directory-application-start",
      ])
    );
  });
});

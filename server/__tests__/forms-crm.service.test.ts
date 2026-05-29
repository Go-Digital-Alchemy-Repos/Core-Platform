import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetPublicBySlug = vi.fn();
const mockCreateSubmission = vi.fn();
const mockCreateCrmLeadFromFormSubmission = vi.fn();

vi.mock("../storage", () => ({
  storage: {
    forms: {
      getPublicBySlug: mockGetPublicBySlug,
      createSubmission: mockCreateSubmission,
    },
    users: {
      getFormNotificationUsers: vi.fn().mockResolvedValue([]),
      getUsersByRole: vi.fn().mockResolvedValue([]),
    },
    contacts: {
      createMessage: vi.fn(),
    },
  },
}));

vi.mock("../services/mailchimp.service", () => ({
  syncContactToMailchimp: vi.fn(),
}));

vi.mock("../services/email.service", () => ({
  sendContactFormEmail: vi.fn(),
  sendManagedFormSubmissionEmail: vi.fn(),
}));

vi.mock("../services/crm.service", () => ({
  createCrmLeadFromFormSubmission: mockCreateCrmLeadFromFormSubmission,
}));

const form = {
  id: "form-1",
  name: "Lead Form",
  slug: "lead-form",
  kind: "custom",
  isActive: true,
  fields: [
    { id: "name", key: "name", label: "Name", type: "text", required: true, options: [], config: {} },
    { id: "email", key: "email", label: "Email", type: "email", required: true, options: [], config: {} },
  ],
  settings: {
    submitButtonText: "Submit",
    successMessage: "Thanks",
    createCrmLead: true,
  },
};

describe("forms CRM ingestion", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetPublicBySlug.mockResolvedValue(form);
    mockCreateSubmission.mockResolvedValue({ id: "submission-1", formId: "form-1", data: {}, source: "public" });
  });

  it("creates a CRM lead when the form setting is enabled", async () => {
    const { submitManagedFormBySlug } = await import("../services/forms.service");
    await submitManagedFormBySlug("lead-form", { name: "Lin", email: "lin@example.com" });

    expect(mockCreateCrmLeadFromFormSubmission).toHaveBeenCalledWith({
      formName: "Lead Form",
      formSubmissionId: "submission-1",
      data: { name: "Lin", email: "lin@example.com" },
    });
  });

  it("does not create a CRM lead when the form setting is disabled", async () => {
    mockGetPublicBySlug.mockResolvedValue({ ...form, settings: { ...form.settings, createCrmLead: false } });

    const { submitManagedFormBySlug } = await import("../services/forms.service");
    await submitManagedFormBySlug("lead-form", { name: "Lin", email: "lin@example.com" });

    expect(mockCreateCrmLeadFromFormSubmission).not.toHaveBeenCalled();
  });
});

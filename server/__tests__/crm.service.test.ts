import { beforeEach, describe, expect, it, vi } from "vitest";

const mockCreateOrUpdateInboundLead = vi.fn();
const mockUpdateLead = vi.fn();
const mockCreateNote = vi.fn();
const mockGetClientBySourceLeadId = vi.fn();
const mockCreateClient = vi.fn();
const mockCreateClientNote = vi.fn();
const mockUpdateLeadAndCreateWonClient = vi.fn();

vi.mock("../storage", () => ({
  storage: {
    crm: {
      createOrUpdateInboundLead: mockCreateOrUpdateInboundLead,
      updateLead: mockUpdateLead,
      updateLeadAndCreateWonClient: mockUpdateLeadAndCreateWonClient,
      createNote: mockCreateNote,
      getClientBySourceLeadId: mockGetClientBySourceLeadId,
      createClient: mockCreateClient,
      createClientNote: mockCreateClientNote,
    },
  },
}));

describe("crm.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a new lead with normalized inbound data", async () => {
    mockCreateOrUpdateInboundLead.mockImplementation(async (lead) => ({
      lead: { id: "lead-1", ...lead },
      duplicate: false,
    }));

    const { createOrUpdateCrmLead } = await import("../services/crm.service");
    const result = await createOrUpdateCrmLead({
      name: "Ada Lovelace",
      email: "ada@example.com",
      source: "facebook",
      metadata: { campaign: "spring" },
    });

    expect(result.duplicate).toBe(false);
    expect(mockCreateOrUpdateInboundLead).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Ada Lovelace",
        email: "ada@example.com",
        source: "facebook",
        stage: "new",
      }),
      undefined,
    );
  });

  it("delegates duplicate intake to the atomic storage operation", async () => {
    mockCreateOrUpdateInboundLead.mockResolvedValue({
      lead: { id: "lead-1", name: "Ada", email: "ada@example.com" },
      duplicate: true,
    });

    const { createOrUpdateCrmLead } = await import("../services/crm.service");
    const result = await createOrUpdateCrmLead(
      {
        name: "Ada Lovelace",
        email: "ada@example.com",
        source: "zapier",
        message: "New message",
        metadata: { campaign: "retargeting" },
      },
      "admin-1",
    );

    expect(result.duplicate).toBe(true);
    expect(mockCreateOrUpdateInboundLead).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Ada Lovelace",
        email: "ada@example.com",
        source: "zapier",
        metadata: { campaign: "retargeting" },
      }),
      "admin-1",
    );
  });

  it("infers lead contact fields from managed form data", async () => {
    const { inferCrmLeadFromFormData } = await import("../services/crm.service");
    expect(
      inferCrmLeadFromFormData({
        name: { firstName: "Grace", lastName: "Hopper" },
        email: "grace@example.com",
        company: "Compiler Co",
        message: "Please call me.",
      }),
    ).toEqual({
      name: "Grace Hopper",
      email: "grace@example.com",
      phone: null,
      company: "Compiler Co",
      message: "Please call me.",
    });
  });

  it("moves a lead to won with its client creation in one storage operation", async () => {
    mockUpdateLeadAndCreateWonClient.mockImplementation(async (_id, data, buildClient) => ({
      lead: { id: "lead-atomic", ...data },
      client: buildClient({
        id: "lead-atomic",
        name: "Ada Lovelace",
        email: "ada@example.com",
        phone: null,
        company: "Compiler Co",
        message: null,
        stage: "won",
        source: "manual",
        externalId: null,
        formSubmissionId: null,
        formData: {},
        metadata: {},
        ownerId: null,
        nextFollowUpAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    }));

    const { updateCrmLead } = await import("../services/crm.service");
    const lead = await updateCrmLead("lead-atomic", { stage: "won" }, "admin-1");

    expect(lead).toMatchObject({ id: "lead-atomic", stage: "won" });
    expect(mockUpdateLeadAndCreateWonClient).toHaveBeenCalledWith(
      "lead-atomic",
      { stage: "won" },
      expect.any(Function),
      "admin-1",
    );
    expect(mockUpdateLead).not.toHaveBeenCalled();
    const build = mockUpdateLeadAndCreateWonClient.mock.calls[0][2];
    expect(
      build({ id: "business", name: "Ada", company: "Compiler Co", email: "ada@example.test" }),
    ).toMatchObject({
      clientType: "business",
      companyName: "Compiler Co",
      primaryEmail: "ada@example.test",
      preferredContactMethod: "email",
    });
    expect(build({ id: "individual", name: "Grace", phone: "555-0101" })).toMatchObject({
      clientType: "individual",
      primaryPhone: "555-0101",
      preferredContactMethod: "phone",
    });
  });

  it("validates second-stage client profile update fields", async () => {
    const { crmClientUpdateSchema } = await import("@shared/schema");

    expect(() =>
      crmClientUpdateSchema.parse({
        clientType: "business",
        preferredContactMethod: "email",
        onboardingStatus: "in_progress",
        companyName: "Compiler Co",
        city: "Arlington",
        internalTags: ["priority", "renewal"],
      }),
    ).not.toThrow();

    expect(() => crmClientUpdateSchema.parse({ clientType: "household" })).toThrow();
    expect(() => crmClientUpdateSchema.parse({ preferredContactMethod: "fax" })).toThrow();
    expect(() => crmClientUpdateSchema.parse({ onboardingStatus: "stalled" })).toThrow();
  });

  it("routes the old won helper through the atomic path", async () => {
    const existing = { id: "client-1", sourceLeadId: "lead-1" };
    mockUpdateLeadAndCreateWonClient.mockResolvedValue({
      lead: { id: "lead-1" },
      client: existing,
    });
    const { ensureClientForWonLead } = await import("../services/crm.service");
    expect(await ensureClientForWonLead({ id: "lead-1" } as never, "actor")).toBe(existing);
    expect(mockUpdateLeadAndCreateWonClient).toHaveBeenCalledWith(
      "lead-1",
      {},
      expect.any(Function),
      "actor",
    );
    expect(mockCreateClient).not.toHaveBeenCalled();
    expect(mockCreateClientNote).not.toHaveBeenCalled();
  });
  it("external source manual never enables trusted custom creation", async () => {
    mockCreateOrUpdateInboundLead.mockResolvedValue({ lead: { id: "external" }, duplicate: false });
    const { createOrUpdateCrmLead } = await import("../services/crm.service");
    await createOrUpdateCrmLead({
      name: "External",
      source: "manual",
      customFields: [{ definitionId: "forged", value: "private" }],
      customValuesRevision: 99,
    });
    const payload = mockCreateOrUpdateInboundLead.mock.calls[0][0];
    expect(payload.source).toBe("manual");
    expect(payload).not.toHaveProperty("customFields");
    expect(payload).not.toHaveProperty("customValuesRevision");
  });
});

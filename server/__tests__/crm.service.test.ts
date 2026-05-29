import { beforeEach, describe, expect, it, vi } from "vitest";

const mockFindDuplicateLead = vi.fn();
const mockCreateLead = vi.fn();
const mockUpdateLead = vi.fn();
const mockCreateNote = vi.fn();
const mockGetClientBySourceLeadId = vi.fn();
const mockCreateClient = vi.fn();
const mockCreateClientNote = vi.fn();

vi.mock("../storage", () => ({
  storage: {
    crm: {
      findDuplicateLead: mockFindDuplicateLead,
      createLead: mockCreateLead,
      updateLead: mockUpdateLead,
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
    mockFindDuplicateLead.mockResolvedValue(undefined);
    mockCreateLead.mockImplementation(async (lead) => ({ id: "lead-1", ...lead }));

    const { createOrUpdateCrmLead } = await import("../services/crm.service");
    const result = await createOrUpdateCrmLead({
      name: "Ada Lovelace",
      email: "ada@example.com",
      source: "facebook",
      metadata: { campaign: "spring" },
    });

    expect(result.duplicate).toBe(false);
    expect(mockCreateLead).toHaveBeenCalledWith(expect.objectContaining({
      name: "Ada Lovelace",
      email: "ada@example.com",
      source: "facebook",
      stage: "new",
    }));
  });

  it("updates an existing lead and records a duplicate note", async () => {
    mockFindDuplicateLead.mockResolvedValue({
      id: "lead-1",
      name: "Ada",
      email: "ada@example.com",
      phone: null,
      message: "Old message",
      source: "manual",
      metadata: { original: true },
      formData: {},
    });
    mockUpdateLead.mockResolvedValue({ id: "lead-1", name: "Ada", email: "ada@example.com" });

    const { createOrUpdateCrmLead } = await import("../services/crm.service");
    const result = await createOrUpdateCrmLead({
      name: "Ada Lovelace",
      email: "ada@example.com",
      source: "zapier",
      message: "New message",
      metadata: { campaign: "retargeting" },
    }, "admin-1");

    expect(result.duplicate).toBe(true);
    expect(mockUpdateLead).toHaveBeenCalledWith("lead-1", expect.objectContaining({
      message: "New message",
      source: "zapier",
      metadata: { original: true, campaign: "retargeting" },
    }));
    expect(mockCreateNote).toHaveBeenCalledWith(expect.objectContaining({
      leadId: "lead-1",
      createdById: "admin-1",
    }));
  });

  it("infers lead contact fields from managed form data", async () => {
    const { inferCrmLeadFromFormData } = await import("../services/crm.service");
    expect(inferCrmLeadFromFormData({
      name: { firstName: "Grace", lastName: "Hopper" },
      email: "grace@example.com",
      company: "Compiler Co",
      message: "Please call me.",
    })).toEqual({
      name: "Grace Hopper",
      email: "grace@example.com",
      phone: null,
      company: "Compiler Co",
      message: "Please call me.",
    });
  });

  it("creates a client for a won lead", async () => {
    mockGetClientBySourceLeadId.mockResolvedValue(undefined);
    mockCreateClient.mockImplementation(async (client) => ({ id: "client-1", ...client }));

    const { ensureClientForWonLead } = await import("../services/crm.service");
    const client = await ensureClientForWonLead({
      id: "lead-1",
      name: "Ada Lovelace",
      email: "ada@example.com",
      phone: "555-0100",
      company: "Compiler Co",
      message: "Ready",
      stage: "won",
      source: "website_form",
      externalId: null,
      formSubmissionId: null,
      formData: { need: "consulting" },
      metadata: { campaign: "spring" },
      ownerId: "admin-1",
      nextFollowUpAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }, "admin-1");

    expect(client.id).toBe("client-1");
    expect(mockCreateClient).toHaveBeenCalledWith(expect.objectContaining({
      sourceLeadId: "lead-1",
      status: "onboarding",
      name: "Ada Lovelace",
      source: "website_form",
    }));
    expect(mockCreateNote).toHaveBeenCalledWith(expect.objectContaining({ leadId: "lead-1" }));
    expect(mockCreateClientNote).toHaveBeenCalledWith(expect.objectContaining({ clientId: "client-1" }));
  });

  it("does not create duplicate clients for the same won lead", async () => {
    mockGetClientBySourceLeadId.mockResolvedValue({ id: "client-1", sourceLeadId: "lead-1", name: "Ada" });

    const { ensureClientForWonLead } = await import("../services/crm.service");
    const client = await ensureClientForWonLead({
      id: "lead-1",
      name: "Ada",
      email: null,
      phone: null,
      company: null,
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
    });

    expect(client.id).toBe("client-1");
    expect(mockCreateClient).not.toHaveBeenCalled();
    expect(mockCreateClientNote).not.toHaveBeenCalled();
  });
});

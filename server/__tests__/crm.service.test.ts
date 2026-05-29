import { beforeEach, describe, expect, it, vi } from "vitest";

const mockFindDuplicateLead = vi.fn();
const mockCreateLead = vi.fn();
const mockUpdateLead = vi.fn();
const mockCreateNote = vi.fn();

vi.mock("../storage", () => ({
  storage: {
    crm: {
      findDuplicateLead: mockFindDuplicateLead,
      createLead: mockCreateLead,
      updateLead: mockUpdateLead,
      createNote: mockCreateNote,
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
});

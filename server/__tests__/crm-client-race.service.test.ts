import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetClientBySourceLeadId = vi.fn();
const mockCreateClient = vi.fn();
const mockCreateNote = vi.fn();
const mockCreateClientNote = vi.fn();
const mockFindDuplicateLead = vi.fn();
const mockCreateLead = vi.fn();
const mockUpdateLead = vi.fn();

vi.mock("../storage", () => ({
  storage: {
    crm: {
      getClientBySourceLeadId: mockGetClientBySourceLeadId,
      createClient: mockCreateClient,
      createNote: mockCreateNote,
      createClientNote: mockCreateClientNote,
      findDuplicateLead: mockFindDuplicateLead,
      createLead: mockCreateLead,
      updateLead: mockUpdateLead,
    },
  },
}));

describe("CRM won-lead conversion concurrency", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the client created by a concurrent request after a unique conflict", async () => {
    const concurrentClient = { id: "client-1", sourceLeadId: "lead-1", name: "Ada" };
    mockGetClientBySourceLeadId
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(concurrentClient);
    mockCreateClient.mockRejectedValue(
      Object.assign(new Error("duplicate key"), { code: "23505" }),
    );

    const { ensureClientForWonLead } = await import("../services/crm.service");
    const result = await ensureClientForWonLead({
      id: "lead-1",
      name: "Ada",
      email: "ada@example.com",
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

    expect(result).toBe(concurrentClient);
    expect(mockCreateNote).not.toHaveBeenCalled();
    expect(mockCreateClientNote).not.toHaveBeenCalled();
  });

  it("recovers a lead created by a concurrent request using its dedupe key", async () => {
    const concurrentLead = {
      id: "lead-1",
      email: "ada@example.com",
      phone: null,
      metadata: {},
      formData: {},
      message: null,
      source: "manual",
      externalId: null,
      formSubmissionId: null,
      emailDedupeKey: "ada@example.com",
      phoneDedupeKey: null,
    };
    mockFindDuplicateLead.mockResolvedValueOnce(undefined).mockResolvedValueOnce(concurrentLead);
    mockCreateLead.mockRejectedValue(Object.assign(new Error("duplicate key"), { code: "23505" }));
    mockUpdateLead.mockResolvedValue(concurrentLead);

    const { createOrUpdateCrmLead } = await import("../services/crm.service");
    const result = await createOrUpdateCrmLead({
      name: "Ada",
      email: "ada@example.com",
      source: "manual",
    });

    expect(result.duplicate).toBe(true);
    expect(mockFindDuplicateLead).toHaveBeenLastCalledWith(
      expect.objectContaining({
        emailDedupeKey: "ada@example.com",
        phoneDedupeKey: null,
      }),
    );
  });
});

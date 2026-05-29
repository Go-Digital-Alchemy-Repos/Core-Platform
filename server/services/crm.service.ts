import {
  crmLeadInputSchema,
  type CrmClient,
  type CrmLead,
  type CrmLeadInput,
} from "@shared/schema";
import { storage } from "../storage";

function cleanString(value: string | null | undefined) {
  const trimmed = typeof value === "string" ? value.trim() : "";
  return trimmed || null;
}

function valueToString(value: unknown): string | null {
  if (typeof value === "string") return cleanString(value);
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const parts = [record.firstName, record.lastName, record.name]
      .map((part) => valueToString(part))
      .filter(Boolean);
    return parts.length > 0 ? parts.join(" ") : null;
  }
  return null;
}

export function inferCrmLeadFromFormData(data: Record<string, unknown>): Pick<CrmLeadInput, "name" | "email" | "phone" | "company" | "message"> {
  const name =
    valueToString(data.name) ||
    valueToString(data.fullName) ||
    [valueToString(data.firstName), valueToString(data.lastName)].filter(Boolean).join(" ") ||
    valueToString(data.email) ||
    "Website Lead";

  return {
    name,
    email: valueToString(data.email),
    phone: valueToString(data.phone) || valueToString(data.tel),
    company: valueToString(data.company) || valueToString(data.organization),
    message: valueToString(data.message) || valueToString(data.comments) || valueToString(data.details),
  };
}

export async function createOrUpdateCrmLead(input: unknown, createdById?: string | null): Promise<{ lead: CrmLead; duplicate: boolean }> {
  const parsed = crmLeadInputSchema.parse(input);
  const payload = {
    ...parsed,
    email: cleanString(parsed.email),
    phone: cleanString(parsed.phone),
    company: cleanString(parsed.company),
    message: cleanString(parsed.message),
    externalId: cleanString(parsed.externalId),
    ownerId: cleanString(parsed.ownerId),
    formSubmissionId: cleanString(parsed.formSubmissionId),
    nextFollowUpAt: parsed.nextFollowUpAt ?? null,
  };

  const duplicate = await storage.crm.findDuplicateLead(payload);
  if (duplicate) {
    const updated = await storage.crm.updateLead(duplicate.id, {
      metadata: { ...(duplicate.metadata ?? {}), ...(payload.metadata ?? {}) },
      formData: { ...(duplicate.formData ?? {}), ...(payload.formData ?? {}) },
      message: payload.message ?? duplicate.message,
      source: payload.source ?? duplicate.source,
      externalId: payload.externalId ?? duplicate.externalId,
      formSubmissionId: payload.formSubmissionId ?? duplicate.formSubmissionId,
    });
    await storage.crm.createNote({
      leadId: duplicate.id,
      createdById: createdById ?? null,
      body: `Duplicate lead received from ${payload.source}. Existing lead was updated.`,
    });
    return { lead: updated ?? duplicate, duplicate: true };
  }

  return {
    lead: await storage.crm.createLead(payload),
    duplicate: false,
  };
}

export async function createCrmLeadFromFormSubmission({
  formName,
  formSubmissionId,
  data,
}: {
  formName: string;
  formSubmissionId: string;
  data: Record<string, unknown>;
}) {
  return createOrUpdateCrmLead({
    ...inferCrmLeadFromFormData(data),
    source: "website_form",
    formSubmissionId,
    formData: data,
    metadata: { formName },
  });
}

export async function ensureClientForWonLead(lead: CrmLead, createdById?: string | null): Promise<CrmClient> {
  const existing = await storage.crm.getClientBySourceLeadId(lead.id);
  if (existing) return existing;
  const clientType = cleanString(lead.company) ? "business" : "individual";
  const now = new Date();

  const client = await storage.crm.createClient({
    sourceLeadId: lead.id,
    name: lead.name,
    email: lead.email,
    phone: lead.phone,
    company: lead.company,
    clientType,
    primaryEmail: lead.email,
    primaryPhone: lead.phone,
    preferredContactMethod: lead.email ? "email" : lead.phone ? "phone" : "no_preference",
    companyName: lead.company,
    onboardingStatus: "not_started",
    clientSince: now,
    status: "onboarding",
    source: lead.source,
    formData: lead.formData ?? {},
    metadata: {
      ...(lead.metadata ?? {}),
      convertedFromLeadId: lead.id,
      convertedAt: new Date().toISOString(),
    },
    ownerId: lead.ownerId,
    nextFollowUpAt: lead.nextFollowUpAt,
  });

  await storage.crm.createNote({
    leadId: lead.id,
    createdById: createdById ?? null,
    body: "Lead converted to client after moving to Won.",
  });
  await storage.crm.createClientNote({
    clientId: client.id,
    createdById: createdById ?? null,
    body: "Client created from won lead.",
  });

  return client;
}

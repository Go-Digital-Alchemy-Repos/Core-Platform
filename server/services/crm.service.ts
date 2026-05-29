import { crmLeadInputSchema, type CrmLeadInput, type CrmLead } from "@shared/schema";
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

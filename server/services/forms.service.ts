import type { CrmMappingError } from "@shared/crm-form-mapping-resolver";
import { resolveCrmFormMapping } from "@shared/crm-form-mapping-resolver";
import { crmMappedFormIntakeSchema } from "@shared/crm-form-intake";
import { CrmCustomFieldsStorage } from "../storage/crm-custom-fields.storage";
import { isSiteFeatureEnabled } from "./site-features.service";
import { stringValue, objectValue, validateSubmissionData } from "@shared/managed-form-validation";
import type { CmsForm, PublicCmsForm, CmsFormEffectPayload } from "@shared/schema";
import { storage } from "../storage";
import { syncContactToMailchimp } from "./mailchimp.service";
import { AppError } from "../middleware/error-handler";

export class MappedFormSubmissionError extends AppError {
  readonly errors: Array<{
    sourceFieldId: string | null;
    code: "invalid_value" | "required_value";
  }>;
  constructor(errors: CrmMappingError[]) {
    super("Please check the mapped form fields and try again", 400);
    this.errors = errors.map((error) => ({
      sourceFieldId: error.sourceFieldId,
      code: error.code === "required_value" ? "required_value" : "invalid_value",
    }));
  }
}

function normalizeFormSettings(form: CmsForm) {
  const settings = (
    typeof form.settings === "object" && form.settings ? form.settings : {}
  ) as Record<string, unknown>;
  return {
    submitButtonText:
      typeof settings.submitButtonText === "string" && settings.submitButtonText.trim()
        ? settings.submitButtonText.trim()
        : "Submit",
    successMessage:
      typeof settings.successMessage === "string" && settings.successMessage.trim()
        ? settings.successMessage.trim()
        : "Thanks! Your submission has been received.",
    mailchimpEnabled: Boolean(settings.mailchimpEnabled),
    mailchimpTag: typeof settings.mailchimpTag === "string" ? settings.mailchimpTag.trim() : "",
    notifyAdmins: Boolean(settings.notifyAdmins),
    storeAsContactMessage: Boolean(settings.storeAsContactMessage),
    createCrmLead: Boolean(settings.createCrmLead),
  };
}

function extractNameParts(data: Record<string, unknown>) {
  const firstName = stringValue(data.firstName);
  const lastName = stringValue(data.lastName);

  if (firstName || lastName) {
    return { firstName, lastName };
  }

  const nameField = data.name;
  if (typeof nameField === "object" && nameField !== null) {
    const record = objectValue(nameField);
    const splitFirst = stringValue(record.firstName);
    const splitLast = stringValue(record.lastName);
    if (splitFirst || splitLast) {
      return { firstName: splitFirst, lastName: splitLast };
    }

    const embeddedFull = stringValue(record.fullName);
    if (embeddedFull) {
      const [head, ...rest] = embeddedFull.split(/\s+/);
      return { firstName: head ?? "", lastName: rest.join(" ") };
    }
  }

  const fullName = stringValue(data.name);
  if (!fullName) {
    for (const value of Object.values(data)) {
      if (typeof value === "object" && value !== null) {
        const record = objectValue(value);
        const nestedFirst = stringValue(record.firstName);
        const nestedLast = stringValue(record.lastName);
        if (nestedFirst || nestedLast) {
          return { firstName: nestedFirst, lastName: nestedLast };
        }
      }
    }

    return { firstName: "", lastName: "" };
  }

  const [head, ...rest] = fullName.split(/\s+/);
  return {
    firstName: head ?? "",
    lastName: rest.join(" "),
  };
}

async function maybeSyncFormToMailchimp(form: CmsForm, data: Record<string, unknown>) {
  const settings = normalizeFormSettings(form);
  if (!settings.mailchimpEnabled || !settings.mailchimpTag) return;

  const email = stringValue(data.email);
  if (!email) return;

  const { firstName, lastName } = extractNameParts(data);
  await syncContactToMailchimp({
    email,
    firstName,
    lastName,
    tags: [settings.mailchimpTag],
  });
}

function formatSubmissionValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (Array.isArray(value)) {
    const normalized = value
      .map((item) => formatSubmissionValue(item))
      .filter((item) => item && item !== "—");
    return normalized.length > 0 ? normalized.join(", ") : "—";
  }
  if (typeof value === "object") {
    const record = objectValue(value);
    const normalized = Object.values(record)
      .map((item) => stringValue(item))
      .filter(Boolean);
    return normalized.length > 0 ? normalized.join(", ") : "—";
  }
  return String(value);
}

function buildSubmissionSummary(form: CmsForm, data: Record<string, unknown>) {
  const lines = (Array.isArray(form.fields) ? form.fields : [])
    .filter(
      (field) =>
        field.type !== "hidden" &&
        field.type !== "html" &&
        field.type !== "section" &&
        field.type !== "page",
    )
    .map((field) => `${field.label}: ${formatSubmissionValue(data[field.key])}`)
    .filter(Boolean);

  return lines.join("\n");
}

type SubmissionOptions = { baseUrl?: string; source?: string; idempotencyKey?: string };

async function buildFormEffects(form: CmsForm, data: Record<string, unknown>, baseUrl?: string) {
  const settings = normalizeFormSettings(form);
  const effects: CmsFormEffectPayload[] = [];
  if (settings.createCrmLead) effects.push({ kind: "crm_intake", formName: form.name });
  const contact = {
    name: stringValue(data.name),
    email: stringValue(data.email),
    subject: stringValue(data.subject),
    message: stringValue(data.message),
  };
  const hasContact = settings.storeAsContactMessage && Object.values(contact).every(Boolean);
  if (hasContact) effects.push({ kind: "contact_message" });
  const email = stringValue(data.email);
  if (settings.mailchimpEnabled && settings.mailchimpTag && email) {
    effects.push({
      kind: "mailchimp_sync",
      email,
      ...extractNameParts(data),
      tag: settings.mailchimpTag,
    });
  }
  if (settings.notifyAdmins && (!settings.storeAsContactMessage || hasContact)) {
    let users = await storage.users.getFormNotificationUsers(form.id);
    if (hasContact && !users.some((user) => user.email)) {
      users = await storage.users.getUsersByRole("admin");
    }
    const recipients = [
      ...new Set(
        users
          .map((user) => user.email?.trim().toLowerCase())
          .filter((email): email is string => Boolean(email)),
      ),
    ];
    for (const recipient of recipients)
      effects.push({
        kind: "admin_notification",
        recipient,
        formName: form.name,
        summary: buildSubmissionSummary(form, data),
        dashboardUrl: `${baseUrl ?? process.env.APP_URL ?? ""}${hasContact ? "/admin" : "/admin/forms"}`,
        contact: hasContact
          ? { name: contact.name, email: contact.email, message: contact.message }
          : null,
      });
  }
  return effects;
}

async function submitManagedForm(form: PublicCmsForm, data: unknown, options: SubmissionOptions) {
  const idempotencyKey = options.idempotencyKey?.trim();
  if (idempotencyKey && idempotencyKey.length > 128)
    throw new AppError("Idempotency key must be 128 characters or fewer", 400);
  return storage.forms.withSubmissionForm(form.id, async (current, tx) => {
    const validated = validateSubmissionData(current, data);
    const existing = idempotencyKey
      ? await storage.forms.findSubmissionByKey(current.id, idempotencyKey, tx)
      : undefined;
    if (existing)
      return {
        form,
        submission: existing,
        duplicate: true,
        successMessage: normalizeFormSettings(current).successMessage,
      };
    const effects = await buildFormEffects(current, validated, options.baseUrl);
    if (current.crmMapping !== null) {
      if (!(await isSiteFeatureEnabled("crmEnabled")))
        throw new AppError("Form is temporarily unavailable", 503);
      const mapped = resolveCrmFormMapping({
        mapping: current.crmMapping,
        mappingRevision: current.crmMappingRevision,
        createCrmLead: current.settings.createCrmLead === true,
        fields: current.fields,
        definitions: await new CrmCustomFieldsStorage().listDefinitions(tx),
        validatedData: validated,
      });
      if (!mapped.ok) {
        if (mapped.kind === "configuration_unavailable")
          throw new AppError("Form is temporarily unavailable", 503);
        throw new MappedFormSubmissionError(mapped.errors);
      }
      if (mapped.mode !== "explicit") throw new AppError("Form is temporarily unavailable", 503);
      const payload = crmMappedFormIntakeSchema.safeParse({
        kind: "crm_intake",
        version: 1,
        formId: current.id,
        formName: current.name,
        mappingRevision: mapped.mappingRevision,
        normalizedBuiltins: mapped.normalizedBuiltins,
        customValues: mapped.customValues,
      });
      if (!payload.success)
        throw new MappedFormSubmissionError([{ sourceFieldId: null, code: "invalid_value" }]);
      const index = effects.findIndex((effect) => effect.kind === "crm_intake");
      if (index < 0) throw new AppError("Form is temporarily unavailable", 503);
      effects[index] = payload.data;
    }
    const result = await storage.forms.createSubmissionWithEffects(
      {
        formId: current.id,
        data: validated,
        source: options.source ?? null,
        idempotencyKey: idempotencyKey || null,
      },
      effects,
      tx,
    );
    return {
      form,
      submission: result.submission,
      duplicate: !result.created,
      successMessage: normalizeFormSettings(current).successMessage,
    };
  });
}

export async function submitManagedFormBySlug(
  slug: string,
  data: unknown,
  options: SubmissionOptions = {},
) {
  const form = await storage.forms.getPublicBySlug(slug);
  if (!form) throw new AppError("Form not found", 404);
  return submitManagedForm(form, data, options);
}

export async function submitManagedFormById(
  id: string,
  data: unknown,
  options: SubmissionOptions = {},
) {
  const form = await storage.forms.getPublicById(id);
  if (!form) throw new AppError("Form not found", 404);
  return submitManagedForm(form, data, options);
}

export async function syncSystemFormToMailchimp(
  slug: string,
  data: {
    email: string;
    firstName?: string | null;
    lastName?: string | null;
  },
) {
  const form = await storage.forms.getBySlug(slug);
  if (!form) return;

  await maybeSyncFormToMailchimp(form, {
    email: data.email,
    firstName: data.firstName ?? "",
    lastName: data.lastName ?? "",
  });
}

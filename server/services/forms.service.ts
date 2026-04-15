import type { CmsForm, CmsFormField, InsertCmsFormSubmission } from "@shared/schema";
import { storage } from "../storage";
import { logger } from "../utils/logger";
import { sendContactFormEmail, sendManagedFormSubmissionEmail } from "./email.service";
import { syncContactToMailchimp } from "./mailchimp.service";
import { AppError } from "../middleware/error-handler";

function normalizeFormSettings(form: CmsForm) {
  const settings = (typeof form.settings === "object" && form.settings
    ? form.settings
    : {}) as Record<string, unknown>;
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
  };
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function booleanValue(value: unknown) {
  return value === true || value === "true" || value === "on" || value === 1;
}

function stringArrayValue(value: unknown) {
  if (Array.isArray(value)) {
    return value
      .map((item) => stringValue(item))
      .filter(Boolean);
  }

  const single = stringValue(value);
  return single ? [single] : [];
}

function objectValue(value: unknown) {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function normalizeUrl(value: string) {
  if (!value) return value;
  if (/^https?:\/\//i.test(value)) return value;
  return `https://${value}`;
}

function validateField(field: CmsFormField, raw: unknown) {
  const config = (typeof field.config === "object" && field.config
    ? field.config
    : {}) as Record<string, unknown>;
  const selectionMode = config.selectionMode === "multiple" ? "multiple" : "single";

  if (field.type === "html" || field.type === "section" || field.type === "page") {
    return { value: null };
  }

  if (field.type === "hidden") {
    const value = stringValue(raw) || (typeof config.defaultValue === "string" ? config.defaultValue : "");
    if (field.required && !value) {
      return { error: `${field.label} is required` };
    }
    return { value };
  }

  if (field.type === "consent") {
    const checked = booleanValue(raw);
    if (field.required && !checked) {
      return { error: `${field.label} is required` };
    }
    return { value: checked };
  }

  if (
    field.type === "checkbox" ||
    field.type === "multiselect" ||
    (field.type === "image-choice" && selectionMode === "multiple")
  ) {
    const values = stringArrayValue(raw);
    if (field.required && values.length === 0) {
      return { error: `${field.label} is required` };
    }
    if (Array.isArray(field.options) && field.options.length > 0) {
      const validValues = new Set(field.options.map((option) => option.value));
      const hasInvalid = values.some((value) => !validValues.has(value));
      if (hasInvalid) {
        return { error: `${field.label} has an invalid value` };
      }
    }
    return { value: values };
  }

  if (field.type === "select" || field.type === "radio" || field.type === "image-choice") {
    const value = stringValue(raw);
    if (field.required && !value) {
      return { error: `${field.label} is required` };
    }
    if (!value) return { value: "" };
    if (Array.isArray(field.options) && field.options.length > 0) {
      const validValues = new Set(field.options.map((option) => option.value));
      if (!validValues.has(value)) {
        return { error: `${field.label} has an invalid value` };
      }
    }
    return { value };
  }

  if (field.type === "name") {
    if (config.nameFormat === "split") {
      const value = objectValue(raw);
      const firstName = stringValue(value.firstName);
      const lastName = stringValue(value.lastName);
      if (field.required && !firstName && !lastName) {
        return { error: `${field.label} is required` };
      }
      return { value: { firstName, lastName } };
    }

    const fullName = stringValue(typeof raw === "object" && raw !== null ? objectValue(raw).fullName : raw);
    if (field.required && !fullName) {
      return { error: `${field.label} is required` };
    }
    return { value: { fullName } };
  }

  if (field.type === "address") {
    const value = objectValue(raw);
    const normalized = {
      street: stringValue(value.street),
      street2: stringValue(value.street2),
      city: stringValue(value.city),
      state: stringValue(value.state),
      postalCode: stringValue(value.postalCode),
      country: stringValue(value.country),
    };

    if (
      field.required &&
      !normalized.street &&
      !normalized.city &&
      !normalized.state &&
      !normalized.postalCode &&
      !normalized.country
    ) {
      return { error: `${field.label} is required` };
    }

    return { value: normalized };
  }

  if (field.type === "list") {
    const rows = Array.isArray(raw)
      ? raw
          .map((row) => {
            const record = objectValue(row);
            return Object.fromEntries(
              Object.entries(record).map(([key, value]) => [key, stringValue(value)])
            );
          })
          .filter((row) => Object.values(row).some(Boolean))
      : [];

    if (field.required && rows.length === 0) {
      return { error: `${field.label} is required` };
    }

    return { value: rows };
  }

  if (field.type === "number") {
    const value = stringValue(raw);
    if (field.required && !value) {
      return { error: `${field.label} is required` };
    }
    if (!value) return { value: "" };
    if (Number.isNaN(Number(value))) {
      return { error: `${field.label} must be a valid number` };
    }
    return { value: Number(value) };
  }

  let value = stringValue(raw);

  if (field.required && !value) {
    return { error: `${field.label} is required` };
  }

  if (!value) {
    return { value: "" };
  }

  if (field.type === "email") {
    const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    if (!isValid) {
      return { error: `${field.label} must be a valid email address` };
    }
  }

  if (field.type === "website") {
    try {
      value = normalizeUrl(value);
      new URL(value);
    } catch {
      return { error: `${field.label} must be a valid URL` };
    }
  }

  return { value };
}

function validateSubmissionData(form: CmsForm, data: unknown) {
  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    throw new AppError("Form submission must be an object", 400);
  }

  const input = data as Record<string, unknown>;
  const validated: Record<string, unknown> = {};

  for (const field of Array.isArray(form.fields) ? form.fields : []) {
    const result = validateField(field, input[field.key]);
    if (result.error) {
      throw new AppError(result.error, 400);
    }
    validated[field.key] = result.value ?? "";
  }

  return validated;
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

async function handleContactFormEffects(form: CmsForm, data: Record<string, unknown>, baseUrl?: string) {
  const settings = normalizeFormSettings(form);
  if (!settings.storeAsContactMessage) return;

  const name = stringValue(data.name);
  const email = stringValue(data.email);
  const subject = stringValue(data.subject);
  const message = stringValue(data.message);

  if (!name || !email || !subject || !message) {
    return;
  }

  await storage.contacts.createMessage({ name, email, subject, message });

  if (!settings.notifyAdmins) return;

  const assignedUsers = await storage.users.getFormNotificationUsers(form.id);
  const recipientEmails = assignedUsers.map((user) => user.email).filter(Boolean);
  const adminEmails =
    recipientEmails.length > 0
      ? recipientEmails
      : (await storage.users.getUsersByRole("admin")).map((admin) => admin.email).filter(Boolean);
  if (adminEmails.length === 0) return;

  sendContactFormEmail(
    adminEmails,
    name,
    email,
    message,
    `${baseUrl ?? process.env.APP_URL ?? ""}/admin`
  ).catch((err) => {
    logger.email.warn("Failed to send contact form notification", {
      formSlug: form.slug,
      error: err instanceof Error ? err.message : String(err),
    });
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
    .filter((field) => field.type !== "hidden" && field.type !== "html" && field.type !== "section" && field.type !== "page")
    .map((field) => `${field.label}: ${formatSubmissionValue(data[field.key])}`)
    .filter(Boolean);

  return lines.join("\n");
}

async function notifyAssignedUsers(form: CmsForm, data: Record<string, unknown>, baseUrl?: string) {
  const settings = normalizeFormSettings(form);
  if (!settings.notifyAdmins || settings.storeAsContactMessage) return;

  const recipients = await storage.users.getFormNotificationUsers(form.id);
  const recipientEmails = recipients.map((user) => user.email).filter(Boolean);
  if (recipientEmails.length === 0) return;

  const dashboardUrl = `${baseUrl ?? process.env.APP_URL ?? ""}/admin/forms`;
  const submissionSummary = buildSubmissionSummary(form, data);

  sendManagedFormSubmissionEmail(
    recipientEmails,
    form.name,
    submissionSummary,
    dashboardUrl
  ).catch((err) => {
    logger.email.warn("Failed to send managed form notification", {
      formSlug: form.slug,
      error: err instanceof Error ? err.message : String(err),
    });
  });
}

export async function submitManagedFormBySlug(
  slug: string,
  data: unknown,
  options: { baseUrl?: string; source?: string } = {}
) {
  const form = await storage.forms.getPublicBySlug(slug);
  if (!form) {
    throw new AppError("Form not found", 404);
  }

  const validated = validateSubmissionData(form, data);

  const submissionPayload: InsertCmsFormSubmission = {
    formId: form.id,
    data: validated,
    source: options.source ?? null,
  };

  const submission = await storage.forms.createSubmission(submissionPayload);

  await maybeSyncFormToMailchimp(form, validated);
  await handleContactFormEffects(form, validated, options.baseUrl);
  await notifyAssignedUsers(form, validated, options.baseUrl);

  return {
    form,
    submission,
    successMessage: normalizeFormSettings(form).successMessage,
  };
}

export async function syncSystemFormToMailchimp(
  slug: string,
  data: {
    email: string;
    firstName?: string | null;
    lastName?: string | null;
  }
) {
  const form = await storage.forms.getBySlug(slug);
  if (!form) return;

  await maybeSyncFormToMailchimp(form, {
    email: data.email,
    firstName: data.firstName ?? "",
    lastName: data.lastName ?? "",
  });
}

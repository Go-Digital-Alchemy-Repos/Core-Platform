import type { CmsForm, CmsFormField, InsertCmsFormSubmission } from "@shared/schema";
import { storage } from "../storage";
import { logger } from "../utils/logger";
import { sendContactFormEmail } from "./email.service";
import { syncContactToMailchimp } from "./mailchimp.service";
import { AppError } from "../middleware/error-handler";

function normalizeFormSettings(form: CmsForm) {
  const settings = typeof form.settings === "object" && form.settings ? form.settings : {};
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

function validateField(field: CmsFormField, raw: unknown) {
  const value = stringValue(raw);

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

  if (field.type === "select" && Array.isArray(field.options) && field.options.length > 0) {
    const validValues = new Set(field.options.map((option) => option.value));
    if (!validValues.has(value)) {
      return { error: `${field.label} has an invalid value` };
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

  const fullName = stringValue(data.name);
  if (!fullName) {
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

  const admins = await storage.users.getUsersByRole("admin");
  const adminEmails = admins.map((admin) => admin.email).filter(Boolean);
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

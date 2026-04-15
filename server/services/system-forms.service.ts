import type { CmsFormField, CmsFormSettings, InsertCmsForm } from "@shared/schema";
import { storage } from "../storage";
import { logger } from "../utils/logger";

function field(
  id: string,
  key: string,
  label: string,
  type: CmsFormField["type"],
  options: Partial<CmsFormField> = {}
): CmsFormField {
  return {
    id,
    key,
    label,
    type,
    placeholder: "",
    helpText: "",
    required: false,
    width: "full",
    options: [],
    ...options,
  };
}

function settings(overrides: Partial<CmsFormSettings>): CmsFormSettings {
  return {
    submitButtonText: "Submit",
    successMessage: "Thanks! Your submission has been received.",
    mailchimpEnabled: false,
    mailchimpTag: "",
    notifyAdmins: false,
    storeAsContactMessage: false,
    ...overrides,
  };
}

const SYSTEM_FORMS: InsertCmsForm[] = [
  {
    name: "Contact Form",
    slug: "contact-form",
    description: "Primary public contact form used on the Contact page and embeddable form blocks.",
    kind: "contact",
    isSystem: true,
    isActive: true,
    fields: [
      field("name", "name", "Name", "text", { placeholder: "Your name", required: true, width: "half" }),
      field("email", "email", "Email", "email", { placeholder: "you@example.com", required: true, width: "half" }),
      field("subject", "subject", "Subject", "text", { placeholder: "What is this about?", required: true }),
      field("message", "message", "Message", "textarea", { placeholder: "Tell us more...", required: true }),
    ],
    settings: settings({
      submitButtonText: "Send Message",
      successMessage: "Thank you for reaching out. We'll get back to you soon.",
      mailchimpEnabled: true,
      mailchimpTag: "TCK General Inquiry",
      notifyAdmins: true,
      storeAsContactMessage: true,
    }),
  },
  {
    name: "Newsletter Signup",
    slug: "newsletter-signup",
    description: "Newsletter form used in widgets and embeddable form blocks.",
    kind: "newsletter",
    isSystem: true,
    isActive: true,
    fields: [
      field("email", "email", "Email", "email", {
        placeholder: "you@example.com",
        required: true,
      }),
    ],
    settings: settings({
      submitButtonText: "Sign Up",
      successMessage: "You're on the list. We'll keep you posted.",
      mailchimpEnabled: true,
      mailchimpTag: "TCK Newsletter",
    }),
  },
  {
    name: "TCK Interest Form",
    slug: "tck-interest",
    description: "General interest and learn-more form for future growth flows.",
    kind: "interest",
    isSystem: true,
    isActive: true,
    fields: [
      field("name", "name", "Name", "text", { placeholder: "Your name", required: true, width: "half" }),
      field("email", "email", "Email", "email", { placeholder: "you@example.com", required: true, width: "half" }),
      field("message", "message", "Message", "textarea", { placeholder: "What are you interested in?" }),
    ],
    settings: settings({
      submitButtonText: "Send Interest",
      successMessage: "Thanks for your interest. We’ll be in touch soon.",
      mailchimpEnabled: true,
      mailchimpTag: "TCK Interest",
    }),
  },
  {
    name: "Directory Application Start",
    slug: "directory-application-start",
    description: "System workflow form used when a registered directory user starts their application.",
    kind: "application",
    isSystem: true,
    isActive: true,
    fields: [],
    settings: settings({
      mailchimpEnabled: true,
      mailchimpTag: "TCK Directory Applicants",
    }),
  },
];

export async function ensureSystemForms() {
  logger.app.info("Ensuring system forms");

  for (const systemForm of SYSTEM_FORMS) {
    const existing = await storage.forms.getBySlug(systemForm.slug);
    if (existing) {
      await storage.forms.update(existing.id, {
        name: existing.name || systemForm.name,
        description: existing.description ?? systemForm.description ?? "",
        kind: existing.kind || systemForm.kind,
        isSystem: true,
        isActive: existing.isActive ?? true,
        fields: Array.isArray(existing.fields) && existing.fields.length > 0 ? existing.fields : systemForm.fields,
        settings: {
          ...systemForm.settings,
          ...(typeof existing.settings === "object" && existing.settings ? existing.settings : {}),
        },
      });
      continue;
    }

    await storage.forms.create(systemForm);
  }

  logger.app.info("System forms ensured");
}

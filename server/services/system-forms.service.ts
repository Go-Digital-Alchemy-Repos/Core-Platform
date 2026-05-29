import { cmsFormFieldSchema, type CmsFormField, type CmsFormSettings, type InsertCmsForm } from "@shared/schema";
import { z } from "zod";
import { storage } from "../storage";
import { logger } from "../utils/logger";

type CmsFormFieldInput = z.input<typeof cmsFormFieldSchema>;

function field(
  id: string,
  key: string,
  label: string,
  type: CmsFormField["type"],
  options: Partial<CmsFormFieldInput> = {}
): CmsFormField {
  return cmsFormFieldSchema.parse({
    id,
    key,
    label,
    type,
    placeholder: "",
    helpText: "",
    required: false,
    width: "full",
    options: [],
    config: {},
    ...options,
  });
}

function settings(overrides: Partial<CmsFormSettings>): CmsFormSettings {
  return {
    submitButtonText: "Submit",
    successMessage: "Thanks! Your submission has been received.",
    mailchimpEnabled: false,
    mailchimpTag: "",
    notifyAdmins: false,
    storeAsContactMessage: false,
    createCrmLead: false,
    ...overrides,
  };
}

type ManagedSystemForm = InsertCmsForm;

const SYSTEM_FORMS: ManagedSystemForm[] = [
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
      mailchimpTag: "Core Platform General Inquiry",
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
      mailchimpTag: "Core Platform Newsletter",
    }),
  },
  {
    name: "Core Platform Interest Form",
    slug: "corePlatform-interest",
    description: "Launch update and early-interest form for people who want to stay informed about Core Platform.",
    kind: "interest",
    isSystem: true,
    isActive: true,
    fields: [
      field("intro", "intro", "Introduction", "html", {
        config: {
          htmlContent:
            "<p><strong>We're so excited for the launch of Core Platform coming late 2026!</strong></p><p>We envision a world where Third Culture Kids (Core Platforms) no longer face misunderstanding or misdiagnosis due to the nuances of a globally-mobile upbringing, but have access to professionals providing Core Platform-informed care.</p><p>Our goal is to do this by developing a database of Core Platform-informed providers who receive ongoing training after thorough vetting.</p><p>If you'd like to be updated on the launch, please give us your information below.</p>",
        },
      }),
      field("name", "name", "Name", "name", {
        required: true,
        config: { nameFormat: "split" },
      }),
      field("email", "email", "Email", "email", {
        placeholder: "example@example.com",
        required: true,
      }),
      field("demographics", "demographics", "What demographic do you fit into? Choose all that apply!", "checkbox", {
        required: true,
        options: [
          { label: "Core Platform", value: "corePlatform" },
          { label: "Counselor", value: "counselor" },
          { label: "Core Platform Parent", value: "corePlatform-parent" },
          { label: "Core Platform Caregiver", value: "corePlatform-caregiver" },
          { label: "Adult Core Platform", value: "adult-corePlatform" },
          { label: "Other", value: "other" },
        ],
      }),
      field("website", "website", "If you are a counselor and would like to give us your website link please do so below.", "website", {
        placeholder: "https://yourwebsite.com",
      }),
      field(
        "counselor_info",
        "counselorInfo",
        "If you're a counselor and you're interested in getting vetted in the future, what would you need to know in order to apply?",
        "textarea",
        {
          placeholder: "Share what information would help you evaluate applying in the future.",
        }
      ),
      field(
        "testimonial",
        "testimonial",
        "We're gathering a few short testimonials for our website about why this initiative feels needed. If you're willing, please share 1-2 sentences answering: \"Why are you excited about the Core Platform Initiative?\" Quotes will be shared using first names only.",
        "textarea",
        {
          placeholder: "Share 1-2 sentences if you'd like to contribute a testimonial.",
        }
      ),
    ],
    settings: settings({
      submitButtonText: "Keep Me Informed",
      successMessage: "Thanks for your interest. We'll keep you informed about the Core Platform launch.",
      mailchimpEnabled: true,
      mailchimpTag: "Core Platform Interest",
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
      mailchimpTag: "Core Platform Directory Applicants",
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
        fields:
          Array.isArray(existing.fields) && existing.fields.length > 0
            ? existing.fields
            : systemForm.fields,
        settings:
          {
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

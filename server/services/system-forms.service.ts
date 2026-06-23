import {
  cmsFormFieldSchema,
  type CmsFormField,
  type CmsFormSettings,
  type InsertCmsForm,
} from "@shared/schema";
import { z } from "zod";
import { storage } from "../storage";
import { logger } from "../utils/logger";

type CmsFormFieldInput = z.input<typeof cmsFormFieldSchema>;

function field(
  id: string,
  key: string,
  label: string,
  type: CmsFormField["type"],
  options: Partial<CmsFormFieldInput> = {},
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
      field("name", "name", "Name", "text", {
        placeholder: "Your name",
        required: true,
        width: "half",
      }),
      field("email", "email", "Email", "email", {
        placeholder: "you@example.com",
        required: true,
        width: "half",
      }),
      field("subject", "subject", "Subject", "text", {
        placeholder: "What is this about?",
        required: true,
      }),
      field("message", "message", "Message", "textarea", {
        placeholder: "Tell us more...",
        required: true,
      }),
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
    name: "Residential Quote Request",
    slug: "residential-quote",
    description: "Primary Carolina Exterior residential quote form used by the public site.",
    kind: "contact",
    isSystem: true,
    isActive: true,
    fields: [
      field("name", "name", "Full Name", "text", {
        placeholder: "John Doe",
        required: true,
        width: "half",
      }),
      field("phone", "phone", "Phone Number", "tel", {
        placeholder: "(704) 555-0123",
        required: true,
        width: "half",
      }),
      field("email", "email", "Email Address", "email", {
        placeholder: "john@example.com",
        required: true,
      }),
      field("audience_type", "audienceType", "Property Type", "radio", {
        required: true,
        options: [
          { label: "Residential Home", value: "residential" },
          { label: "Commercial / HOA", value: "commercial" },
        ],
      }),
      field("address", "address", "Street Address", "text", {
        placeholder: "123 Main St",
        width: "half",
      }),
      field("city", "city", "City", "text", {
        placeholder: "Monroe",
        width: "half",
      }),
      field("services", "servicesInterested", "Services Needed", "checkbox", {
        options: [
          {
            label: "Lawn Maintenance (Annual Contract)",
            value: "Lawn Maintenance",
          },
          { label: "Landscaping Design & Installation", value: "Landscaping" },
          { label: "Hardscape (Patios, Walkways, Walls)", value: "Hardscape" },
          { label: "Mulching & Planting", value: "Mulching & Planting" },
          { label: "Drainage Solutions", value: "Drainage Solutions" },
          { label: "Aeration & Overseeding", value: "Aeration & Overseeding" },
          { label: "Sod Installation", value: "Sod Installation" },
          { label: "Other / Not Sure", value: "Other / Not Sure" },
        ],
      }),
      field("message", "message", "Project Details / Message", "textarea", {
        placeholder: "Tell us a bit about your property and what you are looking for.",
      }),
    ],
    settings: settings({
      submitButtonText: "Submit Request",
      successMessage:
        "Thank you! We have received your request and will be in touch shortly to schedule your consultation.",
      notifyAdmins: true,
      storeAsContactMessage: true,
      createCrmLead: true,
    }),
  },
  {
    name: "Commercial Quote Request",
    slug: "commercial-quote",
    description: "Primary Carolina Exterior commercial and HOA quote form used by the public site.",
    kind: "contact",
    isSystem: true,
    isActive: true,
    fields: [
      field("contact_name", "contactName", "Contact Name", "text", {
        placeholder: "John Doe",
        required: true,
        width: "half",
      }),
      field("title", "title", "Title / Role", "text", {
        placeholder: "Property Manager",
        width: "half",
      }),
      field("company_name", "companyName", "Company / HOA Name", "text", {
        placeholder: "Acme Properties",
        required: true,
      }),
      field("email", "email", "Email Address", "email", {
        placeholder: "john@example.com",
        required: true,
        width: "half",
      }),
      field("phone", "phone", "Phone Number", "tel", {
        placeholder: "(704) 555-0123",
        required: true,
        width: "half",
      }),
      field("property_address", "propertyAddress", "Primary Property Address", "text", {
        placeholder: "123 Main St, Monroe NC",
      }),
      field("property_type", "propertyType", "Property Type", "select", {
        required: true,
        width: "half",
        options: [
          { label: "Office", value: "Office" },
          { label: "Retail", value: "Retail" },
          { label: "HOA", value: "HOA" },
          { label: "Industrial", value: "Industrial" },
          { label: "Multi-family", value: "Multi-family" },
          { label: "Other", value: "Other" },
        ],
      }),
      field("number_of_properties", "numberOfProperties", "Number of Properties", "number", {
        placeholder: "1",
        width: "half",
      }),
      field("current_provider", "currentProvider", "Current Landscaping Provider", "text", {
        placeholder: "If any",
        width: "half",
      }),
      field("best_time", "bestTimeToReach", "Best Time to Reach You", "text", {
        placeholder: "Weekday mornings",
        width: "half",
      }),
      field("services_needed", "servicesNeeded", "Services Needed", "checkbox", {
        options: [
          { label: "Grounds Maintenance", value: "Grounds Maintenance" },
          {
            label: "Commercial Landscaping",
            value: "Commercial Landscaping",
          },
          { label: "Commercial Hardscape", value: "Commercial Hardscape" },
          { label: "Drainage & Site Work", value: "Drainage & Site Work" },
          {
            label: "HOA Community Services",
            value: "HOA Community Services",
          },
          {
            label: "Seasonal Color Program",
            value: "Seasonal Color Program",
          },
          { label: "Snow & Ice (Inquire)", value: "Snow & Ice" },
          { label: "Other / Not Sure", value: "Other / Not Sure" },
        ],
      }),
      field("notes", "notes", "Additional Notes", "textarea", {
        placeholder: "Tell us about your property, expectations, timeline, and scope.",
      }),
    ],
    settings: settings({
      submitButtonText: "Request Commercial Proposal",
      successMessage:
        "Thank you! Our commercial team has received your request and will contact you shortly.",
      notifyAdmins: true,
      storeAsContactMessage: true,
      createCrmLead: true,
    }),
  },
  {
    name: "Core Platform Interest Form",
    slug: "corePlatform-interest",
    description:
      "Launch update and early-interest form for people who want to stay informed about Core Platform.",
    kind: "interest",
    isSystem: true,
    isActive: true,
    fields: [
      field("intro", "intro", "Introduction", "html", {
        config: {
          htmlContent:
            "<p><strong>We're so excited for the launch of Core Platform coming late 2026!</strong></p><p>We envision a world where members no longer face misunderstanding or misdiagnosis due to the nuances of a globally-mobile upbringing, but have access to professionals providing platform-approved workflows.</p><p>Our goal is to do this by developing a database of platform-approved providers who receive ongoing training after thorough vetting.</p><p>If you'd like to be updated on the launch, please give us your information below.</p>",
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
      field(
        "demographics",
        "demographics",
        "What demographic do you fit into? Choose all that apply!",
        "checkbox",
        {
          required: true,
          options: [
            { label: "Core Platform", value: "corePlatform" },
            { label: "Provider", value: "provider" },
            { label: "Core Platform Parent", value: "corePlatform-parent" },
            {
              label: "Core Platform Caregiver",
              value: "corePlatform-caregiver",
            },
            { label: "Adult Core Platform", value: "adult-corePlatform" },
            { label: "Other", value: "other" },
          ],
        },
      ),
      field(
        "website",
        "website",
        "If you are a provider and would like to give us your website link please do so below.",
        "website",
        {
          placeholder: "https://yourwebsite.com",
        },
      ),
      field(
        "provider_info",
        "providerInfo",
        "If you're a provider and you're interested in getting vetted in the future, what would you need to know in order to apply?",
        "textarea",
        {
          placeholder: "Share what information would help you evaluate applying in the future.",
        },
      ),
      field(
        "testimonial",
        "testimonial",
        "We're gathering a few short testimonials for our website about why this initiative feels needed. If you're willing, please share 1-2 sentences answering: \"Why are you excited about the Core Platform Initiative?\" Quotes will be shared using first names only.",
        "textarea",
        {
          placeholder: "Share 1-2 sentences if you'd like to contribute a testimonial.",
        },
      ),
    ],
    settings: settings({
      submitButtonText: "Keep Me Informed",
      successMessage:
        "Thanks for your interest. We'll keep you informed about the Core Platform launch.",
      mailchimpEnabled: true,
      mailchimpTag: "Core Platform Interest",
    }),
  },
  {
    name: "Directory Application Start",
    slug: "directory-application-start",
    description:
      "System workflow form used when a registered directory user starts their application.",
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

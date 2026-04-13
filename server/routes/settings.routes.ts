import { Router } from "express";
import { z } from "zod";
import { storage } from "../storage/index";
import { logger } from "../utils/logger";
import { authenticateToken, requireRole } from "../middleware/auth";
import { asyncHandler } from "../middleware/error-handler";
import { paramString } from "../utils/params";
import {
  sendEmail,
  testMailgunConnection,
  baseTemplate,
  renderTemplate,
} from "../services/email.service";
import * as r2Service from "../services/r2.service";
import { seedEmailTemplates } from "../scripts/seed-email-templates";

const router = Router();

router.use(authenticateToken);
router.use(requireRole("admin"));

router.get(
  "/settings",
  asyncHandler(async (_req, res) => {
    const settings = await storage.settings.getAllSettings();
    const grouped: Record<string, Record<string, { value: string; isSecret: boolean }>> = {};

    for (const s of settings) {
      if (!grouped[s.category]) grouped[s.category] = {};
      grouped[s.category][s.key] = {
        value: s.isSecret ? "••••••••" : s.value,
        isSecret: s.isSecret,
      };
    }

    res.json(grouped);
  })
);

const upsertSettingSchema = z.object({
  key: z.string().min(1),
  value: z.string(),
  category: z.string().min(1),
  isSecret: z.boolean().default(false),
});

router.put(
  "/settings",
  asyncHandler(async (req, res) => {
    const data = upsertSettingSchema.parse(req.body);
    const setting = await storage.settings.upsertSetting(
      data.key,
      data.value,
      data.category,
      data.isSecret
    );

    if (data.category === "stripe") {
      const { resetStripeClient } = await import("../config/stripe");
      resetStripeClient();
    }

    if (data.category === "cloudflare_r2") {
      r2Service.resetClient();
    }

    if (data.category === "mailgun") {
      const { resetMailgunConfig } = await import("../services/email.service");
      resetMailgunConfig();
    }

    storage.settings.invalidateCategory(data.category);

    res.json({
      ...setting,
      value: setting.isSecret ? "••••••••" : setting.value,
    });
  })
);

router.delete(
  "/settings/:key",
  asyncHandler(async (req, res) => {
    await storage.settings.deleteSetting(paramString(req.params.key));
    res.json({ message: "Setting deleted" });
  })
);

const VALID_PRESET_IDS = [
  "tck-default", "ocean-blue", "midnight", "minimal-light", "contrast-pro",
  "warm-neutral", "slate-blue", "frost", "charcoal-gold", "clean-clinical",
  "energetic-blue-pop",
] as const;

const setThemeSchema = z.object({
  presetId: z.enum(VALID_PRESET_IDS),
  customOverrides: z.record(z.string()).nullable().optional(),
});

router.put(
  "/theme",
  asyncHandler(async (req, res) => {
    const data = setThemeSchema.parse(req.body);
    await storage.settings.upsertSetting("theme_preset_id", data.presetId, "theme", false);
    if (data.customOverrides) {
      await storage.settings.upsertSetting(
        "theme_custom_overrides",
        JSON.stringify(data.customOverrides),
        "theme",
        false
      );
    } else {
      try {
        await storage.settings.deleteSetting("theme_custom_overrides");
      } catch (err) {
        logger.app.warn("Failed to delete theme custom overrides setting", { error: err instanceof Error ? err.message : String(err) });
      }
    }
    res.json({ presetId: data.presetId, customOverrides: data.customOverrides || null });
  })
);

const testConnectionSchema = z.object({
  integration: z.enum(["stripe", "mailgun", "cloudflare_r2"]),
});

router.post(
  "/settings/test-connection",
  asyncHandler(async (req, res) => {
    const { integration } = testConnectionSchema.parse(req.body);

    if (integration === "stripe") {
      try {
        const { getStripeClient } = await import("../config/stripe");
        const stripe = await getStripeClient();
        await stripe.accounts.retrieve();
        res.json({ success: true, message: "Stripe connection successful" });
      } catch (err: any) {
        res.json({ success: false, message: err.message || "Stripe connection failed" });
      }
      return;
    }

    if (integration === "mailgun") {
      const result = await testMailgunConnection();
      res.json(result);
      return;
    }

    if (integration === "cloudflare_r2") {
      const result = await r2Service.testConnection();
      res.json(result);
      return;
    }

    res.status(400).json({ success: false, message: "Unknown integration" });
  })
);

router.get(
  "/email-templates",
  asyncHandler(async (_req, res) => {
    const templates = await storage.emailTemplates.getAllTemplates();
    res.json(templates);
  })
);

router.post(
  "/email-templates/restore",
  asyncHandler(async (_req, res) => {
    await seedEmailTemplates(true);
    const templates = await storage.emailTemplates.getAllTemplates();
    res.json({
      restored: templates.length,
      templates,
    });
  })
);

const updateTemplateSchema = z.object({
  subject: z.string().optional(),
  htmlBody: z.string().optional(),
  isActive: z.boolean().optional(),
});

router.put(
  "/email-templates/:slug",
  asyncHandler(async (req, res) => {
    const data = updateTemplateSchema.parse(req.body);
    const template = await storage.emailTemplates.updateTemplate(
      paramString(req.params.slug),
      data
    );
    if (!template) {
      res.status(404).json({ message: "Template not found" });
      return;
    }
    res.json(template);
  })
);

const previewTemplateSchema = z.object({
  htmlBody: z.string().optional(),
  subject: z.string().optional(),
});

router.post(
  "/email-templates/:slug/preview",
  asyncHandler(async (req, res) => {
    const { htmlBody: overrideBody, subject: overrideSubject } = previewTemplateSchema.parse(req.body);
    const template = await storage.emailTemplates.getTemplate(paramString(req.params.slug));
    if (!template) {
      res.status(404).json({ message: "Template not found" });
      return;
    }

    const sampleVars: Record<string, string> = {};
    for (const v of template.variables) {
      if (v === "firstName") sampleVars[v] = "Jane";
      else if (v === "loginUrl" || v === "resetUrl" || v === "dashboardUrl")
        sampleVars[v] = "https://tckwellness.com/example-link";
      else if (v === "reason") sampleVars[v] = "Additional credentials required.";
      else if (v === "tempPassword") sampleVars[v] = "Temp1234!";
      else if (v === "therapistName" || v === "clientName" || v === "senderName")
        sampleVars[v] = "Jane Doe";
      else if (v === "therapistEmail" || v === "clientEmail" || v === "senderEmail")
        sampleVars[v] = "jane@example.com";
      else if (v === "messageBody")
        sampleVars[v] = "Hello, I would like to learn more about your services.";
      else sampleVars[v] = `[${v}]`;
    }

    const body = overrideBody || template.htmlBody;
    const subject = overrideSubject || template.subject;
    const renderedBody = renderTemplate(body, sampleVars);
    const renderedSubject = renderTemplate(subject, sampleVars);
    const html = baseTemplate("", renderedBody);

    res.json({ subject: renderedSubject, html });
  })
);

router.post(
  "/email-templates/:slug/test",
  asyncHandler(async (req, res) => {
    const template = await storage.emailTemplates.getTemplate(paramString(req.params.slug));
    if (!template) {
      res.status(404).json({ message: "Template not found" });
      return;
    }

    const adminEmail = req.user!.email;
    const sampleVars: Record<string, string> = {};
    for (const v of template.variables) {
      if (v === "firstName") sampleVars[v] = "Test User";
      else if (v === "loginUrl" || v === "resetUrl" || v === "dashboardUrl")
        sampleVars[v] = `${req.protocol}://${req.get("host")}`;
      else if (v === "reason") sampleVars[v] = "This is a test rejection reason.";
      else if (v === "tempPassword") sampleVars[v] = "TestPass123!";
      else if (v === "therapistName" || v === "clientName" || v === "senderName")
        sampleVars[v] = "Test Person";
      else if (v === "therapistEmail" || v === "clientEmail" || v === "senderEmail")
        sampleVars[v] = "test@example.com";
      else if (v === "messageBody")
        sampleVars[v] = "This is a test message from the email template tester.";
      else sampleVars[v] = `[${v}]`;
    }

    const renderedBody = renderTemplate(template.htmlBody, sampleVars);
    const renderedSubject = renderTemplate(template.subject, sampleVars);
    const html = baseTemplate("", renderedBody);

    const sent = await sendEmail(adminEmail, `[TEST] ${renderedSubject}`, html);
    res.json({
      success: sent,
      message: sent
        ? `Test email sent to ${adminEmail}`
        : "Email not sent — no email provider configured",
    });
  })
);

export default router;

import nodemailer from "nodemailer";
import { logger } from "../utils/logger";

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = parseInt(process.env.SMTP_PORT || "587", 10);
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_FROM = process.env.SMTP_FROM || "TCK Wellness <noreply@tckwellness.com>";

const isSmtpConfigured = !!(SMTP_HOST && SMTP_USER && SMTP_PASS);

let transporter: nodemailer.Transporter | null = null;
if (isSmtpConfigured) {
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
}

async function getMailgunConfig(): Promise<{
  apiKey: string;
  domain: string;
  fromAddress: string;
} | null> {
  try {
    const { storage } = await import("../storage/index");
    const settings = await storage.settings.getDecryptedCategory("mailgun");
    const apiKey = settings["mailgun_api_key"];
    const domain = settings["mailgun_domain"];
    const fromAddress = settings["mailgun_from_address"] || SMTP_FROM;
    if (apiKey && domain) {
      return { apiKey, domain, fromAddress };
    }
  } catch (err) {
    logger.email.warn("Failed to load Mailgun configuration", { error: err instanceof Error ? err.message : String(err) });
  }
  return null;
}

async function sendViaMailgun(
  to: string,
  subject: string,
  html: string
): Promise<boolean> {
  const config = await getMailgunConfig();
  if (!config) return false;

  try {
    const FormData = (await import("form-data")).default;
    const Mailgun = (await import("mailgun.js")).default;
    const mailgun = new Mailgun(FormData);
    const mg = mailgun.client({ username: "api", key: config.apiKey });
    await mg.messages.create(config.domain, {
      from: config.fromAddress,
      to: [to],
      subject,
      html,
    });
    logger.email.info("Sent via Mailgun", { to, subject });
    return true;
  } catch (err) {
    logger.email.error("Mailgun send failed", err, { to, subject });
    return false;
  }
}

async function sendViaSmtp(
  to: string,
  subject: string,
  html: string
): Promise<boolean> {
  if (!transporter) return false;
  try {
    await transporter.sendMail({ from: SMTP_FROM, to, subject, html });
    logger.email.info("Sent via SMTP", { to, subject });
    return true;
  } catch (err) {
    logger.email.error("SMTP send failed", err, { to, subject });
    return false;
  }
}

function baseTemplate(title: string, body: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
        <tr><td style="background:#1e3a5f;padding:24px 32px;">
          <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:600;">TCK Wellness</h1>
        </td></tr>
        <tr><td style="padding:32px;">
          ${title ? `<h2 style="margin:0 0 16px;color:#1e3a5f;font-size:20px;">${title}</h2>` : ""}
          ${body}
        </td></tr>
        <tr><td style="background:#f9fafb;padding:20px 32px;border-top:1px solid #e5e7eb;">
          <p style="margin:0;color:#6b7280;font-size:13px;">This is an automated message from TCK Wellness. Please do not reply directly to this email.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function renderTemplate(template: string, vars: Record<string, string | null>): string {
  let result = template;
  for (const [key, val] of Object.entries(vars)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), val || "");
    if (val) {
      result = result.replace(new RegExp(`\\{\\{#${key}\\}\\}`, "g"), "");
      result = result.replace(new RegExp(`\\{\\{/${key}\\}\\}`, "g"), "");
    } else {
      result = result.replace(
        new RegExp(`\\{\\{#${key}\\}\\}[\\s\\S]*?\\{\\{/${key}\\}\\}`, "g"),
        ""
      );
    }
  }
  return result;
}

async function getTemplateHtml(
  slug: string,
  vars: Record<string, string | null>,
  fallbackTitle: string,
  fallbackBody: string
): Promise<{ subject: string; html: string; isActive: boolean }> {
  try {
    const { storage } = await import("../storage/index");
    const template = await storage.emailTemplates.getTemplate(slug);
    if (template) {
      const renderedBody = renderTemplate(template.htmlBody, vars);
      const renderedSubject = renderTemplate(template.subject, vars);
      return {
        subject: renderedSubject,
        html: baseTemplate("", renderedBody),
        isActive: template.isActive,
      };
    }
  } catch (err) {
    logger.email.warn("Failed to load email template, using fallback", { slug, error: err instanceof Error ? err.message : String(err) });
  }
  return {
    subject: fallbackTitle,
    html: baseTemplate(fallbackTitle, fallbackBody),
    isActive: true,
  };
}

export async function sendEmail(
  to: string,
  subject: string,
  html: string
): Promise<boolean> {
  const mailgunSent = await sendViaMailgun(to, subject, html);
  if (mailgunSent) return true;

  const smtpSent = await sendViaSmtp(to, subject, html);
  if (smtpSent) return true;

  logger.email.warn("No email provider configured", { to, subject });
  return false;
}

export async function sendApprovalEmail(
  email: string,
  firstName: string | null,
  loginUrl: string
): Promise<boolean> {
  const vars = { firstName: firstName || "there", loginUrl };
  const { subject, html, isActive } = await getTemplateHtml(
    "therapist-approval",
    vars,
    "Application Approved",
    `<p>Hi ${vars.firstName}, your application has been approved!</p>`
  );
  if (!isActive) return false;
  return sendEmail(email, subject, html);
}

export async function sendRejectionEmail(
  email: string,
  firstName: string | null,
  reason: string | null
): Promise<boolean> {
  const vars = { firstName: firstName || "there", reason };
  const { subject, html, isActive } = await getTemplateHtml(
    "therapist-rejection",
    vars,
    "Application Update",
    `<p>Hi ${vars.firstName}, your application was not approved at this time.</p>`
  );
  if (!isActive) return false;
  return sendEmail(email, subject, html);
}

export async function sendPasswordResetEmail(
  email: string,
  firstName: string | null,
  resetUrl: string
): Promise<boolean> {
  const vars = { firstName: firstName || "there", resetUrl };
  const { subject, html, isActive } = await getTemplateHtml(
    "password-reset",
    vars,
    "Reset Your Password",
    `<p>Hi ${vars.firstName}, click here to reset your password: ${resetUrl}</p>`
  );
  if (!isActive) return false;
  return sendEmail(email, subject, html);
}

export async function sendWelcomeEmail(
  email: string,
  firstName: string | null,
  loginUrl: string,
  tempPassword: string | null
): Promise<boolean> {
  const vars = { firstName: firstName || "there", loginUrl, tempPassword };
  const { subject, html, isActive } = await getTemplateHtml(
    "welcome-new-user",
    vars,
    "Welcome to TCK Wellness!",
    `<p>Hi ${vars.firstName}, an account has been created for you.</p>`
  );
  if (!isActive) return false;
  return sendEmail(email, subject, html);
}

export async function sendNewTherapistRegistrationEmail(
  adminEmails: string[],
  therapistName: string,
  therapistEmail: string,
  dashboardUrl: string
): Promise<void> {
  const vars = { therapistName, therapistEmail, dashboardUrl };
  const { subject, html, isActive } = await getTemplateHtml(
    "new-therapist-registration",
    vars,
    `New Therapist Registration: ${therapistName}`,
    `<p>A new therapist (${therapistName}, ${therapistEmail}) has registered.</p>`
  );
  if (!isActive) return;
  for (const email of adminEmails) {
    sendEmail(email, subject, html).catch((err) => {
      logger.email.warn("Failed to notify admin of therapist registration", { adminEmail: email, error: err instanceof Error ? err.message : String(err) });
    });
  }
}

export async function sendNewClientRegistrationEmail(
  adminEmails: string[],
  clientName: string,
  clientEmail: string,
  dashboardUrl: string
): Promise<void> {
  const vars = { clientName, clientEmail, dashboardUrl };
  const { subject, html, isActive } = await getTemplateHtml(
    "new-client-registration",
    vars,
    `New Client Registration: ${clientName}`,
    `<p>A new client (${clientName}, ${clientEmail}) has registered.</p>`
  );
  if (!isActive) return;
  for (const email of adminEmails) {
    sendEmail(email, subject, html).catch((err) => {
      logger.email.warn("Failed to notify admin of client registration", { adminEmail: email, error: err instanceof Error ? err.message : String(err) });
    });
  }
}

export async function sendContactFormEmail(
  adminEmails: string[],
  senderName: string,
  senderEmail: string,
  messageBody: string,
  dashboardUrl: string
): Promise<void> {
  const vars = { senderName, senderEmail, messageBody, dashboardUrl };
  const { subject, html, isActive } = await getTemplateHtml(
    "contact-form-submission",
    vars,
    `New Contact Form: ${senderName}`,
    `<p>New message from ${senderName} (${senderEmail}): ${messageBody}</p>`
  );
  if (!isActive) return;
  for (const email of adminEmails) {
    sendEmail(email, subject, html).catch((err) => {
      logger.email.warn("Failed to notify admin of contact form", { adminEmail: email, error: err instanceof Error ? err.message : String(err) });
    });
  }
}

export async function testMailgunConnection(): Promise<{
  success: boolean;
  message: string;
}> {
  const config = await getMailgunConfig();
  if (!config) {
    return { success: false, message: "Mailgun not configured" };
  }
  try {
    const FormData = (await import("form-data")).default;
    const Mailgun = (await import("mailgun.js")).default;
    const mailgun = new Mailgun(FormData);
    const mg = mailgun.client({ username: "api", key: config.apiKey });
    await mg.domains.get(config.domain);
    return { success: true, message: "Mailgun connection successful" };
  } catch (err: any) {
    return { success: false, message: err.message || "Connection failed" };
  }
}

export async function sendNewMessageEmail(
  to: string,
  recipientName: string | null,
  senderName: string,
  loginUrl: string
): Promise<boolean> {
  const firstName = recipientName || "there";
  const html = baseTemplate(
    "New Message in Your Message Center",
    `<p>Hi ${firstName},</p>
    <p>You have received a new message from <strong>${senderName}</strong> in your TCK Wellness Message Center.</p>
    <p>For your privacy, message content is not included in this email notification. Please log in to read the full message.</p>
    <p style="margin:24px 0;">
      <a href="${loginUrl}" style="display:inline-block;background:#1e3a5f;color:#ffffff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;">
        Go to Message Center
      </a>
    </p>
    <p style="color:#6b7280;font-size:13px;">If you did not expect this message, you can safely ignore this email.</p>`
  );
  return sendEmail(to, `New message from ${senderName} — TCK Wellness`, html);
}

export { baseTemplate, renderTemplate };

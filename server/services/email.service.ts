import nodemailer from "nodemailer";

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = parseInt(process.env.SMTP_PORT || "587", 10);
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_FROM = process.env.SMTP_FROM || "TCK Wellness <noreply@tckwellness.com>";

const isConfigured = !!(SMTP_HOST && SMTP_USER && SMTP_PASS);

let transporter: nodemailer.Transporter | null = null;

if (isConfigured) {
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
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
          <h2 style="margin:0 0 16px;color:#1e3a5f;font-size:20px;">${title}</h2>
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

async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  if (!transporter) {
    console.log(`[Email] SMTP not configured. Would send to ${to}: ${subject}`);
    return false;
  }
  try {
    await transporter.sendMail({ from: SMTP_FROM, to, subject, html });
    console.log(`[Email] Sent to ${to}: ${subject}`);
    return true;
  } catch (err) {
    console.error(`[Email] Failed to send to ${to}:`, err);
    return false;
  }
}

export async function sendApprovalEmail(email: string, firstName: string | null, loginUrl: string): Promise<boolean> {
  const name = firstName || "there";
  const subject = "Your TCK Wellness Application Has Been Approved!";
  const html = baseTemplate("Application Approved", `
    <p style="color:#374151;font-size:15px;line-height:1.6;">Hi ${name},</p>
    <p style="color:#374151;font-size:15px;line-height:1.6;">Great news! Your application to join the TCK Wellness therapist directory has been <strong style="color:#059669;">approved</strong>.</p>
    <p style="color:#374151;font-size:15px;line-height:1.6;">You can now log in to complete your profile and set up your subscription to appear in the public directory.</p>
    <table cellpadding="0" cellspacing="0" style="margin:24px 0;">
      <tr><td style="background:#2d8a7e;border-radius:6px;padding:12px 28px;">
        <a href="${loginUrl}" style="color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;">Log In to Your Account</a>
      </td></tr>
    </table>
    <p style="color:#374151;font-size:15px;line-height:1.6;">Once logged in, you can:</p>
    <ul style="color:#374151;font-size:15px;line-height:1.8;padding-left:20px;">
      <li>Complete your professional profile</li>
      <li>Choose a membership plan</li>
      <li>Set up your billing information</li>
    </ul>
    <p style="color:#6b7280;font-size:14px;margin-top:24px;">If you have any questions, please don't hesitate to reach out through our contact page.</p>
  `);
  return sendEmail(email, subject, html);
}

export async function sendRejectionEmail(email: string, firstName: string | null, reason: string | null): Promise<boolean> {
  const name = firstName || "there";
  const subject = "Update on Your TCK Wellness Application";
  const reasonBlock = reason
    ? `<div style="background:#fef2f2;border-left:4px solid #ef4444;padding:12px 16px;margin:16px 0;border-radius:0 4px 4px 0;">
        <p style="margin:0;color:#991b1b;font-size:14px;"><strong>Reason:</strong> ${reason}</p>
      </div>`
    : "";
  const html = baseTemplate("Application Update", `
    <p style="color:#374151;font-size:15px;line-height:1.6;">Hi ${name},</p>
    <p style="color:#374151;font-size:15px;line-height:1.6;">Thank you for your interest in joining the TCK Wellness therapist directory. After reviewing your application, we are unable to approve it at this time.</p>
    ${reasonBlock}
    <p style="color:#374151;font-size:15px;line-height:1.6;">If you believe this was made in error or would like to discuss your application further, please reach out to us through our contact page.</p>
    <p style="color:#6b7280;font-size:14px;margin-top:24px;">We appreciate your interest in TCK Wellness and wish you the best.</p>
  `);
  return sendEmail(email, subject, html);
}

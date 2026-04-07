import { db } from "../db";
import { emailTemplates } from "@shared/schema";

function baseWrap(title: string, body: string): string {
  return `<h2 style="margin:0 0 16px;color:#1e3a5f;font-size:20px;">${title}</h2>
${body}`;
}

const templates = [
  {
    slug: "therapist-approval",
    name: "Therapist Application Approved",
    subject: "Your TCK Wellness Application Has Been Approved!",
    description: "Sent when an admin approves a therapist's application to join the directory.",
    variables: ["firstName", "loginUrl"],
    htmlBody: baseWrap("Application Approved", `
    <p style="color:#374151;font-size:15px;line-height:1.6;">Hi {{firstName}},</p>
    <p style="color:#374151;font-size:15px;line-height:1.6;">Great news! Your application to join the TCK Wellness therapist directory has been <strong style="color:#059669;">approved</strong>.</p>
    <p style="color:#374151;font-size:15px;line-height:1.6;">You can now log in to complete your profile and set up your subscription to appear in the public directory.</p>
    <table cellpadding="0" cellspacing="0" style="margin:24px 0;">
      <tr><td style="background:#2d8a7e;border-radius:6px;padding:12px 28px;">
        <a href="{{loginUrl}}" style="color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;">Log In to Your Account</a>
      </td></tr>
    </table>
    <p style="color:#374151;font-size:15px;line-height:1.6;">Once logged in, you can:</p>
    <ul style="color:#374151;font-size:15px;line-height:1.8;padding-left:20px;">
      <li>Complete your professional profile</li>
      <li>Choose a membership plan</li>
      <li>Set up your billing information</li>
    </ul>
    <p style="color:#6b7280;font-size:14px;margin-top:24px;">If you have any questions, please don't hesitate to reach out through our contact page.</p>`),
  },
  {
    slug: "therapist-rejection",
    name: "Therapist Application Rejected",
    subject: "Update on Your TCK Wellness Application",
    description: "Sent when an admin rejects a therapist's application.",
    variables: ["firstName", "reason"],
    htmlBody: baseWrap("Application Update", `
    <p style="color:#374151;font-size:15px;line-height:1.6;">Hi {{firstName}},</p>
    <p style="color:#374151;font-size:15px;line-height:1.6;">Thank you for your interest in joining the TCK Wellness therapist directory. After reviewing your application, we are unable to approve it at this time.</p>
    {{#reason}}<div style="background:#fef2f2;border-left:4px solid #ef4444;padding:12px 16px;margin:16px 0;border-radius:0 4px 4px 0;">
      <p style="margin:0;color:#991b1b;font-size:14px;"><strong>Reason:</strong> {{reason}}</p>
    </div>{{/reason}}
    <p style="color:#374151;font-size:15px;line-height:1.6;">If you believe this was made in error or would like to discuss your application further, please reach out to us through our contact page.</p>
    <p style="color:#6b7280;font-size:14px;margin-top:24px;">We appreciate your interest in TCK Wellness and wish you the best.</p>`),
  },
  {
    slug: "password-reset",
    name: "Password Reset",
    subject: "Reset Your TCK Wellness Password",
    description: "Sent when a user requests a password reset or an admin sends a reset link.",
    variables: ["firstName", "resetUrl"],
    htmlBody: baseWrap("Password Reset", `
    <p style="color:#374151;font-size:15px;line-height:1.6;">Hi {{firstName}},</p>
    <p style="color:#374151;font-size:15px;line-height:1.6;">We received a request to reset your password. Click the button below to set a new password:</p>
    <table cellpadding="0" cellspacing="0" style="margin:24px 0;">
      <tr><td style="background:#2d8a7e;border-radius:6px;padding:12px 28px;">
        <a href="{{resetUrl}}" style="color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;">Reset Password</a>
      </td></tr>
    </table>
    <p style="color:#374151;font-size:15px;line-height:1.6;">This link will expire in 24 hours. If you didn't request a password reset, you can safely ignore this email.</p>
    <p style="color:#6b7280;font-size:14px;margin-top:24px;">If the button doesn't work, copy and paste this URL into your browser:</p>
    <p style="color:#6b7280;font-size:13px;word-break:break-all;">{{resetUrl}}</p>`),
  },
  {
    slug: "welcome-new-user",
    name: "Welcome New User",
    subject: "Welcome to TCK Wellness!",
    description: "Sent when an admin manually creates a new user account.",
    variables: ["firstName", "loginUrl", "tempPassword"],
    htmlBody: baseWrap("Welcome to TCK Wellness", `
    <p style="color:#374151;font-size:15px;line-height:1.6;">Hi {{firstName}},</p>
    <p style="color:#374151;font-size:15px;line-height:1.6;">An account has been created for you on TCK Wellness.</p>
    {{#tempPassword}}<div style="background:#f0fdf4;border-left:4px solid #22c55e;padding:12px 16px;margin:16px 0;border-radius:0 4px 4px 0;">
      <p style="margin:0;color:#166534;font-size:14px;"><strong>Temporary Password:</strong> {{tempPassword}}</p>
      <p style="margin:4px 0 0;color:#166534;font-size:13px;">Please change this after logging in.</p>
    </div>{{/tempPassword}}
    <table cellpadding="0" cellspacing="0" style="margin:24px 0;">
      <tr><td style="background:#2d8a7e;border-radius:6px;padding:12px 28px;">
        <a href="{{loginUrl}}" style="color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;">Log In to Your Account</a>
      </td></tr>
    </table>
    <p style="color:#6b7280;font-size:14px;margin-top:24px;">If you have any questions, please reach out through our contact page.</p>`),
  },
  {
    slug: "new-therapist-registration",
    name: "New Therapist Registration (Admin)",
    subject: "New Therapist Registration: {{therapistName}}",
    description: "Sent to admin(s) when a therapist self-registers on the platform.",
    variables: ["therapistName", "therapistEmail", "dashboardUrl"],
    htmlBody: baseWrap("New Therapist Registration", `
    <p style="color:#374151;font-size:15px;line-height:1.6;">A new therapist has registered on TCK Wellness and is awaiting review.</p>
    <div style="background:#f3f4f6;border-radius:6px;padding:16px;margin:16px 0;">
      <p style="margin:0 0 8px;color:#374151;font-size:14px;"><strong>Name:</strong> {{therapistName}}</p>
      <p style="margin:0;color:#374151;font-size:14px;"><strong>Email:</strong> {{therapistEmail}}</p>
    </div>
    <table cellpadding="0" cellspacing="0" style="margin:24px 0;">
      <tr><td style="background:#2d8a7e;border-radius:6px;padding:12px 28px;">
        <a href="{{dashboardUrl}}" style="color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;">Review in Admin Dashboard</a>
      </td></tr>
    </table>`),
  },
  {
    slug: "new-client-registration",
    name: "New Client Registration (Admin)",
    subject: "New Client Registration: {{clientName}}",
    description: "Sent to admin(s) when a client self-registers on the platform.",
    variables: ["clientName", "clientEmail", "dashboardUrl"],
    htmlBody: baseWrap("New Client Registration", `
    <p style="color:#374151;font-size:15px;line-height:1.6;">A new client has registered on TCK Wellness.</p>
    <div style="background:#f3f4f6;border-radius:6px;padding:16px;margin:16px 0;">
      <p style="margin:0 0 8px;color:#374151;font-size:14px;"><strong>Name:</strong> {{clientName}}</p>
      <p style="margin:0;color:#374151;font-size:14px;"><strong>Email:</strong> {{clientEmail}}</p>
    </div>
    <table cellpadding="0" cellspacing="0" style="margin:24px 0;">
      <tr><td style="background:#2d8a7e;border-radius:6px;padding:12px 28px;">
        <a href="{{dashboardUrl}}" style="color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;">View in Admin Dashboard</a>
      </td></tr>
    </table>`),
  },
  {
    slug: "contact-form-submission",
    name: "Contact Form Submission (Admin)",
    subject: "New Contact Form: {{senderName}}",
    description: "Sent to admin(s) when someone submits the contact form.",
    variables: ["senderName", "senderEmail", "messageBody", "dashboardUrl"],
    htmlBody: baseWrap("New Contact Form Submission", `
    <p style="color:#374151;font-size:15px;line-height:1.6;">A new message has been submitted through the contact form.</p>
    <div style="background:#f3f4f6;border-radius:6px;padding:16px;margin:16px 0;">
      <p style="margin:0 0 8px;color:#374151;font-size:14px;"><strong>From:</strong> {{senderName}} ({{senderEmail}})</p>
      <p style="margin:8px 0 0;color:#374151;font-size:14px;"><strong>Message:</strong></p>
      <p style="margin:4px 0 0;color:#374151;font-size:14px;">{{messageBody}}</p>
    </div>
    <table cellpadding="0" cellspacing="0" style="margin:24px 0;">
      <tr><td style="background:#2d8a7e;border-radius:6px;padding:12px 28px;">
        <a href="{{dashboardUrl}}" style="color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;">View in Admin Dashboard</a>
      </td></tr>
    </table>`),
  },
  {
    slug: "event-registration-confirmation",
    name: "Event Registration Confirmation",
    subject: "Registration Confirmed: {{eventTitle}}",
    description: "Sent when a user successfully registers for an event.",
    variables: ["firstName", "eventTitle", "eventDate", "eventLocation", "googleCalendarUrl", "outlookCalendarUrl", "icsCalendarUrl"],
    htmlBody: baseWrap("Registration Confirmed", `
    <p style="color:#374151;font-size:15px;line-height:1.6;">Hi {{firstName}},</p>
    <p style="color:#374151;font-size:15px;line-height:1.6;">You're registered for <strong>{{eventTitle}}</strong>!</p>
    <div style="background:#f3f4f6;border-radius:6px;padding:16px;margin:16px 0;">
      <p style="margin:0 0 8px;color:#374151;font-size:14px;"><strong>Date:</strong> {{eventDate}}</p>
      <p style="margin:0;color:#374151;font-size:14px;"><strong>Location:</strong> {{eventLocation}}</p>
    </div>
    <p style="color:#374151;font-size:15px;line-height:1.6;">You'll receive a reminder email the day before the event with all the details you need.</p>
    <p style="color:#374151;font-size:15px;line-height:1.6;"><strong>Add to your calendar:</strong></p>
    <table cellpadding="0" cellspacing="0" style="margin:8px 0 16px;">
      <tr>
        <td style="padding-right:8px;"><a href="{{googleCalendarUrl}}" style="display:inline-block;background:#4285f4;color:#ffffff;padding:8px 16px;border-radius:4px;text-decoration:none;font-size:13px;font-weight:600;" target="_blank">Google Calendar</a></td>
        <td style="padding-right:8px;"><a href="{{icsCalendarUrl}}" style="display:inline-block;background:#333333;color:#ffffff;padding:8px 16px;border-radius:4px;text-decoration:none;font-size:13px;font-weight:600;" download="event.ics">Apple / iCloud</a></td>
        <td><a href="{{outlookCalendarUrl}}" style="display:inline-block;background:#0078d4;color:#ffffff;padding:8px 16px;border-radius:4px;text-decoration:none;font-size:13px;font-weight:600;" target="_blank">Office 365</a></td>
      </tr>
    </table>
    <p style="color:#374151;font-size:15px;line-height:1.6;">We look forward to seeing you there. If you need to cancel your registration, you can do so from the event page.</p>`),
  },
  {
    slug: "event-registration-waitlisted",
    name: "Event Registration Waitlisted",
    subject: "Waitlisted: {{eventTitle}}",
    description: "Sent when a user is added to the waitlist for a full event.",
    variables: ["firstName", "eventTitle", "eventDate", "googleCalendarUrl", "outlookCalendarUrl", "icsCalendarUrl"],
    htmlBody: baseWrap("You're on the Waitlist", `
    <p style="color:#374151;font-size:15px;line-height:1.6;">Hi {{firstName}},</p>
    <p style="color:#374151;font-size:15px;line-height:1.6;">The event <strong>{{eventTitle}}</strong> on {{eventDate}} is currently at capacity. You've been added to the waitlist.</p>
    <p style="color:#374151;font-size:15px;line-height:1.6;">If a spot becomes available, you'll be automatically moved to confirmed status and we'll let you know. Once confirmed, you'll receive a reminder email the day before the event.</p>
    <p style="color:#374151;font-size:15px;line-height:1.6;"><strong>Add to your calendar (just in case!):</strong></p>
    <table cellpadding="0" cellspacing="0" style="margin:8px 0 16px;">
      <tr>
        <td style="padding-right:8px;"><a href="{{googleCalendarUrl}}" style="display:inline-block;background:#4285f4;color:#ffffff;padding:8px 16px;border-radius:4px;text-decoration:none;font-size:13px;font-weight:600;" target="_blank">Google Calendar</a></td>
        <td style="padding-right:8px;"><a href="{{icsCalendarUrl}}" style="display:inline-block;background:#333333;color:#ffffff;padding:8px 16px;border-radius:4px;text-decoration:none;font-size:13px;font-weight:600;" download="event.ics">Apple / iCloud</a></td>
        <td><a href="{{outlookCalendarUrl}}" style="display:inline-block;background:#0078d4;color:#ffffff;padding:8px 16px;border-radius:4px;text-decoration:none;font-size:13px;font-weight:600;" target="_blank">Office 365</a></td>
      </tr>
    </table>`),
  },
  {
    slug: "event-registration-canceled",
    name: "Event Registration Canceled",
    subject: "Registration Canceled: {{eventTitle}}",
    description: "Sent when a user's event registration is canceled.",
    variables: ["firstName", "eventTitle"],
    htmlBody: baseWrap("Registration Canceled", `
    <p style="color:#374151;font-size:15px;line-height:1.6;">Hi {{firstName}},</p>
    <p style="color:#374151;font-size:15px;line-height:1.6;">Your registration for <strong>{{eventTitle}}</strong> has been canceled.</p>
    <p style="color:#374151;font-size:15px;line-height:1.6;">If this was a mistake, you can re-register from the event page if spots are still available.</p>`),
  },
  {
    slug: "event-payment-confirmation",
    name: "Event Payment Confirmation",
    subject: "Payment Confirmed: {{eventTitle}}",
    description: "Sent when a user successfully pays for an event.",
    variables: ["firstName", "eventTitle", "eventDate", "eventLocation", "amountPaid"],
    htmlBody: baseWrap("Payment Confirmed", `
    <p style="color:#374151;font-size:15px;line-height:1.6;">Hi {{firstName}},</p>
    <p style="color:#374151;font-size:15px;line-height:1.6;">Your payment for <strong>{{eventTitle}}</strong> has been confirmed.</p>
    <div style="background:#f3f4f6;border-radius:6px;padding:16px;margin:16px 0;">
      <p style="margin:0 0 8px;color:#374151;font-size:14px;"><strong>Amount Paid:</strong> {{amountPaid}}</p>
      <p style="margin:0 0 8px;color:#374151;font-size:14px;"><strong>Date:</strong> {{eventDate}}</p>
      <p style="margin:0;color:#374151;font-size:14px;"><strong>Location:</strong> {{eventLocation}}</p>
    </div>
    <p style="color:#374151;font-size:15px;line-height:1.6;">We look forward to seeing you there!</p>`),
  },
  {
    slug: "event-reminder",
    name: "Event Reminder",
    subject: "Reminder: {{eventTitle}} is coming up",
    description: "Sent as a reminder before an event starts.",
    variables: ["firstName", "eventTitle", "eventDate", "eventLocation", "eventDescription", "virtualJoinUrl", "locationAddress", "googleCalendarUrl", "outlookCalendarUrl", "icsCalendarUrl"],
    htmlBody: baseWrap("Event Reminder", `
    <p style="color:#374151;font-size:15px;line-height:1.6;">Hi {{firstName}},</p>
    <p style="color:#374151;font-size:15px;line-height:1.6;">This is a reminder that <strong>{{eventTitle}}</strong> is coming up tomorrow!</p>
    <div style="background:#f3f4f6;border-radius:6px;padding:16px;margin:16px 0;">
      <p style="margin:0 0 8px;color:#374151;font-size:14px;"><strong>Date:</strong> {{eventDate}}</p>
      <p style="margin:0 0 8px;color:#374151;font-size:14px;"><strong>Location:</strong> {{eventLocation}}</p>
      {{#locationAddress}}<p style="margin:0 0 8px;color:#374151;font-size:14px;"><strong>Address:</strong> {{locationAddress}}</p>{{/locationAddress}}
      {{#virtualJoinUrl}}<p style="margin:0 0 8px;color:#374151;font-size:14px;"><strong>Join Online:</strong> <a href="{{virtualJoinUrl}}" style="color:#2d8a7e;">{{virtualJoinUrl}}</a></p>{{/virtualJoinUrl}}
      {{#eventDescription}}<p style="margin:8px 0 0;color:#6b7280;font-size:13px;">{{eventDescription}}</p>{{/eventDescription}}
    </div>
    <p style="color:#374151;font-size:15px;line-height:1.6;"><strong>Add to your calendar:</strong></p>
    <table cellpadding="0" cellspacing="0" style="margin:8px 0 16px;">
      <tr>
        <td style="padding-right:8px;"><a href="{{googleCalendarUrl}}" style="display:inline-block;background:#4285f4;color:#ffffff;padding:8px 16px;border-radius:4px;text-decoration:none;font-size:13px;font-weight:600;" target="_blank">Google Calendar</a></td>
        <td style="padding-right:8px;"><a href="{{icsCalendarUrl}}" style="display:inline-block;background:#333333;color:#ffffff;padding:8px 16px;border-radius:4px;text-decoration:none;font-size:13px;font-weight:600;" download="event.ics">Apple / iCloud</a></td>
        <td><a href="{{outlookCalendarUrl}}" style="display:inline-block;background:#0078d4;color:#ffffff;padding:8px 16px;border-radius:4px;text-decoration:none;font-size:13px;font-weight:600;" target="_blank">Office 365</a></td>
      </tr>
    </table>
    <p style="color:#374151;font-size:15px;line-height:1.6;">We look forward to seeing you there!</p>`),
  },
  {
    slug: "event-recording-available",
    name: "Event Recording Available",
    subject: "Recording Available: {{eventTitle}}",
    description: "Sent when an event recording is available for viewing.",
    variables: ["firstName", "eventTitle", "recordingUrl"],
    htmlBody: baseWrap("Recording Now Available", `
    <p style="color:#374151;font-size:15px;line-height:1.6;">Hi {{firstName}},</p>
    <p style="color:#374151;font-size:15px;line-height:1.6;">The recording for <strong>{{eventTitle}}</strong> is now available for you to view.</p>
    <table cellpadding="0" cellspacing="0" style="margin:24px 0;">
      <tr><td style="background:#2d8a7e;border-radius:6px;padding:12px 28px;">
        <a href="{{recordingUrl}}" style="color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;">View Recording</a>
      </td></tr>
    </table>
    <p style="color:#374151;font-size:15px;line-height:1.6;">You can also find this recording in your dashboard under the Recording Archives section.</p>`),
  },
  {
    slug: "event-canceled",
    name: "Event Canceled",
    subject: "Event Canceled: {{eventTitle}}",
    description: "Sent when an event is canceled by the administrator.",
    variables: ["firstName", "eventTitle"],
    htmlBody: baseWrap("Event Cancellation Notice", `
    <p style="color:#374151;font-size:15px;line-height:1.6;">Hi {{firstName}},</p>
    <p style="color:#374151;font-size:15px;line-height:1.6;">We are writing to inform you that the event <strong>{{eventTitle}}</strong> has been canceled.</p>
    <p style="color:#374151;font-size:15px;line-height:1.6;">We apologize for any inconvenience this may cause. If you paid for this event, a refund will be processed automatically.</p>`),
  },
];

export async function seedEmailTemplates() {
  console.log("Seeding email templates...");
  for (const t of templates) {
    await db
      .insert(emailTemplates)
      .values(t)
      .onConflictDoUpdate({
        target: emailTemplates.slug,
        set: {
          name: t.name,
          subject: t.subject,
          htmlBody: t.htmlBody,
          description: t.description,
          variables: t.variables,
          updatedAt: new Date(),
        },
      });
  }
  console.log(`Seeded ${templates.length} email templates.`);
}

seedEmailTemplates()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });

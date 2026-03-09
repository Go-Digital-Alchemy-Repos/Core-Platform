import { UserStorage } from "./user.storage";
import { TherapistStorage } from "./therapist.storage";
import { TierStorage } from "./tier.storage";
import { SubscriptionStorage } from "./subscription.storage";
import { EventStorage } from "./event.storage";
import { ContactStorage } from "./contact.storage";
import { DocsStorage } from "./docs.storage";
import { PasswordResetStorage } from "./password-reset.storage";
import { SettingsStorage } from "./settings.storage";
import { EmailTemplateStorage } from "./email-template.storage";
import { MessageStorage } from "./message.storage";
import { ActivityStorage } from "./activity.storage";

export const storage = {
  users: new UserStorage(),
  therapists: new TherapistStorage(),
  tiers: new TierStorage(),
  subscriptions: new SubscriptionStorage(),
  events: new EventStorage(),
  contacts: new ContactStorage(),
  docs: new DocsStorage(),
  passwordResets: new PasswordResetStorage(),
  settings: new SettingsStorage(),
  emailTemplates: new EmailTemplateStorage(),
  messages: new MessageStorage(),
  activity: new ActivityStorage(),
};

export type { TherapistSearchParams, TherapistWithUser } from "./therapist.storage";

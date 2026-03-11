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
import { NotificationStorage } from "./notification.storage";
import { SpecializationStorage } from "./specialization.storage";
import { ProfileViewStorage } from "./profile-view.storage";
import { SavedCounselorStorage } from "./saved-counselor.storage";
import { BlogStorage } from "./blog.storage";
import { EventRegistrationStorage } from "./event-registration.storage";
import { CmsPagesStorage } from "./cms-pages.storage";
import { CmsPageRevisionsStorage } from "./cms-page-revisions.storage";
import { CmsMediaStorage } from "./cms-media.storage";

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
  notifications: new NotificationStorage(),
  specializations: new SpecializationStorage(),
  profileViews: new ProfileViewStorage(),
  savedCounselors: new SavedCounselorStorage(),
  blog: new BlogStorage(),
  eventRegistrations: new EventRegistrationStorage(),
  cmsPages: new CmsPagesStorage(),
  cmsPageRevisions: new CmsPageRevisionsStorage(),
  cmsMedia: new CmsMediaStorage(),
};

export type { TherapistSearchParams, TherapistWithUser } from "./therapist.storage";

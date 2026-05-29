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
import { ActivityStorage } from "./activity.storage";
import { NotificationStorage } from "./notification.storage";
import { SpecializationStorage } from "./specialization.storage";
import { ProfileViewStorage } from "./profile-view.storage";
import { SavedProfessionalStorage } from "./saved-professional.storage";
import { BlogStorage } from "./blog.storage";
import { BlogCommentsStorage } from "./blog-comments.storage";
import { BlogTaxonomyStorage } from "./blog-taxonomy.storage";
import { EventRegistrationStorage } from "./event-registration.storage";
import { CmsPagesStorage } from "./cms-pages.storage";
import { CmsPageRevisionsStorage } from "./cms-page-revisions.storage";
import { CmsMediaStorage } from "./cms-media.storage";
import { CmsSectionsStorage } from "./cms-sections.storage";
import { SeoSettingsStorage } from "./seo-settings.storage";
import { RedirectsStorage } from "./redirects.storage";
import { RecordingPurchaseStorage } from "./recording-purchase.storage";
import { ApplicationStorage } from "./application.storage";
import { CmsMenusStorage } from "./cms-menus.storage";
import { CmsSidebarsStorage } from "./cms-sidebars.storage";
import { FormsStorage } from "./forms.storage";
import { EditorLocksStorage } from "./editor-locks.storage";
import { CrmStorage } from "./crm.storage";
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
  activity: new ActivityStorage(),
  notifications: new NotificationStorage(),
  specializations: new SpecializationStorage(),
  profileViews: new ProfileViewStorage(),
  savedProfessionals: new SavedProfessionalStorage(),
  blog: new BlogStorage(),
  blogComments: new BlogCommentsStorage(),
  blogTaxonomies: new BlogTaxonomyStorage(),
  eventRegistrations: new EventRegistrationStorage(),
  cmsPages: new CmsPagesStorage(),
  cmsPageRevisions: new CmsPageRevisionsStorage(),
  cmsMedia: new CmsMediaStorage(),
  cmsSections: new CmsSectionsStorage(),
  seoSettings: new SeoSettingsStorage(),
  redirects: new RedirectsStorage(),
  recordingPurchases: new RecordingPurchaseStorage(),
  applications: new ApplicationStorage(),
  cmsMenus: new CmsMenusStorage(),
  cmsSidebars: new CmsSidebarsStorage(),
  forms: new FormsStorage(),
  editorLocks: new EditorLocksStorage(),
  crm: new CrmStorage(),
};

export type { TherapistWithUser, PaginatedTherapists, DirectoryFilterOptions, TherapistSearchParams } from "@shared/types/directory";

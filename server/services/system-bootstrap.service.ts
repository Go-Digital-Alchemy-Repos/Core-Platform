import { logger } from "../utils/logger";
import { ensureSystemCmsPages } from "./system-cms-pages.service";
import { ensureSystemCmsMenus } from "./system-cms-menus.service";
import { ensureSystemCmsSections } from "./system-cms-sections.service";
import { ensureSystemDocs } from "./system-docs.service";
import { ensureSystemEmailTemplates } from "./system-email-templates.service";
import { ensureSystemForms } from "./system-forms.service";

export async function runSystemBootstrap() {
  logger.app.info("Running system bootstrap");

  await ensureSystemCmsPages();
  await ensureSystemCmsMenus();
  await ensureSystemCmsSections();
  await ensureSystemForms();
  await ensureSystemDocs({ refreshExisting: false });
  await ensureSystemEmailTemplates(false);

  logger.app.info("System bootstrap complete");
}

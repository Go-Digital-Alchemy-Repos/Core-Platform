import { eq } from "drizzle-orm";
import { db } from "../db";
import { cmsForms, type CmsForm } from "@shared/schema";
import { crmFormMappingSaveSchema, crmFormMappingSchema } from "@shared/crm-form-mapping";
import { resolveCrmFormMapping } from "@shared/crm-form-mapping-resolver";
import {
  CrmCustomFieldsStorage,
  lockCrmCustomFieldDefinitions,
  type CrmCustomFieldsTransaction,
} from "./crm-custom-fields.storage";
export function assertCrmMappingCompatible(
  form: CmsForm,
  definitions: unknown,
  previous?: CmsForm,
) {
  if (form.crmMapping === null) return;
  if (previous?.crmMapping)
    for (const binding of previous.crmMapping.bindings) {
      const old = previous.fields.find((field) => field.id === binding.sourceFieldId),
        next = form.fields.find((field) => field.id === binding.sourceFieldId);
      if (!old || !next || old.key !== next.key || old.type !== next.type)
        throw Object.assign(
          new Error("Repair or remove the CRM mapping before changing mapped fields"),
          { statusCode: 409 },
        );
    }
  const result = resolveCrmFormMapping({
    mapping: form.crmMapping,
    mappingRevision: form.crmMappingRevision,
    createCrmLead: form.settings.createCrmLead === true,
    fields: form.fields,
    definitions,
    validatedData: {},
  });
  if (!result.ok && result.kind === "configuration_unavailable")
    throw Object.assign(new Error("CRM mapping configuration is unavailable"), { statusCode: 409 });
}
export class CrmFormMappingStorage {
  async withForm<T>(
    id: string,
    write: boolean,
    work: (form: CmsForm, tx: CrmCustomFieldsTransaction) => Promise<T>,
  ) {
    return db.transaction(async (tx) => {
      await lockCrmCustomFieldDefinitions(tx);
      const [form] = await tx
        .select()
        .from(cmsForms)
        .where(eq(cmsForms.id, id))
        .for(write ? "update" : "share");
      if (!form) throw Object.assign(new Error("Form not found"), { statusCode: 404 });
      return work(form, tx);
    });
  }
  async get(id: string) {
    return this.withForm(id, false, async (form) => ({
      mapping: form.crmMapping === null ? null : crmFormMappingSchema.parse(form.crmMapping),
      revision: form.crmMappingRevision,
    }));
  }
  async save(id: string, input: unknown) {
    const save = crmFormMappingSaveSchema.parse(input);
    return this.withForm(id, true, async (form, tx) => {
      if (form.crmMappingRevision !== save.expectedRevision)
        throw Object.assign(new Error("CRM mapping changed. Reload and try again."), {
          statusCode: 409,
        });
      const next = {
        ...form,
        crmMapping: save.mapping,
        crmMappingRevision: form.crmMappingRevision + 1,
      };
      assertCrmMappingCompatible(next, await new CrmCustomFieldsStorage().listDefinitions(tx));
      await tx
        .update(cmsForms)
        .set({
          crmMapping: next.crmMapping,
          crmMappingRevision: next.crmMappingRevision,
          updatedAt: new Date(),
        })
        .where(eq(cmsForms.id, id));
      return { mapping: next.crmMapping, revision: next.crmMappingRevision };
    });
  }
}

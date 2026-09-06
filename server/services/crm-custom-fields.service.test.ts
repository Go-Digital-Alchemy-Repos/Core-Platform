import { beforeEach, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ tx: { fixture: "transaction" }, events: [] as string[] }));
vi.mock("../db", () => ({
  db: {
    transaction: async (work: (tx: unknown) => Promise<unknown>) => {
      state.events.push("begin");
      try {
        const result = await work(state.tx);
        state.events.push("commit");
        return result;
      } catch (error) {
        state.events.push("rollback");
        throw error;
      }
    },
  },
}));
vi.mock("../utils/logger", () => ({
  logger: { app: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } },
}));
import { CrmCustomFieldsStorage } from "../storage/crm-custom-fields.storage";
import {
  createCrmCustomFieldDefinition,
  patchCrmCustomFieldValues,
  getCrmCustomFieldDefinitions,
  reviseCrmCustomFieldDefinition,
} from "./crm-custom-fields.service";
import { logger } from "../utils/logger";
const id = "00000000-0000-4000-8000-000000000001";
const values = {
  expectedRevision: 0,
  values: [{ definitionId: id, definitionRevision: 1, value: "private-value" }],
};
beforeEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
  state.events = [];
});
it("returns the complete readback in the same transaction and logs only after commit", async () => {
  const write = vi
    .spyOn(CrmCustomFieldsStorage.prototype, "writeValues")
    .mockImplementation(async () => {
      state.events.push("write");
      return { revision: 1, values: [] };
    });
  const response = { revision: 1, values: [] };
  const read = vi
    .spyOn(CrmCustomFieldsStorage.prototype, "readValues")
    .mockImplementation(async () => {
      state.events.push("read");
      return response;
    });
  expect(await patchCrmCustomFieldValues("lead", "lead", values, "actor")).toBe(response);
  expect(write).toHaveBeenCalledWith("lead", "lead", values, "patch", state.tx);
  expect(read).toHaveBeenCalledWith("lead", "lead", state.tx);
  expect(state.events).toEqual(["begin", "write", "read", "commit"]);
  expect(JSON.stringify(vi.mocked(logger.app.info).mock.calls)).not.toContain("private-value");
});
it("rolls back and sanitizes an unsuccessful readback", async () => {
  vi.spyOn(CrmCustomFieldsStorage.prototype, "writeValues").mockResolvedValue({
    revision: 1,
    values: [],
  });
  vi.spyOn(CrmCustomFieldsStorage.prototype, "readValues").mockRejectedValue(
    new Error("SQL password=secret submitted=private-value"),
  );
  await expect(
    patchCrmCustomFieldValues("client", "client", values, "actor"),
  ).rejects.toMatchObject({
    statusCode: 500,
    message: "CRM custom fields are temporarily unavailable",
  });
  expect(state.events).toEqual(["begin", "rollback"]);
  expect(logger.app.info).not.toHaveBeenCalled();
});
it("definition writes reread full inventory using the same transaction", async () => {
  const create = vi
    .spyOn(CrmCustomFieldsStorage.prototype, "createDefinition")
    .mockResolvedValue({} as never);
  const revise = vi
    .spyOn(CrmCustomFieldsStorage.prototype, "reviseDefinition")
    .mockResolvedValue({} as never);
  const list = vi.spyOn(CrmCustomFieldsStorage.prototype, "listDefinitions").mockResolvedValue([]);
  const config = { version: 1, label: "Field" };
  expect(
    await createCrmCustomFieldDefinition(
      { key: "field_key", entityScope: "both", type: "text", config },
      "actor",
    ),
  ).toEqual({ definitions: [] });
  expect(create.mock.calls[0][2]).toBe(state.tx);
  expect(list).toHaveBeenLastCalledWith(state.tx);
  await reviseCrmCustomFieldDefinition(
    id,
    { expectedRevision: 1, archived: false, config },
    "actor",
  );
  expect(revise.mock.calls[0][3]).toBe(state.tx);
  expect(list).toHaveBeenLastCalledWith(state.tx);
});
it.each([
  "field_archived",
  "invalid_text",
  "invalid_field_value",
  "immutable_field_identity",
  "invalid_revision_transition",
  "choice_keys_must_be_retained",
  "duplicate_field_identity",
  "active_field_limit",
  "unknown_or_wrong_scope_field",
  "required_custom_field",
])("maps known validation code %s to 400", async (code) => {
  vi.spyOn(CrmCustomFieldsStorage.prototype, "writeValues").mockRejectedValue(new Error(code));
  await expect(patchCrmCustomFieldValues("lead", "lead", values, "actor")).rejects.toMatchObject({
    statusCode: 400,
  });
});
it.each([
  ["stale_definition_revision", 409],
  ["stale_custom_values_revision", 409],
  ["crm_custom_field_not_found", 404],
  ["raw_db_failure", 500],
])("maps %s safely", async (code, statusCode) => {
  vi.spyOn(CrmCustomFieldsStorage.prototype, "writeValues").mockRejectedValue(
    new Error(String(code)),
  );
  await expect(patchCrmCustomFieldValues("lead", "lead", values, "actor")).rejects.toMatchObject({
    statusCode,
  });
});
it("does not reinterpret stored corruption as visitor validation", async () => {
  vi.spyOn(CrmCustomFieldsStorage.prototype, "listDefinitions").mockRejectedValue(
    new Error("invalid_field_value"),
  );
  await expect(getCrmCustomFieldDefinitions()).rejects.toMatchObject({ statusCode: 500 });
});

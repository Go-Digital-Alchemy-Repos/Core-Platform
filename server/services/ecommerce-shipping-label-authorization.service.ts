import { eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import type { db } from "../db";
import { activityLogs, systemSettings, users } from "@shared/schema";
import {
  lockEasyPostCredentialAuthorization,
  EASYPOST_CREDENTIAL_KEYS,
  readEasyPostCredentialState,
  ShippingCredentialAuthorizationError,
  type ShippingCredentialTx,
} from "./ecommerce-shipping-credential-authorization.service";

const category = "ecommerce_shipping_provider_easypost";
export const EASYPOST_LABEL_AUTHORIZATION_KEYS = {
  enabled: `${category}__labelPurchaseEnabled`,
  approval: `${category}__approvedLabelTestGenerationId`,
  revision: `${category}__labelAuthorizationRevision`,
} as const;
const MAX_REVISION = 2147483647;
const noControls = (value: string) =>
  [...value].every(
    (char) => char.charCodeAt(0) >= 32 && !(char.charCodeAt(0) >= 127 && char.charCodeAt(0) <= 159),
  );
export const configureEasyPostLabelAuthorizationSchema = z
  .object({
    version: z.literal(1),
    expectedGenerationId: z.string().uuid(),
    expectedRevision: z
      .number()
      .int()
      .min(0)
      .max(MAX_REVISION - 1),
    purchaseEnabled: z.boolean(),
    labelApproval: z.enum(["grant", "revoke", "unchanged"]),
    evidenceReference: z
      .string()
      .min(1)
      .max(256)
      .refine(noControls)
      .refine((value) => value.trim().length > 0),
  })
  .strict();
export class ShippingLabelAuthorizationError extends Error {
  constructor(
    public readonly code:
      | "invalid_request"
      | "invalid_actor"
      | "authorization_unavailable"
      | "authorization_revision_changed"
      | "credential_generation_changed"
      | "provider_not_test"
      | "not_implemented",
  ) {
    super("Shipping label authorization unavailable");
    this.name = "ShippingLabelAuthorizationError";
  }
}
type LabelState = { initialized: boolean; enabled: boolean; approval: string; revision: number };
async function state(tx: ShippingCredentialTx): Promise<LabelState> {
  const rows = await tx
    .select()
    .from(systemSettings)
    .where(inArray(systemSettings.key, Object.values(EASYPOST_LABEL_AUTHORIZATION_KEYS)));
  const fields = Object.values(EASYPOST_LABEL_AUTHORIZATION_KEYS).map((key) =>
    rows.find((row) => row.key === key),
  );
  if (fields.every((field) => !field))
    return { initialized: false, enabled: false, approval: "", revision: 0 };
  const [enabled, approval, revision] = fields;
  if (
    !enabled ||
    !approval ||
    !revision ||
    fields.some((field) => field!.isSecret || field!.category !== category) ||
    !["true", "false"].includes(enabled.value) ||
    (approval.value !== "" && !z.string().uuid().safeParse(approval.value).success) ||
    !/^(0|[1-9][0-9]*)$/.test(revision.value) ||
    !Number.isSafeInteger(Number(revision.value)) ||
    Number(revision.value) > MAX_REVISION
  )
    throw new ShippingLabelAuthorizationError("authorization_unavailable");
  return {
    initialized: true,
    enabled: enabled.value === "true",
    approval: approval.value,
    revision: Number(revision.value),
  };
}
async function actor(tx: ShippingCredentialTx, actorId?: string) {
  if (!actorId) throw new ShippingLabelAuthorizationError("invalid_actor");
  const [user] = await tx
    .select({ id: users.id, role: users.role, suspended: users.isSuspended })
    .from(users)
    .where(eq(users.id, actorId));
  if (!user || user.role !== "admin" || user.suspended)
    throw new ShippingLabelAuthorizationError("invalid_actor");
  return user.id;
}
async function persist(tx: ShippingCredentialTx, value: LabelState) {
  const entries = [
    { key: EASYPOST_LABEL_AUTHORIZATION_KEYS.enabled, value: String(value.enabled) },
    { key: EASYPOST_LABEL_AUTHORIZATION_KEYS.approval, value: value.approval },
    { key: EASYPOST_LABEL_AUTHORIZATION_KEYS.revision, value: String(value.revision) },
  ];
  await tx
    .insert(systemSettings)
    .values(
      entries.map((entry) => ({ ...entry, category, isSecret: false, updatedAt: new Date() })),
    )
    .onConflictDoUpdate({
      target: systemSettings.key,
      set: {
        value: sql`excluded.value`,
        category: sql`excluded.category`,
        isSecret: false,
        updatedAt: sql`excluded.updated_at`,
      },
    });
}
async function audit(
  tx: ShippingCredentialTx,
  actorId: string,
  action: "shipping_label_authorization_configured" | "shipping_label_approval_invalidated",
  before: LabelState,
  after: LabelState,
  generation: string,
  evidenceReference: string | null,
  previousGeneration: string | null = null,
) {
  // Only this explicit, bounded projection enters durable global audit history.
  const details = JSON.stringify({
    version: 1,
    provider: "easypost",
    mode: "test",
    previousRevision: before.revision,
    revision: after.revision,
    previousPurchaseEnabled: before.enabled,
    purchaseEnabled: after.enabled,
    previousApprovedGenerationId: before.approval || null,
    approvedGenerationId: after.approval || null,
    credentialGenerationId: generation,
    previousCredentialGenerationId: previousGeneration,
    evidenceReference,
  });
  await tx.insert(activityLogs).values({ userId: actorId, action, details });
}
function safe(error: unknown): never {
  if (error instanceof ShippingLabelAuthorizationError) throw error;
  if (
    error instanceof ShippingCredentialAuthorizationError &&
    error.code === "credential_generation_changed"
  )
    throw new ShippingLabelAuthorizationError("credential_generation_changed");
  throw new ShippingLabelAuthorizationError("authorization_unavailable");
}
/** Internal trusted-operator API. Evidence authorization is supplied by the operator workflow, not inferred from admin role. */
export async function configureEasyPostLabelAuthorization(
  database: typeof db,
  input: unknown,
  actorId: string,
) {
  const parsed = configureEasyPostLabelAuthorizationSchema.safeParse(input);
  if (!parsed.success) throw new ShippingLabelAuthorizationError("invalid_request");
  try {
    return await database.transaction(async (tx) => {
      await lockEasyPostCredentialAuthorization(tx);
      const current = await readEasyPostCredentialState(tx),
        before = await state(tx);
      const userId = await actor(tx, actorId);
      if (current.generation !== parsed.data.expectedGenerationId)
        throw new ShippingLabelAuthorizationError("credential_generation_changed");
      if (before.revision !== parsed.data.expectedRevision)
        throw new ShippingLabelAuthorizationError("authorization_revision_changed");
      if (parsed.data.labelApproval === "grant" && !current.provider?.testMode)
        throw new ShippingLabelAuthorizationError("provider_not_test");
      const approval =
        parsed.data.labelApproval === "grant"
          ? current.generation
          : parsed.data.labelApproval === "revoke"
            ? ""
            : before.approval;
      if (
        before.initialized &&
        before.enabled === parsed.data.purchaseEnabled &&
        before.approval === approval
      )
        return readiness(tx);
      const after = {
        initialized: true,
        enabled: parsed.data.purchaseEnabled,
        approval,
        revision: before.revision + 1,
      };
      await persist(tx, after);
      await audit(
        tx,
        userId,
        "shipping_label_authorization_configured",
        before,
        after,
        current.generation,
        parsed.data.evidenceReference,
      );
      return readiness(tx);
    });
  } catch (error) {
    return safe(error);
  }
}
/** Caller holds credential lock; participates in the SAME credential replacement transaction. */
export async function invalidateEasyPostLabelAuthorizationForRotation(
  tx: ShippingCredentialTx,
  generation: string,
  actorId?: string,
) {
  const before = await state(tx);
  if (!before.initialized) return;
  const userId = await actor(tx, actorId);
  if (before.revision >= MAX_REVISION)
    throw new ShippingLabelAuthorizationError("authorization_unavailable");
  // Replacement must remain possible when the previous ciphertext is unreadable.
  // Audit needs its generation metadata, never the old secret.
  const [previous] = await tx
    .select()
    .from(systemSettings)
    .where(eq(systemSettings.key, EASYPOST_CREDENTIAL_KEYS.generation));
  if (
    !previous ||
    previous.category !== category ||
    previous.isSecret ||
    !z.string().uuid().safeParse(previous.value).success
  )
    throw new ShippingLabelAuthorizationError("authorization_unavailable");
  const after = { ...before, approval: "", revision: before.revision + 1 };
  await persist(tx, after);
  await audit(
    tx,
    userId,
    "shipping_label_approval_invalidated",
    before,
    after,
    generation,
    null,
    previous.value,
  );
}
async function readiness(tx: ShippingCredentialTx) {
  const label = await state(tx);
  let configured = true,
    approved = false;
  try {
    const current = await readEasyPostCredentialState(tx);
    approved = label.approval !== "" && label.approval === current.generation;
  } catch (error) {
    if (
      error instanceof ShippingCredentialAuthorizationError &&
      error.code === "credential_configuration_invalid"
    )
      configured = false;
    else throw error;
  }
  // Source-owned gate: never configurable. Runtime/route integration is not yet implemented.
  return {
    version: 1 as const,
    mode: "test" as const,
    implemented: false as const,
    purchaseActivated: label.enabled,
    configured,
    approvedLabelTestCredentials: approved,
    enabled: false as const,
    authorizationRevision: label.revision,
    reasonCode: "not_implemented" as const,
  };
}
export async function readEasyPostLabelReadiness(tx: ShippingCredentialTx) {
  try {
    await lockEasyPostCredentialAuthorization(tx);
    return await readiness(tx);
  } catch (error) {
    return safe(error);
  }
}
export async function readAuthorizedEasyPostLabelPurchaseCredentials(
  _tx: ShippingCredentialTx,
): Promise<never> {
  throw new ShippingLabelAuthorizationError("not_implemented");
}

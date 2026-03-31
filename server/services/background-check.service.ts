import { storage } from "../storage/index";
import { logger } from "../utils/logger";
import type { ProviderBackgroundCheck } from "@shared/schema";

export const BACKGROUND_CHECK_STATUSES = [
  "not_sent",
  "pending",
  "invited",
  "in_progress",
  "clear",
  "consider",
  "issue",
  "expired",
  "completed",
] as const;

export type BackgroundCheckStatus = (typeof BACKGROUND_CHECK_STATUSES)[number];

const PROVIDER_FACING_LABELS: Record<BackgroundCheckStatus, string> = {
  not_sent: "Not Started",
  pending: "Pending",
  invited: "Action Required",
  in_progress: "In Progress",
  clear: "Completed",
  consider: "Under Review",
  issue: "Action Needed",
  expired: "Expired",
  completed: "Completed",
};

export function getProviderFacingLabel(status: BackgroundCheckStatus): string {
  return PROVIDER_FACING_LABELS[status] || "Unknown";
}

export function isTerminalStatus(status: BackgroundCheckStatus): boolean {
  return ["clear", "completed"].includes(status);
}

export function isActionRequiredStatus(status: BackgroundCheckStatus): boolean {
  return ["invited", "issue", "expired"].includes(status);
}

export interface BackgroundCheckVendor {
  createOrder(applicationId: string, applicantData: Record<string, unknown>): Promise<{ externalId: string; status: BackgroundCheckStatus }>;
  syncStatus(externalId: string): Promise<{ status: BackgroundCheckStatus; result?: string; reportUrl?: string; details?: string }>;
  resendInvite(externalId: string): Promise<boolean>;
}

const vendorRegistry: Record<string, BackgroundCheckVendor> = {};

export function registerVendor(name: string, vendor: BackgroundCheckVendor): void {
  vendorRegistry[name] = vendor;
}

function getVendor(name: string): BackgroundCheckVendor | undefined {
  return vendorRegistry[name];
}

export async function createBackgroundCheckRecord(
  applicationId: string,
  vendorName?: string,
): Promise<ProviderBackgroundCheck> {
  const status: BackgroundCheckStatus = "not_sent";
  const check = await storage.applications.addBackgroundCheck({
    applicationId,
    vendorName: vendorName || null,
    status,
    providerFacingLabel: getProviderFacingLabel(status),
  });

  logger.app.info("Background check record created", { applicationId, checkId: check.id });
  return check;
}

export async function initiateBackgroundCheck(
  applicationId: string,
  applicantData: Record<string, unknown>,
  vendorName?: string,
): Promise<ProviderBackgroundCheck | undefined> {
  const resolvedVendor = vendorName || process.env.BACKGROUND_CHECK_VENDOR || "manual";
  let existingCheck = await storage.applications.getBackgroundCheck(applicationId);

  if (!existingCheck) {
    logger.app.info("No background check record found, creating one", { applicationId });
    existingCheck = await createBackgroundCheckRecord(applicationId, resolvedVendor);
  }

  const vendor = getVendor(resolvedVendor);
  if (!vendor) {
    logger.app.info("No vendor integration registered, marking as pending for manual processing", {
      applicationId,
      vendorName: resolvedVendor,
    });

    const updated = await storage.applications.updateBackgroundCheck(existingCheck.id, {
      status: "pending",
      providerFacingLabel: getProviderFacingLabel("pending"),
      vendorName: resolvedVendor,
      requestedAt: new Date(),
      adminStatusDetails: `Awaiting manual initiation — no vendor integration for "${resolvedVendor}"`,
    });

    await storage.applications.update(applicationId, {
      backgroundCheckStatus: "in_progress",
    });

    return updated;
  }

  try {
    const result = await vendor.createOrder(applicationId, applicantData);
    const newStatus = result.status || "pending";

    const updated = await storage.applications.updateBackgroundCheck(existingCheck.id, {
      status: newStatus,
      providerFacingLabel: getProviderFacingLabel(newStatus),
      vendorName: resolvedVendor,
      vendorExternalId: result.externalId,
      requestedAt: new Date(),
      lastStatusSyncAt: new Date(),
      adminStatusDetails: `Order created with ${resolvedVendor}`,
    });

    await storage.applications.update(applicationId, {
      backgroundCheckStatus: "in_progress",
    });

    logger.app.info("Background check initiated with vendor", {
      applicationId,
      vendorName: resolvedVendor,
      externalId: result.externalId,
    });

    return updated;
  } catch (err) {
    logger.app.error("Failed to initiate background check with vendor", err, {
      applicationId,
      vendorName: resolvedVendor,
    });
    return undefined;
  }
}

export async function syncBackgroundCheckStatus(
  applicationId: string,
): Promise<ProviderBackgroundCheck | undefined> {
  const check = await storage.applications.getBackgroundCheck(applicationId);
  if (!check || !check.vendorName || !check.vendorExternalId) {
    return check;
  }

  const vendor = getVendor(check.vendorName);
  if (!vendor) {
    return check;
  }

  try {
    const result = await vendor.syncStatus(check.vendorExternalId);
    const newStatus = result.status as BackgroundCheckStatus;
    const updateData: Record<string, unknown> = {
      status: newStatus,
      providerFacingLabel: getProviderFacingLabel(newStatus),
      lastStatusSyncAt: new Date(),
    };

    if (result.result) updateData.result = result.result;
    if (result.reportUrl) updateData.reportUrl = result.reportUrl;
    if (result.details) updateData.adminStatusDetails = result.details;
    if (isTerminalStatus(newStatus)) updateData.completedAt = new Date();

    const updated = await storage.applications.updateBackgroundCheck(check.id, updateData as any);

    if (isTerminalStatus(newStatus)) {
      await storage.applications.update(applicationId, {
        backgroundCheckStatus: "completed",
      });
    }

    logger.app.info("Background check status synced", {
      applicationId,
      newStatus,
      externalId: check.vendorExternalId,
    });

    return updated;
  } catch (err) {
    logger.app.error("Failed to sync background check status", err, { applicationId });
    return check;
  }
}

export async function resendBackgroundCheckInvite(
  applicationId: string,
): Promise<boolean> {
  const check = await storage.applications.getBackgroundCheck(applicationId);
  if (!check || !check.vendorName || !check.vendorExternalId) {
    return false;
  }

  const vendor = getVendor(check.vendorName);
  if (!vendor) {
    return false;
  }

  try {
    const success = await vendor.resendInvite(check.vendorExternalId);
    if (success) {
      await storage.applications.updateBackgroundCheck(check.id, {
        status: "invited",
        providerFacingLabel: getProviderFacingLabel("invited"),
        adminStatusDetails: "Invite resent",
        lastStatusSyncAt: new Date(),
      } as any);
    }
    return success;
  } catch (err) {
    logger.app.error("Failed to resend background check invite", err, { applicationId });
    return false;
  }
}

export async function adminUpdateBackgroundCheck(
  applicationId: string,
  data: {
    status?: BackgroundCheckStatus;
    notes?: string;
    result?: string;
    adminStatusDetails?: string;
    vendorExternalId?: string;
    reportUrl?: string;
  },
): Promise<ProviderBackgroundCheck | undefined> {
  const check = await storage.applications.getBackgroundCheck(applicationId);
  if (!check) return undefined;

  const updateData: Record<string, unknown> = { updatedAt: new Date() };

  if (data.status) {
    updateData.status = data.status;
    updateData.providerFacingLabel = getProviderFacingLabel(data.status);
    if (isTerminalStatus(data.status)) {
      updateData.completedAt = new Date();
    }
  }

  if (data.notes !== undefined) updateData.notes = data.notes;
  if (data.result !== undefined) updateData.result = data.result;
  if (data.adminStatusDetails !== undefined) updateData.adminStatusDetails = data.adminStatusDetails;
  if (data.vendorExternalId !== undefined) updateData.vendorExternalId = data.vendorExternalId;
  if (data.reportUrl !== undefined) updateData.reportUrl = data.reportUrl;

  const updated = await storage.applications.updateBackgroundCheck(check.id, updateData as any);

  if (data.status && isTerminalStatus(data.status)) {
    await storage.applications.update(applicationId, {
      backgroundCheckStatus: "completed",
    });
  } else if (data.status && ["pending", "invited", "in_progress"].includes(data.status)) {
    await storage.applications.update(applicationId, {
      backgroundCheckStatus: "in_progress",
    });
  } else if (data.status === "issue" || data.status === "consider" || data.status === "expired") {
    await storage.applications.update(applicationId, {
      backgroundCheckStatus: "in_progress",
    });
  }

  logger.app.info("Background check manually updated by admin", {
    applicationId,
    status: data.status,
  });

  return updated;
}

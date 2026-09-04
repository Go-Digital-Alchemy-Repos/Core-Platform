import { timingSafeEqual } from "node:crypto";

export interface ClientFormProxyAuthorizationInput {
  requestedStackId: string;
  presentedToken: string | undefined;
  targetStackId?: string | undefined;
  expectedToken?: string | undefined;
}

export type ClientFormProxyAuthorization =
  | { allowed: true }
  | { allowed: false; configured: false }
  | { allowed: false; configured: true };

function equalTokens(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

export function authorizeClientFormProxy(
  input: ClientFormProxyAuthorizationInput,
): ClientFormProxyAuthorization {
  const targetStackId = input.targetStackId?.trim();
  const expectedToken = input.expectedToken?.trim();
  if (!targetStackId || !expectedToken) {
    return { allowed: false, configured: false };
  }

  if (input.requestedStackId !== targetStackId || !input.presentedToken) {
    return { allowed: false, configured: true };
  }

  return equalTokens(input.presentedToken, expectedToken)
    ? { allowed: true }
    : { allowed: false, configured: true };
}

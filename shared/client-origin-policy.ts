function hostname(origin: string): string | null {
  try {
    return new URL(origin).hostname.toLowerCase();
  } catch {
    return null;
  }
}

export function getExpectedDashboardHostname(publicSiteOrigin: string): string | null {
  const publicHostname = hostname(publicSiteOrigin);
  if (!publicHostname || publicHostname.startsWith("dashboard.")) return null;
  return `dashboard.${publicHostname.replace(/^www\./, "")}`;
}

export function getDashboardOriginPolicyError(
  publicSiteOrigin: string,
  dashboardOrigin: string,
): string | null {
  const expectedDashboardHostname = getExpectedDashboardHostname(publicSiteOrigin);
  if (!expectedDashboardHostname) {
    return "public site origin must not use the dashboard subdomain";
  }
  if (hostname(dashboardOrigin) !== expectedDashboardHostname) {
    return `must use the dashboard hostname ${expectedDashboardHostname}`;
  }
  return null;
}

import { Suspense, lazy, useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { Switch, Route, useLocation, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrandingProvider } from "@/components/shared/branding-provider";
import { CookieConsentBanner } from "@/components/shared/cookie-consent-banner";
import { ProtectedRoute } from "@/components/shared/protected-route";
import { useAuth } from "@/hooks/use-auth";
import { useDirectorySettings } from "@/hooks/use-directory-settings";
import { loadGa4IfConsented, loadMarketingPixelsIfConsented } from "@/lib/analytics-runtime";
import { subscribeToCookieConsent } from "@/lib/cookie-consent";
import NotFound from "@/pages/not-found";
import { Loader2 } from "lucide-react";
import { DEFAULT_SITE_FEATURES, type SiteFeatures } from "@shared/site-features";

const HomePage = lazy(() => import("@/features/public/home-page"));
const AboutPage = lazy(() => import("@/features/public/about-page"));
const ContactPage = lazy(() => import("@/features/public/contact-page"));
const EventsPage = lazy(() => import("@/features/public/events-page"));
const EventDetailPage = lazy(() => import("@/features/public/event-detail-page"));
const JoinNetworkPage = lazy(() => import("@/features/public/join-network-page"));
const CmsHybridPage = lazy(() =>
  import("@/features/public/cms-hybrid-page").then((module) => ({
    default: module.CmsHybridPage,
  }))
);
const CmsPreviewPage = lazy(() => import("@/features/public/cms-preview-page"));

const LoginPage = lazy(() => import("@/features/auth/login-page"));
const ForgotPasswordPage = lazy(() => import("@/features/auth/forgot-password-page"));
const ResetPasswordPage = lazy(() => import("@/features/auth/reset-password-page"));
const AdminSetupPage = lazy(() => import("@/features/auth/admin-setup-page"));

const DirectoryPage = lazy(() => import("@/features/directory/directory-page"));
const TherapistProfilePage = lazy(() => import("@/features/directory/therapist-profile-page"));

const TherapistDashboardPage = lazy(() => import("@/features/therapist/dashboard-page"));
const ProfileEditPage = lazy(() => import("@/features/therapist/profile-edit-page"));
const SubscriptionPage = lazy(() => import("@/features/therapist/subscription-page"));
const ApplicationPage = lazy(() => import("@/features/therapist/application-page"));
const ApplicationStatusPage = lazy(() => import("@/features/therapist/application-status-page"));
const ReferenceFormPage = lazy(() => import("@/features/public/reference-form-page"));
const StandaloneFormPage = lazy(() => import("@/features/public/standalone-form-page"));
const AdminDashboardPage = lazy(() => import("@/features/admin/dashboard-page"));
const AdminTherapistsPage = lazy(() => import("@/features/admin/therapists-page"));
const AdminUsersPage = lazy(() => import("@/features/admin/users-page"));
const AdminDirectorySettingsPage = lazy(() => import("@/features/admin/directory-settings-page"));
const AdminFormsPage = lazy(() => import("@/features/admin/forms-page"));
const AdminCrmPage = lazy(() => import("@/features/admin/crm-page"));
const AdminCrmClientsPage = lazy(() => import("@/features/admin/crm-clients-page"));
const AdminEventsPage = lazy(() => import("@/features/admin/events-page"));
const DocsPage = lazy(() => import("@/features/admin/docs-page"));
const AdminSettingsPage = lazy(() => import("@/features/admin/settings-page"));
const AdminDesignPage = lazy(() => import("@/features/admin/design-page"));
const AdminSpecializationsPage = lazy(() => import("@/features/admin/specializations-page"));
const CmsBlogPage = lazy(() => import("@/features/admin/cms/cms-blog-page"));
const CmsBlogEditorPage = lazy(() => import("@/features/admin/cms/cms-blog-editor-page"));

const AdminApplicationsPage = lazy(() => import("@/features/admin/applications-page"));
const AdminApplicationDetailPage = lazy(() => import("@/features/admin/application-detail-page"));
const CmsOverviewPage = lazy(() => import("@/features/admin/cms/cms-overview-page"));
const CmsPagesPage = lazy(() => import("@/features/admin/cms/cms-pages-page"));
const CmsPageEditorPage = lazy(() => import("@/features/admin/cms/cms-page-editor-page"));
const CmsMediaPage = lazy(() => import("@/features/admin/cms/cms-media-page"));
const CmsSeoPage = lazy(() => import("@/features/admin/cms/cms-seo-page"));
const CmsSectionsPage = lazy(() => import("@/features/admin/cms/cms-sections-page"));
const CmsSectionEditorPage = lazy(() => import("@/features/admin/cms/cms-section-editor-page"));
const CmsMenusPage = lazy(() => import("@/features/admin/cms/cms-menus-page"));
const CmsSidebarsPage = lazy(() => import("@/features/admin/cms/cms-sidebars-page"));
const SystemBackupsPage = lazy(() => import("@/features/admin/system-backups-page"));

const InsightsPage = lazy(() => import("@/features/public/insights-page"));
const InsightsPostPage = lazy(() => import("@/features/public/insights-post-page"));
const RecordingArchivesPage = lazy(() => import("@/features/public/recording-archives-page"));
const SearchResultsPage = lazy(() => import("@/features/public/search-results-page"));
const LegalFallbackPage = lazy(() => import("@/features/public/legal-fallback-page"));
const ShopPage = lazy(() => import("@/features/ecommerce/shop-page"));
const ProductDetailPage = lazy(() => import("@/features/ecommerce/product-detail-page"));
const CartPage = lazy(() => import("@/features/ecommerce/cart-page"));
const CheckoutPage = lazy(() => import("@/features/ecommerce/checkout-page"));
const OrderSuccessPage = lazy(() => import("@/features/ecommerce/order-success-page"));
const OrderStatusPage = lazy(() => import("@/features/ecommerce/order-status-page"));
const CustomerAccountPage = lazy(() => import("@/features/ecommerce/customer-account-page"));
const AdminEcommercePage = lazy(() => import("@/features/admin/ecommerce/ecommerce-page"));

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[50vh]" data-testid="page-loader">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
}

function AdminIndexRoute() {
  const { user, hasAdminPermission } = useAuth();
  const { data: siteFeaturesData } = useQuery<SiteFeatures>({
    queryKey: ["/api/site-config"],
    staleTime: 60_000,
  });
  const siteFeatures = siteFeaturesData ?? DEFAULT_SITE_FEATURES;

  if (!user) {
    return <Redirect to="/auth/login" replace />;
  }

  if (user.role === "admin") {
    return <AdminDashboardPage />;
  }

  if (user.role === "editor") {
    if (hasAdminPermission("directory")) {
      return <Redirect to="/admin/therapists" replace />;
    }
    if (hasAdminPermission("content") && siteFeatures.cmsEnabled) {
      return <Redirect to="/admin/cms" replace />;
    }
    if (hasAdminPermission("content") && siteFeatures.eventsEnabled) {
      return <Redirect to="/admin/events" replace />;
    }
    if (hasAdminPermission("content") && siteFeatures.blogEnabled) {
      return <Redirect to="/admin/cms/blog" replace />;
    }
    if (hasAdminPermission("content")) {
      return <Redirect to="/admin/forms" replace />;
    }
    if (hasAdminPermission("crm")) {
      return <Redirect to="/admin/crm" replace />;
    }
    if (hasAdminPermission("design")) {
      return <Redirect to="/admin/design/branding" replace />;
    }
  }

  return <NotFound />;
}

function DirectoryApplicationRoute({ children }: { children: ReactNode }) {
  const { settings, isLoading } = useDirectorySettings();

  if (isLoading) {
    return <PageLoader />;
  }

  if (!settings.directoryRequiresApplicationProcess) {
    return <Redirect to="/therapist/profile?application=disabled" replace />;
  }

  return <>{children}</>;
}

function Router() {
  const { data: siteFeaturesData } = useQuery<SiteFeatures>({
    queryKey: ["/api/site-config"],
    staleTime: 60_000,
  });
  const siteFeatures = siteFeaturesData ?? DEFAULT_SITE_FEATURES;

  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        <Route path="/" component={() => <CmsHybridPage slug="home" fallback={<HomePage />} enabled={siteFeatures.cmsEnabled} />} />
        <Route path="/about" component={() => <CmsHybridPage slug="about" fallback={<AboutPage />} enabled={siteFeatures.cmsEnabled} />} />
        <Route path="/contact" component={() => <CmsHybridPage slug="contact" fallback={<ContactPage />} enabled={siteFeatures.cmsEnabled} />} />
        <Route path="/preview/cms/:id" component={() => siteFeatures.cmsEnabled ? <CmsPreviewPage /> : <NotFound />} />
        <Route path="/join" component={() => <CmsHybridPage slug="join" fallback={<JoinNetworkPage />} enabled={siteFeatures.cmsEnabled} />} />
        <Route path="/events" component={() => siteFeatures.eventsEnabled ? <CmsHybridPage slug="events" fallback={<EventsPage />} enabled={siteFeatures.cmsEnabled} /> : <NotFound />} />
        <Route path="/events/:id" component={() => siteFeatures.eventsEnabled ? <EventDetailPage /> : <NotFound />} />
        <Route path="/recordings" component={() => <CmsHybridPage slug="recordings" fallback={<RecordingArchivesPage />} enabled={siteFeatures.cmsEnabled} />} />
        <Route path="/search" component={SearchResultsPage} />
        <Route path="/shop" component={() => siteFeatures.ecommerceEnabled ? <ShopPage /> : <NotFound />} />
        <Route path="/products/:slug" component={() => siteFeatures.ecommerceEnabled ? <ProductDetailPage /> : <NotFound />} />
        <Route path="/cart" component={() => siteFeatures.ecommerceEnabled ? <CartPage /> : <NotFound />} />
        <Route path="/checkout" component={() => siteFeatures.ecommerceEnabled ? <CheckoutPage /> : <NotFound />} />
        <Route path="/order-success" component={() => siteFeatures.ecommerceEnabled ? <OrderSuccessPage /> : <NotFound />} />
        <Route path="/orders/status" component={() => siteFeatures.ecommerceEnabled ? <OrderStatusPage /> : <NotFound />} />
        <Route path="/account">
          {siteFeatures.ecommerceEnabled ? (
            <ProtectedRoute roles={["client"]}>
              <CustomerAccountPage view="dashboard" />
            </ProtectedRoute>
          ) : <NotFound />}
        </Route>
        <Route path="/account/orders">
          {siteFeatures.ecommerceEnabled ? (
            <ProtectedRoute roles={["client"]}>
              <CustomerAccountPage view="orders" />
            </ProtectedRoute>
          ) : <NotFound />}
        </Route>
        <Route path="/account/orders/:id">
          {siteFeatures.ecommerceEnabled ? (
            <ProtectedRoute roles={["client"]}>
              <CustomerAccountPage view="order" />
            </ProtectedRoute>
          ) : <NotFound />}
        </Route>
        <Route path="/account/profile">
          {siteFeatures.ecommerceEnabled ? (
            <ProtectedRoute roles={["client"]}>
              <CustomerAccountPage view="profile" />
            </ProtectedRoute>
          ) : <NotFound />}
        </Route>
        <Route path="/account/addresses">
          {siteFeatures.ecommerceEnabled ? (
            <ProtectedRoute roles={["client"]}>
              <CustomerAccountPage view="addresses" />
            </ProtectedRoute>
          ) : <NotFound />}
        </Route>
        <Route path="/account/security">
          {siteFeatures.ecommerceEnabled ? (
            <ProtectedRoute roles={["client"]}>
              <CustomerAccountPage view="security" />
            </ProtectedRoute>
          ) : <NotFound />}
        </Route>
        <Route path="/account/preferences">
          {siteFeatures.ecommerceEnabled ? (
            <ProtectedRoute roles={["client"]}>
              <CustomerAccountPage view="preferences" />
            </ProtectedRoute>
          ) : <NotFound />}
        </Route>
        <Route path="/insights" component={() => siteFeatures.blogEnabled ? <CmsHybridPage slug="insights" fallback={<InsightsPage />} enabled={siteFeatures.cmsEnabled} /> : <NotFound />} />
        <Route path="/insights/:slug" component={() => siteFeatures.blogEnabled ? <InsightsPostPage /> : <NotFound />} />
        <Route path="/directory" component={() => siteFeatures.directoryEnabled ? <CmsHybridPage slug="directory" fallback={<DirectoryPage />} enabled={siteFeatures.cmsEnabled} /> : <NotFound />} />
        <Route path="/privacy-policy" component={() => <CmsHybridPage slug="privacy-policy" fallback={<LegalFallbackPage title="Privacy Policy" subtitle="Review how Core Platform collects, uses, stores, and protects information across the website and related services." />} enabled={siteFeatures.cmsEnabled} />} />
        <Route path="/terms-of-service" component={() => <CmsHybridPage slug="terms-of-service" fallback={<LegalFallbackPage title="Terms of Service" subtitle="Review the terms governing use of the Core Platform website, directory, events, and related services." />} enabled={siteFeatures.cmsEnabled} />} />
        <Route path="/disclaimer" component={() => <CmsHybridPage slug="disclaimer" fallback={<LegalFallbackPage title="Disclaimer" subtitle="Review emergency guidance, directory vetting limitations, and important information about using the Core Platform directory and related services." />} enabled={siteFeatures.cmsEnabled} />} />
        <Route path="/directory/:id" component={() => siteFeatures.directoryEnabled ? <TherapistProfilePage /> : <NotFound />} />
        <Route path="/reference/:token" component={ReferenceFormPage} />
        <Route path="/forms/:slug" component={StandaloneFormPage} />
        <Route path="/auth/login" component={LoginPage} />
        <Route path="/auth/register"><Redirect to="/join" replace /></Route>
        <Route path="/auth/forgot-password" component={ForgotPasswordPage} />
        <Route path="/auth/reset-password" component={ResetPasswordPage} />
        <Route path="/setup" component={AdminSetupPage} />

        <Route path="/therapist">
          <ProtectedRoute roles={["therapist"]}>
            <TherapistDashboardPage />
          </ProtectedRoute>
        </Route>
        <Route path="/therapist/profile">
          <ProtectedRoute roles={["therapist"]}>
            <ProfileEditPage />
          </ProtectedRoute>
        </Route>
        <Route path="/therapist/subscription">
          <ProtectedRoute roles={["therapist"]}>
            {siteFeatures.directoryEnabled ? <SubscriptionPage /> : <NotFound />}
          </ProtectedRoute>
        </Route>
        <Route path="/therapist/apply">
          <ProtectedRoute roles={["therapist"]}>
            {siteFeatures.directoryEnabled ? (
              <DirectoryApplicationRoute>
                <ApplicationPage />
              </DirectoryApplicationRoute>
            ) : <NotFound />}
          </ProtectedRoute>
        </Route>
        <Route path="/therapist/application/status">
          <ProtectedRoute roles={["therapist"]}>
            {siteFeatures.directoryEnabled ? (
              <DirectoryApplicationRoute>
                <ApplicationStatusPage />
              </DirectoryApplicationRoute>
            ) : <NotFound />}
          </ProtectedRoute>
        </Route>

        <Route path="/admin">
          <ProtectedRoute roles={["admin", "editor"]}>
            <AdminIndexRoute />
          </ProtectedRoute>
        </Route>
        <Route path="/admin/therapists">
          <ProtectedRoute roles={["admin", "editor"]} adminPermissions={["directory"]}>
            {siteFeatures.directoryEnabled ? <AdminTherapistsPage /> : <NotFound />}
          </ProtectedRoute>
        </Route>
        <Route path="/admin/directory/settings">
          <ProtectedRoute roles={["admin", "editor"]} adminPermissions={["directory"]}>
            {siteFeatures.directoryEnabled ? <AdminDirectorySettingsPage /> : <NotFound />}
          </ProtectedRoute>
        </Route>
        <Route path="/admin/users">
          <ProtectedRoute roles={["admin"]}>
            <AdminUsersPage />
          </ProtectedRoute>
        </Route>
        <Route path="/admin/membership-tiers">
          <Redirect to="/admin/directory/settings" />
        </Route>
        <Route path="/admin/events/new">
          <ProtectedRoute roles={["admin", "editor"]} adminPermissions={["content"]}>
            {siteFeatures.eventsEnabled ? <AdminEventsPage initialCreate /> : <NotFound />}
          </ProtectedRoute>
        </Route>
        <Route path="/admin/events">
          <ProtectedRoute roles={["admin", "editor"]} adminPermissions={["content"]}>
            {siteFeatures.eventsEnabled ? <AdminEventsPage /> : <NotFound />}
          </ProtectedRoute>
        </Route>
        <Route path="/admin/forms">
          <ProtectedRoute roles={["admin", "editor"]} adminPermissions={["content"]}>
            <AdminFormsPage />
          </ProtectedRoute>
        </Route>
        <Route path="/admin/crm/clients">
          <ProtectedRoute roles={["admin", "editor"]} adminPermissions={["crm"]}>
            {siteFeatures.crmEnabled ? <AdminCrmClientsPage /> : <NotFound />}
          </ProtectedRoute>
        </Route>
        <Route path="/admin/crm">
          <ProtectedRoute roles={["admin", "editor"]} adminPermissions={["crm"]}>
            {siteFeatures.crmEnabled ? <AdminCrmPage /> : <NotFound />}
          </ProtectedRoute>
        </Route>
        <Route path="/admin/ecommerce/:view">
          <ProtectedRoute roles={["admin"]}>
            {siteFeatures.ecommerceEnabled ? <AdminEcommercePage /> : <NotFound />}
          </ProtectedRoute>
        </Route>
        <Route path="/admin/ecommerce">
          <ProtectedRoute roles={["admin"]}>
            {siteFeatures.ecommerceEnabled ? <AdminEcommercePage /> : <NotFound />}
          </ProtectedRoute>
        </Route>
        <Route path="/admin/blog">
          <Redirect to="/admin/cms/blog" />
        </Route>
        <Route path="/admin/docs">
          <ProtectedRoute roles={["admin"]}>
            <DocsPage />
          </ProtectedRoute>
        </Route>
        <Route path="/admin/settings/:tab">
          <ProtectedRoute roles={["admin"]}>
            <AdminSettingsPage />
          </ProtectedRoute>
        </Route>
        <Route path="/admin/settings">
          <Redirect to="/admin/settings/integrations" />
        </Route>
        <Route path="/admin/design/branding">
          <ProtectedRoute roles={["admin", "editor"]} adminPermissions={["design"]}>
            <AdminDesignPage initialSubview="branding" />
          </ProtectedRoute>
        </Route>
        <Route path="/admin/design">
          <Redirect to="/admin/design/branding" />
        </Route>
        <Route path="/admin/design/colors">
          <ProtectedRoute roles={["admin", "editor"]} adminPermissions={["design"]}>
            <AdminDesignPage initialSubview="colors" />
          </ProtectedRoute>
        </Route>
        <Route path="/admin/design/typography">
          <ProtectedRoute roles={["admin", "editor"]} adminPermissions={["design"]}>
            <AdminDesignPage initialSubview="typography" />
          </ProtectedRoute>
        </Route>
        <Route path="/admin/therapists/specializations">
          <ProtectedRoute roles={["admin", "editor"]} adminPermissions={["directory"]}>
            {siteFeatures.directoryEnabled ? <AdminSpecializationsPage /> : <NotFound />}
          </ProtectedRoute>
        </Route>
        <Route path="/admin/system/backups">
          <ProtectedRoute roles={["admin"]}>
            <SystemBackupsPage />
          </ProtectedRoute>
        </Route>
        <Route path="/admin/applications/:id">
          <ProtectedRoute roles={["admin", "editor"]} adminPermissions={["directory"]}>
            {siteFeatures.directoryEnabled ? <AdminApplicationDetailPage /> : <NotFound />}
          </ProtectedRoute>
        </Route>
        <Route path="/admin/applications">
          <ProtectedRoute roles={["admin", "editor"]} adminPermissions={["directory"]}>
            {siteFeatures.directoryEnabled ? <AdminApplicationsPage /> : <NotFound />}
          </ProtectedRoute>
        </Route>
        <Route path="/admin/cms">
          <ProtectedRoute roles={["admin", "editor"]} adminPermissions={["content"]}>
            {siteFeatures.cmsEnabled ? <CmsOverviewPage /> : <NotFound />}
          </ProtectedRoute>
        </Route>
        <Route path="/admin/cms/pages/new">
          <ProtectedRoute roles={["admin", "editor"]} adminPermissions={["content"]}>
            {siteFeatures.cmsEnabled ? <CmsPageEditorPage /> : <NotFound />}
          </ProtectedRoute>
        </Route>
        <Route path="/admin/cms/pages/:id">
          <ProtectedRoute roles={["admin", "editor"]} adminPermissions={["content"]}>
            {siteFeatures.cmsEnabled ? <CmsPageEditorPage /> : <NotFound />}
          </ProtectedRoute>
        </Route>
        <Route path="/admin/cms/pages">
          <ProtectedRoute roles={["admin", "editor"]} adminPermissions={["content"]}>
            {siteFeatures.cmsEnabled ? <CmsPagesPage /> : <NotFound />}
          </ProtectedRoute>
        </Route>
        <Route path="/admin/cms/media">
          <ProtectedRoute roles={["admin", "editor"]} adminPermissions={["content"]}>
            {siteFeatures.cmsEnabled ? <CmsMediaPage /> : <NotFound />}
          </ProtectedRoute>
        </Route>
        <Route path="/admin/cms/blog/new">
          <ProtectedRoute roles={["admin", "editor"]} adminPermissions={["content"]}>
            {siteFeatures.blogEnabled ? <CmsBlogEditorPage /> : <NotFound />}
          </ProtectedRoute>
        </Route>
        <Route path="/admin/cms/blog/settings">
          <Redirect to="/admin/cms/blog?tab=settings" />
        </Route>
        <Route path="/admin/cms/blog/comments">
          <Redirect to="/admin/cms/blog?tab=comments" />
        </Route>
        <Route path="/admin/cms/blog/:id">
          <ProtectedRoute roles={["admin", "editor"]} adminPermissions={["content"]}>
            {siteFeatures.blogEnabled ? <CmsBlogEditorPage /> : <NotFound />}
          </ProtectedRoute>
        </Route>
        <Route path="/admin/cms/blog">
          <ProtectedRoute roles={["admin", "editor"]} adminPermissions={["content"]}>
            {siteFeatures.blogEnabled ? <CmsBlogPage /> : <NotFound />}
          </ProtectedRoute>
        </Route>
        <Route path="/admin/cms/sections/new">
          <ProtectedRoute roles={["admin", "editor"]} adminPermissions={["content", "design"]}>
            {siteFeatures.cmsEnabled ? <CmsSectionEditorPage /> : <NotFound />}
          </ProtectedRoute>
        </Route>
        <Route path="/admin/cms/sections/:id">
          <ProtectedRoute roles={["admin", "editor"]} adminPermissions={["content", "design"]}>
            {siteFeatures.cmsEnabled ? <CmsSectionEditorPage /> : <NotFound />}
          </ProtectedRoute>
        </Route>
        <Route path="/admin/cms/sections">
          <ProtectedRoute roles={["admin", "editor"]} adminPermissions={["content", "design"]}>
            {siteFeatures.cmsEnabled ? <CmsSectionsPage /> : <NotFound />}
          </ProtectedRoute>
        </Route>
        <Route path="/admin/cms/seo">
          <ProtectedRoute roles={["admin", "editor"]} adminPermissions={["content"]}>
            {siteFeatures.cmsEnabled ? <CmsSeoPage /> : <NotFound />}
          </ProtectedRoute>
        </Route>
        <Route path="/admin/cms/menus">
          <ProtectedRoute roles={["admin", "editor"]} adminPermissions={["design"]}>
            {siteFeatures.cmsEnabled ? <CmsMenusPage /> : <NotFound />}
          </ProtectedRoute>
        </Route>
        <Route path="/admin/cms/sidebars">
          <ProtectedRoute roles={["admin", "editor"]} adminPermissions={["design"]}>
            {siteFeatures.cmsEnabled ? <CmsSidebarsPage /> : <NotFound />}
          </ProtectedRoute>
        </Route>

        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function SetupGuard({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const { data: setupStatus, isLoading } = useQuery<{ needsSetup: boolean }>({
    queryKey: ["/api/setup/status"],
    staleTime: 60_000,
    retry: 2,
  });

  const needsSetup = setupStatus?.needsSetup === true;

  useEffect(() => {
    if (needsSetup && location !== "/setup") {
      setLocation("/setup");
    }
  }, [needsSetup, location, setLocation]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen" data-testid="setup-guard-loading">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return <>{children}</>;
}

function RouteScrollManager() {
  const [location] = useLocation();
  const lastPathnameRef = useRef<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !("scrollRestoration" in window.history)) return;
    const previous = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";
    return () => {
      window.history.scrollRestoration = previous;
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const pathname = location.split(/[?#]/)[0] || "/";
    const lastPathname = lastPathnameRef.current;
    lastPathnameRef.current = pathname;

    if (lastPathname === null || lastPathname === pathname) return;

    const scrollToTarget = () => {
      const hash = window.location.hash;
      if (hash) {
        const target = document.getElementById(hash.slice(1));
        if (target) {
          target.scrollIntoView({ block: "start" });
          return;
        }
      }

      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    };

    const frame = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(scrollToTarget);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [location]);

  return null;
}

function RouteAdminModeManager() {
  const [location] = useLocation();

  useEffect(() => {
    if (typeof document === "undefined") return;
    const pathname = location.split(/[?#]/)[0] || "/";
    const isAdminRoute = pathname.startsWith("/admin");
    const root = document.documentElement;

    root.classList.toggle("admin-mode", isAdminRoute);

    return () => {
      root.classList.remove("admin-mode");
    };
  }, [location]);

  return null;
}

function RuntimeIntegrationsManager() {
  const [location] = useLocation();

  const loadRuntimeIntegrations = () => {
    void loadGa4IfConsented().catch(() => undefined);
    void loadMarketingPixelsIfConsented().catch(() => undefined);
  };

  useEffect(() => {
    loadRuntimeIntegrations();
  }, [location]);

  useEffect(() => {
    return subscribeToCookieConsent(() => {
      loadRuntimeIntegrations();
    });
  }, []);

  return null;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrandingProvider>
        <TooltipProvider>
          <Toaster />
          <SetupGuard>
            <RouteAdminModeManager />
            <RouteScrollManager />
            <RuntimeIntegrationsManager />
            <Router />
            <CookieConsentBanner />
          </SetupGuard>
        </TooltipProvider>
      </BrandingProvider>
    </QueryClientProvider>
  );
}

export default App;

import { Suspense, lazy, useEffect } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/shared/theme-provider";
import { ProtectedRoute } from "@/components/shared/protected-route";
import NotFound from "@/pages/not-found";
import { Loader2 } from "lucide-react";

const HomePage = lazy(() => import("@/features/public/home-page"));
const AboutPage = lazy(() => import("@/features/public/about-page"));
const ContactPage = lazy(() => import("@/features/public/contact-page"));
const EventsPage = lazy(() => import("@/features/public/events-page"));
const EventDetailPage = lazy(() => import("@/features/public/event-detail-page"));
const JoinNetworkPage = lazy(() => import("@/features/public/join-network-page"));
import { CmsHybridPage } from "@/features/public/cms-hybrid-page";

const LoginPage = lazy(() => import("@/features/auth/login-page"));
const RegisterPage = lazy(() => import("@/features/auth/register-page"));
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
const AdminDashboardPage = lazy(() => import("@/features/admin/dashboard-page"));
const AdminTherapistsPage = lazy(() => import("@/features/admin/therapists-page"));
const AdminUsersPage = lazy(() => import("@/features/admin/users-page"));
const AdminMembershipTiersPage = lazy(() => import("@/features/admin/membership-tiers-page"));
const AdminEventsPage = lazy(() => import("@/features/admin/events-page"));
const DocsPage = lazy(() => import("@/features/admin/docs-page"));
const AdminSettingsPage = lazy(() => import("@/features/admin/settings-page"));
const AdminBlogPage = lazy(() => import("@/features/admin/blog-page"));
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
const CmsThemesPage = lazy(() => import("@/features/admin/cms/cms-themes-page"));
const CmsMenusPage = lazy(() => import("@/features/admin/cms/cms-menus-page"));

const InsightsPage = lazy(() => import("@/features/public/insights-page"));
const InsightsPostPage = lazy(() => import("@/features/public/insights-post-page"));
const RecordingArchivesPage = lazy(() => import("@/features/public/recording-archives-page"));

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[50vh]" data-testid="page-loader">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
}

function Router() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        <Route path="/" component={() => <CmsHybridPage slug="home" fallback={<HomePage />} />} />
        <Route path="/about" component={() => <CmsHybridPage slug="about" fallback={<AboutPage />} />} />
        <Route path="/contact" component={() => <CmsHybridPage slug="contact" fallback={<ContactPage />} />} />
        <Route path="/join" component={() => <CmsHybridPage slug="join" fallback={<JoinNetworkPage />} />} />
        <Route path="/events" component={EventsPage} />
        <Route path="/events/:id" component={EventDetailPage} />
        <Route path="/recordings" component={RecordingArchivesPage} />
        <Route path="/insights" component={InsightsPage} />
        <Route path="/insights/:slug" component={InsightsPostPage} />
        <Route path="/directory" component={DirectoryPage} />
        <Route path="/directory/:id" component={TherapistProfilePage} />
        <Route path="/reference/:token" component={ReferenceFormPage} />
        <Route path="/auth/login" component={LoginPage} />
        <Route path="/auth/register" component={RegisterPage} />
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
            <SubscriptionPage />
          </ProtectedRoute>
        </Route>
        <Route path="/therapist/apply">
          <ProtectedRoute roles={["therapist"]}>
            <ApplicationPage />
          </ProtectedRoute>
        </Route>
        <Route path="/therapist/application/status">
          <ProtectedRoute roles={["therapist"]}>
            <ApplicationStatusPage />
          </ProtectedRoute>
        </Route>

        <Route path="/admin">
          <ProtectedRoute roles={["admin"]}>
            <AdminDashboardPage />
          </ProtectedRoute>
        </Route>
        <Route path="/admin/therapists">
          <ProtectedRoute roles={["admin"]}>
            <AdminTherapistsPage />
          </ProtectedRoute>
        </Route>
        <Route path="/admin/users">
          <ProtectedRoute roles={["admin"]}>
            <AdminUsersPage />
          </ProtectedRoute>
        </Route>
        <Route path="/admin/membership-tiers">
          <ProtectedRoute roles={["admin"]}>
            <AdminMembershipTiersPage />
          </ProtectedRoute>
        </Route>
        <Route path="/admin/events">
          <ProtectedRoute roles={["admin"]}>
            <AdminEventsPage />
          </ProtectedRoute>
        </Route>
        <Route path="/admin/blog">
          <ProtectedRoute roles={["admin"]}>
            <AdminBlogPage />
          </ProtectedRoute>
        </Route>
        <Route path="/admin/docs">
          <ProtectedRoute roles={["admin"]}>
            <DocsPage />
          </ProtectedRoute>
        </Route>
        <Route path="/admin/settings">
          <ProtectedRoute roles={["admin"]}>
            <AdminSettingsPage />
          </ProtectedRoute>
        </Route>
        <Route path="/admin/applications/:id">
          <ProtectedRoute roles={["admin"]}>
            <AdminApplicationDetailPage />
          </ProtectedRoute>
        </Route>
        <Route path="/admin/applications">
          <ProtectedRoute roles={["admin"]}>
            <AdminApplicationsPage />
          </ProtectedRoute>
        </Route>
        <Route path="/admin/cms">
          <ProtectedRoute roles={["admin"]}>
            <CmsOverviewPage />
          </ProtectedRoute>
        </Route>
        <Route path="/admin/cms/pages/new">
          <ProtectedRoute roles={["admin"]}>
            <CmsPageEditorPage />
          </ProtectedRoute>
        </Route>
        <Route path="/admin/cms/pages/:id">
          <ProtectedRoute roles={["admin"]}>
            <CmsPageEditorPage />
          </ProtectedRoute>
        </Route>
        <Route path="/admin/cms/pages">
          <ProtectedRoute roles={["admin"]}>
            <CmsPagesPage />
          </ProtectedRoute>
        </Route>
        <Route path="/admin/cms/media">
          <ProtectedRoute roles={["admin"]}>
            <CmsMediaPage />
          </ProtectedRoute>
        </Route>
        <Route path="/admin/cms/blog/new">
          <ProtectedRoute roles={["admin"]}>
            <CmsBlogEditorPage />
          </ProtectedRoute>
        </Route>
        <Route path="/admin/cms/blog/:id">
          <ProtectedRoute roles={["admin"]}>
            <CmsBlogEditorPage />
          </ProtectedRoute>
        </Route>
        <Route path="/admin/cms/blog">
          <ProtectedRoute roles={["admin"]}>
            <CmsBlogPage />
          </ProtectedRoute>
        </Route>
        <Route path="/admin/cms/sections/new">
          <ProtectedRoute roles={["admin"]}>
            <CmsSectionEditorPage />
          </ProtectedRoute>
        </Route>
        <Route path="/admin/cms/sections/:id">
          <ProtectedRoute roles={["admin"]}>
            <CmsSectionEditorPage />
          </ProtectedRoute>
        </Route>
        <Route path="/admin/cms/sections">
          <ProtectedRoute roles={["admin"]}>
            <CmsSectionsPage />
          </ProtectedRoute>
        </Route>
        <Route path="/admin/cms/seo">
          <ProtectedRoute roles={["admin"]}>
            <CmsSeoPage />
          </ProtectedRoute>
        </Route>
        <Route path="/admin/cms/themes">
          <ProtectedRoute roles={["admin"]}>
            <CmsThemesPage />
          </ProtectedRoute>
        </Route>
        <Route path="/admin/cms/menus">
          <ProtectedRoute roles={["admin"]}>
            <CmsMenusPage />
          </ProtectedRoute>
        </Route>

        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function SetupGuard({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const { data: setupStatus, isLoading, isError } = useQuery<{ needsSetup: boolean }>({
    queryKey: ["/api/setup/status"],
    staleTime: 60_000,
    retry: 2,
  });

  const needsSetup = setupStatus?.needsSetup === true || (isError && !setupStatus);

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

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <SetupGuard>
            <Router />
          </SetupGuard>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;

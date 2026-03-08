import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/shared/theme-provider";
import { ProtectedRoute } from "@/components/shared/protected-route";
import NotFound from "@/pages/not-found";

import HomePage from "@/features/public/home-page";
import AboutPage from "@/features/public/about-page";
import ContactPage from "@/features/public/contact-page";
import EventsPage from "@/features/public/events-page";

import LoginPage from "@/features/auth/login-page";
import RegisterPage from "@/features/auth/register-page";
import ResetPasswordPage from "@/features/auth/reset-password-page";

import DirectoryPage from "@/features/directory/directory-page";
import TherapistProfilePage from "@/features/directory/therapist-profile-page";

import TherapistDashboardPage from "@/features/therapist/dashboard-page";
import ProfileEditPage from "@/features/therapist/profile-edit-page";
import SubscriptionPage from "@/features/therapist/subscription-page";

import AdminDashboardPage from "@/features/admin/dashboard-page";
import AdminTherapistsPage from "@/features/admin/therapists-page";
import AdminUsersPage from "@/features/admin/users-page";
import AdminMembershipTiersPage from "@/features/admin/membership-tiers-page";
import AdminEventsPage from "@/features/admin/events-page";
import AdminMessagesPage from "@/features/admin/messages-page";
import DocsPage from "@/features/admin/docs-page";

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/about" component={AboutPage} />
      <Route path="/contact" component={ContactPage} />
      <Route path="/events" component={EventsPage} />
      <Route path="/directory" component={DirectoryPage} />
      <Route path="/directory/:id" component={TherapistProfilePage} />
      <Route path="/auth/login" component={LoginPage} />
      <Route path="/auth/register" component={RegisterPage} />
      <Route path="/auth/reset-password" component={ResetPasswordPage} />

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
      <Route path="/admin/messages">
        <ProtectedRoute roles={["admin"]}>
          <AdminMessagesPage />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/docs">
        <ProtectedRoute roles={["admin"]}>
          <DocsPage />
        </ProtectedRoute>
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;

import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import { AdminProtectedRoute } from "./components/AdminProtectedRoute";
import { ChatFloatingButton } from "./components/ChatFloatingButton";
import { MobileBottomNav } from "./components/MobileBottomNav";
import { ErrorBoundary } from "./components/ErrorBoundary";

// Route-level code splitting: keep the initial bundle small.
// Home (`/`) stays eager for fastest first paint; everything else lazy-loads.
const AddContact = lazy(() => import("./pages/AddContact"));
const Verify = lazy(() => import("./pages/Verify"));
const MyInfo = lazy(() => import("./pages/MyInfo"));
const AdminLogin = lazy(() => import("./pages/AdminLogin"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const Chat = lazy(() => import("./pages/Chat"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const OAuthConsent = lazy(() => import("./pages/OAuthConsent"));
const NotFound = lazy(() => import("./pages/NotFound"));

import { HeirloomPageSkeleton } from "./components/skeletons/LoadingSkeletons";
import { useGlobalPresenceHeartbeat } from "./hooks/useGlobalPresenceHeartbeat";

const queryClient = new QueryClient();

const AppShell = () => {
  useGlobalPresenceHeartbeat();
  return null;
};

const App = () => (

  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground focus:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            মূল কন্টেন্টে যান
          </a>
          <ErrorBoundary>
            <Suspense fallback={<HeirloomPageSkeleton />}>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/add" element={<AddContact />} />
                <Route path="/access" element={<Navigate to="/verify?next=view" replace />} />
                <Route path="/verify" element={<Verify />} />
                <Route path="/me" element={<MyInfo />} />
                <Route path="/admin" element={<AdminLogin />} />
                <Route path="/admin/dashboard" element={<AdminProtectedRoute><AdminDashboard /></AdminProtectedRoute>} />
                <Route path="/chat" element={<Chat />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/.lovable/oauth/consent" element={<OAuthConsent />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </ErrorBoundary>
          <ChatFloatingButton />
          <MobileBottomNav />
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;

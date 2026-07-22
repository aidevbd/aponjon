import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import AddContact from "./pages/AddContact";
import Verify from "./pages/Verify";
import MyInfo from "./pages/MyInfo";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import Chat from "./pages/Chat";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import OAuthConsent from "./pages/OAuthConsent";
import NotFound from "./pages/NotFound";
import { AdminProtectedRoute } from "./components/AdminProtectedRoute";
import { ChatFloatingButton } from "./components/ChatFloatingButton";
import { MobileBottomNav } from "./components/MobileBottomNav";

const queryClient = new QueryClient();

const App = () => (
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
        <ChatFloatingButton />
        <MobileBottomNav />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

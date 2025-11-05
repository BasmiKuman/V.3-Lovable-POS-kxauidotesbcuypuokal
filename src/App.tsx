import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { ProtectedRoute } from "./components/ProtectedRoute";
import Auth from "./pages/Auth";
import EmailVerified from "./pages/EmailVerified";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import Products from "./pages/Products";
import Warehouse from "./pages/Warehouse";
import Reports from "./pages/Reports";
import POS from "./pages/POS";
import Settings from "./pages/Settings";
import RiderDashboard from "./pages/RiderDashboard";
import RiderReports from "./pages/RiderReports";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => {
  return (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <HashRouter>
        <Routes>
          <Route 
            path="/" 
            element={
              <ProtectedRoute>
                {({ isAdmin }) => (
                  <Navigate to={isAdmin ? "/dashboard" : "/rider-dashboard"} replace />
                )}
              </ProtectedRoute>
            }
          />
          <Route path="/auth" element={<Auth />} />
          <Route path="/email-verified" element={<EmailVerified />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute requireAdmin={true}>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/products"
            element={
              <ProtectedRoute>
                <Products />
              </ProtectedRoute>
            }
          />
          <Route
            path="/warehouse"
            element={
              <ProtectedRoute requireAdmin={true}>
                <Warehouse />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports"
            element={
              <ProtectedRoute requireAdmin={true}>
                <Reports />
              </ProtectedRoute>
            }
          />
          <Route
            path="/pos"
            element={
              <ProtectedRoute>
                <POS />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/rider-dashboard"
            element={
              <ProtectedRoute requireRider={true}>
                <RiderDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/rider-reports"
            element={
              <ProtectedRoute requireRider={true}>
                <RiderReports />
              </ProtectedRoute>
            }
          />

          
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </HashRouter>
    </TooltipProvider>
  </QueryClientProvider>
  );
};

export default App;

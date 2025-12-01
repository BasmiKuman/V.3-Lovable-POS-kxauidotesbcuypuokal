import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Loader2 } from "lucide-react";
import { startTracking, stopTracking, resumeTracking } from "@/lib/gps-tracking";
import { requestAllPermissions } from "@/lib/permissions";
import GPSConsentCheck from "./GPSConsentCheck";

interface ProtectedRouteProps {
  children: React.ReactNode | ((props: { isAdmin: boolean }) => React.ReactNode);
  requireAdmin?: boolean;
  requireRider?: boolean;
}

export const ProtectedRoute = ({ children, requireAdmin = false, requireRider = false }: ProtectedRouteProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isRider, setIsRider] = useState(false);
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  
  // Cache untuk menghindari race condition
  const roleCache = useState<{ userId: string; role: string; timestamp: number } | null>(null)[0];

  useEffect(() => {
    let mounted = true;
    let fetchTimeout: NodeJS.Timeout;

    const fetchUserRole = async (userId: string) => {
      try {
        // Check cache first (valid for 5 seconds)
        if (roleCache && roleCache.userId === userId && Date.now() - roleCache.timestamp < 5000) {
          const cachedRole = roleCache.role;
          if (mounted) {
            setIsAdmin(cachedRole === "admin" || cachedRole === "super_admin");
            setIsRider(cachedRole === "rider");
          }
          return;
        }

        // Get user role with single query (no race condition)
        const { data: roleData, error: queryError } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", userId)
          .single(); // Use single() instead of maybeSingle() for better error handling
        
        if (queryError) {
          console.error("Roles check error:", queryError);
          if (mounted) {
            setIsAdmin(false);
            setIsRider(false);
          }
          return;
        }
        
        if (mounted && roleData) {
          const role = roleData.role;
          
          // Update cache
          if (roleCache) {
            roleCache.userId = userId;
            roleCache.role = role;
            roleCache.timestamp = Date.now();
          }
          
          // Set role state - CRITICAL: Set both at the same time to avoid race
          const isAdminRole = role === "admin" || role === "super_admin";
          const isRiderRole = role === "rider";
          
          setIsAdmin(isAdminRole);
          setIsRider(isRiderRole);
          
          console.log(`[ProtectedRoute] User role loaded: ${role}, isAdmin: ${isAdminRole}, isRider: ${isRiderRole}`);
        }
      } catch (e) {
        console.error("Roles check exception:", e);
        if (mounted) {
          setIsAdmin(false);
          setIsRider(false);
        }
      }
    };

    // Subscribe FIRST to avoid missing events and keep callback synchronous
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      
      setUser(session?.user ?? null);
      
      if (session?.user) {
        // Clear any pending timeout to avoid race condition
        if (fetchTimeout) clearTimeout(fetchTimeout);
        
        // Debounce role fetch to avoid multiple simultaneous calls
        fetchTimeout = setTimeout(() => {
          if (mounted) {
            fetchUserRole(session.user!.id);
          }
        }, 100); // Small delay to batch multiple auth state changes
        
        // Auto-start GPS tracking on login (for riders only)
        if (event === 'SIGNED_IN') {
          setTimeout(async () => {
            // Request all permissions on login
            console.log('Requesting app permissions...');
            const permissions = await requestAllPermissions();
            console.log('Permissions granted:', permissions);
            
            const { data: roles } = await supabase
              .from("user_roles")
              .select("role")
              .eq("user_id", session.user.id)
              .eq("role", "rider")
              .maybeSingle();
            
            if (roles) {
              console.log('User logged in, starting GPS tracking...');
              await startTracking(session.user.id);
            }
          }, 1000);
        }
      } else {
        setIsAdmin(false);
        setIsRider(false);
        
        // Auto-stop GPS tracking on logout
        if (event === 'SIGNED_OUT') {
          console.log('User logged out, stopping GPS tracking...');
          stopTracking();
        }
      }
    });

    // THEN get the current session to initialize state
    supabase.auth.getSession()
      .then(({ data: { session }, error }) => {
        if (error) {
          console.error("Session error:", error);
          if (mounted) setLoading(false);
          return;
        }
        if (mounted) setUser(session?.user ?? null);
        if (session?.user) {
          fetchUserRole(session.user.id).finally(() => {
            if (mounted) setLoading(false);
          });
          
          // Resume GPS tracking if it was active (on app restart)
          setTimeout(() => resumeTracking(session.user.id), 1500);
        } else {
          if (mounted) setLoading(false);
        }
      })
      .catch((err) => {
        console.error("Auth check error:", err);
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
      if (fetchTimeout) clearTimeout(fetchTimeout);
      subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  if (requireAdmin && !isAdmin) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <div className="max-w-screen-xl mx-auto p-4 text-center pt-12">
          <div className="w-12 h-12 mx-auto text-muted-foreground opacity-50 mb-4">🔒</div>
          <h1 className="text-xl font-semibold mb-2">Akses Dibatasi</h1>
          <p className="text-muted-foreground">
            Maaf, Anda tidak memiliki akses ke halaman ini
          </p>
        </div>
      </div>
    );
  }

  if (requireRider && !isRider) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <div className="max-w-screen-xl mx-auto p-4 text-center pt-12">
          <div className="w-12 h-12 mx-auto text-muted-foreground opacity-50 mb-4">🔒</div>
          <h1 className="text-xl font-semibold mb-2">Akses Dibatasi</h1>
          <p className="text-muted-foreground">
            Halaman ini khusus untuk rider
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* GPS Consent Check for Riders */}
      <GPSConsentCheck />
      
      {/* Render protected content */}
      {typeof children === 'function' ? children({ isAdmin }) : children}
    </>
  );
};

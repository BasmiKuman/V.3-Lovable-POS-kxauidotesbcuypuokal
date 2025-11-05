import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BottomNav } from "@/components/BottomNav";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Users, Megaphone, MapPin } from "lucide-react";
import { ProfileTab } from "@/components/settings/ProfileTab";
import { GPSTab } from "@/components/settings/GPSTab";
import { FeedManagement } from "@/components/FeedManagement";
import { ManageUsersTab } from "@/components/settings/ManageUsersTab";

type Profile = {
  id: string;
  user_id: string;
  full_name: string;
  email?: string;
  phone: string | null;
  address?: string | null;
  avatar_url?: string | null;
  role?: string;
};

export default function Settings() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!user) {
        setLoading(false);
        return;
      }

      // Check role
      const { data: role, error: roleError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();

      if (roleError) throw roleError;

      const userRole = role?.role || "rider";
      setIsAdmin(userRole === "admin" || userRole === "super_admin");

      // Get profile
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("user_id, full_name, phone, address, avatar_url, created_at, updated_at")
        .eq("user_id", user.id)
        .maybeSingle();

      if (profileError) throw profileError;

      if (profileData) {
        setProfile({
          ...profileData,
          id: profileData.user_id,
          email: user.email,
          role: userRole,
        });
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="max-w-screen-xl mx-auto p-4 md:p-6 space-y-6">
        <div className="animate-fade-in">
          <h1 className="text-2xl md:text-3xl font-bold mb-2">Pengaturan</h1>
          <p className="text-muted-foreground text-sm md:text-base">
            Kelola profil dan pengaturan akun Anda
          </p>
        </div>

        <Tabs defaultValue="profile" className="w-full">
          <TabsList className={`grid w-full gap-1 ${isAdmin ? 'grid-cols-4' : 'grid-cols-2'}`}>
            <TabsTrigger value="profile" className="flex-col gap-1 h-auto py-2 text-xs">
              <User className="h-4 w-4" />
              <span>Profil</span>
            </TabsTrigger>
            
            {!isAdmin && (
              <TabsTrigger value="gps" className="flex-col gap-1 h-auto py-2 text-xs">
                <MapPin className="h-4 w-4" />
                <span>GPS</span>
              </TabsTrigger>
            )}
            
            {isAdmin && (
              <>
                <TabsTrigger value="users" className="flex-col gap-1 h-auto py-2 text-xs">
                  <Users className="h-4 w-4" />
                  <span>Pengguna</span>
                </TabsTrigger>
                <TabsTrigger value="feeds" className="flex-col gap-1 h-auto py-2 text-xs">
                  <Megaphone className="h-4 w-4" />
                  <span>Feed</span>
                </TabsTrigger>
              </>
            )}
          </TabsList>

          <TabsContent value="profile" className="mt-6">
            <ProfileTab 
              profile={profile}
              uploading={uploading}
              setUploading={setUploading}
              onProfileUpdate={loadData}
            />
          </TabsContent>

          {!isAdmin && (
            <TabsContent value="gps" className="mt-6">
              <GPSTab userId={profile?.user_id || ""} />
            </TabsContent>
          )}

          {isAdmin && (
            <>
              <TabsContent value="users" className="mt-6">
                <ManageUsersTab />
              </TabsContent>

              <TabsContent value="feeds" className="mt-6">
                <FeedManagement />
              </TabsContent>
            </>
          )}
        </Tabs>
      </div>

      <BottomNav isAdmin={isAdmin} />
    </div>
  );
}

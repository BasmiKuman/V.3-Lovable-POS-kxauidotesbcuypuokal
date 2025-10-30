import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BottomNav } from "@/components/BottomNav";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { LogOut, User, UserPlus, Camera, Upload, Edit, Trash2, MapPin } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useRef } from "react";
import { Switch } from "@/components/ui/switch";
import { getGPSSettings, toggleTracking, getTrackingStatus, hasGPSConsent, saveGPSConsent } from "@/lib/gps-tracking";

import { User as AuthUser } from "@supabase/supabase-js";

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
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [isAdmin, setIsAdmin] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [users, setUsers] = useState<Profile[]>([]);
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [isEditingUser, setIsEditingUser] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [gpsEnabled, setGpsEnabled] = useState(false);
  const [hasGPSConsentStatus, setHasGPSConsentStatus] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [viewAvatarUrl, setViewAvatarUrl] = useState<string | null>(null);
  const [isViewingAvatar, setIsViewingAvatar] = useState(false);
  const [newUser, setNewUser] = useState({
    email: "",
    password: "",
    fullName: "",
    phone: "",
    address: "",
  });
  const [editUser, setEditUser] = useState({
    email: "",
    password: "",
    fullName: "",
    phone: "",
    address: "",
  });

  // Move loadData outside useEffect so it can be called from other functions
  const loadData = async () => {
    try {
      // Get current auth user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!user) {
        setLoading(false);
        return;
      }

      // Check admin role
      const { data: role, error: roleError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();

      if (roleError) throw roleError;

      const isUserAdmin = !!role;
      setIsAdmin(isUserAdmin);

      // Get profile data
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("user_id, full_name, phone, address, avatar_url, created_at, updated_at")
        .eq("user_id", user.id)
        .maybeSingle();

      if (profileError) throw profileError;

      if (profileData) {
        setProfile({
          id: profileData.user_id, // Use user_id as id
          ...profileData,
          email: user.email || "",
          role: isUserAdmin ? "admin" : "rider"
        });
      }

      // If admin, fetch riders
      if (isUserAdmin) {
        const { data: riderRoles, error: rolesError } = await supabase
          .from("user_roles")
          .select("user_id")
          .eq("role", "rider");

        if (rolesError) throw rolesError;

        if (riderRoles && riderRoles.length > 0) {
          // Get profiles for these riders
          const { data: riderProfiles, error: profilesError } = await supabase
            .from("profiles")
            .select("id, user_id, full_name, phone, address, avatar_url")
            .in("user_id", riderRoles.map(r => r.user_id));

          if (profilesError) throw profilesError;

          if (riderProfiles) {
            // Transform rider profiles with placeholder emails
            const ridersWithEmail: Profile[] = riderProfiles.map(profile => ({
              id: profile.id,
              user_id: profile.user_id,
              full_name: profile.full_name,
              email: "",
              phone: profile.phone,
              address: profile.address,
              role: "rider",
              avatar_url: profile.avatar_url
            }));

            // Set initial state
            setUsers(ridersWithEmail);

            // Try to get emails from auth
            try {
              const { data: authData } = await supabase.auth.admin.listUsers();
              if (authData?.users && Array.isArray(authData.users)) {
                const updatedRiders: Profile[] = ridersWithEmail.map(rider => {
                  const authUser = authData.users.find((u: any) => u.id === rider.user_id);
                  return {
                    ...rider,
                    email: authUser?.email || ""
                  };
                });
                setUsers(updatedRiders);
              }
            } catch (authError) {
              console.warn("Could not fetch rider emails:", authError);
              // Continue with ridersWithEmail (without emails)
            }
          }
        }
      }

      // Load GPS settings for riders only
      if (!isUserAdmin) {
        const consent = await hasGPSConsent(user.id);
        setHasGPSConsentStatus(consent);
        
        const gpsSettings = await getGPSSettings(user.id);
        if (gpsSettings) {
          setGpsEnabled(gpsSettings.tracking_enabled);
        }
      }
    } catch (error: any) {
      console.error("Error in loadData:", error);
      toast.error("Gagal memuat data: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = event.target.files?.[0];
      if (!file) return;

      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('File harus berupa gambar');
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Ukuran file maksimal 5MB');
        return;
      }

      setUploading(true);

      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error('User not authenticated');

      // Create file path: userId/avatar.extension
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/avatar.${fileExt}`;

      // Delete old avatar if exists
      if (profile?.avatar_url) {
        const oldPath = profile.avatar_url.split('/').slice(-2).join('/');
        await supabase.storage.from('avatars').remove([oldPath]);
      }

      // Upload new avatar
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Update profile with new avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      // Update local state
      setProfile(prev => prev ? { ...prev, avatar_url: publicUrl } : null);
      
      toast.success('Foto profil berhasil diupdate!');
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      
      // If bucket doesn't exist, create it
      if (error.message?.includes('Bucket not found')) {
        toast.error('Storage belum dikonfigurasi. Hubungi administrator.');
      } else {
        toast.error('Gagal mengupload foto: ' + error.message);
      }
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRoleChange = async (userId: string, currentRole: string) => {
    try {
      const newRole = currentRole === "admin" ? "rider" : "admin";
      
      // Use upsert to update or insert role
      const { error: upsertError } = await supabase
        .from("user_roles")
        .upsert(
          { user_id: userId, role: newRole },
          { onConflict: 'user_id' }
        );

      if (upsertError) {
        console.error("Upsert error:", upsertError);
        throw upsertError;
      }

      // Update local state
      setUsers(prevUsers =>
        prevUsers.map(user =>
          user.user_id === userId
            ? { ...user, role: newRole }
            : user
        )
      );

      toast.success(`Berhasil mengubah peran pengguna menjadi ${newRole}`);
    } catch (error: any) {
      console.error("Error changing role:", error);
      toast.error("Gagal mengubah peran pengguna: " + error.message);
    }
  };

  const handleAddUser = async () => {
    // Validate required fields
    if (!newUser.email.trim() || !newUser.password || !newUser.fullName.trim() || !newUser.phone.trim() || !newUser.address.trim()) {
      toast.error("Mohon lengkapi semua field yang wajib (*)");
      return;
    }

    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newUser.email)) {
      toast.error("Format email tidak valid");
      return;
    }

    // Validate password length
    if (newUser.password.length < 6) {
      toast.error("Password harus minimal 6 karakter");
      return;
    }

    // Validate phone format
    if (!/^[0-9]+$/.test(newUser.phone) || newUser.phone.length < 10) {
      toast.error("Nomor telepon minimal 10 digit angka");
      return;
    }

    // Validate address length
    if (newUser.address.trim().length < 10) {
      toast.error("Alamat harus minimal 10 karakter");
      return;
    }

    setLoading(true);
    try {
      // 1. Create auth user with regular signUp (will trigger handle_new_user)
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newUser.email.trim(),
        password: newUser.password,
        options: {
          data: {
            full_name: newUser.fullName.trim(),
            phone: newUser.phone.trim(),
            address: newUser.address.trim(),
          },
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("Gagal membuat akun pengguna");

      // Wait a bit for trigger to complete
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 2. Verify profile exists (trigger should have created it)
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("user_id", authData.user.id)
        .maybeSingle();

      // Only create profile if trigger didn't create it
      if (!existingProfile) {
        const { error: profileError } = await supabase
          .from("profiles")
          .insert({
            user_id: authData.user.id,
            full_name: newUser.fullName.trim(),
            phone: newUser.phone.trim(),
            address: newUser.address.trim(),
          });

        if (profileError) {
          console.error("Profile creation error:", profileError);
          // Don't throw error if it's duplicate key (trigger already created)
          if (!profileError.message.includes('duplicate') && !profileError.message.includes('unique')) {
            throw new Error("Gagal membuat profile: " + profileError.message);
          }
        }
      }

      // 3. Verify role exists
      const { data: existingRole } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("user_id", authData.user.id)
        .eq("role", "rider")
        .maybeSingle();

      // Only assign role if trigger didn't create it
      if (!existingRole) {
        const { error: roleError } = await supabase
          .from("user_roles")
          .insert({
            user_id: authData.user.id,
            role: "rider",
          });

        if (roleError) {
          console.error("Role assignment error:", roleError);
          // Don't throw error if it's duplicate key (trigger already created)
          if (!roleError.message.includes('duplicate') && !roleError.message.includes('unique')) {
            throw new Error("Gagal assign role: " + roleError.message);
          }
        }
      }

      toast.success("Berhasil menambahkan pengguna baru. Email verifikasi telah dikirim.");
      setIsAddingUser(false);

      // Reload users list to get fresh data from database
      await loadData();

      // Reset form
      setNewUser({ email: "", password: "", fullName: "", phone: "", address: "" });

    } catch (error: any) {
      console.error("Error adding user:", error);
      if (error.message === "User already registered") {
        toast.error("Email sudah terdaftar");
      } else {
        toast.error("Gagal menambahkan pengguna: " + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEditUser = (user: Profile) => {
    setEditingUserId(user.user_id);
    setEditUser({
      email: user.email || "",
      password: "", // Password tidak ditampilkan, hanya diisi jika ingin diubah
      fullName: user.full_name,
      phone: user.phone || "",
      address: user.address || "",
    });
    setIsEditingUser(true);
  };

  const handleUpdateUser = async () => {
    if (!editingUserId) return;

    // Validate required fields (except password yang optional)
    if (!editUser.fullName.trim() || !editUser.phone.trim() || !editUser.address.trim()) {
      toast.error("Mohon lengkapi nama, telepon, dan alamat");
      return;
    }

    // Validate phone format
    if (!/^[0-9]+$/.test(editUser.phone) || editUser.phone.length < 10) {
      toast.error("Nomor telepon minimal 10 digit angka");
      return;
    }

    // Validate address length
    if (editUser.address.trim().length < 10) {
      toast.error("Alamat harus minimal 10 karakter");
      return;
    }

    // Validate password if provided
    if (editUser.password && editUser.password.length < 6) {
      toast.error("Password harus minimal 6 karakter");
      return;
    }

    setLoading(true);
    try {
      // Update profile in database
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          full_name: editUser.fullName.trim(),
          phone: editUser.phone.trim(),
          address: editUser.address.trim(),
        })
        .eq("user_id", editingUserId);

      if (profileError) throw profileError;

      // Update password if provided
      if (editUser.password) {
        const { error: passwordError } = await supabase.auth.admin.updateUserById(
          editingUserId,
          { password: editUser.password }
        );

        if (passwordError) {
          toast.error("Profile berhasil diupdate, tapi gagal update password: " + passwordError.message);
        } else {
          toast.success("Profile dan password berhasil diupdate!");
        }
      } else {
        toast.success("Profile berhasil diupdate!");
      }

      // Update local state
      setUsers(prevUsers =>
        prevUsers.map(user =>
          user.user_id === editingUserId
            ? {
                ...user,
                full_name: editUser.fullName.trim(),
                phone: editUser.phone.trim(),
                address: editUser.address.trim(),
              }
            : user
        )
      );

      setIsEditingUser(false);
      setEditingUserId(null);
      setEditUser({ email: "", password: "", fullName: "", phone: "", address: "" });

    } catch (error: any) {
      console.error("Error updating user:", error);
      toast.error("Gagal update pengguna: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus pengguna "${userName}"? Tindakan ini tidak dapat dibatalkan.`)) {
      return;
    }

    setLoading(true);
    try {
      // Delete from auth (this will cascade delete profile and roles due to foreign key)
      const { error: deleteError } = await supabase.auth.admin.deleteUser(userId);

      if (deleteError) throw deleteError;

      toast.success("Pengguna berhasil dihapus");

      // Update local state
      setUsers(prevUsers => prevUsers.filter(user => user.user_id !== userId));

    } catch (error: any) {
      console.error("Error deleting user:", error);
      toast.error("Gagal menghapus pengguna: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGPSToggle = async (enabled: boolean) => {
    if (!profile) return;
    
    setGpsLoading(true);
    try {
      const success = await toggleTracking(profile.user_id, enabled);
      
      if (success) {
        setGpsEnabled(enabled);
        toast.success(
          enabled 
            ? "GPS Tracking diaktifkan" 
            : "GPS Tracking dinonaktifkan"
        );
      } else {
        toast.error("Gagal mengubah status GPS tracking");
      }
    } catch (error: any) {
      console.error("GPS toggle error:", error);
      toast.error("Terjadi kesalahan saat mengubah GPS tracking");
    } finally {
      setGpsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast.success("Berhasil logout");
      navigate("/auth", { replace: true });
    } catch (error: any) {
      toast.error("Gagal logout");
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <img 
          src="/images/logo.png" 
          alt="BK Logo" 
          className="w-20 h-20 animate-bounce"
        />
        <p className="text-sm text-muted-foreground animate-pulse">Memuat data...</p>
      </div>
    );
  }

  console.log("Rendering with state:", {
    isAdmin,
    usersCount: users.length,
    users
  });

  return (
    <div 
      className="min-h-screen bg-background w-full overflow-x-hidden"
      style={{
        paddingTop: 'max(1rem, env(safe-area-inset-top, 0px))',
        paddingBottom: 'calc(5rem + env(safe-area-inset-bottom, 0px))',
        paddingLeft: 'env(safe-area-inset-left, 0px)',
        paddingRight: 'env(safe-area-inset-right, 0px)',
      }}
    >
      <div className="max-w-screen-xl mx-auto px-3 sm:px-4 space-y-4 sm:space-y-6">
        {/* Header with Logo */}
        <div className="flex items-center gap-3 pb-3 border-b">
          <img 
            src="/images/logo.png" 
            alt="BK Logo" 
            className="w-10 h-10 sm:w-12 sm:h-12 flex-shrink-0"
          />
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
              Pengaturan
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground truncate">BK POS System - Kelola profil dan preferensi</p>
          </div>
        </div>

        {/* Profile Card */}
        <Card className="animate-fade-in">
          <CardHeader>
            <CardTitle>Profil Pengguna</CardTitle>
            <CardDescription>Informasi akun Anda</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Avatar className="w-20 h-20">
                  <AvatarImage 
                    src={profile?.avatar_url || undefined} 
                    alt={profile?.full_name}
                    className="object-cover aspect-square"
                  />
                  <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                    {profile?.full_name?.charAt(0)?.toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <Button
                  size="icon"
                  variant="secondary"
                  className="absolute -bottom-1 -right-1 rounded-full w-8 h-8 shadow-lg"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? (
                    <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Camera className="w-4 h-4" />
                  )}
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarUpload}
                />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-semibold">{profile?.full_name}</h3>
                <p className="text-sm text-muted-foreground">
                  {isAdmin ? "Administrator" : "Rider / Kasir"}
                </p>
              </div>
            </div>

            <div className="space-y-3 border-t pt-4">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Email:</span>
                <span className="text-sm font-medium">{profile?.email || "-"}</span>
              </div>
              {profile?.phone && (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Telepon:</span>
                  <span className="text-sm font-medium">{profile.phone}</span>
                </div>
              )}
              {profile?.address && (
                <div className="flex flex-col gap-1">
                  <span className="text-sm text-muted-foreground">Alamat:</span>
                  <span className="text-sm font-medium">{profile.address}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Role:</span>
                <span className="text-sm font-medium">
                  {isAdmin ? "Admin" : "Rider"}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {isAdmin && (
          <Card className="animate-fade-in">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Manajemen Pengguna</CardTitle>
                <CardDescription>Kelola akun rider</CardDescription>
              </div>
              <Dialog open={isAddingUser} onOpenChange={(open) => {
                if (!open) {
                  // Reset form when dialog closes
                  setNewUser({ email: "", password: "", fullName: "", phone: "", address: "" });
                }
                setIsAddingUser(open);
              }}>
                <DialogTrigger asChild>
                  <Button>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Tambah Rider
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Tambah Rider Baru</DialogTitle>
                    <DialogDescription>
                      Tambahkan akun rider baru ke sistem
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="nama@email.com"
                        value={newUser.email}
                        onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="password">Password</Label>
                      <Input
                        id="password"
                        type="password"
                        placeholder="Minimal 6 karakter"
                        value={newUser.password}
                        onChange={(e) => setNewUser(prev => ({ ...prev, password: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="fullName">Nama Lengkap</Label>
                      <Input
                        id="fullName"
                        placeholder="Nama lengkap"
                        value={newUser.fullName}
                        onChange={(e) => setNewUser(prev => ({ ...prev, fullName: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="phone">No. Telepon *</Label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="08123456789"
                        value={newUser.phone}
                        onChange={(e) => setNewUser(prev => ({ ...prev, phone: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="address">Alamat Lengkap *</Label>
                      <Textarea
                        id="address"
                        placeholder="Jl. Contoh No. 123, Kota, Provinsi"
                        value={newUser.address}
                        onChange={(e) => setNewUser(prev => ({ ...prev, address: e.target.value }))}
                        rows={3}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAddingUser(false)}>
                      Batal
                    </Button>
                    <Button onClick={handleAddUser} disabled={loading}>
                      {loading ? "Memproses..." : "Tambah User"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {/* Edit User Dialog */}
              <Dialog open={isEditingUser} onOpenChange={(open) => {
                if (!open) {
                  setEditingUserId(null);
                  setEditUser({ email: "", password: "", fullName: "", phone: "", address: "" });
                }
                setIsEditingUser(open);
              }}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Edit Pengguna</DialogTitle>
                    <DialogDescription>
                      Update informasi pengguna (kosongkan password jika tidak ingin mengubahnya)
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="edit-email">Email (Read Only)</Label>
                      <Input
                        id="edit-email"
                        type="email"
                        value={editUser.email}
                        disabled
                        className="bg-muted"
                      />
                      <p className="text-xs text-muted-foreground mt-1">Email tidak bisa diubah</p>
                    </div>
                    <div>
                      <Label htmlFor="edit-password">Password Baru (Opsional)</Label>
                      <Input
                        id="edit-password"
                        type="password"
                        placeholder="Minimal 6 karakter (kosongkan jika tidak ingin mengubah)"
                        value={editUser.password}
                        onChange={(e) => setEditUser(prev => ({ ...prev, password: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-fullName">Nama Lengkap *</Label>
                      <Input
                        id="edit-fullName"
                        placeholder="Nama lengkap"
                        value={editUser.fullName}
                        onChange={(e) => setEditUser(prev => ({ ...prev, fullName: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-phone">No. Telepon *</Label>
                      <Input
                        id="edit-phone"
                        type="tel"
                        placeholder="08123456789"
                        value={editUser.phone}
                        onChange={(e) => setEditUser(prev => ({ ...prev, phone: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-address">Alamat Lengkap *</Label>
                      <Textarea
                        id="edit-address"
                        placeholder="Jl. Contoh No. 123, Kota, Provinsi"
                        value={editUser.address}
                        onChange={(e) => setEditUser(prev => ({ ...prev, address: e.target.value }))}
                        rows={3}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsEditingUser(false)}>
                      Batal
                    </Button>
                    <Button onClick={handleUpdateUser} disabled={loading}>
                      {loading ? "Memproses..." : "Update"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto -mx-6 px-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[25%]">Nama</TableHead>
                      {!isMobile && (
                        <>
                          <TableHead>Email</TableHead>
                          <TableHead>No. Telepon</TableHead>
                          <TableHead>Alamat</TableHead>
                        </>
                      )}
                      <TableHead>Status & Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center space-x-3 md:space-x-4">
                            <Avatar 
                              className="w-8 h-8 md:w-10 md:h-10 cursor-pointer hover:ring-2 hover:ring-primary transition-all"
                              onClick={() => {
                                if (user.avatar_url) {
                                  setViewAvatarUrl(user.avatar_url);
                                  setIsViewingAvatar(true);
                                }
                              }}
                            >
                              <AvatarImage 
                                src={user.avatar_url || undefined} 
                                alt={user.full_name}
                                className="object-cover aspect-square"
                              />
                              <AvatarFallback className="text-xs md:text-sm">{user.full_name.charAt(0).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-bold text-xs md:text-sm">{user.full_name}</div>
                              {isMobile && (
                                <>
                                  <div className="text-[10px] md:text-xs text-muted-foreground truncate max-w-[150px]">{user.email}</div>
                                  {user.phone && (
                                    <div className="text-[10px] md:text-xs text-muted-foreground">{user.phone}</div>
                                  )}
                                  {user.address && (
                                    <div className="text-[9px] md:text-xs text-muted-foreground mt-1 max-w-[150px] truncate" title={user.address}>
                                      📍 {user.address}
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        {!isMobile && (
                          <>
                            <TableCell>{user.email}</TableCell>
                            <TableCell>{user.phone || "-"}</TableCell>
                            <TableCell>
                              <div className="max-w-xs truncate" title={user.address || "-"}>
                                {user.address || "-"}
                              </div>
                            </TableCell>
                          </>
                        )}
                        <TableCell>
                          <div className="flex flex-col gap-1 md:gap-2">
                            <Badge variant={user.role === "admin" ? "default" : "outline"} className="w-fit text-[10px] md:text-xs">
                              {user.role === "admin" ? "Admin" : "Rider"}
                            </Badge>
                            <div className="flex gap-1">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleOpenEditUser(user)}
                                className="flex-1 text-[10px] md:text-xs h-7 md:h-8 px-1 md:px-2"
                              >
                                <Edit className="w-3 h-3 md:mr-1" />
                                <span className="hidden md:inline">Edit</span>
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleRoleChange(user.user_id, user.role || "rider")}
                                className="flex-1 text-[10px] md:text-xs h-7 md:h-8 px-1 md:px-2"
                              >
                                {user.role === "admin" ? "→ R" : "→ A"}
                              </Button>
                              <Button 
                                variant="destructive" 
                                size="sm"
                                onClick={() => handleDeleteUser(user.user_id, user.full_name)}
                                className="h-7 md:h-8 w-7 md:w-8 p-0"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* GPS Tracking Settings - Riders Only */}
        {!isAdmin && (
          <Card className="animate-fade-in">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-red-600" />
                  <div>
                    <CardTitle className="text-lg">GPS Tracking</CardTitle>
                    <CardDescription className="text-xs mt-1">
                      {hasGPSConsentStatus 
                        ? "Kelola pelacakan lokasi Anda"
                        : "Aktifkan pelacakan lokasi untuk fitur lengkap"
                      }
                    </CardDescription>
                  </div>
                </div>
                {hasGPSConsentStatus ? (
                  <Switch
                    checked={gpsEnabled}
                    onCheckedChange={handleGPSToggle}
                    disabled={gpsLoading}
                  />
                ) : (
                  <Button
                    size="sm"
                    onClick={async () => {
                      if (profile) {
                        const success = await saveGPSConsent(profile.user_id);
                        if (success) {
                          setHasGPSConsentStatus(true);
                          setGpsEnabled(true);
                          toast.success("GPS Tracking diaktifkan!");
                        }
                      }
                    }}
                  >
                    Aktifkan
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {!hasGPSConsentStatus ? (
                <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <div className="text-yellow-600 dark:text-yellow-400 mt-0.5">
                      <MapPin className="w-5 h-5" />
                    </div>
                    <div className="space-y-2 flex-1">
                      <h4 className="font-semibold text-sm text-yellow-900 dark:text-yellow-100">
                        GPS Tracking Belum Aktif
                      </h4>
                      <p className="text-xs text-yellow-700 dark:text-yellow-300 leading-relaxed">
                        Anda belum memberikan izin untuk pelacakan GPS. Aktifkan sekarang untuk:
                      </p>
                      <ul className="text-xs text-yellow-700 dark:text-yellow-300 space-y-1 ml-4">
                        <li>• Koordinasi distribusi yang lebih baik</li>
                        <li>• Optimasi rute pengiriman</li>
                        <li>• Keamanan dan keselamatan rider</li>
                      </ul>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <div className="text-blue-600 dark:text-blue-400 mt-0.5">
                        <MapPin className="w-5 h-5" />
                      </div>
                      <div className="space-y-2 flex-1">
                        <h4 className="font-semibold text-sm text-blue-900 dark:text-blue-100">
                          Status: {gpsEnabled ? "🟢 Aktif" : "🔴 Nonaktif"}
                        </h4>
                        <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
                          {gpsEnabled 
                            ? "Lokasi Anda sedang dilacak secara real-time. Admin dapat melihat posisi Anda di peta."
                            : "Pelacakan lokasi dinonaktifkan. Anda dapat mengaktifkannya kembali kapan saja."
                          }
                        </p>
                        {gpsEnabled && (
                          <div className="text-xs text-blue-600 dark:text-blue-400 space-y-1 mt-2">
                            <p>✓ Auto-aktif saat login</p>
                            <p>✓ Auto-mati saat logout</p>
                            <p>✓ Update setiap 1 menit (hemat baterai)</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {!gpsEnabled && (
                    <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                      <p className="text-xs text-yellow-700 dark:text-yellow-300">
                        ⚠️ <strong>Perhatian:</strong> Menonaktifkan GPS tracking dapat mempengaruhi 
                        akses ke beberapa fitur dan koordinasi dengan tim.
                      </p>
                    </div>
                  )}

                  <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
                    <p>📍 <strong>Privasi:</strong> Data lokasi dilindungi dan hanya digunakan untuk keperluan operasional.</p>
                    <p>🔒 <strong>Keamanan:</strong> Anda dapat menonaktifkan tracking kapan saja melalui toggle di atas.</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Sign Out Button - Moved to Bottom */}
        <Card className="animate-fade-in">
          <CardContent className="pt-6">
            <Button
              variant="destructive"
              className="w-full"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Keluar
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Avatar View Dialog */}
      <Dialog open={isViewingAvatar} onOpenChange={setIsViewingAvatar}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Foto Profile</DialogTitle>
          </DialogHeader>
          {viewAvatarUrl && (
            <div className="flex items-center justify-center p-4">
              <img 
                src={viewAvatarUrl} 
                alt="Profile" 
                className="max-w-full max-h-[70vh] object-contain rounded-lg"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      <BottomNav isAdmin={isAdmin} />
    </div>
  );
}
import { useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Camera, Upload, LogOut } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

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

interface ProfileTabProps {
  profile: Profile | null;
  uploading: boolean;
  setUploading: (val: boolean) => void;
  onProfileUpdate: () => void;
}

export function ProfileTab({ profile, uploading, setUploading, onProfileUpdate }: ProfileTabProps) {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = event.target.files?.[0];
      if (!file || !profile) return;

      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('File harus berupa gambar');
        return;
      }

      // Validate file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        toast.error('Ukuran file maksimal 2MB');
        return;
      }

      setUploading(true);

      // Delete old avatar if exists
      if (profile.avatar_url) {
        const oldPath = profile.avatar_url.split('/').pop();
        if (oldPath) {
          await supabase.storage
            .from('avatars')
            .remove([`${profile.user_id}/${oldPath}`]);
        }
      }

      // Upload new avatar
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${profile.user_id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('user_id', profile.user_id);

      if (updateError) throw updateError;

      toast.success('Foto profil berhasil diupdate');
      onProfileUpdate();
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast.error('Gagal mengupload foto');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!profile) return;

    const formData = new FormData(e.currentTarget);
    const fullName = formData.get('fullName') as string;
    const phone = formData.get('phone') as string;
    const address = formData.get('address') as string;

    if (!fullName.trim()) {
      toast.error('Nama lengkap harus diisi');
      return;
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName.trim(),
          phone: phone.trim() || null,
          address: address.trim() || null,
        })
        .eq('user_id', profile.user_id);

      if (error) throw error;

      toast.success('Profil berhasil diupdate');
      onProfileUpdate();
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Gagal mengupdate profil');
    }
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error('Gagal logout');
      return;
    }
    toast.success('Berhasil logout');
    navigate('/auth');
  };

  if (!profile) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Memuat data profil...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Profile Info Card */}
      <Card className="animate-fade-in">
        <CardHeader>
          <CardTitle>Informasi Profil</CardTitle>
          <CardDescription>Kelola informasi akun Anda</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
            <div className="relative group">
              <Avatar className="w-24 h-24 md:w-32 md:h-32 ring-4 ring-primary/10">
                <AvatarImage 
                  src={profile.avatar_url || undefined} 
                  alt={profile.full_name}
                  className="object-cover aspect-square"
                />
                <AvatarFallback className="text-2xl md:text-3xl bg-primary/10 text-primary">
                  {profile.full_name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="absolute bottom-0 right-0 p-2 bg-primary text-primary-foreground rounded-full shadow-lg hover:bg-primary/90 transition-all disabled:opacity-50"
                title="Ubah foto profil"
              >
                {uploading ? (
                  <Upload className="w-4 h-4 animate-pulse" />
                ) : (
                  <Camera className="w-4 h-4" />
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
              />
            </div>

            <div className="flex-1 w-full">
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div>
                  <Label htmlFor="email">Email (Read Only)</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profile.email || ''}
                    disabled
                    className="bg-muted"
                  />
                </div>
                <div>
                  <Label htmlFor="fullName">Nama Lengkap *</Label>
                  <Input
                    id="fullName"
                    name="fullName"
                    defaultValue={profile.full_name}
                    placeholder="Nama lengkap"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="phone">No. Telepon</Label>
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    defaultValue={profile.phone || ''}
                    placeholder="08123456789"
                  />
                </div>
                <div>
                  <Label htmlFor="address">Alamat</Label>
                  <Textarea
                    id="address"
                    name="address"
                    defaultValue={profile.address || ''}
                    placeholder="Alamat lengkap"
                    rows={3}
                  />
                </div>
                <Button type="submit" className="w-full">
                  Simpan Perubahan
                </Button>
              </form>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logout Card */}
      <Card className="animate-fade-in border-destructive/50">
        <CardHeader>
          <CardTitle className="text-destructive">Keluar dari Akun</CardTitle>
          <CardDescription>
            Logout dari aplikasi
          </CardDescription>
        </CardHeader>
        <CardContent>
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
  );
}

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { UserPlus, Edit, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";

type User = {
  id: string;
  user_id: string;
  full_name: string;
  email?: string;
  phone: string | null;
  address?: string | null;
  avatar_url?: string | null;
  role?: string;
};

export function ManageUsersTab() {
  const isMobile = useIsMobile();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [isEditingUser, setIsEditingUser] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  
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

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) return;

      // Get all profiles
      const { data: profiles, error: profileError } = await supabase
        .from("profiles")
        .select("user_id, full_name, phone, address, avatar_url");

      if (profileError) throw profileError;

      // Get roles for each profile
      const profilesWithRoles = await Promise.all(
        (profiles || []).map(async (profile) => {
          const { data: roleData } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", profile.user_id)
            .maybeSingle();

          // Get email from auth metadata
          const { data: { users: authUsers } } = await supabase.auth.admin.listUsers();
          const authUser = (authUsers as any)?.find((u: any) => u.id === profile.user_id);

          return {
            id: profile.user_id,
            user_id: profile.user_id,
            full_name: profile.full_name,
            email: authUser?.email,
            phone: profile.phone,
            address: profile.address,
            avatar_url: profile.avatar_url,
            role: roleData?.role || "rider",
          };
        })
      );

      setUsers(profilesWithRoles);
    } catch (error) {
      console.error("Error loading users:", error);
      toast.error("Gagal memuat data pengguna");
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async () => {
    if (!newUser.email.trim() || !newUser.password || !newUser.fullName.trim() || !newUser.phone.trim() || !newUser.address.trim()) {
      toast.error("Mohon lengkapi semua field yang wajib (*)");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newUser.email)) {
      toast.error("Format email tidak valid");
      return;
    }

    if (newUser.password.length < 6) {
      toast.error("Password harus minimal 6 karakter");
      return;
    }

    setLoading(true);
    try {
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

      toast.success("Rider baru berhasil ditambahkan!");
      setIsAddingUser(false);
      setNewUser({ email: "", password: "", fullName: "", phone: "", address: "" });
      
      setTimeout(() => loadUsers(), 1000);
    } catch (error: any) {
      console.error("Error adding user:", error);
      toast.error(error.message || "Gagal menambahkan rider");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUser = async () => {
    if (!editingUserId) return;
    if (!editUser.fullName.trim() || !editUser.phone.trim() || !editUser.address.trim()) {
      toast.error("Mohon lengkapi semua field yang wajib (*)");
      return;
    }

    setLoading(true);
    try {
      // Update profile
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
      if (editUser.password && editUser.password.length >= 6) {
        const { error: passwordError } = await supabase.auth.admin.updateUserById(
          editingUserId,
          { password: editUser.password }
        );
        if (passwordError) throw passwordError;
      }

      toast.success("Data pengguna berhasil diupdate!");
      setIsEditingUser(false);
      setEditingUserId(null);
      setEditUser({ email: "", password: "", fullName: "", phone: "", address: "" });
      loadUsers();
    } catch (error: any) {
      console.error("Error updating user:", error);
      toast.error(error.message || "Gagal mengupdate pengguna");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus pengguna ini?")) return;

    setLoading(true);
    try {
      const { error } = await supabase.rpc('delete_user_account' as any, {
        target_user_id: userId,
      });

      if (error) throw error;

      toast.success("Pengguna berhasil dihapus");
      loadUsers();
    } catch (error: any) {
      console.error("Error deleting user:", error);
      toast.error(error.message || "Gagal menghapus pengguna");
    } finally {
      setLoading(false);
    }
  };

  const openEditDialog = (user: User) => {
    setEditUser({
      email: user.email || "",
      password: "",
      fullName: user.full_name,
      phone: user.phone || "",
      address: user.address || "",
    });
    setEditingUserId(user.user_id);
    setIsEditingUser(true);
  };

  return (
    <Card className="animate-fade-in">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Manajemen Pengguna</CardTitle>
          <CardDescription>Kelola akun rider</CardDescription>
        </div>
        <Dialog open={isAddingUser} onOpenChange={(open) => {
          if (!open) setNewUser({ email: "", password: "", fullName: "", phone: "", address: "" });
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
              <DialogDescription>Tambahkan akun rider baru ke sistem</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="email@example.com"
                  value={newUser.email}
                  onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="password">Password *</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Minimal 6 karakter"
                  value={newUser.password}
                  onChange={(e) => setNewUser(prev => ({ ...prev, password: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="fullName">Nama Lengkap *</Label>
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
              </div>
              <div>
                <Label htmlFor="edit-password">Password Baru (Opsional)</Label>
                <Input
                  id="edit-password"
                  type="password"
                  placeholder="Minimal 6 karakter"
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
                    <div className="flex items-center space-x-3">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={user.avatar_url || undefined} alt={user.full_name} />
                        <AvatarFallback>{user.full_name.charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-bold text-sm">{user.full_name}</div>
                        {isMobile && (
                          <>
                            <div className="text-xs text-muted-foreground truncate max-w-[150px]">
                              {user.email}
                            </div>
                            {user.phone && (
                              <div className="text-xs text-muted-foreground">{user.phone}</div>
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
                    <div className="flex flex-col gap-2">
                      <Badge 
                        variant={
                          user.role === "super_admin" ? "default" : 
                          user.role === "admin" ? "secondary" : 
                          "outline"
                        }
                      >
                        {user.role === "super_admin" ? "Super Admin" : 
                         user.role === "admin" ? "Admin" : "Rider"}
                      </Badge>
                      <div className="flex gap-1">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => openEditDialog(user)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        {user.role !== "super_admin" && (
                          <Button 
                            variant="destructive" 
                            size="sm"
                            onClick={() => handleDeleteUser(user.user_id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
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
  );
}

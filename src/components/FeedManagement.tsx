import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Edit, Trash2, Eye, Image, Video, Link as LinkIcon, Share2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { id } from "date-fns/locale";

type Feed = {
  id: string;
  title: string;
  content: string;
  image_url?: string | null;
  video_url?: string | null;
  link_url?: string | null;
  link_text?: string | null;
  social_links?: {
    instagram?: string;
    facebook?: string;
    whatsapp?: string;
  } | null;
  status: "draft" | "published";
  published_at?: string | null;
  created_at: string;
  updated_at: string;
  created_by: string;
};

type FeedFormData = {
  title: string;
  content: string;
  image_url: string;
  video_url: string;
  link_url: string;
  link_text: string;
  instagram: string;
  facebook: string;
  whatsapp: string;
  status: "draft" | "published";
};

export function FeedManagement() {
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FeedFormData>({
    title: "",
    content: "",
    image_url: "",
    video_url: "",
    link_url: "",
    link_text: "",
    instagram: "",
    facebook: "",
    whatsapp: "",
    status: "draft",
  });

  useEffect(() => {
    loadFeeds();
  }, []);

  const loadFeeds = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("feeds" as any)
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setFeeds((data as any) || []);
    } catch (error) {
      console.error("Error loading feeds:", error);
      toast.error("Gagal memuat feed");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      content: "",
      image_url: "",
      video_url: "",
      link_url: "",
      link_text: "",
      instagram: "",
      facebook: "",
      whatsapp: "",
      status: "draft",
    });
    setEditingId(null);
  };

  const handleCreate = async () => {
    if (!formData.title.trim()) {
      toast.error("Judul harus diisi");
      return;
    }
    if (!formData.content.trim()) {
      toast.error("Konten harus diisi");
      return;
    }

    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const social_links: any = {};
      if (formData.instagram) social_links.instagram = formData.instagram;
      if (formData.facebook) social_links.facebook = formData.facebook;
      if (formData.whatsapp) social_links.whatsapp = formData.whatsapp;

      const insertData: any = {
        title: formData.title.trim(),
        content: formData.content.trim(),
        status: formData.status,
        created_by: user.id,
      };

      if (formData.image_url) insertData.image_url = formData.image_url.trim();
      if (formData.video_url) insertData.video_url = formData.video_url.trim();
      if (formData.link_url) insertData.link_url = formData.link_url.trim();
      if (formData.link_text) insertData.link_text = formData.link_text.trim();
      if (Object.keys(social_links).length > 0) insertData.social_links = social_links;
      
      if (formData.status === "published") {
        insertData.published_at = new Date().toISOString();
      }

      const { error } = await supabase.from("feeds" as any).insert(insertData);

      if (error) throw error;

      toast.success("Feed berhasil dibuat");
      setIsCreating(false);
      resetForm();
      loadFeeds();
    } catch (error) {
      console.error("Error creating feed:", error);
      toast.error("Gagal membuat feed");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async () => {
    if (!editingId) return;
    if (!formData.title.trim()) {
      toast.error("Judul harus diisi");
      return;
    }
    if (!formData.content.trim()) {
      toast.error("Konten harus diisi");
      return;
    }

    try {
      setLoading(true);

      const social_links: any = {};
      if (formData.instagram) social_links.instagram = formData.instagram;
      if (formData.facebook) social_links.facebook = formData.facebook;
      if (formData.whatsapp) social_links.whatsapp = formData.whatsapp;

      const updateData: any = {
        title: formData.title.trim(),
        content: formData.content.trim(),
        status: formData.status,
        image_url: formData.image_url ? formData.image_url.trim() : null,
        video_url: formData.video_url ? formData.video_url.trim() : null,
        link_url: formData.link_url ? formData.link_url.trim() : null,
        link_text: formData.link_text ? formData.link_text.trim() : null,
        social_links: Object.keys(social_links).length > 0 ? social_links : null,
      };

      // Set published_at if status changed to published
      const currentFeed = feeds.find(f => f.id === editingId);
      if (formData.status === "published" && currentFeed?.status === "draft") {
        updateData.published_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("feeds" as any)
        .update(updateData)
        .eq("id", editingId);

      if (error) throw error;

      toast.success("Feed berhasil diupdate");
      setIsEditing(false);
      resetForm();
      loadFeeds();
    } catch (error) {
      console.error("Error updating feed:", error);
      toast.error("Gagal mengupdate feed");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus feed ini?")) return;

    try {
      setLoading(true);
      const { error } = await supabase.from("feeds" as any).delete().eq("id", id);

      if (error) throw error;

      toast.success("Feed berhasil dihapus");
      loadFeeds();
    } catch (error) {
      console.error("Error deleting feed:", error);
      toast.error("Gagal menghapus feed");
    } finally {
      setLoading(false);
    }
  };

  const openEditDialog = (feed: Feed) => {
    setFormData({
      title: feed.title,
      content: feed.content,
      image_url: feed.image_url || "",
      video_url: feed.video_url || "",
      link_url: feed.link_url || "",
      link_text: feed.link_text || "",
      instagram: feed.social_links?.instagram || "",
      facebook: feed.social_links?.facebook || "",
      whatsapp: feed.social_links?.whatsapp || "",
      status: feed.status,
    });
    setEditingId(feed.id);
    setIsEditing(true);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div>
          <CardTitle className="text-lg md:text-xl">Feed & Pengumuman</CardTitle>
          <CardDescription className="text-xs md:text-sm">
            Kelola informasi dan pengumuman untuk rider
          </CardDescription>
        </div>
        <Dialog 
          open={isCreating} 
          onOpenChange={(open) => {
            if (!open) resetForm();
            setIsCreating(open);
          }}
        >
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              <span className="hidden md:inline">Buat Feed</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Buat Feed Baru</DialogTitle>
              <DialogDescription>
                Tambahkan pengumuman atau informasi untuk rider
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Judul *</Label>
                <Input
                  id="title"
                  placeholder="Contoh: Promo Spesial Hari Ini!"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="content">Konten *</Label>
                <Textarea
                  id="content"
                  placeholder="Tulis pengumuman atau informasi..."
                  value={formData.content}
                  onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                  rows={4}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="image_url" className="flex items-center gap-2">
                    <Image className="h-4 w-4" />
                    URL Gambar
                  </Label>
                  <Input
                    id="image_url"
                    type="url"
                    placeholder="https://example.com/image.jpg"
                    value={formData.image_url}
                    onChange={(e) => setFormData(prev => ({ ...prev, image_url: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="video_url" className="flex items-center gap-2">
                    <Video className="h-4 w-4" />
                    URL Video
                  </Label>
                  <Input
                    id="video_url"
                    type="url"
                    placeholder="https://youtube.com/watch?v=..."
                    value={formData.video_url}
                    onChange={(e) => setFormData(prev => ({ ...prev, video_url: e.target.value }))}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    ✅ YouTube (embed langsung, klik play) | ✅ Facebook (embed langsung) | ⚠️ Instagram (buka link)
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="link_url" className="flex items-center gap-2">
                    <LinkIcon className="h-4 w-4" />
                    URL Link
                  </Label>
                  <Input
                    id="link_url"
                    type="url"
                    placeholder="https://example.com"
                    value={formData.link_url}
                    onChange={(e) => setFormData(prev => ({ ...prev, link_url: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="link_text">Teks Link</Label>
                  <Input
                    id="link_text"
                    placeholder="Selengkapnya"
                    value={formData.link_text}
                    onChange={(e) => setFormData(prev => ({ ...prev, link_text: e.target.value }))}
                  />
                </div>
              </div>
              <div>
                <Label className="flex items-center gap-2 mb-2">
                  <Share2 className="h-4 w-4" />
                  Social Media Links
                </Label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <Label htmlFor="instagram" className="text-xs">Instagram</Label>
                    <Input
                      id="instagram"
                      type="url"
                      placeholder="https://instagram.com/..."
                      value={formData.instagram}
                      onChange={(e) => setFormData(prev => ({ ...prev, instagram: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="facebook" className="text-xs">Facebook</Label>
                    <Input
                      id="facebook"
                      type="url"
                      placeholder="https://facebook.com/..."
                      value={formData.facebook}
                      onChange={(e) => setFormData(prev => ({ ...prev, facebook: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="whatsapp" className="text-xs">WhatsApp</Label>
                    <Input
                      id="whatsapp"
                      type="url"
                      placeholder="https://wa.me/..."
                      value={formData.whatsapp}
                      onChange={(e) => setFormData(prev => ({ ...prev, whatsapp: e.target.value }))}
                    />
                  </div>
                </div>
              </div>
              <div>
                <Label htmlFor="status">Status *</Label>
                <Select 
                  value={formData.status} 
                  onValueChange={(value: "draft" | "published") => setFormData(prev => ({ ...prev, status: value }))}
                >
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Publikasikan</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreating(false)}>
                Batal
              </Button>
              <Button onClick={handleCreate} disabled={loading}>
                {loading ? "Memproses..." : "Buat Feed"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog 
          open={isEditing} 
          onOpenChange={(open) => {
            if (!open) resetForm();
            setIsEditing(open);
          }}
        >
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Feed</DialogTitle>
              <DialogDescription>
                Update informasi feed
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-title">Judul *</Label>
                <Input
                  id="edit-title"
                  placeholder="Contoh: Promo Spesial Hari Ini!"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="edit-content">Konten *</Label>
                <Textarea
                  id="edit-content"
                  placeholder="Tulis pengumuman atau informasi..."
                  value={formData.content}
                  onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                  rows={4}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-image_url" className="flex items-center gap-2">
                    <Image className="h-4 w-4" />
                    URL Gambar
                  </Label>
                  <Input
                    id="edit-image_url"
                    type="url"
                    placeholder="https://example.com/image.jpg"
                    value={formData.image_url}
                    onChange={(e) => setFormData(prev => ({ ...prev, image_url: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-video_url" className="flex items-center gap-2">
                    <Video className="h-4 w-4" />
                    URL Video
                  </Label>
                  <Input
                    id="edit-video_url"
                    type="url"
                    placeholder="https://youtube.com/watch?v=..."
                    value={formData.video_url}
                    onChange={(e) => setFormData(prev => ({ ...prev, video_url: e.target.value }))}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    ✅ YouTube (embed langsung, klik play) | ✅ Facebook (embed langsung) | ⚠️ Instagram (buka link)
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-link_url" className="flex items-center gap-2">
                    <LinkIcon className="h-4 w-4" />
                    URL Link
                  </Label>
                  <Input
                    id="edit-link_url"
                    type="url"
                    placeholder="https://example.com"
                    value={formData.link_url}
                    onChange={(e) => setFormData(prev => ({ ...prev, link_url: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-link_text">Teks Link</Label>
                  <Input
                    id="edit-link_text"
                    placeholder="Selengkapnya"
                    value={formData.link_text}
                    onChange={(e) => setFormData(prev => ({ ...prev, link_text: e.target.value }))}
                  />
                </div>
              </div>
              <div>
                <Label className="flex items-center gap-2 mb-2">
                  <Share2 className="h-4 w-4" />
                  Social Media Links
                </Label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <Label htmlFor="edit-instagram" className="text-xs">Instagram</Label>
                    <Input
                      id="edit-instagram"
                      type="url"
                      placeholder="https://instagram.com/..."
                      value={formData.instagram}
                      onChange={(e) => setFormData(prev => ({ ...prev, instagram: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-facebook" className="text-xs">Facebook</Label>
                    <Input
                      id="edit-facebook"
                      type="url"
                      placeholder="https://facebook.com/..."
                      value={formData.facebook}
                      onChange={(e) => setFormData(prev => ({ ...prev, facebook: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-whatsapp" className="text-xs">WhatsApp</Label>
                    <Input
                      id="edit-whatsapp"
                      type="url"
                      placeholder="https://wa.me/..."
                      value={formData.whatsapp}
                      onChange={(e) => setFormData(prev => ({ ...prev, whatsapp: e.target.value }))}
                    />
                  </div>
                </div>
              </div>
              <div>
                <Label htmlFor="edit-status">Status *</Label>
                <Select 
                  value={formData.status} 
                  onValueChange={(value: "draft" | "published") => setFormData(prev => ({ ...prev, status: value }))}
                >
                  <SelectTrigger id="edit-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Publikasikan</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditing(false)}>
                Batal
              </Button>
              <Button onClick={handleEdit} disabled={loading}>
                {loading ? "Memproses..." : "Update Feed"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {loading && feeds.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">Memuat...</div>
        ) : feeds.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Belum ada feed. Klik tombol "Buat Feed" untuk menambahkan.
          </div>
        ) : (
          <div className="overflow-x-auto -mx-6 px-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Judul & Konten</TableHead>
                  <TableHead className="hidden md:table-cell">Media</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden md:table-cell">Tanggal</TableHead>
                  <TableHead>Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {feeds.map((feed) => (
                  <TableRow key={feed.id}>
                    <TableCell>
                      <div>
                        <div className="font-semibold text-sm">{feed.title}</div>
                        <div className="text-xs text-muted-foreground line-clamp-2 mt-1">
                          {feed.content}
                        </div>
                        <div className="md:hidden text-xs text-muted-foreground mt-1">
                          {format(new Date(feed.created_at), "dd MMM yyyy", { locale: id })}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="flex gap-1">
                        {feed.image_url && (
                          <Badge variant="outline" className="text-xs gap-1">
                            <Image className="h-3 w-3" />
                            Img
                          </Badge>
                        )}
                        {feed.video_url && (
                          <Badge variant="outline" className="text-xs gap-1">
                            <Video className="h-3 w-3" />
                            Vid
                          </Badge>
                        )}
                        {feed.link_url && (
                          <Badge variant="outline" className="text-xs gap-1">
                            <LinkIcon className="h-3 w-3" />
                            Link
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={feed.status === "published" ? "default" : "secondary"}>
                        {feed.status === "published" ? "Publikasi" : "Draft"}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                      {format(new Date(feed.created_at), "dd MMM yyyy HH:mm", { locale: id })}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => openEditDialog(feed)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="destructive" 
                          size="sm"
                          onClick={() => handleDelete(feed.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

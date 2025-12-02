import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Factory } from "lucide-react";

interface Product {
  id: string;
  name: string;
  stock_in_warehouse: number;
}

interface AddProductionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: Product[];
  onSuccess: () => void;
  preSelectedProductId?: string | null;
}

export function AddProductionDialog({ 
  open, 
  onOpenChange, 
  products, 
  onSuccess,
  preSelectedProductId 
}: AddProductionDialogProps) {
  const [selectedProductId, setSelectedProductId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  // Auto-select product when preSelectedProductId changes
  useEffect(() => {
    if (preSelectedProductId && open) {
      setSelectedProductId(preSelectedProductId);
    }
  }, [preSelectedProductId, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedProductId) {
      toast.error("Pilih produk terlebih dahulu");
      return;
    }

    const qty = parseInt(quantity);
    if (!qty || qty <= 0) {
      toast.error("Jumlah produksi harus lebih dari 0");
      return;
    }

    setLoading(true);
    try {
      // @ts-ignore - add_production function will be added after migration
      const { error } = await (supabase as any).rpc("add_production", {
        p_product_id: selectedProductId,
        p_quantity: qty,
        p_notes: notes || null,
      });

      if (error) throw error;

      toast.success("Produksi berhasil ditambahkan dan stok telah diupdate");
      
      // Reset form
      setSelectedProductId("");
      setQuantity("");
      setNotes("");
      
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error adding production:", error);
      toast.error("Gagal menambahkan produksi: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const selectedProduct = products.find(p => p.id === selectedProductId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Factory className="w-5 h-5" />
            Tambah Produksi
          </DialogTitle>
          <DialogDescription>
            Catat produksi baru dan stok akan otomatis bertambah di gudang
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="product">Produk *</Label>
            <Select value={selectedProductId} onValueChange={setSelectedProductId}>
              <SelectTrigger id="product">
                <SelectValue placeholder="Pilih produk yang diproduksi" />
              </SelectTrigger>
              <SelectContent>
                {products.map((product) => (
                  <SelectItem key={product.id} value={product.id}>
                    {product.name} (Stok: {product.stock_in_warehouse})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="quantity">Jumlah Produksi *</Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              placeholder="Masukkan jumlah yang diproduksi"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              required
            />
            {selectedProduct && quantity && parseInt(quantity) > 0 && (
              <p className="text-xs text-muted-foreground">
                Stok akan bertambah: {selectedProduct.stock_in_warehouse} → {selectedProduct.stock_in_warehouse + parseInt(quantity)}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Catatan (Opsional)</Label>
            <Textarea
              id="notes"
              placeholder="Contoh: Produksi batch pagi, kualitas premium, dll"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Batal
            </Button>
            <Button type="submit" disabled={loading}>
              <Factory className="w-4 h-4 mr-2" />
              {loading ? "Menyimpan..." : "Simpan Produksi"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/**
 * REJECT TAB - For damaged/unsellable products
 * Similar to BulkReturnTab but for products that cannot be resold
 * Red theme to distinguish from regular returns
 */

import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { AlertTriangle, PackageX, Trash2 } from "lucide-react";

interface RiderStock {
  product_id: string;
  quantity: number;
  products: {
    id: string;
    name: string;
    categories: {
      name: string;
    } | null;
  };
}

interface RejectTabProps {
  riderStock: RiderStock[];
  pendingRejects: Set<string>;
  onRejectSuccess: () => void;
}

export function RejectTab({ riderStock, pendingRejects, onRejectSuccess }: RejectTabProps) {
  const [selectedProducts, setSelectedProducts] = useState<Map<string, number>>(new Map());
  const [rejectReason, setRejectReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Filter out products with pending rejects
  const availableStock = riderStock.filter(stock => !pendingRejects.has(stock.product_id));

  const handleQuantityChange = (productId: string, value: string) => {
    const numValue = parseInt(value) || 0;
    const product = availableStock.find(s => s.product_id === productId);
    
    if (!product) return;
    
    if (numValue > product.quantity) {
      toast.error(`Maksimal ${product.quantity} pcs`);
      return;
    }

    const newMap = new Map(selectedProducts);
    if (numValue > 0) {
      newMap.set(productId, numValue);
    } else {
      newMap.delete(productId);
    }
    setSelectedProducts(newMap);
  };

  const handleMaxClick = (productId: string) => {
    const product = availableStock.find(s => s.product_id === productId);
    if (!product) return;
    
    const newMap = new Map(selectedProducts);
    newMap.set(productId, product.quantity);
    setSelectedProducts(newMap);
  };

  const handleRemoveProduct = (productId: string) => {
    const newMap = new Map(selectedProducts);
    newMap.delete(productId);
    setSelectedProducts(newMap);
  };

  const handleRejectSubmit = async () => {
    if (selectedProducts.size === 0) {
      toast.error("Pilih produk yang ingin direject");
      return;
    }

    if (!rejectReason.trim()) {
      toast.error("Alasan reject harus diisi (contoh: rusak, kadaluarsa, dll)");
      return;
    }

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Insert rejects for each product
      const rejects = Array.from(selectedProducts.entries()).map(([productId, quantity]) => ({
        rider_id: user.id,
        product_id: productId,
        quantity: quantity,
        notes: rejectReason,
        status: "pending",
        returned_at: new Date().toISOString()
      }));

      const { error } = await supabase
        .from("rejects")
        .insert(rejects);

      if (error) throw error;

      toast.success(
        `Berhasil mengajukan reject ${rejects.length} produk (${rejects.reduce((sum, r) => sum + r.quantity, 0)} pcs)`,
        {
          description: "Menunggu persetujuan admin. Produk rusak tidak akan masuk stok gudang.",
        }
      );

      setSelectedProducts(new Map());
      setRejectReason("");
      onRejectSuccess();
    } catch (error: any) {
      console.error("Error submitting reject:", error);
      toast.error("Gagal mengajukan reject: " + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const totalRejected = Array.from(selectedProducts.values()).reduce((sum, qty) => sum + qty, 0);

  if (availableStock.length === 0) {
    return (
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <PackageX className="w-5 h-5" />
            Reject Produk Rusak
          </CardTitle>
          <CardDescription>
            Laporkan produk yang rusak/kadaluarsa/tidak bisa dijual
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <PackageX className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>Tidak ada produk yang bisa direject</p>
            <p className="text-sm mt-1">
              {pendingRejects.size > 0 
                ? `${pendingRejects.size} produk sedang menunggu persetujuan reject`
                : "Stock Anda kosong"}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-red-200">
      <CardHeader className="bg-red-50">
        <CardTitle className="flex items-center gap-2 text-red-600">
          <PackageX className="w-5 h-5" />
          Reject Produk Rusak
        </CardTitle>
        <CardDescription className="text-red-700">
          <AlertTriangle className="w-4 h-4 inline mr-1" />
          <strong>Penting:</strong> Produk yang direject TIDAK akan kembali ke stok gudang
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 pt-6">
        {/* Product List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-red-600">
              Pilih Produk Rusak/Tidak Layak Jual
            </h3>
            <Badge variant="destructive">
              {selectedProducts.size} produk dipilih
            </Badge>
          </div>

          <div className="max-h-[400px] overflow-y-auto space-y-2 border border-red-100 rounded-lg p-3 bg-red-50/30">
            {availableStock.map((stock) => {
              const selectedQty = selectedProducts.get(stock.product_id) || 0;
              const isSelected = selectedQty > 0;

              return (
                <div
                  key={stock.product_id}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    isSelected
                      ? "border-red-400 bg-red-50"
                      : "border-gray-200 bg-white hover:border-red-200"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">
                        {stock.products.name}
                      </div>
                      <div className="text-xs text-gray-500 flex items-center gap-2 mt-1">
                        <span className="px-2 py-0.5 bg-gray-100 rounded">
                          Stock: {stock.quantity} pcs
                        </span>
                        {stock.products.categories && (
                          <span className="text-gray-400">
                            {stock.products.categories.name}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min="0"
                        max={stock.quantity}
                        value={selectedQty || ""}
                        onChange={(e) => handleQuantityChange(stock.product_id, e.target.value)}
                        placeholder="0"
                        className="w-20 text-center"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleMaxClick(stock.product_id)}
                        className="text-xs"
                      >
                        MAX
                      </Button>
                      {isSelected && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveProduct(stock.product_id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-100"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Reject Reason */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-red-600 flex items-center gap-1">
            <AlertTriangle className="w-4 h-4" />
            Alasan Reject (Wajib)
          </label>
          <Textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Contoh: Kemasan rusak, produk kadaluarsa, tidak layak jual, dll..."
            className="min-h-[100px] border-red-200 focus:border-red-400"
          />
          <p className="text-xs text-red-600">
            * Jelaskan mengapa produk tidak bisa dijual kembali
          </p>
        </div>

        {/* Summary */}
        {selectedProducts.size > 0 && (
          <div className="bg-red-100 border border-red-300 rounded-lg p-4">
            <h4 className="font-semibold text-red-800 mb-2">Summary Reject:</h4>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Total Produk:</span>
                <span className="font-semibold">{selectedProducts.size} jenis</span>
              </div>
              <div className="flex justify-between">
                <span>Total Quantity:</span>
                <span className="font-semibold text-red-600">{totalRejected} pcs</span>
              </div>
            </div>
          </div>
        )}

        {/* Submit Button */}
        <Button
          onClick={handleRejectSubmit}
          disabled={submitting || selectedProducts.size === 0 || !rejectReason.trim()}
          className="w-full bg-red-600 hover:bg-red-700 text-white"
          size="lg"
        >
          <PackageX className="w-4 h-4 mr-2" />
          {submitting ? "Memproses..." : `Ajukan Reject ${totalRejected > 0 ? `(${totalRejected} pcs)` : ""}`}
        </Button>

        {/* Warning Note */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <div className="flex gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-yellow-800">
              <strong>Perhatian:</strong> Produk yang direject <strong>tidak akan masuk ke stok gudang</strong>.
              Gunakan fitur ini hanya untuk produk yang benar-benar rusak atau tidak layak jual.
              Untuk produk yang masih bisa dijual, gunakan fitur <strong>"Return"</strong>.
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

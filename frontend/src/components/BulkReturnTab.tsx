import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Package, Undo2, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface RiderStock {
  product_id: string;
  quantity: number;
  products: {
    name: string;
    price: number;
    image_url: string | null;
    sku: string | null;
  };
}

interface SelectedReturn {
  product_id: string;
  quantity: number;
}

interface BulkReturnTabProps {
  riderStock: RiderStock[];
  pendingReturns: Set<string>;
  onReturnSuccess: () => void;
}

export function BulkReturnTab({ riderStock, pendingReturns, onReturnSuccess }: BulkReturnTabProps) {
  const [selectedProducts, setSelectedProducts] = useState<Map<string, number>>(new Map());
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Filter out products with pending returns
  const availableStock = riderStock.filter(stock => !pendingReturns.has(stock.product_id));

  const toggleProduct = (productId: string, checked: boolean) => {
    const newSelected = new Map(selectedProducts);
    if (checked) {
      newSelected.set(productId, 1); // Default quantity 1
    } else {
      newSelected.delete(productId);
    }
    setSelectedProducts(newSelected);
  };

  const returnAll = (productId: string) => {
    const stock = availableStock.find(s => s.product_id === productId);
    if (!stock) return;
    
    const newSelected = new Map(selectedProducts);
    newSelected.set(productId, stock.quantity);
    setSelectedProducts(newSelected);
    
    toast.success(`Return semua (${stock.quantity} pcs)`, {
      description: stock.products.name,
      duration: 2000,
    });
  };

  const returnAllProducts = () => {
    const newSelected = new Map<string, number>();
    
    availableStock.forEach(stock => {
      newSelected.set(stock.product_id, stock.quantity);
    });
    
    setSelectedProducts(newSelected);
    
    const totalItems = availableStock.length;
    const totalQty = availableStock.reduce((sum, stock) => sum + stock.quantity, 0);
    
    toast.success(`${totalItems} produk terpilih untuk return`, {
      description: `Total ${totalQty} pcs akan dikembalikan`,
      duration: 3000,
    });
  };

  const updateQuantity = (productId: string, quantity: string) => {
    const newSelected = new Map(selectedProducts);
    
    // Allow empty string temporarily (user is typing)
    if (quantity === '') {
      newSelected.set(productId, 0);
      setSelectedProducts(newSelected);
      return;
    }
    
    const qty = parseInt(quantity);
    
    // Check if valid number
    if (isNaN(qty) || qty < 1) {
      toast.error("Jumlah return minimal 1");
      return;
    }

    const stock = availableStock.find(s => s.product_id === productId);
    if (!stock) return;

    if (qty > stock.quantity) {
      toast.error(`Jumlah tidak boleh melebihi stok (${stock.quantity})`);
      return;
    }

    newSelected.set(productId, qty);
    setSelectedProducts(newSelected);
  };

  const handleBulkReturn = async () => {
    if (selectedProducts.size === 0) {
      toast.error("Pilih minimal 1 produk untuk return");
      return;
    }

    // Validate all quantities
    for (const [productId, quantity] of selectedProducts.entries()) {
      if (quantity < 1) {
        toast.error("Jumlah return tidak boleh 0 atau negatif");
        return;
      }
      
      const stock = availableStock.find(s => s.product_id === productId);
      if (!stock || quantity > stock.quantity) {
        toast.error("Ada jumlah return yang tidak valid");
        return;
      }
    }

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Insert multiple returns
      const returns = Array.from(selectedProducts.entries()).map(([productId, quantity]) => ({
        rider_id: user.id,
        product_id: productId,
        quantity,
        notes: notes || null,
      }));

      const { error } = await supabase.from("returns").insert(returns);

      if (error) throw error;

      toast.success(`Berhasil mengajukan ${returns.length} return produk`, {
        description: "Menunggu persetujuan admin",
        duration: 4000,
      });

      // Reset form
      setSelectedProducts(new Map());
      setNotes("");
      
      // Callback to refresh data
      onReturnSuccess();
    } catch (error: any) {
      console.error("Error submitting bulk return:", error);
      toast.error("Gagal mengajukan return: " + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const totalItems = selectedProducts.size;
  const totalQuantity = Array.from(selectedProducts.values()).reduce((sum, qty) => sum + qty, 0);

  if (availableStock.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Package className="w-16 h-16 text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-2">Tidak ada produk yang bisa direturn</p>
          <p className="text-xs text-muted-foreground">
            Semua produk sudah habis atau sedang dalam proses return
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Card */}
      {totalItems > 0 && (
        <Card className="border-primary bg-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-primary" />
              Return Terpilih
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total Produk:</span>
              <Badge variant="secondary">{totalItems} item</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total Quantity:</span>
              <Badge variant="secondary">{totalQuantity} pcs</Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Products Table */}
      <Card>
        <CardHeader>
          <div className="flex items-start sm:items-center justify-between gap-2 flex-col sm:flex-row">
            <div>
              <CardTitle className="text-base sm:text-lg">
                Pilih Produk untuk Return
              </CardTitle>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                Centang produk dan masukkan jumlah yang ingin direturn
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={returnAllProducts}
              disabled={availableStock.length === 0}
              className="w-full sm:w-auto whitespace-nowrap"
            >
              <Package className="w-4 h-4 mr-2" />
              Return Semua Produk
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0 sm:p-6">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8 sm:w-12"></TableHead>
                  <TableHead>Produk</TableHead>
                  <TableHead className="text-right">Stok</TableHead>
                  <TableHead className="text-center sm:text-right w-24 sm:w-32">Jumlah Return</TableHead>
                  <TableHead className="w-20 sm:w-24"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {availableStock.map((stock) => {
                  const isSelected = selectedProducts.has(stock.product_id);
                  const returnQty = selectedProducts.get(stock.product_id) || 1;

                  return (
                    <TableRow key={stock.product_id} className={isSelected ? "bg-primary/5" : ""}>
                      <TableCell className="py-2 sm:py-4">
                        <div 
                          onClick={() => toggleProduct(stock.product_id, !isSelected)}
                          className="cursor-pointer flex items-center justify-center"
                        >
                          {/* Mobile: Circle checkbox */}
                          <div className="sm:hidden">
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                              isSelected 
                                ? 'border-primary bg-primary' 
                                : 'border-muted-foreground/30 bg-background'
                            }`}>
                              {isSelected && (
                                <div className="w-2.5 h-2.5 rounded-full bg-primary-foreground" />
                              )}
                            </div>
                          </div>
                          {/* Desktop: Regular checkbox */}
                          <div className="hidden sm:block">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={(checked) => toggleProduct(stock.product_id, checked as boolean)}
                            />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-2 sm:py-4">
                        <div className="flex items-center gap-2 sm:gap-3">
                          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                            {stock.products.image_url ? (
                              <img
                                src={stock.products.image_url}
                                alt={stock.products.name}
                                className="w-full h-full object-cover rounded-lg"
                              />
                            ) : (
                              <Package className="w-5 h-5 sm:w-6 sm:h-6 text-muted-foreground" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-xs sm:text-sm line-clamp-1">
                              {stock.products.name}
                            </p>
                            {stock.products.sku && (
                              <p className="text-[10px] sm:text-xs text-muted-foreground">
                                SKU: {stock.products.sku}
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right py-2 sm:py-4">
                        <Badge variant="outline" className="text-xs">{stock.quantity}</Badge>
                      </TableCell>
                      <TableCell className="text-center sm:text-right py-2 sm:py-4">
                        {isSelected ? (
                          <Input
                            type="number"
                            min="1"
                            max={stock.quantity}
                            value={returnQty === 0 ? '' : returnQty}
                            onChange={(e) => updateQuantity(stock.product_id, e.target.value)}
                            onFocus={(e) => e.target.select()}
                            className="w-16 sm:w-20 text-center sm:text-right text-sm font-semibold mx-auto sm:ml-auto sm:mr-0"
                            placeholder={stock.quantity.toString()}
                          />
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell className="py-2 sm:py-4">
                        {isSelected && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => returnAll(stock.product_id)}
                            className="h-8 px-2 sm:px-3 text-xs whitespace-nowrap"
                          >
                            Semua
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Notes and Submit */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Catatan (Opsional)
            </label>
            <Textarea
              placeholder="Alasan return, kondisi produk, dll..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              Catatan ini akan ditampilkan untuk semua produk yang direturn
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between pt-4 border-t">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground">
                Return akan diproses setelah disetujui admin. Stok belum dikembalikan ke gudang.
              </p>
            </div>
            <Button
              onClick={handleBulkReturn}
              disabled={totalItems === 0 || submitting}
              className="w-full sm:w-auto"
            >
              <Undo2 className="w-4 h-4 mr-2" />
              {submitting ? "Memproses..." : `Ajukan Return (${totalItems})`}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

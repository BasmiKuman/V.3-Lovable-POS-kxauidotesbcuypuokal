import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { Package, User, Calendar, FileEdit, TrendingUp, TrendingDown } from "lucide-react";

interface ProductChange {
  id: string;
  product_id: string;
  changed_by: string;
  change_type: string;
  field_changed: string | null;
  old_value: string | null;
  new_value: string | null;
  quantity_change: number | null;
  notes: string | null;
  created_at: string;
  products: {
    name: string;
    sku: string | null;
  };
  profiles: {
    full_name: string;
  };
}

export function ProductChangesHistory() {
  const [changes, setChanges] = useState<ProductChange[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>("all");
  const [filterProduct, setFilterProduct] = useState<string>("all");
  const [products, setProducts] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    fetchChanges();
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("id, name")
        .order("name");

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error("Error fetching products:", error);
    }
  };

  const fetchChanges = async () => {
    try {
      setLoading(true);
      // @ts-ignore - product_changes table will be created after migration
      const { data, error } = await supabase
        .from("product_changes")
        .select(`
          *,
          products (name, sku),
          profiles (full_name)
        `)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      // @ts-ignore - type will be correct after migration
      setChanges(data || []);
    } catch (error) {
      console.error("Error fetching product changes:", error);
    } finally {
      setLoading(false);
    }
  };

  const getChangeTypeBadge = (type: string) => {
    switch (type) {
      case "production":
        return <Badge className="bg-green-600">Produksi</Badge>;
      case "manual_adjustment":
        return <Badge className="bg-blue-600">Penyesuaian Manual</Badge>;
      case "info_update":
        return <Badge className="bg-purple-600">Update Info</Badge>;
      default:
        return <Badge>{type}</Badge>;
    }
  };

  const getChangeDescription = (change: ProductChange) => {
    if (change.change_type === "production") {
      return (
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-green-600" />
          <span>Produksi: <strong>+{change.quantity_change} unit</strong></span>
        </div>
      );
    }

    if (change.change_type === "manual_adjustment") {
      const isIncrease = (change.quantity_change || 0) > 0;
      return (
        <div className="flex items-center gap-2">
          {isIncrease ? (
            <TrendingUp className="w-4 h-4 text-green-600" />
          ) : (
            <TrendingDown className="w-4 h-4 text-red-600" />
          )}
          <span>
            Penyesuaian Stok: <strong className={isIncrease ? "text-green-600" : "text-red-600"}>
              {isIncrease ? "+" : ""}{change.quantity_change} unit
            </strong>
          </span>
        </div>
      );
    }

    if (change.change_type === "info_update" && change.field_changed) {
      const fieldLabels: Record<string, string> = {
        name: "Nama",
        sku: "SKU",
        price: "Harga",
        min_stock: "Stok Minimal",
        description: "Deskripsi",
        category: "Kategori",
      };

      return (
        <div>
          <FileEdit className="w-4 h-4 inline mr-2" />
          <span>Update {fieldLabels[change.field_changed] || change.field_changed}:</span>
          <div className="mt-1 text-sm">
            <span className="text-muted-foreground line-through">{change.old_value || "-"}</span>
            {" → "}
            <span className="font-semibold">{change.new_value || "-"}</span>
          </div>
        </div>
      );
    }

    return <span>Perubahan</span>;
  };

  const filteredChanges = changes.filter(change => {
    if (filterType !== "all" && change.change_type !== filterType) return false;
    if (filterProduct !== "all" && change.product_id !== filterProduct) return false;
    return true;
  });

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Memuat riwayat perubahan...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Filter Tipe</label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger>
                  <SelectValue placeholder="Semua Tipe" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Tipe</SelectItem>
                  <SelectItem value="production">Produksi</SelectItem>
                  <SelectItem value="manual_adjustment">Penyesuaian Manual</SelectItem>
                  <SelectItem value="info_update">Update Info</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Filter Produk</label>
              <Select value={filterProduct} onValueChange={setFilterProduct}>
                <SelectTrigger>
                  <SelectValue placeholder="Semua Produk" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Produk</SelectItem>
                  {products.map(product => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Changes List */}
      {filteredChanges.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>Belum ada riwayat perubahan</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredChanges.map((change) => (
            <Card key={change.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="flex-1 space-y-2">
                    {/* Product Name & Type */}
                    <div className="flex items-start gap-2 flex-wrap">
                      <Package className="w-4 h-4 mt-1 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1">
                        <div className="font-semibold">{change.products?.name || "Unknown Product"}</div>
                        {change.products?.sku && (
                          <div className="text-xs text-muted-foreground">SKU: {change.products.sku}</div>
                        )}
                      </div>
                      {getChangeTypeBadge(change.change_type)}
                    </div>

                    {/* Change Description */}
                    <div className="pl-6">
                      {getChangeDescription(change)}
                    </div>

                    {/* Notes */}
                    {change.notes && (
                      <div className="pl-6 text-sm text-muted-foreground">
                        <span className="font-medium">Catatan:</span> {change.notes}
                      </div>
                    )}

                    {/* User & Date */}
                    <div className="pl-6 flex flex-wrap gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        <span>{change.profiles?.full_name || "Unknown"}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>{format(new Date(change.created_at), "dd MMM yyyy HH:mm", { locale: idLocale })}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Package, Calendar, User, FileText } from "lucide-react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";

interface ProductionHistoryItem {
  id: string;
  product_id: string;
  quantity: number;
  notes: string | null;
  produced_at: string;
  products: {
    name: string;
    image_url: string | null;
  };
  profiles: {
    full_name: string;
  };
}

export function ProductionHistory() {
  const [history, setHistory] = useState<ProductionHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = async () => {
    try {
      // @ts-ignore - production_history table will be added after migration
      const { data, error } = await (supabase as any)
        .from("production_history")
        .select(`
          id,
          product_id,
          quantity,
          notes,
          produced_at,
          products (
            name,
            image_url
          ),
          profiles:produced_by (
            full_name
          )
        `)
        .order("produced_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      setHistory(data || []);
    } catch (error: any) {
      console.error("Error fetching production history:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Package className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Package className="w-16 h-16 text-muted-foreground mb-4" />
          <h3 className="font-semibold text-lg mb-2">Belum Ada History Produksi</h3>
          <p className="text-sm text-muted-foreground">
            Klik "Tambah Produksi" untuk mencatat produksi pertama
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Total {history.length} record produksi
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {history.map((item) => (
          <Card key={item.id} className="overflow-hidden hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex gap-3">
                {/* Product Image */}
                <div className="w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
                  {item.products.image_url ? (
                    <img
                      src={item.products.image_url}
                      alt={item.products.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Package className="w-6 h-6 sm:w-8 sm:h-8 text-muted-foreground" />
                  )}
                </div>

                {/* Production Details */}
                <div className="flex-1 min-w-0 space-y-2">
                  <div>
                    <h3 className="font-semibold text-sm sm:text-base line-clamp-1">
                      {item.products.name}
                    </h3>
                    <Badge className="mt-1 text-xs">
                      +{item.quantity} unit
                    </Badge>
                  </div>

                  <div className="space-y-1 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="truncate">
                        {format(new Date(item.produced_at), "dd MMM yyyy, HH:mm", { locale: localeId })}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="truncate">
                        {item.profiles?.full_name || "Unknown"}
                      </span>
                    </div>

                    {item.notes && (
                      <div className="flex items-start gap-1.5 mt-2 pt-2 border-t">
                        <FileText className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-foreground/80 line-clamp-2">
                          {item.notes}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

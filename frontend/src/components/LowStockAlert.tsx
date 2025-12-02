import { AlertTriangle, Package, TrendingDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

interface Product {
  id: string;
  name: string;
  stock_in_warehouse: number;
  min_stock?: number;
  image_url: string | null;
  sku: string | null;
}

interface LowStockAlertProps {
  products: Product[];
  onProductClick?: (product: Product) => void;
}

export function LowStockAlert({ products, onProductClick }: LowStockAlertProps) {
  // Filter products that are at or below minimum stock
  const lowStockProducts = products.filter(
    (p) => p.min_stock && p.stock_in_warehouse <= p.min_stock
  );

  if (lowStockProducts.length === 0) {
    return null;
  }

  // Sort by urgency: lowest stock percentage first
  const sortedProducts = [...lowStockProducts].sort((a, b) => {
    const percentA = (a.stock_in_warehouse / (a.min_stock || 10)) * 100;
    const percentB = (b.stock_in_warehouse / (b.min_stock || 10)) * 100;
    return percentA - percentB;
  });

  // Critical: stock is 0 or less than 50% of minimum
  const criticalCount = sortedProducts.filter(
    (p) => p.stock_in_warehouse === 0 || p.stock_in_warehouse < (p.min_stock || 10) * 0.5
  ).length;

  // Warning: stock is between 50% and 100% of minimum
  const warningCount = sortedProducts.filter(
    (p) => p.stock_in_warehouse >= (p.min_stock || 10) * 0.5 && p.stock_in_warehouse <= (p.min_stock || 10)
  ).length;

  return (
    <Card className="border-orange-200 bg-orange-50/50 dark:bg-orange-950/20 dark:border-orange-900">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <CardTitle className="text-base sm:text-lg text-orange-900 dark:text-orange-100">
                Peringatan Stok Rendah
              </CardTitle>
              <p className="text-xs sm:text-sm text-orange-700 dark:text-orange-300 mt-0.5">
                {sortedProducts.length} produk memerlukan perhatian
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {criticalCount > 0 && (
              <Badge variant="destructive" className="text-xs">
                <TrendingDown className="w-3 h-3 mr-1" />
                {criticalCount} Kritis
              </Badge>
            )}
            {warningCount > 0 && (
              <Badge className="bg-orange-500 hover:bg-orange-600 text-xs">
                {warningCount} Warning
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pb-4">
        <ScrollArea className="w-full">
          <div className="flex gap-3 pb-2">
            {sortedProducts.map((product) => {
              const minStock = product.min_stock || 10;
              const stockPercent = (product.stock_in_warehouse / minStock) * 100;
              const isCritical = product.stock_in_warehouse === 0 || stockPercent < 50;
              
              return (
                <div
                  key={product.id}
                  className="flex-shrink-0 w-[160px] sm:w-[180px]"
                >
                  <Card 
                    className={`overflow-hidden transition-all hover:shadow-md ${
                      isCritical 
                        ? 'border-red-300 bg-red-50/50 dark:bg-red-950/20 dark:border-red-900' 
                        : 'border-orange-200 bg-white dark:bg-gray-900 dark:border-orange-800'
                    } ${onProductClick ? 'cursor-pointer' : ''}`}
                    onClick={() => onProductClick?.(product)}
                  >
                    <CardContent className="p-3 space-y-2">
                      {/* Product Image */}
                      <div className="w-full aspect-square rounded-lg bg-muted flex items-center justify-center overflow-hidden">
                        {product.image_url ? (
                          <img
                            src={product.image_url}
                            alt={product.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Package className="w-8 h-8 text-muted-foreground" />
                        )}
                      </div>

                      {/* Product Info */}
                      <div className="space-y-1.5">
                        <div>
                          <h4 className="font-semibold text-xs leading-tight line-clamp-2">
                            {product.name}
                          </h4>
                          {product.sku && (
                            <p className="text-[10px] text-muted-foreground">
                              SKU: {product.sku}
                            </p>
                          )}
                        </div>

                        {/* Stock Status */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className={isCritical ? 'text-red-700 dark:text-red-400 font-medium' : 'text-orange-700 dark:text-orange-400'}>
                              Stok: {product.stock_in_warehouse}
                            </span>
                            <span className="text-muted-foreground">
                              Min: {minStock}
                            </span>
                          </div>

                          {/* Progress Bar */}
                          <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all ${
                                isCritical
                                  ? 'bg-red-500'
                                  : 'bg-orange-500'
                              }`}
                              style={{ width: `${Math.min(stockPercent, 100)}%` }}
                            />
                          </div>

                          {/* Status Badge */}
                          <Badge
                            variant={isCritical ? 'destructive' : 'secondary'}
                            className="w-full justify-center text-[10px] py-0.5"
                          >
                            {product.stock_in_warehouse === 0
                              ? 'HABIS'
                              : isCritical
                              ? 'SANGAT RENDAH'
                              : 'RENDAH'}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              );
            })}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>

        {/* Action Hint */}
        <p className="text-xs text-muted-foreground mt-3 text-center">
          💡 Klik produk untuk menambah produksi dan mencatat ke history
        </p>
      </CardContent>
    </Card>
  );
}

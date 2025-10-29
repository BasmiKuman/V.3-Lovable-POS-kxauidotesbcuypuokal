import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BottomNav } from "@/components/BottomNav";
import { StatsCard } from "@/components/StatsCard";
import { WeatherWidget } from "@/components/WeatherWidget";
import { useIsMobile } from "@/hooks/use-mobile";
import { Package, TrendingUp, Users, ShoppingCart, Undo2, CheckCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface ReturnRequest {
  id: string;
  quantity: number;
  notes: string | null;
  returned_at: string;
  product_id: string;
  rider_id: string;
  status?: "pending" | "approved" | "rejected";
  products: {
    name: string;
    price: number;
  };
  profiles: {
    full_name: string;
  };
}

export default function Dashboard() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [returns, setReturns] = useState<ReturnRequest[]>([]);
  const [processingReturnId, setProcessingReturnId] = useState<string | null>(null);
  const isMobile = useIsMobile();
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalTransactions: 0,
    totalRevenue: 0,
    activeRiders: 0,
  });

  useEffect(() => {
    const checkRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: roles } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .eq("role", "admin")
          .maybeSingle();
        
        setIsAdmin(!!roles);
      }
    };

    const fetchStats = async () => {
      try {
        // Get total products
        const { count: productsCount } = await supabase
          .from("products")
          .select("*", { count: "exact", head: true });

        // Get total transactions
        const { count: transactionsCount } = await supabase
          .from("transactions")
          .select("*", { count: "exact", head: true });

        // Get total revenue
        const { data: transactions } = await supabase
          .from("transactions")
          .select("total_amount");

        const totalRevenue = transactions?.reduce((sum, t) => sum + Number(t.total_amount), 0) || 0;

        // Get active riders (users with rider role)
        const { count: ridersCount } = await supabase
          .from("user_roles")
          .select("*", { count: "exact", head: true })
          .eq("role", "rider");

        setStats({
          totalProducts: productsCount || 0,
          totalTransactions: transactionsCount || 0,
          totalRevenue,
          activeRiders: ridersCount || 0,
        });
      } catch (error) {
        console.error("Error fetching stats:", error);
      }
    };

    const fetchReturns = async () => {
      try {
        // First get returns with pending status only
        const { data: returnsData, error: returnsError } = await supabase
          .from("returns")
          .select(`
            id,
            quantity,
            notes,
            returned_at,
            product_id,
            rider_id,
            status,
            products (name, price)
          `)
          .eq("status", "pending")
          .order("returned_at", { ascending: false });

        if (returnsError) throw returnsError;

        if (!returnsData || returnsData.length === 0) {
          setReturns([]);
          return;
        }

        // Get rider profiles
        const riderIds = returnsData.map(r => r.rider_id);
        const { data: profilesData, error: profilesError } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", riderIds);

        if (profilesError) throw profilesError;

        // Map profiles to returns
        const returnsWithProfiles = returnsData.map(returnItem => {
          const profile = profilesData?.find(p => p.user_id === returnItem.rider_id);
          return {
            ...returnItem,
            profiles: {
              full_name: profile?.full_name || "N/A"
            }
          };
        });

        setReturns(returnsWithProfiles);
      } catch (error) {
        console.error("Error fetching returns:", error);
      }
    };

    checkRole();
    fetchStats();
    fetchReturns();
  }, []);

  const handleApproveReturn = async (returnItem: ReturnRequest) => {
    setProcessingReturnId(returnItem.id);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Update warehouse stock (add returned quantity)
      const { data: product } = await supabase
        .from("products")
        .select("stock_in_warehouse")
        .eq("id", returnItem.product_id)
        .single();

      if (!product) throw new Error("Product not found");

      const { error: updateProductError } = await supabase
        .from("products")
        .update({
          stock_in_warehouse: product.stock_in_warehouse + returnItem.quantity,
        })
        .eq("id", returnItem.product_id);

      if (updateProductError) throw updateProductError;

      // Update rider stock (deduct returned quantity)
      const { data: riderStock } = await supabase
        .from("rider_stock")
        .select("quantity")
        .eq("rider_id", returnItem.rider_id)
        .eq("product_id", returnItem.product_id)
        .single();

      if (riderStock) {
        const newQuantity = riderStock.quantity - returnItem.quantity;
        if (newQuantity > 0) {
          const { error: updateStockError } = await supabase
            .from("rider_stock")
            .update({ quantity: newQuantity })
            .eq("rider_id", returnItem.rider_id)
            .eq("product_id", returnItem.product_id);

          if (updateStockError) throw updateStockError;
        } else {
          const { error: deleteStockError } = await supabase
            .from("rider_stock")
            .delete()
            .eq("rider_id", returnItem.rider_id)
            .eq("product_id", returnItem.product_id);

          if (deleteStockError) throw deleteStockError;
        }
      }

      // Save to return history before deleting
      const { error: historyError } = await supabase
        .from("return_history")
        .insert({
          product_id: returnItem.product_id,
          rider_id: returnItem.rider_id,
          quantity: returnItem.quantity,
          notes: returnItem.notes,
          returned_at: returnItem.returned_at,
          approved_by: user.id,
          status: "approved"
        });

      if (historyError) throw historyError;

      // Update return status to approved instead of deleting
      const { error: updateReturnError } = await supabase
        .from("returns")
        .update({ status: "approved" })
        .eq("id", returnItem.id);

      if (updateReturnError) throw updateReturnError;

      toast.success("Return berhasil disetujui");

      // Refresh returns list
      setReturns(prev => prev.filter(r => r.id !== returnItem.id));
    } catch (error: any) {
      toast.error("Gagal menyetujui return: " + error.message);
      console.error(error);
    } finally {
      setProcessingReturnId(null);
    }
  };

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
      <div className="max-w-screen-xl mx-auto px-3 sm:px-4 space-y-3 sm:space-y-5">
        {/* Header with Logo and Weather */}
        <div className="flex items-start justify-between gap-3 pb-3 border-b">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <img 
              src="/images/logo.png" 
              alt="BK Logo" 
              className="w-10 h-10 sm:w-12 sm:h-12 flex-shrink-0"
            />
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
                Dashboard
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground truncate">BK POS System - Ringkasan Sistem</p>
            </div>
          </div>
          <div className="hidden md:block flex-shrink-0">
            <WeatherWidget />
          </div>
        </div>

        {/* Weather Widget Mobile - Full Width */}
        <div className="md:hidden">
          <WeatherWidget />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
          <StatsCard
            title="Total Produk"
            value={stats.totalProducts}
            icon={Package}
            className="animate-fade-in"
            variant="primary"
          />
          <StatsCard
            title="Transaksi"
            value={stats.totalTransactions}
            icon={ShoppingCart}
            className="animate-fade-in"
            variant="secondary"
          />
          <StatsCard
            title="Pendapatan"
            value={`Rp ${stats.totalRevenue.toLocaleString("id-ID")}`}
            icon={TrendingUp}
            className="animate-fade-in"
            variant="accent"
          />
          <StatsCard
            title="Rider Aktif"
            value={stats.activeRiders}
            icon={Users}
            className="animate-fade-in"
            variant="default"
          />
        </div>

        {/* Return Requests for Admin */}
        {isAdmin && returns.length > 0 && (
          <Card className="animate-fade-in">
            <CardHeader className="p-3 sm:p-4 pb-2 sm:pb-3">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <div className="p-1.5 rounded-lg bg-primary/10">
                  <Undo2 className="w-4 h-4 text-primary" />
                </div>
                Permintaan Return
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">Kelola return dari rider</CardDescription>
            </CardHeader>
            <CardContent className="p-3 sm:p-4">
              {isMobile ? (
                /* Mobile: Card List */
                <div className="space-y-3">
                  {returns.map((returnItem) => (
                    <Card key={returnItem.id} className="border-2">
                      <CardContent className="p-3 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <Users className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                              <span className="font-semibold text-sm truncate">
                                {(returnItem.profiles as any)?.full_name || "N/A"}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <Package className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                              <span className="text-xs text-muted-foreground truncate">
                                {returnItem.products.name}
                              </span>
                            </div>
                          </div>
                          <Badge variant="secondary" className="flex-shrink-0">
                            {returnItem.quantity} pcs
                          </Badge>
                        </div>
                        
                        {returnItem.notes && (
                          <div className="flex items-start gap-2 p-2 bg-muted/50 rounded">
                            <span className="text-xs text-muted-foreground">💬</span>
                            <p className="text-xs text-muted-foreground flex-1">
                              {returnItem.notes}
                            </p>
                          </div>
                        )}
                        
                        <div className="flex items-center justify-between pt-2 border-t">
                          <span className="text-xs text-muted-foreground">
                            {new Date(returnItem.returned_at).toLocaleDateString("id-ID", {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </span>
                          {returnItem.status === "pending" ? (
                            <Button
                              size="sm"
                              onClick={() => handleApproveReturn(returnItem)}
                              disabled={processingReturnId === returnItem.id}
                              className="h-8 text-xs"
                            >
                              <CheckCircle className="w-3 h-3 mr-1" />
                              {processingReturnId === returnItem.id ? "Proses..." : "Setujui"}
                            </Button>
                          ) : (
                            <Badge variant="secondary" className="text-xs">
                              ✓ Approved
                            </Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                /* Desktop: Table */
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Rider</TableHead>
                        <TableHead>Produk</TableHead>
                        <TableHead>Jumlah</TableHead>
                        <TableHead>Catatan</TableHead>
                        <TableHead>Tanggal</TableHead>
                        <TableHead className="text-right">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {returns.map((returnItem) => (
                        <TableRow key={returnItem.id}>
                          <TableCell className="font-medium">
                            {(returnItem.profiles as any)?.full_name || "N/A"}
                          </TableCell>
                          <TableCell>{returnItem.products.name}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">{returnItem.quantity}</Badge>
                          </TableCell>
                          <TableCell className="max-w-xs truncate">
                            {returnItem.notes || "-"}
                          </TableCell>
                          <TableCell>
                            {new Date(returnItem.returned_at).toLocaleDateString("id-ID")}
                          </TableCell>
                          <TableCell className="text-right">
                            {returnItem.status === "pending" ? (
                              <Button
                                size="sm"
                                onClick={() => handleApproveReturn(returnItem)}
                                disabled={processingReturnId === returnItem.id}
                              >
                                <CheckCircle className="w-4 h-4 mr-1" />
                                {processingReturnId === returnItem.id ? "Memproses..." : "Setujui"}
                              </Button>
                            ) : (
                              <Badge variant="secondary">Approved</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Recent Activity */}
        <Card className="animate-fade-in">
          <CardHeader className="p-3 sm:p-4 pb-2 sm:pb-3">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <div className="p-1.5 rounded-lg bg-accent/10">
                <TrendingUp className="w-4 h-4 text-accent" />
              </div>
              Aktivitas Terbaru
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">Transaksi dan distribusi</CardDescription>
          </CardHeader>
          <CardContent className="p-3 sm:p-4">
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-xs sm:text-sm">Fitur segera tersedia</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <BottomNav isAdmin={isAdmin} />
    </div>
  );
}

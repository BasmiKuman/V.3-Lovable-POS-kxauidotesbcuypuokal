import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, TrendingUp, Package, DollarSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { BottomNav } from "@/components/BottomNav";
import { StatsCard } from "@/components/StatsCard";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";

export default function RiderReports() {
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [dateRange, setDateRange] = useState({
    start: startOfMonth(new Date()),
    end: endOfMonth(new Date())
  });

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);
    };
    fetchUser();
  }, []);

  // Fetch transactions in date range
  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ["rider-transactions", currentUserId, dateRange],
    queryFn: async () => {
      if (!currentUserId) return [];
      
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("rider_id", currentUserId)
        .gte("created_at", dateRange.start.toISOString())
        .lte("created_at", dateRange.end.toISOString())
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!currentUserId,
  });

  // Fetch transaction items for stats (with categories)
  const { data: items = [] } = useQuery({
    queryKey: ["rider-transaction-items", currentUserId, dateRange],
    queryFn: async () => {
      if (!currentUserId || transactions.length === 0) return [];
      
      const transactionIds = transactions.map(t => t.id);
      const { data } = await supabase
        .from("transaction_items")
        .select("*, products(name, sku, category_id, categories(name))")
        .in("transaction_id", transactionIds);

      return data || [];
    },
    enabled: !!currentUserId && transactions.length > 0,
  });

  // Calculate stats (EXCLUDE Add-On category)
  const totalCups = items.reduce((sum, item) => {
    const categoryName = (item.products as any)?.categories?.name?.toLowerCase() || '';
    const isAddOn = categoryName === 'add on' || categoryName === 'addon' || categoryName === 'add-on';
    return isAddOn ? sum : sum + item.quantity;
  }, 0);
  
  const totalTransactions = transactions.length;
  
  // Top products (EXCLUDE Add-On)
  const productStats = items.reduce((acc, item) => {
    const categoryName = (item.products as any)?.categories?.name?.toLowerCase() || '';
    const isAddOn = categoryName === 'add on' || categoryName === 'addon' || categoryName === 'add-on';
    
    // Skip Add-On products
    if (isAddOn) return acc;
    
    const productId = item.product_id;
    const productName = (item.products as any)?.name || "Unknown";
    
    if (!acc[productId]) {
      acc[productId] = { name: productName, quantity: 0 };
    }
    acc[productId].quantity += item.quantity;
    return acc;
  }, {} as Record<string, { name: string; quantity: number }>);

  const topProducts = Object.values(productStats)
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5);

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
      <div className="max-w-screen-xl mx-auto px-3 sm:px-4 space-y-3 sm:space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gradient">Laporan Saya</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">Riwayat penjualan Anda</p>
          </div>

          {/* Date Filter */}
          <div className="flex gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="text-xs">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(dateRange.start, "dd MMM", { locale: idLocale })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="single"
                  selected={dateRange.start}
                  onSelect={(date) => date && setDateRange(prev => ({ ...prev, start: date }))}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            <span className="flex items-center text-muted-foreground">-</span>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="text-xs">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(dateRange.end, "dd MMM", { locale: idLocale })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="single"
                  selected={dateRange.end}
                  onSelect={(date) => date && setDateRange(prev => ({ ...prev, end: date }))}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-2 sm:gap-4">
          <StatsCard
            title="Total Cup"
            value={`${totalCups} cup`}
            icon={Package}
            className="animate-fade-in"
            variant="primary"
          />
          <StatsCard
            title="Total Transaksi"
            value={totalTransactions}
            icon={TrendingUp}
            className="animate-fade-in"
            variant="secondary"
          />
        </div>

        {/* Top Products Chart */}
        <Card className="animate-fade-in">
          <CardHeader className="p-3 sm:p-4 pb-2 sm:pb-3">
            <CardTitle className="text-base sm:text-lg">Top 5 Produk Terlaris</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Produk yang paling banyak Anda jual</CardDescription>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            {topProducts.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground text-sm">
                Belum ada data penjualan dalam periode ini
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={topProducts}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" style={{ fontSize: '10px' }} angle={-45} textAnchor="end" height={80} />
                  <YAxis style={{ fontSize: '12px' }} />
                  <Tooltip />
                  <Bar dataKey="quantity" fill="#8b5cf6" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <Card className="animate-fade-in">
          <CardHeader className="p-3 sm:p-4 pb-2 sm:pb-3">
            <CardTitle className="text-base sm:text-lg">Riwayat Transaksi</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Transaksi terbaru Anda</CardDescription>
          </CardHeader>
          <CardContent className="p-3 sm:p-4">
            {isLoading ? (
              <p className="text-center py-8 text-muted-foreground text-sm">Memuat...</p>
            ) : transactions.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground text-sm">
                Belum ada transaksi dalam periode ini
              </p>
            ) : (
              <div className="overflow-x-auto -mx-3 sm:-mx-4">
                <div className="inline-block min-w-full align-middle">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Tanggal</TableHead>
                        <TableHead className="text-xs">Total</TableHead>
                        <TableHead className="text-xs text-right">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactions.slice(0, 10).map((transaction) => (
                        <TableRow key={transaction.id}>
                          <TableCell className="text-xs">
                            {format(new Date(transaction.created_at), "dd MMM yyyy, HH:mm", { locale: idLocale })}
                          </TableCell>
                          <TableCell className="text-xs font-medium">
                            Rp {transaction.total_amount.toLocaleString("id-ID")}
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge variant="outline" className="text-xs">
                              Selesai
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <BottomNav isAdmin={false} />
    </div>
  );
}

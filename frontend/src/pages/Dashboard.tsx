import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { BottomNav } from "@/components/BottomNav";
import { StatsCard } from "@/components/StatsCard";
import { WeatherWidget } from "@/components/WeatherWidget";
import RiderTrackingMap from "@/components/RiderTrackingMap";
import { ReturnsAccordion } from "@/components/ReturnsAccordion";
import { RejectsAccordion } from "@/components/RejectsAccordion";
import { LeaderboardCard } from "@/components/LeaderboardCard";
import { ThemeToggle } from "@/components/ThemeToggle";
import { EnhancedCard } from "@/components/EnhancedCard";
import { NotificationBadge } from "@/components/NotificationBadge";
import { useIsMobile } from "@/hooks/use-mobile";
import { Package, TrendingUp, Users, ShoppingCart, Undo2, RefreshCw, Sparkles, Clock, AlertTriangle, Box, PackageX } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { startOfMonth, endOfMonth, formatDistanceToNow } from "date-fns";
import { id as idLocale } from "date-fns/locale";

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

interface RejectRequest {
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
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [returns, setReturns] = useState<ReturnRequest[]>([]);
  const [rejects, setRejects] = useState<RejectRequest[]>([]);
  const [processingReturnId, setProcessingReturnId] = useState<string | null>(null);
  const [processingRejectId, setProcessingRejectId] = useState<string | null>(null);
  const [removingReturnIds, setRemovingReturnIds] = useState<Set<string>>(new Set());
  const [removingRejectIds, setRemovingRejectIds] = useState<Set<string>>(new Set());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const isMobile = useIsMobile();
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalTransactions: 0,
    totalRevenue: 0,
    activeRiders: 0,
  });
  const [recentActivities, setRecentActivities] = useState<any[]>([]);

  useEffect(() => {
    const checkRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: roles } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .in("role", ["admin", "super_admin"])
          .maybeSingle();
        
        setIsAdmin(!!roles);
      }
    };

    const fetchStats = async () => {
      try {
        const now = new Date();
        const monthStart = startOfMonth(now);
        const monthEnd = endOfMonth(now);

        // Get total products (all time - this doesn't reset monthly)
        const { count: productsCount } = await supabase
          .from("products")
          .select("*", { count: "exact", head: true });

        // Get total transactions - CURRENT MONTH ONLY
        const { count: transactionsCount } = await supabase
          .from("transactions")
          .select("*", { count: "exact", head: true })
          .gte("created_at", monthStart.toISOString())
          .lte("created_at", monthEnd.toISOString());

        // Get total revenue - CURRENT MONTH ONLY
        const { data: transactions } = await supabase
          .from("transactions")
          .select("total_amount")
          .gte("created_at", monthStart.toISOString())
          .lte("created_at", monthEnd.toISOString());

        const totalRevenue = transactions?.reduce((sum, t) => sum + Number(t.total_amount), 0) || 0;

        // Get active riders - CURRENT MONTH ONLY (riders who made transactions this month)
        const { data: transactionsWithRiders } = await supabase
          .from("transactions")
          .select("rider_id")
          .gte("created_at", monthStart.toISOString())
          .lte("created_at", monthEnd.toISOString());

        // Count unique riders who have transactions this month
        const uniqueRiders = new Set(transactionsWithRiders?.map(t => t.rider_id).filter(Boolean));

        setStats({
          totalProducts: productsCount || 0,
          totalTransactions: transactionsCount || 0,
          totalRevenue,
          activeRiders: uniqueRiders.size,
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

    const fetchRejects = async () => {
      try {
        // First get rejects with pending status only
        const { data: rejectsData, error: rejectsError } = await supabase
          .from("rejects" as any)
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

        if (rejectsError) throw rejectsError;

        if (!rejectsData || rejectsData.length === 0) {
          setRejects([]);
          return;
        }

        // Get rider profiles
        const riderIds = rejectsData.map(r => r.rider_id);
        const { data: profilesData, error: profilesError } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", riderIds);

        if (profilesError) throw profilesError;

        // Map profiles to rejects
        const rejectsWithProfiles = rejectsData.map(rejectItem => {
          const profile = profilesData?.find(p => p.user_id === rejectItem.rider_id);
          return {
            ...rejectItem,
            profiles: {
              full_name: profile?.full_name || "N/A"
            }
          };
        });

        setRejects(rejectsWithProfiles);
      } catch (error) {
        console.error("Error fetching rejects:", error);
      }
    };

    const fetchRecentActivities = async () => {
      try {
        const activities: any[] = [];

        // Get recent transactions (last 5) with rider info
        const { data: recentTransactions, error: transError } = await supabase
          .from("transactions")
          .select(`
            id,
            total_amount,
            created_at,
            rider_id
          `)
          .order("created_at", { ascending: false })
          .limit(5);

        if (transError) {
          console.error("Error fetching transactions:", transError);
        }

        if (recentTransactions) {
          // Get rider profiles separately
          const riderIds = recentTransactions.map(t => t.rider_id);
          const { data: riderProfiles } = await supabase
            .from("profiles")
            .select("user_id, full_name, avatar_url")
            .in("user_id", riderIds);

          recentTransactions.forEach(t => {
            const rider = riderProfiles?.find(p => p.user_id === t.rider_id);
            activities.push({
              type: 'transaction',
              icon: ShoppingCart,
              title: 'Transaksi Baru',
              description: `${rider?.full_name || 'Rider'} - Rp ${t.total_amount.toLocaleString('id-ID')}`,
              time: t.created_at,
              color: 'secondary'
            });
          });
        }

        // Get recent returns (last 3) with product and rider info
      const { data: recentReturns, error: returnsError } = await supabase
          .from("returns")
          .select(`
            id,
            quantity,
            returned_at,
            status,
            rider_id,
            product_id
          `)
          .order("returned_at", { ascending: false })
          .limit(3);

        if (returnsError) {
          console.error("Error fetching returns:", returnsError);
        }

        if (recentReturns) {
          // Get products and riders separately
          const productIds = recentReturns.map(r => r.product_id);
          const riderIds = recentReturns.map(r => r.rider_id);

          const { data: products } = await supabase
            .from("products")
            .select("id, name")
            .in("id", productIds);

          const { data: riders } = await supabase
            .from("profiles")
            .select("user_id, full_name")
            .in("user_id", riderIds);

          recentReturns.forEach(r => {
            const product = products?.find(p => p.id === r.product_id);
            const rider = riders?.find(p => p.user_id === r.rider_id);
            activities.push({
              type: 'return',
              icon: Undo2,
              title: 'Permintaan Return',
              description: `${rider?.full_name || 'Rider'} - ${product?.name || 'Produk'} (${r.quantity} pcs)`,
              time: r.returned_at,
              color: 'accent',
              status: r.status
            });
          });
        }

        if (recentReturns) {
          // Get products and riders separately
          const productIds = recentReturns.map(r => r.product_id);
          const riderIds = recentReturns.map(r => r.rider_id);

          const { data: products } = await supabase
            .from("products")
            .select("id, name")
            .in("id", productIds);

          const { data: riders } = await supabase
            .from("profiles")
            .select("user_id, full_name")
            .in("user_id", riderIds);

          recentReturns.forEach(r => {
            const product = products?.find(p => p.id === r.product_id);
            const rider = riders?.find(p => p.user_id === r.rider_id);
            activities.push({
              type: 'return',
              icon: Undo2,
              title: 'Permintaan Return',
              description: `${rider?.full_name || 'Rider'} - ${product?.name || 'Produk'} (${r.quantity} pcs)`,
              time: r.returned_at,
              color: 'accent',
              status: r.status
            });
          });
        }

        // Get low stock products (stock < 10)
        const { data: lowStockProducts } = await supabase
          .from("products")
          .select("id, name, stock_in_warehouse")
          .lt("stock_in_warehouse", 10)
          .order("stock_in_warehouse", { ascending: true })
          .limit(3);

        if (lowStockProducts) {
          lowStockProducts.forEach(p => {
            activities.push({
              type: 'low_stock',
              icon: AlertTriangle,
              title: 'Stok Menipis',
              description: `${p.name} - Sisa ${p.stock_in_warehouse} pcs`,
              time: new Date().toISOString(),
              color: 'destructive'
            });
          });
        }

        // Sort all activities by time
        activities.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
        
        setRecentActivities(activities.slice(0, 8)); // Show max 8 activities
      } catch (error) {
        console.error("Error fetching recent activities:", error);
      }
    };

    checkRole();
    fetchStats();
    fetchReturns();
    fetchRejects();
    fetchRecentActivities();
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

      // Update rider stock: deduct the returned quantity
      const { data: riderStock, error: riderStockError } = await supabase
        .from("rider_stock")
        .select("quantity")
        .eq("rider_id", returnItem.rider_id)
        .eq("product_id", returnItem.product_id)
        .maybeSingle();

      console.log(`📦 Return Processing - Product: ${returnItem.products.name}`);
      console.log(`   Rider Stock Before: ${riderStock?.quantity || 0} pcs`);
      console.log(`   Return Quantity: ${returnItem.quantity} pcs`);
      console.log(`   Expected Stock After: ${(riderStock?.quantity || 0) - returnItem.quantity} pcs`);

      if (riderStockError) {
        console.error("Error fetching rider stock:", riderStockError);
        throw new Error(`Gagal mengambil data stock rider: ${riderStockError.message}`);
      }

      if (riderStock) {
        const newQuantity = riderStock.quantity - returnItem.quantity;
        
        if (newQuantity > 0) {
          // Update stock if there's remaining quantity
          const { error: updateStockError } = await supabase
            .from("rider_stock")
            .update({ quantity: newQuantity })
            .eq("rider_id", returnItem.rider_id)
            .eq("product_id", returnItem.product_id);

          if (updateStockError) throw updateStockError;
        } else if (newQuantity === 0) {
          // Delete stock if quantity becomes 0
          const { error: deleteStockError } = await supabase
            .from("rider_stock")
            .delete()
            .eq("rider_id", returnItem.rider_id)
            .eq("product_id", returnItem.product_id);

          if (deleteStockError) throw deleteStockError;
        } else {
          // newQuantity < 0: Return quantity exceeds rider stock
          throw new Error(
            `Quantity return (${returnItem.quantity}) melebihi stock rider (${riderStock.quantity}). ` +
            `Return dibatalkan untuk mencegah stock negatif.`
          );
        }
      } else {
        // No rider stock found - could be:
        // 1. Return already processed
        // 2. Stock sold out via transactions
        // 3. Data desync
        // 
        // Decision: Accept the return anyway and add to warehouse
        // This prevents blocking legitimate returns due to data issues
        console.log(
          `ℹ️ Rider stock not found for product ${returnItem.product_id}. ` +
          `Accepting return and adding to warehouse (stock may have been sold or returned previously).`
        );
        // Continue to save history and delete return record below
      }

      // Save to return history
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

      // Delete from returns table
      const { error: deleteReturnError } = await supabase
        .from("returns")
        .delete()
        .eq("id", returnItem.id);

      if (deleteReturnError) throw deleteReturnError;

      toast.success("Return berhasil disetujui");

      // Add smooth removal animation
      setRemovingReturnIds(prev => new Set(prev).add(returnItem.id));
      
      // Wait for fade-out animation before removing from list
      setTimeout(() => {
        setReturns(prev => prev.filter(r => r.id !== returnItem.id));
        setRemovingReturnIds(prev => {
          const next = new Set(prev);
          next.delete(returnItem.id);
          return next;
        });
      }, 300); // Match CSS transition duration
    } catch (error: any) {
      toast.error("Gagal menyetujui return: " + error.message);
      console.error(error);
    } finally {
      setProcessingReturnId(null);
    }
  };

  const handleRejectReturn = async (returnItem: ReturnRequest) => {
    setProcessingReturnId(returnItem.id);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Save to return history with rejected status
      const { error: historyError } = await supabase
        .from("return_history")
        .insert({
          product_id: returnItem.product_id,
          rider_id: returnItem.rider_id,
          quantity: returnItem.quantity,
          notes: returnItem.notes,
          returned_at: returnItem.returned_at,
          approved_by: user.id,
          status: "rejected"
        });

      if (historyError) throw historyError;

      // Delete from returns table (rejected, not processed)
      const { error: deleteReturnError } = await supabase
        .from("returns")
        .delete()
        .eq("id", returnItem.id);

      if (deleteReturnError) throw deleteReturnError;

      toast.success("Return ditolak");

      // Refresh returns list
      setReturns(prev => prev.filter(r => r.id !== returnItem.id));
    } catch (error: any) {
      toast.error("Gagal menolak return: " + error.message);
      console.error(error);
    } finally {
      setProcessingReturnId(null);
    }
  };

  const handleApproveReject = async (rejectItem: RejectRequest) => {
    setProcessingRejectId(rejectItem.id);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // IMPORTANT: For REJECT, we do NOT add back to warehouse stock
      // Only reduce from rider stock

      // 1. Get current rider stock
      const { data: currentStock, error: fetchError } = await supabase
        .from("rider_stock")
        .select("quantity")
        .eq("rider_id", rejectItem.rider_id)
        .eq("product_id", rejectItem.product_id)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (currentStock && currentStock.quantity >= rejectItem.quantity) {
        // Reduce from rider_stock
        const newQuantity = currentStock.quantity - rejectItem.quantity;
        
        if (newQuantity > 0) {
          const { error: updateError } = await supabase
            .from("rider_stock")
            .update({ quantity: newQuantity })
            .eq("rider_id", rejectItem.rider_id)
            .eq("product_id", rejectItem.product_id);

          if (updateError) throw updateError;
        } else {
          // Delete rider_stock row if quantity becomes 0
          const { error: deleteError } = await supabase
            .from("rider_stock")
            .delete()
            .eq("rider_id", rejectItem.rider_id)
            .eq("product_id", rejectItem.product_id);

          if (deleteError) throw deleteError;
        }
      } else {
        console.log(
          `ℹ️ Rider stock not found or insufficient for product ${rejectItem.product_id}. ` +
          `This is normal if stock was already sold. Continuing with reject approval.`
        );
      }

      // 2. Save to reject_history (NOT warehouse stock)
      const { error: historyError } = await supabase
        .from("reject_history" as any)
        .insert({
          product_id: rejectItem.product_id,
          rider_id: rejectItem.rider_id,
          quantity: rejectItem.quantity,
          notes: rejectItem.notes,
          returned_at: rejectItem.returned_at,
          approved_by: user.id,
          status: "approved"
        });

      if (historyError) throw historyError;

      // 3. Delete from rejects table
      const { error: deleteRejectError } = await supabase
        .from("rejects" as any)
        .delete()
        .eq("id", rejectItem.id);

      if (deleteRejectError) throw deleteRejectError;

      toast.success("Reject berhasil dikonfirmasi (produk rusak tidak masuk gudang)");

      // Add smooth removal animation
      setRemovingRejectIds(prev => new Set(prev).add(rejectItem.id));
      
      // Wait for fade-out animation before removing from list
      setTimeout(() => {
        setRejects(prev => prev.filter(r => r.id !== rejectItem.id));
        setRemovingRejectIds(prev => {
          const next = new Set(prev);
          next.delete(rejectItem.id);
          return next;
        });
      }, 300); // Match CSS transition duration
    } catch (error: any) {
      toast.error("Gagal menyetujui reject: " + error.message);
      console.error(error);
    } finally {
      setProcessingRejectId(null);
    }
  };

  const handleRejectReject = async (rejectItem: RejectRequest) => {
    setProcessingRejectId(rejectItem.id);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Save to reject history with rejected status
      const { error: historyError } = await supabase
        .from("reject_history" as any)
        .insert({
          product_id: rejectItem.product_id,
          rider_id: rejectItem.rider_id,
          quantity: rejectItem.quantity,
          notes: rejectItem.notes,
          returned_at: rejectItem.returned_at,
          approved_by: user.id,
          status: "rejected"
        });

      if (historyError) throw historyError;

      // Delete from rejects table (rejected by admin)
      const { error: deleteRejectError } = await supabase
        .from("rejects" as any)
        .delete()
        .eq("id", rejectItem.id);

      if (deleteRejectError) throw deleteRejectError;

      toast.success("Reject ditolak");

      // Refresh rejects list
      setRejects(prev => prev.filter(r => r.id !== rejectItem.id));
    } catch (error: any) {
      toast.error("Gagal menolak reject: " + error.message);
      console.error(error);
    } finally {
      setProcessingRejectId(null);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const now = new Date();
      const monthStart = startOfMonth(now);
      const monthEnd = endOfMonth(now);

      // Fetch stats
      const { count: productsCount } = await supabase
        .from("products")
        .select("*", { count: "exact", head: true });

      // Get total transactions - CURRENT MONTH ONLY
      const { count: transactionsCount } = await supabase
        .from("transactions")
        .select("*", { count: "exact", head: true })
        .gte("created_at", monthStart.toISOString())
        .lte("created_at", monthEnd.toISOString());

      // Get total revenue - CURRENT MONTH ONLY
      const { data: transactions } = await supabase
        .from("transactions")
        .select("total_amount")
        .gte("created_at", monthStart.toISOString())
        .lte("created_at", monthEnd.toISOString());

      const totalRevenue = transactions?.reduce((sum, t) => sum + Number(t.total_amount), 0) || 0;

      // Get active riders - CURRENT MONTH ONLY (riders who made transactions this month)
      const { data: transactionsWithRiders } = await supabase
        .from("transactions")
        .select("rider_id")
        .gte("created_at", monthStart.toISOString())
        .lte("created_at", monthEnd.toISOString());

      // Count unique riders who have transactions this month
      const uniqueRiders = new Set(transactionsWithRiders?.map(t => t.rider_id).filter(Boolean));

      setStats({
        totalProducts: productsCount || 0,
        totalTransactions: transactionsCount || 0,
        totalRevenue,
        activeRiders: uniqueRiders.size,
      });

      // Fetch returns if admin
      if (isAdmin) {
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
        } else {
          const riderIds = returnsData.map(r => r.rider_id);
          const { data: profilesData, error: profilesError } = await supabase
            .from("profiles")
            .select("user_id, full_name")
            .in("user_id", riderIds);

          if (profilesError) throw profilesError;

          const profilesMap = new Map(profilesData?.map(p => [p.user_id, p.full_name]) || []);

          const enrichedReturns = returnsData.map(returnItem => ({
            ...returnItem,
            profiles: {
              full_name: profilesMap.get(returnItem.rider_id) || "Unknown",
            },
          }));

          setReturns(enrichedReturns);
        }

        // Fetch rejects if admin
        const { data: rejectsData, error: rejectsError } = await supabase
          .from("rejects" as any)
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

        if (rejectsError) throw rejectsError;

        if (!rejectsData || rejectsData.length === 0) {
          setRejects([]);
        } else {
          const rejectRiderIds = (rejectsData as any[]).map((r: any) => r.rider_id);
          const { data: rejectProfilesData, error: rejectProfilesError } = await supabase
            .from("profiles")
            .select("user_id, full_name")
            .in("user_id", rejectRiderIds);

          if (rejectProfilesError) throw rejectProfilesError;

          const rejectProfilesMap = new Map(rejectProfilesData?.map(p => [p.user_id, p.full_name]) || []);

          const enrichedRejects = (rejectsData as any[]).map((rejectItem: any) => ({
            ...rejectItem,
            profiles: {
              full_name: rejectProfilesMap.get(rejectItem.rider_id) || "Unknown",
            },
          }));

          setRejects(enrichedRejects);
        }
      }

      // Force re-render of WeatherWidget and RiderTrackingMap
      setRefreshKey(prev => prev + 1);
      
      toast.success("Dashboard diperbarui");
    } catch (error) {
      console.error("Error refreshing dashboard:", error);
      toast.error("Gagal memperbarui dashboard");
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div 
      className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-background w-full overflow-x-hidden relative"
      style={{
        paddingTop: 'max(1rem, env(safe-area-inset-top, 0px))',
        paddingBottom: 'calc(5rem + env(safe-area-inset-bottom, 0px))',
        paddingLeft: 'env(safe-area-inset-left, 0px)',
        paddingRight: 'env(safe-area-inset-right, 0px)',
      }}
    >
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-secondary/10 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: "1s" }} />
      </div>

      <div className="max-w-screen-xl mx-auto px-3 sm:px-4 space-y-4 sm:space-y-6 relative z-10">
        {/* Enhanced Header with Logo, Title, and Actions */}
        <div className="glass rounded-2xl p-4 sm:p-5 border border-border/50 shadow-xl animate-fade-in-down">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
              {/* Logo with glow effect */}
              <div className="relative group">
                <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full group-hover:bg-primary/30 transition-all duration-300" />
                <img 
                  src="/images/logo.png" 
                  alt="BK Logo" 
                  className="relative w-12 h-12 sm:w-14 sm:h-14 flex-shrink-0 drop-shadow-2xl group-hover:scale-110 transition-transform duration-300"
                />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gradient-multi">
                    Dashboard Admin
                  </h1>
                  <Sparkles className="w-5 h-5 text-accent animate-pulse-slow" />
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground truncate">
                  BK POS System - Ringkasan & Monitoring Real-time
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 flex-shrink-0">
              <WeatherWidget key={refreshKey} />
              <Button
                onClick={handleRefresh}
                disabled={isRefreshing}
                size="icon"
                variant="outline"
                className="hover-lift hover:border-primary/50 transition-all duration-300"
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </div>

        {/* Enhanced Stats Grid with staggered animations & navigation */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatsCard
            title="Total Produk"
            value={stats.totalProducts}
            icon={Package}
            to="/products"
            className="animate-fade-in-up"
            style={{ animationDelay: "100ms" } as any}
            variant="primary"
          />
          <StatsCard
            title="Transaksi Bulan Ini"
            value={stats.totalTransactions}
            icon={ShoppingCart}
            to="/reports#daily-transactions"
            className="animate-fade-in-up"
            style={{ animationDelay: "200ms" } as any}
            variant="secondary"
          />
          <StatsCard
            title="Pendapatan Bulan Ini"
            value={`Rp ${stats.totalRevenue.toLocaleString("id-ID")}`}
            icon={TrendingUp}
            to="/reports#monthly-summary"
            className="animate-fade-in-up"
            style={{ animationDelay: "300ms" } as any}
            variant="accent"
          />
          <StatsCard
            title="Rider Aktif Bulan Ini"
            value={stats.activeRiders}
            icon={Users}
            to="/settings#user-management"
            className="animate-fade-in-up"
            style={{ animationDelay: "400ms" } as any}
            variant="default"
          />
        </div>

        {/* Return Requests for Admin - Enhanced */}
        {isAdmin && returns.length > 0 && (
          <EnhancedCard
            title="Permintaan Return"
            description="Kelola return dari rider"
            icon={Undo2}
            iconColor="accent"
            variant="glass"
            className="animate-fade-in-up"
            style={{ animationDelay: "500ms" } as any}
            headerAction={
              <NotificationBadge count={returns.length} variant="accent" pulse>
                <div className="w-8 h-8" />
              </NotificationBadge>
            }
          >
            <ReturnsAccordion
              returns={returns}
              processingReturnId={processingReturnId}
              removingReturnIds={removingReturnIds}
              onApprove={handleApproveReturn}
              onReject={handleRejectReturn}
            />
          </EnhancedCard>
        )}

        {/* Reject Requests for Admin - Enhanced */}
        {isAdmin && rejects.length > 0 && (
          <EnhancedCard
            title="Permintaan Reject"
            description="Produk rusak/kadaluarsa dari rider"
            icon={PackageX}
            iconColor="destructive"
            variant="glass"
            className="animate-fade-in-up border-red-200 dark:border-red-900"
            style={{ animationDelay: "550ms" } as any}
            headerAction={
              <NotificationBadge count={rejects.length} variant="destructive" pulse>
                <div className="w-8 h-8" />
              </NotificationBadge>
            }
          >
            <RejectsAccordion
              rejects={rejects}
              processingRejectId={processingRejectId}
              removingRejectIds={removingRejectIds}
              onApprove={handleApproveReject}
              onReject={handleRejectReject}
            />
          </EnhancedCard>
        )}

        {/* GPS Rider Tracking - Admin Only - Enhanced */}
        {isAdmin && (
          <div className="animate-fade-in-up" style={{ animationDelay: "600ms" }}>
            <RiderTrackingMap key={refreshKey} />
          </div>
        )}

        {/* Leaderboard - Admin Only - Enhanced */}
        {isAdmin && (
          <div className="animate-fade-in-up" style={{ animationDelay: "700ms" }}>
            <LeaderboardCard showTitle={true} />
          </div>
        )}

        {/* Recent Activities Section - Real Data */}
        <EnhancedCard
          title="Aktivitas Terbaru"
          description="Transaksi, return, dan alert sistem"
          icon={Clock}
          iconColor="purple"
          variant="glass"
          className="animate-fade-in-up"
          style={{ animationDelay: "800ms" } as any}
        >
          {recentActivities.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground relative">
              <div className="absolute inset-0 flex items-center justify-center opacity-10">
                <Clock className="w-32 h-32 animate-pulse-slow" />
              </div>
              <p className="text-sm sm:text-base font-medium relative z-10">
                Belum ada aktivitas hari ini
              </p>
              <p className="text-xs sm:text-sm text-muted-foreground/70 mt-2 relative z-10">
                Aktivitas sistem akan muncul di sini
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentActivities.map((activity, index) => {
                const ActivityIcon = activity.icon;
                return (
                  <div
                    key={index}
                    className="flex items-start gap-3 p-3 rounded-lg glass border border-border/30 hover:border-primary/30 transition-all duration-300 hover-lift animate-fade-in-left"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    {/* Icon */}
                    <div className={`
                      w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 shadow-md
                      ${activity.color === 'secondary' && 'bg-secondary/10 text-secondary'}
                      ${activity.color === 'accent' && 'bg-accent/10 text-accent'}
                      ${activity.color === 'destructive' && 'bg-destructive/10 text-destructive'}
                      ${activity.color === 'primary' && 'bg-primary/10 text-primary'}
                    `}>
                      <ActivityIcon className="w-5 h-5" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">
                            {activity.title}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                            {activity.description}
                          </p>
                        </div>
                        {activity.status && (
                          <Badge 
                            variant={activity.status === 'pending' ? 'outline' : 'default'}
                            className="text-[10px] flex-shrink-0"
                          >
                            {activity.status}
                          </Badge>
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(activity.time), { 
                          addSuffix: true,
                          locale: idLocale 
                        })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </EnhancedCard>
      </div>

      <BottomNav isAdmin={isAdmin} />
    </div>
  );
}

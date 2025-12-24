import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Trophy } from "lucide-react";
import { startOfMonth, endOfMonth } from "date-fns";

interface LeaderboardEntry {
  rider_id: string;
  rider_name: string;
  rider_avatar: string | null;
  total_cups: number;
  rank: number;
  sales_target: number;
}

interface LeaderboardCardProps {
  currentUserId?: string;
  showTitle?: boolean;
}

export function LeaderboardCard({ currentUserId, showTitle = true }: LeaderboardCardProps) {
  const navigate = useNavigate();
  
  // Get current month boundaries for query key
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  
  // Fetch leaderboard - ALL riders
  // Using direct JOIN query like RiderReports.tsx for accurate cup counting
  const { data: leaderboard = [] } = useQuery<LeaderboardEntry[]>({
    queryKey: ["rider-leaderboard", monthStart.toISOString(), monthEnd.toISOString()],
    queryFn: async () => {
      // STEP 1: Get ALL riders from user_roles
      const { data: allRiders, error: ridersError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "rider");

      if (ridersError) {
        console.error("❌ Error fetching user_roles:", ridersError);
      }
      const riderRoleIds = (allRiders || []).map((r: any) => r.user_id);

      // STEP 2: For each rider, calculate cups using direct JOIN (like RiderReports.tsx)
      // This ensures ALL transaction items are counted correctly
      const riderCupsPromises = riderRoleIds.map(async (riderId: string) => {
        // Use the same query structure as RiderReports.tsx - direct JOIN
        const { data: items, error } = await supabase
          .from("transaction_items")
          .select("quantity, products(categories(name)), transactions!inner(rider_id, created_at)")
          .eq("transactions.rider_id", riderId)
          .gte("transactions.created_at", monthStart.toISOString())
          .lte("transactions.created_at", monthEnd.toISOString());

        if (error) {
          console.error(`Error fetching items for rider ${riderId}:`, error);
          return { riderId, cups: 0 };
        }

        // Calculate cups (exclude Add On) - same logic as RiderReports.tsx
        const cups = (items || []).reduce((sum: number, item: any) => {
          const categoryName = item.products?.categories?.name?.toLowerCase() || '';
          const isAddOn = categoryName === 'add on' || categoryName === 'addon' || categoryName === 'add-on';
          return isAddOn ? sum : sum + (item.quantity || 0);
        }, 0);

        return { riderId, cups };
      });

      const riderCupsResults = await Promise.all(riderCupsPromises);
      
      // Build rider cups map
      const riderCupsMap = new Map<string, number>();
      riderCupsResults.forEach(({ riderId, cups }) => {
        riderCupsMap.set(riderId, cups);
      });

      // STEP 3: Fetch profiles for all riders
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url, sales_target")
        .in("user_id", riderRoleIds.length > 0 ? riderRoleIds : [""]);

      if (profilesError) {
        console.error("❌ Error fetching profiles:", profilesError);
      }
      const profilesList = profiles || [];

      // STEP 4: Build leaderboard
      const entries: LeaderboardEntry[] = profilesList.map((profile: any) => ({
        rider_id: profile.user_id,
        rider_name: profile.full_name,
        rider_avatar: profile.avatar_url,
        total_cups: riderCupsMap.get(profile.user_id) || 0,
        sales_target: profile.sales_target || 30,
        rank: 0,
      }));

      console.log("✅ Leaderboard entries built:", entries.length);
      console.log("📊 Leaderboard data:", entries.map(e => ({
        name: e.rider_name,
        cups: e.total_cups
      })));

      // Sort by total cups descending
      entries.sort((a, b) => b.total_cups - a.total_cups);

      // Assign ranks
      entries.forEach((entry, index) => {
        entry.rank = index + 1;
      });

      return entries;
    },
    refetchInterval: 5000, // Refresh every 5 seconds for real-time updates
    refetchOnWindowFocus: true, // Refetch when window gains focus
    staleTime: 0, // Always consider data stale to ensure fresh data
    gcTime: 1000, // Garbage collect cache quickly
  });

      // STEP 1: Get ALL riders from user_roles
      const { data: allRiders, error: ridersError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "rider");

      if (ridersError) {
        console.error("❌ Error fetching user_roles:", ridersError);
      } else {
        console.log("✅ Found riders in user_roles:", allRiders?.length || 0);
      }
      const riderRoleIds = (allRiders || []).map((r: any) => r.user_id);

      // STEP 2: Get ALL transactions for this month with full data
      const { data: transactionsData, error: transError } = await supabase
        .from("transactions")
        .select("*")
        .gte("created_at", monthStart.toISOString())
        .lte("created_at", monthEnd.toISOString())
        .order("created_at", { ascending: false });

      if (transError) {
        console.error("❌ Error fetching transactions:", transError);
        return [];
      }
      
      const transactions = transactionsData || [];
      console.log("✅ Found transactions this month:", transactions.length);

      // Get transaction IDs
      const transactionIds = transactions.map((t: any) => t.id).filter(Boolean);
      
      if (transactionIds.length === 0) {
        console.log("⚠️ No transactions found for this month");
        // Return riders with 0 cups
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, avatar_url, sales_target")
          .in("user_id", riderRoleIds.length > 0 ? riderRoleIds : [""]);
        
        return (profiles || []).map((profile: any, index: number) => ({
          rider_id: profile.user_id,
          rider_name: profile.full_name,
          rider_avatar: profile.avatar_url,
          total_cups: 0,
          sales_target: profile.sales_target || 30,
          rank: index + 1,
        }));
      }

      // STEP 3: Get ALL transaction items with product categories
      // Using same query structure as Reports.tsx for consistency
      let allItems: any[] = [];
      const batchSize = 50;
      for (let i = 0; i < transactionIds.length; i += batchSize) {
        const batchIds = transactionIds.slice(i, i + batchSize);
        if (batchIds.length === 0) continue;
        
        const { data: batchItems, error: itemsError } = await supabase
          .from("transaction_items")
          .select("*, products(name, sku, category_id, categories(name))")
          .in("transaction_id", batchIds);
          
        if (itemsError) {
          console.error("Error fetching transaction_items (batch):", itemsError);
          continue;
        }
        if (batchItems) allItems = allItems.concat(batchItems);
      }

      console.log("✅ Fetched transaction items:", allItems.length);

      // STEP 4: Build transaction -> items mapping
      const transactionItemsMap = new Map<string, any[]>();
      allItems.forEach((item: any) => {
        const transId = item.transaction_id;
        if (!transactionItemsMap.has(transId)) {
          transactionItemsMap.set(transId, []);
        }
        transactionItemsMap.get(transId)!.push(item);
      });

      // STEP 5: Calculate cups per rider using SAME logic as Reports.tsx
      // This matches the transactionsByRider calculation in Reports.tsx
      const riderData = new Map<string, { cups: number; riderId: string }>();
      
      transactions.forEach((transaction: any) => {
        const riderId = transaction.rider_id;
        if (!riderId) return;
        
        // Get transaction items for this transaction
        const transactionItems = transactionItemsMap.get(transaction.id) || [];
        
        // Calculate cups for this transaction (exclude Add On)
        // EXACT same logic as Reports.tsx line 375-379
        const transactionCups = transactionItems.reduce((sum: number, item: any) => {
          const categoryName = item.products?.categories?.name?.toLowerCase() || '';
          const isAddOn = categoryName === 'add on' || categoryName === 'addon' || categoryName === 'add-on';
          return isAddOn ? sum : sum + (item.quantity || 0);
        }, 0);
        
        // Aggregate to rider
        if (!riderData.has(riderId)) {
          riderData.set(riderId, { cups: 0, riderId });
        }
        riderData.get(riderId)!.cups += transactionCups;
      });

      // STEP 6: Get unique rider IDs (from roles + from transactions)
      const transactionRiderIds = Array.from(riderData.keys());
      const unionIds = Array.from(new Set<string>([...riderRoleIds, ...transactionRiderIds]));

      // STEP 7: Fetch profiles for everyone (including sales_target)
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url, sales_target")
        .in("user_id", unionIds.length > 0 ? unionIds : [""]);

      if (profilesError) {
        console.error("❌ Error fetching profiles:", profilesError);
      } else {
        console.log("✅ Found profiles:", profiles?.length || 0);
      }
      const profilesList = profiles || [];

      // STEP 8: Build leaderboard
      const entries: LeaderboardEntry[] = profilesList.map((profile: any) => {
        const data = riderData.get(profile.user_id);
        return {
          rider_id: profile.user_id,
          rider_name: profile.full_name,
          rider_avatar: profile.avatar_url,
          total_cups: data?.cups || 0,
          sales_target: profile.sales_target || 30,
          rank: 0,
        };
      });

      console.log("✅ Leaderboard entries built:", entries.length);
      console.log("📊 Leaderboard data:", entries.map(e => ({
        name: e.rider_name,
        cups: e.total_cups
      })));

      // Sort by total cups descending
      entries.sort((a, b) => b.total_cups - a.total_cups);

      // Assign ranks
      entries.forEach((entry, index) => {
        entry.rank = index + 1;
      });

      return entries;
    },
    refetchInterval: 5000, // Refresh every 5 seconds for real-time updates
    refetchOnWindowFocus: true, // Refetch when window gains focus
    staleTime: 0, // Always consider data stale to ensure fresh data
    gcTime: 1000, // Garbage collect cache quickly
  });

  const getRankBadge = (rank: number) => {
    if (rank === 1) return { emoji: "🥇", color: "bg-yellow-500" };
    if (rank === 2) return { emoji: "🥈", color: "bg-gray-400" };
    if (rank === 3) return { emoji: "🥉", color: "bg-orange-400" };
    return { emoji: `#${rank}`, color: "bg-blue-500" };
  };

  return (
    <Card className="animate-fade-in">
      {showTitle && (
        <CardHeader className="p-3 sm:p-4 pb-2 sm:pb-3">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Trophy className="w-5 h-5 text-yellow-500" />
            Leaderboard Bulan Ini
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">Top Riders - Update Real-time</CardDescription>
        </CardHeader>
      )}
      <CardContent className="p-3 sm:p-4 space-y-2">
        {leaderboard.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground text-sm">
            Belum ada data penjualan bulan ini
          </p>
        ) : (
          leaderboard.map((entry) => {
            const isMe = currentUserId && entry.rider_id === currentUserId;
            const badge = getRankBadge(entry.rank);
            
            return (
              <div
                key={entry.rider_id}
                onClick={() => navigate(`/reports?rider=${entry.rider_id}`)}
                className={`flex items-center gap-3 p-3 rounded-lg transition-all cursor-pointer ${
                  isMe 
                    ? 'bg-primary/10 border-2 border-primary hover:bg-primary/20' 
                    : 'bg-muted/50 hover:bg-primary/20'
                }`}
              >
                {/* Rank Badge */}
                <div className={`w-10 h-10 rounded-full ${badge.color} flex items-center justify-center text-white font-bold flex-shrink-0`}>
                  <span className="text-sm">{badge.emoji}</span>
                </div>

                {/* Avatar & Info */}
                <Avatar className="h-10 w-10 flex-shrink-0">
                  <AvatarImage src={entry.rider_avatar || undefined} alt={entry.rider_name} />
                  <AvatarFallback className="bg-primary/20 text-primary">
                    {entry.rider_name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                {/* Name & Stats */}
                <div className="flex-1 min-w-0">
                  <p className={`font-semibold text-sm truncate ${isMe ? 'text-primary' : ''}`}>
                    {entry.rider_name} {isMe && '(Saya)'}
                  </p>
                  <p className="text-xs font-medium text-foreground/80">
                    {entry.total_cups || 0} cup terjual
                  </p>
                </div>

                {/* Medal/Badge for top 3 */}
                {entry.rank <= 3 && (
                  <Badge variant="outline" className="text-xs flex-shrink-0">
                    Top {entry.rank}
                  </Badge>
                )}
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}

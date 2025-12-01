import { useQuery } from "@tanstack/react-query";
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
  // Fetch leaderboard - ALL riders
  const { data: leaderboard = [] } = useQuery<LeaderboardEntry[]>({
    queryKey: ["rider-leaderboard"],
    queryFn: async () => {
      const now = new Date();
      const monthStart = startOfMonth(now);
      const monthEnd = endOfMonth(now);

      // STEP 1: Get ALL riders from user_roles
      const { data: allRiders, error: ridersError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "rider");

      if (ridersError) console.error("Error fetching user_roles:", ridersError);
      const riderRoleIds = (allRiders || []).map((r: any) => r.user_id);

      // STEP 2: Get ALL transactions for this month
      const { data: transactions, error: transError } = await supabase
        .from("transactions")
        .select("id, rider_id, created_at")
        .gte("created_at", monthStart.toISOString())
        .lte("created_at", monthEnd.toISOString());

      if (transError) {
        console.error("Error fetching transactions:", transError);
        return [];
      }

      // Get transaction IDs
      const transactionIds = (transactions || []).map((t: any) => t.id).filter(Boolean);

      // STEP 3: Get ALL transaction items (batched to avoid URL length limits)
      let allItems: any[] = [];
      const batchSize = 50;
      for (let i = 0; i < transactionIds.length; i += batchSize) {
        const batchIds = transactionIds.slice(i, i + batchSize);
        if (batchIds.length === 0) continue;
        
        const { data: batchItems, error: itemsError } = await supabase
          .from("transaction_items")
          .select(`
            transaction_id,
            quantity,
            products (
              id,
              categories (
                name
              )
            )
          `)
          .in("transaction_id", batchIds);
          
        if (itemsError) {
          console.error("Error fetching transaction_items (batch):", itemsError);
          continue;
        }
        if (batchItems) allItems = allItems.concat(batchItems);
      }

      // STEP 4: Build map of transaction_id -> total cups (exclude Add On)
      const transactionCups = new Map<string, number>();
      (allItems || []).forEach((item: any) => {
        const transId = item.transaction_id;
        const categoryName = item.products?.categories?.name?.toLowerCase() || '';
        const isAddOn = categoryName === 'add on' || categoryName === 'addon' || categoryName === 'add-on';
        
        if (!isAddOn) {
          const current = transactionCups.get(transId) || 0;
          transactionCups.set(transId, current + (item.quantity || 0));
        }
      });

      // STEP 5: Aggregate cups per rider
      const riderCups = new Map<string, number>();
      const transactionRiderIds = new Set<string>();
      
      (transactions || []).forEach((transaction: any) => {
        const riderId = transaction.rider_id;
        if (!riderId) return;
        
        transactionRiderIds.add(riderId);
        const cups = transactionCups.get(transaction.id) || 0;
        
        if (cups > 0) {
          const current = riderCups.get(riderId) || 0;
          riderCups.set(riderId, current + cups);
        }
      });

      // STEP 6: Union - riders from roles + riders seen in transactions
      const unionIds = Array.from(new Set<string>([...riderRoleIds, ...Array.from(transactionRiderIds)]));

      // STEP 7: Fetch profiles for everyone (including sales_target)
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url, sales_target")
        .in("user_id", unionIds.length > 0 ? unionIds : [""]);

      if (profilesError) console.error("Error fetching profiles:", profilesError);
      const profilesList = profiles || [];

      // STEP 8: Build leaderboard
      const entries: LeaderboardEntry[] = profilesList.map((profile: any) => ({
        rider_id: profile.user_id,
        rider_name: profile.full_name,
        rider_avatar: profile.avatar_url,
        total_cups: riderCups.get(profile.user_id) || 0,
        sales_target: profile.sales_target || 30,
        rank: 0,
      }));

      // Sort by total cups descending
      entries.sort((a, b) => b.total_cups - a.total_cups);

      // Assign ranks
      entries.forEach((entry, index) => {
        entry.rank = index + 1;
      });

      return entries;
    },
    refetchInterval: 30000, // Real-time: refresh every 30 seconds
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
                className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                  isMe 
                    ? 'bg-primary/10 border-2 border-primary' 
                    : 'bg-muted/50 hover:bg-muted'
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

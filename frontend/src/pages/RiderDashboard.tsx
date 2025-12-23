import React, { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Trophy, TrendingUp, Package, Calendar, Megaphone, Bell, Sparkles } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { StatsCard } from "@/components/StatsCard";
import { RiderFeedCard } from "@/components/RiderFeedCard";
import { ThemeToggle } from "@/components/ThemeToggle";
import { EnhancedCard } from "@/components/EnhancedCard";
import { NotificationBadge } from "@/components/NotificationBadge";
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useNewFeedNotification } from "@/hooks/useNewFeedNotification";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface LeaderboardEntry {
  rider_id: string;
  rider_name: string;
  rider_avatar: string | null;
  total_cups: number;
  rank: number;
}

export default function RiderDashboard() {
  const navigate = useNavigate();
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [myRank, setMyRank] = useState<number>(0);
  const { hasNewFeed, newFeedCount, markFeedsAsViewed } = useNewFeedNotification();
  const feedSectionRef = useRef<HTMLDivElement>(null);

  // Debug notification state
  useEffect(() => {
    if (hasNewFeed) {
      console.log("🔔 New feeds available:", newFeedCount);
    }
  }, [hasNewFeed, newFeedCount]);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);
    };
    fetchUser();
  }, []);

  // Auto-mark feeds as viewed when scrolled into view
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && hasNewFeed) {
            markFeedsAsViewed();
          }
        });
      },
      { threshold: 0.5 } // Trigger when 50% of the section is visible
    );

    if (feedSectionRef.current) {
      observer.observe(feedSectionRef.current);
    }

    return () => {
      if (feedSectionRef.current) {
        observer.unobserve(feedSectionRef.current);
      }
    };
  }, [hasNewFeed, markFeedsAsViewed]);

  // Fetch today's sales (EXCLUDE Add On)
  const { data: todaySales = 0 } = useQuery({
    queryKey: ["rider-sales-today", currentUserId],
    queryFn: async () => {
      if (!currentUserId) return 0;
      
      const today = new Date();
      const { data: items } = await supabase
        .from("transaction_items")
        .select("quantity, products(categories(name)), transactions!inner(rider_id, created_at)")
        .eq("transactions.rider_id", currentUserId)
        .gte("transactions.created_at", startOfDay(today).toISOString())
        .lte("transactions.created_at", endOfDay(today).toISOString());

      // Count cups ONLY (exclude Add On category)
      // Use LEFT JOIN - so products without categories still counted
      return items?.reduce((sum, item: any) => {
        const categoryName = item.products?.categories?.name?.toLowerCase() || '';
        const isAddOn = categoryName === 'add on' || categoryName === 'addon' || categoryName === 'add-on';
        return isAddOn ? sum : sum + item.quantity;
      }, 0) || 0;
    },
    enabled: !!currentUserId,
  });

  // Fetch week's sales (EXCLUDE Add On)
  const { data: weekSales = 0 } = useQuery({
    queryKey: ["rider-sales-week", currentUserId],
    queryFn: async () => {
      if (!currentUserId) return 0;
      
      const today = new Date();
      const { data: items } = await supabase
        .from("transaction_items")
        .select("quantity, products(categories(name)), transactions!inner(rider_id, created_at)")
        .eq("transactions.rider_id", currentUserId)
        .gte("transactions.created_at", startOfWeek(today, { locale: idLocale }).toISOString())
        .lte("transactions.created_at", endOfWeek(today, { locale: idLocale }).toISOString());

      // Count cups ONLY (exclude Add On category)
      return items?.reduce((sum, item: any) => {
        const categoryName = item.products?.categories?.name?.toLowerCase() || '';
        const isAddOn = categoryName === 'add on' || categoryName === 'addon' || categoryName === 'add-on';
        return isAddOn ? sum : sum + item.quantity;
      }, 0) || 0;
    },
    enabled: !!currentUserId,
  });

  // Fetch month's sales (EXCLUDE Add On)
  const { data: monthSales = 0 } = useQuery({
    queryKey: ["rider-sales-month", currentUserId],
    queryFn: async () => {
      if (!currentUserId) return 0;
      
      const today = new Date();
      const { data: items } = await supabase
        .from("transaction_items")
        .select("quantity, products(categories(name)), transactions!inner(rider_id, created_at)")
        .eq("transactions.rider_id", currentUserId)
        .gte("transactions.created_at", startOfMonth(today).toISOString())
        .lte("transactions.created_at", endOfMonth(today).toISOString());

      // Count cups ONLY (exclude Add On category)
      return items?.reduce((sum, item: any) => {
        const categoryName = item.products?.categories?.name?.toLowerCase() || '';
        const isAddOn = categoryName === 'add on' || categoryName === 'addon' || categoryName === 'add-on';
        return isAddOn ? sum : sum + item.quantity;
      }, 0) || 0;
    },
    enabled: !!currentUserId,
  });

    // Fetch leaderboard - ALL riders
  // Using the SAME calculation logic as Reports.tsx for consistency
  const { data: leaderboard = [] } = useQuery<LeaderboardEntry[]>({
    queryKey: ["rider-leaderboard"],
    queryFn: async () => {
      const now = new Date();
      const monthStart = startOfMonth(now);
      const monthEnd = endOfMonth(now);

      // STEP 1: Get ALL riders from user_roles (may be empty)
      const { data: allRiders, error: ridersError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "rider");

      if (ridersError) {
        console.error("❌ [RiderDashboard] Error fetching user_roles:", ridersError);
      } else {
        console.log("✅ [RiderDashboard] Found riders in user_roles:", allRiders?.length || 0);
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
        console.error("❌ [RiderDashboard] Error fetching transactions:", transError);
        return [];
      }
      
      const transactions = transactionsData || [];
      console.log("✅ [RiderDashboard] Found transactions this month:", transactions.length);

      // Get transaction IDs
      const transactionIds = transactions.map((t: any) => t.id).filter(Boolean);
      
      if (transactionIds.length === 0) {
        console.log("⚠️ [RiderDashboard] No transactions found for this month");
        // Return riders with 0 cups
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, avatar_url")
          .in("user_id", riderRoleIds.length > 0 ? riderRoleIds : [""]);
        
        return (profiles || []).map((profile: any, index: number) => ({
          rider_id: profile.user_id,
          rider_name: profile.full_name,
          rider_avatar: profile.avatar_url,
          total_cups: 0,
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

      console.log("✅ [RiderDashboard] Fetched transaction items:", allItems.length);

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

      // STEP 7: Fetch profiles for everyone
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url")
        .in("user_id", unionIds.length > 0 ? unionIds : [""]);

      if (profilesError) {
        console.error("❌ [RiderDashboard] Error fetching profiles:", profilesError);
      } else {
        console.log("✅ [RiderDashboard] Found profiles:", profiles?.length || 0);
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
          rank: 0,
        };
      });

      console.log("✅ [RiderDashboard] Leaderboard entries built:", entries.length);
      console.log("📊 [RiderDashboard] Leaderboard data:", entries.map(e => ({
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
    refetchInterval: 10000, // Real-time: refresh every 10 seconds (faster for better UX)
    refetchOnWindowFocus: true, // Refetch when window gains focus
    staleTime: 5000, // Consider data stale after 5 seconds
  });

  // Update my rank when leaderboard changes
  useEffect(() => {
    if (currentUserId && leaderboard.length > 0) {
      const myEntry = leaderboard.find(e => e.rider_id === currentUserId);
      setMyRank(myEntry?.rank || 0);
    }
  }, [currentUserId, leaderboard]);

  // Fetch 7-day sales chart data (EXCLUDE Add On)
  const { data: chartData = [] } = useQuery({
    queryKey: ["rider-chart-7days", currentUserId],
    queryFn: async () => {
      if (!currentUserId) return [];
      
      const days = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        days.push(date);
      }

      const chartPoints = await Promise.all(
        days.map(async (day) => {
          const { data: items } = await supabase
            .from("transaction_items")
            .select("quantity, products(categories(name)), transactions!inner(rider_id, created_at)")
            .eq("transactions.rider_id", currentUserId)
            .gte("transactions.created_at", startOfDay(day).toISOString())
            .lte("transactions.created_at", endOfDay(day).toISOString());

          // Count cups ONLY (exclude Add On)
          const total = items?.reduce((sum, item: any) => {
            const categoryName = item.products?.categories?.name?.toLowerCase() || '';
            const isAddOn = categoryName === 'add on' || categoryName === 'addon' || categoryName === 'add-on';
            return isAddOn ? sum : sum + item.quantity;
          }, 0) || 0;

          return {
            date: format(day, "dd MMM", { locale: idLocale }),
            cups: total,
          };
        })
      );

      return chartPoints;
    },
    enabled: !!currentUserId,
  });

  const getRankBadge = (rank: number) => {
    if (rank === 1) return { emoji: "🥇", color: "bg-yellow-500" };
    if (rank === 2) return { emoji: "🥈", color: "bg-gray-400" };
    if (rank === 3) return { emoji: "🥉", color: "bg-orange-600" };
    return { emoji: `#${rank}`, color: "bg-primary" };
  };

  return (
    <div 
      className="min-h-screen bg-gradient-to-br from-background via-secondary/5 to-background w-full overflow-x-hidden relative"
      style={{
        paddingTop: 'max(1rem, env(safe-area-inset-top, 0px))',
        paddingBottom: 'calc(5rem + env(safe-area-inset-bottom, 0px))',
        paddingLeft: 'env(safe-area-inset-left, 0px)',
        paddingRight: 'env(safe-area-inset-right, 0px)',
      }}
    >
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-secondary/10 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: "1s" }} />
      </div>

      <div className="max-w-screen-xl mx-auto px-3 sm:px-4 space-y-4 sm:space-y-5 relative z-10">
        {/* Enhanced Header with Notification */}
        <div className="glass rounded-2xl p-4 border border-border/50 shadow-xl animate-fade-in-down">
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gradient-shine">
                  Dashboard Saya
                </h1>
                <Trophy className="w-5 h-5 text-accent animate-pulse-slow" />
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Performa & Peringkat Penjualan
              </p>
            </div>
            
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Feed Notification Badge - Enhanced */}
              <NotificationBadge 
                count={hasNewFeed ? newFeedCount : 0} 
                variant="accent" 
                pulse={hasNewFeed}
              >
                <button
                  onClick={() => {
                    feedSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                  className="flex flex-col items-center gap-1 px-3 py-2 glass hover:bg-primary/10 rounded-xl transition-all hover-lift hover:border-primary/30 border border-border/30"
                >
                  <Bell className={`w-5 h-5 text-primary ${hasNewFeed ? 'animate-pulse' : ''}`} />
                  <span className="text-[10px] font-semibold text-primary">Info</span>
                </button>
              </NotificationBadge>
            </div>
          </div>
        </div>

        {/* Enhanced Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatsCard
            title="Hari Ini"
            value={`${todaySales} cup`}
            icon={Calendar}
            className="animate-fade-in-up"
            style={{ animationDelay: "100ms" } as any}
            variant="primary"
          />
          <StatsCard
            title="Minggu Ini"
            value={`${weekSales} cup`}
            icon={Package}
            className="animate-fade-in-up"
            style={{ animationDelay: "200ms" } as any}
            variant="secondary"
          />
          <StatsCard
            title="Bulan Ini"
            value={`${monthSales} cup`}
            icon={TrendingUp}
            className="animate-fade-in-up"
            style={{ animationDelay: "300ms" } as any}
            variant="accent"
          />
          <StatsCard
            title="Peringkat Saya"
            value={myRank > 0 ? `#${myRank}` : "-"}
            icon={Trophy}
            className="animate-fade-in-up"
            style={{ animationDelay: "400ms" } as any}
            variant={myRank === 1 ? "primary" : "default"}
          />
        </div>

        {/* Enhanced Chart */}
        <EnhancedCard
          title="Penjualan 7 Hari Terakhir"
          description="Grafik penjualan cup Anda"
          icon={TrendingUp}
          iconColor="secondary"
          variant="glass"
          className="animate-fade-in-up"
          style={{ animationDelay: "500ms" } as any}
        >
          <div className="relative">
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={chartData}>
                <defs>
                  <linearGradient id="colorCups" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(142, 76%, 45%)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(142, 76%, 45%)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis 
                  dataKey="date" 
                  style={{ fontSize: '12px' }} 
                  stroke="hsl(var(--muted-foreground))"
                />
                <YAxis 
                  style={{ fontSize: '12px' }} 
                  stroke="hsl(var(--muted-foreground))"
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    boxShadow: 'var(--shadow-lg)'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="cups" 
                  stroke="hsl(142, 76%, 45%)" 
                  strokeWidth={3}
                  dot={{ fill: 'hsl(142, 76%, 45%)', r: 4 }}
                  activeDot={{ r: 6, fill: 'hsl(142, 76%, 45%)', stroke: 'hsl(var(--card))', strokeWidth: 2 }}
                  fill="url(#colorCups)"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </EnhancedCard>

        {/* Enhanced Leaderboard */}
        <EnhancedCard
          title="Leaderboard Bulan Ini"
          description="Top Riders - Update Real-time"
          icon={Trophy}
          iconColor="accent"
          variant="gradient"
          className="animate-fade-in-up"
          style={{ animationDelay: "600ms" } as any}
        >
          <div className="space-y-2">
            {leaderboard.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Trophy className="w-16 h-16 mx-auto mb-4 opacity-20" />
                <p className="text-sm font-medium">Belum ada data penjualan bulan ini</p>
                <p className="text-xs mt-2">Mulai berjualan untuk masuk leaderboard! 🚀</p>
              </div>
            ) : (
              leaderboard.map((entry, index) => {
                const isMe = entry.rider_id === currentUserId;
                const badge = getRankBadge(entry.rank);
                
                return (
                  <div
                    key={entry.rider_id}
                    onClick={() => navigate(`/reports?rider=${entry.rider_id}`)}
                    className={cn(
                      "group flex items-center gap-3 p-3 rounded-xl transition-all cursor-pointer hover-lift",
                      "border backdrop-blur-sm animate-fade-in-left",
                      isMe 
                        ? 'bg-gradient-primary/10 border-primary/50 hover:bg-gradient-primary/20 shadow-colored' 
                        : 'glass border-border/30 hover:border-primary/30'
                    )}
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    {/* Rank Badge - Enhanced */}
                    <div className={cn(
                      "relative w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold flex-shrink-0 shadow-md",
                      "transition-transform duration-300 group-hover:scale-110",
                      badge.color
                    )}>
                      {entry.rank <= 3 && (
                        <div className="absolute inset-0 rounded-xl blur-md opacity-50 animate-pulse-slow" style={{ backgroundColor: badge.color }} />
                      )}
                      <span className="text-base relative z-10">{badge.emoji}</span>
                    </div>

                    {/* Avatar & Info - Enhanced */}
                    <Avatar className="h-12 w-12 flex-shrink-0 border-2 border-white/20 shadow-md">
                      <AvatarImage src={entry.rider_avatar || undefined} alt={entry.rider_name} />
                      <AvatarFallback className={cn(
                        "font-bold text-lg",
                        isMe ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                      )}>
                        {entry.rider_name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    {/* Name & Stats - Enhanced */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={cn(
                          "font-bold text-sm truncate",
                          isMe ? 'text-primary' : 'text-foreground'
                        )}>
                          {entry.rider_name}
                        </p>
                        {isMe && (
                          <Badge variant="default" className="text-[10px] px-1.5 py-0 bg-gradient-primary">
                            Saya
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1 mt-0.5">
                        <Package className="w-3 h-3 text-muted-foreground" />
                        <p className="text-xs font-semibold text-muted-foreground">
                          {entry.total_cups || 0} cup terjual
                        </p>
                      </div>
                    </div>

                    {/* Medal/Badge for top 3 - Enhanced */}
                    {entry.rank <= 3 && (
                      <Badge className={cn(
                        "text-xs font-bold shadow-md flex-shrink-0 animate-pulse-slow",
                        entry.rank === 1 && "bg-gradient-to-r from-yellow-400 to-yellow-600 text-white",
                        entry.rank === 2 && "bg-gradient-to-r from-gray-300 to-gray-500 text-white",
                        entry.rank === 3 && "bg-gradient-to-r from-orange-400 to-orange-600 text-white"
                      )}>
                        Top {entry.rank}
                      </Badge>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </EnhancedCard>

        {/* Enhanced Feed Section */}
        <div ref={feedSectionRef} className="animate-fade-in-up" style={{ animationDelay: "700ms" }}>
          <EnhancedCard
            title="Pengumuman & Info"
            description="Update terbaru dari admin"
            icon={Megaphone}
            iconColor="primary"
            variant="glass"
            headerAction={
              hasNewFeed && (
                <Badge variant="destructive" className="animate-pulse">
                  {newFeedCount} Baru
                </Badge>
              )
            }
          >
            <RiderFeedCard />
          </EnhancedCard>
        </div>
      </div>

      <BottomNav isAdmin={false} />
    </div>
  );
}

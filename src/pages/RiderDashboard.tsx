import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Trophy, TrendingUp, Package, Calendar } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { StatsCard } from "@/components/StatsCard";
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

interface LeaderboardEntry {
  rider_id: string;
  rider_name: string;
  rider_avatar: string | null;
  total_cups: number;
  rank: number;
}

export default function RiderDashboard() {
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [myRank, setMyRank] = useState<number>(0);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);
    };
    fetchUser();
  }, []);

  // Fetch today's sales
  const { data: todaySales = 0 } = useQuery({
    queryKey: ["rider-sales-today", currentUserId],
    queryFn: async () => {
      if (!currentUserId) return 0;
      
      const today = new Date();
      const { data: items } = await supabase
        .from("transaction_items")
        .select("quantity, transactions!inner(rider_id, created_at)")
        .eq("transactions.rider_id", currentUserId)
        .gte("transactions.created_at", startOfDay(today).toISOString())
        .lte("transactions.created_at", endOfDay(today).toISOString());

      return items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
    },
    enabled: !!currentUserId,
  });

  // Fetch week's sales
  const { data: weekSales = 0 } = useQuery({
    queryKey: ["rider-sales-week", currentUserId],
    queryFn: async () => {
      if (!currentUserId) return 0;
      
      const today = new Date();
      const { data: items } = await supabase
        .from("transaction_items")
        .select("quantity, transactions!inner(rider_id, created_at)")
        .eq("transactions.rider_id", currentUserId)
        .gte("transactions.created_at", startOfWeek(today, { locale: idLocale }).toISOString())
        .lte("transactions.created_at", endOfWeek(today, { locale: idLocale }).toISOString());

      return items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
    },
    enabled: !!currentUserId,
  });

  // Fetch month's sales
  const { data: monthSales = 0 } = useQuery({
    queryKey: ["rider-sales-month", currentUserId],
    queryFn: async () => {
      if (!currentUserId) return 0;
      
      const today = new Date();
      const { data: items } = await supabase
        .from("transaction_items")
        .select("quantity, transactions!inner(rider_id, created_at)")
        .eq("transactions.rider_id", currentUserId)
        .gte("transactions.created_at", startOfMonth(today).toISOString())
        .lte("transactions.created_at", endOfMonth(today).toISOString());

      return items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
    },
    enabled: !!currentUserId,
  });

  // Fetch leaderboard (ALL riders)
  const { data: leaderboard = [] } = useQuery({
    queryKey: ["leaderboard-all"],
    queryFn: async () => {
      const today = new Date();
      
      // Get all transactions this month
      const { data: transactions } = await supabase
        .from("transactions")
        .select("id, rider_id, created_at")
        .gte("created_at", startOfMonth(today).toISOString())
        .lte("created_at", endOfMonth(today).toISOString());

      if (!transactions || transactions.length === 0) return [];

      // Get all transaction items
      const transactionIds = transactions.map(t => t.id);
      const { data: items } = await supabase
        .from("transaction_items")
        .select("transaction_id, quantity")
        .in("transaction_id", transactionIds);

      if (!items) return [];

      // Calculate total cups per rider
      const riderCups = new Map<string, number>();
      items.forEach(item => {
        const transaction = transactions.find(t => t.id === item.transaction_id);
        if (transaction) {
          const current = riderCups.get(transaction.rider_id) || 0;
          riderCups.set(transaction.rider_id, current + item.quantity);
        }
      });

      // Get rider profiles
      const riderIds = Array.from(riderCups.keys());
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url")
        .in("user_id", riderIds);

      if (!profiles) return [];

      // Build leaderboard
      const entries: LeaderboardEntry[] = profiles.map(profile => ({
        rider_id: profile.user_id,
        rider_name: profile.full_name,
        rider_avatar: profile.avatar_url,
        total_cups: riderCups.get(profile.user_id) || 0,
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

  // Update my rank when leaderboard changes
  useEffect(() => {
    if (currentUserId && leaderboard.length > 0) {
      const myEntry = leaderboard.find(e => e.rider_id === currentUserId);
      setMyRank(myEntry?.rank || 0);
    }
  }, [currentUserId, leaderboard]);

  // Fetch 7-day sales chart data
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
            .select("quantity, transactions!inner(rider_id, created_at)")
            .eq("transactions.rider_id", currentUserId)
            .gte("transactions.created_at", startOfDay(day).toISOString())
            .lte("transactions.created_at", endOfDay(day).toISOString());

          const total = items?.reduce((sum, item) => sum + item.quantity, 0) || 0;

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
        <div className="space-y-0.5">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gradient">Dashboard Saya</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">Performa & Peringkat Penjualan</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
          <StatsCard
            title="Hari Ini"
            value={`${todaySales} cup`}
            icon={Calendar}
            className="animate-fade-in"
            variant="primary"
          />
          <StatsCard
            title="Minggu Ini"
            value={`${weekSales} cup`}
            icon={Package}
            className="animate-fade-in"
            variant="secondary"
          />
          <StatsCard
            title="Bulan Ini"
            value={`${monthSales} cup`}
            icon={TrendingUp}
            className="animate-fade-in"
            variant="accent"
          />
          <StatsCard
            title="Peringkat Saya"
            value={myRank > 0 ? `#${myRank}` : "-"}
            icon={Trophy}
            className="animate-fade-in"
            variant={myRank === 1 ? "primary" : "default"}
          />
        </div>

        {/* Chart */}
        <Card className="animate-fade-in">
          <CardHeader className="p-3 sm:p-4 pb-2 sm:pb-3">
            <CardTitle className="text-base sm:text-lg">Penjualan 7 Hari Terakhir</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Grafik penjualan cup Anda</CardDescription>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" style={{ fontSize: '12px' }} />
                <YAxis style={{ fontSize: '12px' }} />
                <Tooltip />
                <Line type="monotone" dataKey="cups" stroke="#8b5cf6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Leaderboard */}
        <Card className="animate-fade-in">
          <CardHeader className="p-3 sm:p-4 pb-2 sm:pb-3">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Trophy className="w-5 h-5 text-yellow-500" />
              Leaderboard Bulan Ini
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">Top Riders - Update Real-time</CardDescription>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 space-y-2">
            {leaderboard.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground text-sm">
                Belum ada data penjualan bulan ini
              </p>
            ) : (
              leaderboard.map((entry) => {
                const isMe = entry.rider_id === currentUserId;
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

                    {/* Avatar */}
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={entry.rider_avatar || undefined} alt={entry.rider_name} />
                      <AvatarFallback className="bg-primary/20 text-primary">
                        {entry.rider_name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    {/* Name */}
                    <div className="flex-1 min-w-0">
                      <p className={`font-semibold text-sm truncate ${isMe ? 'text-primary' : ''}`}>
                        {entry.rider_name} {isMe && '(Saya)'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {entry.total_cups} cup terjual
                      </p>
                    </div>

                    {/* Medal for top 3 */}
                    {entry.rank <= 3 && (
                      <Badge variant="outline" className="text-xs">
                        Top {entry.rank}
                      </Badge>
                    )}
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      <BottomNav isAdmin={false} />
    </div>
  );
}

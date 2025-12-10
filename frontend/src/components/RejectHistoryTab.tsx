/**
 * REJECT HISTORY TAB - Admin view of all reject history
 * Shows approved/rejected damaged products
 * Red theme to distinguish from regular return history
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PackageX, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";

interface RejectHistoryEntry {
  id: string;
  rider_id: string;
  product_id: string;
  quantity: number;
  notes: string | null;
  returned_at: string;
  approved_at: string;
  approved_by: string;
  status: "approved" | "rejected";
  created_at: string;
  products: {
    id: string;
    name: string;
    categories: {
      name: string;
    } | null;
  };
  rider_profile: {
    full_name: string;
    avatar_url: string | null;
  };
  approver_profile: {
    full_name: string;
  };
}

export function RejectHistoryTab() {
  const { data: rejectHistory = [], isLoading, error: queryError } = useQuery<RejectHistoryEntry[]>({
    queryKey: ["reject-history"],
    queryFn: async () => {
      console.log("🔍 Fetching reject history...");
      
      const { data, error } = await supabase
        .from("reject_history" as any)
        .select(`
          *,
          products (
            id,
            name,
            categories (
              name
            )
          )
        `)
        .order("approved_at", { ascending: false })
        .limit(100);

      if (error) {
        console.error("❌ Error fetching reject_history:", error);
        throw error;
      }
      
      console.log("✅ Reject history fetched:", data?.length || 0, "records");

      if (!data || data.length === 0) return [];

      // Manually fetch profiles since foreign key relationships may not work with 'as any'
      const riderIds = [...new Set(data.map((r: any) => r.rider_id))];
      const approverIds = [...new Set(data.map((r: any) => r.approved_by))];
      const allUserIds = [...new Set([...riderIds, ...approverIds])];

      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url")
        .in("user_id", allUserIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      // Map profiles to reject history
      return data.map((item: any) => ({
        ...item,
        rider_profile: {
          full_name: profileMap.get(item.rider_id)?.full_name || "N/A",
          avatar_url: profileMap.get(item.rider_id)?.avatar_url || null,
        },
        approver_profile: {
          full_name: profileMap.get(item.approved_by)?.full_name || "N/A",
        }
      }));
    },
    refetchInterval: 30000, // Refresh every 30s
  });

  // Calculate totals
  const totalApproved = rejectHistory.filter(r => r.status === "approved").length;
  const totalRejected = rejectHistory.filter(r => r.status === "rejected").length;
  const totalQuantity = rejectHistory
    .filter(r => r.status === "approved")
    .reduce((sum, r) => sum + r.quantity, 0);

  if (isLoading) {
    return (
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle>Loading...</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  if (queryError) {
    return (
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="text-red-600">Error</CardTitle>
          <CardDescription className="text-red-500">
            {queryError instanceof Error ? queryError.message : "Gagal memuat reject history"}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (rejectHistory.length === 0) {
    return (
      <Card className="border-red-200">
        <CardHeader className="bg-red-50">
          <CardTitle className="flex items-center gap-2 text-red-600">
            <PackageX className="w-5 h-5" />
            Riwayat Reject Produk Rusak
          </CardTitle>
          <CardDescription>
            Belum ada reject history
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="text-center py-8 text-muted-foreground">
            <PackageX className="w-16 h-16 mx-auto mb-4 opacity-20" />
            <p className="text-sm">Belum ada produk yang direject</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-red-200">
      <CardHeader className="bg-red-50">
        <CardTitle className="flex items-center gap-2 text-red-600">
          <PackageX className="w-5 h-5" />
          Riwayat Reject Produk Rusak
        </CardTitle>
        <CardDescription>
          History produk yang direject (rusak/tidak layak jual)
        </CardDescription>
        
        {/* Summary Stats */}
        <div className="flex gap-3 mt-4">
          <Badge variant="destructive" className="px-3 py-1">
            ✓ Disetujui: {totalApproved}
          </Badge>
          <Badge variant="outline" className="px-3 py-1 border-red-300 text-red-600">
            ✗ Ditolak: {totalRejected}
          </Badge>
          <Badge variant="outline" className="px-3 py-1 border-red-300 text-red-600">
            Total Qty: {totalQuantity} pcs
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        {rejectHistory.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <PackageX className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium">Belum ada riwayat reject</p>
            <p className="text-sm mt-2">
              Reject produk akan muncul di sini setelah disetujui/ditolak admin
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {rejectHistory.map((entry) => (
              <div
                key={entry.id}
                className={`p-4 rounded-lg border-2 ${
                  entry.status === "approved"
                    ? "border-red-300 bg-red-50"
                    : "border-gray-300 bg-gray-50"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  {/* Left: Product Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-semibold text-sm">
                        {entry.products.name}
                      </h4>
                      {entry.status === "approved" ? (
                        <Badge variant="destructive" className="text-xs">
                          DIREJECT
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs border-gray-400 text-gray-600">
                          DITOLAK
                        </Badge>
                      )}
                    </div>

                    <div className="space-y-1 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Rider:</span>
                        <span>{entry.rider_profile?.full_name || "Unknown"}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Quantity:</span>
                        <span className="font-semibold text-red-600">
                          {entry.quantity} pcs
                        </span>
                      </div>
                      {entry.products.categories && (
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Kategori:</span>
                          <span>{entry.products.categories.name}</span>
                        </div>
                      )}
                    </div>

                    {/* Reject Reason */}
                    {entry.notes && (
                      <div className="mt-3 p-2 bg-white border border-red-200 rounded text-sm">
                        <div className="flex items-start gap-1 text-red-600">
                          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                          <div>
                            <span className="font-medium">Alasan reject:</span>
                            <p className="text-gray-700 mt-0.5">{entry.notes}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right: Dates & Approver */}
                  <div className="text-right text-xs text-gray-500 space-y-1">
                    <div>
                      <div className="font-medium text-gray-700">Diajukan:</div>
                      <div>
                        {format(new Date(entry.returned_at), "dd MMM yyyy", {
                          locale: idLocale,
                        })}
                      </div>
                      <div className="text-gray-400">
                        {format(new Date(entry.returned_at), "HH:mm")}
                      </div>
                    </div>
                    <div className="pt-2 border-t">
                      <div className="font-medium text-gray-700">
                        {entry.status === "approved" ? "Disetujui:" : "Ditolak:"}
                      </div>
                      <div>
                        {format(new Date(entry.approved_at), "dd MMM yyyy", {
                          locale: idLocale,
                        })}
                      </div>
                      <div className="text-gray-400">
                        {format(new Date(entry.approved_at), "HH:mm")}
                      </div>
                    </div>
                    <div className="pt-1">
                      <div className="font-medium text-gray-700">Oleh:</div>
                      <div>{entry.approver_profile?.full_name || "Admin"}</div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

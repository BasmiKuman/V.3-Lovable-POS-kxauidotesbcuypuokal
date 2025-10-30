import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BottomNav } from "@/components/BottomNav";
import { useIsMobile } from "@/hooks/use-mobile";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Warehouse as WarehouseIcon, Send, Package, History } from "lucide-react";
import { toast } from "sonner";

type Product = {
  id: string;
  name: string;
  stock_in_warehouse: number;
  price: number;
  category_id: string | null;
  image_url: string | null;
};

type Category = {
  id: string;
  name: string;
};

type Rider = {
  id: string;
  full_name: string;
};

type DistributionItem = {
  productId: string;
  quantity: number;
};

type ReturnHistoryItem = {
  id: string;
  quantity: number;
  notes: string | null;
  returned_at: string;
  approved_at: string;
  status: string; // 'approved' or 'rejected'
  products: {
    name: string;
    price: number;
  };
  rider: {
    full_name: string;
  };
  approver: {
    full_name: string;
  };
};

export default function Warehouse() {
  const isMobile = useIsMobile();
  const [isAdmin, setIsAdmin] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [riders, setRiders] = useState<Rider[]>([]);
  const [selectedRider, setSelectedRider] = useState<string>("");
  const [distributionItems, setDistributionItems] = useState<DistributionItem[]>([]);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [returnHistory, setReturnHistory] = useState<ReturnHistoryItem[]>([]);

  useEffect(() => {
    const checkRole = async () => {
      try {
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
      } catch (error) {
        console.error("Error checking role:", error);
      }
    };

    const fetchProducts = async () => {
      const { data } = await supabase
        .from("products")
        .select("id, name, stock_in_warehouse, price, category_id, image_url")
        .order("name");
      setProducts(data || []);
    };

    const fetchCategories = async () => {
      const { data } = await supabase
        .from("categories")
        .select("id, name")
        .order("name");
      setCategories(data || []);
    };

    const fetchRiders = async () => {
      const { data: riderRoles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "rider");

      if (riderRoles && riderRoles.length > 0) {
        const riderIds = riderRoles.map(r => r.user_id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", riderIds);

        setRiders(
          profiles?.map(p => ({
            id: p.user_id,
            full_name: p.full_name,
          })) || []
        );
      }
    };

    const fetchReturnHistory = async () => {
      try {
        // First, get the return history with product info
        const { data: returnData, error: returnError } = await supabase
          .from("return_history")
          .select(`
            id,
            quantity,
            notes,
            returned_at,
            approved_at,
            rider_id,
            approved_by,
            status,
            products (
              name,
              price
            )
          `)
          .order("returned_at", { ascending: false });

        if (returnError) {
          console.error("Error fetching return history:", returnError);
          toast.error("Gagal memuat riwayat return");
          return;
        }

        if (!returnData?.length) {
          setReturnHistory([]);
          return;
        }

        // Get the profiles for riders and approvers
        const uniqueUserIds = [...new Set([
          ...returnData.map(item => item.rider_id),
          ...returnData.map(item => item.approved_by)
        ])];

        const { data: profilesData, error: profilesError } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", uniqueUserIds);

        if (profilesError) {
          console.error("Error fetching profiles:", profilesError);
          toast.error("Gagal memuat data pengguna");
          return;
        }

        // Create a map of user_id to full_name
        const profileMap = new Map(profilesData?.map(p => [p.user_id, p.full_name]) || []);

        // Combine the data
        const completeReturnHistory = returnData.map(item => ({
          id: item.id,
          quantity: item.quantity,
          notes: item.notes,
          returned_at: item.returned_at,
          approved_at: item.approved_at,
          status: item.status || "approved", // Default to 'approved' for old records
          products: item.products,
          rider: {
            full_name: profileMap.get(item.rider_id) || "Unknown"
          },
          approver: {
            full_name: profileMap.get(item.approved_by) || "Unknown"
          }
        }));

        console.log("Complete return history:", completeReturnHistory);
        setReturnHistory(completeReturnHistory);
      } catch (error) {
        console.error("Error in fetchReturnHistory:", error);
        toast.error("Terjadi kesalahan saat memuat riwayat return");
      }
    };

    checkRole();
    fetchProducts();
    fetchCategories();
    fetchRiders();
    fetchReturnHistory();
  }, []);

  const handleDistribute = async () => {
    if (!selectedRider || distributionItems.length === 0) return;

    setLoading(true);
    try {
      // Start by fetching current stock levels
      const { data: currentStocks } = await supabase
        .from("rider_stock")
        .select("product_id, quantity")
        .eq("rider_id", selectedRider);

      const stockMap = new Map(currentStocks?.map(s => [s.product_id, s.quantity]));

      // Prepare upsert data
      const upsertData = distributionItems.map(item => ({
        rider_id: selectedRider,
        product_id: item.productId,
        quantity: (stockMap.get(item.productId) || 0) + item.quantity,
      }));

      // Upsert to rider_stock
      const { error: upsertError } = await supabase
        .from("rider_stock")
        .upsert(upsertData, { onConflict: "rider_id,product_id" });

      if (upsertError) throw upsertError;

      // Update warehouse stock
      for (const item of distributionItems) {
        const product = products.find(p => p.id === item.productId);
        if (!product) continue;

        const { error: updateError } = await supabase
          .from("products")
          .update({ stock_in_warehouse: product.stock_in_warehouse - item.quantity })
          .eq("id", item.productId);

        if (updateError) throw updateError;
      }

      toast.success("Produk berhasil didistribusikan");
      setDistributionItems([]);
      setSelectedRider("");

      // Refresh products
      const { data: updatedProducts } = await supabase
        .from("products")
        .select("id, name, stock_in_warehouse, price, category_id, image_url")
        .order("name");
      setProducts(updatedProducts || []);

    } catch (error: any) {
      console.error("Distribution error:", error);
      toast.error("Gagal mendistribusikan produk: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Filter products by selected category
  const filteredProducts = selectedCategory === "all"
    ? products
    : products.filter(p => p.category_id === selectedCategory);

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
        <div className="space-y-0.5">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gradient">Gudang</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">Stok & distribusi</p>
        </div>

        <Tabs defaultValue="distribution" className="space-y-2 sm:space-y-4">
          <TabsList className="grid w-full grid-cols-2 h-9">
            <TabsTrigger value="distribution" className="text-xs sm:text-sm">
              <Send className="w-3 h-3 mr-1" />
              Distribusi
            </TabsTrigger>
            <TabsTrigger value="returns" className="text-xs sm:text-sm">
              <History className="w-3 h-3 mr-1" />
              Return
            </TabsTrigger>
          </TabsList>

          <TabsContent value="distribution" className="space-y-4 sm:space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-lg sm:text-xl">
                  <Send className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2" />
                  Distribusi Produk
                </CardTitle>
                <CardDescription className="text-sm">Distribusikan produk dari gudang ke rider</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm sm:text-base">Pilih Rider</Label>
                  <Select value={selectedRider} onValueChange={setSelectedRider}>
                    <SelectTrigger className="h-9 sm:h-10">
                      <SelectValue placeholder="Pilih rider..." />
                    </SelectTrigger>
                    <SelectContent>
                      {riders.map((rider) => (
                        <SelectItem key={rider.id} value={rider.id}>
                          {rider.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Category Filter - Horizontal Scroll */}
                <div className="space-y-2">
                  <Label className="text-sm sm:text-base">Filter Kategori</Label>
                  <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
                    <Button
                      size="sm"
                      variant={selectedCategory === "all" ? "default" : "outline"}
                      onClick={() => setSelectedCategory("all")}
                      className="flex-shrink-0 h-7 text-xs sm:h-8 sm:text-sm"
                    >
                      Semua ({products.length})
                    </Button>
                    {categories.map((category) => {
                      const count = products.filter(p => p.category_id === category.id).length;
                      return (
                        <Button
                          key={category.id}
                          size="sm"
                          variant={selectedCategory === category.id ? "default" : "outline"}
                          onClick={() => setSelectedCategory(category.id)}
                          className="flex-shrink-0 h-7 text-xs sm:h-8 sm:text-sm"
                        >
                          {category.name} ({count})
                        </Button>
                      );
                    })}
                  </div>
                </div>

                {/* Grid Layout - 2 kolom untuk mobile & desktop */}
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  {filteredProducts.map((product) => (
                    <Card key={product.id} className="overflow-hidden hover:shadow-md transition-all">
                      <CardContent className="p-2 sm:p-3">
                        <div className="space-y-2">
                          {/* Product Image */}
                          <div className="w-full aspect-square rounded-lg bg-muted flex items-center justify-center">
                            {product.image_url ? (
                              <img
                                src={product.image_url}
                                alt={product.name}
                                className="w-full h-full object-cover rounded-lg"
                              />
                            ) : (
                              <Package className="w-8 h-8 sm:w-10 sm:h-10 text-muted-foreground" />
                            )}
                          </div>

                          {/* Product Info */}
                          <div className="space-y-1.5">
                            <h3 className="font-semibold text-xs sm:text-sm line-clamp-2 leading-tight">
                              {product.name}
                            </h3>
                            <p className="text-xs sm:text-sm text-primary font-medium">
                              Rp {product.price.toLocaleString("id-ID")}
                            </p>

                            {/* Stock Badge */}
                            <Badge 
                              variant={product.stock_in_warehouse < 10 ? "destructive" : "default"}
                              className="text-[10px] sm:text-xs px-1.5 py-0"
                            >
                              Stok: {product.stock_in_warehouse}
                            </Badge>

                            {/* Distribution Quantity Input */}
                            <div className="space-y-1">
                              <Label className="text-[10px] sm:text-xs text-muted-foreground">
                                Jumlah
                              </Label>
                              <Input
                                type="number"
                                min="0"
                                max={product.stock_in_warehouse}
                                placeholder="0"
                                value={distributionItems.find(d => d.productId === product.id)?.quantity || ""}
                                onChange={(e) => {
                                  const inputValue = e.target.value;
                                  
                                  // Allow empty input (to clear the field)
                                  if (inputValue === "" || inputValue === null) {
                                    setDistributionItems(prev => 
                                      prev.filter(d => d.productId !== product.id)
                                    );
                                    return;
                                  }

                                  const value = parseInt(inputValue);
                                  
                                  // Validate: must be a valid number, >= 0, and <= stock
                                  if (isNaN(value) || value < 0 || value > product.stock_in_warehouse) {
                                    return;
                                  }

                                  setDistributionItems(prev => {
                                    const existing = prev.find(d => d.productId === product.id);
                                    if (value === 0) {
                                      // Remove item if quantity is 0
                                      return prev.filter(d => d.productId !== product.id);
                                    }
                                    if (existing) {
                                      return prev.map(d =>
                                        d.productId === product.id
                                          ? { ...d, quantity: value }
                                          : d
                                      );
                                    }
                                    return [...prev, { productId: product.id, quantity: value }];
                                  });
                                }}
                                className="h-7 text-xs sm:h-8 sm:text-sm"
                              />
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <Button
                  className="w-full sm:w-auto"
                  onClick={handleDistribute}
                  disabled={loading || !selectedRider || distributionItems.length === 0}
                >
                  {loading ? "Memproses..." : "Distribusi Produk"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="returns" className="space-y-4 sm:space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-lg sm:text-xl">
                  <History className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2" />
                  Riwayat Return
                </CardTitle>
                <CardDescription className="text-sm">
                  Daftar produk yang dikembalikan oleh rider
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto -mx-6 px-6">
                  {returnHistory.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[45%]">Info Return</TableHead>
                          {!isMobile && (
                            <>
                              <TableHead>Produk</TableHead>
                              <TableHead>Catatan</TableHead>
                              <TableHead>Tanggal Return</TableHead>
                              <TableHead>Disetujui Oleh</TableHead>
                            </>
                          )}
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {returnHistory.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>
                              <div className="font-medium">{item.rider.full_name}</div>
                              {isMobile && (
                                <div className="space-y-1 mt-1">
                                  <div className="text-sm text-muted-foreground">{item.products.name}</div>
                                  <div className="text-xs space-y-1">
                                    <div className="flex justify-between text-muted-foreground">
                                      <span>Return:</span>
                                      <span>{new Date(item.returned_at).toLocaleDateString("id-ID")}</span>
                                    </div>
                                    <div className="flex justify-between text-muted-foreground">
                                      <span>Disetujui:</span>
                                      <span>{new Date(item.approved_at).toLocaleDateString("id-ID")}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Oleh:</span>
                                      <span className="font-medium">{item.approver.full_name}</span>
                                    </div>
                                    {item.notes && (
                                      <div className="text-xs italic text-muted-foreground mt-1">"{item.notes}"</div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </TableCell>
                            {!isMobile && (
                              <>
                                <TableCell>{item.products.name}</TableCell>
                                <TableCell className="max-w-xs truncate">
                                  {item.notes || "-"}
                                </TableCell>
                                <TableCell>
                                  {new Date(item.returned_at).toLocaleDateString("id-ID")}
                                </TableCell>
                                <TableCell>
                                  <div className="font-medium">
                                    {item.approver.full_name}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {new Date(item.approved_at).toLocaleDateString("id-ID")}
                                  </div>
                                </TableCell>
                              </>
                            )}
                            <TableCell>
                              <div className="space-y-1">
                                <Badge>{item.quantity} pcs</Badge>
                                <Badge 
                                  variant={item.status === "approved" ? "default" : "destructive"}
                                  className="ml-2"
                                >
                                  {item.status === "approved" ? "Disetujui" : "Ditolak"}
                                </Badge>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-12">
                      <History className="w-12 h-12 mx-auto text-muted-foreground opacity-50 mb-2" />
                      <p className="text-muted-foreground">Belum ada riwayat return</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      <BottomNav isAdmin={isAdmin} />
    </div>
  );
}
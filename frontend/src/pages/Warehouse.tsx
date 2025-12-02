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
import { Warehouse as WarehouseIcon, Send, Package, History, Calendar, Filter, Plus, Minus } from "lucide-react";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { format, startOfMonth, endOfMonth, startOfDay, endOfDay } from "date-fns";
import { id as idLocale } from "date-fns/locale";

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
  
  // Return history filters
  const [returnDateRange, setReturnDateRange] = useState({
    start: startOfMonth(new Date()),
    end: endOfMonth(new Date())
  });
  const [returnRiderFilter, setReturnRiderFilter] = useState<string>("all");

  useEffect(() => {
    const checkRole = async () => {
      try {
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

      console.log("🚚 DISTRIBUTION STARTED");
      console.log("   Rider ID:", selectedRider);
      console.log("   Current Stocks:", currentStocks);

      const stockMap = new Map(currentStocks?.map(s => [s.product_id, s.quantity]));

      // Prepare upsert data
      const upsertData = distributionItems.map(item => {
        const existingStock = stockMap.get(item.productId) || 0;
        const newStock = existingStock + item.quantity;
        
        const product = products.find(p => p.id === item.productId);
        console.log(`   📦 ${product?.name || item.productId}:`);
        console.log(`      Existing: ${existingStock} pcs`);
        console.log(`      Distributing: ${item.quantity} pcs`);
        console.log(`      New Total: ${newStock} pcs`);
        
        return {
          rider_id: selectedRider,
          product_id: item.productId,
          quantity: newStock,
        };
      });

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

                {/* List View with Quick Actions */}
                <div className="space-y-2">
                  {filteredProducts.map((product) => {
                    const distributedQty = distributionItems.find(d => d.productId === product.id)?.quantity || 0;
                    
                    return (
                      <Card key={product.id} className={`overflow-hidden transition-all ${distributedQty > 0 ? 'border-primary' : ''}`}>
                        <CardContent className="p-3">
                          <div className="flex items-center gap-3">
                            {/* Product Image - Smaller */}
                            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                              {product.image_url ? (
                                <img
                                  src={product.image_url}
                                  alt={product.name}
                                  className="w-full h-full object-cover rounded-lg"
                                />
                              ) : (
                                <Package className="w-6 h-6 sm:w-8 sm:h-8 text-muted-foreground" />
                              )}
                            </div>

                            {/* Product Info */}
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-sm sm:text-base line-clamp-1">
                                {product.name}
                              </h3>
                              <p className="text-xs sm:text-sm text-muted-foreground">
                                Rp {product.price.toLocaleString("id-ID")}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge 
                                  variant={product.stock_in_warehouse < 10 ? "destructive" : "secondary"}
                                  className="text-[10px] sm:text-xs"
                                >
                                  Stok: {product.stock_in_warehouse}
                                </Badge>
                                {distributedQty > 0 && (
                                  <Badge variant="default" className="text-[10px] sm:text-xs">
                                    Distribusi: {distributedQty}
                                  </Badge>
                                )}
                              </div>
                            </div>

                            {/* Quick Action Buttons */}
                            <div className="flex items-center gap-1 flex-shrink-0">
                              {/* Minus Button */}
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 w-8 p-0"
                                disabled={distributedQty === 0}
                                onClick={() => {
                                  const newQty = Math.max(0, distributedQty - 1);
                                  setDistributionItems(prev => {
                                    if (newQty === 0) {
                                      return prev.filter(d => d.productId !== product.id);
                                    }
                                    const existing = prev.find(d => d.productId === product.id);
                                    if (existing) {
                                      return prev.map(d =>
                                        d.productId === product.id
                                          ? { ...d, quantity: newQty }
                                          : d
                                      );
                                    }
                                    return prev;
                                  });
                                }}
                              >
                                <Minus className="w-3 h-3" />
                              </Button>

                              {/* Quantity Display/Input */}
                              <Input
                                type="number"
                                min="0"
                                max={product.stock_in_warehouse}
                                placeholder="0"
                                value={distributedQty || ""}
                                onChange={(e) => {
                                  const inputValue = e.target.value;
                                  
                                  if (inputValue === "" || inputValue === null) {
                                    setDistributionItems(prev => 
                                      prev.filter(d => d.productId !== product.id)
                                    );
                                    return;
                                  }

                                  const value = parseInt(inputValue);
                                  
                                  if (isNaN(value) || value < 0 || value > product.stock_in_warehouse) {
                                    return;
                                  }

                                  setDistributionItems(prev => {
                                    const existing = prev.find(d => d.productId === product.id);
                                    if (value === 0) {
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
                                className="h-8 w-14 text-center text-sm"
                              />

                              {/* Plus Button */}
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 w-8 p-0"
                                disabled={distributedQty >= product.stock_in_warehouse}
                                onClick={() => {
                                  const newQty = Math.min(product.stock_in_warehouse, distributedQty + 1);
                                  setDistributionItems(prev => {
                                    const existing = prev.find(d => d.productId === product.id);
                                    if (existing) {
                                      return prev.map(d =>
                                        d.productId === product.id
                                          ? { ...d, quantity: newQty }
                                          : d
                                      );
                                    }
                                    return [...prev, { productId: product.id, quantity: newQty }];
                                  });
                                }}
                              >
                                <Plus className="w-3 h-3" />
                              </Button>

                              {/* Quick Add Buttons */}
                              <div className="hidden sm:flex gap-1 ml-1">
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  className="h-8 px-2 text-xs"
                                  disabled={product.stock_in_warehouse < 5}
                                  onClick={() => {
                                    const newQty = Math.min(product.stock_in_warehouse, distributedQty + 5);
                                    setDistributionItems(prev => {
                                      const existing = prev.find(d => d.productId === product.id);
                                      if (existing) {
                                        return prev.map(d =>
                                          d.productId === product.id
                                            ? { ...d, quantity: newQty }
                                            : d
                                        );
                                      }
                                      return [...prev, { productId: product.id, quantity: newQty }];
                                    });
                                  }}
                                >
                                  +5
                                </Button>
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  className="h-8 px-2 text-xs"
                                  disabled={product.stock_in_warehouse < 10}
                                  onClick={() => {
                                    const newQty = Math.min(product.stock_in_warehouse, distributedQty + 10);
                                    setDistributionItems(prev => {
                                      const existing = prev.find(d => d.productId === product.id);
                                      if (existing) {
                                        return prev.map(d =>
                                          d.productId === product.id
                                            ? { ...d, quantity: newQty }
                                            : d
                                        );
                                      }
                                      return [...prev, { productId: product.id, quantity: newQty }];
                                    });
                                  }}
                                >
                                  +10
                                </Button>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
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
            {/* Filter Section */}
            <Card>
              <CardContent className="pt-4 sm:pt-6">
                <div className="space-y-3">
                  {/* Quick Date Buttons */}
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-xs sm:text-sm"
                      onClick={() => setReturnDateRange({
                        start: startOfDay(new Date()),
                        end: endOfDay(new Date())
                      })}
                    >
                      <Calendar className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                      Hari Ini
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-xs sm:text-sm"
                      onClick={() => setReturnDateRange({
                        start: startOfMonth(new Date()),
                        end: endOfMonth(new Date())
                      })}
                    >
                      <Calendar className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                      Bulan Ini
                    </Button>
                  </div>

                  {/* Date Range Picker */}
                  <div className="grid grid-cols-2 gap-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="w-full justify-start text-left font-normal text-xs sm:text-sm">
                          <Calendar className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                          {format(returnDateRange.start, "dd MMM yyyy", { locale: idLocale })}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={returnDateRange.start}
                          onSelect={(date) => date && setReturnDateRange({ ...returnDateRange, start: startOfDay(date) })}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="w-full justify-start text-left font-normal text-xs sm:text-sm">
                          <Calendar className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                          {format(returnDateRange.end, "dd MMM yyyy", { locale: idLocale })}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={returnDateRange.end}
                          onSelect={(date) => date && setReturnDateRange({ ...returnDateRange, end: endOfDay(date) })}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Rider Filter */}
                  <Select value={returnRiderFilter} onValueChange={setReturnRiderFilter}>
                    <SelectTrigger className="w-full text-xs sm:text-sm">
                      <div className="flex items-center">
                        <Filter className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                        <SelectValue placeholder="Pilih Rider" />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua Rider</SelectItem>
                      {riders.map((rider) => (
                        <SelectItem key={rider.id} value={rider.id}>
                          {rider.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

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
                {(() => {
                  // Filter return history by date and rider
                  const filteredReturns = returnHistory.filter(item => {
                    const returnDate = new Date(item.returned_at);
                    const dateMatch = returnDate >= returnDateRange.start && returnDate <= returnDateRange.end;
                    const riderMatch = returnRiderFilter === "all" || item.rider.full_name === riders.find(r => r.id === returnRiderFilter)?.full_name;
                    return dateMatch && riderMatch;
                  });

                  // Group by rider
                  const groupedByRider = filteredReturns.reduce((acc, item) => {
                    const riderName = item.rider.full_name;
                    if (!acc[riderName]) {
                      acc[riderName] = [];
                    }
                    acc[riderName].push(item);
                    return acc;
                  }, {} as Record<string, typeof returnHistory>);

                  const riderNames = Object.keys(groupedByRider).sort();

                  if (riderNames.length === 0) {
                    return (
                      <div className="text-center py-12">
                        <History className="w-12 h-12 mx-auto text-muted-foreground opacity-50 mb-2" />
                        <p className="text-muted-foreground">Tidak ada riwayat return untuk filter yang dipilih</p>
                      </div>
                    );
                  }

                  return (
                    <Accordion type="single" collapsible className="w-full space-y-2">
                      {riderNames.map((riderName) => {
                        const riderReturns = groupedByRider[riderName];
                        const totalQuantity = riderReturns.reduce((sum, item) => sum + item.quantity, 0);
                        const approvedCount = riderReturns.filter(item => item.status === "approved").length;
                        const rejectedCount = riderReturns.filter(item => item.status === "rejected").length;

                        return (
                          <AccordionItem key={riderName} value={riderName} className="border rounded-lg px-4">
                            <AccordionTrigger className="hover:no-underline">
                              <div className="flex items-center justify-between w-full pr-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                    <span className="text-primary font-semibold">
                                      {riderName.charAt(0).toUpperCase()}
                                    </span>
                                  </div>
                                  <div className="text-left">
                                    <p className="font-semibold text-sm sm:text-base">{riderName}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {riderReturns.length} transaksi • {totalQuantity} pcs
                                    </p>
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  {approvedCount > 0 && (
                                    <Badge variant="default" className="text-xs">
                                      {approvedCount} Disetujui
                                    </Badge>
                                  )}
                                  {rejectedCount > 0 && (
                                    <Badge variant="destructive" className="text-xs">
                                      {rejectedCount} Ditolak
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </AccordionTrigger>
                            <AccordionContent>
                              <div className="space-y-3 pt-4">
                                {riderReturns.map((item) => (
                                  <div key={item.id} className="border rounded-lg p-3 space-y-2">
                                    <div className="flex items-start justify-between">
                                      <div className="space-y-1">
                                        <p className="font-medium text-sm">{item.products.name}</p>
                                        <p className="text-xs text-muted-foreground">
                                          Return: {format(new Date(item.returned_at), "dd MMM yyyy HH:mm", { locale: idLocale })}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                          Disetujui: {format(new Date(item.approved_at), "dd MMM yyyy HH:mm", { locale: idLocale })}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                          Oleh: <span className="font-medium">{item.approver.full_name}</span>
                                        </p>
                                      </div>
                                      <div className="flex flex-col items-end gap-1">
                                        <Badge>{item.quantity} pcs</Badge>
                                        <Badge variant={item.status === "approved" ? "default" : "destructive"}>
                                          {item.status === "approved" ? "Disetujui" : "Ditolak"}
                                        </Badge>
                                      </div>
                                    </div>
                                    {item.notes && (
                                      <div className="mt-2 p-2 bg-muted/50 rounded text-xs italic">
                                        "{item.notes}"
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        );
                      })}
                    </Accordion>
                  );
                })()}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      <BottomNav isAdmin={isAdmin} />
    </div>
  );
}
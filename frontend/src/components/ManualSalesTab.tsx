import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { User, Package, ShoppingCart, DollarSign, Trash2, Plus, Minus, CheckCircle2, RotateCcw } from "lucide-react";
import { toast } from "sonner";

interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
}

interface CartItem {
  product_id: string;
  name: string;
  price: number;
  quantity: number;
  subtotal: number;
}

interface ReturnItem {
  product_id: string;
  name: string;
  quantity: number;
  reason: string;
}

interface Rider {
  user_id: string;
  full_name: string;
}

export function ManualSalesTab() {
  const [activeTab, setActiveTab] = useState("sales");
  
  // Sales states
  const [riders, setRiders] = useState<Rider[]>([]);
  const [selectedRider, setSelectedRider] = useState<string>("");
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "qris">("cash");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Return states
  const [returnRider, setReturnRider] = useState<string>("");
  const [returnProducts, setReturnProducts] = useState<Product[]>([]);
  const [returnCart, setReturnCart] = useState<ReturnItem[]>([]);
  const [returnReason, setReturnReason] = useState<string>("");
  const [returnLoading, setReturnLoading] = useState(false);
  const [returnSubmitting, setReturnSubmitting] = useState(false);

  useEffect(() => {
    fetchRiders();
  }, []);

  useEffect(() => {
    if (selectedRider) {
      fetchRiderStock();
    } else {
      setProducts([]);
      setCart([]);
    }
  }, [selectedRider]);
  
  useEffect(() => {
    if (returnRider) {
      fetchReturnRiderStock();
    } else {
      setReturnProducts([]);
      setReturnCart([]);
    }
  }, [returnRider]);

  const fetchRiders = async () => {
    try {
      const { data: riderRoles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "rider");

      if (riderRoles && riderRoles.length > 0) {
        const riderIds = riderRoles.map(r => r.user_id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", riderIds)
          .order("full_name");

        if (profiles) {
          setRiders(profiles);
        }
      }
    } catch (error) {
      console.error("Error fetching riders:", error);
      toast.error("Gagal memuat data rider");
    }
  };

  const fetchRiderStock = async () => {
    if (!selectedRider) return;

    setLoading(true);
    try {
      const { data: stockData, error } = await supabase
        .from("rider_stock")
        .select(`
          product_id,
          quantity,
          products (
            id,
            name,
            price
          )
        `)
        .eq("rider_id", selectedRider)
        .gt("quantity", 0);

      if (error) throw error;

      const productsWithStock = stockData?.map((item: any) => ({
        id: item.products.id,
        name: item.products.name,
        price: item.products.price,
        stock: item.quantity
      })) || [];

      setProducts(productsWithStock);
    } catch (error) {
      console.error("Error fetching rider stock:", error);
      toast.error("Gagal memuat stock rider");
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (product: Product) => {
    const existingItem = cart.find(item => item.product_id === product.id);
    
    if (existingItem) {
      if (existingItem.quantity >= product.stock) {
        toast.error(`Stock tidak cukup. Tersedia: ${product.stock}`);
        return;
      }
      updateQuantity(product.id, existingItem.quantity + 1);
    } else {
      setCart([...cart, {
        product_id: product.id,
        name: product.name,
        price: product.price,
        quantity: 1,
        subtotal: product.price
      }]);
      toast.success(`${product.name} ditambahkan`);
    }
  };

  const updateQuantity = (productId: string, newQuantity: number) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    if (newQuantity <= 0) {
      removeFromCart(productId);
      return;
    }

    if (newQuantity > product.stock) {
      toast.error(`Stock tidak cukup. Tersedia: ${product.stock}`);
      return;
    }

    setCart(cart.map(item => 
      item.product_id === productId 
        ? { ...item, quantity: newQuantity, subtotal: item.price * newQuantity }
        : item
    ));
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter(item => item.product_id !== productId));
  };

  const calculateTotal = () => {
    return cart.reduce((sum, item) => sum + item.subtotal, 0);
  };

  const handleSubmit = async () => {
    if (!selectedRider) {
      toast.error("Pilih rider terlebih dahulu");
      return;
    }

    if (cart.length === 0) {
      toast.error("Keranjang masih kosong");
      return;
    }

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const subtotal = calculateTotal();
      const taxAmount = 0;
      const totalAmount = subtotal;

      const { data: transaction, error: transactionError } = await supabase
        .from("transactions")
        .insert({
          rider_id: selectedRider,
          subtotal,
          tax_amount: taxAmount,
          total_amount: totalAmount,
          payment_method: paymentMethod,
          notes: `Manual entry by admin (${user.email})`
        })
        .select()
        .single();

      if (transactionError) throw transactionError;

      const items = cart.map(item => ({
        transaction_id: transaction.id,
        product_id: item.product_id,
        quantity: item.quantity,
        price: item.price,
        subtotal: item.subtotal
      }));

      const { error: itemsError } = await supabase
        .from("transaction_items")
        .insert(items);

      if (itemsError) throw itemsError;

      for (const item of cart) {
        const { data: currentStock } = await supabase
          .from("rider_stock")
          .select("quantity")
          .eq("rider_id", selectedRider)
          .eq("product_id", item.product_id)
          .single();

        if (currentStock) {
          const newQuantity = currentStock.quantity - item.quantity;
          
          if (newQuantity > 0) {
            await supabase
              .from("rider_stock")
              .update({ quantity: newQuantity })
              .eq("rider_id", selectedRider)
              .eq("product_id", item.product_id);
          } else {
            await supabase
              .from("rider_stock")
              .delete()
              .eq("rider_id", selectedRider)
              .eq("product_id", item.product_id);
          }
        }
      }

      toast.success("Transaksi berhasil disimpan!");
      
      setCart([]);
      setPaymentMethod("cash");
      fetchRiderStock();
      
    } catch (error: any) {
      console.error("Error submitting transaction:", error);
      toast.error("Gagal menyimpan transaksi: " + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  // === RETURN FUNCTIONS ===
  
  const fetchReturnRiderStock = async () => {
    if (!returnRider) return;

    setReturnLoading(true);
    try {
      const { data: stockData, error } = await supabase
        .from("rider_stock")
        .select(`
          product_id,
          quantity,
          products (
            id,
            name,
            price
          )
        `)
        .eq("rider_id", returnRider)
        .gt("quantity", 0);

      if (error) throw error;

      const productsWithStock = stockData?.map((item: any) => ({
        id: item.products.id,
        name: item.products.name,
        price: item.products.price,
        stock: item.quantity
      })) || [];

      setReturnProducts(productsWithStock);
    } catch (error) {
      console.error("Error fetching rider stock for return:", error);
      toast.error("Gagal memuat stock rider");
    } finally {
      setReturnLoading(false);
    }
  };
  
  const addToReturnCart = (product: Product) => {
    const existingItem = returnCart.find(item => item.product_id === product.id);
    
    if (existingItem) {
      if (existingItem.quantity >= product.stock) {
        toast.error(`Maksimal return: ${product.stock}`);
        return;
      }
      updateReturnQuantity(product.id, existingItem.quantity + 1);
    } else {
      setReturnCart([...returnCart, {
        product_id: product.id,
        name: product.name,
        quantity: 1,
        reason: ""
      }]);
      toast.success(`${product.name} ditambahkan ke return`);
    }
  };
  
  const updateReturnQuantity = (productId: string, newQuantity: number) => {
    const product = returnProducts.find(p => p.id === productId);
    if (!product) return;

    if (newQuantity <= 0) {
      removeFromReturnCart(productId);
      return;
    }

    if (newQuantity > product.stock) {
      toast.error(`Maksimal return: ${product.stock}`);
      return;
    }

    setReturnCart(returnCart.map(item => 
      item.product_id === productId 
        ? { ...item, quantity: newQuantity }
        : item
    ));
  };
  
  const removeFromReturnCart = (productId: string) => {
    setReturnCart(returnCart.filter(item => item.product_id !== productId));
  };
  
  // Quick action: Return semua stok produk tertentu
  const quickReturnProduct = (product: Product) => {
    const existingItem = returnCart.find(item => item.product_id === product.id);
    
    if (existingItem) {
      // Update ke full stock
      updateReturnQuantity(product.id, product.stock);
      toast.success(`${product.name} diupdate ke ${product.stock} pcs`);
    } else {
      // Tambah baru dengan full stock
      setReturnCart([...returnCart, {
        product_id: product.id,
        name: product.name,
        quantity: product.stock,
        reason: ""
      }]);
      toast.success(`${product.name} (${product.stock} pcs) ditambahkan`);
    }
  };
  
  // Quick action: Return semua produk rider sekaligus
  const quickReturnAll = () => {
    if (returnProducts.length === 0) {
      toast.error("Tidak ada produk untuk di-return");
      return;
    }
    
    const allProducts = returnProducts.map(product => ({
      product_id: product.id,
      name: product.name,
      quantity: product.stock,
      reason: ""
    }));
    
    setReturnCart(allProducts);
    toast.success(`${returnProducts.length} produk ditambahkan ke return (total: ${returnProducts.reduce((sum, p) => sum + p.stock, 0)} pcs)`);
  };
  
  const handleReturnSubmit = async () => {
    if (!returnRider) {
      toast.error("Pilih rider terlebih dahulu");
      return;
    }

    if (returnCart.length === 0) {
      toast.error("Belum ada produk yang akan direturn");
      return;
    }

    if (!returnReason.trim()) {
      toast.error("Alasan return harus diisi");
      return;
    }

    setReturnSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Insert return products with auto-approve (since admin doing manual return)
      for (const item of returnCart) {
        const { error: returnError } = await supabase
          .from("returns")
          .insert({
            rider_id: returnRider,
            product_id: item.product_id,
            quantity: item.quantity,
            notes: `${returnReason} (Manual return by admin: ${user.email})`,
            status: "approved",
            approved_by: user.id,
            approved_at: new Date().toISOString(),
            returned_at: new Date().toISOString()
          });

        if (returnError) throw returnError;

        // Update rider stock (kurangi dari stock rider karena dikembalikan ke gudang)
        const { data: currentStock, error: stockError } = await supabase
          .from("rider_stock")
          .select("quantity")
          .eq("rider_id", returnRider)
          .eq("product_id", item.product_id)
          .single();

        if (stockError && stockError.code !== 'PGRST116') {
          // PGRST116 = no rows returned, which is okay (rider might have no stock)
          console.error("Error fetching rider stock:", stockError);
          throw new Error(`Gagal mengambil stock rider: ${stockError.message}`);
        }

        if (currentStock) {
          const newQuantity = currentStock.quantity - item.quantity;
          
          if (newQuantity > 0) {
            const { error: updateStockError } = await supabase
              .from("rider_stock")
              .update({ quantity: newQuantity })
              .eq("rider_id", returnRider)
              .eq("product_id", item.product_id);
            
            if (updateStockError) {
              console.error("Error updating rider stock:", updateStockError);
              throw new Error(`Gagal update stock rider: ${updateStockError.message}`);
            }
          } else {
            const { error: deleteStockError } = await supabase
              .from("rider_stock")
              .delete()
              .eq("rider_id", returnRider)
              .eq("product_id", item.product_id);
            
            if (deleteStockError) {
              console.error("Error deleting rider stock:", deleteStockError);
              throw new Error(`Gagal hapus stock rider: ${deleteStockError.message}`);
            }
          }
        }

        // PENTING: Tambah stock gudang (products.stock)
        const { data: productData, error: productError } = await supabase
          .from("products")
          .select("stock")
          .eq("id", item.product_id)
          .single();

        if (productError) {
          console.error("Error fetching product stock:", productError);
          throw new Error(`Gagal mengambil data produk: ${productError.message}`);
        }

        if (productData) {
          const newWarehouseStock = productData.stock + item.quantity;
          
          const { error: updateError } = await supabase
            .from("products")
            .update({ stock: newWarehouseStock })
            .eq("id", item.product_id);

          if (updateError) {
            console.error("Error updating warehouse stock:", updateError);
            throw new Error(`Gagal update stock gudang: ${updateError.message}`);
          }

          console.log(`✅ Stock gudang updated: ${item.product_id} from ${productData.stock} to ${newWarehouseStock}`);
        }

        // Insert ke return_history untuk log (agar admin return juga tercatat)
        const { error: historyError } = await supabase
          .from("return_history")
          .insert({
            rider_id: returnRider,
            product_id: item.product_id,
            quantity: item.quantity,
            notes: `${returnReason} (Manual return by admin: ${user.email})`,
            returned_at: new Date().toISOString(),
            approved_at: new Date().toISOString(),
            approved_by: user.id,
            status: "approved"
          });

        if (historyError) {
          console.error("Error inserting return history:", historyError);
          // Don't throw error here, just log it - history is not critical
        }
      }

      toast.success(`Berhasil return ${returnCart.length} produk!`);
      
      setReturnCart([]);
      setReturnReason("");
      fetchReturnRiderStock();
      
    } catch (error: any) {
      console.error("Error submitting return:", error);
      toast.error("Gagal return produk: " + error.message);
    } finally {
      setReturnSubmitting(false);
    }
  };

  const selectedRiderName = riders.find(r => r.user_id === selectedRider)?.full_name || "";
  const returnRiderName = riders.find(r => r.user_id === returnRider)?.full_name || "";

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="grid w-full grid-cols-2 mb-4">
        <TabsTrigger value="sales" className="gap-2">
          <ShoppingCart className="w-4 h-4" />
          Penjualan
        </TabsTrigger>
        <TabsTrigger value="return" className="gap-2">
          <RotateCcw className="w-4 h-4" />
          Return
        </TabsTrigger>
      </TabsList>

      {/* SALES TAB */}
      <TabsContent value="sales" className="space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
      {/* Left Column */}
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <User className="w-4 h-4 sm:w-5 sm:h-5" />
              Pilih Rider
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">Pilih rider untuk input penjualan</CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={selectedRider} onValueChange={setSelectedRider}>
              <SelectTrigger className="text-sm">
                <SelectValue placeholder="-- Pilih Rider --" />
              </SelectTrigger>
              <SelectContent>
                {riders.map(rider => (
                  <SelectItem key={rider.user_id} value={rider.user_id} className="text-sm">
                    {rider.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {selectedRider && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Package className="w-4 h-4 sm:w-5 sm:h-5" />
                Stock {selectedRiderName}
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">Klik produk untuk tambah ke keranjang</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-6 sm:py-8">
                  <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-2">Memuat stock...</p>
                </div>
              ) : products.length === 0 ? (
                <div className="text-center py-6 sm:py-8 text-muted-foreground">
                  <Package className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Rider tidak memiliki stock</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-64 sm:max-h-96 overflow-y-auto">
                  {products.map(product => (
                    <div
                      key={product.id}
                      className="flex items-center justify-between p-2 sm:p-3 border rounded-lg hover:bg-accent cursor-pointer transition-colors"
                      onClick={() => addToCart(product)}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm sm:text-base truncate">{product.name}</p>
                        <p className="text-xs sm:text-sm text-muted-foreground">
                          Rp {product.price.toLocaleString('id-ID')}
                        </p>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {product.stock}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Right Column */}
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5" />
              Keranjang
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              {cart.length} item
            </CardDescription>
          </CardHeader>
          <CardContent>
            {cart.length === 0 ? (
              <div className="text-center py-6 sm:py-8 text-muted-foreground">
                <ShoppingCart className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Keranjang kosong</p>
              </div>
            ) : (
              <div className="space-y-2 sm:space-y-3 max-h-64 sm:max-h-96 overflow-y-auto">
                {cart.map(item => (
                  <div key={item.product_id} className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 border rounded-lg">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-xs sm:text-sm truncate">{item.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Rp {item.price.toLocaleString('id-ID')} × {item.quantity}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 sm:gap-2">
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-6 w-6 sm:h-8 sm:w-8"
                        onClick={() => updateQuantity(item.product_id, item.quantity - 1)}
                      >
                        <Minus className="h-2 w-2 sm:h-3 sm:w-3" />
                      </Button>
                      <span className="w-6 sm:w-8 text-center text-xs sm:text-sm font-medium">{item.quantity}</span>
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-6 w-6 sm:h-8 sm:w-8"
                        onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
                      >
                        <Plus className="h-2 w-2 sm:h-3 sm:w-3" />
                      </Button>
                      <Button
                        size="icon"
                        variant="destructive"
                        className="h-6 w-6 sm:h-8 sm:w-8"
                        onClick={() => removeFromCart(item.product_id)}
                      >
                        <Trash2 className="h-2 w-2 sm:h-3 sm:w-3" />
                      </Button>
                    </div>
                    <div className="text-right min-w-[80px] sm:min-w-[100px]">
                      <p className="font-bold text-xs sm:text-sm">
                        Rp {item.subtotal.toLocaleString('id-ID')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {cart.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <DollarSign className="w-4 h-4 sm:w-5 sm:h-5" />
                Pembayaran
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4">
              <div>
                <label className="text-xs sm:text-sm font-medium mb-1.5 block">Metode Pembayaran</label>
                <Select value={paymentMethod} onValueChange={(value: "cash" | "qris") => setPaymentMethod(value)}>
                  <SelectTrigger className="text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash" className="text-sm">💵 Tunai</SelectItem>
                    <SelectItem value="qris" className="text-sm">📱 QRIS</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="pt-3 sm:pt-4 border-t">
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <span className="text-base sm:text-lg font-semibold">Total</span>
                  <span className="text-xl sm:text-2xl font-bold text-primary">
                    Rp {calculateTotal().toLocaleString('id-ID')}
                  </span>
                </div>

                <Button
                  className="w-full text-sm sm:text-base"
                  size="lg"
                  onClick={handleSubmit}
                  disabled={submitting || !selectedRider}
                >
                  {submitting ? (
                    <>
                      <div className="animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-b-2 border-white mr-2"></div>
                      Memproses...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                      Simpan Transaksi
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  </TabsContent>

  {/* RETURN TAB */}
  <TabsContent value="return" className="space-y-4">
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
      {/* Left Column - Return */}
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <User className="w-4 h-4 sm:w-5 sm:h-5" />
              Pilih Rider
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">Pilih rider untuk return produk</CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={returnRider} onValueChange={setReturnRider}>
              <SelectTrigger className="text-sm">
                <SelectValue placeholder="-- Pilih Rider --" />
              </SelectTrigger>
              <SelectContent>
                {riders.map(rider => (
                  <SelectItem key={rider.user_id} value={rider.user_id} className="text-sm">
                    {rider.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {returnRider && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <div className="flex-1">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                    <Package className="w-4 h-4 sm:w-5 sm:h-5" />
                    Stock {returnRiderName}
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm">Klik produk untuk return ke gudang</CardDescription>
                </div>
                {returnProducts.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={quickReturnAll}
                    className="text-xs whitespace-nowrap"
                  >
                    <RotateCcw className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                    Return Semua
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {returnLoading ? (
                <div className="text-center py-6 sm:py-8">
                  <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-2">Memuat stock...</p>
                </div>
              ) : returnProducts.length === 0 ? (
                <div className="text-center py-6 sm:py-8 text-muted-foreground">
                  <Package className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Rider tidak memiliki stock</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-64 sm:max-h-96 overflow-y-auto">
                  {returnProducts.map(product => (
                    <div
                      key={product.id}
                      className="flex items-center justify-between gap-2 p-2 sm:p-3 border rounded-lg hover:bg-accent transition-colors"
                    >
                      <div 
                        className="flex-1 min-w-0 cursor-pointer"
                        onClick={() => addToReturnCart(product)}
                      >
                        <p className="font-medium text-sm sm:text-base truncate">{product.name}</p>
                        <p className="text-xs sm:text-sm text-muted-foreground">
                          Stock: {product.stock} pcs
                        </p>
                      </div>
                      <div className="flex items-center gap-1 sm:gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {product.stock}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => quickReturnProduct(product)}
                          className="h-7 w-7 sm:h-8 sm:w-8 p-0"
                          title="Return semua stock produk ini"
                        >
                          <RotateCcw className="w-3 h-3 sm:w-4 sm:h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Right Column - Return Cart */}
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5" />
              Daftar Return
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              {returnCart.length} produk akan direturn
            </CardDescription>
          </CardHeader>
          <CardContent>
            {returnCart.length === 0 ? (
              <div className="text-center py-6 sm:py-8 text-muted-foreground">
                <RotateCcw className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Belum ada produk return</p>
              </div>
            ) : (
              <div className="space-y-2 sm:space-y-3 max-h-64 sm:max-h-96 overflow-y-auto">
                {returnCart.map(item => (
                  <div key={item.product_id} className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 border rounded-lg">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-xs sm:text-sm truncate">{item.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Quantity: {item.quantity} pcs
                      </p>
                    </div>
                    <div className="flex items-center gap-1 sm:gap-2">
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-6 w-6 sm:h-8 sm:w-8"
                        onClick={() => updateReturnQuantity(item.product_id, item.quantity - 1)}
                      >
                        <Minus className="h-2 w-2 sm:h-3 sm:w-3" />
                      </Button>
                      <span className="w-6 sm:w-8 text-center text-xs sm:text-sm font-medium">{item.quantity}</span>
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-6 w-6 sm:h-8 sm:w-8"
                        onClick={() => updateReturnQuantity(item.product_id, item.quantity + 1)}
                      >
                        <Plus className="h-2 w-2 sm:h-3 sm:w-3" />
                      </Button>
                      <Button
                        size="icon"
                        variant="destructive"
                        className="h-6 w-6 sm:h-8 sm:w-8"
                        onClick={() => removeFromReturnCart(item.product_id)}
                      >
                        <Trash2 className="h-2 w-2 sm:h-3 sm:w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {returnCart.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" />
                Alasan Return
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4">
              <div>
                <label className="text-xs sm:text-sm font-medium mb-1.5 block">Alasan / Catatan</label>
                <Textarea
                  placeholder="Contoh: Produk rusak, expired, sisa tidak terjual, dll..."
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  rows={4}
                  className="text-sm resize-none"
                />
              </div>

              <div className="pt-3 sm:pt-4 border-t">
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <span className="text-base sm:text-lg font-semibold">Total Return</span>
                  <span className="text-xl sm:text-2xl font-bold text-orange-600">
                    {returnCart.reduce((sum, item) => sum + item.quantity, 0)} pcs
                  </span>
                </div>

                <Button
                  className="w-full text-sm sm:text-base"
                  size="lg"
                  variant="destructive"
                  onClick={handleReturnSubmit}
                  disabled={returnSubmitting || !returnRider || !returnReason.trim()}
                >
                  {returnSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-b-2 border-white mr-2"></div>
                      Memproses...
                    </>
                  ) : (
                    <>
                      <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                      Proses Return
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  </TabsContent>
</Tabs>
  );
}

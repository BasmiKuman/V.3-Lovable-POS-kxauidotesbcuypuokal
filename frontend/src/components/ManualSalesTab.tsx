import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { User, Package, ShoppingCart, DollarSign, Trash2, Plus, Minus, CheckCircle2 } from "lucide-react";
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

interface Rider {
  user_id: string;
  full_name: string;
}

export function ManualSalesTab() {
  const [riders, setRiders] = useState<Rider[]>([]);
  const [selectedRider, setSelectedRider] = useState<string>("");
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "qris">("cash");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

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

  const selectedRiderName = riders.find(r => r.user_id === selectedRider)?.full_name || "";

  return (
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
  );
}

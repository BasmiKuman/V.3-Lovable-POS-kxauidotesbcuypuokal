import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BottomNav } from "@/components/BottomNav";
import { LoadingScreen } from "@/components/LoadingScreen";
import { WeatherWidget } from "@/components/WeatherWidget";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ShoppingCart, Plus, Minus, Trash2, Package, Receipt, CreditCard } from "lucide-react";
import { toast } from "sonner";

interface RiderProduct {
  id: string;
  product_id: string;
  quantity: number;
  products: {
    id: string;
    name: string;
    price: number;
    image_url: string | null;
    category_id: string | null;
  };
}

interface Category {
  id: string;
  name: string;
}

interface CartItem {
  product_id: string;
  name: string;
  price: number;
  quantity: number;
}

interface ReceiptData {
  transaction_id: string;
  items: CartItem[];
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  payment_method: string;
  date: string;
}

export default function POS() {
  const [riderProducts, setRiderProducts] = useState<RiderProduct[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"tunai" | "qris">("tunai");
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);

  useEffect(() => {
    fetchRiderStock();
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const { data } = await supabase
        .from("categories")
        .select("id, name")
        .order("name");
      setCategories(data || []);
    } catch (error: any) {
      console.error("Gagal memuat kategori:", error);
    }
  };

  // Fetch rider stock with product details including category
  const fetchRiderStock = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("rider_stock")
        .select(`
          *,
          products (id, name, price, image_url, category_id)
        `)
        .eq("rider_id", user.id)
        .gt("quantity", 0);

      if (error) throw error;
      setRiderProducts(data || []);
    } catch (error: any) {
      toast.error("Gagal memuat stok produk");
    } finally {
      setLoading(false);
    }
  };

  const addToCart = async (product: RiderProduct) => {
    // Check if product has pending return
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      const { data: pendingReturn, error } = await supabase
        .rpc('has_pending_return', { 
          p_product_id: product.product_id, 
          p_rider_id: user.id 
        });

      if (error) {
        console.error('Error checking pending return:', error);
        // If function doesn't exist or RPC fails, just continue (allow adding to cart)
        console.warn('Skipping pending return check, function might not exist');
      } else if (pendingReturn) {
        toast.warning("Produk sedang dalam proses return, menunggu persetujuan admin", {
          duration: 4000,
        });
        return;
      }
    } catch (err) {
      // Silently fail and allow adding to cart
      console.error('Exception checking pending return:', err);
    }

    const existingItem = cart.find((item) => item.product_id === product.product_id);
    
    if (existingItem) {
      if (existingItem.quantity >= product.quantity) {
        toast.error("Stok tidak mencukupi");
        return;
      }
      setCart(cart.map((item) =>
        item.product_id === product.product_id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, {
        product_id: product.product_id,
        name: product.products.name,
        price: product.products.price,
        quantity: 1,
      }]);
    }
    toast.success("Ditambahkan ke keranjang");
  };

  const updateCartQuantity = (productId: string, change: number) => {
    setCart(cart.map((item) => {
      if (item.product_id === productId) {
        const newQuantity = item.quantity + change;
        return { ...item, quantity: Math.max(0, newQuantity) };
      }
      return item;
    }).filter((item) => item.quantity > 0));
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter((item) => item.product_id !== productId));
  };

  const calculateTotal = () => {
    return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  };

  const handleCheckout = async () => {
    if (cart.length === 0) {
      toast.error("Keranjang kosong");
      return;
    }

    setProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not found");

      const subtotal = calculateTotal();
      
      // Get tax setting
      const { data: taxData } = await supabase
        .from("tax_settings")
        .select("tax_percentage")
        .single();

      const taxPercentage = taxData?.tax_percentage || 0;
      const taxAmount = (subtotal * taxPercentage) / 100;
      const total = subtotal + taxAmount;

      // Create transaction
      const { data: transaction, error: transactionError } = await supabase
        .from("transactions")
        .insert({
          rider_id: user.id,
          subtotal,
          tax_amount: taxAmount,
          total_amount: total,
          payment_method: paymentMethod,
        })
        .select()
        .single();

      if (transactionError) throw transactionError;

      // Create transaction items
      const items = cart.map((item) => ({
        transaction_id: transaction.id,
        product_id: item.product_id,
        quantity: item.quantity,
        price: item.price,
        subtotal: item.price * item.quantity,
      }));

      const { error: itemsError } = await supabase
        .from("transaction_items")
        .insert(items);

      if (itemsError) throw itemsError;

      // Update rider stock
      for (const item of cart) {
        const { error: stockError } = await supabase.rpc("decrement_rider_stock", {
          p_rider_id: user.id,
          p_product_id: item.product_id,
          p_quantity: item.quantity,
        });

        if (stockError) console.error("Stock update error:", stockError);
      }

      // Prepare receipt data
      setReceiptData({
        transaction_id: transaction.id,
        items: [...cart],
        subtotal,
        tax_amount: taxAmount,
        total_amount: total,
        payment_method: paymentMethod,
        date: new Date().toLocaleString("id-ID"),
      });

      toast.success("Transaksi berhasil!");
      setCart([]);
      setShowReceipt(true);
      fetchRiderStock();
    } catch (error: any) {
      toast.error(error.message || "Transaksi gagal");
    } finally {
      setProcessing(false);
    }
  };

  // Filter products by selected category
  const filteredProducts = selectedCategory === "all"
    ? riderProducts
    : riderProducts.filter(p => p.products.category_id === selectedCategory);

  if (loading) {
    return <LoadingScreen message="Memuat POS..." />;
  }

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
        {/* Header with Weather Widget - Inline */}
        <div className="flex items-center justify-between gap-2">
          <div className="space-y-0.5 flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gradient">Point of Sale</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">Transaksi penjualan</p>
          </div>
          <WeatherWidget />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
          {/* Products */}
          <div className="lg:col-span-2 space-y-2 sm:space-y-3">
            <h2 className="text-base sm:text-lg font-semibold">Produk Tersedia</h2>
            
            {/* Category Filter - Horizontal Scroll */}
            {categories.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
                <Button
                  size="sm"
                  variant={selectedCategory === "all" ? "default" : "outline"}
                  onClick={() => setSelectedCategory("all")}
                  className="flex-shrink-0 h-7 text-xs sm:h-8 sm:text-sm"
                >
                  Semua ({riderProducts.length})
                </Button>
                {categories.map((category) => {
                  const count = riderProducts.filter(p => p.products.category_id === category.id).length;
                  if (count === 0) return null; // Hide categories with no products
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
            )}

            {riderProducts.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <Package className="w-16 h-16 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Tidak ada stok produk</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                {filteredProducts.map((product) => (
                  <Card 
                    key={product.product_id} 
                    className="overflow-hidden cursor-pointer hover:shadow-md transition-all hover:border-primary/50"
                    onClick={() => addToCart(product)}
                  >
                    <CardContent className="p-2 sm:p-3">
                      <div className="flex flex-col gap-2">
                        <div className="w-full aspect-square rounded-lg bg-muted flex items-center justify-center">
                          {product.products.image_url ? (
                            <img
                              src={product.products.image_url}
                              alt={product.products.name}
                              className="w-full h-full object-cover rounded-lg"
                            />
                          ) : (
                            <Package className="w-8 h-8 text-muted-foreground" />
                          )}
                        </div>
                        <div className="space-y-1">
                          <h3 className="text-xs sm:text-sm font-semibold line-clamp-2 leading-tight">
                            {product.products.name}
                          </h3>
                          <p className="text-xs sm:text-sm font-bold text-primary">
                            Rp {Number(product.products.price).toLocaleString("id-ID")}
                          </p>
                          <div className="flex items-center justify-between gap-1">
                            <Badge className="text-[10px] px-1.5 py-0">
                              Stok: {product.quantity}
                            </Badge>
                            <Button 
                              size="sm" 
                              onClick={(e) => {
                                e.stopPropagation();
                                addToCart(product);
                              }} 
                              className="h-6 px-1.5 sm:h-7 sm:px-2"
                            >
                              <Plus className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Cart */}
          <div className="space-y-2 sm:space-y-3">
            <Card className="sticky top-4">
              <CardHeader className="p-2.5 sm:p-4 pb-2">
                <CardTitle className="flex items-center text-sm sm:text-lg">
                  <ShoppingCart className="w-4 h-4 mr-1.5" />
                  Keranjang
                </CardTitle>
              </CardHeader>
              <CardContent className="p-2.5 sm:p-4 pt-0 space-y-2 sm:space-y-3">
                {cart.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Keranjang kosong</p>
                ) : (
                  <>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {cart.map((item) => (
                        <div key={item.product_id} className="flex items-center justify-between p-2 bg-muted rounded-lg">
                          <div className="flex-1">
                            <p className="font-medium text-sm">{item.name}</p>
                            <p className="text-xs text-muted-foreground">
                              Rp {Number(item.price).toLocaleString("id-ID")}
                            </p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateCartQuantity(item.product_id, -1)}
                            >
                              <Minus className="w-3 h-3" />
                            </Button>
                            <span className="w-8 text-center font-medium">{item.quantity}</span>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateCartQuantity(item.product_id, 1)}
                            >
                              <Plus className="w-3 h-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => removeFromCart(item.product_id)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="border-t pt-4 space-y-4">
                      {/* Payment Method Selection */}
                      <div className="space-y-2.5">
                        <Label className="text-sm font-semibold">Metode Pembayaran</Label>
                        <RadioGroup value={paymentMethod} onValueChange={(value) => setPaymentMethod(value as "tunai" | "qris")}>
                          <div 
                            className={`flex items-center gap-3 p-3.5 border rounded-lg cursor-pointer transition-all ${
                              paymentMethod === "tunai" 
                                ? "border-primary/60 bg-primary/5" 
                                : "border-border hover:border-primary/30 hover:bg-accent/50"
                            }`}
                            onClick={() => setPaymentMethod("tunai")}
                          >
                            <RadioGroupItem value="tunai" id="tunai" className="flex-shrink-0" />
                            <Label htmlFor="tunai" className="flex-1 cursor-pointer flex items-center gap-2 font-medium text-sm">
                              <CreditCard className="w-4 h-4 text-muted-foreground" />
                              <span>Tunai</span>
                            </Label>
                          </div>
                          <div 
                            className={`flex items-center gap-3 p-3.5 border rounded-lg cursor-pointer transition-all ${
                              paymentMethod === "qris" 
                                ? "border-primary/60 bg-primary/5" 
                                : "border-border hover:border-primary/30 hover:bg-accent/50"
                            }`}
                            onClick={() => setPaymentMethod("qris")}
                          >
                            <RadioGroupItem value="qris" id="qris" className="flex-shrink-0" />
                            <Label htmlFor="qris" className="flex-1 cursor-pointer flex items-center gap-2 font-medium text-sm">
                              <Receipt className="w-4 h-4 text-muted-foreground" />
                              <span>QRIS</span>
                            </Label>
                          </div>
                        </RadioGroup>
                      </div>

                      <div className="flex justify-between text-lg font-bold">
                        <span>Total:</span>
                        <span className="text-primary">
                          Rp {calculateTotal().toLocaleString("id-ID")}
                        </span>
                      </div>
                      <Button
                        className="w-full"
                        size="lg"
                        onClick={handleCheckout}
                        disabled={processing}
                      >
                        {processing ? "Memproses..." : "Checkout"}
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <BottomNav isAdmin={false} />

      {/* Receipt Dialog */}
      <Dialog open={showReceipt} onOpenChange={setShowReceipt}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Receipt className="w-5 h-5 mr-2" />
              Nota Transaksi
            </DialogTitle>
          </DialogHeader>
          {receiptData && (
            <div className="space-y-4">
              <div className="text-center border-b pb-4">
                <h3 className="font-bold text-lg">Struk Pembayaran</h3>
                <p className="text-xs text-muted-foreground">{receiptData.date}</p>
                <p className="text-xs text-muted-foreground">ID: {receiptData.transaction_id.slice(0, 8)}</p>
              </div>

              <div className="space-y-2">
                <p className="font-semibold text-sm">Detail Pembelian:</p>
                {receiptData.items.map((item) => (
                  <div key={item.product_id} className="flex justify-between text-sm">
                    <div className="flex-1">
                      <p>{item.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.quantity} x Rp {Number(item.price).toLocaleString("id-ID")}
                      </p>
                    </div>
                    <p className="font-medium">
                      Rp {(item.quantity * item.price).toLocaleString("id-ID")}
                    </p>
                  </div>
                ))}
              </div>

              <div className="border-t pt-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal:</span>
                  <span>Rp {receiptData.subtotal.toLocaleString("id-ID")}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Pajak:</span>
                  <span>Rp {receiptData.tax_amount.toLocaleString("id-ID")}</span>
                </div>
                <div className="flex justify-between text-lg font-bold border-t pt-2">
                  <span>Total:</span>
                  <span className="text-primary">Rp {receiptData.total_amount.toLocaleString("id-ID")}</span>
                </div>
                <div className="flex justify-between text-sm bg-muted p-2 rounded">
                  <span>Metode Pembayaran:</span>
                  <span className="font-semibold uppercase">{receiptData.payment_method}</span>
                </div>
              </div>

              <div className="text-center text-xs text-muted-foreground border-t pt-3">
                <p>Terima kasih atas pembelian Anda!</p>
              </div>

              <Button className="w-full" onClick={() => setShowReceipt(false)}>
                Tutup
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

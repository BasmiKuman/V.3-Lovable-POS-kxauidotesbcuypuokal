import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Package, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

interface Product {
  id: string;
  name: string;
  price: number;
  stock_in_warehouse: number;
  description: string | null;
  image_url: string | null;
  categories: { name: string } | null;
}

interface ProductRiderStock {
  rider_id: string;
  quantity: number;
  profiles: {
    full_name: string;
  };
}

interface Category {
  id: string;
  name: string;
}

interface RiderStock {
  product_id: string;
  quantity: number;
  products: {
    name: string;
    price: number;
    image_url: string | null;
  };
}

const productSchema = z.object({
  name: z.string().trim().min(1, "Nama produk wajib diisi").max(255),
  description: z.string().trim().optional(),
  price: z.string().min(1, "Harga wajib diisi").regex(/^\d+(\.\d{1,2})?$/, "Harga tidak valid"),
  stock_in_warehouse: z.string().min(1, "Stok wajib diisi").regex(/^\d+$/, "Stok harus berupa angka"),
  category_id: z.string().optional(),
  sku: z.string().trim().optional(),
  image_url: z.string().trim().url("URL gambar tidak valid").optional().or(z.literal("")),
});

export default function Products() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [riderStock, setRiderStock] = useState<RiderStock[]>([]);
  const [productRiderStocks, setProductRiderStocks] = useState<Record<string, ProductRiderStock[]>>({});
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [returnDialogOpen, setReturnDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<RiderStock | null>(null);
  const [returnQuantity, setReturnQuantity] = useState("");
  const [returnNotes, setReturnNotes] = useState("");

  const form = useForm<z.infer<typeof productSchema>>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      description: "",
      price: "",
      stock_in_warehouse: "",
      category_id: "",
      sku: "",
      image_url: "",
    },
  });

  useEffect(() => {
    const checkRole = async () => {
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
    };

    const fetchProducts = async () => {
      try {
        const { data, error } = await supabase
          .from("products")
          .select(`
            *,
            categories (name)
          `)
          .order("created_at", { ascending: false });

        if (error) throw error;
        setProducts(data || []);
      } catch (error: any) {
        toast.error("Gagal memuat produk");
      } finally {
        setLoading(false);
      }
    };

    const fetchCategories = async () => {
      try {
        const { data, error } = await supabase
          .from("categories")
          .select("id, name")
          .order("name");

        if (error) throw error;
        setCategories(data || []);
      } catch (error: any) {
        console.error("Gagal memuat kategori:", error);
      }
    };

    const fetchRiderStock = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
          .from("rider_stock")
          .select(`
            product_id,
            quantity,
            products (
              name,
              price,
              image_url
            )
          `)
          .eq("rider_id", user.id)
          .gt("quantity", 0);

        if (error) throw error;
        setRiderStock(data || []);
      } catch (error: any) {
        console.error("Gagal memuat stok rider:", error);
      }
    };

    const fetchProductRiderStocks = async () => {
      try {
        const { data: stockData, error: stockError } = await supabase
          .from("rider_stock")
          .select(`
            rider_id,
            product_id,
            quantity
          `)
          .gt("quantity", 0);

        if (stockError) throw stockError;

        if (!stockData || stockData.length === 0) {
          setProductRiderStocks({});
          return;
        }

        // Get unique rider IDs
        const riderIds = [...new Set(stockData.map(s => s.rider_id))];
        const { data: profilesData, error: profilesError } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", riderIds);

        if (profilesError) throw profilesError;

        // Group by product_id
        const stocksByProduct: Record<string, ProductRiderStock[]> = {};
        stockData.forEach(stock => {
          if (!stocksByProduct[stock.product_id]) {
            stocksByProduct[stock.product_id] = [];
          }
          const profile = profilesData?.find(p => p.user_id === stock.rider_id);
          stocksByProduct[stock.product_id].push({
            rider_id: stock.rider_id,
            quantity: stock.quantity,
            profiles: {
              full_name: profile?.full_name || "N/A"
            }
          });
        });

        setProductRiderStocks(stocksByProduct);
      } catch (error: any) {
        console.error("Gagal memuat stok rider per produk:", error);
      }
    };

    checkRole();
    fetchProducts();
    fetchCategories();
    fetchRiderStock();
    fetchProductRiderStocks();
  }, []);

  const onSubmit = async (values: z.infer<typeof productSchema>) => {
    try {
      const { error } = await supabase.from("products").insert({
        name: values.name,
        description: values.description || null,
        price: parseFloat(values.price),
        stock_in_warehouse: parseInt(values.stock_in_warehouse),
        category_id: values.category_id || null,
        sku: values.sku || null,
        image_url: values.image_url || null,
      });

      if (error) throw error;

      toast.success("Produk berhasil ditambahkan");
      setDialogOpen(false);
      form.reset();

      // Refresh products
      const { data } = await supabase
        .from("products")
        .select(`
          *,
          categories (name)
        `)
        .order("created_at", { ascending: false });
      
      setProducts(data || []);
    } catch (error: any) {
      toast.error("Gagal menambahkan produk");
      console.error(error);
    }
  };

  const handleReturnProduct = async () => {
    if (!selectedProduct) return;

    const qty = parseInt(returnQuantity);
    if (!qty || qty <= 0) {
      toast.error("Jumlah return tidak valid");
      return;
    }

    if (qty > selectedProduct.quantity) {
      toast.error("Jumlah return melebihi stok yang dimiliki");
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("returns").insert({
        rider_id: user.id,
        product_id: selectedProduct.product_id,
        quantity: qty,
        notes: returnNotes || null,
      });

      if (error) throw error;

      toast.success("Permintaan return berhasil diajukan");
      setReturnDialogOpen(false);
      setSelectedProduct(null);
      setReturnQuantity("");
      setReturnNotes("");

      // Refresh rider stock
      const { data } = await supabase
        .from("rider_stock")
        .select(`
          product_id,
          quantity,
          products (
            name,
            price,
            image_url
          )
        `)
        .eq("rider_id", user.id)
        .gt("quantity", 0);

      setRiderStock(data || []);
    } catch (error: any) {
      toast.error("Gagal mengajukan return: " + error.message);
      console.error(error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Package className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-nav-safe">
      <div className="max-w-screen-xl mx-auto p-2 sm:p-4 space-y-3 sm:space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-3xl font-bold text-gradient truncate">Produk</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">Kelola produk</p>
          </div>
          {isAdmin && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="flex-shrink-0">
                  <Plus className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Tambah</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Tambah Produk Baru</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nama Produk *</FormLabel>
                          <FormControl>
                            <Input placeholder="Masukkan nama produk" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Deskripsi</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Masukkan deskripsi produk" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="price"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Harga (Rp) *</FormLabel>
                            <FormControl>
                              <Input type="text" placeholder="10000" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="stock_in_warehouse"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Stok di Gudang *</FormLabel>
                            <FormControl>
                              <Input type="text" placeholder="100" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="category_id"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Kategori</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Pilih kategori" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {categories.map((cat) => (
                                  <SelectItem key={cat.id} value={cat.id}>
                                    {cat.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="sku"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>SKU</FormLabel>
                            <FormControl>
                              <Input placeholder="SKU-001" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="image_url"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>URL Gambar</FormLabel>
                          <FormControl>
                            <Input placeholder="https://example.com/image.jpg" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex justify-end gap-2 pt-4">
                      <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                        Batal
                      </Button>
                      <Button type="submit">Simpan Produk</Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Rider Stock Section */}
        {!isAdmin && riderStock.length > 0 && (
          <div className="space-y-2 sm:space-y-3">
            <h2 className="text-base sm:text-xl font-bold">Stok Saya</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
              {riderStock.map((stock) => (
                <Card key={stock.product_id} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-4">
                      <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center">
                        {stock.products.image_url ? (
                          <img
                            src={stock.products.image_url}
                            alt={stock.products.name}
                            className="w-full h-full object-cover rounded-lg"
                          />
                        ) : (
                          <Package className="w-8 h-8 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1 space-y-1">
                        <h3 className="font-semibold text-foreground">{stock.products.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          Rp {Number(stock.products.price).toLocaleString("id-ID")}
                        </p>
                        <div className="flex items-center justify-between pt-2">
                          <Badge>Stok: {stock.quantity}</Badge>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedProduct(stock);
                              setReturnDialogOpen(true);
                            }}
                          >
                            <Undo2 className="w-4 h-4 mr-1" />
                            Return
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Products Grid */}
        {isAdmin && products.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Package className="w-16 h-16 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Belum ada produk</p>
              {isAdmin && (
                <Button className="mt-4" variant="outline" onClick={() => setDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Tambah Produk Pertama
                </Button>
              )}
            </CardContent>
          </Card>
        ) : isAdmin ? (
          <div>
            <h2 className="text-2xl font-bold mb-4">Semua Produk</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.map((product) => (
              <Card key={product.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start space-x-4">
                    <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center">
                      {product.image_url ? (
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      ) : (
                        <Package className="w-8 h-8 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 space-y-1">
                      <h3 className="font-semibold text-foreground">{product.name}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {product.description || "Tidak ada deskripsi"}
                      </p>
                      <div className="flex items-center justify-between pt-2">
                        <div>
                          <p className="text-lg font-bold text-primary">
                            Rp {Number(product.price).toLocaleString("id-ID")}
                          </p>
                          <div className="flex gap-2 mt-1">
                            <Badge variant={product.stock_in_warehouse < 10 ? "destructive" : "default"}>
                              Gudang: {product.stock_in_warehouse}
                            </Badge>
                            {productRiderStocks[product.id] && productRiderStocks[product.id].length > 0 && (
                              <Badge variant="outline">
                                Di Rider: {productRiderStocks[product.id].reduce((sum, s) => sum + s.quantity, 0)}
                              </Badge>
                            )}
                          </div>
                          {productRiderStocks[product.id] && productRiderStocks[product.id].length > 0 && (
                            <div className="mt-2 text-xs text-muted-foreground">
                              {productRiderStocks[product.id].map((stock, idx) => (
                                <div key={stock.rider_id}>
                                  • {stock.profiles.full_name}: {stock.quantity} unit
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            </div>
          </div>
        ) : null}

        {/* Return Dialog */}
        <Dialog open={returnDialogOpen} onOpenChange={setReturnDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Return Produk</DialogTitle>
            </DialogHeader>
            {selectedProduct && (
              <div className="space-y-4">
                <div>
                  <p className="font-semibold">{selectedProduct.products.name}</p>
                  <p className="text-sm text-muted-foreground">Stok Anda: {selectedProduct.quantity}</p>
                </div>
                <div className="space-y-2">
                  <Label>Jumlah Return *</Label>
                  <Input
                    type="number"
                    min="1"
                    max={selectedProduct.quantity}
                    value={returnQuantity}
                    onChange={(e) => setReturnQuantity(e.target.value)}
                    placeholder="Masukkan jumlah"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Catatan (Opsional)</Label>
                  <Textarea
                    value={returnNotes}
                    onChange={(e) => setReturnNotes(e.target.value)}
                    placeholder="Alasan return..."
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setReturnDialogOpen(false)}>
                    Batal
                  </Button>
                  <Button onClick={handleReturnProduct}>
                    Ajukan Return
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      <BottomNav isAdmin={isAdmin} />
    </div>
  );
}

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BottomNav } from "@/components/BottomNav";
import { LowStockAlert } from "@/components/LowStockAlert";
import { LoadingScreen } from "@/components/LoadingScreen";
import { BulkReturnTab } from "@/components/BulkReturnTab";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Package, Undo2, Tag, Edit, Trash2, Factory } from "lucide-react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { AddProductionDialog } from "@/components/AddProductionDialog";
import { ProductionHistory } from "@/components/ProductionHistory";

interface Product {
  id: string;
  name: string;
  price: number;
  stock_in_warehouse: number;
  min_stock?: number;
  description: string | null;
  image_url: string | null;
  sku: string | null;
  category_id: string | null;
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
    sku: string | null;
  };
}

const productSchema = z.object({
  name: z.string().trim().min(1, "Nama produk wajib diisi").max(255),
  description: z.string().trim().optional(),
  price: z.string().min(1, "Harga wajib diisi").regex(/^\d+(\.\d{1,2})?$/, "Harga tidak valid"),
  stock_in_warehouse: z.string().min(1, "Stok wajib diisi").regex(/^\d+$/, "Stok harus berupa angka"),
  min_stock: z.string().min(1, "Stok minimal wajib diisi").regex(/^\d+$/, "Stok minimal harus berupa angka"),
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
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedProductForEdit, setSelectedProductForEdit] = useState<Product | null>(null);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [pendingReturns, setPendingReturns] = useState<Set<string>>(new Set()); // Track products with pending returns
  const [productionDialogOpen, setProductionDialogOpen] = useState(false);
  const [selectedProductForProduction, setSelectedProductForProduction] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("products");
  const [riderActiveTab, setRiderActiveTab] = useState("stock"); // Tab for rider: stock or return

  const form = useForm<z.infer<typeof productSchema>>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      description: "",
      price: "",
      stock_in_warehouse: "",
      min_stock: "10",
      category_id: "",
      sku: "",
      image_url: "",
    },
  });

  const editForm = useForm<z.infer<typeof productSchema>>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      description: "",
      price: "",
      stock_in_warehouse: "",
      min_stock: "10",
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
          .in("role", ["admin", "super_admin"])
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
              image_url,
              sku
            )
          `)
          .eq("rider_id", user.id)
          .gt("quantity", 0);

        if (error) throw error;
        setRiderStock(data || []);

        // Fetch pending returns for this rider
        const { data: pendingReturnsData, error: returnsError } = await supabase
          .from("returns")
          .select("product_id")
          .eq("rider_id", user.id)
          .eq("status", "pending");  // Only get pending returns

        if (!returnsError && pendingReturnsData) {
          const pendingProductIds = new Set(pendingReturnsData.map(r => r.product_id));
          setPendingReturns(pendingProductIds);
        }
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

        // Group by product_id (filter out riders without profiles - orphaned data)
        const stocksByProduct: Record<string, ProductRiderStock[]> = {};
        stockData.forEach(stock => {
          const profile = profilesData?.find(p => p.user_id === stock.rider_id);
          
          // Skip if rider profile not found (orphaned data)
          if (!profile) {
            console.warn(`Skipping orphaned stock for rider_id: ${stock.rider_id}, product_id: ${stock.product_id}`);
            return;
          }
          
          if (!stocksByProduct[stock.product_id]) {
            stocksByProduct[stock.product_id] = [];
          }
          
          stocksByProduct[stock.product_id].push({
            rider_id: stock.rider_id,
            quantity: stock.quantity,
            profiles: {
              full_name: profile.full_name
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

  const refreshProducts = async () => {
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
    }
  };

  const refreshRiderStock = async () => {
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
            image_url,
            sku
          )
        `)
        .eq("rider_id", user.id)
        .gt("quantity", 0);

      if (error) throw error;
      setRiderStock(data || []);

      // Fetch pending returns for this rider
      const { data: pendingReturnsData, error: returnsError } = await supabase
        .from("returns")
        .select("product_id")
        .eq("rider_id", user.id)
        .eq("status", "pending");

      if (!returnsError && pendingReturnsData) {
        const pendingProductIds = new Set(pendingReturnsData.map(r => r.product_id));
        setPendingReturns(pendingProductIds);
      }
    } catch (error: any) {
      console.error("Gagal memuat stok rider:", error);
      toast.error("Gagal memuat stok rider");
    }
  };

  const refreshCategories = async () => {
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

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      toast.error("Nama kategori tidak boleh kosong");
      return;
    }

    try {
      const { data, error } = await supabase
        .from("categories")
        .insert({ name: newCategoryName.trim() })
        .select()
        .single();

      if (error) throw error;

      toast.success("Kategori berhasil ditambahkan");
      setNewCategoryName("");
      setCategoryDialogOpen(false);
      
      // Refresh categories and auto-select the new one
      await refreshCategories();
      if (data) {
        form.setValue("category_id", data.id);
      }
    } catch (error: any) {
      if (error.code === '23505') {
        toast.error("Kategori dengan nama ini sudah ada");
      } else {
        toast.error("Gagal menambahkan kategori");
      }
      console.error(error);
    }
  };

  const onSubmit = async (values: z.infer<typeof productSchema>) => {
    try {
      const { error } = await supabase.from("products").insert({
        name: values.name,
        description: values.description || null,
        price: parseFloat(values.price),
        stock_in_warehouse: parseInt(values.stock_in_warehouse),
        min_stock: parseInt(values.min_stock),
        category_id: values.category_id || null,
        sku: values.sku || null,
        image_url: values.image_url || null,
      });

      if (error) throw error;

      toast.success("Produk berhasil ditambahkan");
      setDialogOpen(false);
      form.reset();

      // Refresh products
      await refreshProducts();
    } catch (error: any) {
      toast.error("Gagal menambahkan produk");
      console.error(error);
    }
  };

  const handleEditProduct = (product: Product) => {
    setSelectedProductForEdit(product);
    editForm.setValue("name", product.name);
    editForm.setValue("description", product.description || "");
    editForm.setValue("price", product.price.toString());
    editForm.setValue("stock_in_warehouse", product.stock_in_warehouse.toString());
    editForm.setValue("min_stock", (product.min_stock || 10).toString());
    editForm.setValue("category_id", product.category_id || "");
    editForm.setValue("sku", product.sku || "");
    editForm.setValue("image_url", product.image_url || "");
    setEditDialogOpen(true);
  };

  const onEditSubmit = async (values: z.infer<typeof productSchema>) => {
    if (!selectedProductForEdit) return;

    try {
      const { error } = await supabase
        .from("products")
        .update({
          name: values.name,
          description: values.description || null,
          price: parseFloat(values.price),
          stock_in_warehouse: parseInt(values.stock_in_warehouse),
          min_stock: parseInt(values.min_stock),
          category_id: values.category_id || null,
          sku: values.sku || null,
          image_url: values.image_url || null,
        })
        .eq("id", selectedProductForEdit.id);

      if (error) throw error;

      toast.success("Produk berhasil diupdate");
      setEditDialogOpen(false);
      setSelectedProductForEdit(null);
      editForm.reset();

      // Refresh products
      await refreshProducts();
    } catch (error: any) {
      toast.error("Gagal mengupdate produk");
      console.error(error);
    }
  };

  const handleLowStockProductClick = (product: Product) => {
    // Switch to production tab
    setActiveTab("production");
    
    // Set selected product for production dialog
    setSelectedProductForProduction(product.id);
    
    // Open production dialog
    setProductionDialogOpen(true);
    
    // Show helpful toast
    toast.info(`Menambah produksi untuk: ${product.name}`, {
      description: `Stok saat ini: ${product.stock_in_warehouse} | Min: ${product.min_stock}`,
      duration: 3000,
    });
  };

  if (loading) {
    return <LoadingScreen message="Memuat produk..." />;
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
        {/* Header */}
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gradient">Produk</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">Kelola produk</p>
          </div>
          {isAdmin && (
            <div className="flex gap-2 flex-shrink-0">
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => setProductionDialogOpen(true)}
                className="hidden sm:flex"
              >
                <Factory className="w-4 h-4 mr-2" />
                <span>Tambah Produksi</span>
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => setProductionDialogOpen(true)}
                className="sm:hidden"
              >
                <Factory className="w-4 h-4" />
              </Button>
              
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                    <span className="hidden xs:inline">Tambah</span>
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

                    <FormField
                      control={form.control}
                      name="min_stock"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Stok Minimal *</FormLabel>
                          <FormControl>
                            <Input type="text" placeholder="10" {...field} />
                          </FormControl>
                          <FormDescription className="text-xs">
                            Peringatan akan muncul jika stok ≤ nilai ini
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="space-y-4">
                      <FormField
                        control={form.control}
                        name="category_id"
                        render={({ field }) => (
                          <FormItem>
                            <div className="flex items-center justify-between">
                              <FormLabel>Kategori</FormLabel>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setCategoryDialogOpen(true)}
                                className="h-auto p-1 text-xs"
                              >
                                <Plus className="w-3 h-3 mr-1" />
                                Tambah Kategori
                              </Button>
                            </div>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Pilih kategori" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {categories.length === 0 ? (
                                  <div className="p-2 text-sm text-muted-foreground text-center">
                                    Belum ada kategori. Klik "Tambah Kategori" di atas.
                                  </div>
                                ) : (
                                  categories.map((cat) => (
                                    <SelectItem key={cat.id} value={cat.id}>
                                      {cat.name}
                                    </SelectItem>
                                  ))
                                )}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
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
                    </div>

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
            </div>
          )}
        </div>

        {/* Edit Product Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Produk</DialogTitle>
            </DialogHeader>
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
                <FormField
                  control={editForm.control}
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
                  control={editForm.control}
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
                    control={editForm.control}
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
                    control={editForm.control}
                    name="stock_in_warehouse"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Stok di Gudang *</FormLabel>
                        <FormControl>
                          <Input type="text" placeholder="100" {...field} />
                        </FormControl>
                        <FormDescription className="text-xs">
                          Tambah stok saat produksi baru
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={editForm.control}
                  name="min_stock"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Stok Minimal *</FormLabel>
                      <FormControl>
                        <Input type="text" placeholder="10" {...field} />
                      </FormControl>
                      <FormDescription className="text-xs">
                        Peringatan akan muncul jika stok ≤ nilai ini
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-4">
                  <FormField
                    control={editForm.control}
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
                            {categories.length === 0 ? (
                              <div className="p-2 text-sm text-muted-foreground text-center">
                                Belum ada kategori
                              </div>
                            ) : (
                              categories.map((cat) => (
                                <SelectItem key={cat.id} value={cat.id}>
                                  {cat.name}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={editForm.control}
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

                  <FormField
                    control={editForm.control}
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
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
                    Batal
                  </Button>
                  <Button type="submit">Update Produk</Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Quick Add Category Dialog */}
        <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Tambah Kategori Baru</DialogTitle>
              <DialogDescription>
                Kategori yang ditambahkan akan otomatis dipilih di form produk
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="category-name">Nama Kategori *</Label>
                <Input
                  id="category-name"
                  placeholder="Contoh: Makanan, Minuman, Snack"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddCategory();
                    }
                  }}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setCategoryDialogOpen(false);
                    setNewCategoryName("");
                  }}
                >
                  Batal
                </Button>
                <Button type="button" onClick={handleAddCategory}>
                  <Tag className="w-4 h-4 mr-2" />
                  Simpan Kategori
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Rider View with Tabs */}
        {!isAdmin && (
          <Tabs value={riderActiveTab} onValueChange={setRiderActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="stock" className="text-xs sm:text-sm">
                <Package className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                Stok Saya
              </TabsTrigger>
              <TabsTrigger value="return" className="text-xs sm:text-sm">
                <Undo2 className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                Return
              </TabsTrigger>
            </TabsList>

            <TabsContent value="stock" className="mt-4">
              {riderStock.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                    <Package className="w-16 h-16 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Anda belum memiliki stok produk</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3">
                  {riderStock.map((stock) => (
                    <Card key={stock.product_id} className="overflow-hidden">
                      <CardContent className="p-2 sm:p-3">
                        <div className="space-y-2">
                          <div className="w-full aspect-square rounded-lg bg-muted flex items-center justify-center">
                            {stock.products.image_url ? (
                              <img
                                src={stock.products.image_url}
                                alt={stock.products.name}
                                className="w-full h-full object-cover rounded-lg"
                              />
                            ) : (
                              <Package className="w-8 h-8 sm:w-10 sm:h-10 text-muted-foreground" />
                            )}
                          </div>
                          <div className="space-y-1">
                            <h3 className="font-semibold text-xs sm:text-sm line-clamp-2 leading-tight">
                              {stock.products.name}
                            </h3>
                            <p className="text-xs sm:text-sm text-muted-foreground">
                              Rp {Number(stock.products.price).toLocaleString("id-ID")}
                            </p>
                            <Badge className="text-[10px] sm:text-xs px-1.5 py-0">
                              Stok: {stock.quantity}
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="return" className="mt-4">
              <BulkReturnTab
                riderStock={riderStock}
                pendingReturns={pendingReturns}
                onReturnSuccess={refreshRiderStock}
              />
            </TabsContent>
          </Tabs>
        )}

        {/* Admin View with Tabs */}
        {isAdmin ? (
          <>
            {/* Low Stock Alert - Shown only for admins */}
            <LowStockAlert 
              products={products} 
              onProductClick={handleLowStockProductClick}
            />

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="products" className="text-xs sm:text-sm">
                  <Package className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                  Produk
                </TabsTrigger>
                <TabsTrigger value="production" className="text-xs sm:text-sm">
                <Factory className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                Produksi
              </TabsTrigger>
            </TabsList>

            <TabsContent value="products" className="mt-4">
              {products.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                    <Package className="w-16 h-16 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Belum ada produk</p>
                    <Button className="mt-4" variant="outline" onClick={() => setDialogOpen(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Tambah Produk Pertama
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3">
                  {products.map((product) => (
                    <Card key={product.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                      <CardContent className="p-2 sm:p-3">
                        <div className="space-y-2">
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
                          <div className="space-y-1">
                            <div className="flex items-start justify-between gap-1">
                              <h3 className="font-semibold text-xs sm:text-sm line-clamp-2 leading-tight flex-1">
                                {product.name}
                              </h3>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="flex-shrink-0 h-6 w-6 sm:h-7 sm:w-7"
                                onClick={() => handleEditProduct(product)}
                              >
                                <Edit className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                              </Button>
                            </div>
                            {product.sku && (
                              <p className="text-[10px] sm:text-xs text-muted-foreground">SKU: {product.sku}</p>
                            )}
                            <p className="text-[10px] sm:text-xs text-muted-foreground line-clamp-2">
                              {product.description || "Tidak ada deskripsi"}
                            </p>
                            <p className="text-sm sm:text-base font-bold text-primary">
                              Rp {Number(product.price).toLocaleString("id-ID")}
                            </p>
                            <div className="flex gap-1 flex-wrap">
                              <Badge variant={product.stock_in_warehouse < 10 ? "destructive" : "default"} className="text-[10px] sm:text-xs px-1.5 py-0">
                                Gudang: {product.stock_in_warehouse}
                              </Badge>
                              {productRiderStocks[product.id] && productRiderStocks[product.id].length > 0 && (
                                <Badge variant="outline" className="text-[10px] sm:text-xs px-1.5 py-0">
                                  Rider: {productRiderStocks[product.id].reduce((sum, s) => sum + s.quantity, 0)}
                                </Badge>
                              )}
                            </div>
                            {productRiderStocks[product.id] && productRiderStocks[product.id].length > 0 && (
                              <div className="text-[9px] sm:text-[10px] text-muted-foreground space-y-0.5">
                                {productRiderStocks[product.id].map((stock) => (
                                  <div key={stock.rider_id} className="truncate">
                                    • {stock.profiles.full_name}: {stock.quantity}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="production" className="mt-4">
              <ProductionHistory />
            </TabsContent>
          </Tabs>
          </>
        ) : null}

        {/* Add Production Dialog */}
        <AddProductionDialog
          open={productionDialogOpen}
          onOpenChange={(open) => {
            setProductionDialogOpen(open);
            // Reset selected product when dialog closes
            if (!open) {
              setSelectedProductForProduction(null);
            }
          }}
          products={products}
          onSuccess={refreshProducts}
          preSelectedProductId={selectedProductForProduction}
        />
      </div>

      <BottomNav isAdmin={isAdmin} />
    </div>
  );
}

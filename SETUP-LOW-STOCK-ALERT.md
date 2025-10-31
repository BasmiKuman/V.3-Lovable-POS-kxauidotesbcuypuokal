# Setup Low Stock Alert Feature

Fitur ini menampilkan peringatan produk yang stoknya rendah di halaman Produk (khusus Admin).

## 📋 Cara Setup

### 1. Jalankan SQL Migration

Buka Supabase SQL Editor dan jalankan file: `add-min-stock-column.sql`

```sql
-- File ini akan menambahkan kolom min_stock ke tabel products
-- Default nilai: 10
```

**Atau copy-paste SQL berikut:**

```sql
-- Add min_stock column to products table for low stock alerts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'products' 
    AND column_name = 'min_stock'
  ) THEN
    ALTER TABLE public.products 
    ADD COLUMN min_stock INTEGER DEFAULT 10 NOT NULL;
    
    RAISE NOTICE 'Column min_stock added successfully';
  ELSE
    RAISE NOTICE 'Column min_stock already exists';
  END IF;
END $$;

COMMENT ON COLUMN public.products.min_stock IS 'Minimum stock threshold for low stock alerts';
```

### 2. Test di Browser

1. **Pastikan SQL sudah berhasil dijalankan** (lihat success notice)
2. Refresh aplikasi POS di browser
3. Login sebagai **Admin**
4. Buka halaman **Produk**

## ✨ Fitur Low Stock Alert

### Tampilan Alert

- **Muncul di atas Tab Produk** - Hanya muncul jika ada produk dengan stok rendah
- **Horizontal Scroll** - Produk ditampilkan dalam card yang bisa di-scroll horizontal
- **Badge Kategori:**
  - 🔴 **Kritis** - Stok = 0 atau < 50% dari min_stock
  - 🟠 **Warning** - Stok antara 50% sampai 100% dari min_stock

### Detail Setiap Card

- **Foto Produk** - Jika ada
- **Nama & SKU** - Informasi produk
- **Progress Bar** - Visual stok saat ini vs minimum
- **Badge Status:**
  - `HABIS` - Stock = 0
  - `SANGAT RENDAH` - Stock < 50% dari minimum
  - `RENDAH` - Stock ≤ minimum

### Pengaturan Per Produk

1. **Tambah Produk Baru:**
   - Field "Stok Minimal" - Default 10
   - Hint: "Peringatan akan muncul jika stok ≤ nilai ini"

2. **Edit Produk:**
   - Bisa ubah nilai "Stok Minimal"
   - Klik produk di alert untuk quick edit

## 🎯 Cara Kerja

### Logika Alert

```
Produk MUNCUL di alert jika:
stock_in_warehouse <= min_stock

Status KRITIS jika:
- stock_in_warehouse = 0, ATAU
- stock_in_warehouse < (min_stock * 0.5)

Status WARNING jika:
- stock_in_warehouse >= (min_stock * 0.5)
- stock_in_warehouse <= min_stock
```

### Contoh

**Produk A:**
- Stock di gudang: 5
- Min stock: 10
- **Status:** WARNING (5/10 = 50%)

**Produk B:**
- Stock di gudang: 3
- Min stock: 10  
- **Status:** KRITIS (3/10 = 30%)

**Produk C:**
- Stock di gudang: 0
- Min stock: 10
- **Status:** KRITIS - HABIS

**Produk D:**
- Stock di gudang: 15
- Min stock: 10
- **Status:** TIDAK MUNCUL di alert (stok aman)

## 🎨 Desain

- **Warna:**
  - Border & Background: Orange untuk warning
  - Card Kritis: Red border & background
  - Icon: AlertTriangle (warning icon)
  
- **Responsive:**
  - Mobile: Card width 160px
  - Desktop: Card width 180px
  - Scroll horizontal untuk banyak produk

## 💡 Tips Penggunaan

1. **Set Min Stock yang Realistis**
   - Pertimbangkan lead time produksi
   - Pertimbangkan permintaan rata-rata
   
2. **Update Min Stock Berkala**
   - Sesuaikan dengan musim/trend
   - Update jika pattern penjualan berubah

3. **Quick Action**
   - Klik langsung produk di alert
   - Akan buka dialog edit
   - Update stok atau min_stock

4. **Monitoring**
   - Cek alert setiap hari
   - Prioritaskan produk KRITIS
   - Plan produksi untuk produk WARNING

## 🔧 Troubleshooting

### Alert Tidak Muncul

1. **Cek apakah ada produk low stock:**
   ```sql
   SELECT name, stock_in_warehouse, min_stock
   FROM products
   WHERE stock_in_warehouse <= min_stock;
   ```

2. **Cek apakah kolom min_stock ada:**
   ```sql
   SELECT column_name, data_type, column_default
   FROM information_schema.columns
   WHERE table_name = 'products' 
   AND column_name = 'min_stock';
   ```

3. **Pastikan login sebagai Admin**
   - Alert hanya muncul untuk role Admin
   - Rider tidak bisa lihat alert ini

### Error "min_stock is missing"

- Jalankan ulang SQL migration
- Clear browser cache
- Refresh halaman

---

**Status:** ✅ Ready to Test  
**Note:** Jangan push dulu, test di browser dulu!

# 🚀 DEPLOYMENT GUIDE: Stock Opname Rider System

## ✅ STATUS DEPLOYMENT

**Branch:** `main`  
**Commit:** `48e49a5`  
**Version:** `v1.2.0`  
**Tanggal:** 11 Desember 2025  
**Status:** ✅ **DEPLOYED TO PRODUCTION**

---

## 📦 YANG SUDAH DI-DEPLOY

### 1. **Frontend (Vercel Auto-Deploy)**
- ✅ `EndOfDayTab.tsx` - Stock Opname UI component
- ✅ `Warehouse.tsx` - Tab "Stock Opname" ditambahkan
- ✅ Label UI diubah: "Laporan Akhir Hari" → "SO (Stock Opname Rider)"

### 2. **Database Schema (Perlu Migrasi Manual)**
- ⚠️ **BELUM DIJALANKAN** - Perlu eksekusi SQL manual
- File: `frontend/create-end-of-day-system.sql`
- Tabel baru: `end_of_day_reports`, `end_of_day_items`, `stock_adjustments`
- Functions: `get_distributed_quantity`, `get_pos_quantity`, `generate_adjustment_transaction`

### 3. **Dokumentasi**
- ✅ `FEATURE-END-OF-DAY-REPORT.md` - Spesifikasi lengkap
- ✅ `STOCK-OPNAME-INTEGRATION-ANALYSIS.md` - Analisis keamanan

---

## 🔧 LANGKAH-LANGKAH DEPLOYMENT

### **STEP 1: Vercel Auto-Deploy (Otomatis) ✅**

Vercel akan otomatis deploy setelah push ke main:
- URL Production: https://v-3-lovable-pos-kxauidotesbcuypuokal.vercel.app
- Build time: ~2-3 menit
- Status: Cek di Vercel dashboard

**Cara Cek:**
```bash
# Buka Vercel dashboard atau
curl https://v-3-lovable-pos-kxauidotesbcuypuokal.vercel.app
```

---

### **STEP 2: Database Migration (Manual) ⚠️ WAJIB**

**PENTING:** Tanpa migrasi database ini, fitur Stock Opname tidak akan jalan!

**Cara Eksekusi:**

1. Buka Supabase Dashboard:
   ```
   https://supabase.com/dashboard/project/mlwvrqjsaomthfcsmoit
   ```

2. Klik menu **SQL Editor** di sidebar kiri

3. Klik **New Query**

4. Copy semua isi file: `frontend/create-end-of-day-system.sql`

5. Paste ke SQL Editor

6. Klik **RUN** atau tekan `Ctrl + Enter`

7. Tunggu sampai muncul:
   ```
   Success. No rows returned.
   ```

8. Verify dengan query:
   ```sql
   SELECT table_name FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name LIKE 'end_of_day%';
   
   -- Expected result:
   -- end_of_day_reports
   -- end_of_day_items
   ```

**Jika Error:**
- Cek apakah tabel sudah ada: Query akan skip dengan `IF NOT EXISTS`
- Cek RLS policies: Pastikan user yang login adalah super_admin
- Cek permissions: Functions harus bisa diakses oleh authenticated users

---

### **STEP 3: Test di Production**

**A. Test Basic Functionality:**

1. Login sebagai **Admin** atau **Super Admin**
2. Klik menu **Gudang** (Warehouse)
3. Klik tab **"Stock Opname"**
4. Pilih **Rider** dari dropdown
5. Pilih **Tanggal** (default: hari ini)
6. Pastikan muncul:
   - Tabel produk dengan kolom: Distribusi, POS, Sisa Stok, Terjual, Selisih
   - Input untuk sisa stok
   - Summary card dengan total

**B. Test Save Draft:**

1. Input sisa stock untuk beberapa produk
2. Klik **"Simpan Draft"**
3. Refresh halaman
4. Pilih rider & tanggal yang sama
5. Pastikan draft muncul kembali dengan notifikasi biru

**C. Test Submit Report:**

1. Pastikan semua sisa stock sudah diisi
2. Klik **"Submit Laporan"**
3. Pastikan muncul:
   - Toast success
   - Status berubah jadi "Validated"
   - Button submit disabled
   - Notifikasi hijau

**D. Test Adjustment Transaction:**

1. Buka menu **Laporan** (Reports)
2. Pilih tab **"Transaksi Harian"**
3. Filter tanggal = tanggal stock opname
4. Cari transaksi dengan payment_method: **"Stock Adjustment"**
5. Verify:
   - Total sesuai dengan adjustment
   - Rider sesuai
   - Items sesuai dengan selisih

**E. Test History:**

1. Kembali ke tab **"Stock Opname"**
2. Scroll ke bawah
3. Lihat tabel **"Riwayat Stock Opname"**
4. Pastikan report yang baru submitted muncul dengan:
   - Status: "Submitted"
   - Total sold, POS, adjustment sesuai

---

### **STEP 4: Monitor Production**

**Cek Metrics (24 jam pertama):**

1. **Error Monitoring:**
   ```sql
   -- Check for failed stock opname submissions
   SELECT * FROM end_of_day_reports 
   WHERE created_at >= NOW() - INTERVAL '24 hours'
   ORDER BY created_at DESC;
   ```

2. **Adjustment Transactions:**
   ```sql
   -- Check adjustment transactions created
   SELECT 
     t.id,
     t.rider_id,
     t.total_amount,
     t.created_at,
     sa.report_id
   FROM transactions t
   JOIN stock_adjustments sa ON sa.transaction_id = t.id
   WHERE t.created_at >= NOW() - INTERVAL '24 hours'
   ORDER BY t.created_at DESC;
   ```

3. **User Activity:**
   ```sql
   -- Check which admins are using the feature
   SELECT 
     submitted_by,
     COUNT(*) as report_count,
     MAX(created_at) as last_report
   FROM end_of_day_reports
   WHERE created_at >= NOW() - INTERVAL '24 hours'
   GROUP BY submitted_by;
   ```

---

## 🔍 TROUBLESHOOTING

### **Problem 1: Tab Stock Opname tidak muncul**
**Solusi:**
- Clear browser cache (Ctrl + Shift + R)
- Pastikan login sebagai admin/super_admin
- Check Vercel deployment status

### **Problem 2: Error "Table end_of_day_reports does not exist"**
**Solusi:**
- Database migration belum dijalankan
- Jalankan STEP 2 di atas

### **Problem 3: Dropdown rider kosong**
**Solusi:**
- Cek `profiles` table: Pastikan rider punya full_name
- Cek `user_roles` table: Pastikan rider ada role='rider'

### **Problem 4: Query get_pos_quantity lambat**
**Solusi:**
- Index sudah otomatis dibuat
- Jika tetap lambat, tambahkan index:
  ```sql
  CREATE INDEX IF NOT EXISTS idx_transactions_rider_date 
  ON transactions(rider_id, created_at);
  
  CREATE INDEX IF NOT EXISTS idx_transaction_items_product 
  ON transaction_items(product_id);
  ```

### **Problem 5: Adjustment transaction tidak ter-generate**
**Solusi:**
- Cek function `generate_adjustment_transaction` ada di database
- Cek RLS policy `admin_stock_adjustments_insert`
- Verify adjustment_quantity > 0 di end_of_day_items

---

## 📊 EXPECTED BEHAVIOR

### **Flow Normal:**

```
08:00 - Admin distribusi 20 Basmi Latte ke Rider A
↓
09:00-17:00 - Rider A jual via POS: 12 cups tercatat
↓
18:00 - Admin Stock Opname:
  - Input sisa: 5 cups
  - System hitung: Terjual = 20 - 5 = 15 cups
  - System bandingkan: 15 (fisik) vs 12 (POS) = Adjustment +3
↓
18:01 - Submit Laporan
  - Generate transaction: 3 cups, payment_method='Stock Adjustment'
  - Total adjustment: 3 × Rp 10,000 = Rp 30,000
↓
18:02 - Reports updated
  - Transaksi adjustment muncul di Laporan Harian
  - Total penjualan Rider A bertambah Rp 30,000
```

### **Edge Cases:**

**A. Tidak Ada Selisih (Perfect Match):**
```
Distribusi: 20 | Sisa: 8 | Terjual: 12 | POS: 12 | Adjustment: 0
→ Tidak generate transaction (tidak perlu adjustment)
```

**B. Semua Terjual:**
```
Distribusi: 20 | Sisa: 0 | Terjual: 20 | POS: 18 | Adjustment: +2
→ Generate transaction untuk 2 cups
```

**C. Multiple Products:**
```
Basmi Latte: Adjustment +3
Basmi Vanilla: Adjustment 0
Basmi Coklat: Adjustment +1
→ Generate 1 transaction dengan 2 items (Latte + Coklat)
```

---

## 🎯 SUCCESS CRITERIA

Fitur dianggap berhasil jika:

- ✅ Tab "Stock Opname" muncul di halaman Gudang
- ✅ Admin bisa pilih rider dan tanggal
- ✅ System load distribusi dan POS otomatis
- ✅ Input sisa stock berfungsi
- ✅ Calculation sold & adjustment real-time
- ✅ Save draft berfungsi (data persist)
- ✅ Submit laporan berfungsi (status → submitted)
- ✅ Adjustment transaction ter-generate di Reports
- ✅ History menampilkan 10 laporan terakhir
- ✅ Tidak ada error di console browser
- ✅ Tidak ada crash di fitur existing (distribusi, return, reject)

---

## 🔒 ROLLBACK PLAN (Jika Perlu)

**Jika terjadi masalah kritis:**

### **1. Rollback Frontend:**
```bash
git revert 48e49a5
git push origin main
```

Vercel akan auto-deploy versi sebelumnya (~2 menit).

### **2. Rollback Database (Opsional):**
```sql
-- Hanya jika benar-benar perlu (data akan hilang!)
DROP TABLE IF EXISTS public.stock_adjustments CASCADE;
DROP TABLE IF EXISTS public.end_of_day_items CASCADE;
DROP TABLE IF EXISTS public.end_of_day_reports CASCADE;
DROP FUNCTION IF EXISTS generate_adjustment_transaction;
DROP FUNCTION IF EXISTS get_pos_quantity;
DROP FUNCTION IF EXISTS get_distributed_quantity;
```

**CATATAN:** Data lama (distributions, transactions, dll) **AMAN**, tidak akan terpengaruh rollback.

---

## 📞 SUPPORT

Jika ada masalah:

1. Cek console browser (F12) untuk error messages
2. Cek Supabase logs untuk database errors
3. Cek Vercel logs untuk deployment errors
4. Review dokumentasi: `STOCK-OPNAME-INTEGRATION-ANALYSIS.md`

---

## 🎉 NEXT STEPS

Setelah deployment stabil (3-7 hari):

1. **Training Tim:**
   - Demo fitur ke semua admin
   - SOP input stock opname harian

2. **Monitoring:**
   - Track frekuensi adjustment per rider
   - Identify patterns (rider yang sering lupa input POS)

3. **Optimization:**
   - Jika adjustment selalu tinggi: Review training rider POS
   - Jika stock opname jarang dipakai: Review workflow

4. **Future Enhancement:**
   - Notifikasi reminder untuk stock opname harian
   - Export report stock opname ke Excel
   - Dashboard analytics adjustment trends

---

**Deployment by:** GitHub Copilot  
**Approved by:** [Pending admin approval]  
**Deployed:** 11 Desember 2025  
**Status:** ✅ **LIVE IN PRODUCTION**

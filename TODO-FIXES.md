# 🔧 TODO: Perbaikan yang Masih Perlu Dilakukan

## ✅ SELESAI
- [x] Auto version bump system (v1.0.2)
- [x] Toast position di atas
- [x] Mobile-friendly filter di halaman Laporan
- [x] Return Product Lock (code complete - SQL pending)
- [x] Dashboard Return Approval Mobile (complete)

## ⏳ MASIH PERLU DIPERBAIKI

### 1. **Upload Foto Error (RLS Policy)** 🔴
**Masalah:**
```
Error uploading avatar: StorageApiError: new row violates row-level security policy
```

**Solusi:**
1. Buka Supabase SQL Editor
2. Copy paste SQL dari file `fix-storage-rls.sql`
3. Execute

**File:** `fix-storage-rls.sql` (sudah ada)

**Manual Steps:**
```sql
-- Run di Supabase SQL Editor
-- https://supabase.com/dashboard/project/mlwvrqjsaomthfcsmoit/sql/new

-- Copy semua dari fix-storage-rls.sql
-- Execute
```

---

### 2. **Return Product Lock - SQL Migration** 🔴
**Status:** ✅ Code Complete - ⏳ SQL Pending

**Yang Sudah Dibuat:**
- ✅ SQL Migration: `add-return-status.sql`
- ✅ POS validation: Prevent add to cart if pending return
- ✅ Products validation: Prevent duplicate return submission
- ✅ Dashboard mobile UI: Card-based approval interface
- ✅ TypeScript types: has_pending_return, get_pending_return_info

**Yang Perlu Dilakukan:**
1. **Jalankan SQL Migration** (WAJIB!)
   - Buka Supabase SQL Editor
   - Copy semua dari `add-return-status.sql`
   - Execute
   
2. **Testing:**
   - Test return lock di POS
   - Test prevent duplicate return
   - Test admin approval unlock
   - Test mobile dashboard UI

**Documentation:** Lihat `RETURN-PRODUCT-LOCK-GUIDE.md` untuk panduan lengkap

---

### 3. **Reports - Hilangkan Kolom Pajak** 🟡
**File:** `src/pages/Reports.tsx`

**Yang Perlu Dihapus:**
- Stats card "Pajak"
- Column "Pajak" di tabel transaksi
- totalTax dari calculation
- Export Excel column "Pajak"

**Lines to Remove/Comment:**
- Line 102: `totalTax` calculation
- Line 629-634: Stats card Pajak
- Line 728: TableHead Pajak
- Line 176, 262, 311, 331, 389, 442, 479: Export data

---

### 4. **Reports - Dropdown Riwayat Transaksi per Rider** 🟡
**Requirement:**
- Group transaksi by rider
- Accordion/Dropdown expandable
- Summary per rider (total, qty, revenue)

**Design:**
```
┌─────────────────────────────────┐
│ ▶ Rider 1 - Total: Rp 500.000  │  ← Click to expand
└─────────────────────────────────┘

When expanded:
┌─────────────────────────────────┐
│ ▼ Rider 1 - Total: Rp 500.000  │
│ ┌─────────────────────────────┐ │
│ │ #001 - Kopi - Rp 25.000     │ │
│ │ #002 - Nasi - Rp 15.000     │ │
│ │ ...                         │ │
│ └─────────────────────────────┘ │
└─────────────────────────────────┘
```

**Component:** Use `Accordion` from shadcn/ui

---

### 5. **Reports - Grafik Mobile-Friendly** 🟡
**Masalah:**
- Grafik terlalu kecil di mobile
- Label terpotong
- Tidak informatif

**Solusi:**
- Responsive height (taller on mobile)
- Rotate labels if needed
- Simplify data on mobile (top 5 only)
- Better colors & spacing

**Current Charts:**
- Revenue bar chart
- Product sales chart
- Payment methods pie chart

**Improvements:**
```typescript
<ResponsiveContainer width="100%" height={isMobile ? 250 : 300}>
  <BarChart data={topProducts} margin={{ bottom: isMobile ? 60 : 20 }}>
    // Rotate labels on mobile
    <XAxis 
      dataKey="name" 
      angle={isMobile ? -45 : 0}
      textAnchor={isMobile ? "end" : "middle"}
      height={isMobile ? 80 : 30}
    />
  </BarChart>
</ResponsiveContainer>
```

---

### 6. **Grafik - Tampilkan Informasi Penting** 🟡
**Yang Perlu Ditampilkan:**

**Chart 1: Revenue per Hari** (Bar)
- X-axis: Tanggal
- Y-axis: Total Revenue
- Color: Gradient blue

**Chart 2: Top 5 Produk Terlaris** (Bar)
- X-axis: Nama Produk
- Y-axis: Jumlah Terjual
- Color: Gradient green

**Chart 3: Metode Pembayaran** (Pie)
- Cash vs QRIS vs Transfer
- Percentage + Amount
- Color: Blue, Green, Purple

**Chart 4: Performance per Rider** (Bar)
- X-axis: Nama Rider
- Y-axis: Total Sales
- Color: Gradient orange

---

## 📋 Prioritas

### **HIGH Priority (Harus Segera):**
1. 🔴 Upload Foto RLS → **Manual: Run SQL di Supabase** (`fix-storage-rls.sql`)
2. 🔴 Return Product Lock SQL → **Manual: Run SQL di Supabase** (`add-return-status.sql`)

### **MEDIUM Priority:**
3. 🟡 Reports - Hilangkan Pajak
4. 🟡 Reports - Dropdown per Rider
5. 🟡 Grafik Mobile-Friendly

### **LOW Priority:**
6. 🟢 Grafik - Info Lebih Baik

---

## 🚀 Langkah Eksekusi

### **Step 1: Fix Upload Foto (Manual)**
```bash
# Buka Supabase Dashboard
# https://supabase.com/dashboard/project/mlwvrqjsaomthfcsmoit/sql/new

# Copy semua dari fix-storage-rls.sql
# Paste & Run
# Test upload foto di Settings
```

### **Step 2: Activate Return Product Lock (Manual)**
```bash
# Buka Supabase SQL Editor
# Copy semua dari add-return-status.sql
# Paste & Run

# Test flow:
# 1. Rider submit return
# 2. Try add to cart (should be blocked)
# 3. Admin approve return
# 4. Try add to cart again (should work)
```

### **Step 3: Reports & Charts Improvements**
```bash
# Edit Reports.tsx
# Remove pajak references
# Add Accordion for transactions
# Improve chart responsive
# Better chart data
```

---

## 📝 Notes

**Upload Foto & Return Lock:**
- Harus manual run SQL (2 file)
- Tidak bisa otomatis via code
- Butuh Supabase admin access
- **File SQL sudah siap, tinggal execute!**

**Return Lock Implementation:**
- ✅ Frontend code: COMPLETE
- ⏳ Database migration: PENDING (user action)
- 📚 Full guide: `RETURN-PRODUCT-LOCK-GUIDE.md`

**Mobile Optimization:**
- ✅ Dashboard return: COMPLETE
- ✅ Reports filter: COMPLETE
- Test di real device
- Check horizontal scroll
- Ensure touch-friendly (44px minimum)

---

## ✅ Checklist Completion

**Sudah Selesai:**
- [x] Return lock code implementation
- [x] Dashboard return mobile-friendly
- [x] TypeScript types updated
- [x] Build successful (no errors)

**Masih Perlu:**
- [ ] Upload foto SQL execution (manual)
- [ ] Return lock SQL execution (manual)
- [ ] Test return lock flow
- [ ] Reports pajak removed
- [ ] Reports rider dropdown works
- [ ] Charts responsive & beautiful
- [ ] Charts show important metrics
- [ ] Test di mobile device
- [ ] APK build & distribute

---

**Current Version:** 1.0.2  
**Target Version:** 1.0.3 (after SQL execution & testing)

**Estimasi Waktu:**
- Upload foto SQL: 2 menit (manual)
- Return lock SQL: 2 menit (manual)
- Return lock testing: 10 menit
- Reports improvements: 40-60 menit
- **Total: ~1 jam**

**Priority Order:**
1. Run `fix-storage-rls.sql` (2 min)
2. Run `add-return-status.sql` (2 min)
3. Test return lock feature (10 min)
4. Reports improvements (60 min)

# 🔒 Return Product Lock - Panduan Implementasi

## ✅ Fitur yang Sudah Diimplementasikan

### 1. Database Migration (SQL)
File: `add-return-status.sql`

**Fitur:**
- Menambahkan kolom `status` pada tabel `return_history` (pending/approved/rejected)
- Membuat function `has_pending_return(product_id, rider_id)` untuk cek status lock
  - **FIXED:** Sekarang cek di tabel `returns` (pending) bukan `return_history` (approved)
- Membuat function `get_pending_return_info(product_id, rider_id)` untuk detail return
- Membuat index untuk performa query yang lebih baik
- Update semua record lama ke status 'approved'

### 2. Frontend - POS Page (`src/pages/POS.tsx`)
**Validasi saat menambah produk ke cart:**
- ✅ Cek `has_pending_return` sebelum produk ditambahkan ke cart
- ✅ Tampil toast warning jika produk sedang dalam proses return
- ✅ Blokir penambahan produk ke cart sampai return disetujui
- ✅ Pesan error: *"Produk sedang dalam proses return, menunggu persetujuan admin"*

### 3. Frontend - Products Page (`src/pages/Products.tsx`)
**Validasi saat mengajukan return:**
- ✅ Cek `has_pending_return` sebelum submit return baru
- ✅ Blokir pengajuan return duplikat untuk produk yang sama
- ✅ Tampil toast warning jika sudah ada return pending
- ✅ Pesan error: *"Produk ini sudah memiliki pengajuan return yang menunggu persetujuan admin"*
- ✅ **Tombol Return diganti dengan Badge "Menunggu Approval"** jika ada pending return
- ✅ Auto-refresh pending returns setelah submit return baru
- ✅ Load pending returns saat halaman dibuka

### 4. Frontend - Dashboard Page (`src/pages/Dashboard.tsx`)
**Mobile-friendly approval interface:**
- ✅ Layout responsif dengan Card-based design untuk mobile
- ✅ Desktop tetap menggunakan table format
- ✅ Update handleApproveReturn untuk set `status: "approved"`
- ✅ Filter hanya menampilkan return dengan `status: "pending"`
- ✅ Icon dan badge untuk info visual yang lebih baik

### 5. TypeScript Type Definitions
File: `src/integrations/supabase/types.ts`

**Update:**
- ✅ Tambah `status: string | null` pada return_history types
- ✅ Tambah function definitions: `has_pending_return`, `get_pending_return_info`
- ✅ Type safety untuk semua operasi database

---

## 📋 LANGKAH-LANGKAH EKSEKUSI

### STEP 1: Jalankan SQL Migration (WAJIB!)

**⚠️ PENTING: SQL ini HARUS dijalankan dulu sebelum fitur bisa berfungsi!**

1. Buka Supabase Dashboard: https://supabase.com/dashboard
2. Pilih project: `mlwvrqjsaomthfcsmoit`
3. Klik menu **SQL Editor** (di sidebar kiri)
4. Klik **New Query**
5. Copy seluruh isi file `add-return-status.sql`
6. Paste ke SQL Editor
7. Klik tombol **Run** (atau tekan Ctrl+Enter)

**Verifikasi:**
```sql
-- Cek apakah kolom status sudah ada
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'return_history' 
AND column_name = 'status';

-- Cek apakah function sudah dibuat
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name IN ('has_pending_return', 'get_pending_return_info');

-- Test function dengan data real (jika ada pending return, hasil = true)
SELECT has_pending_return(
    (SELECT product_id FROM returns LIMIT 1),
    (SELECT rider_id FROM returns LIMIT 1)
) as "Has Pending Return Test";

-- Lihat semua pending returns
SELECT 
    r.id,
    p.name as product_name,
    pr.full_name as rider_name,
    r.quantity,
    r.notes,
    r.returned_at
FROM returns r
JOIN products p ON r.product_id = p.id
JOIN profiles pr ON r.rider_id = pr.user_id
ORDER BY r.returned_at DESC;
```

### STEP 2: Jalankan SQL untuk Storage RLS (Optional - untuk upload foto)

File: `fix-storage-rls.sql`

Jika masih ada error upload foto avatar, jalankan SQL ini juga:

1. Buka SQL Editor di Supabase
2. Copy seluruh isi `fix-storage-rls.sql`
3. Paste dan **Run**

---

## 🧪 CARA TESTING

### Test 1: Return Product Lock di POS
1. Login sebagai **Rider**
2. Buka halaman **Products** (Produk)
3. Pilih produk yang ada stoknya
4. Klik **Return Produk**
5. Isi jumlah dan notes, submit
6. Buka halaman **POS**
7. **Coba tambahkan produk yang sama ke cart**
   - ❌ Seharusnya **DIBLOKIR**
   - ✅ Muncul toast: *"Produk sedang dalam proses return, menunggu persetujuan admin"*

### Test 2: Prevent Duplicate Returns
1. Sudah punya return pending dari Test 1
2. Buka **Products** lagi
3. **Coba return produk yang sama lagi**
   - ❌ Seharusnya **DIBLOKIR**
   - ✅ Muncul toast: *"Produk ini sudah memiliki pengajuan return yang menunggu persetujuan admin"*

### Test 3: Admin Approval Unlock
1. Login sebagai **Admin**
2. Buka **Dashboard**
3. Lihat daftar return pending (tampil di Card untuk mobile, Table untuk desktop)
4. Klik tombol **Approve**
5. Return status berubah ke 'approved'
6. **Logout dan login sebagai Rider lagi**
7. Buka **POS**
8. **Coba tambahkan produk yang tadi**
   - ✅ Sekarang **BISA ditambahkan** ke cart!
   - Produk sudah **unlocked** setelah approval

### Test 4: Mobile Dashboard UI
1. Login sebagai **Admin**
2. Buka **Dashboard** di browser mobile (atau resize browser jadi kecil)
3. Cek tampilan return approval:
   - ✅ Layout Card (bukan table)
   - ✅ Ada icon Users dan Package
   - ✅ Badge untuk quantity
   - ✅ Info rider name, product, notes, date
   - ✅ **TIDAK ada horizontal scroll**

---

## 🔄 WORKFLOW LENGKAP

```
1. RIDER: Ajukan Return Produk
   ├─> Products page -> Klik "Return Produk"
   ├─> Isi jumlah dan notes
   └─> Submit ✅
       └─> Insert ke table "returns" dengan status "pending"
           └─> Produk STATUS: 🔒 LOCKED

2. PRODUK LOCKED - Tidak Bisa Transaksi
   ├─> POS: Tidak bisa tambah ke cart ❌
   ├─> Products: Tidak bisa return lagi (duplikat) ❌
   └─> Dashboard: Muncul di daftar "Pending Approval" ⏳

3. ADMIN: Approve Return
   ├─> Dashboard -> Lihat daftar pending returns
   ├─> Klik tombol "Approve" ✅
   └─> Proses:
       ├─> Update warehouse stock (+quantity)
       ├─> Update rider stock (-quantity)
       ├─> Insert ke return_history (status: "approved")
       ├─> Delete dari table "returns"
       └─> Produk STATUS: 🔓 UNLOCKED

4. PRODUK UNLOCKED - Bisa Transaksi Normal
   ├─> POS: Bisa tambah ke cart ✅
   └─> Products: Bisa return lagi (jika diperlukan) ✅
```

---

## 📊 DATABASE SCHEMA UPDATE

### Table: `return_history`
```sql
Column: status
Type: VARCHAR
Constraint: CHECK (status IN ('pending', 'approved', 'rejected'))
Default: 'approved' (untuk backward compatibility)
```

### Function: `has_pending_return(product_id UUID, rider_id UUID)`
```sql
Returns: BOOLEAN
Logic: 
  - Cek table "returns" 
  - WHERE product_id = $1 AND rider_id = $2 AND status = 'pending'
  - Return TRUE jika ada, FALSE jika tidak
```

### Function: `get_pending_return_info(product_id UUID, rider_id UUID)`
```sql
Returns: TABLE (quantity INT, notes TEXT, returned_at TIMESTAMPTZ)
Logic:
  - SELECT quantity, notes, returned_at FROM "returns"
  - WHERE product_id = $1 AND rider_id = $2 AND status = 'pending'
  - Untuk ditampilkan di UI (info detail return pending)
```

---

## 🎯 PENINGKATAN UX

### 1. Visual Indicators (Future Enhancement - Optional)
Tambahkan badge "Pending Return" di card produk:
```tsx
{hasPendingReturn && (
  <Badge variant="destructive" className="absolute top-2 right-2">
    <Lock className="w-3 h-3 mr-1" />
    Return Pending
  </Badge>
)}
```

### 2. Tooltip Explanation (Future Enhancement - Optional)
Tambahkan tooltip saat hover di produk yang locked:
```tsx
<Tooltip>
  <TooltipContent>
    Produk sedang menunggu approval return dari admin
  </TooltipContent>
</Tooltip>
```

---

## 🐛 TROUBLESHOOTING

### Error: "must be owner of table objects"
**Penyebab:** Mencoba ALTER TABLE storage.objects (tidak punya permission)
**Solusi:** Sudah fixed di `fix-storage-rls.sql` v2 (tanpa ALTER TABLE)

### Error: "has_pending_return is not a function"
**Penyebab:** SQL migration belum dijalankan
**Solusi:** Jalankan `add-return-status.sql` di Supabase SQL Editor

### Error: TypeScript - "Argument of type 'has_pending_return' not assignable"
**Penyebab:** Type definitions belum update
**Solusi:** Sudah fixed di `src/integrations/supabase/types.ts`

### Products tetap bisa ditambahkan ke cart meskipun ada pending return
**Penyebab:** 
1. SQL migration belum dijalankan, atau
2. Cache browser, atau
3. Function RPC tidak dipanggil dengan benar

**Solusi:**
1. Pastikan SQL migration sudah dijalankan
2. Hard refresh browser (Ctrl+Shift+R)
3. Check console log untuk error

---

## 📝 CHECKLIST DEPLOYMENT

- [ ] **Step 1:** Jalankan `add-return-status.sql` di Supabase
- [ ] **Step 2:** Verify function created (check SQL verification queries)
- [ ] **Step 3:** Jalankan `fix-storage-rls.sql` (jika perlu fix upload foto)
- [ ] **Step 4:** Build aplikasi: `npm run build`
- [ ] **Step 5:** Test di development (npm run dev)
  - [ ] Test return lock di POS
  - [ ] Test prevent duplicate return di Products
  - [ ] Test admin approval di Dashboard
  - [ ] Test mobile UI di Dashboard
- [ ] **Step 6:** Build APK: `npm run build && cd android && ./gradlew assembleRelease`
- [ ] **Step 7:** Test APK di device Android
- [ ] **Step 8:** Deploy & distribute

---

## 📞 SUPPORT

Jika ada masalah atau pertanyaan:
1. Check console log browser (F12 -> Console)
2. Check Supabase logs (Dashboard -> Logs)
3. Verify SQL functions exist (run verification queries)
4. Test dengan hard refresh (Ctrl+Shift+R)

---

## 🎉 SUMMARY

**Fitur Return Product Lock sudah LENGKAP implementasi code-nya!**

Yang perlu dilakukan:
1. ✅ Jalankan SQL migration (`add-return-status.sql`) - **WAJIB!**
2. ✅ (Optional) Jalankan storage RLS fix (`fix-storage-rls.sql`)
3. ✅ Test semua fitur
4. ✅ Build & Deploy

**Setelah SQL dijalankan, fitur akan langsung aktif!**

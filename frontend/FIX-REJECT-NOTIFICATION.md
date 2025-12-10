# Fix: Reject Notification System

## 🐛 Bug yang Diperbaiki

### Masalah:
1. ❌ **Tidak ada notifikasi** di Dashboard admin ketika rider melakukan reject
2. ❌ **Reject history tidak tersimpan** ketika admin approve/reject produk rusak

### Dampak:
- Admin tidak tahu ada produk rusak yang perlu dikonfirmasi
- Tidak ada audit trail untuk produk yang direject
- Data reject hilang tanpa jejak

---

## ✅ Solusi yang Diimplementasikan

### 1. **RejectsAccordion Component** (NEW)
**File:** `src/components/RejectsAccordion.tsx`

Komponen untuk menampilkan pending rejects dengan tema merah (danger):

#### Fitur:
- ✅ Grouping by rider dengan avatar
- ✅ Gambar produk dengan overlay warning (AlertTriangle)
- ✅ Badge merah "X pcs RUSAK"
- ✅ **Alasan reject ditampilkan prominently** dalam box merah
- ✅ Warning box kuning: "⚠️ Produk tidak akan kembali ke stok gudang"
- ✅ Dual buttons:
  - **Tolak** (outline) - untuk menolak reject request
  - **Konfirmasi Reject** (red destructive) - untuk approve
- ✅ Smooth removal animation setelah approve/reject

#### UI Theme:
```tsx
- Border: border-red-200 dark:border-red-900
- Avatar: bg-red-100 text-red-600
- Badge: variant="destructive" 
- Button: variant="destructive" for approve
- Icon: PackageX, AlertTriangle
```

---

### 2. **Dashboard Integration**

**File:** `src/pages/Dashboard.tsx`

#### State Baru:
```typescript
const [rejects, setRejects] = useState<RejectRequest[]>([]);
const [processingRejectId, setProcessingRejectId] = useState<string | null>(null);
const [removingRejectIds, setRemovingRejectIds] = useState<Set<string>>(new Set());
```

#### Interface Baru:
```typescript
interface RejectRequest {
  id: string;
  quantity: number;
  notes: string | null;
  returned_at: string;
  product_id: string;
  rider_id: string;
  status?: "pending" | "approved" | "rejected";
  products: { name: string; price: number; };
  profiles: { full_name: string; };
}
```

---

### 3. **Fetch Pending Rejects**

#### Function: `fetchRejects()`
```typescript
const fetchRejects = async () => {
  // 1. Fetch rejects dengan status pending
  const { data: rejectsData } = await supabase
    .from("rejects" as any)  // as any karena belum di Supabase types
    .select(`
      id, quantity, notes, returned_at,
      product_id, rider_id, status,
      products (name, price)
    `)
    .eq("status", "pending")
    .order("returned_at", { ascending: false });

  // 2. Fetch rider profiles
  const riderIds = rejectsData.map(r => r.rider_id);
  const { data: profilesData } = await supabase
    .from("profiles")
    .select("user_id, full_name")
    .in("user_id", riderIds);

  // 3. Map profiles ke rejects
  const rejectsWithProfiles = rejectsData.map(rejectItem => ({
    ...rejectItem,
    profiles: { full_name: profilesMap.get(rejectItem.rider_id) || "N/A" }
  }));

  setRejects(rejectsWithProfiles);
};
```

**Called in:**
- `useEffect()` - saat Dashboard load
- `handleRefresh()` - saat user refresh

---

### 4. **Approve Reject Handler**

#### Function: `handleApproveReject()`

**Flow:**
```typescript
1. Get current rider stock
   ↓
2. Reduce rider_stock (atau delete jika 0)
   ├─ Jika stock >= quantity: update quantity
   └─ Jika stock < quantity: log warning (sudah terjual)
   ↓
3. Save to reject_history dengan status "approved"
   ├─ product_id, rider_id, quantity
   ├─ notes (alasan reject)
   ├─ returned_at, approved_at
   └─ approved_by (admin ID)
   ↓
4. Delete dari rejects table
   ↓
5. Toast success: "Reject berhasil dikonfirmasi (produk rusak tidak masuk gudang)"
   ↓
6. Smooth removal animation (300ms)
```

#### Key Point:
```typescript
// ❗ PENTING: Reject TIDAK menambah stok gudang
// Return → stok gudang naik (produk masih bisa dijual)
// Reject → stok gudang TIDAK naik (produk rusak/kadaluarsa)
```

---

### 5. **Reject Handler** (Tolak Reject)

#### Function: `handleRejectReject()`

**Flow:**
```typescript
1. Save to reject_history dengan status "rejected"
   ├─ Admin menolak permintaan reject
   └─ Rider tetap bertanggung jawab atas produk
   ↓
2. Delete dari rejects table
   ↓
3. Toast: "Reject ditolak"
   ↓
4. Remove dari list
```

---

### 6. **UI Component di Dashboard**

#### Location: Setelah "Permintaan Return"

```tsx
{/* Reject Requests for Admin - Enhanced */}
{isAdmin && rejects.length > 0 && (
  <EnhancedCard
    title="Permintaan Reject"
    description="Produk rusak/kadaluarsa dari rider"
    icon={PackageX}
    iconColor="destructive"  // Red theme
    variant="glass"
    className="animate-fade-in-up border-red-200 dark:border-red-900"
    style={{ animationDelay: "550ms" }}
    headerAction={
      <NotificationBadge 
        count={rejects.length} 
        variant="destructive"  // Red badge
        pulse  // Pulsing animation
      >
        <div className="w-8 h-8" />
      </NotificationBadge>
    }
  >
    <RejectsAccordion
      rejects={rejects}
      processingRejectId={processingRejectId}
      removingRejectIds={removingRejectIds}
      onApprove={handleApproveReject}
      onReject={handleRejectReject}
    />
  </EnhancedCard>
)}
```

#### Features:
- ✅ Red border theme
- ✅ PackageX icon (damaged package)
- ✅ Red notification badge dengan pulse
- ✅ Hanya muncul jika ada pending rejects
- ✅ Staggered animation (550ms delay)

---

## 🔄 Complete Flow

### Rider Side:
```
1. Rider buka Products → Tab "Reject"
2. Pilih produk yang rusak/kadaluarsa
3. Isi quantity dan alasan reject
4. Submit → masuk ke rejects table (status: pending)
5. Produk tersebut di-filter dari available stock
```

### Admin Side:
```
1. Dashboard menampilkan notifikasi merah
2. Badge menunjukkan jumlah pending rejects
3. Klik accordion untuk expand by rider
4. Lihat detail:
   - Gambar produk dengan warning overlay
   - Alasan reject dalam box merah
   - Warning: tidak masuk gudang
5. Pilih action:
   
   A. KONFIRMASI REJECT:
      ├─ Rider stock berkurang
      ├─ Produk TIDAK masuk gudang
      ├─ Simpan ke reject_history (approved)
      └─ Hapus dari rejects
   
   B. TOLAK:
      ├─ Rider tetap bertanggung jawab
      ├─ Simpan ke reject_history (rejected)
      └─ Hapus dari rejects
```

---

## 📊 Database Tables

### `rejects` (Pending)
```sql
CREATE TABLE rejects (
  id UUID PRIMARY KEY,
  rider_id UUID NOT NULL,
  product_id UUID NOT NULL,
  quantity INTEGER NOT NULL,
  notes TEXT,  -- Alasan reject (rusak, kadaluarsa, dll)
  status TEXT DEFAULT 'pending',
  returned_at TIMESTAMP,
  approved_at TIMESTAMP,
  approved_by UUID
);
```

### `reject_history` (Archive)
```sql
CREATE TABLE reject_history (
  id UUID PRIMARY KEY,
  rider_id UUID NOT NULL,
  product_id UUID NOT NULL,
  quantity INTEGER NOT NULL,
  notes TEXT,  -- Alasan reject
  returned_at TIMESTAMP NOT NULL,
  approved_at TIMESTAMP NOT NULL,
  approved_by UUID NOT NULL,
  status TEXT NOT NULL  -- 'approved' atau 'rejected'
);
```

---

## 🎨 Visual Differences

### Return (Blue/Green):
- ✅ Undo2 icon
- ✅ Border biru
- ✅ Badge biru/hijau
- ✅ Button hijau "Setujui"
- ✅ Produk MASUK gudang

### Reject (Red):
- ❌ PackageX icon dengan AlertTriangle
- ❌ Border merah
- ❌ Badge merah "RUSAK"
- ❌ Button merah "Konfirmasi Reject"
- ❌ Produk TIDAK masuk gudang
- ⚠️ Warning box kuning

---

## 🧪 Testing

### Test Case 1: Rider Submit Reject
```
1. Login sebagai rider
2. Buka Products → Reject tab
3. Pilih produk (misal: Kopi Sachet 20 pcs)
4. Isi alasan: "Kemasan rusak terkena air hujan"
5. Submit
6. ✅ Produk muncul di pending rejects
7. ✅ Produk tidak bisa direject lagi (filtered)
```

### Test Case 2: Admin Approve Reject
```
1. Login sebagai admin
2. Buka Dashboard
3. ✅ Notifikasi merah muncul dengan badge count
4. Klik accordion "Permintaan Reject"
5. Lihat detail reject dari rider
6. Klik "Konfirmasi Reject"
7. ✅ Toast: "Reject berhasil dikonfirmasi (produk rusak tidak masuk gudang)"
8. ✅ Reject hilang dari dashboard dengan animation
9. ✅ Cek Products → Gudang: stok TIDAK bertambah
10. ✅ Cek Products → Reject History: muncul dengan status approved
```

### Test Case 3: Admin Tolak Reject
```
1. Login sebagai admin
2. Buka Dashboard → Permintaan Reject
3. Klik "Tolak"
4. ✅ Toast: "Reject ditolak"
5. ✅ Simpan ke reject_history dengan status rejected
6. ✅ Rider masih bertanggung jawab atas produk
```

### Test Case 4: Refresh Dashboard
```
1. Buka Dashboard
2. Klik tombol refresh
3. ✅ fetchRejects() dipanggil
4. ✅ Pending rejects di-update
5. ✅ Badge count di-update
```

---

## 🔍 Type Safety Note

### Temporary `as any` Usage:
```typescript
// Karena tabel rejects & reject_history belum ada di Supabase types
await supabase.from("rejects" as any)
await supabase.from("reject_history" as any)

// Setelah generate types dari Supabase:
// npm run update-types
// Maka 'as any' bisa dihapus
```

---

## 📝 Version

**Version:** 1.1.14
**Date:** 10 Desember 2025

### Commits:
1. `82d2a2c` - Initial reject system (tables, components, tabs)
2. `82213bc` - Fix reject notification system (Dashboard integration)

---

## 🎯 Summary

### ✅ Fixed:
1. **Notifikasi reject** sekarang muncul di Dashboard admin
2. **Reject history tersimpan** dengan lengkap (approved/rejected)
3. **Visual distinction** jelas antara Return (biru) dan Reject (merah)
4. **Audit trail** lengkap untuk produk rusak

### 🚀 Impact:
- Admin dapat langsung melihat produk rusak yang perlu dikonfirmasi
- Transparansi penuh untuk produk yang tidak layak jual
- Stok gudang akurat (tidak termasuk produk rusak)
- Data historis lengkap untuk analisis kerugian

### 💡 Key Difference:
```
RETURN ✅ → Produk kembali ke gudang (masih bisa dijual)
REJECT ❌ → Produk tidak kembali (rusak/kadaluarsa)
```

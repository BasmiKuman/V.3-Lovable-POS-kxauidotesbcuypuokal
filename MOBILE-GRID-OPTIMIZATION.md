# Mobile Grid Layout Optimization

## 🎯 Tujuan
Mengoptimalkan tampilan mobile (APK) agar menggunakan **grid 2 kolom** di semua halaman, bukan list kebawah. Ini membuat:
- ✅ Scroll lebih pendek
- ✅ Lebih banyak produk terlihat di layar
- ✅ Tampilan lebih rapi seperti kotak-kotak

---

## 📱 Perubahan di Setiap Halaman

### 1. **Halaman Kasir/POS (Rider)**
**File:** `src/pages/POS.tsx`

**Sebelum:**
- Mobile: 1 kolom (list kebawah)
- Desktop: 2 kolom

**Sesudah:**
- Mobile: **2 kolom grid**
- Desktop: **2 kolom grid**

**Layout Mobile:**
```
┌────────┐ ┌────────┐
│ [img]  │ │ [img]  │
│ Beras  │ │ Gula   │
│ 50k    │ │ 15k    │
│ Stok:10│ │ Stok:80│
│  [+]   │ │  [+]   │
└────────┘ └────────┘
┌────────┐ ┌────────┐
│ [img]  │ │ [img]  │
│ Minyak │ │ Telur  │
...
```

**Perubahan Kode:**
```tsx
// SEBELUM:
<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
  <div className="flex items-start gap-2"> {/* horizontal layout */}
    <div className="w-12 h-12">...</div> {/* gambar kecil */}
  </div>
</div>

// SESUDAH:
<div className="grid grid-cols-2 gap-2"> {/* always 2 columns */}
  <div className="flex flex-col gap-2"> {/* vertical layout */}
    <div className="w-full aspect-square">...</div> {/* gambar penuh */}
  </div>
</div>
```

**Optimalisasi:**
- Gambar: `aspect-square` (kotak sempurna)
- Text: `text-xs` untuk mobile, `sm:text-sm` untuk desktop
- Badge: `text-[10px]` dengan `px-1.5 py-0` (compact)
- Button: `h-6` mobile, `sm:h-7` desktop

---

### 2. **Halaman Distribusi (Admin Gudang)**
**File:** `src/pages/Warehouse.tsx`

**Sebelum:**
- Mobile: 1 kolom (list kebawah dengan table)
- Desktop: 2 kolom

**Sesudah:**
- Mobile: **2 kolom grid card**
- Desktop: **2 kolom grid card**

**Layout Mobile:**
```
┌────────────┐ ┌────────────┐
│   [img]    │ │   [img]    │
│  Beras 5kg │ │ Gula Pasir │
│  Rp 50.000 │ │ Rp 15.000  │
│  🏷️ Stok: 100│ │ 🏷️ Stok: 80 │
│  Jumlah    │ │  Jumlah    │
│  [_____]   │ │  [_____]   │
└────────────┘ └────────────┘
```

**Perubahan Kode:**
```tsx
// SEBELUM: Table layout
<Table>
  <TableRow>
    <TableCell>Produk | Stok | Harga | Jumlah</TableCell>
  </TableRow>
</Table>

// SESUDAH: Grid card layout
<div className="grid grid-cols-2 gap-2">
  <Card>
    <div className="space-y-2">
      <div className="w-full aspect-square">...</div>
      <h3 className="text-xs line-clamp-2">...</h3>
      <Badge className="text-[10px]">...</Badge>
      <Input className="h-7 text-xs" />
    </div>
  </Card>
</div>
```

**Optimalisasi:**
- Label: `text-[10px]` (sangat kecil untuk hemat ruang)
- Input: `h-7` dengan `text-xs`
- Layout: Vertikal penuh (gambar → info → input)

---

### 3. **Halaman Produk (Admin & Rider)**
**File:** `src/pages/Products.tsx`

**Sebelum:**
- Mobile: 1 kolom (list kebawah)
- Desktop: 3 kolom

**Sesudah:**
- Mobile: **2 kolom grid**
- Desktop: **3 kolom grid**

**Layout Mobile (Rider - "Stok Saya"):**
```
┌─────────┐ ┌─────────┐
│  [img]  │ │  [img]  │
│ Beras   │ │ Gula    │
│ 50.000  │ │ 15.000  │
│ Stok: 5 │ │ Stok: 10│
│ [Return]│ │ [Return]│
└─────────┘ └─────────┘
```

**Layout Mobile (Admin - "Semua Produk"):**
```
┌─────────┐ ┌─────────┐
│  [img]  │ │  [img]  │
│ Beras ✏️│ │ Gula  ✏️│
│ SKU-001 │ │ SKU-002 │
│ Desc... │ │ Desc... │
│ 50.000  │ │ 15.000  │
│ G:100   │ │ G:80    │
│ R:20    │ │ R:15    │
└─────────┘ └─────────┘
```

**Perubahan Kode:**
```tsx
// SEBELUM:
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
  <div className="flex items-start space-x-4">
    <div className="w-16 h-16">...</div>
  </div>
</div>

// SESUDAH:
<div className="grid grid-cols-2 md:grid-cols-3"> {/* 2 mobile, 3 desktop */}
  <div className="space-y-2">
    <div className="w-full aspect-square">...</div>
    <h3 className="text-xs line-clamp-2">...</h3>
  </div>
</div>
```

**Optimalisasi:**
- Edit button: `h-6 w-6` (sangat kecil)
- SKU & description: `text-[10px]`
- Rider info: `text-[9px]` (paling kecil)
- Badge: Compact dengan `px-1.5 py-0`

---

## 🎨 Design System untuk Mobile

### Typography Scale:
```
text-[9px]   = Info detail terkecil (rider distribution)
text-[10px]  = Label, badge, secondary info
text-xs      = Body text, product name
text-sm      = Price, primary info
text-base    = Headers (only on desktop)
```

### Spacing Scale:
```
gap-1        = 4px  - Tight spacing inside card
gap-2        = 8px  - Default grid gap mobile
sm:gap-3     = 12px - Desktop grid gap
p-2          = 8px  - Card padding mobile
sm:p-3       = 12px - Card padding desktop
```

### Component Sizes:
```
Badge:    text-[10px] px-1.5 py-0
Button:   h-6 sm:h-7 text-[10px] sm:text-xs
Input:    h-7 sm:h-8 text-xs sm:text-sm
Icon:     w-3 h-3 sm:w-4 sm:h-4
```

### Image Aspect Ratio:
```
aspect-square  = 1:1 (kotak sempurna)
w-full         = Lebar penuh container
object-cover   = Crop gambar tanpa distorsi
```

---

## 📊 Perbandingan Scroll

### Mobile List (1 kolom):
- 1 produk = ~120px tinggi
- 10 produk = ~1200px scroll
- Viewport (~800px) = scroll 400px lebih

### Mobile Grid (2 kolom):
- 2 produk = ~150px tinggi (per row)
- 10 produk = 5 rows × 150px = ~750px scroll
- Viewport (~800px) = hampir tidak perlu scroll!

**Penghematan scroll: ~37%** 🎉

---

## ✅ Checklist Testing di APK

Setelah build & install APK baru:

### Test Kasir (Rider):
- [ ] Login sebagai rider
- [ ] Buka halaman Kasir/POS
- [ ] Produk tampil 2 kolom grid
- [ ] Gambar kotak penuh, bukan bulat kecil
- [ ] Text readable (tidak terlalu kecil)
- [ ] Button + bisa diklik dengan mudah
- [ ] Scroll lebih pendek dari sebelumnya

### Test Distribusi (Admin):
- [ ] Login sebagai admin
- [ ] Buka Gudang → Tab Distribusi
- [ ] Produk tampil 2 kolom grid card
- [ ] Gambar kotak penuh
- [ ] Input jumlah mudah diketik
- [ ] Badge stok terlihat jelas
- [ ] Scroll lebih pendek

### Test Produk (Admin):
- [ ] Login sebagai admin
- [ ] Buka halaman Produk
- [ ] Produk tampil 2 kolom di mobile
- [ ] Edit button (✏️) masih bisa diklik
- [ ] Info stok gudang & rider terlihat
- [ ] Scroll lebih pendek

### Test Produk (Rider):
- [ ] Login sebagai rider
- [ ] Buka halaman Produk
- [ ] Stok tampil 2 kolom grid
- [ ] Button "Return" bisa diklik
- [ ] Badge "Menunggu Approval" terlihat jelas

---

## 🚀 Build & Deploy

```bash
# 1. Commit perubahan
git add -A
git commit -m "feat: Optimalisasi mobile grid 2 kolom"

# 2. Push ke GitHub (trigger APK build)
git push origin main

# 3. Tunggu GitHub Actions selesai (~5-10 menit)
# Check: https://github.com/fadlann/V.3-Lovable-POS-kxauidotesbcuypuokal/actions

# 4. Download APK baru dari Artifacts

# 5. Uninstall aplikasi lama SEPENUHNYA

# 6. Install APK baru

# 7. Test semua checklist di atas
```

---

## 📝 Notes

- **Line-clamp-2**: Text maksimal 2 baris, sisanya "..."
- **Truncate**: Text 1 baris, sisanya "..."
- **aspect-square**: Gambar selalu kotak 1:1
- **flex-col**: Layout vertikal (gambar di atas, text di bawah)
- **gap-2**: Jarak antar card 8px (pas untuk mobile)

---

## 🎯 Hasil Akhir

**Desktop:**
- POS: 2 kolom
- Distribusi: 2 kolom
- Produk Admin: 3 kolom
- Produk Rider: 3 kolom

**Mobile (APK):**
- POS: **2 kolom** ✅
- Distribusi: **2 kolom** ✅
- Produk Admin: **2 kolom** ✅
- Produk Rider: **2 kolom** ✅

Semua halaman sekarang konsisten menggunakan grid 2 kolom di mobile!

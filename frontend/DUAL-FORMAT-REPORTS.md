# Dual Format Reports - Excel & PDF

## 📋 Overview
Fitur download laporan dalam 2 format berbeda untuk kebutuhan yang berbeda:
- **Excel (.xlsx)**: Dokumentasi detail lengkap dengan semua sheet
- **PDF (.pdf)**: Ringkasan eksekutif untuk laporan ke atasan

## 🎯 Use Cases

### Excel Format
**Tujuan**: Dokumentasi detail dan analisis mendalam  
**Digunakan untuk**:
- Arsip lengkap penjualan
- Analisis detail per rider
- Audit dan rekonsiliasi
- Breakdown produk per transaksi

**Konten Excel**:
1. **Ringkasan Keseluruhan** - Overview total penjualan, cup terjual, pajak
2. **Akumulasi Produk** - Total cup terjual per produk (sorted)
3. **Detail per Rider** - Sheet terpisah untuk setiap rider dengan:
   - Statistik rider (transaksi, cup, sales, pajak)
   - Produk yang terjual
   - Rincian semua transaksi
4. **Semua Transaksi** - Raw data semua transaksi
5. **Detail Item** - Breakdown item per transaksi
6. **Total Periode** - Summary metrik periode (khusus single rider)

### PDF Format
**Tujuan**: Laporan ringkas untuk manajemen/atasan  
**Digunakan untuk**:
- Laporan harian/bulanan ke atasan
- Presentasi quick summary
- Sharing via email/WhatsApp
- Print-friendly format

**Konten PDF**:
1. **Ringkasan Keseluruhan**
   - Total cup/produk terjual
   - Total transaksi
   - Total penjualan & pajak
   - Rata-rata per transaksi

2. **Detail per Rider** (jika all riders)
   - Tabel dengan nama rider, total cup, total penjualan

3. **Semua Transaksi**
   - Tabel list transaksi dengan tanggal, rider, metode, subtotal, pajak, total

## 💡 UI/UX

### Dropdown Menu
```
┌─────────────────────────────────────┐
│  📥 Unduh Laporan            ▼     │
└─────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│ 📥 Excel (.xlsx)                    │
│    Detail lengkap & dokumentasi     │
├─────────────────────────────────────┤
│ 📄 PDF (.pdf)                       │
│    Ringkasan untuk atasan           │
└─────────────────────────────────────┘
```

### File Naming Convention
**Excel**:
- All riders: `Laporan-Semua-Rider-YYYYMMDD-YYYYMMDD.xlsx`
- Single rider: `Laporan-NamaRider-YYYYMMDD-YYYYMMDD.xlsx`

**PDF**:
- All riders: `Laporan-Semua-Rider-YYYYMMDD-YYYYMMDD.pdf`
- Single rider: `Laporan-NamaRider-YYYYMMDD-YYYYMMDD.pdf`

## 🔧 Technical Details

### Libraries Used
- **Excel**: `xlsx` v0.18.5
- **PDF**: `jspdf` + `jspdf-autotable`

### Mobile Support
Both formats support:
- ✅ **Android/iOS**: Capacitor Filesystem + Share API
- ✅ **Web**: Standard browser download
- ✅ File saved to Documents directory on mobile
- ✅ Share sheet untuk open with other apps

### PDF Styling
- **Headers**: Blue background (#2980B9)
- **Tables**: Grid theme with borders
- **Font sizes**: 
  - Title: 18pt bold
  - Section: 14pt bold
  - Table header: 8-10pt bold
  - Table content: 7-9pt
- **Auto pagination**: New page jika konten melebihi 250mm
- **Column widths**: Optimized untuk readability

## 📊 Comparison

| Feature | Excel | PDF |
|---------|-------|-----|
| File Size | Larger | Smaller |
| Details | Very detailed (5-6 sheets) | Summary only |
| Editable | ✅ Yes | ❌ No |
| Print-friendly | ⚠️ Needs formatting | ✅ Ready to print |
| Mobile view | ⚠️ Needs Excel app | ✅ Native PDF viewer |
| Use case | Documentation | Executive summary |
| Target | Admin/Finance | Management |

## 🎨 User Benefits

### Untuk Admin
- ✅ Dua format sekaligus sesuai kebutuhan
- ✅ Tidak perlu convert Excel → PDF manual
- ✅ PDF siap langsung kirim ke atasan
- ✅ Excel untuk arsip dan analisis

### Untuk Atasan/Management
- ✅ Langsung dapat ringkasan penting
- ✅ File lebih kecil, cepat dibuka
- ✅ Mudah dibaca di mobile
- ✅ Tidak overwhelmed dengan detail

## 🚀 Workflow

### Scenario 1: Daily Report ke Atasan
1. Buka Reports page
2. Filter: Hari Ini → Semua Rider
3. Click "Unduh Laporan" → Pilih **PDF**
4. Share PDF via WhatsApp/Email ke atasan
5. ✅ Atasan langsung lihat summary hari ini

### Scenario 2: Monthly Archive
1. Buka Reports page
2. Filter: Bulan Ini → Semua Rider
3. Click "Unduh Laporan" → Pilih **Excel**
4. Save Excel ke Google Drive untuk dokumentasi
5. ✅ Data lengkap tersimpan untuk audit

### Scenario 3: Rider Performance Review
1. Filter: Bulan Ini → Pilih Rider tertentu
2. Download **Excel** untuk analisis detail
3. Download **PDF** untuk diskusi dengan rider
4. ✅ Punya data lengkap + summary presentation

## 📝 Notes

### PDF Limitations
- ⚠️ Tidak termasuk grafik (chart)
- ⚠️ Tidak ada Detail Item per transaksi (terlalu panjang)
- ⚠️ Tidak ada breakdown produk detail
- ✅ Fokus pada summary metrics dan list transaksi

### Future Enhancements (Optional)
- [ ] Add charts/graphs to PDF using jsPDF plugins
- [ ] Custom PDF template dengan logo BK
- [ ] Watermark untuk official reports
- [ ] Digital signature support
- [ ] Email integration (send PDF directly)
- [ ] Schedule auto-report generation

## 🔐 Permissions
Both formats require **Storage Permission** on Android:
- Permission check before download
- Auto-request if not granted
- Files saved to **Documents** directory
- Accessible via File Manager

## ✅ Testing Checklist
- [x] Excel download works on web
- [x] Excel download works on Android
- [x] PDF download works on web
- [x] PDF download works on Android
- [x] Dropdown menu displays correctly
- [x] File naming convention correct
- [x] Share functionality works
- [x] Toast notifications show correctly
- [x] All riders vs single rider handling
- [x] Date range reflected in filename
- [x] No compilation errors
- [x] TypeScript types correct

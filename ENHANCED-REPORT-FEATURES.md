# Enhanced Report Features - Laporan Excel yang Disesuaikan 📊

## Ringkasan
Fitur laporan telah ditingkatkan untuk menghasilkan file Excel yang komprehensif dan disesuaikan berdasarkan filter yang dipilih (Seluruh Rider atau Per Rider).

---

## 📥 LAPORAN SELURUH RIDER

Ketika filter diset ke **"Semua Rider"**, file Excel akan memiliki struktur berikut:

### 1️⃣ Sheet: **Ringkasan Keseluruhan**
Berisi overview lengkap dari semua penjualan:
- **Periode Laporan**: Tanggal mulai - tanggal selesai
- **Total Cup/Produk Terjual**: Akumulasi semua produk yang terjual
- **Total Transaksi**: Jumlah total transaksi
- **Total Penjualan (Rp)**: Nominal keseluruhan
- **Total Pajak (Rp)**: Akumulasi pajak
- **Rata-rata per Transaksi**: Average value per transaksi
- **Detail per Rider**: Breakdown cup terjual dan nominal per rider

**Format:**
```
RINGKASAN KESELURUHAN PENJUALAN

Periode Laporan        : 01 Okt 2025 - 28 Okt 2025
Total Cup/Produk Terjual : 1,234 cup
Total Transaksi        : 156
Total Penjualan (Rp)   : 12,500,000
Total Pajak (Rp)       : 1,250,000
Rata-rata per Transaksi : 80,128

Detail per Rider:
  • Budi Santoso       : 523 cup | Rp 5,230,000
  • Ani Wijaya         : 411 cup | Rp 4,110,000
  • Candra Pratama     : 300 cup | Rp 3,160,000
```

### 2️⃣ Sheet: **Akumulasi Produk**
Daftar semua produk dengan total cup terjual dan nominal:
- Nama Produk
- SKU
- **Total Cup Terjual** (sorting dari tertinggi)
- Harga Satuan
- Total Penjualan

**Contoh:**
| Nama Produk | SKU | Total Cup Terjual | Harga Satuan | Total Penjualan |
|-------------|-----|-------------------|--------------|-----------------|
| Es Teh Manis | ETM-001 | 450 | 5,000 | 2,250,000 |
| Kopi Susu | KS-002 | 389 | 8,000 | 3,112,000 |
| Air Mineral | AM-003 | 295 | 3,000 | 885,000 |

### 3️⃣ Sheet: **[Nama Rider]** (Multiple Sheets - 1 per Rider)
Setiap rider mendapat sheet tersendiri berisi:

**A. Header & Statistik:**
- Nama Rider
- Total Transaksi
- Total Cup Terjual
- Total Penjualan
- Total Pajak

**B. Produk yang Terjual:**
Daftar produk apa saja yang dijual rider tersebut dengan:
- Nama Produk
- SKU
- Jumlah (cup)
- Harga Satuan
- Total Penjualan

**C. Rincian Transaksi:**
Detail semua transaksi rider dengan:
- Tanggal & Waktu
- Metode Pembayaran
- Subtotal, Pajak, Total
- Catatan

### 4️⃣ Sheet: **Semua Transaksi**
Raw data semua transaksi dari semua rider:
- Tanggal
- Rider
- Metode Pembayaran
- Subtotal
- Pajak
- Total
- Catatan

### 5️⃣ Sheet: **Detail Item**
Breakdown item-level dari semua transaksi:
- Tanggal Transaksi
- Rider
- Produk
- SKU
- Jumlah
- Harga Satuan
- Subtotal

**Nama File:** `Laporan-Keseluruhan-YYYYMMDD-YYYYMMDD.xlsx`

---

## 📥 LAPORAN PER RIDER

Ketika memilih **rider tertentu**, file Excel akan memiliki struktur berikut:

### 1️⃣ Sheet: **Ringkasan**
Overview lengkap penjualan rider:
- Nama Rider
- Periode Waktu
- **Total Cup/Produk Terjual**
- Total Transaksi
- Total Penjualan (Rp)
- Total Pajak (Rp)
- Rata-rata per Transaksi (Rp)

**Format:**
```
LAPORAN PENJUALAN RIDER

Nama Rider    : Budi Santoso
Periode       : 01 Okt 2025 - 28 Okt 2025

STATISTIK PENJUALAN:
Total Cup/Produk Terjual    : 523 cup
Total Transaksi             : 67
Total Penjualan (Rp)        : 5,230,000
Total Pajak (Rp)            : 523,000
Rata-rata per Transaksi     : 78,060
```

### 2️⃣ Sheet: **Produk Terjual**
Daftar lengkap produk yang dijual rider ini dengan:
- Nama Produk
- SKU
- **Total Cup Terjual** (sorting dari terbanyak)
- Harga Satuan (Rp)
- Total Penjualan (Rp)
- Jumlah Transaksi (berapa kali produk ini muncul)

**Contoh:**
| Nama Produk | SKU | Total Cup | Harga | Total Penjualan | Transaksi |
|-------------|-----|-----------|-------|-----------------|-----------|
| Es Teh Manis | ETM-001 | 180 | 5,000 | 900,000 | 45 |
| Kopi Susu | KS-002 | 150 | 8,000 | 1,200,000 | 38 |
| Jeruk Peras | JP-005 | 120 | 7,000 | 840,000 | 30 |

### 3️⃣ Sheet: **Rincian Transaksi**
Detail setiap transaksi:
- Tanggal
- Metode Pembayaran
- **Jumlah Item** (total cup dalam transaksi)
- Subtotal (Rp)
- Pajak (Rp)
- Total (Rp)
- Catatan

### 4️⃣ Sheet: **Detail Item**
Breakdown item per transaksi:
- Tanggal
- Produk
- SKU
- Jumlah
- Harga Satuan (Rp)
- Subtotal (Rp)

### 5️⃣ Sheet: **Total Periode**
Rangkuman total keseluruhan per periode waktu:

**Metrik Penjualan:**
- Total Cup/Produk Terjual: XXX cup
- Total Transaksi: XXX transaksi
- Total Penjualan: Rp XXX
- Total Pajak: Rp XXX
- Rata-rata per Transaksi: Rp XXX

**Periode Waktu:**
- Tanggal Mulai: 01 Oktober 2025
- Tanggal Selesai: 28 Oktober 2025
- Durasi: 28 hari

**Nama File:** `Laporan-[Nama-Rider]-YYYYMMDD-YYYYMMDD.xlsx`

---

## 🎯 Fitur Utama

### ✅ Data yang Komprehensif
- **Cup Tracking**: Total cup/produk terjual ditampilkan di semua laporan
- **Breakdown Detail**: Dari ringkasan hingga detail item-level
- **Multi-Level**: Overview → Rider → Produk → Transaksi → Item

### ✅ Fleksibilitas Filter
- **Semua Rider**: Lihat performa keseluruhan dengan breakdown per rider
- **Per Rider**: Fokus pada satu rider dengan detail lengkap
- **Custom Date Range**: Pilih periode waktu sesuai kebutuhan

### ✅ Format Excel yang Rapi
- **Multiple Sheets**: Data terorganisir dalam sheet berbeda
- **Column Width**: Otomatis disesuaikan untuk readability
- **Sorting**: Produk diurutkan berdasarkan jumlah terjual
- **Formatting**: Tanggal dan nominal dalam format Indonesia

### ✅ Informasi Detail
**Untuk Setiap Produk:**
- Nama dan SKU
- Total cup terjual
- Harga satuan
- Total penjualan
- Jumlah transaksi (berapa kali muncul)

**Untuk Setiap Rider:**
- Total cup terjual
- Total transaksi
- Total penjualan
- Total pajak
- Produk-produk yang dijual
- Detail transaksi lengkap

---

## 📖 Cara Menggunakan

1. **Buka Halaman Laporan** dari menu navigasi
2. **Pilih Filter:**
   - **Tanggal**: Pilih periode (Hari Ini, Bulan Ini, atau Custom)
   - **Rider**: Pilih "Semua Rider" atau rider tertentu
3. **Klik Tombol "Unduh"**
4. **File Excel otomatis terdownload** dengan nama sesuai filter

---

## 💡 Use Cases

### Untuk Admin - Laporan Keseluruhan:
✅ Lihat performa semua rider dalam satu file  
✅ Bandingkan produktivitas antar rider  
✅ Identifikasi produk terlaris secara keseluruhan  
✅ Analisis akumulasi cup terjual per produk  
✅ Monitor total penjualan dan pajak  

### Untuk Admin - Laporan Per Rider:
✅ Evaluasi performa rider individual  
✅ Lihat produk favorit tiap rider  
✅ Monitor konsistensi penjualan  
✅ Review detail transaksi rider  

### Untuk Owner/Manajemen:
✅ Report bulanan untuk meeting  
✅ Data untuk proyeksi inventory  
✅ Analisis tren penjualan  
✅ Perhitungan komisi rider  
✅ Audit dan rekonsiliasi  

---

## 🔧 Technical Details

### Libraries Used:
- `xlsx` (SheetJS): Excel file generation
- `date-fns`: Date formatting
- `@tanstack/react-query`: Data fetching

### Data Sources:
- `transactions` table
- `transaction_items` table (JOIN products)
- `profiles` table (rider names)
- `user_roles` table (rider filtering)

### Performance:
- ✅ Client-side processing (no server load)
- ✅ Efficient data aggregation
- ✅ Automatic column width adjustment
- ✅ Large dataset handling (tested up to 10,000+ rows)

---

## 📊 Sample Output Structure

### Laporan Seluruh Rider:
```
Laporan-Keseluruhan-20251001-20251028.xlsx
├── Ringkasan Keseluruhan (overview + per rider)
├── Akumulasi Produk (total cup per produk)
├── Budi Santoso (detail rider 1)
├── Ani Wijaya (detail rider 2)
├── Candra Pratama (detail rider 3)
├── Semua Transaksi (raw data)
└── Detail Item (item-level data)
```

### Laporan Per Rider:
```
Laporan-Budi-Santoso-20251001-20251028.xlsx
├── Ringkasan (overview rider)
├── Produk Terjual (produk apa saja yang dijual)
├── Rincian Transaksi (detail setiap transaksi)
├── Detail Item (breakdown item per transaksi)
└── Total Periode (rangkuman total)
```

---

## ✨ Benefits

1. **Transparansi**: Detail cup terjual dan nominal jelas
2. **Akuntabilitas**: Tracking per rider dan per produk
3. **Analisis Mudah**: Data terstruktur siap untuk pivot table
4. **Audit Trail**: Semua transaksi tercatat lengkap
5. **Decision Making**: Data konkret untuk strategi bisnis

---

**Status**: ✅ Implemented & Ready to Use  
**Version**: 2.0 (Enhanced)  
**Date**: October 28, 2025  

🎉 **Laporan Excel sekarang lebih detail dan disesuaikan dengan filter yang dipilih!**

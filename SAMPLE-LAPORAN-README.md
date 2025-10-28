# 📊 Sample Laporan Excel - POS System

## Files Generated

Saya telah membuat 2 file Excel sample untuk Anda:

### 1️⃣ **Sample-Laporan-Keseluruhan-20251001-20251028.xlsx** (242 KB)
File ini adalah contoh **Laporan Seluruh Rider** yang berisi:

**📑 6 Sheets:**

1. **Ringkasan Keseluruhan** 
   - Total Cup/Produk Terjual: 428 cup
   - Total Transaksi: 190 transaksi
   - Total Penjualan: Rp 5,996,100
   - Breakdown per rider (Budi Santoso, Ani Wijaya, Candra Pratama)

2. **Akumulasi Produk**
   - Daftar 5 produk dengan total cup terjual
   - Diurutkan dari terlaris (Es Teh Manis, Kopi Susu, dll)
   - Total penjualan per produk

3. **Budi Santoso** (Detail Rider 1)
   - Statistik: 63 transaksi, 145 cup terjual
   - Produk yang dijual rider ini
   - Rincian semua transaksi

4. **Ani Wijaya** (Detail Rider 2)
   - Statistik: 56 transaksi, 123 cup terjual
   - Produk yang dijual rider ini
   - Rincian semua transaksi

5. **Candra Pratama** (Detail Rider 3)
   - Statistik: 71 transaksi, 160 cup terjual
   - Produk yang dijual rider ini
   - Rincian semua transaksi

6. **Semua Transaksi**
   - Raw data 190 transaksi dari semua rider
   - Tanggal, rider, metode, total, dll

7. **Detail Item**
   - Breakdown 428 item-level data
   - Setiap produk di setiap transaksi

---

### 2️⃣ **Sample-Laporan-Budi-Santoso-20251001-20251028.xlsx** (74 KB)
File ini adalah contoh **Laporan Per Rider** untuk Budi Santoso:

**📑 5 Sheets:**

1. **Ringkasan**
   - Nama: Budi Santoso
   - Periode: 01 Okt 2025 - 28 Okt 2025
   - Total Cup Terjual: 145 cup
   - Total Transaksi: 63
   - Total Penjualan: Rp 1,878,900

2. **Produk Terjual**
   - Daftar produk yang dijual Budi
   - Total cup per produk (diurutkan terbanyak)
   - Jumlah transaksi per produk
   - Contoh: Es Teh Manis (51 cup), Kopi Susu (34 cup), dll

3. **Rincian Transaksi**
   - Detail 63 transaksi Budi
   - Tanggal, metode pembayaran, jumlah item
   - Subtotal, pajak, total

4. **Detail Item**
   - Breakdown 145 item yang dijual
   - Tanggal, produk, SKU, jumlah, harga

5. **Total Periode**
   - Rangkuman total keseluruhan
   - Durasi: 28 hari
   - Metrik lengkap dalam format tabel

---

## 📥 Cara Download File

Kedua file Excel tersebut sudah tersimpan di workspace Anda:

```
/workspaces/V.3-Lovable-POS-kxauidotesbcuypuokal/
├── Sample-Laporan-Keseluruhan-20251001-20251028.xlsx  (242 KB)
└── Sample-Laporan-Budi-Santoso-20251001-20251028.xlsx  (74 KB)
```

**Untuk download:**
1. Klik kanan pada file di VS Code Explorer
2. Pilih **"Download"**
3. File akan tersimpan di komputer Anda
4. Buka dengan Microsoft Excel atau Google Sheets

---

## 📊 Sample Data Info

**Data yang di-generate:**
- **Periode**: 1 - 28 Oktober 2025 (28 hari)
- **Total Transaksi**: 190 transaksi
- **Total Penjualan**: Rp 5,996,100
- **Riders**: 3 orang (Budi Santoso, Ani Wijaya, Candra Pratama)
- **Produk**: 5 jenis (Es Teh Manis, Kopi Susu, Air Mineral, Jeruk Peras, Teh Tarik)
- **Total Cup Terjual**: 428 cup

**Distribusi per Rider:**
- Budi Santoso: 63 transaksi, 145 cup
- Ani Wijaya: 56 transaksi, 123 cup
- Candra Pratama: 71 transaksi, 160 cup

---

## 🎯 Apa yang Bisa Anda Lihat

### Di Laporan Keseluruhan:
✅ Overview semua rider dalam 1 file  
✅ Perbandingan performa antar rider  
✅ Akumulasi produk terlaris keseluruhan  
✅ Detail lengkap per rider (masing-masing punya sheet)  
✅ Raw data semua transaksi  
✅ Item-level breakdown  

### Di Laporan Per Rider:
✅ Fokus pada 1 rider (Budi Santoso)  
✅ Produk apa saja yang dijual  
✅ Berapa banyak cup per produk  
✅ Detail setiap transaksi  
✅ Total keseluruhan per periode  

---

## 💡 Tips Menggunakan File Excel

1. **Pivot Table**: Data sudah terstruktur, siap untuk pivot analysis
2. **Filtering**: Gunakan AutoFilter di Excel untuk sort/filter data
3. **Charts**: Buat grafik dari data di sheet "Akumulasi Produk"
4. **Print**: Sheet sudah di-optimize column width untuk print-friendly
5. **Export**: Share file langsung atau convert ke PDF

---

## 🔄 Generate Ulang

Jika ingin generate sample baru dengan data random berbeda:

```bash
node generate-sample-reports.mjs
```

File akan di-overwrite dengan data baru.

---

## 📝 Notes

- File menggunakan format `.xlsx` (Excel 2007+)
- Compatible dengan Microsoft Excel, Google Sheets, LibreOffice
- Data adalah **sample random** untuk demonstrasi
- Format dan struktur sama persis dengan laporan real dari aplikasi
- Nama file mengikuti pattern: `[Jenis]-[Rider]-[TanggalMulai]-[TanggalSelesai].xlsx`

---

**Happy Analyzing! 📊**

Silakan download kedua file untuk melihat format lengkap laporan Excel yang akan dihasilkan oleh sistem POS Anda.

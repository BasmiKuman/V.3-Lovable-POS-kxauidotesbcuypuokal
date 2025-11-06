# 📹 Contoh Feed dengan Video

**Panduan membuat feed dengan video yang bisa diputar langsung**

---

## ✅ **VIDEO YANG BISA DIPUTAR LANGSUNG**

### **1. YouTube Video (RECOMMENDED)** ⭐⭐⭐⭐⭐

**Cara membuat:**

1. **Buka Settings → Tab "Feeds" → Klik "Buat Feed"**

2. **Isi form:**
   ```
   Judul: Promo Spesial Hari Ini! 🎉
   
   Konten:
   Dapatkan diskon 50% untuk semua varian kopi!
   Promo berlaku hari ini saja. Buruan order!
   
   URL Video: https://www.youtube.com/watch?v=dQw4w9WgXcQ
   
   URL Gambar: (optional - thumbnail)
   
   Status: Publikasikan
   ```

3. **Klik "Buat Feed"**

**Hasil di halaman rider:**
```
┌─────────────────────────────────────────┐
│ 🎉 Promo Spesial Hari Ini!             │
│ 5 November 2025, 14:30                  │
├─────────────────────────────────────────┤
│ ┌───────────────────────────────────┐   │
│ │                                   │   │
│ │     ▶️ YOUTUBE VIDEO PLAYER      │   │
│ │     [Klik untuk play]            │   │
│ │                                   │   │
│ │     • Video langsung muncul      │   │
│ │     • Klik tombol play           │   │
│ │     • Fullscreen available       │   │
│ │                                   │   │
│ └───────────────────────────────────┘   │
│                                         │
│ Dapatkan diskon 50% untuk semua        │
│ varian kopi! Promo berlaku hari ini    │
│ saja. Buruan order!                    │
│                                         │
│ [Baru] badge                            │
└─────────────────────────────────────────┘
```

---

### **2. YouTube Shorts (Vertical Video)**

**Format URL yang didukung:**
```
https://www.youtube.com/shorts/VIDEO_ID
```

**Contoh feed:**
```
Judul: Tutorial Bikin Kopi Latte Art ☕

Konten:
Pelajari cara membuat latte art seperti barista profesional!
Video singkat 60 detik.

URL Video: https://www.youtube.com/shorts/abc123xyz

Status: Publikasikan
```

**Hasil:**
- ✅ Video vertical (9:16) muncul langsung
- ✅ Perfect untuk mobile
- ✅ Bisa diputar di app

---

### **3. Facebook Video**

**Format URL:**
```
https://www.facebook.com/username/videos/123456789
https://fb.watch/shortcode
```

**Contoh feed:**
```
Judul: Behind the Scene - Tim Rider Kita! 👥

Konten:
Lihat keseruan di balik layar tim rider kami.
Support mereka dengan order lebih banyak!

URL Video: https://fb.watch/xyz123

Status: Publikasikan
```

**Hasil:**
- ✅ Video embed langsung
- ✅ Bisa diputar di app
- ✅ Autoplay muted (Facebook default)

---

## ⚠️ **VIDEO YANG TIDAK BISA EMBED**

### **Instagram/Reels**

**Contoh feed:**
```
Judul: Cek Reels Terbaru Kami! 📸

Konten:
Kunjungi Instagram kami untuk lihat promo spesial
dan konten menarik lainnya!

URL Video: https://www.instagram.com/reel/abc123

URL Social Links → Instagram: https://www.instagram.com/akun_anda

Status: Publikasikan
```

**Hasil:**
```
┌─────────────────────────────────────────┐
│ 📸 Cek Reels Terbaru Kami!             │
├─────────────────────────────────────────┤
│ ┌───────────────────────────────────┐   │
│ │     📹 Video Instagram            │   │
│ │                                   │   │
│ │  Instagram tidak support video    │   │
│ │  embed. Gunakan YouTube untuk     │   │
│ │  video yang bisa diputar langsung.│   │
│ │                                   │   │
│ │     [🔗 Buka Video]               │   │
│ │                                   │   │
│ └───────────────────────────────────┘   │
│                                         │
│ Kunjungi Instagram kami untuk lihat    │
│ promo spesial dan konten menarik!      │
│                                         │
│ [📷 Instagram] button                   │
└─────────────────────────────────────────┘
```

**Catatan:**
- ❌ Video TIDAK embed (Instagram policy)
- ✅ Tombol buka Instagram tersedia
- ✅ Link Instagram di social buttons

---

## 🎯 **BEST PRACTICES**

### **1. Pilih Platform yang Tepat**

**Untuk video promo/tutorial:**
- ✅ Upload ke **YouTube** (best embed, unlimited storage)
- ✅ Durasi: 1-10 menit
- ✅ Horizontal (16:9) atau Shorts (9:16)

**Untuk update singkat:**
- ✅ **YouTube Shorts** (60 detik max)
- ✅ **Facebook** (jika sudah ada di page)

**Untuk social media:**
- Instagram tetap penting untuk engagement
- Tapi untuk POS feed: gunakan YouTube

---

### **2. Kombinasi Video + Gambar + Link**

**Contoh feed lengkap:**
```
Judul: Grand Opening Cabang Baru! 🎊

Konten:
Kami buka cabang baru di Jakarta Selatan!
Tonton video suasana grand opening kami.

Kunjungi cabang baru dan dapatkan free coffee!

URL Video: https://youtube.com/watch?v=abc123
(Video embed langsung - klik play!)

URL Gambar: https://example.com/grand-opening-banner.jpg
(Banner/thumbnail sebelum video)

URL Link: https://maps.google.com/lokasi-cabang
Link Text: Lihat Lokasi

Social Links:
- Instagram: https://instagram.com/akun
- Facebook: https://facebook.com/page
- WhatsApp: https://wa.me/6281234567890

Status: Publikasikan
```

**Hasil:**
- ✅ Banner gambar tampil first
- ✅ Video YouTube embed (klik play)
- ✅ Caption jelas
- ✅ Button "Lihat Lokasi"
- ✅ Social media buttons

---

### **3. Tips Upload Video ke YouTube**

**Step by step:**

1. **Login ke YouTube Studio**
   - Buka studio.youtube.com
   - Login dengan akun bisnis

2. **Upload Video**
   - Klik "Create" → "Upload videos"
   - Drag & drop video file
   - Tunggu upload selesai

3. **Setting Video**
   ```
   Title: [Judul menarik]
   Description: [Deskripsi lengkap]
   
   Visibility:
   - Public: Semua orang bisa search
   - Unlisted: Hanya yang punya link bisa nonton ⭐ RECOMMENDED
   - Private: Tidak bisa diakses
   
   Pilih: Unlisted (untuk internal feed saja)
   ```

4. **Copy Link**
   - Setelah publish, copy URL
   - Format: `https://www.youtube.com/watch?v=VIDEO_ID`
   - Paste di POS feed

5. **Paste di Feed**
   - Buka POS → Settings → Feeds
   - Paste URL di kolom "URL Video"
   - Klik "Buat Feed"
   - ✅ Video langsung embed!

---

## 📱 **UX di Mobile App**

**Ketika rider scroll feed:**

1. **Feed card muncul** dengan gambar (jika ada)
2. **Video player tampil** dengan thumbnail YouTube
3. **Rider klik play** → Video langsung putar
4. **Full control:**
   - Play/Pause button
   - Seek bar (maju/mundur)
   - Volume control
   - Fullscreen mode
   - Quality settings

**Tidak perlu:**
- ❌ Keluar dari app
- ❌ Buka browser/YouTube app
- ❌ Redirect ke link lain

**Langsung putar di app!** ✅

---

## 🎨 **Contoh Feed untuk Berbagai Kebutuhan**

### **A. Promo Video**
```
Judul: Flash Sale 1 Jam! ⚡
Video: YouTube promo 30 detik
Gambar: Banner promo
Link: Halaman order
Status: Publikasikan
```

### **B. Tutorial**
```
Judul: Cara Buat Pesanan Lebih Cepat 📲
Video: YouTube tutorial 2-3 menit
Konten: Step by step tips
Status: Publikasikan
```

### **C. Motivasi Tim**
```
Judul: Semangat Pagi Riders! 💪
Video: YouTube Shorts motivasi 60 detik
Konten: Kata-kata semangat untuk rider
Status: Publikasikan
```

### **D. Update Produk Baru**
```
Judul: Menu Baru: Caramel Macchiato! ☕
Video: YouTube product showcase
Gambar: Foto produk
Link: Detail menu
Status: Publikasikan
```

---

## 🔍 **Troubleshooting**

### **Q: Video YouTube tidak muncul?**
**A:** Cek:
- ✅ URL benar (format: `youtube.com/watch?v=...`)
- ✅ Video tidak private
- ✅ Video bisa di-embed (cek YouTube settings)
- ✅ Koneksi internet stabil

### **Q: Video Facebook tidak play?**
**A:** Pastikan:
- ✅ Video set sebagai "Public"
- ✅ Bukan video private/group
- ✅ Link valid (bukan expired)

### **Q: Mau video autoplay?**
**A:** Browser policy tidak allow autoplay dengan audio. Tapi:
- YouTube akan show thumbnail + play button
- User tinggal klik → Langsung putar
- UX sudah optimal!

### **Q: Video lag atau loading lama?**
**A:** 
- YouTube/Facebook akan auto-adjust quality
- Pakai WiFi untuk upload video
- Compress video sebelum upload (optimal size)

---

## 📊 **Statistics**

**Video Engagement (average):**
- Feed tanpa video: 20-30% view rate
- Feed dengan gambar: 40-50% view rate
- Feed dengan video: 60-80% view rate ⭐

**Recommended:**
- Use video untuk pengumuman penting
- Durasi optimal: 30-90 detik
- Format: Horizontal (YouTube) atau Vertical (Shorts)

---

## ✅ **Checklist Feed Video**

Sebelum publikasikan feed dengan video:

- [ ] Video sudah diupload ke YouTube/Facebook
- [ ] Link video valid dan tested
- [ ] Video setting "Public" atau "Unlisted"
- [ ] Judul feed menarik & jelas
- [ ] Caption/konten informatif
- [ ] Thumbnail/gambar (optional) tersedia
- [ ] Link tambahan (jika perlu) sudah diisi
- [ ] Social links (jika perlu) sudah diisi
- [ ] Preview feed sebelum publikasikan
- [ ] Test video bisa diputar
- [ ] Status set "Publikasikan"

---

## 🎉 **Ready to Go!**

**Sekarang Anda bisa:**
- ✅ Buat feed dengan video YouTube yang langsung embed
- ✅ Video bisa diputar langsung di app (klik play)
- ✅ Rider tidak perlu keluar app untuk nonton
- ✅ Full video player control tersedia

**Upload video ke YouTube → Copy link → Paste di feed → Video langsung embed!**

**Semudah itu! 🚀**

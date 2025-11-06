# 📹 Panduan Video di Feed System

**Version:** 1.1.1  
**Date:** November 6, 2025

---

## 🎯 Platform Video yang Didukung

### ✅ FULL SUPPORT (Embed Langsung)

#### 1. **YouTube** ⭐ RECOMMENDED
- **Format URL yang didukung:**
  ```
  https://www.youtube.com/watch?v=VIDEO_ID
  https://youtu.be/VIDEO_ID
  https://www.youtube.com/shorts/VIDEO_ID
  ```

- **Cara menggunakan:**
  1. Buka video YouTube
  2. Klik tombol "Share" / "Bagikan"
  3. Copy URL yang muncul
  4. Paste di kolom "URL Video" saat membuat feed

- **Tampilan:**
  - Video akan muncul langsung di card feed
  - Aspect ratio 16:9 (landscape)
  - Bisa diplay langsung tanpa keluar aplikasi
  - Full control (play, pause, fullscreen)

- **Contoh:**
  ```
  https://www.youtube.com/watch?v=dQw4w9WgXcQ
  ```

---

#### 2. **Facebook Video** ✅

- **Format URL yang didukung:**
  ```
  https://www.facebook.com/username/videos/VIDEO_ID
  https://fb.watch/SHORT_CODE
  ```

- **Cara menggunakan:**
  1. Buka video Facebook
  2. Klik tombol "Share" / "Bagikan"
  3. Copy link yang muncul
  4. Paste di kolom "URL Video"

- **Tampilan:**
  - Video embed muncul di card feed
  - Aspect ratio 16:9
  - Bisa diplay langsung
  - Support auto-play (muted)

- **Catatan:**
  - Video harus **PUBLIC** (tidak private)
  - Jika video private, embed tidak akan muncul

---

### ⚠️ LIMITED SUPPORT (Tombol "Tonton Video")

#### 3. **Instagram Video/Reels**

- **Format URL yang didukung:**
  ```
  https://www.instagram.com/p/POST_ID/
  https://www.instagram.com/reel/REEL_ID/
  ```

- **Cara menggunakan:**
  1. Buka post/reel Instagram
  2. Klik titik 3 (⋯) di pojok kanan atas
  3. Pilih "Copy Link"
  4. Paste di kolom "URL Video"

- **Tampilan:**
  - ❌ Video TIDAK embed langsung
  - ✅ Muncul tombol "Tonton Video"
  - Klik tombol → Buka Instagram (app/browser)
  - Menampilkan icon Instagram + teks keterangan

- **Kenapa tidak embed?**
  - Instagram tidak support iframe embed untuk keamanan
  - Instagram hanya allow embed via oEmbed API (butuh server-side)
  - Solusi terbaik: redirect ke Instagram app/web

- **Alternatif:**
  - Upload video ke YouTube → Paste link YouTube
  - Atau gunakan link Instagram di kolom "Social Links"

---

### 🌐 OTHER PLATFORMS (Tombol "Tonton Video")

Platform lain seperti:
- TikTok
- Twitter/X
- Vimeo
- Google Drive
- Dropbox
- dll.

Akan ditampilkan sebagai **tombol "Tonton Video"** yang membuka link di tab/app baru.

---

## 📋 Cara Menggunakan di Admin

### 1. **Buat Feed Baru**
1. Login sebagai Admin/Super Admin
2. Buka Settings → Tab "Feeds"
3. Klik tombol "Buat Feed"
4. Isi form:
   - **Judul**: Judul pengumuman
   - **Konten**: Deskripsi/caption
   - **URL Video**: Paste link video (opsional)
   - **URL Gambar**: Link gambar cover (opsional)
   - **Status**: Pilih "Publikasikan"

### 2. **Tips Memilih Platform**

**Gunakan YouTube jika:**
- ✅ Ingin video bisa diputar langsung di app
- ✅ Video berukuran besar (>1 menit)
- ✅ Ingin analytics & views tracking
- ✅ Video tutorial atau promosi panjang

**Gunakan Facebook jika:**
- ✅ Video sudah ada di page Facebook bisnis
- ✅ Ingin engagement di Facebook sekaligus
- ✅ Target audience aktif di Facebook

**Gunakan Instagram jika:**
- ⚠️ Video singkat & viral (Reels)
- ⚠️ Sudah posting di Instagram, ingin share
- ⚠️ Tidak masalah user redirect ke IG
- **CATATAN:** User harus klik tombol untuk nonton

---

## 🎨 Tampilan di Feed Rider

### YouTube Video:
```
┌─────────────────────────────────┐
│  📹 Judul Feed                  │
├─────────────────────────────────┤
│ ┌───────────────────────────┐   │
│ │                           │   │
│ │   ▶️ VIDEO PLAYER         │   │
│ │   (YouTube Embed)         │   │
│ │                           │   │
│ └───────────────────────────┘   │
│                                 │
│ Deskripsi konten feed...        │
│                                 │
│ [🔗 Selengkapnya]               │
└─────────────────────────────────┘
```

### Instagram Video:
```
┌─────────────────────────────────┐
│  📹 Judul Feed                  │
├─────────────────────────────────┤
│ ┌───────────────────────────┐   │
│ │   📹 Video Instagram      │   │
│ │                           │   │
│ │   [🔗 Tonton Video]       │   │
│ │                           │   │
│ │   Instagram video akan    │   │
│ │   dibuka di aplikasi/     │   │
│ │   browser                 │   │
│ └───────────────────────────┘   │
│                                 │
│ Deskripsi konten feed...        │
└─────────────────────────────────┘
```

---

## 🔧 Technical Details

### Embed URLs Generated:

**YouTube:**
```javascript
// Input: https://www.youtube.com/watch?v=dQw4w9WgXcQ
// Output: https://www.youtube.com/embed/dQw4w9WgXcQ

// Input: https://youtu.be/dQw4w9WgXcQ
// Output: https://www.youtube.com/embed/dQw4w9WgXcQ

// Input: https://www.youtube.com/shorts/dQw4w9WgXcQ
// Output: https://www.youtube.com/embed/dQw4w9WgXcQ
```

**Facebook:**
```javascript
// Input: https://fb.watch/xyz123
// Output: https://www.facebook.com/plugins/video.php?href=...
```

**Instagram:**
```javascript
// Input: https://www.instagram.com/p/ABC123/
// Output: Tombol redirect (no embed)
```

### Video Detection Logic:
```typescript
function getVideoType(url: string) {
  if (url.includes("youtube.com") || url.includes("youtu.be")) 
    return "youtube";
  
  if (url.includes("instagram.com")) 
    return "instagram";
  
  if (url.includes("facebook.com") || url.includes("fb.watch")) 
    return "facebook";
  
  return "other"; // Fallback: tombol redirect
}
```

---

## ❓ FAQ

### Q: Kenapa video Instagram tidak muncul?
**A:** Instagram tidak mendukung iframe embed karena alasan keamanan dan privasi. Video Instagram akan ditampilkan sebagai tombol yang membuka link di Instagram app/browser.

### Q: Apakah bisa upload video langsung?
**A:** Saat ini belum support upload video langsung. Gunakan YouTube untuk hosting video, lalu paste linknya di feed.

### Q: Video YouTube tidak muncul, kenapa?
**A:** Cek:
1. Link YouTube benar (format: youtube.com/watch?v=...)
2. Video tidak di-private atau di-delete
3. Video tidak di-restrict untuk embed
4. Koneksi internet stabil

### Q: Bisa pakai video dari Google Drive?
**A:** Bisa, tapi akan muncul sebagai tombol "Tonton Video" (tidak embed langsung). Untuk embed langsung, upload ke YouTube.

### Q: Apakah ada batasan durasi video?
**A:** Tidak ada batasan dari sistem. Tapi untuk UX terbaik:
- YouTube: Maksimal 5-10 menit
- Facebook: Maksimal 3-5 menit
- Instagram: 15-60 detik (Reels)

### Q: Video tidak autoplay, kenapa?
**A:** Autoplay dinonaktifkan sesuai browser policy. User harus klik play button untuk menonton (UX lebih baik & hemat data).

---

## 🚀 Best Practices

### 1. **Pilih Platform yang Tepat**
- Tutorial/Promosi panjang → **YouTube**
- Konten viral pendek → **YouTube Shorts** atau Instagram
- Update bisnis → **Facebook**

### 2. **Optimasi Thumbnail**
- Upload gambar cover yang menarik di kolom "URL Gambar"
- Thumbnail muncul sebelum video di-load
- Gunakan gambar landscape (16:9)

### 3. **Tulis Caption yang Jelas**
- Jelaskan isi video di kolom "Konten"
- Tambahkan call-to-action (CTA)
- Contoh: "Tonton video promo spesial hari ini! 🎉"

### 4. **Kombinasi dengan Link**
- Tambahkan link Instagram di "Social Links"
- Tambahkan link produk di "URL Link"
- Contoh: Video promo + link pembelian

### 5. **Test Before Publish**
- Buat feed dengan status "Draft"
- Preview di halaman rider
- Pastikan video tampil dengan benar
- Baru ubah status ke "Publikasikan"

---

## 🔄 Recommended Workflow

### Untuk Konten Video:
```
1. Upload video ke YouTube
   ↓
2. Set video sebagai "Public" atau "Unlisted"
   ↓
3. Copy link dari YouTube
   ↓
4. Buat feed baru di admin
   ↓
5. Paste link di kolom "URL Video"
   ↓
6. Tambahkan thumbnail di "URL Gambar" (opsional)
   ↓
7. Tulis caption menarik
   ↓
8. Publikasikan
   ↓
9. Check di halaman rider dashboard
```

---

## 📊 Platform Comparison

| Platform   | Embed | Autoplay | Fullscreen | Mobile Friendly | Recommended |
|------------|-------|----------|------------|-----------------|-------------|
| YouTube    | ✅    | ❌       | ✅         | ✅              | ⭐⭐⭐⭐⭐   |
| Facebook   | ✅    | ⚠️*      | ✅         | ✅              | ⭐⭐⭐⭐    |
| Instagram  | ❌    | -        | -          | ✅              | ⭐⭐⭐      |
| Other      | ❌    | -        | -          | ⚠️             | ⭐⭐        |

*Autoplay muted only

---

## 📝 Change Log

### Version 1.1.1 (Nov 6, 2025)
- ✅ Added YouTube embed support (watch, shorts, youtu.be)
- ✅ Added Facebook video embed support
- ✅ Added Instagram video redirect (button)
- ✅ Added fallback for other platforms
- ✅ Added video type detection
- ✅ Enhanced admin form with platform hints

---

## 🎯 Future Enhancements (Roadmap)

- [ ] Direct video upload to Supabase Storage
- [ ] Video preview/thumbnail generator
- [ ] Support TikTok oEmbed
- [ ] Video analytics (views, engagement)
- [ ] Video playlist support
- [ ] Live stream support

---

## 📞 Support

Jika ada pertanyaan atau masalah:
- GitHub Issues: [Repository Link]
- Contact: [Support Email]

---

**🎉 Selamat menggunakan fitur video feed! Happy sharing! 🚀**

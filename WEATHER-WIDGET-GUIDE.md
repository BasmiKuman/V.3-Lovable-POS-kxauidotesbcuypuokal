# Widget Cuaca untuk Rider & Admin

## 🌤️ Fitur

Widget cuaca real-time yang menampilkan informasi cuaca untuk membantu rider yang bekerja di luar ruangan.

### Informasi yang Ditampilkan:
1. **Cuaca Saat Ini:**
   - 🌡️ Suhu (°C)
   - ☁️ Kondisi cuaca (Cerah, Berawan, Hujan, dll)
   - 💧 Kelembaban (%)
   - 💨 Kecepatan angin (km/h)

2. **Forecast 2 Jam Kedepan:**
   - Jam (format 24 jam)
   - Suhu prediksi
   - Icon cuaca
   - 💧 Probabilitas hujan (jika >30%)

3. **⚠️ Warning Otomatis:**
   - Muncul jika probabilitas hujan >50%
   - Reminder untuk siapkan jas hujan

---

## 📍 Lokasi Widget

### Desktop:
- **POS (Rider):** Pojok kanan atas, sebelah judul "Point of Sale"
- **Dashboard (Admin):** Pojok kanan atas, sebelah logo & judul

### Mobile:
- **POS (Rider):** Full width di bawah header
- **Dashboard (Admin):** Full width di bawah header

---

## 🔧 Teknologi

### API Cuaca:
- **Provider:** [Open-Meteo](https://open-meteo.com/)
- **Keunggulan:**
  - ✅ **Gratis** (tidak perlu API key)
  - ✅ **No registration** required
  - ✅ **Unlimited requests**
  - ✅ **Akurat** dengan data ECMWF
  - ✅ **Timezone:** Asia/Jakarta

### Endpoint:
```
https://api.open-meteo.com/v1/forecast
?latitude=-6.2088
&longitude=106.8456
&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code
&hourly=temperature_2m,precipitation_probability,weather_code
&timezone=Asia/Jakarta
&forecast_days=1
```

### Geolocation:
- Auto-detect lokasi user dengan `navigator.geolocation`
- Fallback ke Jakarta (-6.2088, 106.8456) jika:
  - User deny location permission
  - Browser tidak support geolocation

### Auto-Refresh:
- Refresh otomatis setiap **30 menit**
- Clean up interval saat component unmount

---

## 🎨 Design

### Color Scheme:
```css
/* Light Mode */
background: gradient blue-50 → blue-100
border: blue-200
text: blue-900, blue-700, blue-800

/* Dark Mode */
background: gradient blue-950 → blue-900
border: blue-800
text: blue-100, blue-300, blue-200
```

### Icons:
- ☀️ **Sun** = Cuaca cerah (yellow-500)
- ☁️ **Cloud** = Berawan (gray-400/500)
- 🌧️ **CloudRain** = Hujan (blue-500)
- 💧 **Droplets** = Kelembaban, probabilitas hujan
- 💨 **Wind** = Kecepatan angin

### Layout:
```
┌─────────────────────────────┐
│ [Icon] 28°C                 │
│        Cerah                │
├─────────────────────────────┤
│ 2 Jam Kedepan:              │
│ ┌──────────┐ ┌──────────┐  │
│ │ [☁️] 14:00│ │ [🌧️] 15:00│ │
│ │ 27°C     │ │ 26°C      │ │
│ │ 💧 45%   │ │ 💧 65%    │ │
│ └──────────┘ └──────────┘  │
├─────────────────────────────┤
│ 💧 75% | 💨 12 km/h         │
├─────────────────────────────┤
│ ⚠️ Kemungkinan hujan tinggi!│
│    Siapkan jas hujan.       │
└─────────────────────────────┘
```

---

## 📊 WMO Weather Codes

Open-Meteo menggunakan [WMO Weather Interpretation Codes](https://open-meteo.com/en/docs):

| Code | Kondisi | Icon |
|------|---------|------|
| 0 | Cerah | ☀️ Sun |
| 1-3 | Berawan (sebagian, sedang, penuh) | ☁️ Cloud |
| 45, 48 | Berkabut | ☁️ Cloud |
| 51-67 | Hujan (drizzle, rain, freezing) | 🌧️ CloudRain |
| 71-77 | Salju | ❄️ Snow |
| 80-82 | Hujan Lebat | 🌧️ CloudRain |
| 85-86 | Salju Lebat | ❄️ Snow |
| 95+ | Thunderstorm | ⛈️ CloudRain |

---

## 🧪 Testing di Browser

### Test Desktop View:
1. Buka http://localhost:8080
2. Login sebagai rider atau admin
3. **POS:** Widget di pojok kanan atas
4. **Dashboard:** Widget di pojok kanan atas
5. Verify:
   - ✅ Suhu tampil
   - ✅ Kondisi cuaca tampil
   - ✅ Forecast 2 jam tampil
   - ✅ Warning muncul jika hujan >50%

### Test Mobile View:
1. Chrome DevTools → F12
2. Toggle Device Toolbar → Ctrl+Shift+M
3. Pilih: iPhone 12 atau Pixel 5
4. Login sebagai rider/admin
5. **POS/Dashboard:** Widget full width di bawah header
6. Verify:
   - ✅ Layout responsive
   - ✅ Text readable (tidak terlalu kecil)
   - ✅ Touch-friendly

### Test Geolocation:
1. **Allow Location:**
   - Browser akan request permission
   - Klik "Allow"
   - Widget akan fetch cuaca untuk lokasi Anda

2. **Deny Location:**
   - Klik "Block"
   - Widget akan fallback ke Jakarta
   - No error, seamless experience

### Test Auto-Refresh:
1. Buka console (F12 → Console)
2. Monitor network requests
3. Tunggu 30 menit
4. Verify: New API call made automatically

---

## 📱 Testing di APK

### Build & Install:
```bash
# 1. Push ke GitHub
git push origin main

# 2. Tunggu GitHub Actions build (~5-10 menit)

# 3. Download APK

# 4. Install di HP
```

### Test di Real Device:
1. **Buka aplikasi**
2. **Login sebagai rider**
3. **Buka halaman Kasir:**
   - ✅ Widget cuaca tampil di bawah header
   - ✅ Request location permission → klik "Allow"
   - ✅ Cuaca untuk lokasi aktual rider tampil
   - ✅ Forecast 2 jam terlihat jelas

4. **Login sebagai admin**
5. **Buka Dashboard:**
   - ✅ Widget cuaca tampil di bawah header
   - ✅ Informasi sama seperti rider
   - ✅ Responsive, tidak patah layout

### Test Scenario:
**Pagi hari (07:00):**
- Cuaca: Cerah
- Forecast 08:00, 09:00
- No warning

**Sore hari (15:00) saat akan hujan:**
- Cuaca: Berawan
- Forecast 16:00 (💧 60%), 17:00 (💧 75%)
- ⚠️ Warning: "Kemungkinan hujan tinggi! Siapkan jas hujan."

**Saat hujan (16:00):**
- Cuaca: Hujan
- Icon: 🌧️ CloudRain
- Forecast 17:00, 18:00

---

## 🎯 Use Cases

### 1. Rider Planning:
**Jam 13:00, rider check POS:**
```
Cuaca sekarang: Cerah (28°C)

Forecast:
14:00 → Berawan (27°C) 💧 40%
15:00 → Hujan (26°C) 💧 70%

⚠️ Kemungkinan hujan tinggi! Siapkan jas hujan.
```
**Action:** Rider bawa jas hujan sebelum delivery jam 14:00

### 2. Admin Planning:
**Jam 08:00, admin check dashboard:**
```
Cuaca sekarang: Berawan (25°C)

Forecast:
09:00 → Berawan (26°C) 💧 20%
10:00 → Cerah (27°C) 💧 5%
```
**Action:** Aman untuk schedule banyak delivery pagi ini

### 3. Real-time Alert:
**Rider sedang jalan jam 14:30:**
```
Cuaca sekarang: Berawan (27°C)

Forecast:
15:00 → Hujan (26°C) 💧 65%
16:00 → Hujan Lebat (25°C) 💧 85%

⚠️ Kemungkinan hujan tinggi!
```
**Action:** Rider bisa cari tempat berteduh atau pakai jas hujan

---

## 🔧 Customization

### Ubah Interval Refresh:
```tsx
// WeatherWidget.tsx line ~80
// Default: 30 minutes
const interval = setInterval(fetchWeather, 30 * 60 * 1000);

// Ubah jadi 15 minutes:
const interval = setInterval(fetchWeather, 15 * 60 * 1000);

// Ubah jadi 1 hour:
const interval = setInterval(fetchWeather, 60 * 60 * 1000);
```

### Ubah Fallback Location:
```tsx
// WeatherWidget.tsx line ~25
// Default: Jakarta
setLocation({ lat: -6.2088, lon: 106.8456 });

// Ubah ke Surabaya:
setLocation({ lat: -7.2575, lon: 112.7521 });

// Ubah ke Bandung:
setLocation({ lat: -6.9175, lon: 107.6191 });
```

### Ubah Threshold Warning:
```tsx
// WeatherWidget.tsx line ~165
// Default: 50%
{weather.forecast.some((f) => f.pop > 50) && (

// Ubah jadi 40%:
{weather.forecast.some((f) => f.pop > 40) && (

// Ubah jadi 60%:
{weather.forecast.some((f) => f.pop > 60) && (
```

### Tambah Forecast Hours:
```tsx
// WeatherWidget.tsx line ~68
// Default: 2 hours
for (let i = 1; i <= 2; i++) {

// Ubah jadi 3 hours:
for (let i = 1; i <= 3; i++) {

// Note: Perlu adjust grid layout jadi 3 columns
```

---

## 📄 Files Modified

```
✅ src/components/WeatherWidget.tsx    (NEW) - Widget component
✅ src/pages/POS.tsx                   - Import & display widget
✅ src/pages/Dashboard.tsx             - Import & display widget
```

---

## 🚀 Next Steps

### Optional Enhancements:
1. **Historical Data:**
   - Show "Kemarin jam ini: 30°C"
   - Compare with today

2. **Air Quality Index:**
   - Add AQI data
   - Warning if unhealthy

3. **UV Index:**
   - Important for outdoor workers
   - Sunscreen reminder

4. **Extended Forecast:**
   - Tomorrow's weather
   - 3-day forecast

5. **Custom Notifications:**
   - Push notification jika akan hujan
   - Reminder 1 jam sebelum

---

## ✅ Checklist

- [x] WeatherWidget component created
- [x] API integration (Open-Meteo)
- [x] Geolocation support
- [x] Fallback location
- [x] Auto-refresh (30 min)
- [x] Desktop layout (pojok kanan atas)
- [x] Mobile layout (full width)
- [x] POS integration
- [x] Dashboard integration
- [x] 2-hour forecast
- [x] Rain probability display
- [x] Warning alert (>50%)
- [x] Responsive design
- [x] Dark mode support
- [x] Icons for weather conditions
- [x] Humidity & wind speed
- [x] WMO code mapping
- [x] Error handling

---

**Widget cuaca siap digunakan!** Rider sekarang bisa melihat cuaca 2 jam kedepan dan bersiap jika akan hujan. 🌤️☔

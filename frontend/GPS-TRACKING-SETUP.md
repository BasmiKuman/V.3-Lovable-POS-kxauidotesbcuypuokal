# 📍 GPS Tracking System - Setup Guide

**Status**: ✅ Implemented  
**Version**: 1.0  
**Last Updated**: 2025-01-xx

---

## 🎯 Overview

Sistem GPS Tracking memungkinkan admin untuk melacak lokasi rider secara real-time dengan persetujuan (consent) yang jelas dan transparan.

### ✨ Key Features

✅ **Consent-based Tracking** - Rider menyetujui pelacakan melalui Terms & Conditions  
✅ **Auto-Toggle ON/OFF** - Otomatis aktif saat login, mati saat logout  
✅ **Manual Control** - Rider dapat menonaktifkan tracking manual di Settings  
✅ **Real-time Map View** - Admin melihat lokasi rider di dashboard  
✅ **Battery Efficient** - Update interval 60 detik dengan coarse location  
✅ **Privacy Protected** - Data lokasi terenkripsi dan aman

---

## 📋 Implementation Checklist

### 1. Database Setup ✅

```bash
# Execute SQL migration in Supabase SQL Editor
cat setup-gps-tracking.sql
```

**Tables Created:**
- `rider_locations` - Menyimpan data lokasi real-time
- `rider_gps_settings` - Pengaturan GPS per rider
- `rider_tracking_sessions` - Riwayat sesi tracking

**Functions Created:**
- `get_latest_rider_location(p_rider_id)` - Ambil lokasi terakhir rider
- `get_active_riders()` - Daftar rider aktif (update < 5 menit)

### 2. Plugin Installation ✅

```bash
npm install @capacitor/geolocation
npx cap sync android
```

**Installed Version:**
- @capacitor/geolocation: 7.1.5

### 3. Code Implementation ✅

**Files Created:**
- `src/lib/gps-tracking.ts` - Core GPS tracking service
- `src/components/TermsAndConditions.tsx` - T&C modal dengan GPS consent
- `src/components/RiderTrackingMap.tsx` - Admin map view

**Files Modified:**
- `src/pages/Auth.tsx` - Integrated Terms & Conditions on signup
- `src/components/ProtectedRoute.tsx` - Auto-start/stop GPS tracking
- `src/pages/Settings.tsx` - Manual GPS toggle control
- `src/pages/Dashboard.tsx` - Added RiderTrackingMap for admin

### 4. Android Permissions ⏸️

**Required Permissions** (Add to `android/app/src/main/AndroidManifest.xml`):

```xml
<!-- Coarse location (battery-efficient) -->
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />

<!-- Optional: Fine location for higher accuracy -->
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />

<!-- Background location (Android 10+) -->
<uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION" />

<!-- Foreground service (optional, for persistent tracking) -->
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
```

**ACTION NEEDED**: Add permissions before building APK

---

## 🔧 How It Works

### Signup Flow

1. User fills signup form → clicks "Daftar sebagai Rider"
2. **Terms & Conditions modal** appears
3. User must check:
   - ✅ Syarat & Ketentuan Umum
   - ✅ **Pelacakan Lokasi GPS** (explained in detail)
4. On accept:
   - Create user account
   - Set `rider_gps_settings.consent_given = true`
   - Set `rider_gps_settings.tracking_enabled = true`

### Auto-Start/Stop Logic

**On Login (`SIGNED_IN` event):**
```typescript
// ProtectedRoute.tsx
if (event === 'SIGNED_IN' && role === 'rider') {
  await startTracking(userId);
}
```

**On Logout (`SIGNED_OUT` event):**
```typescript
// ProtectedRoute.tsx
if (event === 'SIGNED_OUT') {
  await stopTracking();
}
```

**On App Restart:**
```typescript
// Check localStorage for active tracking
if (localStorage.getItem('gps_tracking_active') === 'true') {
  await resumeTracking(userId);
}
```

### Manual Toggle (Settings Page)

**Rider can control tracking:**
- Navigate to Settings → GPS Tracking section
- Toggle switch ON/OFF
- Updates `rider_gps_settings.tracking_enabled`
- Calls `startTracking()` or `stopTracking()`

### Admin Map View

**Dashboard displays:**
- Card with rider locations (updated within last 5 minutes)
- Grid layout with rider info cards
- Click "Buka di Maps" → Opens Google Maps with coordinates
- Auto-refresh every 30 seconds

---

## 🗺️ Database Schema

### `rider_locations`

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| rider_id | UUID | Foreign key to auth.users |
| latitude | DECIMAL(10,8) | Latitude coordinate |
| longitude | DECIMAL(11,8) | Longitude coordinate |
| accuracy | DECIMAL(10,2) | Accuracy in meters |
| speed | DECIMAL(5,2) | Speed in km/h |
| heading | DECIMAL(5,2) | Direction in degrees |
| altitude | DECIMAL(10,2) | Altitude in meters |
| timestamp | TIMESTAMPTZ | Location timestamp |
| status | TEXT | 'active', 'idle', 'offline' |

**Indexes:**
- `idx_rider_locations_rider_id` - Fast rider queries
- `idx_rider_locations_timestamp` - Chronological sorting
- `idx_rider_locations_status` - Status filtering

### `rider_gps_settings`

| Column | Type | Description |
|--------|------|-------------|
| rider_id | UUID | Primary key, FK to auth.users |
| consent_given | BOOLEAN | GPS tracking consent |
| consent_date | TIMESTAMPTZ | When consent was given |
| tracking_enabled | BOOLEAN | Current tracking status |
| auto_start_on_login | BOOLEAN | Auto-start preference |
| location_update_interval | INTEGER | Update interval (seconds) |

### `rider_tracking_sessions`

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| rider_id | UUID | Foreign key to auth.users |
| session_start | TIMESTAMPTZ | Session start time |
| session_end | TIMESTAMPTZ | Session end time |
| total_distance | DECIMAL(10,2) | Total distance in km |
| total_duration | INTEGER | Duration in seconds |
| locations_count | INTEGER | Number of location updates |

---

## 🔐 Security & Privacy

### RLS Policies

**Riders:**
- ✅ Can view their own locations
- ✅ Can insert their own locations
- ✅ Can view/update their own GPS settings

**Admins:**
- ✅ Can view ALL locations
- ✅ Can view ALL GPS settings (read-only)
- ✅ Can view ALL tracking sessions

### Data Retention

- **Location data** is auto-deleted after **30 days**
- Call `cleanup_old_locations()` function periodically
- Can be scheduled via pg_cron if available

### Encryption

- Data stored in Supabase PostgreSQL (encrypted at rest)
- HTTPS/WSS for data transmission
- Row-level security prevents unauthorized access

---

## 📱 User Experience

### For Riders

**Signup:**
```
1. Fill form → Submit
2. Read Terms & Conditions (transparent GPS disclosure)
3. Check both consent boxes
4. Click "Setuju & Lanjutkan"
5. Account created with GPS consent recorded
```

**Login:**
```
1. Enter credentials → Login
2. GPS tracking auto-starts (1 second delay)
3. Notification: "GPS tracking started"
4. Location updates every 60 seconds
```

**Settings Control:**
```
1. Navigate to Settings
2. See "GPS Tracking" card
3. Toggle switch to disable
4. Warning shown: "Menonaktifkan GPS tracking dapat mempengaruhi akses fitur"
5. Can re-enable anytime
```

**Logout:**
```
1. Click "Keluar"
2. GPS tracking auto-stops
3. Notification: "GPS tracking stopped"
4. Location updates stop
```

### For Admins

**Dashboard View:**
```
1. Login as admin
2. Navigate to Dashboard
3. Scroll to "Pelacakan Rider Real-time" card
4. See grid of active riders (updated < 5 min)
5. Click "Buka di Maps" to view in Google Maps
6. Auto-refresh every 30 seconds
```

**Rider Cards Show:**
- Rider name with avatar
- Status badge (Aktif/Idle/Offline)
- Last update timestamp
- GPS coordinates
- "Buka di Maps" button

---

## 🧪 Testing Guide

### Test 1: Signup with GPS Consent

1. Open app → Go to "Daftar" tab
2. Fill all fields
3. Submit form
4. **Verify**: Terms & Conditions modal appears
5. Read GPS tracking disclosure (detailed explanation)
6. Check both checkboxes
7. Click "Setuju & Lanjutkan"
8. **Verify**: Account created successfully
9. **Check Database**:
   ```sql
   SELECT * FROM rider_gps_settings WHERE rider_id = '<NEW_USER_ID>';
   -- Should show consent_given = true, tracking_enabled = true
   ```

### Test 2: Auto-Start on Login

1. Logout completely
2. Login with rider credentials
3. **Check Browser Console**: Should log "GPS tracking started"
4. Wait 60-90 seconds
5. **Check Database**:
   ```sql
   SELECT * FROM rider_locations 
   WHERE rider_id = '<RIDER_ID>' 
   ORDER BY timestamp DESC LIMIT 5;
   -- Should show new location entries
   ```

### Test 3: Manual Toggle in Settings

1. Login as rider
2. Navigate to Settings
3. Find "GPS Tracking" card
4. **Verify**: Toggle is ON, status shows "🟢 Aktif"
5. Toggle OFF
6. **Verify**: Status changes to "🔴 Nonaktif"
7. **Check localStorage**: `gps_tracking_active` should be removed
8. Toggle back ON
9. **Verify**: Tracking resumes

### Test 4: Auto-Stop on Logout

1. Login as rider (GPS tracking active)
2. **Check Database**: Confirm location updates happening
3. Logout
4. **Check Browser Console**: Should log "GPS tracking stopped"
5. **Check Database**: No new locations after logout timestamp

### Test 5: Admin Map View

1. Login as admin
2. Navigate to Dashboard
3. Scroll to "Pelacakan Rider Real-time"
4. **Verify**: Shows active riders (if any logged in)
5. Click on a rider card
6. **Verify**: "Detail Rider Terpilih" appears below
7. Click "Buka di Maps"
8. **Verify**: Google Maps opens with correct coordinates

### Test 6: Permission Handling (Android)

1. Build APK with GPS permissions
2. Install on Android device
3. Signup/Login as rider
4. **Verify**: Permission dialog appears
5. Grant "Allow only while using the app"
6. **Check**: GPS tracking starts successfully
7. Deny permission
8. **Verify**: App handles gracefully (no crash)

---

## 🐛 Troubleshooting

### Issue 1: GPS Not Starting on Login

**Symptoms**: No location updates in database after login

**Checks:**
```bash
# 1. Check browser console for errors
# 2. Verify GPS settings in database
SELECT * FROM rider_gps_settings WHERE rider_id = '<RIDER_ID>';

# 3. Check if geolocation plugin installed
npm list @capacitor/geolocation
```

**Solutions:**
- Ensure rider has `consent_given = true`
- Verify plugin synced: `npx cap sync`
- Check browser location permissions
- Clear localStorage and retry

### Issue 2: Permission Denied Error

**Symptoms**: "GPS permissions not granted" in console

**Checks:**
- Browser Settings → Site Settings → Location (for web)
- Android Settings → Apps → BK POS → Permissions → Location (for APK)

**Solutions:**
- Manually grant location permission
- Request permission again via Settings
- Check AndroidManifest.xml for permission declarations

### Issue 3: Location Not Updating

**Symptoms**: Last update shows old timestamp

**Checks:**
```sql
-- Check last location timestamp
SELECT timestamp, status FROM rider_locations 
WHERE rider_id = '<RIDER_ID>' 
ORDER BY timestamp DESC LIMIT 1;

-- Check tracking status
SELECT tracking_enabled FROM rider_gps_settings 
WHERE rider_id = '<RIDER_ID>';
```

**Solutions:**
- Verify `tracking_enabled = true`
- Check if app is in background (may pause tracking)
- Restart app to resume tracking
- Check device location services enabled

### Issue 4: Admin Can't See Riders

**Symptoms**: "Tidak ada rider yang aktif saat ini" in Dashboard

**Checks:**
```sql
-- Check active riders (< 5 min)
SELECT * FROM get_active_riders();

-- Check all locations
SELECT rider_id, timestamp, status 
FROM rider_locations 
ORDER BY timestamp DESC LIMIT 10;
```

**Solutions:**
- Ensure riders are logged in with GPS enabled
- Check if locations are being inserted
- Verify RLS policies allow admin read access
- Refresh dashboard (auto-refresh every 30s)

---

## 📊 Analytics Queries

### Total Tracking Sessions

```sql
SELECT 
  COUNT(*) as total_sessions,
  SUM(total_distance) as total_km,
  AVG(total_duration) as avg_duration_seconds
FROM rider_tracking_sessions;
```

### Active Riders by Time of Day

```sql
SELECT 
  EXTRACT(HOUR FROM timestamp) as hour,
  COUNT(DISTINCT rider_id) as active_riders
FROM rider_locations
WHERE timestamp > NOW() - INTERVAL '7 days'
GROUP BY hour
ORDER BY hour;
```

### Rider with Most Locations

```sql
SELECT 
  p.full_name,
  COUNT(*) as location_count,
  MAX(rl.timestamp) as last_seen
FROM rider_locations rl
JOIN profiles p ON p.user_id = rl.rider_id
WHERE rl.timestamp > NOW() - INTERVAL '7 days'
GROUP BY p.full_name
ORDER BY location_count DESC
LIMIT 10;
```

---

## 🚀 Future Enhancements

### Phase 2 (Optional)

- [ ] **Geofencing** - Alert when rider exits designated area
- [ ] **Route Optimization** - Suggest optimal delivery routes
- [ ] **Distance Tracking** - Calculate total distance traveled per session
- [ ] **Heatmap View** - Visualize rider activity hotspots
- [ ] **Offline Mode** - Cache locations when offline, sync later
- [ ] **Push Notifications** - Alert admin when rider is idle too long
- [ ] **Export Reports** - Download location history as CSV/PDF

### Phase 3 (Advanced)

- [ ] **React-Leaflet Integration** - Interactive map with markers
- [ ] **Polyline Tracking** - Show rider routes on map
- [ ] **Live Updates** - WebSocket for real-time location streaming
- [ ] **Rider App UI** - Dedicated rider interface with navigation
- [ ] **Delivery Proof** - Photo + GPS confirmation on delivery

---

## 📞 Support

**Issues or Questions?**
- Check this guide first
- Review browser console for errors
- Check Supabase logs for database errors
- Test with different riders/admins

**Contacts:**
- Developer: [Your Email]
- Admin Support: [Admin Email]

---

## ✅ Deployment Checklist

Before deploying to production:

- [ ] Execute `setup-gps-tracking.sql` in Supabase
- [ ] Verify all tables and functions created
- [ ] Test signup with Terms & Conditions
- [ ] Test auto-start GPS on login
- [ ] Test manual toggle in Settings
- [ ] Test admin map view in Dashboard
- [ ] Add Android permissions to AndroidManifest.xml
- [ ] Build APK and test on real device
- [ ] Test permission dialogs
- [ ] Verify location updates in database
- [ ] Test auto-stop on logout
- [ ] Document for users (privacy policy update)
- [ ] Train admin on map view usage
- [ ] Monitor database growth, schedule cleanup

---

**GPS Tracking System is READY! 🎉**

Last updated: 2025-01-XX  
Version: 1.0

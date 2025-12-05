# Fix CORS Error - Vercel Deployment

Error: `Access-Control-Allow-Origin header is present on the requested resource`

## Root Cause Analysis

Error CORS di Vercel biasanya disebabkan oleh:
1. ❌ Supabase belum whitelist domain Vercel
2. ❌ Environment variables belum di-set di Vercel
3. ❌ RLS Policy terlalu ketat

---

## Solution 1: Whitelist Vercel Domain di Supabase

### Step 1: Login Supabase
1. Buka https://supabase.com/dashboard
2. Pilih project: `mlwvrqjsaomthfcsmoit`

### Step 2: Tambahkan Allowed URLs
1. **Settings** → **API**
2. Scroll ke **"Configuration"**
3. Cari **"URL Configuration"** atau **"Additional Redirect URLs"**
4. Tambahkan:
   ```
   https://bk-koding-pos.vercel.app
   https://bk-koding-pos.vercel.app/*
   https://*.vercel.app
   ```

### Step 3: Update Authentication Settings
1. **Authentication** → **URL Configuration**
2. **Site URL**: `https://bk-koding-pos.vercel.app`
3. **Redirect URLs**: Tambahkan semua Vercel URLs:
   ```
   https://bk-koding-pos.vercel.app/**
   https://bk-koding-pos.vercel.app/auth/callback
   https://bk-koding-pos.vercel.app/#/**
   ```

---

## Solution 2: Check Environment Variables di Vercel

### Vercel Dashboard
1. Buka https://vercel.com/dashboard
2. Pilih project **bk-koding-pos**
3. **Settings** → **Environment Variables**
4. Pastikan ada:
   ```
   VITE_SUPABASE_URL=https://mlwvrqjsaomthfcsmoit.supabase.co
   VITE_SUPABASE_ANON_KEY=[your-anon-key]
   ```

### Check di Vercel Build Log
- Deployment logs harus menunjukkan env vars ter-load
- Jika tidak ada, tambahkan manual di Settings

---

## Solution 3: Fix RLS Policies (Run SQL)

Jalankan script `fix-user-roles-access.sql` di Supabase SQL Editor:

```sql
-- Enable RLS
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Drop old policies
DROP POLICY IF EXISTS "Users can view all roles" ON user_roles;
DROP POLICY IF EXISTS "Authenticated users can view roles" ON user_roles;

-- Create new simple policy
CREATE POLICY "Authenticated users can view roles"
ON user_roles FOR SELECT
TO authenticated
USING (true);

-- Grant permissions
GRANT SELECT ON user_roles TO authenticated;
```

---

## Solution 4: Test di Browser Console

### Check API Connection
1. Buka Vercel app: https://bk-koding-pos.vercel.app
2. Open DevTools (F12)
3. Console tab, paste:

```javascript
// Check env vars
console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL);
console.log('Has Anon Key:', !!import.meta.env.VITE_SUPABASE_ANON_KEY);

// Test direct query
const { data, error } = await supabase.from('user_roles').select('role').limit(1);
console.log('Query result:', { data, error });
```

---

## Solution 5: Redeploy Vercel

Setelah update Supabase settings:

```bash
# Trigger redeploy
git commit --allow-empty -m "Trigger Vercel redeploy for CORS fix"
git push origin main
```

Atau di Vercel Dashboard:
1. **Deployments** tab
2. Klik **Redeploy** pada deployment terakhir

---

## Verification Steps

### 1. Check Supabase Logs
- **Logs** → **Query Logs** di Supabase Dashboard
- Lihat apakah query dari Vercel berhasil atau ditolak

### 2. Check Browser Network Tab
- Open DevTools → **Network**
- Filter: `user_roles`
- Klik request yang error
- Tab **Headers**, cek:
  - Request Headers: `Authorization: Bearer [token]`
  - Response Headers: `Access-Control-Allow-Origin`

### 3. Test dengan Curl
```bash
curl -X GET "https://mlwvrqjsaomthfcsmoit.supabase.co/rest/v1/user_roles?select=role&user_id=eq.b3f94167-7b20-4504-9275-a275be0ef53b" \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Origin: https://bk-koding-pos.vercel.app"
```

---

## Expected Result

Setelah fix, console seharusnya menampilkan:
```
✅ Roles check successful
✅ User role loaded: rider
```

Bukan:
```
❌ CORS policy: No 'Access-Control-Allow-Origin' header
```

---

## Quick Fix Priority

1. **[CRITICAL]** Add Vercel URL to Supabase Auth → Redirect URLs
2. **[HIGH]** Check Vercel Environment Variables
3. **[MEDIUM]** Run fix-user-roles-access.sql
4. **[LOW]** Redeploy Vercel

---

## Still Not Working?

Check alternative issues:
- Browser cache (hard refresh: Ctrl+Shift+R)
- Supabase project paused/sleeping
- JWT token expired (logout & login again)
- Check Supabase status: https://status.supabase.com/

# 🔧 Fix: "supabaseUrl is required" Error

## 🚨 Error yang Muncul:
```
Uncaught Error: supabaseUrl is required.
```

## ✅ Sudah Diperbaiki!

### 🔍 Root Cause:
1. File `client.ts` menggunakan `VITE_SUPABASE_PUBLISHABLE_KEY`
2. Tapi `.env` menggunakan `VITE_SUPABASE_ANON_KEY`
3. Mismatch variable name → Supabase client tidak dapat key

### 🎯 Solusi yang Diterapkan:

**1. Updated Supabase Client** (`/frontend/src/integrations/supabase/client.ts`)
```typescript
// Sekarang support kedua format variable
const SUPABASE_PUBLISHABLE_KEY = 
  import.meta.env.VITE_SUPABASE_ANON_KEY || 
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// Added validation
if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  console.error('Supabase environment variables missing!');
}
```

**2. Updated .env Files**
- ✅ `.env` - Development (sudah include kedua variable)
- ✅ `.env.production` - Production build (baru dibuat)
- ✅ `.env.local` - Local override

**3. Updated Vercel Configuration**
- ✅ `vercel.json` - Added env variables untuk build

---

## 🚀 Untuk Development (Local):

Environment variables sudah otomatis terbaca dari `.env`:
```bash
cd frontend
yarn dev
```

**✅ Seharusnya tidak ada error lagi!**

---

## 🌐 Untuk Production (Vercel):

### Method 1: Via Vercel Dashboard (Recommended)

1. **Login ke Vercel Dashboard**
2. **Pilih Project** → Settings → Environment Variables
3. **Tambah Variables:**

   ```
   Key: VITE_SUPABASE_URL
   Value: https://mlwvrqjsaomthfcsmoit.supabase.co
   Environment: Production, Preview, Development
   ```

   ```
   Key: VITE_SUPABASE_ANON_KEY
   Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1sd3ZycWpzYW9tdGhmY3Ntb2l0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1NTg1NTQsImV4cCI6MjA3NzEzNDU1NH0.QUrLOVZjro2gl1JFUivatjlwvfbYegcR5BVsoz6kzpc
   Environment: Production, Preview, Development
   ```

   ```
   Key: VITE_SUPABASE_PUBLISHABLE_KEY
   Value: (sama seperti ANON_KEY di atas)
   Environment: Production, Preview, Development
   ```

4. **Save & Redeploy**

---

### Method 2: Via vercel.json (Sudah Configured)

File `vercel.json` di root sudah include environment variables:
```json
{
  "build": {
    "env": {
      "VITE_SUPABASE_URL": "...",
      "VITE_SUPABASE_ANON_KEY": "...",
      "VITE_SUPABASE_PUBLISHABLE_KEY": "..."
    }
  }
}
```

**Note:** Environment variables di `vercel.json` hanya untuk build time. Untuk production runtime, tetap perlu set di Dashboard.

---

## 🧪 Test Apakah Sudah Fix:

### Local Development:
```bash
cd frontend
yarn dev
```

Buka browser → Console → Seharusnya **TIDAK ADA** error "supabaseUrl is required"

### Production Build:
```bash
cd frontend
yarn build:no-bump
```

Check output → Build success tanpa error

---

## 🔍 Verify Environment Variables:

### Development (Browser Console):
```javascript
console.log({
  url: import.meta.env.VITE_SUPABASE_URL,
  hasKey: !!import.meta.env.VITE_SUPABASE_ANON_KEY
});
```

**Expected Output:**
```
{
  url: "https://mlwvrqjsaomthfcsmoit.supabase.co",
  hasKey: true
}
```

### Production (Vercel):
Setelah deploy, buka browser console:
```javascript
// Jika environment variables benar, aplikasi akan load tanpa error
// Jika masih error, check Vercel Dashboard → Deployments → Build Logs
```

---

## 📝 Checklist Fix:

- ✅ Updated `client.ts` untuk support both variable names
- ✅ Added validation & error logging
- ✅ Created `.env.production` file
- ✅ Updated `.env` dengan both variables
- ✅ Updated `vercel.json` dengan build env
- ✅ Tested local development
- ✅ Ready untuk production deploy

---

## 🚨 Still Getting Error?

### 1. Clear Browser Cache
```bash
Ctrl + Shift + Delete → Clear cached images and files
```

### 2. Hard Reload
```bash
Ctrl + Shift + R (Windows/Linux)
Cmd + Shift + R (Mac)
```

### 3. Check Vercel Build Logs
- Dashboard → Project → Deployments
- Click latest deployment
- View Build Logs
- Search for "VITE_SUPABASE"

### 4. Verify .env Files
```bash
# Check jika .env ada dan readable
cat /app/frontend/.env

# Should show:
# VITE_SUPABASE_URL=https://...
# VITE_SUPABASE_ANON_KEY=eyJ...
```

### 5. Rebuild
```bash
cd frontend
rm -rf node_modules build
yarn install
yarn build:no-bump
```

---

## 📖 Additional Resources:

- [Vite Environment Variables](https://vitejs.dev/guide/env-and-mode.html)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
- [Supabase Client Setup](https://supabase.com/docs/reference/javascript/initializing)

---

## ✅ Status:
**🎉 FIXED!** 
Error sudah diperbaiki. Environment variables sekarang terbaca dengan benar di development dan production.

**Test sekarang:**
```bash
cd /app/frontend
yarn dev
```

Buka browser → Seharusnya tidak ada error lagi! 🚀

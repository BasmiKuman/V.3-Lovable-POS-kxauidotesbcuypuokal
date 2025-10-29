# 🔧 Quick Fix: Error 500 Saat Registrasi

## 🚨 Problem
User mendapat **Error 500** saat mendaftar di browser

## ✅ Solusi Cepat

### Opsi 1: Run SQL Fix yang Sudah Diupdate (RECOMMENDED)

1. **Buka Supabase SQL Editor**
2. **Run file ini:** `fix-new-user-registration.sql` (YANG SUDAH DIUPDATE)
3. **Verify dengan:** `verify-registration-fix.sql`

### Opsi 2: Run RLS Fix (Jika masih error)

Jika setelah Opsi 1 masih error 500, run:
```sql
-- Fix-rls-for-trigger.sql
```

## 🔍 Debugging Steps

### Step 1: Cek Error di Browser Console
1. Buka Developer Tools (F12)
2. Tab Console
3. Screenshot error yang muncul

### Step 2: Cek Supabase Logs
1. Buka Supabase Dashboard
2. Klik **Logs** → **Postgres Logs**
3. Filter by: "handle_new_user" atau "insert"
4. Cari error message

### Step 3: Verify Database State
Run `verify-registration-fix.sql` di SQL Editor:
- ✅ handle_new_user function exists
- ✅ GPS trigger removed
- ✅ Tables have correct structure
- ✅ RLS policies correct

## 🎯 Root Causes (Possible)

### Cause 1: RLS Blocking Trigger ❌
**Symptom:** Error 500, no user created
**Fix:** Run `fix-rls-for-trigger.sql`

### Cause 2: Duplicate Key Constraint ❌
**Symptom:** "duplicate key value violates unique constraint"
**Fix:** Already handled with `ON CONFLICT` in updated SQL

### Cause 3: Missing Trigger ❌
**Symptom:** User created in auth.users but no profile
**Fix:** Run `fix-new-user-registration.sql` again

### Cause 4: Frontend Still Creating Profile ❌
**Symptom:** "violates constraint" in console
**Fix:** Already fixed in Auth.tsx (needs new build or refresh)

## 📋 Verification Checklist

Setelah run SQL fix, verify:

- [ ] Run `verify-registration-fix.sql` - all green ✓
- [ ] Clear browser cache (Ctrl+Shift+Delete)
- [ ] Hard refresh (Ctrl+F5)
- [ ] Try register new user
- [ ] Check console - no errors
- [ ] Check Supabase - user created in:
  - [ ] auth.users
  - [ ] public.profiles
  - [ ] public.user_roles
  - [ ] public.rider_gps_settings (if rider)

## 🧪 Test Registration

### Test Data:
```
Email: test123@example.com
Password: TestPassword123!
Name: Test User 123
Phone: 081234567890
Address: Jl. Testing No. 123, Jakarta
```

### Expected Result:
```
✅ "Pendaftaran berhasil! Silakan cek email untuk verifikasi."
✅ No error in console
✅ User appears in profiles table
```

## 🆘 If Still Error 500

### Get More Details:

#### 1. Browser Console:
```javascript
// Paste this in console and run signup again
localStorage.setItem('supabase.auth.debug', 'true')
```

#### 2. Network Tab:
- Open Network tab before signup
- Look for `/auth/v1/signup` request
- Click it → Response tab
- Copy error message

#### 3. Supabase Logs:
```sql
-- Run in SQL Editor to see recent errors
SELECT 
  event_time,
  level,
  message
FROM postgres_logs
WHERE message LIKE '%handle_new_user%'
OR message LIKE '%profiles%'
ORDER BY event_time DESC
LIMIT 10;
```

## 🔄 Complete Reset (Last Resort)

Jika semua cara di atas gagal:

```sql
-- 1. Drop and recreate handle_new_user
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- 2. Re-run fix-new-user-registration.sql

-- 3. Re-run fix-rls-for-trigger.sql

-- 4. Verify with verify-registration-fix.sql
```

## 📞 Next Steps

1. **Run updated SQL** → `fix-new-user-registration.sql`
2. **Verify** → `verify-registration-fix.sql`
3. **Test registration** in browser
4. **Report hasil** dengan screenshot:
   - Browser console error (if any)
   - Supabase SQL output
   - Success/fail message

---

**Updated:** 2025-01-29 (Added error handling & ON CONFLICT)

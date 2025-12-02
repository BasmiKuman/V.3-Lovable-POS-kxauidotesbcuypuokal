-- Fix: Missing profile for user 2454b70f-d2cc-456e-9dec-bcf36846e47e
-- This user has GPS settings but NO profile!

-- 1. Check if profile exists
SELECT 
  'Profile check' as status,
  user_id,
  full_name,
  phone,
  created_at
FROM profiles
WHERE user_id = '2454b70f-d2cc-456e-9dec-bcf36846e47e';

-- 2. Check if user exists in auth.users
SELECT 
  'Auth user check' as status,
  id,
  email,
  raw_user_meta_data->>'full_name' as metadata_name,
  raw_user_meta_data->>'phone' as metadata_phone,
  created_at
FROM auth.users
WHERE id = '2454b70f-d2cc-456e-9dec-bcf36846e47e';

-- 3. Create missing profile from auth metadata
INSERT INTO profiles (user_id, full_name, phone, address)
SELECT 
  id as user_id,
  COALESCE(raw_user_meta_data->>'full_name', email) as full_name,
  COALESCE(raw_user_meta_data->>'phone', '') as phone,
  COALESCE(raw_user_meta_data->>'address', '') as address
FROM auth.users
WHERE id = '2454b70f-d2cc-456e-9dec-bcf36846e47e'
ON CONFLICT (user_id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  phone = EXCLUDED.phone,
  address = EXCLUDED.address;

-- 4. Verify profile created
SELECT 
  'After fix' as status,
  user_id,
  full_name,
  phone,
  address,
  created_at
FROM profiles
WHERE user_id = '2454b70f-d2cc-456e-9dec-bcf36846e47e';

-- 5. Check user_roles
SELECT 
  'User role check' as status,
  user_id,
  role,
  created_at
FROM user_roles
WHERE user_id = '2454b70f-d2cc-456e-9dec-bcf36846e47e';

-- 6. If no role, create it
INSERT INTO user_roles (user_id, role)
VALUES ('2454b70f-d2cc-456e-9dec-bcf36846e47e', 'rider')
ON CONFLICT (user_id) DO NOTHING;

-- 7. Final verification - all data should be complete now
SELECT 
  'FINAL CHECK' as status,
  p.user_id,
  p.full_name,
  p.phone,
  ur.role,
  rgs.consent_given,
  rgs.tracking_enabled
FROM profiles p
LEFT JOIN user_roles ur ON ur.user_id = p.user_id
LEFT JOIN rider_gps_settings rgs ON rgs.rider_id = p.user_id
WHERE p.user_id = '2454b70f-d2cc-456e-9dec-bcf36846e47e';

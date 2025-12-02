-- Fix: Profile tidak terbuat saat user register
-- Problem: User ada di auth.users tapi tidak ada di profiles table
-- Diagnosis dan Fix

-- ========================================
-- STEP 1: DIAGNOSTIC - Check Current State
-- ========================================

-- 1.1 Check users without profiles
SELECT 
  'Users WITHOUT profiles' as check_type,
  au.id,
  au.email,
  au.created_at,
  au.email_confirmed_at,
  au.raw_user_meta_data->>'full_name' as metadata_name,
  au.raw_user_meta_data->>'phone' as metadata_phone
FROM auth.users au
LEFT JOIN public.profiles p ON p.user_id = au.id
WHERE p.user_id IS NULL
ORDER BY au.created_at DESC;

-- 1.2 Check if handle_new_user function exists
SELECT 
  'Function exists:' as status,
  routine_name,
  routine_type,
  security_type,
  routine_definition
FROM information_schema.routines 
WHERE routine_name = 'handle_new_user' 
AND routine_schema = 'public';

-- 1.3 Check if trigger exists
SELECT 
  'Trigger exists:' as status,
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created'
AND event_object_schema = 'auth';

-- ========================================
-- STEP 2: FIX - Recreate handle_new_user Function
-- ========================================

-- Drop and recreate the function with proper error handling
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER -- Run with elevated privileges to bypass RLS
SET search_path = public
AS $$
DECLARE
  v_role app_role;
  v_full_name TEXT;
  v_phone TEXT;
  v_address TEXT;
BEGIN
  -- Log the trigger execution
  RAISE NOTICE 'handle_new_user triggered for user: %', NEW.id;

  -- Extract metadata
  v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1));
  v_phone := COALESCE(NEW.raw_user_meta_data->>'phone', '');
  v_address := COALESCE(NEW.raw_user_meta_data->>'address', '');

  -- Determine role based on email
  IF NEW.email IN ('fadlannafian@gmail.com', 'aldidiaky@gmail.com') THEN
    v_role := 'admin';
  ELSE
    v_role := 'rider';
  END IF;

  RAISE NOTICE 'Creating profile for user % with role %', NEW.id, v_role;

  -- Create profile (use UPSERT to handle race conditions)
  INSERT INTO public.profiles (user_id, full_name, phone, address, created_at, updated_at)
  VALUES (
    NEW.id,
    v_full_name,
    v_phone,
    v_address,
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    updated_at = NOW();
  
  RAISE NOTICE 'Profile created successfully for user %', NEW.id;

  -- Assign role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, v_role)
  ON CONFLICT (user_id) DO UPDATE SET
    role = EXCLUDED.role;
  
  RAISE NOTICE 'Role assigned successfully for user %', NEW.id;

  -- Create GPS settings for riders only
  IF v_role = 'rider' THEN
    INSERT INTO public.rider_gps_settings (rider_id, tracking_enabled)
    VALUES (NEW.id, false)
    ON CONFLICT (rider_id) DO NOTHING;
    
    RAISE NOTICE 'GPS settings created for rider %', NEW.id;
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log detailed error but don't block user creation
    RAISE WARNING 'ERROR in handle_new_user for user %: % - %', NEW.id, SQLERRM, SQLSTATE;
    -- Still return NEW so auth user is created
    RETURN NEW;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO postgres;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO anon;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;

-- ========================================
-- STEP 3: Recreate Trigger
-- ========================================

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger on auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ========================================
-- STEP 4: Backfill Missing Profiles
-- ========================================

-- Create profiles for existing users who don't have one
INSERT INTO public.profiles (user_id, full_name, phone, address, created_at, updated_at)
SELECT 
  au.id,
  COALESCE(au.raw_user_meta_data->>'full_name', split_part(au.email, '@', 1)),
  COALESCE(au.raw_user_meta_data->>'phone', ''),
  COALESCE(au.raw_user_meta_data->>'address', ''),
  au.created_at,
  NOW()
FROM auth.users au
LEFT JOIN public.profiles p ON p.user_id = au.id
WHERE p.user_id IS NULL
ON CONFLICT (user_id) DO NOTHING;

-- Create user_roles for users without roles
INSERT INTO public.user_roles (user_id, role)
SELECT 
  au.id,
  CASE 
    WHEN au.email IN ('fadlannafian@gmail.com', 'aldidiaky@gmail.com') THEN 'admin'::app_role
    ELSE 'rider'::app_role
  END
FROM auth.users au
LEFT JOIN public.user_roles ur ON ur.user_id = au.id
WHERE ur.user_id IS NULL
ON CONFLICT (user_id) DO NOTHING;

-- Create GPS settings for riders without settings
INSERT INTO public.rider_gps_settings (rider_id, tracking_enabled)
SELECT ur.user_id, false
FROM public.user_roles ur
WHERE ur.role = 'rider'
AND NOT EXISTS (
  SELECT 1 FROM public.rider_gps_settings rgs
  WHERE rgs.rider_id = ur.user_id
)
ON CONFLICT (rider_id) DO NOTHING;

-- ========================================
-- STEP 5: Verify Fix
-- ========================================

-- Check if all users now have profiles
SELECT 
  'Verification: Users without profiles' as check_type,
  COUNT(*) as count
FROM auth.users au
LEFT JOIN public.profiles p ON p.user_id = au.id
WHERE p.user_id IS NULL;

-- Show recent users with their data
SELECT 
  au.email,
  p.full_name,
  p.phone,
  ur.role,
  CASE WHEN rgs.rider_id IS NOT NULL THEN 'Yes' ELSE 'No' END as has_gps,
  au.created_at
FROM auth.users au
LEFT JOIN public.profiles p ON p.user_id = au.id
LEFT JOIN public.user_roles ur ON ur.user_id = au.id
LEFT JOIN public.rider_gps_settings rgs ON rgs.rider_id = au.id
ORDER BY au.created_at DESC
LIMIT 10;

-- ========================================
-- STEP 6: Test the Trigger (Manual Test)
-- ========================================

-- You can test by creating a new user in Supabase Auth dashboard
-- or through your app's registration
-- The trigger should automatically create profile, role, and GPS settings

SELECT 
  'Fix completed!' as status,
  'Check the verification results above' as next_step,
  'Try registering a new user to test' as test_recommendation;

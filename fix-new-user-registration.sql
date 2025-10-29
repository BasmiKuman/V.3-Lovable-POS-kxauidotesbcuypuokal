-- Fix: User registration error - Race condition between triggers
-- Problem: create_rider_gps_settings() runs before user_roles is created
-- Solution: Move GPS settings creation to handle_new_user function

-- Step 1: Drop the old GPS settings trigger (we'll integrate it into handle_new_user)
DROP TRIGGER IF EXISTS trigger_create_gps_settings ON auth.users;

-- Step 2: Update handle_new_user to include GPS settings creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role TEXT;
BEGIN
  -- Create profile with all metadata (phone and address included)
  INSERT INTO public.profiles (user_id, full_name, phone, address)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    COALESCE(NEW.raw_user_meta_data->>'address', '')
  );
  
  -- Assign rider role by default (unless it's the admin email)
  IF NEW.email = 'fadlannafian@gmail.com' THEN
    v_role := 'admin';
  ELSE
    v_role := 'rider';
  END IF;
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, v_role);
  
  -- Create GPS settings for riders (after role is assigned)
  IF v_role = 'rider' THEN
    INSERT INTO public.rider_gps_settings (rider_id)
    VALUES (NEW.id)
    ON CONFLICT (rider_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Step 3: Verify the fix
SELECT 
  'handle_new_user function updated successfully' as status,
  routine_type,
  security_type
FROM information_schema.routines 
WHERE routine_name = 'handle_new_user' 
AND routine_schema = 'public';

-- Step 4: Check if trigger_create_gps_settings is removed
SELECT 
  CASE 
    WHEN COUNT(*) = 0 THEN 'GPS trigger successfully removed ✓'
    ELSE 'WARNING: GPS trigger still exists!'
  END as trigger_status
FROM information_schema.triggers
WHERE trigger_name = 'trigger_create_gps_settings';

-- Step 5: Create GPS settings for existing riders who don't have it yet
INSERT INTO rider_gps_settings (rider_id)
SELECT ur.user_id
FROM user_roles ur
WHERE ur.role = 'rider'
AND NOT EXISTS (
  SELECT 1 FROM rider_gps_settings rgs
  WHERE rgs.rider_id = ur.user_id
)
ON CONFLICT (rider_id) DO NOTHING;

-- Verify
SELECT 
  COUNT(*) as riders_with_gps_settings
FROM rider_gps_settings;

-- Show sample of recent profiles
SELECT 
  p.full_name,
  p.phone,
  ur.role,
  CASE WHEN rgs.rider_id IS NOT NULL THEN 'Yes' ELSE 'No' END as has_gps_settings,
  p.created_at
FROM profiles p
LEFT JOIN user_roles ur ON ur.user_id = p.user_id
LEFT JOIN rider_gps_settings rgs ON rgs.rider_id = p.user_id
ORDER BY p.created_at DESC
LIMIT 5;

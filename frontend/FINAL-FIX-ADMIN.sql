-- COMPLETE FIX - Run this entire script
-- This will fix infinite recursion and set you as admin

-- Step 1: Drop ALL policies to stop the recursion
DROP POLICY IF EXISTS "Users can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view all user_roles if admin" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Only admins can insert user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;

-- Step 2: Create simple non-recursive policies
-- Everyone can read all roles (needed to check if someone is admin)
CREATE POLICY "Anyone authenticated can view roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (true);

-- Step 3: Set your account as admin
DO $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Get your user_id
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'fadlannafian@gmail.com';
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found!';
  END IF;
  
  -- Delete any existing roles
  DELETE FROM public.user_roles WHERE user_id = v_user_id;
  
  -- Insert admin role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_user_id, 'admin');
  
  RAISE NOTICE 'SUCCESS! User % is now admin', v_user_id;
END $$;

-- Step 4: Verify it worked
SELECT 
  u.id,
  u.email,
  ur.role,
  CASE 
    WHEN ur.role = 'admin' THEN '✅ YOU ARE ADMIN!'
    ELSE '❌ Still not admin'
  END as status
FROM auth.users u
LEFT JOIN public.user_roles ur ON u.id = ur.user_id
WHERE u.email = 'fadlannafian@gmail.com';

-- Fix RLS policies dan set admin
-- Run this in Supabase SQL Editor

-- 1. First, set user as admin
DO $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Get user_id
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'fadlannafian@gmail.com';
  
  -- Delete rider role
  DELETE FROM public.user_roles
  WHERE user_id = v_user_id AND role = 'rider';
  
  -- Insert admin role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_user_id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RAISE NOTICE 'User set as admin: %', v_user_id;
END $$;

-- 2. Fix user_roles policies to allow reading own roles
DROP POLICY IF EXISTS "Users can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view all user_roles if admin" ON public.user_roles;

-- Create better policies
CREATE POLICY "Users can view own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id OR 
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
  )
);

-- 3. Verify
SELECT 
  u.id as user_id,
  u.email,
  ur.role,
  p.full_name
FROM auth.users u
LEFT JOIN public.user_roles ur ON u.id = ur.user_id
LEFT JOIN public.profiles p ON u.id = p.user_id
WHERE u.email = 'fadlannafian@gmail.com';

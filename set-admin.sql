-- Set fadlannafian@gmail.com as admin
-- Run this in Supabase SQL Editor

-- First, get the user_id
DO $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Get user_id from auth.users
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'fadlannafian@gmail.com';
  
  -- Delete existing rider role if exists
  DELETE FROM public.user_roles
  WHERE user_id = v_user_id AND role = 'rider';
  
  -- Insert admin role (or update if exists)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_user_id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RAISE NOTICE 'User % set as admin successfully!', v_user_id;
END $$;

-- Verify the change
SELECT 
  u.email,
  ur.role,
  p.full_name
FROM auth.users u
JOIN public.user_roles ur ON u.id = ur.user_id
JOIN public.profiles p ON u.id = p.user_id
WHERE u.email = 'fadlannafian@gmail.com';

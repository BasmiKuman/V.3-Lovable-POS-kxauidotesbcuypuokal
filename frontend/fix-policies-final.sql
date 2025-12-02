-- Final fix untuk RLS policies - NO RECURSION!
-- Drop semua policies lama di user_roles dan buat ulang yang benar

-- Drop ALL existing policies on user_roles
DROP POLICY IF EXISTS "Users can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view all user_roles if admin" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Only admins can insert user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;

-- Simple policy: authenticated users can view ALL roles
-- This prevents infinite recursion
CREATE POLICY "Authenticated users can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (true);

-- Only allow system/service role to insert/update/delete
-- Regular users cannot modify roles directly
CREATE POLICY "Service role can manage roles"
ON public.user_roles
FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role');

-- Verify current user is admin
SELECT 
  u.email,
  ur.role,
  'You are now admin!' as status
FROM auth.users u
JOIN public.user_roles ur ON u.id = ur.user_id
WHERE u.email = 'fadlannafian@gmail.com';

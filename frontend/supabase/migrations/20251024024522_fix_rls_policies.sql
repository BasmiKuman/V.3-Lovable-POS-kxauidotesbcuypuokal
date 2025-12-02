-- Enable RLS on all relevant tables
ALTER TABLE auth.users SECURITY INVOKER;

-- Enable RLS on required tables
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Update profiles policies
DROP POLICY IF EXISTS "Users can view all profiles if admin" ON public.profiles;
CREATE POLICY "Users can view all profiles if admin"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
  OR user_id = auth.uid()
);

-- Add user_roles policies
DROP POLICY IF EXISTS "Users can view all user_roles if admin" ON public.user_roles;
CREATE POLICY "Users can view all user_roles if admin"
ON public.user_roles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
  OR user_id = auth.uid()
);

-- Allow admins to insert into user_roles
DROP POLICY IF EXISTS "Only admins can insert user roles" ON public.user_roles;
CREATE POLICY "Only admins can insert user roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
);
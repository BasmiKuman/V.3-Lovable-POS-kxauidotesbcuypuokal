-- Fix RLS policy for profiles table - Allow admin to insert new profiles
-- This fixes the issue: "new row violates row level security for tables profiles"

-- Drop existing policies (if any)
DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;

-- Create policy to allow admin to insert new profiles
CREATE POLICY "Admins can insert profiles"
  ON public.profiles 
  FOR INSERT
  WITH CHECK (
    -- Allow admin to insert any profile
    public.has_role(auth.uid(), 'admin')
    OR
    -- Allow user to insert their own profile (for auto-signup)
    auth.uid() = user_id
  );

-- Also ensure admins can delete profiles if needed
CREATE POLICY "Admins can delete profiles"
  ON public.profiles 
  FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

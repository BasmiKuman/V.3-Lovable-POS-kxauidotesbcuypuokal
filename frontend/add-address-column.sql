-- Add address column to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS address TEXT;

-- Update RLS policies if needed (existing policies should still work)
COMMENT ON COLUMN profiles.address IS 'User address for delivery/contact information';

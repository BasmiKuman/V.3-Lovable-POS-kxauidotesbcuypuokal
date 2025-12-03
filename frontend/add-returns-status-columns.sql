-- Add status tracking columns to returns table
-- Run this in Supabase SQL Editor

-- 1. Add status column if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'returns' 
        AND column_name = 'status'
    ) THEN
        ALTER TABLE returns 
        ADD COLUMN status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected'));
    END IF;
END $$;

-- 2. Add approved_by column if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'returns' 
        AND column_name = 'approved_by'
    ) THEN
        ALTER TABLE returns 
        ADD COLUMN approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 3. Add approved_at column if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'returns' 
        AND column_name = 'approved_at'
    ) THEN
        ALTER TABLE returns 
        ADD COLUMN approved_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- 4. Update existing records to have 'approved' status (if any old data)
UPDATE returns 
SET status = 'approved',
    approved_at = returned_at
WHERE status IS NULL;

-- 5. Enable RLS on returns table
ALTER TABLE returns ENABLE ROW LEVEL SECURITY;

-- 6. Drop existing policies if any
DROP POLICY IF EXISTS "Riders can insert their own returns" ON returns;
DROP POLICY IF EXISTS "Riders can view their own returns" ON returns;
DROP POLICY IF EXISTS "Admins can view all returns" ON returns;
DROP POLICY IF EXISTS "Admins can approve/reject returns" ON returns;

-- 7. Create RLS policies

-- Riders can insert their own returns
CREATE POLICY "Riders can insert their own returns"
ON returns FOR INSERT
TO authenticated
WITH CHECK (
    auth.uid() = rider_id
    OR
    EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_id = auth.uid()
        AND role IN ('admin', 'super_admin')
    )
);

-- Riders can view their own returns
CREATE POLICY "Riders can view their own returns"
ON returns FOR SELECT
TO authenticated
USING (
    auth.uid() = rider_id
    OR
    EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_id = auth.uid()
        AND role IN ('admin', 'super_admin')
    )
);

-- Admins can view all returns
CREATE POLICY "Admins can view all returns"
ON returns FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_id = auth.uid()
        AND role IN ('admin', 'super_admin')
    )
);

-- Admins can update returns (approve/reject)
CREATE POLICY "Admins can approve/reject returns"
ON returns FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_id = auth.uid()
        AND role IN ('admin', 'super_admin')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_id = auth.uid()
        AND role IN ('admin', 'super_admin')
    )
);

-- 8. Grant permissions
GRANT SELECT, INSERT ON returns TO authenticated;
GRANT UPDATE ON returns TO authenticated;

-- Done! Now returns table supports status tracking

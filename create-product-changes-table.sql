-- Create product_changes table for tracking all product modifications
-- This includes changes from production, manual stock adjustments, and product info updates

CREATE TABLE IF NOT EXISTS product_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  changed_by UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  change_type TEXT NOT NULL, -- 'production', 'manual_adjustment', 'info_update'
  field_changed TEXT, -- 'name', 'sku', 'price', 'stock', 'min_stock', 'description', 'category'
  old_value TEXT,
  new_value TEXT,
  quantity_change INTEGER, -- For stock changes: positive for increase, negative for decrease
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_product_changes_product_id ON product_changes(product_id);
CREATE INDEX IF NOT EXISTS idx_product_changes_changed_by ON product_changes(changed_by);
CREATE INDEX IF NOT EXISTS idx_product_changes_created_at ON product_changes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_product_changes_change_type ON product_changes(change_type);

-- Add RLS policies
ALTER TABLE product_changes ENABLE ROW LEVEL SECURITY;

-- Policy: Allow all authenticated users to read product changes
CREATE POLICY "Allow read product_changes for authenticated users"
  ON product_changes
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Allow authenticated users to insert product changes
CREATE POLICY "Allow insert product_changes for authenticated users"
  ON product_changes
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Add comments
COMMENT ON TABLE product_changes IS 'Tracks all changes made to products including production, stock adjustments, and info updates';
COMMENT ON COLUMN product_changes.change_type IS 'Type of change: production, manual_adjustment, or info_update';
COMMENT ON COLUMN product_changes.field_changed IS 'Which field was changed (for info_update type)';
COMMENT ON COLUMN product_changes.quantity_change IS 'Stock quantity change (positive for increase, negative for decrease)';

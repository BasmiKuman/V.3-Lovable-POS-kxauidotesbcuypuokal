-- Create production_history table
CREATE TABLE IF NOT EXISTS production_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  notes TEXT,
  produced_by UUID NOT NULL REFERENCES auth.users(id),
  produced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_production_history_product_id ON production_history(product_id);
CREATE INDEX IF NOT EXISTS idx_production_history_produced_at ON production_history(produced_at DESC);
CREATE INDEX IF NOT EXISTS idx_production_history_produced_by ON production_history(produced_by);

-- Enable RLS
ALTER TABLE production_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Admin can view all production history
CREATE POLICY "Admin can view all production history"
  ON production_history
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Admin can insert production history
CREATE POLICY "Admin can insert production history"
  ON production_history
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Admin can update production history
CREATE POLICY "Admin can update production history"
  ON production_history
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Admin can delete production history
CREATE POLICY "Admin can delete production history"
  ON production_history
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Function to add production and update stock
CREATE OR REPLACE FUNCTION add_production(
  p_product_id UUID,
  p_quantity INTEGER,
  p_notes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_production_id UUID;
  v_user_id UUID;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  -- Check if user is admin
  IF NOT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = v_user_id AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only admin can add production';
  END IF;

  -- Check if product exists
  IF NOT EXISTS (SELECT 1 FROM products WHERE id = p_product_id) THEN
    RAISE EXCEPTION 'Product not found';
  END IF;

  -- Insert production history
  INSERT INTO production_history (product_id, quantity, notes, produced_by)
  VALUES (p_product_id, p_quantity, p_notes, v_user_id)
  RETURNING id INTO v_production_id;

  -- Update product stock
  UPDATE products
  SET stock_in_warehouse = stock_in_warehouse + p_quantity
  WHERE id = p_product_id;

  RETURN v_production_id;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION add_production(UUID, INTEGER, TEXT) TO authenticated;

COMMENT ON TABLE production_history IS 'Tracks all production activities and stock additions';
COMMENT ON FUNCTION add_production IS 'Adds production record and automatically updates product stock in warehouse';

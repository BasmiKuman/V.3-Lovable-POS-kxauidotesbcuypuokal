-- Production Tracking System
-- Table untuk menyimpan history produksi

-- Create production_history table
CREATE TABLE IF NOT EXISTS production_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  notes TEXT,
  produced_by UUID REFERENCES profiles(user_id) ON DELETE SET NULL,
  produced_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add index for faster queries
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

-- Function to add production and update stock atomically
CREATE OR REPLACE FUNCTION add_production(
  p_product_id UUID,
  p_quantity INTEGER,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_stock INTEGER;
  v_new_stock INTEGER;
  v_production_id UUID;
  v_result JSON;
BEGIN
  -- Check if user is admin
  IF NOT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only admins can add production';
  END IF;

  -- Validate quantity
  IF p_quantity <= 0 THEN
    RAISE EXCEPTION 'Quantity must be greater than 0';
  END IF;

  -- Get current stock
  SELECT stock_in_warehouse INTO v_current_stock
  FROM products
  WHERE id = p_product_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product not found';
  END IF;

  -- Calculate new stock
  v_new_stock := v_current_stock + p_quantity;

  -- Insert production history
  INSERT INTO production_history (product_id, quantity, notes, produced_by)
  VALUES (p_product_id, p_quantity, p_notes, auth.uid())
  RETURNING id INTO v_production_id;

  -- Update product stock
  UPDATE products
  SET stock_in_warehouse = v_new_stock,
      updated_at = now()
  WHERE id = p_product_id;

  -- Return result
  v_result := json_build_object(
    'production_id', v_production_id,
    'product_id', p_product_id,
    'quantity', p_quantity,
    'previous_stock', v_current_stock,
    'new_stock', v_new_stock
  );

  RETURN v_result;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION add_production TO authenticated;

-- Comment on objects
COMMENT ON TABLE production_history IS 'Menyimpan history produksi untuk monitoring';
COMMENT ON FUNCTION add_production IS 'Menambahkan produksi baru dan update stok produk secara atomic';

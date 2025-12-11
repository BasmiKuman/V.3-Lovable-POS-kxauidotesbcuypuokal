-- ============================================
-- END-OF-DAY STOCK REPORT SYSTEM
-- Version: 1.2.0
-- Feature Branch: feature/end-of-day-stock-report
-- ============================================

-- ============================================
-- TABLE 1: END_OF_DAY_REPORTS
-- Stores the main report record for each rider per day
-- ============================================
CREATE TABLE IF NOT EXISTS public.end_of_day_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rider_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  report_date DATE NOT NULL,
  submitted_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  notes TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'submitted')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(rider_id, report_date)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_eod_reports_rider_date ON public.end_of_day_reports(rider_id, report_date);
CREATE INDEX IF NOT EXISTS idx_eod_reports_status ON public.end_of_day_reports(status);
CREATE INDEX IF NOT EXISTS idx_eod_reports_date ON public.end_of_day_reports(report_date DESC);

-- Comments
COMMENT ON TABLE public.end_of_day_reports IS 'Stores end-of-day stock count reports submitted by admin';
COMMENT ON COLUMN public.end_of_day_reports.rider_id IS 'The rider whose stock is being reported';
COMMENT ON COLUMN public.end_of_day_reports.submitted_by IS 'Admin who input the remaining stock';
COMMENT ON COLUMN public.end_of_day_reports.status IS 'draft: Being edited, submitted: Final & auto-generates adjustment transaction';

-- ============================================
-- TABLE 2: END_OF_DAY_ITEMS
-- Stores per-product stock details for each report
-- ============================================
CREATE TABLE IF NOT EXISTS public.end_of_day_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES public.end_of_day_reports(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  distributed_quantity INTEGER NOT NULL CHECK (distributed_quantity >= 0),
  remaining_quantity INTEGER NOT NULL CHECK (remaining_quantity >= 0),
  sold_quantity INTEGER NOT NULL CHECK (sold_quantity >= 0),
  pos_quantity INTEGER NOT NULL DEFAULT 0 CHECK (pos_quantity >= 0),
  adjustment_quantity INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(report_id, product_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_eod_items_report ON public.end_of_day_items(report_id);
CREATE INDEX IF NOT EXISTS idx_eod_items_product ON public.end_of_day_items(product_id);

-- Comments
COMMENT ON TABLE public.end_of_day_items IS 'Per-product breakdown of end-of-day stock count';
COMMENT ON COLUMN public.end_of_day_items.distributed_quantity IS 'Total quantity distributed to rider today (from distribution table)';
COMMENT ON COLUMN public.end_of_day_items.remaining_quantity IS 'Remaining stock input by admin (actual count)';
COMMENT ON COLUMN public.end_of_day_items.sold_quantity IS 'Calculated: distributed - remaining';
COMMENT ON COLUMN public.end_of_day_items.pos_quantity IS 'Quantity sold via POS transactions (recorded sales)';
COMMENT ON COLUMN public.end_of_day_items.adjustment_quantity IS 'Calculated: sold - pos (unrecorded sales)';

-- ============================================
-- TABLE 3: STOCK_ADJUSTMENTS
-- Audit trail for adjustment transactions
-- ============================================
CREATE TABLE IF NOT EXISTS public.stock_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID REFERENCES public.end_of_day_reports(id) ON DELETE SET NULL,
  transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
  rider_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL,
  reason TEXT DEFAULT 'End of Day Stock Count Adjustment',
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_stock_adj_report ON public.stock_adjustments(report_id);
CREATE INDEX IF NOT EXISTS idx_stock_adj_transaction ON public.stock_adjustments(transaction_id);
CREATE INDEX IF NOT EXISTS idx_stock_adj_rider ON public.stock_adjustments(rider_id);
CREATE INDEX IF NOT EXISTS idx_stock_adj_date ON public.stock_adjustments(created_at DESC);

-- Comments
COMMENT ON TABLE public.stock_adjustments IS 'Audit trail for stock adjustment transactions generated from end-of-day reports';
COMMENT ON COLUMN public.stock_adjustments.transaction_id IS 'Links to the generated adjustment transaction in transactions table';

-- ============================================
-- RLS POLICIES
-- ============================================

-- Enable RLS
ALTER TABLE public.end_of_day_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.end_of_day_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_adjustments ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS: END_OF_DAY_REPORTS
-- ============================================

-- Super Admin: Full access
DROP POLICY IF EXISTS "super_admin_end_of_day_reports_all" ON public.end_of_day_reports;
CREATE POLICY "super_admin_end_of_day_reports_all"
ON public.end_of_day_reports
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'super_admin'
  )
);

-- Admin: Can create and view
DROP POLICY IF EXISTS "admin_end_of_day_reports_insert" ON public.end_of_day_reports;
CREATE POLICY "admin_end_of_day_reports_insert"
ON public.end_of_day_reports
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('super_admin', 'admin')
  )
);

DROP POLICY IF EXISTS "admin_end_of_day_reports_select" ON public.end_of_day_reports;
CREATE POLICY "admin_end_of_day_reports_select"
ON public.end_of_day_reports
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('super_admin', 'admin')
  )
);

-- Admin: Can update own submissions (draft status only)
DROP POLICY IF EXISTS "admin_end_of_day_reports_update" ON public.end_of_day_reports;
CREATE POLICY "admin_end_of_day_reports_update"
ON public.end_of_day_reports
FOR UPDATE
TO authenticated
USING (
  status = 'draft' AND
  submitted_by = auth.uid() AND
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('super_admin', 'admin')
  )
);

-- ============================================
-- RLS: END_OF_DAY_ITEMS
-- ============================================

-- Admin: Can manage items for reports they have access to
DROP POLICY IF EXISTS "admin_end_of_day_items_all" ON public.end_of_day_items;
CREATE POLICY "admin_end_of_day_items_all"
ON public.end_of_day_items
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('super_admin', 'admin')
  )
);

-- ============================================
-- RLS: STOCK_ADJUSTMENTS
-- ============================================

-- Admin: Can view and create adjustments
DROP POLICY IF EXISTS "admin_stock_adjustments_select" ON public.stock_adjustments;
CREATE POLICY "admin_stock_adjustments_select"
ON public.stock_adjustments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('super_admin', 'admin')
  )
);

DROP POLICY IF EXISTS "admin_stock_adjustments_insert" ON public.stock_adjustments;
CREATE POLICY "admin_stock_adjustments_insert"
ON public.stock_adjustments
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('super_admin', 'admin')
  )
);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function: Get distributed quantity for rider on specific date
CREATE OR REPLACE FUNCTION get_distributed_quantity(
  p_rider_id UUID,
  p_product_id UUID,
  p_date DATE
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_quantity INTEGER;
BEGIN
  SELECT COALESCE(SUM(d.quantity), 0)
  INTO v_quantity
  FROM distributions d
  WHERE d.rider_id = p_rider_id
  AND d.product_id = p_product_id
  AND DATE(d.created_at) = p_date;
  
  RETURN v_quantity;
END;
$$;

-- Function: Get POS sales quantity for rider on specific date
CREATE OR REPLACE FUNCTION get_pos_quantity(
  p_rider_id UUID,
  p_product_id UUID,
  p_date DATE
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_quantity INTEGER;
BEGIN
  SELECT COALESCE(SUM(ti.quantity), 0)
  INTO v_quantity
  FROM transactions t
  JOIN transaction_items ti ON t.id = ti.transaction_id
  WHERE t.rider_id = p_rider_id
  AND ti.product_id = p_product_id
  AND DATE(t.created_at) = p_date;
  
  RETURN v_quantity;
END;
$$;

-- Function: Generate adjustment transaction
CREATE OR REPLACE FUNCTION generate_adjustment_transaction(
  p_report_id UUID,
  p_rider_id UUID,
  p_submitted_by UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_transaction_id UUID;
  v_item RECORD;
  v_subtotal DECIMAL(10,2) := 0;
BEGIN
  -- Get items that need adjustment
  FOR v_item IN
    SELECT 
      product_id,
      adjustment_quantity,
      (SELECT price FROM products WHERE id = product_id) as price
    FROM end_of_day_items
    WHERE report_id = p_report_id
    AND adjustment_quantity > 0
  LOOP
    v_subtotal := v_subtotal + (v_item.adjustment_quantity * v_item.price);
  END LOOP;
  
  -- Only create transaction if there are adjustments
  IF v_subtotal > 0 THEN
    -- Create adjustment transaction
    INSERT INTO transactions (
      rider_id,
      subtotal,
      tax_amount,
      total_amount,
      payment_method,
      notes
    )
    VALUES (
      p_rider_id,
      v_subtotal,
      0,
      v_subtotal,
      'Stock Adjustment',
      'Auto-generated from end-of-day stock count'
    )
    RETURNING id INTO v_transaction_id;
    
    -- Create transaction items
    FOR v_item IN
      SELECT 
        product_id,
        adjustment_quantity,
        (SELECT price FROM products WHERE id = product_id) as price
      FROM end_of_day_items
      WHERE report_id = p_report_id
      AND adjustment_quantity > 0
    LOOP
      INSERT INTO transaction_items (
        transaction_id,
        product_id,
        quantity,
        price,
        subtotal
      )
      VALUES (
        v_transaction_id,
        v_item.product_id,
        v_item.adjustment_quantity,
        v_item.price,
        v_item.adjustment_quantity * v_item.price
      );
      
      -- Create stock adjustment record
      INSERT INTO stock_adjustments (
        report_id,
        transaction_id,
        rider_id,
        product_id,
        quantity,
        created_by
      )
      VALUES (
        p_report_id,
        v_transaction_id,
        p_rider_id,
        v_item.product_id,
        v_item.adjustment_quantity,
        p_submitted_by
      );
    END LOOP;
  END IF;
  
  RETURN v_transaction_id;
END;
$$;

-- ============================================
-- GRANT PERMISSIONS
-- ============================================

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.end_of_day_reports TO authenticated;
GRANT ALL ON public.end_of_day_items TO authenticated;
GRANT ALL ON public.stock_adjustments TO authenticated;
GRANT EXECUTE ON FUNCTION get_distributed_quantity TO authenticated;
GRANT EXECUTE ON FUNCTION get_pos_quantity TO authenticated;
GRANT EXECUTE ON FUNCTION generate_adjustment_transaction TO authenticated;

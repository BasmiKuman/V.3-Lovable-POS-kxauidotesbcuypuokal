-- Create return history table
CREATE TABLE public.return_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  rider_id uuid NOT NULL,
  quantity integer NOT NULL,
  notes text,
  returned_at timestamp with time zone NOT NULL,
  approved_at timestamp with time zone NOT NULL DEFAULT now(),
  approved_by uuid NOT NULL
);

-- Enable RLS
ALTER TABLE public.return_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view relevant return history"
ON public.return_history
FOR SELECT
USING (
  auth.uid() = rider_id OR 
  has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Only admins can insert return history"
ON public.return_history
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Add index for better performance
CREATE INDEX idx_return_history_rider_id ON public.return_history(rider_id);
CREATE INDEX idx_return_history_product_id ON public.return_history(product_id);
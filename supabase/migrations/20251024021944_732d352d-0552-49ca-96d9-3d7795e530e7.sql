-- Create policies only if they don't already exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'returns' AND policyname = 'Admins can update returns'
  ) THEN
    CREATE POLICY "Admins can update returns" ON public.returns
    FOR UPDATE TO authenticated
    USING (has_role(auth.uid(), 'admin'::app_role))
    WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'returns' AND policyname = 'Admins can delete returns'
  ) THEN
    CREATE POLICY "Admins can delete returns" ON public.returns
    FOR DELETE TO authenticated
    USING (has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;
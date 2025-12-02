-- Add status column to returns table
CREATE TYPE return_status AS ENUM ('pending', 'approved', 'rejected');

ALTER TABLE public.returns
ADD COLUMN status return_status NOT NULL DEFAULT 'pending';

-- Add index for better query performance
CREATE INDEX idx_returns_status ON public.returns(status);
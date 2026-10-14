-- ================================================================
-- MIGRATION: MAINTENANCE CLEARANCE TRACKER & PAYMENT ALLOCATIONS
-- Safe to run on existing Supabase project.
-- Preserves existing tables, data, and balance calculation.
-- ================================================================

-- 1. ADD PERIOD COLUMNS TO PAYMENTS TABLE (if not already present)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'payments' 
          AND column_name = 'start_month'
    ) THEN
        ALTER TABLE public.payments 
        ADD COLUMN start_month INTEGER CHECK (start_month BETWEEN 1 AND 12),
        ADD COLUMN start_year INTEGER CHECK (start_year >= 2000),
        ADD COLUMN end_month INTEGER CHECK (end_month BETWEEN 1 AND 12),
        ADD COLUMN end_year INTEGER CHECK (end_year >= 2000);
    END IF;
END $$;

-- 2. ADD MAINTENANCE FREQUENCY AND EFFECTIVE DATE TO MEMBERS TABLE (if not present)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'members' 
          AND column_name = 'maintenance_frequency'
    ) THEN
        ALTER TABLE public.members 
        ADD COLUMN maintenance_frequency TEXT NOT NULL DEFAULT 'monthly' CHECK (maintenance_frequency IN ('monthly', 'annual')),
        ADD COLUMN effective_from DATE;
    END IF;
END $$;

-- 3. CREATE PAYMENT_ALLOCATIONS TABLE
-- Breaks down each payment into specific maintenance months/years
CREATE TABLE IF NOT EXISTS public.payment_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id UUID NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
    maintenance_year INTEGER NOT NULL CHECK (maintenance_year >= 2000),
    maintenance_month INTEGER CHECK (maintenance_month BETWEEN 1 AND 12), -- NULL for annual schedule
    allocated_amount NUMERIC(12,2) NOT NULL CHECK (allocated_amount > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. INDEXES FOR FAST CLEARANCE QUERIES
CREATE INDEX IF NOT EXISTS idx_payment_allocations_payment_id ON public.payment_allocations(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_allocations_member_id ON public.payment_allocations(member_id);
CREATE INDEX IF NOT EXISTS idx_payment_allocations_period ON public.payment_allocations(maintenance_year, maintenance_month);
CREATE INDEX IF NOT EXISTS idx_payment_allocations_composite ON public.payment_allocations(member_id, maintenance_year, maintenance_month);

-- 5. ENABLE ROW LEVEL SECURITY ON PAYMENT_ALLOCATIONS
ALTER TABLE public.payment_allocations ENABLE ROW LEVEL SECURITY;

-- 6. RLS POLICIES FOR PAYMENT_ALLOCATIONS
DROP POLICY IF EXISTS "Public read payment allocations" ON public.payment_allocations;
DROP POLICY IF EXISTS "Admin insert payment allocations" ON public.payment_allocations;
DROP POLICY IF EXISTS "Admin update payment allocations" ON public.payment_allocations;
DROP POLICY IF EXISTS "Admin delete payment allocations" ON public.payment_allocations;

CREATE POLICY "Public read payment allocations"
ON public.payment_allocations FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Admin insert payment allocations"
ON public.payment_allocations FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

CREATE POLICY "Admin update payment allocations"
ON public.payment_allocations FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "Admin delete payment allocations"
ON public.payment_allocations FOR DELETE
TO authenticated
USING (public.is_admin());

-- 7. BACKFILL EXISTING PAYMENTS INTO PAYMENT_ALLOCATIONS
INSERT INTO public.payment_allocations (payment_id, member_id, maintenance_year, maintenance_month, allocated_amount)
SELECT 
    p.id, 
    p.member_id, 
    COALESCE(p.payment_year, EXTRACT(YEAR FROM p.payment_date)::INTEGER),
    COALESCE(p.payment_month, EXTRACT(MONTH FROM p.payment_date)::INTEGER),
    p.amount
FROM public.payments p
WHERE NOT EXISTS (
    SELECT 1 FROM public.payment_allocations pa WHERE pa.payment_id = p.id
);

-- Update start and end period on legacy payments
UPDATE public.payments
SET 
    start_month = COALESCE(payment_month, EXTRACT(MONTH FROM payment_date)::INTEGER),
    start_year = COALESCE(payment_year, EXTRACT(YEAR FROM payment_date)::INTEGER),
    end_month = COALESCE(payment_month, EXTRACT(MONTH FROM payment_date)::INTEGER),
    end_year = COALESCE(payment_year, EXTRACT(YEAR FROM payment_date)::INTEGER)
WHERE start_month IS NULL;

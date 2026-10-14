-- ================================================================
-- FLAT / APARTMENT MAINTENANCE MANAGEMENT DATABASE SCHEMA
-- Fully Production-Ready for Supabase PostgreSQL
-- No dummy data. Empty system will safely report ₹0 balance.
-- ================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. ADMINS TABLE
-- Auth User ID must match Supabase Auth auth.users(id)
CREATE TABLE IF NOT EXISTS public.admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID UNIQUE NOT NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'admin',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. MEMBERS TABLE (No login accounts for members)
CREATE TABLE IF NOT EXISTS public.members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    flat_number TEXT NOT NULL,
    building TEXT,
    phone TEXT,
    email TEXT,
    monthly_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    annual_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_flat_building UNIQUE (flat_number, building)
);

-- 4. PAYMENTS TABLE
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE RESTRICT,
    amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    payment_type TEXT NOT NULL CHECK (payment_type IN ('Monthly', 'Annual', 'Other')),
    payment_month INTEGER CHECK (payment_month BETWEEN 1 AND 12),
    payment_year INTEGER CHECK (payment_year >= 2000),
    payment_date DATE NOT NULL,
    payment_method TEXT NOT NULL CHECK (payment_method IN ('Cash', 'UPI', 'Bank Transfer', 'Cheque', 'Other')),
    transaction_reference TEXT,
    notes TEXT,
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. EXPENSES TABLE
CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    expense_date DATE NOT NULL,
    payment_method TEXT CHECK (payment_method IN ('Cash', 'UPI', 'Bank Transfer', 'Cheque', 'Other')),
    description TEXT,
    reference_number TEXT,
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. MAINTENANCE SETTINGS TABLE
CREATE TABLE IF NOT EXISTS public.maintenance_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    society_name TEXT NOT NULL DEFAULT 'Nani Villa Apartment',
    address TEXT NOT NULL DEFAULT 'Palm Avenue, Sector 14',
    initial_balance NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (initial_balance >= 0),
    monthly_default_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    annual_default_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure at least one default settings row exists (if none present)
INSERT INTO public.maintenance_settings (society_name, address, initial_balance, monthly_default_amount, annual_default_amount)
SELECT 'Nani Villa Apartment', 'Palm Avenue, Sector 14', 0.00, 0.00, 0.00
WHERE NOT EXISTS (SELECT 1 FROM public.maintenance_settings);

-- 7. AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_user_id UUID,
    action TEXT NOT NULL,
    table_name TEXT NOT NULL,
    record_id TEXT,
    old_data JSONB,
    new_data JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. INDEXES FOR HIGH PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_admins_auth_user_id ON public.admins(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_members_flat_number ON public.members(flat_number);
CREATE INDEX IF NOT EXISTS idx_members_status ON public.members(status);
CREATE INDEX IF NOT EXISTS idx_payments_member_id ON public.payments(member_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON public.payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_payments_year_month ON public.payments(payment_year, payment_month);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON public.expenses(category);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- 9. UPDATED_AT TRIGGER FUNCTION
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_members_updated_at
BEFORE UPDATE ON public.members
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE OR REPLACE TRIGGER trg_payments_updated_at
BEFORE UPDATE ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE OR REPLACE TRIGGER trg_expenses_updated_at
BEFORE UPDATE ON public.expenses
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE OR REPLACE TRIGGER trg_settings_updated_at
BEFORE UPDATE ON public.maintenance_settings
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 10. ADMIN CHECK FUNCTION (SECURITY DEFINER to avoid RLS loop)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admins
    WHERE auth_user_id = auth.uid()
    AND role = 'admin'
  );
$$;

-- 11. FINANCIAL SUMMARY FUNCTIONS (Using NUMERIC(12,2) and COALESCE)

-- A. get_current_balance()
CREATE OR REPLACE FUNCTION public.get_current_balance()
RETURNS NUMERIC(12,2)
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    (SELECT initial_balance FROM public.maintenance_settings ORDER BY updated_at DESC LIMIT 1), 0.00
  ) + COALESCE(
    (SELECT SUM(amount) FROM public.payments), 0.00
  ) - COALESCE(
    (SELECT SUM(amount) FROM public.expenses), 0.00
  );
$$;

-- B. get_total_payments()
CREATE OR REPLACE FUNCTION public.get_total_payments()
RETURNS NUMERIC(12,2)
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(SUM(amount), 0.00) FROM public.payments;
$$;

-- C. get_total_expenses()
CREATE OR REPLACE FUNCTION public.get_total_expenses()
RETURNS NUMERIC(12,2)
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(SUM(amount), 0.00) FROM public.expenses;
$$;

-- D. get_current_month_payments()
CREATE OR REPLACE FUNCTION public.get_current_month_payments()
RETURNS NUMERIC(12,2)
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(SUM(amount), 0.00)
  FROM public.payments
  WHERE EXTRACT(YEAR FROM payment_date) = EXTRACT(YEAR FROM CURRENT_DATE)
    AND EXTRACT(MONTH FROM payment_date) = EXTRACT(MONTH FROM CURRENT_DATE);
$$;

-- E. get_current_month_expenses()
CREATE OR REPLACE FUNCTION public.get_current_month_expenses()
RETURNS NUMERIC(12,2)
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(SUM(amount), 0.00)
  FROM public.expenses
  WHERE EXTRACT(YEAR FROM expense_date) = EXTRACT(YEAR FROM CURRENT_DATE)
    AND EXTRACT(MONTH FROM expense_date) = EXTRACT(MONTH FROM CURRENT_DATE);
$$;

-- F. get_member_total_paid(member_id)
CREATE OR REPLACE FUNCTION public.get_member_total_paid(p_member_id UUID)
RETURNS NUMERIC(12,2)
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(SUM(amount), 0.00)
  FROM public.payments
  WHERE member_id = p_member_id;
$$;

-- G. get_member_year_paid(member_id, year)
CREATE OR REPLACE FUNCTION public.get_member_year_paid(p_member_id UUID, p_year INTEGER)
RETURNS NUMERIC(12,2)
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(SUM(amount), 0.00)
  FROM public.payments
  WHERE member_id = p_member_id
    AND EXTRACT(YEAR FROM payment_date) = p_year;
$$;

-- H. get_member_month_paid(member_id, year, month)
CREATE OR REPLACE FUNCTION public.get_member_month_paid(p_member_id UUID, p_year INTEGER, p_month INTEGER)
RETURNS NUMERIC(12,2)
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(SUM(amount), 0.00)
  FROM public.payments
  WHERE member_id = p_member_id
    AND EXTRACT(YEAR FROM payment_date) = p_year
    AND EXTRACT(MONTH FROM payment_date) = p_month;
$$;

-- I. get_financial_overview() function returns complete dashboard payload in single roundtrip
CREATE OR REPLACE FUNCTION public.get_financial_overview()
RETURNS JSON
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_init_bal NUMERIC(12,2);
  v_total_collected NUMERIC(12,2);
  v_total_expenses NUMERIC(12,2);
  v_curr_month_collected NUMERIC(12,2);
  v_curr_month_expenses NUMERIC(12,2);
  v_member_count BIGINT;
  v_balance NUMERIC(12,2);
  v_result JSON;
BEGIN
  SELECT COALESCE(initial_balance, 0.00) INTO v_init_bal FROM public.maintenance_settings ORDER BY updated_at DESC LIMIT 1;
  IF v_init_bal IS NULL THEN v_init_bal := 0.00; END IF;

  SELECT COALESCE(SUM(amount), 0.00) INTO v_total_collected FROM public.payments;
  SELECT COALESCE(SUM(amount), 0.00) INTO v_total_expenses FROM public.expenses;

  SELECT COALESCE(SUM(amount), 0.00) INTO v_curr_month_collected
  FROM public.payments
  WHERE EXTRACT(YEAR FROM payment_date) = EXTRACT(YEAR FROM CURRENT_DATE)
    AND EXTRACT(MONTH FROM payment_date) = EXTRACT(MONTH FROM CURRENT_DATE);

  SELECT COALESCE(SUM(amount), 0.00) INTO v_curr_month_expenses
  FROM public.expenses
  WHERE EXTRACT(YEAR FROM expense_date) = EXTRACT(YEAR FROM CURRENT_DATE)
    AND EXTRACT(MONTH FROM expense_date) = EXTRACT(MONTH FROM CURRENT_DATE);

  SELECT COUNT(*) INTO v_member_count FROM public.members WHERE status = 'active';

  v_balance := v_init_bal + v_total_collected - v_total_expenses;

  v_result := json_build_object(
    'initial_balance', v_init_bal,
    'total_collected', v_total_collected,
    'total_expenses', v_total_expenses,
    'current_balance', v_balance,
    'current_month_collected', v_curr_month_collected,
    'current_month_expenses', v_curr_month_expenses,
    'active_members', v_member_count
  );

  RETURN v_result;
END;
$$;

-- 12. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Admins table policies
CREATE POLICY "Admins can view their own record or admins"
ON public.admins FOR SELECT
TO authenticated
USING (auth_user_id = auth.uid() OR public.is_admin());

CREATE POLICY "Super admins can manage admins"
ON public.admins FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Maintenance settings: Public can SELECT, Admin can UPDATE/INSERT
CREATE POLICY "Public read maintenance settings"
ON public.maintenance_settings FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Admin manage maintenance settings"
ON public.maintenance_settings FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Members table: Public can SELECT active/members, Admin can full CRUD
CREATE POLICY "Public read members"
ON public.members FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Admin insert members"
ON public.members FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

CREATE POLICY "Admin update members"
ON public.members FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "Admin delete members"
ON public.members FOR DELETE
TO authenticated
USING (public.is_admin());

-- Payments table: Public can SELECT payments, Admin can full CRUD
CREATE POLICY "Public read payments"
ON public.payments FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Admin insert payments"
ON public.payments FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

CREATE POLICY "Admin update payments"
ON public.payments FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "Admin delete payments"
ON public.payments FOR DELETE
TO authenticated
USING (public.is_admin());

-- Expenses table: Public can SELECT expenses, Admin can full CRUD
CREATE POLICY "Public read expenses"
ON public.expenses FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Admin insert expenses"
ON public.expenses FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

CREATE POLICY "Admin update expenses"
ON public.expenses FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "Admin delete expenses"
ON public.expenses FOR DELETE
TO authenticated
USING (public.is_admin());

-- Audit logs: Admin can read only
CREATE POLICY "Admin view audit logs"
ON public.audit_logs FOR SELECT
TO authenticated
USING (public.is_admin());

CREATE POLICY "Admin insert audit logs"
ON public.audit_logs FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

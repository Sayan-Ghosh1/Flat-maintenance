import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Save, 
  Building2, 
  Wallet, 
  ShieldCheck, 
  Terminal, 
  Copy, 
  Check, 
  History, 
  AlertCircle, 
  CheckCircle,
  FileCode,
  Users
} from 'lucide-react';
import { AdminLayout } from '../components/AdminLayout';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { EmptyState } from '../components/EmptyState';
import { useMaintenanceData } from '../hooks/useMaintenanceData';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { formatCurrency, formatDate } from '../lib/formatters';
import type { AuditLog, AdminRecord } from '../types/database';

export const AdminSettings: React.FC = () => {
  const { loading, settings, summary, refetch } = useMaintenanceData();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<'general' | 'schema' | 'audit' | 'admins'>('general');
  const [copiedSchema, setCopiedSchema] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Settings form
  const [formData, setFormData] = useState({
    society_name: '',
    address: '',
    initial_balance: '0',
    monthly_default_amount: '2000',
  });

  // Audit logs & admins list
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [adminList, setAdminList] = useState<AdminRecord[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);

  useEffect(() => {
    if (settings) {
      setFormData({
        society_name: settings.society_name || '',
        address: settings.address || '',
        initial_balance: String(settings.initial_balance || 0),
        monthly_default_amount: String(settings.monthly_default_amount || 0),
      });
    }
  }, [settings]);

  useEffect(() => {
    if (activeTab === 'audit') {
      fetchAuditLogs();
    } else if (activeTab === 'admins') {
      fetchAdminList();
    }
  }, [activeTab]);

  const fetchAuditLogs = async () => {
    setLoadingAudit(true);
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (!error && data) {
        setAuditLogs(data);
      }
    } catch (err) {
      console.error('Error fetching audit logs:', err);
    } finally {
      setLoadingAudit(false);
    }
  };

  const fetchAdminList = async () => {
    try {
      const { data, error } = await supabase
        .from('admins')
        .select('*')
        .order('created_at', { ascending: true });
      if (!error && data) {
        setAdminList(data as AdminRecord[]);
      }
    } catch (err) {
      console.error('Error fetching admins:', err);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    setFeedback(null);

    const monthlyRate = parseFloat(formData.monthly_default_amount) || 0;
    const payload = {
      society_name: formData.society_name.trim(),
      address: formData.address.trim(),
      initial_balance: parseFloat(formData.initial_balance) || 0,
      monthly_default_amount: monthlyRate,
      annual_default_amount: monthlyRate * 12, // for db schema compatibility
      updated_at: new Date().toISOString(),
    };

    try {
      if (settings?.id) {
        const { error } = await supabase
          .from('maintenance_settings')
          .update(payload)
          .eq('id', settings.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('maintenance_settings')
          .insert(payload);
        if (error) throw error;
      }

      // Sync the real-time monthly maintenance rate to active members in database
      try {
        await supabase
          .from('members')
          .update({ 
            monthly_amount: monthlyRate,
            updated_at: new Date().toISOString()
          })
          .neq('status', 'archived');
      } catch (memErr) {
        console.warn('Note on member sync:', memErr);
      }

      // Log in audit table
      try {
        await supabase.from('audit_logs').insert({
          admin_user_id: user?.id,
          action: 'UPDATE',
          table_name: 'maintenance_settings',
          record_id: settings?.id || 'default',
          new_data: payload as any,
        });
      } catch {
        // Continue even if audit log table is not yet migrated
      }

      setFeedback({ 
        type: 'success', 
        message: `Settings saved! Real-time monthly rate updated to ${formatCurrency(monthlyRate)}/month.` 
      });
      refetch();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update settings in database.';
      setFeedback({ type: 'error', message: msg });
    } finally {
      setSavingSettings(false);
    }
  };

  const SQL_SCRIPT = `-- SUPABASE COMPLETE PRODUCTION SCHEMA FOR APARTMENT MAINTENANCE
-- Paste into Supabase Dashboard -> SQL Editor -> New Query -> Run

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Admins Table
CREATE TABLE IF NOT EXISTS public.admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID UNIQUE NOT NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'admin',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Members Table
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

-- Payments Table
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE RESTRICT,
    amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    payment_type TEXT NOT NULL CHECK (payment_type IN ('Monthly', 'Annual', 'Other')),
    payment_month INTEGER CHECK (payment_month BETWEEN 1 AND 12),
    payment_year INTEGER CHECK (payment_year >= 2000),
    start_month INTEGER CHECK (start_month BETWEEN 1 AND 12),
    start_year INTEGER CHECK (start_year >= 2000),
    end_month INTEGER CHECK (end_month BETWEEN 1 AND 12),
    end_year INTEGER CHECK (end_year >= 2000),
    payment_date DATE NOT NULL,
    payment_method TEXT NOT NULL CHECK (payment_method IN ('Cash', 'UPI', 'Bank Transfer', 'Cheque', 'Other')),
    transaction_reference TEXT,
    notes TEXT,
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Payment Allocations Table (Month/Year clearance tracking)
CREATE TABLE IF NOT EXISTS public.payment_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id UUID NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
    maintenance_year INTEGER NOT NULL CHECK (maintenance_year >= 2000),
    maintenance_month INTEGER CHECK (maintenance_month BETWEEN 1 AND 12),
    allocated_amount NUMERIC(12,2) NOT NULL CHECK (allocated_amount > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_allocations_payment_id ON public.payment_allocations(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_allocations_member_id ON public.payment_allocations(member_id);
CREATE INDEX IF NOT EXISTS idx_payment_allocations_period ON public.payment_allocations(maintenance_year, maintenance_month);

-- Expenses Table
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

-- Settings Table
CREATE TABLE IF NOT EXISTS public.maintenance_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    society_name TEXT NOT NULL DEFAULT 'Nani Villa Apartment',
    address TEXT NOT NULL DEFAULT 'Palm Avenue, Sector 14',
    initial_balance NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (initial_balance >= 0),
    monthly_default_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    annual_default_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.maintenance_settings (society_name, address, initial_balance, monthly_default_amount, annual_default_amount)
SELECT 'Nani Villa Apartment', 'Palm Avenue, Sector 14', 0.00, 0.00, 0.00
WHERE NOT EXISTS (SELECT 1 FROM public.maintenance_settings);

-- Audit Logs Table
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

-- Security Definer Admin Check
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admins
    WHERE auth_user_id = auth.uid() AND role = 'admin'
  );
$$;

-- Enable RLS
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Public read settings" ON public.maintenance_settings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admin manage settings" ON public.maintenance_settings FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Public read payment allocations" ON public.payment_allocations FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admin insert payment allocations" ON public.payment_allocations FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admin update payment allocations" ON public.payment_allocations FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admin delete payment allocations" ON public.payment_allocations FOR DELETE TO authenticated USING (public.is_admin());

CREATE POLICY "Public read members" ON public.members FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admin insert members" ON public.members FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admin update members" ON public.members FOR UPDATE TO authenticated USING (public.is_admin());
CREATE POLICY "Admin delete members" ON public.members FOR DELETE TO authenticated USING (public.is_admin());

CREATE POLICY "Public read payments" ON public.payments FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admin insert payments" ON public.payments FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admin update payments" ON public.payments FOR UPDATE TO authenticated USING (public.is_admin());
CREATE POLICY "Admin delete payments" ON public.payments FOR DELETE TO authenticated USING (public.is_admin());

CREATE POLICY "Public read expenses" ON public.expenses FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admin insert expenses" ON public.expenses FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admin update expenses" ON public.expenses FOR UPDATE TO authenticated USING (public.is_admin());
CREATE POLICY "Admin delete expenses" ON public.expenses FOR DELETE TO authenticated USING (public.is_admin());

CREATE POLICY "Admin view audit logs" ON public.audit_logs FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "Admin insert audit logs" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (public.is_admin());
`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(SQL_SCRIPT);
    setCopiedSchema(true);
    setTimeout(() => setCopiedSchema(false), 2500);
  };

  return (
    <AdminLayout
      title="System Settings &amp; Administration"
      subtitle="Configure society details, baseline treasury, database schemas, and admin audit trail"
    >
      <div className="space-y-6">
        
        {/* Sub-Tabs */}
        <div className="flex items-center space-x-2 border-b border-slate-800 pb-3 overflow-x-auto">
          <button
            onClick={() => setActiveTab('general')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'general'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            Society &amp; Treasury Settings
          </button>
          <button
            onClick={() => setActiveTab('admins')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'admins'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            Authorized Administrators
          </button>
          <button
            onClick={() => setActiveTab('schema')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'schema'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            Supabase SQL Schema
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'audit'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            Audit Log Trail
          </button>
        </div>

        {/* Tab 1: General Settings */}
        {activeTab === 'general' && (
          <div className="max-w-2xl space-y-6">
            
            {feedback && (
              <div
                className={`p-4 rounded-xl border flex items-start justify-between text-xs sm:text-sm ${
                  feedback.type === 'success'
                    ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
                    : 'bg-rose-950/40 border-rose-800/60 text-rose-300'
                }`}
              >
                <div className="flex items-start space-x-2.5">
                  {feedback.type === 'success' ? (
                    <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                  )}
                  <span>{feedback.message}</span>
                </div>
              </div>
            )}

            <form onSubmit={handleSaveSettings} className="p-6 sm:p-8 rounded-3xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl shadow-xl space-y-5">
              
              <div>
                <label className="block text-2xs uppercase tracking-wider font-semibold text-slate-400 mb-1.5">
                  Society / Apartment Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Nani Villa Apartment"
                  value={formData.society_name}
                  onChange={(e) => setFormData({ ...formData, society_name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-2xs uppercase tracking-wider font-semibold text-slate-400 mb-1.5">
                  Physical Address / Sector
                </label>
                <textarea
                  rows={2}
                  placeholder="Plot 42, Sector 14, Palm Avenue"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 text-sm"
                />
              </div>

              {/* Initial Balance */}
              <div className="p-4 rounded-2xl bg-indigo-950/30 border border-indigo-500/30 space-y-2">
                <div className="flex items-center space-x-2 text-indigo-300 font-semibold text-xs">
                  <Wallet className="w-4 h-4" />
                  <span>Baseline Initial Balance (₹)</span>
                </div>
                <p className="text-2xs text-slate-400 leading-relaxed">
                  Formula: <span className="font-mono text-indigo-300">CURRENT BALANCE = INITIAL BALANCE + TOTAL PAYMENTS − TOTAL EXPENSES</span>.
                  Setting an initial balance represents existing corpus before opening this digital ledger.
                </p>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={formData.initial_balance}
                  onChange={(e) => setFormData({ ...formData, initial_balance: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-bold text-emerald-400 focus:outline-none focus:border-indigo-500 text-base"
                />
              </div>

              <div>
                <label className="block text-2xs uppercase tracking-wider font-semibold text-slate-400 mb-1.5">
                  Default Monthly Maintenance Rate (₹) *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    placeholder="2000"
                    value={formData.monthly_default_amount}
                    onChange={(e) => setFormData({ ...formData, monthly_default_amount: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono font-bold text-base focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <p className="text-2xs text-slate-400 mt-1">
                  Active monthly maintenance dues applied across residents. Members automatically fetch this configured rate in real time.
                </p>
              </div>

              <div className="pt-3">
                <button
                  type="submit"
                  disabled={savingSettings}
                  className="inline-flex items-center space-x-2 px-6 py-2.5 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/20 transition-all active:scale-95 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{savingSettings ? 'Saving...' : 'Save Settings'}</span>
                </button>
              </div>

            </form>

          </div>
        )}

        {/* Tab 2: Authorized Admins */}
        {activeTab === 'admins' && (
          <div className="space-y-6 max-w-3xl">
            <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl space-y-4">
              <div className="flex items-center space-x-3 text-white">
                <ShieldCheck className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-bold">Admin Authorization Roster</h3>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Supabase Row Level Security verifies every write request against the <code className="text-indigo-300 font-mono">admins</code> table. Only authenticated accounts matching this table have write authorization.
              </p>

              {adminList.length === 0 ? (
                <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-400">
                  No records returned or checking permissions. Your current logged in session is: <span className="text-white font-mono">{user?.email}</span> (ID: <span className="font-mono text-indigo-300">{user?.id}</span>)
                </div>
              ) : (
                <div className="divide-y divide-slate-800/80 border border-slate-800 rounded-xl overflow-hidden bg-slate-950/60">
                  {adminList.map((a) => (
                    <div key={a.id} className="p-3.5 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-white block">{a.name}</span>
                        <span className="text-slate-400">{a.email}</span>
                        <span className="font-mono text-2xs text-slate-400 block">Auth User ID: {a.auth_user_id}</span>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full text-2xs font-semibold uppercase bg-emerald-950/60 text-emerald-400 border border-emerald-800/40">
                        {a.role}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Instructions to add new admin */}
              <div className="mt-4 p-4 rounded-2xl bg-indigo-950/20 border border-indigo-500/20 text-xs space-y-2 text-slate-300">
                <p className="font-semibold text-indigo-300">How to add a new Society Administrator:</p>
                <ol className="list-decimal list-inside space-y-1 text-2xs text-slate-400">
                  <li>In Supabase Dashboard &gt; Authentication &gt; Users &gt; Create User.</li>
                  <li>Copy the newly generated User UUID.</li>
                  <li>In Supabase SQL Editor run:</li>
                </ol>
                <pre className="p-3 rounded-xl bg-slate-950 border border-slate-800 font-mono text-2xs text-indigo-300 overflow-x-auto">
{`INSERT INTO public.admins (auth_user_id, name, email, role)
VALUES ('NEW_USER_UUID', 'Admin Name', 'admin@email.com', 'admin');`}
                </pre>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Supabase SQL Schema */}
        {activeTab === 'schema' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center space-x-2">
                  <Terminal className="w-5 h-5 text-indigo-400" />
                  <span>Production PostgreSQL Schema</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Ready to copy and execute in the Supabase Dashboard SQL Editor
                </p>
              </div>

              <button
                onClick={copyToClipboard}
                className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md transition-all active:scale-95"
              >
                {copiedSchema ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                <span>{copiedSchema ? 'Copied to Clipboard!' : 'Copy SQL Schema'}</span>
              </button>
            </div>

            <div className="relative rounded-2xl border border-slate-800 bg-slate-950/90 p-4 font-mono text-2xs text-slate-300 overflow-x-auto max-h-[600px] leading-relaxed">
              <pre>{SQL_SCRIPT}</pre>
            </div>
          </div>
        )}

        {/* Tab 4: Audit Logs */}
        {activeTab === 'audit' && (
          <div className="space-y-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <History className="w-5 h-5 text-indigo-400" />
                <span>Admin Transaction Audit Trail</span>
              </h3>
              <p className="text-xs text-slate-400">
                Immutable security log of all admin mutations across members, collections, and disbursements
              </p>
            </div>

            {loadingAudit ? (
              <div className="py-12 flex justify-center">
                <LoadingSpinner message="Fetching audit logs..." />
              </div>
            ) : auditLogs.length === 0 ? (
              <EmptyState
                icon={History}
                title="No audit logs recorded yet."
                description="Administrative changes will be recorded here automatically."
              />
            ) : (
              <div className="overflow-hidden rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-950/80 border-b border-slate-800 text-2xs font-semibold uppercase tracking-wider text-slate-400">
                        <th className="py-3 px-4">Timestamp</th>
                        <th className="py-3 px-4">Action</th>
                        <th className="py-3 px-4">Table</th>
                        <th className="py-3 px-4">Record ID</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {auditLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-800/30">
                          <td className="py-3 px-4 text-slate-300 whitespace-nowrap">
                            {formatDate(log.created_at)}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 rounded text-2xs font-bold uppercase ${
                                log.action === 'CREATE'
                                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                  : log.action === 'UPDATE'
                                  ? 'bg-indigo-950 text-indigo-400 border border-indigo-800'
                                  : 'bg-rose-950 text-rose-400 border border-rose-800'
                              }`}
                            >
                              {log.action}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-300">{log.table_name}</td>
                          <td className="py-3 px-4 font-mono text-slate-400 text-2xs truncate max-w-xs">{log.record_id || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </AdminLayout>
  );
};

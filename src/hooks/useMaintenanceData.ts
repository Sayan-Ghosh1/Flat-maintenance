import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { FinancialSummary, MaintenanceSettings, Member, Payment, Expense, PaymentAllocation } from '../types/database';
import { calculateMemberClearance, getAllocationsForMember } from '../lib/clearanceTracker';

export function useMaintenanceData() {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<MaintenanceSettings>({
    society_name: 'Nani Villa Apartment',
    address: '',
    initial_balance: 0,
    monthly_default_amount: 0,
    annual_default_amount: 0,
  });
  const [summary, setSummary] = useState<FinancialSummary>({
    initial_balance: 0,
    total_collected: 0,
    total_expenses: 0,
    current_balance: 0,
    current_month_collected: 0,
    current_month_expenses: 0,
    active_members: 0,
  });
  const [members, setMembers] = useState<Member[]>([]);
  const [recentPayments, setRecentPayments] = useState<Payment[]>([]);
  const [recentExpenses, setRecentExpenses] = useState<Expense[]>([]);
  const [allocations, setAllocations] = useState<PaymentAllocation[]>([]);

  const fetchData = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      setError('Supabase connection is not yet configured. Please configure environment variables.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Fetch Maintenance Settings
      let currentInitialBalance = 0;
      const { data: settingsData, error: settingsError } = await supabase
        .from('maintenance_settings')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!settingsError && settingsData) {
        let resolvedSocietyName = settingsData.society_name || 'Nani Villa Apartment';
        if (resolvedSocietyName.toLowerCase().includes('greenwood')) {
          resolvedSocietyName = 'Nani Villa Apartment';
          // Auto-update stored name in Supabase
          supabase
            .from('maintenance_settings')
            .update({ society_name: 'Nani Villa Apartment', updated_at: new Date().toISOString() })
            .eq('id', settingsData.id)
            .then();
        }

        setSettings({
          id: settingsData.id,
          society_name: resolvedSocietyName,
          address: settingsData.address || '',
          initial_balance: Number(settingsData.initial_balance || 0),
          monthly_default_amount: Number(settingsData.monthly_default_amount || 0),
          annual_default_amount: Number(settingsData.annual_default_amount || 0),
          updated_at: settingsData.updated_at,
        });
        currentInitialBalance = Number(settingsData.initial_balance || 0);
      }

      // 2. Try RPC for financial overview or fallback to direct SQL queries
      let summaryResolved = false;
      try {
        const { data: rpcSummary, error: rpcError } = await supabase.rpc('get_financial_overview');
        if (!rpcError && rpcSummary) {
          setSummary({
            initial_balance: Number(rpcSummary.initial_balance || 0),
            total_collected: Number(rpcSummary.total_collected || 0),
            total_expenses: Number(rpcSummary.total_expenses || 0),
            current_balance: Number(rpcSummary.current_balance || 0),
            current_month_collected: Number(rpcSummary.current_month_collected || 0),
            current_month_expenses: Number(rpcSummary.current_month_expenses || 0),
            active_members: Number(rpcSummary.active_members || 0),
          });
          summaryResolved = true;
        }
      } catch {
        // Fallback to table queries
      }

      // 3. Fetch All Members
      const { data: membersData, error: membersError } = await supabase
        .from('members')
        .select('*')
        .order('flat_number', { ascending: true });

      if (membersError) {
        throw new Error(membersError.message);
      }

      const rawMembers: Member[] = (membersData || []).map((m) => ({
        ...m,
        monthly_amount: Number(m.monthly_amount || 0),
        annual_amount: Number(m.annual_amount || 0),
      }));

      // 4. Fetch All Payments for calculations & recent list
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select('*, member:members(id, full_name, flat_number, building)')
        .order('payment_date', { ascending: false });

      if (paymentsError) {
        throw new Error(paymentsError.message);
      }

      const rawPayments: Payment[] = (paymentsData || []).map((p) => ({
        ...p,
        amount: Number(p.amount || 0),
      }));

      // 5. Fetch Payment Allocations (if table exists)
      let rawAllocations: PaymentAllocation[] = [];
      try {
        const { data: allocData, error: allocError } = await supabase
          .from('payment_allocations')
          .select('*')
          .order('created_at', { ascending: false });
        if (!allocError && allocData) {
          rawAllocations = allocData.map((a) => ({
            ...a,
            allocated_amount: Number(a.allocated_amount || 0),
          }));
        }
      } catch {
        // Table might not be migrated yet; fallback to empty
      }
      setAllocations(rawAllocations);

      // Attach allocations to payments
      const paymentsWithAllocations: Payment[] = rawPayments.map((p) => ({
        ...p,
        allocations: rawAllocations.filter((a) => a.payment_id === p.id),
      }));

      // 6. Fetch All Expenses for calculations & recent list
      const { data: expensesData, error: expensesError } = await supabase
        .from('expenses')
        .select('*')
        .order('expense_date', { ascending: false });

      if (expensesError) {
        throw new Error(expensesError.message);
      }

      const rawExpenses: Expense[] = (expensesData || []).map((e) => ({
        ...e,
        amount: Number(e.amount || 0),
      }));

      // If RPC didn't populate summary, compute mathematically right here
      if (!summaryResolved) {
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth() + 1;

        const totalPaymentsSum = rawPayments.reduce((acc, p) => acc + p.amount, 0);
        const totalExpensesSum = rawExpenses.reduce((acc, e) => acc + e.amount, 0);

        const currentMonthPaymentsSum = rawPayments
          .filter((p) => {
            const pDate = new Date(p.payment_date);
            return (
              (p.payment_year === currentYear && p.payment_month === currentMonth) ||
              (!isNaN(pDate.getTime()) &&
                pDate.getFullYear() === currentYear &&
                pDate.getMonth() + 1 === currentMonth)
            );
          })
          .reduce((acc, p) => acc + p.amount, 0);

        const currentMonthExpensesSum = rawExpenses
          .filter((e) => {
            const eDate = new Date(e.expense_date);
            return (
              !isNaN(eDate.getTime()) &&
              eDate.getFullYear() === currentYear &&
              eDate.getMonth() + 1 === currentMonth
            );
          })
          .reduce((acc, e) => acc + e.amount, 0);

        const activeCount = rawMembers.filter((m) => m.status === 'active').length;
        const computedBalance = currentInitialBalance + totalPaymentsSum - totalExpensesSum;

        setSummary({
          initial_balance: currentInitialBalance,
          total_collected: totalPaymentsSum,
          total_expenses: totalExpensesSum,
          current_balance: computedBalance,
          current_month_collected: currentMonthPaymentsSum,
          current_month_expenses: currentMonthExpensesSum,
          active_members: activeCount,
        });
      }

      // Compute per-member statistics and clearance summary
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      const currentMonth = currentDate.getMonth() + 1;

      const membersWithStats: Member[] = rawMembers.map((member) => {
        const memberPayments = rawPayments.filter((p) => p.member_id === member.id);
        const totalPaid = memberPayments.reduce((acc, p) => acc + p.amount, 0);

        const yearPaid = memberPayments
          .filter((p) => {
            const pDate = new Date(p.payment_date);
            return p.payment_year === currentYear || (!isNaN(pDate.getTime()) && pDate.getFullYear() === currentYear);
          })
          .reduce((acc, p) => acc + p.amount, 0);

        const monthPaid = memberPayments
          .filter((p) => {
            const pDate = new Date(p.payment_date);
            const targetIdx = currentYear * 12 + currentMonth;
            if (p.start_year && p.start_month && p.end_year && p.end_month) {
              const startIdx = p.start_year * 12 + p.start_month;
              const endIdx = p.end_year * 12 + p.end_month;
              return targetIdx >= startIdx && targetIdx <= endIdx;
            }
            const sY = p.payment_year || (!isNaN(pDate.getTime()) ? pDate.getFullYear() : null);
            const sM = p.payment_month || (!isNaN(pDate.getTime()) ? pDate.getMonth() + 1 : null);
            if (!sY || !sM) return false;
            const rate = member.monthly_amount || 0;
            const inferred = (rate > 0 && p.payment_type !== 'Annual' && p.amount >= rate * 1.5)
              ? Math.round(p.amount / rate)
              : 1;
            const endIdx = sY * 12 + sM;
            const startIdx = endIdx - inferred + 1;
            return targetIdx >= startIdx && targetIdx <= endIdx;
          })
          .reduce((acc, p) => {
            if (p.start_year && p.start_month && p.end_year && p.end_month) {
              const count = Math.max(1, (p.end_year * 12 + p.end_month) - (p.start_year * 12 + p.start_month) + 1);
              return acc + (p.amount / count);
            }
            const rate = member.monthly_amount || 0;
            const inferred = (rate > 0 && p.payment_type !== 'Annual' && p.amount >= rate * 1.5)
              ? Math.round(p.amount / rate)
              : 1;
            return acc + (p.amount / inferred);
          }, 0);

        const lastPayment = memberPayments.length > 0 ? memberPayments[0].payment_date : null;

        // Calculate clearance summary
        const { summary: clearanceSummary } = calculateMemberClearance(
          member,
          memberPayments,
          rawAllocations,
          currentYear,
          currentDate
        );

        return {
          ...member,
          total_paid: totalPaid,
          current_year_paid: yearPaid,
          current_month_paid: monthPaid,
          last_payment_date: lastPayment,
          clearance_summary: clearanceSummary,
        };
      });

      setMembers(membersWithStats);
      setRecentPayments(paymentsWithAllocations.slice(0, 10));
      setRecentExpenses(rawExpenses.slice(0, 10));
    } catch (err: unknown) {
      console.error('Failed to load maintenance data:', err);
      const msg = err instanceof Error ? err.message : 'Failed to connect to database.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();

    if (!isSupabaseConfigured) return;

    // Real-time channel to update member clearance and financial totals whenever admin adds or edits payments
    const channelId = `public-maintenance-live-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const channel = supabase
      .channel(channelId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, () => {
        fetchData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'members' }, () => {
        fetchData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'maintenance_settings' }, () => {
        fetchData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchData]);

  return {
    loading,
    error,
    settings,
    summary,
    members,
    recentPayments,
    recentExpenses,
    allocations,
    refetch: fetchData,
  };
}

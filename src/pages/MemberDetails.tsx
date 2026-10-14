import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { YearlyPaymentTimeline } from '../components/YearlyPaymentTimeline';
import { formatCurrency } from '../lib/formatters';
import type { Member, Payment } from '../types/database';

export const MemberDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [member, setMember] = useState<Member | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [adminMonthlyRate, setAdminMonthlyRate] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadMemberProfile() {
      if (!id) return;
      setLoading(true);
      setError(null);

      try {
        // 1. Fetch Society Maintenance Settings (Real-time admin rate)
        try {
          const { data: settingsData } = await supabase
            .from('maintenance_settings')
            .select('monthly_default_amount')
            .order('updated_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (settingsData && settingsData.monthly_default_amount !== undefined) {
            setAdminMonthlyRate(Number(settingsData.monthly_default_amount || 0));
          }
        } catch (settingsErr) {
          console.warn('Settings fetch note:', settingsErr);
        }

        // 2. Fetch Member Details
        const { data: memberData, error: memberErr } = await supabase
          .from('members')
          .select('*')
          .eq('id', id)
          .single();

        if (memberErr || !memberData) {
          throw new Error(memberErr?.message || 'Resident record not found.');
        }

        // 3. Fetch Actual Payment History recorded for this resident
        const { data: paymentsData, error: paymentsErr } = await supabase
          .from('payments')
          .select('*')
          .eq('member_id', id)
          .order('payment_date', { ascending: false });

        if (paymentsErr) {
          throw new Error(paymentsErr.message);
        }

        const rawPayments: Payment[] = (paymentsData || []).map((p) => ({
          ...p,
          amount: Number(p.amount || 0),
          member: memberData,
        }));

        // Compute basic summary totals
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth() + 1;

        const totalPaid = rawPayments.reduce((acc, p) => acc + p.amount, 0);

        const yearPaid = rawPayments
          .filter((p) => {
            const pDate = new Date(p.payment_date);
            const yr = p.payment_year || p.start_year || (!isNaN(pDate.getTime()) ? pDate.getFullYear() : null);
            return yr === currentYear;
          })
          .reduce((acc, p) => acc + p.amount, 0);

        const targetIdx = currentYear * 12 + currentMonth;
        const memberRate = Number(memberData.monthly_amount || 0);
        const monthPaid = rawPayments
          .filter((p) => {
            const pDate = new Date(p.payment_date);
            if (p.start_year && p.start_month && p.end_year && p.end_month) {
              const startIdx = p.start_year * 12 + p.start_month;
              const endIdx = p.end_year * 12 + p.end_month;
              return targetIdx >= startIdx && targetIdx <= endIdx;
            }
            const yr = p.payment_year || (!isNaN(pDate.getTime()) ? pDate.getFullYear() : null);
            const mo = p.payment_month || (!isNaN(pDate.getTime()) ? pDate.getMonth() + 1 : null);
            if (!yr || !mo) return false;
            const inferred = (memberRate > 0 && p.payment_type !== 'Annual' && p.amount >= memberRate * 1.5)
              ? Math.round(p.amount / memberRate)
              : 1;
            const endIdx = yr * 12 + mo;
            const startIdx = endIdx - inferred + 1;
            return targetIdx >= startIdx && targetIdx <= endIdx;
          })
          .reduce((acc, p) => {
            if (p.start_year && p.start_month && p.end_year && p.end_month) {
              const count = Math.max(1, (p.end_year * 12 + p.end_month) - (p.start_year * 12 + p.start_month) + 1);
              return acc + (p.amount / count);
            }
            const inferred = (memberRate > 0 && p.payment_type !== 'Annual' && p.amount >= memberRate * 1.5)
              ? Math.round(p.amount / memberRate)
              : 1;
            return acc + (p.amount / inferred);
          }, 0);

        setMember({
          ...memberData,
          monthly_amount: Number(memberData.monthly_amount || 0),
          total_paid: totalPaid,
          current_year_paid: yearPaid,
          current_month_paid: monthPaid,
          last_payment_date: rawPayments.length > 0 ? rawPayments[0].payment_date : null,
        });

        setPayments(rawPayments);
      } catch (err: unknown) {
        console.error('Failed to load member profile:', err);
        setError(err instanceof Error ? err.message : 'Failed to retrieve member details.');
      } finally {
        setLoading(false);
      }
    }

    loadMemberProfile();

    // 4. Set up Supabase real-time channel to reflect admin changes live
    const channelId = `member-live-${id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const channel = supabase
      .channel(channelId)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'maintenance_settings' },
        (payload: any) => {
          if (payload.new && payload.new.monthly_default_amount !== undefined) {
            setAdminMonthlyRate(Number(payload.new.monthly_default_amount || 0));
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'members', filter: `id=eq.${id}` },
        (payload: any) => {
          if (payload.new) {
            setMember((prev) => prev ? {
              ...prev,
              ...payload.new,
              monthly_amount: Number(payload.new.monthly_amount || 0),
            } : null);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'payments', filter: `member_id=eq.${id}` },
        () => {
          loadMemberProfile();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <LoadingSpinner message="Fetching resident ledger & payment history..." />
      </div>
    );
  }

  if (error || !member) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center space-y-4">
        <h2 className="text-xl font-bold text-white">Resident Record Not Found</h2>
        <p className="text-sm text-slate-400">
          {error || 'The requested resident could not be located in the database.'}
        </p>
        <Link
          to="/members"
          className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Member Directory</span>
        </Link>
      </div>
    );
  }

  // Real-time monthly rate configured by admin in settings or member profile
  const effectiveMonthlyRate = adminMonthlyRate > 0 
    ? adminMonthlyRate 
    : (member.monthly_amount || 0);

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-16">
      
      {/* Back button */}
      <div>
        <Link
          to="/members"
          className="inline-flex items-center space-x-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Resident Directory</span>
        </Link>
      </div>

      {/* 1. Member Identity & Flat Information */}
      <div className="rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-slate-900/90 via-slate-900/60 to-slate-950 border border-slate-800/80 backdrop-blur-xl shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800/80">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 font-extrabold flex items-center justify-center text-xl shadow-inner">
              {member.flat_number}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
                  {member.full_name}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-2xs font-semibold uppercase tracking-wider bg-emerald-950/60 text-emerald-400 border border-emerald-800/40">
                  {member.status}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Flat {member.flat_number} {member.building ? `• Building ${member.building}` : ''}
              </p>
            </div>
          </div>

          {/* Real-time Configured Monthly Rate from Admin */}
          <div className="sm:text-right">
            <div className="flex items-center sm:justify-end space-x-1.5 mb-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-2xs uppercase tracking-wider text-slate-400">Configured Rate</span>
            </div>
            <span className="text-xl sm:text-2xl font-extrabold text-emerald-400 font-mono">
              {formatCurrency(effectiveMonthlyRate)}/month
            </span>
            <span className="text-3xs text-slate-400 block mt-0.5">
              Real-time Monthly Maintenance
            </span>
          </div>
        </div>

        {/* 2. Basic Totals: Total Paid / Current Year Paid / Current Month Paid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80">
            <span className="text-xs uppercase tracking-wider font-semibold text-slate-400 block mb-1">
              Total Lifetime Paid
            </span>
            <p className="text-2xl font-black text-emerald-400 font-mono">
              {formatCurrency(member.total_paid || 0)}
            </p>
            <span className="text-2xs text-slate-400">Total verified transactions</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80">
            <span className="text-xs uppercase tracking-wider font-semibold text-slate-400 block mb-1">
              Current Year Paid
            </span>
            <p className="text-2xl font-bold text-slate-200 font-mono">
              {formatCurrency(member.current_year_paid || 0)}
            </p>
            <span className="text-2xs text-slate-400">Maintenance for {new Date().getFullYear()}</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80">
            <span className="text-xs uppercase tracking-wider font-semibold text-slate-400 block mb-1">
              Current Month Paid
            </span>
            <p className="text-2xl font-bold text-indigo-300 font-mono">
              {formatCurrency(member.current_month_paid || 0)}
            </p>
            <span className="text-2xs text-slate-400">Current calendar month</span>
          </div>
        </div>
      </div>

      {/* 3. Simple Year-wise Maintenance Payment Timeline */}
      <YearlyPaymentTimeline
        payments={payments}
        flatNumber={member.flat_number}
        memberName={member.full_name}
      />

    </div>
  );
};

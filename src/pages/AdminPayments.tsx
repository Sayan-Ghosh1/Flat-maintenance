import React, { useState, useMemo, useEffect } from 'react';
import { 
  CreditCard, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  CheckCircle, 
  AlertCircle, 
  X, 
  Calendar, 
  User, 
  Hash, 
  ExternalLink
} from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { AdminLayout } from '../components/AdminLayout';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { EmptyState } from '../components/EmptyState';
import { useMaintenanceData } from '../hooks/useMaintenanceData';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { formatCurrency, formatDate, getMonthName, PAYMENT_TYPES, PAYMENT_METHODS } from '../lib/formatters';
import type { Payment } from '../types/database';

export const AdminPayments: React.FC = () => {
  const { loading, recentPayments, members, refetch } = useMaintenanceData();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [searchTerm, setSearchTerm] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [deleteConfirmPayment, setDeleteConfirmPayment] = useState<Payment | null>(null);

  const todayStr = new Date().toISOString().split('T')[0];
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  // Form State with Multi-Month Range support
  const [formData, setFormData] = useState({
    member_id: '',
    amount: '',
    start_month: String(currentMonth),
    start_year: String(currentYear),
    end_month: String(currentMonth),
    end_year: String(currentYear),
    payment_type: 'Monthly' as 'Monthly' | 'Annual' | 'Other',
    payment_date: todayStr,
    payment_method: 'UPI' as 'Cash' | 'UPI' | 'Bank Transfer' | 'Cheque' | 'Other',
    transaction_reference: '',
    notes: '',
  });

  const [formSubmitting, setFormSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const selectedMember = useMemo(() => {
    return members.find((m) => m.id === formData.member_id) || null;
  }, [members, formData.member_id]);

  const selectedMemberRate = selectedMember?.monthly_amount || 0;

  // Calculates number of months between start and end
  const currentDurationMonths = useMemo(() => {
    const sM = parseInt(formData.start_month) || currentMonth;
    const sY = parseInt(formData.start_year) || currentYear;
    const eM = parseInt(formData.end_month) || sM;
    const eY = parseInt(formData.end_year) || sY;
    const start = sY * 12 + sM;
    const end = eY * 12 + eM;
    return Math.max(1, end - start + 1);
  }, [formData.start_month, formData.start_year, formData.end_month, formData.end_year, currentMonth, currentYear]);

  // Quick preset button to set duration in months
  const applyDurationMonths = (months: number) => {
    const sM = parseInt(formData.start_month) || currentMonth;
    const sY = parseInt(formData.start_year) || currentYear;
    const targetIdx = sY * 12 + sM + (months - 1);
    const targetYear = Math.floor((targetIdx - 1) / 12);
    const targetMonth = ((targetIdx - 1) % 12) + 1;

    setFormData((prev) => ({
      ...prev,
      end_month: String(targetMonth),
      end_year: String(targetYear),
      amount: selectedMemberRate > 0 ? String(selectedMemberRate * months) : prev.amount,
    }));
  };

  const handleAmountChange = (newAmount: string) => {
    const parsedAmt = parseFloat(newAmount);
    if (selectedMemberRate > 0 && !isNaN(parsedAmt) && parsedAmt > 0) {
      const inferredMonths = Math.max(1, Math.round(parsedAmt / selectedMemberRate));
      const sM = parseInt(formData.start_month) || currentMonth;
      const sY = parseInt(formData.start_year) || currentYear;
      const targetIdx = sY * 12 + sM + (inferredMonths - 1);
      const targetYear = Math.floor((targetIdx - 1) / 12);
      const targetMonth = ((targetIdx - 1) % 12) + 1;

      setFormData((prev) => ({
        ...prev,
        amount: newAmount,
        end_month: String(targetMonth),
        end_year: String(targetYear),
      }));
    } else {
      setFormData((prev) => ({ ...prev, amount: newAmount }));
    }
  };

  const openAddModal = () => {
    const firstMember = members.length > 0 ? members[0] : null;
    const defaultMonthly = firstMember?.monthly_amount ? String(firstMember.monthly_amount) : '160';

    let nextStartMonth = currentMonth;
    let nextStartYear = currentYear;
    if (firstMember?.clearance_summary?.paidThroughMonth && firstMember?.clearance_summary?.paidThroughYear) {
      const ptM = firstMember.clearance_summary.paidThroughMonth;
      const ptY = firstMember.clearance_summary.paidThroughYear;
      nextStartMonth = (ptM % 12) + 1;
      nextStartYear = ptM === 12 ? ptY + 1 : ptY;
    }

    setEditingPayment(null);
    setFormData({
      member_id: firstMember ? firstMember.id : '',
      amount: defaultMonthly,
      start_month: String(nextStartMonth),
      start_year: String(nextStartYear),
      end_month: String(nextStartMonth),
      end_year: String(nextStartYear),
      payment_type: firstMember?.maintenance_frequency === 'annual' ? 'Annual' : 'Monthly',
      payment_date: todayStr,
      payment_method: 'UPI',
      transaction_reference: '',
      notes: '',
    });
    setModalOpen(true);
  };

  // Automatically open modal if ?add=true is passed via URL
  useEffect(() => {
    if (searchParams.get('add') === 'true') {
      openAddModal();
      searchParams.delete('add');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams]);

  const openEditModal = (p: Payment) => {
    const sYr = p.start_year || p.payment_year || currentYear;
    const sMo = p.start_month || p.payment_month || currentMonth;
    const eYr = p.end_year || p.payment_year || sYr;
    const eMo = p.end_month || p.payment_month || sMo;

    setEditingPayment(p);
    setFormData({
      member_id: p.member_id,
      amount: String(p.amount),
      start_month: String(sMo),
      start_year: String(sYr),
      end_month: String(eMo),
      end_year: String(eYr),
      payment_type: p.payment_type || 'Monthly',
      payment_date: p.payment_date,
      payment_method: p.payment_method || 'UPI',
      transaction_reference: p.transaction_reference || '',
      notes: p.notes || '',
    });
    setModalOpen(true);
  };

  const handleMemberChange = (memberId: string) => {
    const sel = members.find((m) => m.id === memberId);
    const rate = sel && sel.monthly_amount > 0 ? sel.monthly_amount : 0;

    let nextStartMonth = currentMonth;
    let nextStartYear = currentYear;
    if (sel?.clearance_summary?.paidThroughMonth && sel?.clearance_summary?.paidThroughYear) {
      const ptM = sel.clearance_summary.paidThroughMonth;
      const ptY = sel.clearance_summary.paidThroughYear;
      nextStartMonth = (ptM % 12) + 1;
      nextStartYear = ptM === 12 ? ptY + 1 : ptY;
    }

    const targetIdx = nextStartYear * 12 + nextStartMonth + (currentDurationMonths - 1);
    const targetYear = Math.floor((targetIdx - 1) / 12);
    const targetMonth = ((targetIdx - 1) % 12) + 1;

    setFormData((prev) => ({
      ...prev,
      member_id: memberId,
      start_month: String(nextStartMonth),
      start_year: String(nextStartYear),
      end_month: String(targetMonth),
      end_year: String(targetYear),
      amount: rate > 0 ? String(rate * currentDurationMonths) : prev.amount,
      payment_type: sel?.maintenance_frequency === 'annual' ? 'Annual' : 'Monthly',
    }));
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(formData.amount);
    if (!formData.member_id) {
      setFeedback({ type: 'error', message: 'Please select a resident member.' });
      return;
    }
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setFeedback({ type: 'error', message: 'Amount must be a positive number greater than 0.' });
      return;
    }

    const sMonth = parseInt(formData.start_month) || currentMonth;
    const sYear = parseInt(formData.start_year) || currentYear;
    const eMonth = parseInt(formData.end_month) || sMonth;
    const eYear = parseInt(formData.end_year) || sYear;

    let startIdx = sYear * 12 + sMonth;
    let endIdx = eYear * 12 + eMonth;
    if (startIdx > endIdx) {
      const temp = startIdx;
      startIdx = endIdx;
      endIdx = temp;
    }

    const finalStartYear = Math.floor((startIdx - 1) / 12);
    const finalStartMonth = ((startIdx - 1) % 12) + 1;
    const finalEndYear = Math.floor((endIdx - 1) / 12);
    const finalEndMonth = ((endIdx - 1) % 12) + 1;
    const monthCount = Math.max(1, endIdx - startIdx + 1);

    setFormSubmitting(true);
    setFeedback(null);

    const paymentPayload = {
      member_id: formData.member_id,
      amount: parsedAmount,
      payment_type: formData.payment_type,
      start_month: finalStartMonth,
      start_year: finalStartYear,
      end_month: finalEndMonth,
      end_year: finalEndYear,
      payment_month: finalEndMonth,
      payment_year: finalEndYear,
      payment_date: formData.payment_date,
      payment_method: formData.payment_method,
      transaction_reference: formData.transaction_reference.trim() || null,
      notes: formData.notes.trim() || null,
      created_by: user?.id || null,
    };

    try {
      let savedPaymentId: string | null = null;

      if (editingPayment) {
        // UPDATE Payment
        const { error } = await supabase
          .from('payments')
          .update(paymentPayload)
          .eq('id', editingPayment.id);

        if (error) throw error;
        savedPaymentId = editingPayment.id;

        try {
          await supabase.from('audit_logs').insert({
            admin_user_id: user?.id,
            action: 'UPDATE',
            table_name: 'payments',
            record_id: editingPayment.id,
            old_data: editingPayment as any,
            new_data: paymentPayload as any,
          });
        } catch {}
      } else {
        // INSERT Payment
        const { data: newRow, error } = await supabase
          .from('payments')
          .insert(paymentPayload)
          .select()
          .single();

        if (error) throw error;
        savedPaymentId = newRow?.id || null;

        try {
          await supabase.from('audit_logs').insert({
            admin_user_id: user?.id,
            action: 'CREATE',
            table_name: 'payments',
            record_id: newRow?.id,
            new_data: paymentPayload as any,
          });
        } catch {}
      }

      // Update / persist payment_allocations table
      if (savedPaymentId) {
        try {
          await supabase.from('payment_allocations').delete().eq('payment_id', savedPaymentId);
          const perMonth = parsedAmount / monthCount;
          const allocRows = [];
          for (let idx = startIdx; idx <= endIdx; idx++) {
            const yr = Math.floor((idx - 1) / 12);
            const mo = ((idx - 1) % 12) + 1;
            allocRows.push({
              payment_id: savedPaymentId,
              member_id: formData.member_id,
              maintenance_year: yr,
              maintenance_month: mo,
              allocated_amount: perMonth,
            });
          }
          await supabase.from('payment_allocations').insert(allocRows);
        } catch (allocErr) {
          console.warn('Explicit allocations table notice:', allocErr);
        }
      }

      const periodDesc = finalStartMonth === finalEndMonth && finalStartYear === finalEndYear
        ? `${getMonthName(finalStartMonth)} ${finalStartYear}`
        : `${getMonthName(finalStartMonth)} ${finalStartYear} – ${getMonthName(finalEndMonth)} ${finalEndYear} (${monthCount} months)`;

      setFeedback({ 
        type: 'success', 
        message: `Payment of ${formatCurrency(parsedAmount)} recorded for ${periodDesc}.` 
      });

      setModalOpen(false);
      refetch();
    } catch (err: unknown) {
      console.error('Error saving payment:', err);
      const msg = err instanceof Error ? err.message : 'Database error while saving payment.';
      setFeedback({ type: 'error', message: msg });
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDeletePayment = async (p: Payment) => {
    setFormSubmitting(true);
    try {
      try {
        await supabase.from('payment_allocations').delete().eq('payment_id', p.id);
      } catch {}

      const { error } = await supabase
        .from('payments')
        .delete()
        .eq('id', p.id);

      if (error) throw error;

      try {
        await supabase.from('audit_logs').insert({
          admin_user_id: user?.id,
          action: 'DELETE',
          table_name: 'payments',
          record_id: p.id,
          old_data: p as any,
        });
      } catch {}

      setFeedback({ 
        type: 'success', 
        message: `Payment of ${formatCurrency(p.amount)} deleted.` 
      });
      setDeleteConfirmPayment(null);
      refetch();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete payment.';
      setFeedback({ type: 'error', message: msg });
    } finally {
      setFormSubmitting(false);
    }
  };

  // Filter payments
  const filteredPayments = recentPayments.filter((p) => {
    const term = searchTerm.toLowerCase();
    const memberName = p.member?.full_name?.toLowerCase() || '';
    const flatNum = p.member?.flat_number?.toLowerCase() || '';
    const ref = p.transaction_reference?.toLowerCase() || '';
    const yr = String(p.payment_year || p.start_year || '');
    return memberName.includes(term) || flatNum.includes(term) || ref.includes(term) || yr.includes(term);
  });

  return (
    <AdminLayout
      title="Maintenance Payment Management"
      subtitle="Record and manage member maintenance payments. Payments automatically appear in the member's year-wise timeline."
      actionButton={
        <button
          onClick={openAddModal}
          disabled={members.length === 0}
          className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 shadow-md shadow-emerald-600/20 transition-all active:scale-95 disabled:opacity-50"
        >
          <Plus className="w-4 h-4" />
          <span>+ Record Payment</span>
        </button>
      }
    >
      <div className="space-y-6">
        
        {/* Feedback notification toast */}
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
            <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Search & Record Payment Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search payments by resident name, flat (e.g. A-101), year, or transaction ref..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>
          <button
            onClick={openAddModal}
            disabled={members.length === 0}
            className="inline-flex items-center justify-center space-x-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-600/30 border border-emerald-400/30 transition-all active:scale-95 disabled:opacity-50 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>+ Record Payment</span>
          </button>
        </div>

        {/* PAYMENTS LEDGER TABLE */}
        {loading ? (
          <div className="py-12 flex justify-center">
            <LoadingSpinner message="Loading collections ledger..." />
          </div>
        ) : filteredPayments.length === 0 ? (
          <EmptyState
            icon={CreditCard}
            title={recentPayments.length === 0 ? "No payments recorded yet." : "No matching payments found."}
            description="Record incoming payments with maintenance month and year."
            actionText={members.length > 0 ? "+ Record First Payment" : undefined}
            onAction={members.length > 0 ? openAddModal : undefined}
          />
        ) : (
          <div className="overflow-hidden rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-950/80 border-b border-slate-800 text-2xs font-semibold uppercase tracking-wider text-slate-400">
                    <th className="py-3.5 px-5">Payment Date</th>
                    <th className="py-3.5 px-5">Resident &amp; Flat</th>
                    <th className="py-3.5 px-5">Maintenance Period</th>
                    <th className="py-3.5 px-5">Type &amp; Method</th>
                    <th className="py-3.5 px-5">Reference / Notes</th>
                    <th className="py-3.5 px-5 text-right">Amount Paid</th>
                    <th className="py-3.5 px-5 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-sm">
                  {filteredPayments.map((p) => {
                    let periodBadge = '—';
                    let durationPill: string | null = null;

                    if (p.start_month && p.end_month && p.start_year && p.end_year) {
                      if (p.start_month === p.end_month && p.start_year === p.end_year) {
                        periodBadge = `${getMonthName(p.start_month)} ${p.start_year}`;
                      } else {
                        const count = (p.end_year * 12 + p.end_month) - (p.start_year * 12 + p.start_month) + 1;
                        periodBadge = `${getMonthName(p.start_month)} ${p.start_year} – ${getMonthName(p.end_month)} ${p.end_year}`;
                        durationPill = `${count} mos`;
                      }
                    } else if (p.payment_month && p.payment_year) {
                      const rate = p.member?.monthly_amount || 160;
                      const inferred = (rate > 0 && p.payment_type !== 'Annual' && p.amount >= rate * 1.5)
                        ? Math.round(p.amount / rate)
                        : 1;
                      if (inferred > 1) {
                        const endIdx = p.payment_year * 12 + p.payment_month;
                        const startIdx = endIdx - inferred + 1;
                        const sY = Math.floor((startIdx - 1) / 12);
                        const sM = ((startIdx - 1) % 12) + 1;
                        periodBadge = `${getMonthName(sM)} ${sY} – ${getMonthName(p.payment_month)} ${p.payment_year}`;
                        durationPill = `${inferred} mos`;
                      } else {
                        periodBadge = `${getMonthName(p.payment_month)} ${p.payment_year}`;
                      }
                    } else if (p.payment_year) {
                      periodBadge = `Year ${p.payment_year}`;
                    }

                    return (
                      <tr key={p.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-3.5 px-5 font-medium text-white whitespace-nowrap">
                          {formatDate(p.payment_date)}
                        </td>
                        <td className="py-3.5 px-5">
                          <Link 
                            to={`/members/${p.member_id}`}
                            className="font-semibold text-white hover:text-indigo-300 transition-colors flex items-center space-x-1"
                            title="View Member Details & Timeline"
                          >
                            <span>{p.member?.full_name || 'Resident'}</span>
                            <ExternalLink className="w-3 h-3 text-slate-500" />
                          </Link>
                          <div className="text-xs text-indigo-400 font-mono">
                            Flat {p.member?.flat_number}
                          </div>
                        </td>
                        <td className="py-3.5 px-5 whitespace-nowrap">
                          <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-indigo-950/60 border border-indigo-800/40 text-xs font-semibold text-indigo-300">
                            <span>{periodBadge}</span>
                            {durationPill && (
                              <span className="px-1.5 py-0.2 rounded bg-indigo-900/80 text-3xs font-bold text-indigo-200 border border-indigo-700/60">
                                {durationPill}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-5">
                          <span className="inline-block px-2 py-0.5 rounded text-2xs font-semibold bg-slate-800 text-slate-300 mr-2">
                            {p.payment_type}
                          </span>
                          <span className="text-xs text-slate-400">{p.payment_method}</span>
                        </td>
                        <td className="py-3.5 px-5 text-xs text-slate-400 font-mono">
                          {p.transaction_reference ? `Ref: ${p.transaction_reference}` : '—'}
                          {p.notes && <div className="text-slate-400 italic text-2xs">"{p.notes}"</div>}
                        </td>
                        <td className="py-3.5 px-5 text-right font-bold text-emerald-400 whitespace-nowrap text-base font-mono">
                          +{formatCurrency(p.amount)}
                        </td>
                        <td className="py-3.5 px-5 text-center">
                          <div className="flex items-center justify-center space-x-1.5">
                            <button
                              onClick={() => openEditModal(p)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-400 hover:bg-slate-800 border border-slate-800 transition-colors"
                              title="Edit Payment"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setDeleteConfirmPayment(p)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 border border-slate-800 transition-colors"
                              title="Delete Payment"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>

      {/* Record / Edit Payment Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                <CreditCard className="w-5 h-5 text-emerald-400" />
                <span>{editingPayment ? 'Edit Payment' : 'Record Maintenance Payment'}</span>
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-4 text-xs sm:text-sm">
              
              {/* Member Selector */}
              <div>
                <label className="block text-2xs uppercase tracking-wider font-semibold text-slate-400 mb-1">
                  Member / Flat *
                </label>
                <select
                  required
                  value={formData.member_id}
                  onChange={(e) => handleMemberChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-indigo-500 font-medium"
                >
                  <option value="">-- Choose Member --</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      Flat {m.flat_number} — {m.full_name} ({formatCurrency(m.monthly_amount)}/mo)
                    </option>
                  ))}
                </select>
                {selectedMember && (
                  <div className="mt-2 flex items-center justify-between px-3 py-1.5 rounded-xl bg-slate-950/70 border border-slate-800 text-2xs">
                    <span className="text-slate-400">Current Ledger Status:</span>
                    <span className="font-semibold text-emerald-400">
                      {selectedMember.clearance_summary?.paidThroughText || 'No prior payments recorded'}
                    </span>
                  </div>
                )}
              </div>

              {/* Amount & Actual Payment Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-2xs uppercase tracking-wider font-semibold text-slate-400">
                      Amount (₹) *
                    </label>
                    {selectedMemberRate > 0 && (
                      <span className="text-3xs text-indigo-300 font-mono">
                        Rate: {formatCurrency(selectedMemberRate)}/mo
                      </span>
                    )}
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    placeholder="2000"
                    value={formData.amount}
                    onChange={(e) => handleAmountChange(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-indigo-500 font-bold text-emerald-400 text-base font-mono"
                  />
                  {selectedMemberRate > 0 && parseFloat(formData.amount || '0') > 0 && (() => {
                    const parsedAmt = parseFloat(formData.amount || '0');
                    const inferred = Math.max(1, Math.round(parsedAmt / selectedMemberRate));
                    if (inferred !== currentDurationMonths) {
                      return (
                        <button
                          type="button"
                          onClick={() => applyDurationMonths(inferred)}
                          className="mt-1.5 w-full text-left px-2.5 py-1.5 rounded-lg bg-indigo-950/60 border border-indigo-700/60 hover:bg-indigo-900/60 transition-colors text-2xs text-indigo-300 flex items-center justify-between"
                        >
                          <span>
                            ⚡ ₹{parsedAmt} covers <strong className="text-white">{inferred} {inferred === 1 ? 'month' : 'months'}</strong> ({formatCurrency(selectedMemberRate)}/mo)
                          </span>
                          <span className="font-bold underline text-indigo-200 shrink-0 ml-2">
                            Set Period →
                          </span>
                        </button>
                      );
                    }
                    return null;
                  })()}
                </div>

                <div>
                  <label className="block text-2xs uppercase tracking-wider font-semibold text-slate-400 mb-1">
                    Actual Payment Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.payment_date}
                    onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Maintenance Period Range (From Month to Month) */}
              <div className="p-4 rounded-2xl bg-indigo-950/20 border border-indigo-800/40 space-y-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-300 uppercase tracking-wider flex items-center space-x-1.5">
                    <Calendar className="w-4 h-4 text-indigo-400" />
                    <span>Maintenance Period Covered *</span>
                  </span>
                  <span className="text-2xs font-semibold px-2 py-0.5 rounded-full bg-indigo-900/60 text-indigo-200 border border-indigo-700/60">
                    {currentDurationMonths} {currentDurationMonths === 1 ? 'Month' : 'Months'}
                  </span>
                </div>

                {/* Duration shortcut presets */}
                <div>
                  <span className="block text-3xs uppercase tracking-wider font-semibold text-slate-400 mb-1.5">
                    Quick Duration Preset:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { label: '1 Month', months: 1 },
                      { label: '2 Months', months: 2 },
                      { label: '3 Months', months: 3 },
                      { label: '6 Months', months: 6 },
                      { label: '1 Year (12 Mos)', months: 12 },
                    ].map((btn) => (
                      <button
                        key={btn.months}
                        type="button"
                        onClick={() => applyDurationMonths(btn.months)}
                        className={`px-2.5 py-1 rounded-lg text-2xs font-semibold transition-all border ${
                          currentDurationMonths === btn.months
                            ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm shadow-indigo-500/30'
                            : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800 hover:text-white'
                        }`}
                      >
                        {btn.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* From & To Month/Year Pickers */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-indigo-900/40">
                  {/* FROM */}
                  <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-2">
                    <span className="text-3xs uppercase tracking-wider font-bold text-indigo-400 block">
                      From (Start Period)
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-3xs text-slate-400 mb-0.5">Month</label>
                        <select
                          value={formData.start_month}
                          onChange={(e) => {
                            const newM = e.target.value;
                            setFormData((prev) => ({ ...prev, start_month: newM }));
                          }}
                          className="w-full px-2.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                        >
                          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                            <option key={m} value={m}>{getMonthName(m)}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-3xs text-slate-400 mb-0.5">Year</label>
                        <input
                          type="number"
                          min="2020"
                          max="2035"
                          required
                          value={formData.start_year}
                          onChange={(e) => setFormData({ ...formData, start_year: e.target.value })}
                          className="w-full px-2.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  {/* TO */}
                  <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-2">
                    <span className="text-3xs uppercase tracking-wider font-bold text-emerald-400 block">
                      To (End Period)
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-3xs text-slate-400 mb-0.5">Month</label>
                        <select
                          value={formData.end_month}
                          onChange={(e) => {
                            const newM = e.target.value;
                            setFormData((prev) => ({ ...prev, end_month: newM }));
                          }}
                          className="w-full px-2.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                        >
                          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                            <option key={m} value={m}>{getMonthName(m)}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-3xs text-slate-400 mb-0.5">Year</label>
                        <input
                          type="number"
                          min="2020"
                          max="2035"
                          required
                          value={formData.end_year}
                          onChange={(e) => setFormData({ ...formData, end_year: e.target.value })}
                          className="w-full px-2.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Calculation summary banner */}
                <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div className="text-slate-300">
                    <span className="text-indigo-300 font-semibold">
                      {getMonthName(parseInt(formData.start_month) || currentMonth)} {formData.start_year}
                    </span>
                    {currentDurationMonths > 1 && (
                      <>
                        <span className="text-slate-500 mx-1.5">→</span>
                        <span className="text-emerald-300 font-semibold">
                          {getMonthName(parseInt(formData.end_month) || currentMonth)} {formData.end_year}
                        </span>
                        <span className="text-slate-400 ml-1.5 font-medium">
                          ({currentDurationMonths} months)
                        </span>
                      </>
                    )}
                  </div>

                  {selectedMemberRate > 0 && (
                    <div className="flex items-center space-x-2 text-2xs">
                      <span className="text-slate-400">
                        Rate: {currentDurationMonths} × {formatCurrency(selectedMemberRate)} = <strong className="text-white">{formatCurrency(currentDurationMonths * selectedMemberRate)}</strong>
                      </span>
                      {parseFloat(formData.amount) !== currentDurationMonths * selectedMemberRate && (
                        <button
                          type="button"
                          onClick={() => setFormData((prev) => ({ ...prev, amount: String(currentDurationMonths * selectedMemberRate) }))}
                          className="px-2 py-0.5 rounded bg-emerald-600/30 text-emerald-300 hover:bg-emerald-600/50 border border-emerald-500/40 text-3xs font-semibold transition-colors"
                        >
                          Auto-fill
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Payment Method & Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-2xs uppercase tracking-wider font-semibold text-slate-400 mb-1">
                    Payment Method *
                  </label>
                  <select
                    value={formData.payment_method}
                    onChange={(e) => setFormData({ ...formData, payment_method: e.target.value as any })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-indigo-500"
                  >
                    {PAYMENT_METHODS.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-2xs uppercase tracking-wider font-semibold text-slate-400 mb-1">
                    Payment Classification
                  </label>
                  <select
                    value={formData.payment_type}
                    onChange={(e) => setFormData({ ...formData, payment_type: e.target.value as any })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-indigo-500"
                  >
                    {PAYMENT_TYPES.map((t) => (
                      <option key={t} value={t}>{t} Maintenance</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Reference Number (Optional) */}
              <div>
                <label className="block text-2xs uppercase tracking-wider font-semibold text-slate-400 mb-1">
                  Reference Number (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. UPI-9283719283 or CHQ-00124"
                  value={formData.transaction_reference}
                  onChange={(e) => setFormData({ ...formData, transaction_reference: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              {/* Notes (Optional) */}
              <div>
                <label className="block text-2xs uppercase tracking-wider font-semibold text-slate-400 mb-1">
                  Notes / Remarks (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Paid in cash, or GPay receipt verified"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="pt-4 flex items-center justify-end space-x-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 transition-colors"
                >
                  {formSubmitting ? 'Saving...' : editingPayment ? 'Update Payment' : 'Save Payment'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* Delete Payment Confirmation Modal */}
      {deleteConfirmPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl p-6 space-y-5">
            <h3 className="text-base font-bold text-white">Delete Payment Record</h3>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Are you sure you want to delete this payment of <span className="font-bold text-emerald-400">{formatCurrency(deleteConfirmPayment.amount)}</span> for {deleteConfirmPayment.member?.full_name || 'Member'}?
            </p>

            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
              <button
                onClick={() => setDeleteConfirmPayment(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeletePayment(deleteConfirmPayment)}
                disabled={formSubmitting}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 disabled:opacity-50 transition-colors"
              >
                {formSubmitting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

    </AdminLayout>
  );
};

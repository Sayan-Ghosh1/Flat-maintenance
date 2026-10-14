import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Receipt, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  CheckCircle, 
  AlertCircle, 
  X, 
  Tag, 
  Calendar, 
  Hash, 
  DollarSign
} from 'lucide-react';
import { AdminLayout } from '../components/AdminLayout';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { EmptyState } from '../components/EmptyState';
import { useMaintenanceData } from '../hooks/useMaintenanceData';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { formatCurrency, formatDate, EXPENSE_CATEGORIES, PAYMENT_METHODS } from '../lib/formatters';
import type { Expense } from '../types/database';

export const AdminExpenses: React.FC = () => {
  const { loading, recentExpenses, refetch } = useMaintenanceData();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [deleteConfirmExpense, setDeleteConfirmExpense] = useState<Expense | null>(null);

  const todayStr = new Date().toISOString().split('T')[0];

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    category: 'Electricity' as string,
    amount: '',
    expense_date: todayStr,
    payment_method: 'Bank Transfer' as string,
    description: '',
    reference_number: '',
  });

  const [formSubmitting, setFormSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const openAddModal = () => {
    setEditingExpense(null);
    setFormData({
      title: '',
      category: 'Electricity',
      amount: '',
      expense_date: todayStr,
      payment_method: 'Bank Transfer',
      description: '',
      reference_number: '',
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

  const openEditModal = (e: Expense) => {
    setEditingExpense(e);
    setFormData({
      title: e.title,
      category: e.category,
      amount: String(e.amount),
      expense_date: e.expense_date,
      payment_method: e.payment_method || 'Bank Transfer',
      description: e.description || '',
      reference_number: e.reference_number || '',
    });
    setModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(formData.amount);
    if (!formData.title.trim()) {
      setFeedback({ type: 'error', message: 'Expense title is required.' });
      return;
    }
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setFeedback({ type: 'error', message: 'Amount must be greater than 0.' });
      return;
    }

    setFormSubmitting(true);
    setFeedback(null);

    const payload = {
      title: formData.title.trim(),
      category: formData.category,
      amount: parsedAmount,
      expense_date: formData.expense_date,
      payment_method: formData.payment_method || null,
      description: formData.description.trim() || null,
      reference_number: formData.reference_number.trim() || null,
      created_by: user?.id || null,
    };

    try {
      if (editingExpense) {
        // UPDATE
        const { error } = await supabase
          .from('expenses')
          .update(payload)
          .eq('id', editingExpense.id);

        if (error) throw error;

        try {
          await supabase.from('audit_logs').insert({
            admin_user_id: user?.id,
            action: 'UPDATE',
            table_name: 'expenses',
            record_id: editingExpense.id,
            old_data: editingExpense as any,
            new_data: payload as any,
          });
        } catch {
          // ignore audit failure
        }

        setFeedback({ type: 'success', message: `Expense updated to ${formatCurrency(parsedAmount)}. Treasury recalculated.` });
      } else {
        // INSERT
        const { data: newRow, error } = await supabase
          .from('expenses')
          .insert(payload)
          .select()
          .single();

        if (error) throw error;

        try {
          await supabase.from('audit_logs').insert({
            admin_user_id: user?.id,
            action: 'CREATE',
            table_name: 'expenses',
            record_id: newRow?.id,
            new_data: payload as any,
          });
        } catch {
          // ignore audit failure
        }

        setFeedback({ type: 'success', message: `Expense "${payload.title}" (${formatCurrency(parsedAmount)}) logged. Treasury automatically updated.` });
      }

      setModalOpen(false);
      refetch();
    } catch (err: unknown) {
      console.error('Error saving expense:', err);
      const msg = err instanceof Error ? err.message : 'Database error while saving expense.';
      setFeedback({ type: 'error', message: msg });
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDeleteExpense = async (e: Expense) => {
    setFormSubmitting(true);
    try {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', e.id);

      if (error) throw error;

      try {
        await supabase.from('audit_logs').insert({
          admin_user_id: user?.id,
          action: 'DELETE',
          table_name: 'expenses',
          record_id: e.id,
          old_data: e as any,
        });
      } catch {
        // ignore audit failure
      }

      setFeedback({ type: 'success', message: `Expense of ${formatCurrency(e.amount)} deleted. Society balance recalculated.` });
      setDeleteConfirmExpense(null);
      refetch();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete expense.';
      setFeedback({ type: 'error', message: msg });
    } finally {
      setFormSubmitting(false);
    }
  };

  const filteredExpenses = recentExpenses.filter((e) => {
    const matchesSearch =
      e.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (e.description?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
      (e.reference_number?.toLowerCase().includes(searchTerm.toLowerCase()) || false);
    const matchesCategory =
      selectedCategory === 'all' || e.category.toLowerCase() === selectedCategory.toLowerCase();
    return matchesSearch && matchesCategory;
  });

  return (
    <AdminLayout
      title="Society Expenses"
      subtitle="Track vendor bills, maintenance costs, and utility disbursements with real-time balance sync"
      actionButton={
        <button
          onClick={openAddModal}
          className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 shadow-md shadow-rose-600/20 transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>+ Add Expense</span>
        </button>
      }
    >
      <div className="space-y-6">
        
        {/* Feedback message */}
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

        {/* Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search expenses by title, invoice #, or vendor remarks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3.5 py-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs font-medium text-slate-200 focus:outline-none focus:border-rose-500"
          >
            <option value="all">All Categories</option>
            {EXPENSE_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          <button
            onClick={openAddModal}
            className="inline-flex items-center justify-center space-x-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-rose-600 hover:bg-rose-500 shadow-lg shadow-rose-600/30 border border-rose-400/30 transition-all active:scale-95 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add Expense</span>
          </button>
        </div>

        {/* Expenses Table */}
        {loading ? (
          <div className="py-12 flex justify-center">
            <LoadingSpinner message="Loading society disbursements ledger..." />
          </div>
        ) : filteredExpenses.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title={recentExpenses.length === 0 ? "No expenses recorded yet." : "No matching expenses found."}
            description="Log utility bills, repair expenses, or staff payments using the '+ Add Expense' button."
            actionText="+ Add First Expense"
            onAction={openAddModal}
          />
        ) : (
          <div className="overflow-hidden rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-950/80 border-b border-slate-800 text-2xs font-semibold uppercase tracking-wider text-slate-400">
                    <th className="py-3.5 px-5">Date</th>
                    <th className="py-3.5 px-5">Category</th>
                    <th className="py-3.5 px-5">Title &amp; Notes</th>
                    <th className="py-3.5 px-5">Payment Method &amp; Bill #</th>
                    <th className="py-3.5 px-5 text-right">Amount Billed</th>
                    <th className="py-3.5 px-5 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-sm">
                  {filteredExpenses.map((e) => (
                    <tr key={e.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3.5 px-5 font-medium text-white whitespace-nowrap">
                        {formatDate(e.expense_date)}
                      </td>
                      <td className="py-3.5 px-5 whitespace-nowrap">
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-2xs font-semibold uppercase tracking-wider bg-slate-800 text-rose-300 border border-slate-700">
                          {e.category}
                        </span>
                      </td>
                      <td className="py-3.5 px-5">
                        <div className="font-semibold text-white">
                          {e.title}
                        </div>
                        {e.description && (
                          <div className="text-xs text-slate-400 mt-0.5 max-w-sm">
                            {e.description}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-5 text-xs text-slate-400">
                        <div>{e.payment_method || '—'}</div>
                        {e.reference_number && (
                          <div className="font-mono text-2xs text-slate-400">
                            #{e.reference_number}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-5 text-right font-bold text-rose-400 whitespace-nowrap text-base">
                        −{formatCurrency(e.amount)}
                      </td>
                      <td className="py-3.5 px-5 text-center">
                        <div className="flex items-center justify-center space-x-1.5">
                          <button
                            onClick={() => openEditModal(e)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-400 hover:bg-slate-800 border border-slate-800 transition-colors"
                            title="Edit Expense"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirmExpense(e)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 border border-slate-800 transition-colors"
                            title="Delete Expense (Recalculates Balance)"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>

      {/* Add / Edit Expense Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                <Receipt className="w-5 h-5 text-rose-400" />
                <span>{editingExpense ? 'Edit Society Expense' : 'Add Society Expense'}</span>
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-4 text-xs sm:text-sm">
              
              <div>
                <label className="block text-2xs uppercase tracking-wider font-semibold text-slate-400 mb-1">
                  Expense Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Common Area Electricity Bill, Lift AMC"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-2xs uppercase tracking-wider font-semibold text-slate-400 mb-1">
                    Category *
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-indigo-500"
                  >
                    {EXPENSE_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-2xs uppercase tracking-wider font-semibold text-slate-400 mb-1">
                    Amount (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    placeholder="4000"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-indigo-500 font-bold text-rose-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-2xs uppercase tracking-wider font-semibold text-slate-400 mb-1">
                    Expense Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.expense_date}
                    onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-2xs uppercase tracking-wider font-semibold text-slate-400 mb-1">
                    Payment Method
                  </label>
                  <select
                    value={formData.payment_method}
                    onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-indigo-500"
                  >
                    {PAYMENT_METHODS.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-2xs uppercase tracking-wider font-semibold text-slate-400 mb-1">
                  Voucher / Invoice / Bill Reference #
                </label>
                <input
                  type="text"
                  placeholder="e.g. EB-OCT-2026-9912 or INV-4401"
                  value={formData.reference_number}
                  onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-2xs uppercase tracking-wider font-semibold text-slate-400 mb-1">
                  Description / Vendor Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Paid for common pump repair by plumber Rajesh"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="pt-4 flex items-center justify-end space-x-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 disabled:opacity-50"
                >
                  {formSubmitting ? 'Saving...' : editingExpense ? 'Update Expense' : 'Log Expense'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* Delete Expense Confirmation Modal */}
      {deleteConfirmExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl p-6 space-y-5">
            <h3 className="text-base font-bold text-white">Delete Expense Record</h3>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Are you sure you want to delete the expense <span className="font-semibold text-white">"{deleteConfirmExpense.title}"</span> for <span className="font-bold text-rose-400">{formatCurrency(deleteConfirmExpense.amount)}</span>?
              <span className="block mt-2 text-emerald-300 font-semibold">
                Deleting this expense will automatically restore {formatCurrency(deleteConfirmExpense.amount)} back to the live society maintenance balance.
              </span>
            </p>

            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
              <button
                onClick={() => setDeleteConfirmExpense(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteExpense(deleteConfirmExpense)}
                disabled={formSubmitting}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 disabled:opacity-50"
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

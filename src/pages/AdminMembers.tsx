import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Users, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Archive, 
  CheckCircle, 
  AlertCircle, 
  X, 
  ShieldAlert,
  Building,
  Phone,
  Mail,
  DollarSign
} from 'lucide-react';
import { AdminLayout } from '../components/AdminLayout';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { EmptyState } from '../components/EmptyState';
import { useMaintenanceData } from '../hooks/useMaintenanceData';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { formatCurrency, formatDate } from '../lib/formatters';
import type { Member } from '../types/database';

export const AdminMembers: React.FC = () => {
  const { loading, members, settings, refetch } = useMaintenanceData();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [searchTerm, setSearchTerm] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [deleteConfirmMember, setDeleteConfirmMember] = useState<Member | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    full_name: '',
    flat_number: '',
    building: '',
    phone: '',
    email: '',
    monthly_amount: '2000',
    effective_from: '',
    status: 'active' as 'active' | 'inactive' | 'archived',
    notes: '',
  });

  const [formSubmitting, setFormSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const openAddModal = () => {
    const defaultMonthly = settings?.monthly_default_amount ? String(settings.monthly_default_amount) : '2000';
    setEditingMember(null);
    setFormData({
      full_name: '',
      flat_number: '',
      building: '',
      phone: '',
      email: '',
      monthly_amount: defaultMonthly,
      effective_from: new Date().toISOString().split('T')[0],
      status: 'active',
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

  const openEditModal = (member: Member) => {
    setEditingMember(member);
    setFormData({
      full_name: member.full_name,
      flat_number: member.flat_number,
      building: member.building || '',
      phone: member.phone || '',
      email: member.email || '',
      monthly_amount: String(member.monthly_amount || settings?.monthly_default_amount || 0),
      effective_from: member.effective_from || '',
      status: member.status || 'active',
      notes: member.notes || '',
    });
    setModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.full_name.trim() || !formData.flat_number.trim()) {
      setFeedback({ type: 'error', message: 'Full name and flat number are strictly required.' });
      return;
    }

    setFormSubmitting(true);
    setFeedback(null);

    const moRate = parseFloat(formData.monthly_amount) || 0;
    const payload = {
      full_name: formData.full_name.trim(),
      flat_number: formData.flat_number.trim().toUpperCase(),
      building: formData.building.trim() || null,
      phone: formData.phone.trim() || null,
      email: formData.email.trim() || null,
      monthly_amount: moRate,
      annual_amount: moRate * 12,
      maintenance_frequency: 'monthly',
      effective_from: formData.effective_from || null,
      status: formData.status,
      notes: formData.notes.trim() || null,
    };

    try {
      if (editingMember) {
        // UPDATE
        const { error } = await supabase
          .from('members')
          .update(payload)
          .eq('id', editingMember.id);

        if (error) throw error;

        // Audit log
        try {
          await supabase.from('audit_logs').insert({
            admin_user_id: user?.id,
            action: 'UPDATE',
            table_name: 'members',
            record_id: editingMember.id,
            old_data: editingMember as any,
            new_data: payload as any,
          });
        } catch {
          // ignore audit failures
        }

        setFeedback({ type: 'success', message: `Resident ${payload.full_name} updated successfully.` });
      } else {
        // INSERT
        const { data: newRow, error } = await supabase
          .from('members')
          .insert(payload)
          .select()
          .single();

        if (error) {
          if (error.code === '23505') {
            throw new Error(`Flat ${payload.flat_number} already exists in this building. Duplicate flats are not permitted.`);
          }
          throw error;
        }

        // Audit log
        try {
          await supabase.from('audit_logs').insert({
            admin_user_id: user?.id,
            action: 'CREATE',
            table_name: 'members',
            record_id: newRow?.id,
            new_data: payload as any,
          });
        } catch {
          // ignore audit failures
        }

        setFeedback({ type: 'success', message: `Resident ${payload.full_name} added to flat ${payload.flat_number}.` });
      }

      setModalOpen(false);
      refetch();
    } catch (err: unknown) {
      console.error('Error saving member:', err);
      const msg = err instanceof Error ? err.message : 'Database rejection: failed to save member.';
      setFeedback({ type: 'error', message: msg });
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDeleteMember = async (member: Member) => {
    // Check if member has payments
    if ((member.total_paid || 0) > 0) {
      setFeedback({
        type: 'error',
        message: `Deletion Blocked: Flat ${member.flat_number} (${member.full_name}) has ${formatCurrency(member.total_paid)} in recorded transactions. To protect accounting integrity, please change their status to 'Archived' instead of deleting.`,
      });
      setDeleteConfirmMember(null);
      return;
    }

    setFormSubmitting(true);
    try {
      const { error } = await supabase
        .from('members')
        .delete()
        .eq('id', member.id);

      if (error) {
        if (error.code === '23503') {
          throw new Error('This member is referenced by existing payment records and cannot be permanently deleted.');
        }
        throw error;
      }

      try {
        await supabase.from('audit_logs').insert({
          admin_user_id: user?.id,
          action: 'DELETE',
          table_name: 'members',
          record_id: member.id,
          old_data: member as any,
        });
      } catch {
        // ignore audit failure
      }

      setFeedback({ type: 'success', message: `Member ${member.full_name} was deleted.` });
      setDeleteConfirmMember(null);
      refetch();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete member.';
      setFeedback({ type: 'error', message: msg });
    } finally {
      setFormSubmitting(false);
    }
  };

  const filteredMembers = members.filter((m) =>
    m.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.flat_number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <AdminLayout
      title="Member Management"
      subtitle="Register, update, and audit flat residents and maintenance contracts"
      actionButton={
        <button
          onClick={openAddModal}
          className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/20 transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>+ Add Member</span>
        </button>
      }
    >
      <div className="space-y-6">
        
        {/* Notification Toast */}
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

        {/* Search & Add Action Bar */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search residents by flat or name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
          <button
            onClick={openAddModal}
            className="inline-flex items-center justify-center space-x-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/30 border border-indigo-400/30 transition-all active:scale-95 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add Member</span>
          </button>
        </div>

        {/* Members Directory Table */}
        {loading ? (
          <div className="py-12 flex justify-center">
            <LoadingSpinner message="Loading member roster..." />
          </div>
        ) : filteredMembers.length === 0 ? (
          <EmptyState
            icon={Users}
            title={members.length === 0 ? "No members added yet." : "No members match search."}
            description="Add flat residents using the '+ Add Member' button above."
            actionText={members.length === 0 ? "+ Add First Member" : undefined}
            onAction={members.length === 0 ? openAddModal : undefined}
          />
        ) : (
          <div className="overflow-hidden rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-950/80 border-b border-slate-800 text-2xs font-semibold uppercase tracking-wider text-slate-400">
                    <th className="py-3.5 px-5">Flat</th>
                    <th className="py-3.5 px-5">Resident Name</th>
                    <th className="py-3.5 px-5">Contact (Private)</th>
                    <th className="py-3.5 px-5">Monthly Fee</th>
                    <th className="py-3.5 px-5">Status</th>
                    <th className="py-3.5 px-5 text-right">Total Paid</th>
                    <th className="py-3.5 px-5 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-sm">
                  {filteredMembers.map((member) => (
                    <tr key={member.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3.5 px-5 font-mono font-bold text-indigo-400 whitespace-nowrap">
                        <span className="px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                          {member.flat_number}
                        </span>
                        {member.building && (
                          <span className="text-2xs text-slate-400 font-sans ml-2">
                            Bldg {member.building}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-5 font-semibold text-white">
                        {member.full_name}
                      </td>
                      <td className="py-3.5 px-5 text-xs text-slate-400">
                        {member.phone && <div>{member.phone}</div>}
                        {member.email && <div className="text-2xs text-slate-400">{member.email}</div>}
                        {!member.phone && !member.email && <span className="text-slate-500">—</span>}
                      </td>
                      <td className="py-3.5 px-5 text-slate-300 font-mono text-xs">
                        {formatCurrency(member.monthly_amount)}/mo
                      </td>
                      <td className="py-3.5 px-5">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-2xs font-semibold uppercase tracking-wider ${
                            member.status === 'active'
                              ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/40'
                              : member.status === 'inactive'
                              ? 'bg-amber-950/60 text-amber-400 border border-amber-800/40'
                              : 'bg-slate-800 text-slate-400 border border-slate-700'
                          }`}
                        >
                          {member.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-5 text-right font-bold text-emerald-400 whitespace-nowrap">
                        {formatCurrency(member.total_paid || 0)}
                      </td>
                      <td className="py-3.5 px-5 text-center">
                        <div className="flex items-center justify-center space-x-1.5">
                          <button
                            onClick={() => openEditModal(member)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-400 hover:bg-slate-800 border border-slate-800 transition-colors"
                            title="Edit Member"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirmMember(member)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 border border-slate-800 transition-colors"
                            title="Delete or Archive Member"
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

      {/* Add / Edit Member Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                <Users className="w-5 h-5 text-indigo-400" />
                <span>{editingMember ? 'Edit Resident Details' : 'Add New Member'}</span>
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-4 text-xs sm:text-sm">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-2xs uppercase tracking-wider font-semibold text-slate-400 mb-1">
                    Flat Number *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. A-101"
                    value={formData.flat_number}
                    onChange={(e) => setFormData({ ...formData, flat_number: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-2xs uppercase tracking-wider font-semibold text-slate-400 mb-1">
                    Building / Block
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Wing A"
                    value={formData.building}
                    onChange={(e) => setFormData({ ...formData, building: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-2xs uppercase tracking-wider font-semibold text-slate-400 mb-1">
                  Resident Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rahul Ghosh"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-2xs uppercase tracking-wider font-semibold text-slate-400 mb-1">
                    Phone (Private Admin view)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. +91 9876543210"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-2xs uppercase tracking-wider font-semibold text-slate-400 mb-1">
                    Email (Private Admin view)
                  </label>
                  <input
                    type="email"
                    placeholder="e.g. rahul@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-2xs uppercase tracking-wider font-semibold text-slate-400 mb-1">
                    Monthly Maintenance Rate (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={formData.monthly_amount}
                    onChange={(e) => setFormData({ ...formData, monthly_amount: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-indigo-500 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-2xs uppercase tracking-wider font-semibold text-slate-400 mb-1">
                    Effective Start Date
                  </label>
                  <input
                    type="date"
                    value={formData.effective_from}
                    onChange={(e) => setFormData({ ...formData, effective_from: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-2xs uppercase tracking-wider font-semibold text-slate-400 mb-1">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="active">Active Resident</option>
                    <option value="inactive">Inactive</option>
                    <option value="archived">Archived / Vacated</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-2xs uppercase tracking-wider font-semibold text-slate-400 mb-1">
                  Internal Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="Optional internal remarks..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="pt-4 flex items-center justify-end space-x-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50"
                >
                  {formSubmitting ? 'Saving...' : editingMember ? 'Update Member' : 'Add Member'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* Delete / Archive Confirmation Modal */}
      {deleteConfirmMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl p-6 space-y-5">
            <div className="flex items-center space-x-3 text-rose-400">
              <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Confirm Removal</h3>
                <p className="text-xs text-slate-400">Flat {deleteConfirmMember.flat_number} ({deleteConfirmMember.full_name})</p>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Are you sure you want to delete this resident record?
              {deleteConfirmMember.total_paid && deleteConfirmMember.total_paid > 0 ? (
                <span className="block mt-2 text-rose-300 font-semibold">
                  Warning: This flat has {formatCurrency(deleteConfirmMember.total_paid)} in payment history. Deletion is blocked to preserve accounting integrity. Please archive instead.
                </span>
              ) : (
                <span className="block mt-1 text-slate-400">
                  This flat has 0 recorded payments and can be safely deleted.
                </span>
              )}
            </p>

            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
              <button
                onClick={() => setDeleteConfirmMember(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteMember(deleteConfirmMember)}
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

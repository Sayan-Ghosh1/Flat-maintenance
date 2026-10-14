import React, { useState, useMemo } from 'react';
import { CreditCard, Search, Calendar, Filter, Download, ArrowUpDown } from 'lucide-react';
import { useMaintenanceData } from '../hooks/useMaintenanceData';
import { PaymentCard } from '../components/PaymentCard';
import { EmptyState } from '../components/EmptyState';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { formatCurrency, formatDate, getMonthName, PAYMENT_TYPES } from '../lib/formatters';

export const Payments: React.FC = () => {
  const { loading, recentPayments, members } = useMaintenanceData();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedMember, setSelectedMember] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');

  // Compute available years from actual payments
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    const currentYear = new Date().getFullYear();
    years.add(currentYear);
    recentPayments.forEach((p) => {
      const pYear = p.payment_year || new Date(p.payment_date).getFullYear();
      if (!isNaN(pYear)) years.add(pYear);
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [recentPayments]);

  // Filter payments
  const filteredPayments = useMemo(() => {
    return recentPayments.filter((p) => {
      const pDate = new Date(p.payment_date);
      const pYear = p.payment_year || pDate.getFullYear();
      const pMonth = p.payment_month || (pDate.getMonth() + 1);

      const matchesSearch =
        (p.member?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
        (p.member?.flat_number?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
        (p.transaction_reference?.toLowerCase().includes(searchTerm.toLowerCase()) || false);

      const matchesMonth = selectedMonth === 'all' || pMonth === Number(selectedMonth);
      const matchesYear = selectedYear === 'all' || pYear === Number(selectedYear);
      const matchesMember = selectedMember === 'all' || p.member_id === selectedMember;
      const matchesType = selectedType === 'all' || p.payment_type === selectedType;

      return matchesSearch && matchesMonth && matchesYear && matchesMember && matchesType;
    });
  }, [recentPayments, searchTerm, selectedMonth, selectedYear, selectedMember, selectedType]);

  const totalFilteredAmount = useMemo(() => {
    return filteredPayments.reduce((acc, p) => acc + p.amount, 0);
  }, [filteredPayments]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <LoadingSpinner message="Loading payment ledger records..." />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-16">
      
      {/* Header & Overview */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-2">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-semibold text-emerald-400 bg-emerald-950/50 border border-emerald-800/40">
            <CreditCard className="w-3.5 h-3.5" />
            <span>Public Inflows</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
            Maintenance Collections
          </h1>
          <p className="text-sm text-slate-400 max-w-2xl">
            Complete transaction ledger of maintenance receipts deposited into society accounts.
          </p>
        </div>

        {/* Aggregated total of current filter */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl shrink-0">
          <span className="text-2xs font-semibold uppercase tracking-wider text-slate-400 block">
            Filtered Collections Total
          </span>
          <span className="text-2xl font-black text-emerald-400">
            {formatCurrency(totalFilteredAmount)}
          </span>
          <span className="text-2xs text-slate-400 block mt-0.5">
            {filteredPayments.length} transactions match filters
          </span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl space-y-4">
        
        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by resident name, flat number (e.g. A-101), or transaction ref..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
          />
        </div>

        {/* Multi-Filter Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          
          {/* Month */}
          <div>
            <label className="block text-2xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Month
            </label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="all">All Months</option>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>
                  {getMonthName(m)}
                </option>
              ))}
            </select>
          </div>

          {/* Year */}
          <div>
            <label className="block text-2xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Year
            </label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="all">All Years</option>
              {availableYears.map((yr) => (
                <option key={yr} value={yr}>
                  {yr}
                </option>
              ))}
            </select>
          </div>

          {/* Member */}
          <div>
            <label className="block text-2xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Member / Flat
            </label>
            <select
              value={selectedMember}
              onChange={(e) => setSelectedMember(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 truncate"
            >
              <option value="all">All Members</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.flat_number} - {m.full_name}
                </option>
              ))}
            </select>
          </div>

          {/* Type */}
          <div>
            <label className="block text-2xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Payment Type
            </label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="all">All Types</option>
              {PAYMENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

        </div>

      </div>

      {/* Main Content: Table & Cards */}
      {filteredPayments.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title={recentPayments.length === 0 ? "No payments recorded yet." : "No matching payments."}
          description={
            recentPayments.length === 0
              ? "All recorded maintenance receipts will be displayed here in real time."
              : "Try clearing or loosening your filters."
          }
        />
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block overflow-hidden rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800/80 bg-slate-950/50 text-2xs font-semibold uppercase tracking-wider text-slate-400">
                    <th className="py-4 px-6">Payment Date</th>
                    <th className="py-4 px-6">Flat &amp; Member</th>
                    <th className="py-4 px-6">Period</th>
                    <th className="py-4 px-6">Type &amp; Method</th>
                    <th className="py-4 px-6">Reference / Notes</th>
                    <th className="py-4 px-6 text-right">Amount Paid</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-sm">
                  {filteredPayments.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-4 px-6 font-medium text-white whitespace-nowrap">
                        {formatDate(p.payment_date)}
                      </td>
                      <td className="py-4 px-6">
                        <div className="font-semibold text-white">
                          {p.member?.full_name || 'Resident'}
                        </div>
                        <div className="text-xs text-indigo-400 font-mono">
                          Flat {p.member?.flat_number} {p.member?.building ? `(${p.member?.building})` : ''}
                        </div>
                      </td>
                      <td className="py-4 px-6 text-slate-300 text-xs">
                        {(() => {
                          if (p.start_month && p.end_month && p.start_year && p.end_year) {
                            if (p.start_month === p.end_month && p.start_year === p.end_year) {
                              return <span className="font-medium">{getMonthName(p.start_month)} {p.start_year}</span>;
                            }
                            const count = (p.end_year * 12 + p.end_month) - (p.start_year * 12 + p.start_month) + 1;
                            return (
                              <span className="font-medium text-indigo-300">
                                {getMonthName(p.start_month)} {p.start_year} – {getMonthName(p.end_month)} {p.end_year}
                                <span className="ml-1.5 px-1.5 py-0.5 rounded text-3xs font-semibold bg-indigo-950/80 text-indigo-300 border border-indigo-800/60">
                                  {count} mos
                                </span>
                              </span>
                            );
                          }
                          if (p.payment_month && p.payment_year) {
                            const rate = p.member?.monthly_amount || 160;
                            const inferred = (rate > 0 && p.payment_type !== 'Annual' && p.amount >= rate * 1.5)
                              ? Math.round(p.amount / rate)
                              : 1;
                            if (inferred > 1) {
                              const endIdx = p.payment_year * 12 + p.payment_month;
                              const startIdx = endIdx - inferred + 1;
                              const sY = Math.floor((startIdx - 1) / 12);
                              const sM = ((startIdx - 1) % 12) + 1;
                              return (
                                <span className="font-medium text-indigo-300">
                                  {getMonthName(sM)} {sY} – {getMonthName(p.payment_month)} {p.payment_year}
                                  <span className="ml-1.5 px-1.5 py-0.5 rounded text-3xs font-semibold bg-indigo-950/80 text-indigo-300 border border-indigo-800/60">
                                    {inferred} mos
                                  </span>
                                </span>
                              );
                            }
                            return <span className="font-medium">{getMonthName(p.payment_month)} {p.payment_year}</span>;
                          }
                          return '—';
                        })()}
                      </td>
                      <td className="py-4 px-6">
                        <span className="inline-block px-2.5 py-0.5 rounded-md text-2xs font-semibold bg-slate-800 text-slate-300 border border-slate-700 mr-2">
                          {p.payment_type}
                        </span>
                        <span className="text-xs text-slate-400">
                          {p.payment_method}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-xs text-slate-400 font-mono">
                        {p.transaction_reference ? `Ref: ${p.transaction_reference}` : '—'}
                        {p.notes && <span className="block text-slate-400 font-sans italic text-2xs">"{p.notes}"</span>}
                      </td>
                      <td className="py-4 px-6 text-right font-bold text-emerald-400 whitespace-nowrap text-base">
                        +{formatCurrency(p.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Cards */}
          <div className="grid grid-cols-1 gap-4 md:hidden">
            {filteredPayments.map((p) => (
              <PaymentCard key={p.id} payment={p} />
            ))}
          </div>
        </>
      )}

    </div>
  );
};

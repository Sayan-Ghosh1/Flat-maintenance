import React, { useState, useMemo } from 'react';
import { 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  ShieldCheck, 
  ArrowUpRight, 
  TrendingUp, 
  HelpCircle,
  Hash,
  AlertTriangle,
  Receipt,
  Sparkles
} from 'lucide-react';
import { formatCurrency, formatDate, getMonthName } from '../lib/formatters';
import { calculateMemberClearance } from '../lib/clearanceTracker';
import type { 
  Member, 
  Payment, 
  PaymentAllocation, 
  ClearanceStatus, 
  MonthClearanceItem, 
  YearClearanceItem 
} from '../types/database';

interface ClearanceTrackerProps {
  member: Member;
  payments: Payment[];
  allocations: PaymentAllocation[];
}

export const ClearanceTracker: React.FC<ClearanceTrackerProps> = ({
  member,
  payments,
  allocations,
}) => {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [viewMode, setViewMode] = useState<'monthly' | 'annual'>(
    member.maintenance_frequency === 'annual' ? 'annual' : 'monthly'
  );

  // Calculate clearance data for the selected year
  const { summary, monthlyTimeline, annualTimeline } = useMemo(() => {
    return calculateMemberClearance(member, payments, allocations, selectedYear);
  }, [member, payments, allocations, selectedYear]);

  // Available years: past 3 years, current year, next year
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    years.add(currentYear - 2);
    years.add(currentYear - 1);
    years.add(currentYear);
    years.add(currentYear + 1);

    payments.forEach((p) => {
      const pYear = p.payment_year || p.start_year || new Date(p.payment_date).getFullYear();
      if (!isNaN(pYear)) years.add(pYear);
    });

    allocations.forEach((a) => {
      if (a.maintenance_year) years.add(a.maintenance_year);
    });

    return Array.from(years).sort((a, b) => b - a);
  }, [payments, allocations, currentYear]);

  // Status badge styling helper
  const getStatusBadge = (status: ClearanceStatus) => {
    switch (status) {
      case 'Paid':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-2xs font-semibold uppercase tracking-wider bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 shadow-sm">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            <span>Paid</span>
          </span>
        );
      case 'Advance Paid':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-2xs font-semibold uppercase tracking-wider bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 shadow-sm">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            <span>Paid</span>
          </span>
        );
      case 'Paid':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-2xs font-semibold uppercase tracking-wider bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 shadow-sm">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            <span>Cleared</span>
          </span>
        );
      case 'Pending':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-2xs font-semibold uppercase tracking-wider bg-indigo-950/80 text-indigo-300 border border-indigo-700/60 shadow-sm">
            <Clock className="w-3 h-3 text-indigo-400" />
            <span>Pending</span>
          </span>
        );
      case 'Not Yet Due':
      default:
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-2xs font-semibold uppercase tracking-wider bg-slate-900 text-slate-400 border border-slate-800">
            <span>Not Yet Due</span>
          </span>
        );
    }
  };

  // Find pending months for outstanding dues breakdown
  const outstandingMonths = useMemo(() => {
    return monthlyTimeline.filter(
      (m) => m.status === 'Pending' && m.remainingAmount > 0
    );
  }, [monthlyTimeline]);

  return (
    <div className="space-y-8">
      
      {/* 1. Visually Prominent Clearance Card */}
      <div className="relative overflow-hidden rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-slate-900/90 via-indigo-950/30 to-slate-950 border border-indigo-500/30 shadow-2xl backdrop-blur-xl">
        {/* Decorative lighting */}
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 space-y-6">
          
          {/* Header Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-800/80">
            <div className="flex items-center space-x-3">
              <div className="p-3 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 shadow-inner">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center space-x-2.5">
                  <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                    Maintenance Clearance
                  </h2>
                  {getStatusBadge(summary.overallStatus)}
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Verified tracking of dues for Flat {member.flat_number} ({member.full_name})
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2 text-xs">
              <span className="text-slate-400">Plan:</span>
              <span className="px-3 py-1 rounded-xl bg-slate-800/80 text-white font-semibold border border-slate-700 capitalize">
                {summary.frequency} ({formatCurrency(summary.rate)}/{summary.frequency === 'annual' ? 'yr' : 'mo'})
              </span>
            </div>
          </div>

          {/* Primary Status Banner */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/70 border border-slate-800/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <span className="text-2xs uppercase tracking-widest font-semibold text-slate-400 block mb-1">
                Current Clearance Position
              </span>
              <div className="flex items-center space-x-3">
                <p className="text-xl sm:text-2xl font-extrabold text-white">
                  {summary.paidThroughText}
                </p>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Active Assessment Period: <span className="text-indigo-300 font-semibold">{summary.currentPeriodText}</span>
                {summary.lastPaymentDate && (
                  <span> • Last Payment: {formatDate(summary.lastPaymentDate)}</span>
                )}
              </p>
            </div>

            <div className="flex items-center space-x-3 shrink-0">
              <div className="text-right">
                <span className="text-2xs text-slate-400 uppercase tracking-wider block">Total Outstanding</span>
                <span className={`text-xl font-black ${summary.totalOutstanding > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {summary.totalOutstanding > 0 ? formatCurrency(summary.totalOutstanding) : '₹0 (All Clear)'}
                </span>
              </div>
            </div>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80">
              <span className="text-2xs font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                Current Month Due
              </span>
              <p className={`text-lg sm:text-xl font-bold ${summary.currentPeriodDue > 0 ? 'text-amber-300' : 'text-emerald-400'}`}>
                {formatCurrency(summary.currentPeriodDue)}
              </p>
              <span className="text-2xs text-slate-400">Due for {summary.currentPeriodText}</span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80">
              <span className="text-2xs font-semibold uppercase tracking-wider text-emerald-400 block mb-1">
                Months Cleared
              </span>
              <p className="text-lg sm:text-xl font-bold text-emerald-300">
                {summary.monthsCleared} {summary.monthsCleared === 1 ? 'Month' : 'Months'}
              </p>
              <span className="text-2xs text-emerald-500/70">100% paid dues</span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80">
              <span className="text-2xs font-semibold uppercase tracking-wider text-rose-400 block mb-1">
                Pending Months
              </span>
              <p className={`text-lg sm:text-xl font-bold ${summary.monthsPending > 0 ? 'text-rose-400' : 'text-slate-300'}`}>
                {summary.monthsPending} {summary.monthsPending === 1 ? 'Month' : 'Months'}
              </p>
              <span className="text-2xs text-slate-400">Requiring settlement</span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80">
              <span className="text-2xs font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                Pre-paid Credit
              </span>
              <p className="text-lg sm:text-xl font-bold text-slate-200">
                {formatCurrency(summary.advanceCredit)}
              </p>
              <span className="text-2xs text-slate-500">Recorded payments</span>
            </div>

          </div>

        </div>
      </div>

      {/* 2. Month-by-Month Clearance Timeline Header & Controls */}
      <div className="rounded-3xl p-6 sm:p-8 bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl shadow-xl space-y-6">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center space-x-2">
              <Calendar className="w-5 h-5 text-indigo-400" />
              <span>Month-by-Month Clearance Timeline</span>
            </h3>
            <p className="text-xs text-slate-400">
              Audited statement of required maintenance vs verified allocations
            </p>
          </div>

          <div className="flex items-center space-x-2.5">
            {/* Frequency Toggle */}
            <div className="inline-flex rounded-xl bg-slate-950 p-1 border border-slate-800 text-xs font-semibold">
              <button
                onClick={() => setViewMode('monthly')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  viewMode === 'monthly'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setViewMode('annual')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  viewMode === 'annual'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Annual
              </button>
            </div>

            {/* Year Selector */}
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-bold text-white focus:outline-none focus:border-indigo-500"
            >
              {availableYears.map((yr) => (
                <option key={yr} value={yr}>
                  Year {yr}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* View Mode 1: Monthly Timeline */}
        {viewMode === 'monthly' && (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-hidden rounded-2xl border border-slate-800/80">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="bg-slate-950/80 border-b border-slate-800/80 text-2xs font-semibold uppercase tracking-wider text-slate-400">
                    <th className="py-3.5 px-5">Month ({selectedYear})</th>
                    <th className="py-3.5 px-5 text-right">Required</th>
                    <th className="py-3.5 px-5 text-right">Paid</th>
                    <th className="py-3.5 px-5 text-right">Remaining Due</th>
                    <th className="py-3.5 px-5 text-center">Clearance Status</th>
                    <th className="py-3.5 px-5">Allocation Receipts</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {monthlyTimeline.map((item) => (
                    <tr
                      key={`${item.year}-${item.month}`}
                      className={`hover:bg-slate-800/30 transition-colors ${
                        item.year === currentYear && item.month === currentMonth
                          ? 'bg-indigo-950/20'
                          : ''
                      }`}
                    >
                      <td className="py-3.5 px-5 font-medium text-white whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <span>{item.monthName} {item.year}</span>
                          {item.year === currentYear && item.month === currentMonth && (
                            <span className="text-3xs font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded border border-indigo-500/30">
                              Current
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-5 text-right font-mono text-slate-300 whitespace-nowrap">
                        {formatCurrency(item.requiredAmount)}
                      </td>
                      <td className="py-3.5 px-5 text-right font-mono font-bold text-emerald-400 whitespace-nowrap">
                        {item.paidAmount > 0 ? `+${formatCurrency(item.paidAmount)}` : '₹0'}
                      </td>
                      <td className="py-3.5 px-5 text-right font-mono font-bold whitespace-nowrap">
                        <span className={item.remainingAmount > 0 ? 'text-rose-400' : 'text-slate-500'}>
                          {item.remainingAmount > 0 ? `−${formatCurrency(item.remainingAmount)}` : '₹0'}
                        </span>
                      </td>
                      <td className="py-3.5 px-5 text-center whitespace-nowrap">
                        {getStatusBadge(item.status)}
                      </td>
                      <td className="py-3.5 px-5 text-xs text-slate-400">
                        {item.allocations.length === 0 ? (
                          <span className="text-slate-600">—</span>
                        ) : (
                          <div className="space-y-1">
                            {item.allocations.map((alloc, idx) => (
                              <div key={idx} className="flex items-center space-x-2 font-mono text-2xs text-slate-300">
                                <span className="text-emerald-400">+{formatCurrency(alloc.amount)}</span>
                                <span className="text-slate-500">on {formatDate(alloc.paymentDate)}</span>
                                {alloc.reference && (
                                  <span className="text-slate-400">({alloc.reference})</span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View */}
            <div className="grid grid-cols-1 gap-3 md:hidden">
              {monthlyTimeline.map((item) => (
                <div
                  key={`${item.year}-${item.month}`}
                  className={`p-4 rounded-2xl border backdrop-blur-xl transition-all ${
                    item.year === currentYear && item.month === currentMonth
                      ? 'bg-indigo-950/30 border-indigo-500/40'
                      : 'bg-slate-950/60 border-slate-800/80'
                  }`}
                >
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-white text-sm">
                        {item.monthName} {item.year}
                      </span>
                      {item.year === currentYear && item.month === currentMonth && (
                        <span className="text-3xs font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded">
                          Current
                        </span>
                      )}
                    </div>
                    {getStatusBadge(item.status)}
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-3 text-center text-xs">
                    <div>
                      <span className="block text-3xs uppercase tracking-wider text-slate-400">Required</span>
                      <span className="font-semibold text-slate-200">{formatCurrency(item.requiredAmount)}</span>
                    </div>
                    <div>
                      <span className="block text-3xs uppercase tracking-wider text-slate-400">Paid</span>
                      <span className="font-bold text-emerald-400">
                        {item.paidAmount > 0 ? `+${formatCurrency(item.paidAmount)}` : '₹0'}
                      </span>
                    </div>
                    <div>
                      <span className="block text-3xs uppercase tracking-wider text-slate-400">Remaining</span>
                      <span className={`font-bold ${item.remainingAmount > 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                        {item.remainingAmount > 0 ? `−${formatCurrency(item.remainingAmount)}` : '₹0'}
                      </span>
                    </div>
                  </div>

                  {item.allocations.length > 0 && (
                    <div className="mt-2.5 pt-2 border-t border-slate-800/60 text-2xs text-slate-400 space-y-0.5 font-mono">
                      {item.allocations.map((alloc, idx) => (
                        <div key={idx}>
                          Paid: +{formatCurrency(alloc.amount)} on {formatDate(alloc.paymentDate)}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {/* View Mode 2: Annual Tracker */}
        {viewMode === 'annual' && (
          <div className="overflow-hidden rounded-2xl border border-slate-800/80">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="bg-slate-950/80 border-b border-slate-800/80 text-2xs font-semibold uppercase tracking-wider text-slate-400">
                  <th className="py-3.5 px-5">Annual Period</th>
                  <th className="py-3.5 px-5 text-right">Required Amount</th>
                  <th className="py-3.5 px-5 text-right">Amount Paid</th>
                  <th className="py-3.5 px-5 text-right">Remaining Balance</th>
                  <th className="py-3.5 px-5 text-center">Status</th>
                  <th className="py-3.5 px-5">Last Payment Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {annualTimeline.map((item) => (
                  <tr key={item.year} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3.5 px-5 font-bold text-white whitespace-nowrap">
                      Year {item.year}
                    </td>
                    <td className="py-3.5 px-5 text-right font-mono text-slate-300">
                      {formatCurrency(item.requiredAmount)}
                    </td>
                    <td className="py-3.5 px-5 text-right font-mono font-bold text-emerald-400">
                      +{formatCurrency(item.paidAmount)}
                    </td>
                    <td className="py-3.5 px-5 text-right font-mono font-bold">
                      <span className={item.remainingAmount > 0 ? 'text-rose-400' : 'text-slate-500'}>
                        {item.remainingAmount > 0 ? `−${formatCurrency(item.remainingAmount)}` : '₹0'}
                      </span>
                    </td>
                    <td className="py-3.5 px-5 text-center">
                      {getStatusBadge(item.status)}
                    </td>
                    <td className="py-3.5 px-5 text-slate-400 text-xs">
                      {item.paymentDate ? formatDate(item.paymentDate) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>

      {/* 3. Outstanding Dues Breakdown (if any pending months exist) */}
      {outstandingMonths.length > 0 && (
        <div className="rounded-3xl p-6 sm:p-7 bg-rose-950/20 border border-rose-900/40 backdrop-blur-xl space-y-4">
          <div className="flex items-center space-x-3 text-rose-300">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <div>
              <h4 className="text-base font-bold text-white">Outstanding Dues Breakdown ({selectedYear})</h4>
              <p className="text-xs text-rose-300/80">
                The following periods have dues requiring settlement.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2">
            {outstandingMonths.map((m) => (
              <div key={m.month} className="p-3.5 rounded-2xl bg-slate-950/80 border border-rose-900/40 flex items-center justify-between">
                <div>
                  <span className="font-bold text-white text-xs block">{m.monthName} {m.year}</span>
                  <span className="text-2xs text-slate-400">Required: {formatCurrency(m.requiredAmount)}</span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-extrabold text-rose-400 block">
                    Due: {formatCurrency(m.remainingAmount)}
                  </span>
                  <span className="text-3xs uppercase font-semibold text-rose-400/80">{m.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};

import React, { useState, useMemo } from 'react';
import { 
  Calendar, 
  CreditCard, 
  ChevronDown, 
  ChevronRight, 
  Hash, 
  Clock, 
  CheckCircle2, 
  Layers,
  Receipt
} from 'lucide-react';
import { formatCurrency, formatDate, getMonthName } from '../lib/formatters';
import type { Payment } from '../types/database';

interface YearlyPaymentTimelineProps {
  payments: Payment[];
  flatNumber?: string;
  memberName?: string;
}

interface YearGroup {
  year: number | string;
  payments: Payment[];
  totalAmount: number;
}

export const YearlyPaymentTimeline: React.FC<YearlyPaymentTimelineProps> = ({ 
  payments, 
  flatNumber, 
  memberName 
}) => {
  // Group payments by maintenance year
  const yearGroups: YearGroup[] = useMemo(() => {
    const groupsMap = new Map<number | string, Payment[]>();

    payments.forEach((p) => {
      // Prioritize maintenance year, fallback to payment_date year if missing
      let yr: number | string = p.payment_year || p.start_year || 0;
      if (!yr || yr === 0) {
        if (p.payment_date) {
          const d = new Date(p.payment_date);
          yr = !isNaN(d.getTime()) ? d.getFullYear() : 'Unassigned';
        } else {
          yr = 'Unassigned';
        }
      }

      const existing = groupsMap.get(yr) || [];
      existing.push(p);
      groupsMap.set(yr, existing);
    });

    // Convert map to sorted array
    // Numeric years sorted descending (latest year first, e.g. 2027, 2026, 2025)
    // 'Unassigned' placed at the end
    const sortedYears = Array.from(groupsMap.keys()).sort((a, b) => {
      if (a === 'Unassigned') return 1;
      if (b === 'Unassigned') return -1;
      return Number(b) - Number(a);
    });

    return sortedYears.map((yr) => {
      const list = groupsMap.get(yr) || [];
      // Sort payments within the year by maintenance month ascending (1 -> 12),
      // then by payment_date
      list.sort((a, b) => {
        const monthA = a.payment_month || a.start_month || (a.payment_date ? new Date(a.payment_date).getMonth() + 1 : 0);
        const monthB = b.payment_month || b.start_month || (b.payment_date ? new Date(b.payment_date).getMonth() + 1 : 0);
        if (monthA !== monthB) {
          return monthA - monthB;
        }
        return new Date(a.payment_date).getTime() - new Date(b.payment_date).getTime();
      });

      const total = list.reduce((sum, p) => sum + Number(p.amount || 0), 0);

      return {
        year: yr,
        payments: list,
        totalAmount: total,
      };
    });
  }, [payments]);

  // Collapsible state: default latest year expanded, older years collapsed
  const [expandedYears, setExpandedYears] = useState<Record<string, boolean>>({});

  // Ensure latest year is expanded by default whenever yearGroups change
  React.useEffect(() => {
    if (yearGroups.length > 0) {
      setExpandedYears((prev) => {
        const latestKey = String(yearGroups[0].year);
        // If not already set, open the latest year
        if (prev[latestKey] === undefined) {
          return { ...prev, [latestKey]: true };
        }
        return prev;
      });
    }
  }, [yearGroups]);

  const toggleYear = (yr: number | string) => {
    const key = String(yr);
    setExpandedYears((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  if (payments.length === 0) {
    return (
      <div className="rounded-3xl p-8 bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl text-center space-y-3">
        <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-800 flex items-center justify-center text-slate-500">
          <Receipt className="w-6 h-6" />
        </div>
        <h4 className="text-base font-semibold text-white">No Payment Records</h4>
        <p className="text-xs text-slate-400 max-w-sm mx-auto">
          {flatNumber 
            ? `No maintenance payments have been recorded for Flat ${flatNumber} yet.` 
            : 'No maintenance payments have been recorded yet.'} Once the administrator adds payments, they will be dynamically grouped by year here.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-3xl p-6 sm:p-8 bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl shadow-xl space-y-6">
      
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-slate-800/80">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white tracking-tight uppercase">
              Maintenance Payment History
            </h3>
            <p className="text-xs text-slate-400">
              Chronological payments grouped by maintenance year
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 text-xs">
          <span className="px-3 py-1 rounded-full bg-slate-800 text-slate-300 font-semibold border border-slate-700">
            {payments.length} {payments.length === 1 ? 'Transaction' : 'Transactions'} across {yearGroups.length} {yearGroups.length === 1 ? 'Year' : 'Years'}
          </span>
        </div>
      </div>

      {/* Year-by-Year Collapsible Sections */}
      <div className="space-y-5">
        {yearGroups.map((group) => {
          const isExpanded = !!expandedYears[String(group.year)];
          const txCount = group.payments.length;

          return (
            <div
              key={String(group.year)}
              className="rounded-2xl border border-slate-800/80 bg-slate-950/60 overflow-hidden transition-all"
            >
              {/* Year Collapsible Header Button */}
              <button
                type="button"
                onClick={() => toggleYear(group.year)}
                className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-slate-900/60 transition-colors focus:outline-none"
              >
                <div className="flex items-center space-x-3">
                  <div className="p-1 rounded-lg text-slate-400 hover:text-white transition-colors">
                    {isExpanded ? (
                      <ChevronDown className="w-5 h-5 text-indigo-400" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-slate-400" />
                    )}
                  </div>
                  <span className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
                    {group.year === 'Unassigned' ? 'Unassigned Period' : group.year}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                    {txCount} {txCount === 1 ? 'payment' : 'payments'}
                  </span>
                </div>

                <div className="text-right">
                  <span className="text-xs sm:text-sm font-bold text-emerald-400 font-mono">
                    +{formatCurrency(group.totalAmount)}
                  </span>
                </div>
              </button>

              {/* Collapsible Content: Clean Vertical Timeline */}
              {isExpanded && (
                <div className="px-4 sm:px-6 pt-2 pb-6 border-t border-slate-800/60">
                  <div className="relative pl-6 sm:pl-8 space-y-4 before:absolute before:left-2 sm:before:left-3 before:top-3 before:bottom-3 before:w-0.5 before:bg-indigo-500/20">
                    
                    {group.payments.map((p, index) => {
                      // Maintenance month & year label with multi-month period support
                      let maintenanceHeader = '';
                      let durationBadge: string | null = null;

                      if (p.start_month && p.end_month && p.start_year && p.end_year) {
                        if (p.start_month === p.end_month && p.start_year === p.end_year) {
                          maintenanceHeader = `${getMonthName(p.start_month)} ${p.start_year}`;
                        } else {
                          const count = (p.end_year * 12 + p.end_month) - (p.start_year * 12 + p.start_month) + 1;
                          maintenanceHeader = `${getMonthName(p.start_month)} ${p.start_year} – ${getMonthName(p.end_month)} ${p.end_year}`;
                          durationBadge = `${count} Months Cleared`;
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
                          maintenanceHeader = `${getMonthName(sM)} ${sY} – ${getMonthName(p.payment_month)} ${p.payment_year}`;
                          durationBadge = `${inferred} Months Cleared`;
                        } else {
                          maintenanceHeader = `${getMonthName(p.payment_month)} ${p.payment_year}`;
                        }
                      } else {
                        const d = p.payment_date ? new Date(p.payment_date) : null;
                        maintenanceHeader = d && !isNaN(d.getTime()) 
                          ? `${getMonthName(d.getMonth() + 1)} ${d.getFullYear()}` 
                          : `Maintenance ${p.payment_year || p.start_year || group.year}`;
                      }

                      const paymentTypeLabel = 
                        p.payment_type === 'Monthly' ? 'Monthly Maintenance' :
                        p.payment_type === 'Annual' ? 'Annual Maintenance' :
                        (p.payment_type || 'Monthly Maintenance');

                      return (
                        <div key={p.id || index} className="relative group">
                          
                          {/* Timeline Dot (●) */}
                          <div className="absolute -left-6 sm:-left-8 top-4 w-4 h-4 rounded-full bg-slate-950 border-2 border-emerald-400 flex items-center justify-center -translate-x-1/2 shadow-sm shadow-emerald-500/20">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          </div>

                          {/* Payment Card */}
                          <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/80 hover:bg-slate-900 border border-slate-800/80 hover:border-slate-700/80 transition-all shadow-md">
                            
                            {/* Card Top: Month Header & Amount */}
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <h4 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center space-x-2">
                                  <span>{maintenanceHeader}</span>
                                </h4>
                                <div className="flex items-center space-x-2 mt-0.5">
                                  <span className="inline-block px-2 py-0.5 rounded text-2xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                                    {paymentTypeLabel}
                                  </span>
                                  {durationBadge && (
                                    <span className="inline-block px-2 py-0.5 rounded text-2xs font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-800/60">
                                      {durationBadge}
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="text-right">
                                <span className="text-lg sm:text-xl font-extrabold text-emerald-400 font-mono block">
                                  +{formatCurrency(p.amount)}
                                </span>
                              </div>
                            </div>

                            {/* Card Details: Paid On Date & Payment Method */}
                            <div className="mt-3 pt-3 border-t border-slate-800/60 flex flex-wrap items-center justify-between gap-y-1.5 text-xs text-slate-400">
                              <div className="flex items-center space-x-4">
                                <div>
                                  <span className="text-slate-500">Paid on: </span>
                                  <span className="text-slate-200 font-medium">
                                    {formatDate(p.payment_date)}
                                  </span>
                                </div>

                                <div>
                                  <span className="text-slate-500">Method: </span>
                                  <span className="text-slate-200 font-medium">
                                    {p.payment_method || '—'}
                                  </span>
                                </div>
                              </div>

                              {p.transaction_reference && (
                                <div className="flex items-center space-x-1 font-mono text-2xs text-slate-400">
                                  <Hash className="w-3 h-3 text-slate-500" />
                                  <span>Ref: {p.transaction_reference}</span>
                                </div>
                              )}
                            </div>

                            {/* Optional Notes */}
                            {p.notes && (
                              <div className="mt-2 text-2xs text-slate-400 italic">
                                "{p.notes}"
                              </div>
                            )}

                          </div>
                        </div>
                      );
                    })}

                  </div>
                </div>
              )}

            </div>
          );
        })}
      </div>

    </div>
  );
};

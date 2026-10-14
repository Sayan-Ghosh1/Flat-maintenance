import React, { useState, useMemo } from 'react';
import { 
  BarChart3, 
  Calendar, 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  Download, 
  PieChart as PieIcon, 
  FileSpreadsheet,
  AlertCircle
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  CartesianGrid,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { AdminLayout } from '../components/AdminLayout';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { EmptyState } from '../components/EmptyState';
import { useMaintenanceData } from '../hooks/useMaintenanceData';
import { formatCurrency, getMonthName } from '../lib/formatters';

export const AdminReports: React.FC = () => {
  const { loading, summary, recentPayments, recentExpenses } = useMaintenanceData();
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);

  // Available years from data
  const availableYears = useMemo(() => {
    const set = new Set<number>();
    set.add(currentYear);
    recentPayments.forEach((p) => {
      const yr = p.payment_year || new Date(p.payment_date).getFullYear();
      if (!isNaN(yr)) set.add(yr);
    });
    recentExpenses.forEach((e) => {
      const yr = new Date(e.expense_date).getFullYear();
      if (!isNaN(yr)) set.add(yr);
    });
    return Array.from(set).sort((a, b) => b - a);
  }, [recentPayments, recentExpenses, currentYear]);

  // Build 12-month report matrix for selected year
  const monthlyBreakdown = useMemo(() => {
    const months = Array.from({ length: 12 }, (_, i) => ({
      monthIndex: i + 1,
      monthName: getMonthName(i + 1),
      collections: 0,
      expenses: 0,
      net: 0,
    }));

    // Payments for selected year
    recentPayments.forEach((p) => {
      const pDate = new Date(p.payment_date);
      const pYear = p.payment_year || pDate.getFullYear();
      const pMonth = p.payment_month || (pDate.getMonth() + 1);

      if (pYear === selectedYear && pMonth >= 1 && pMonth <= 12) {
        months[pMonth - 1].collections += p.amount;
      }
    });

    // Expenses for selected year
    recentExpenses.forEach((e) => {
      const eDate = new Date(e.expense_date);
      const eYear = eDate.getFullYear();
      const eMonth = eDate.getMonth() + 1;

      if (eYear === selectedYear && eMonth >= 1 && eMonth <= 12) {
        months[eMonth - 1].expenses += e.amount;
      }
    });

    // Compute net for each month
    months.forEach((m) => {
      m.net = m.collections - m.expenses;
    });

    const hasAnyTransactions = months.some((m) => m.collections > 0 || m.expenses > 0);
    return { data: months, hasData: hasAnyTransactions };
  }, [recentPayments, recentExpenses, selectedYear]);

  // Yearly aggregates
  const yearTotals = useMemo(() => {
    const totalCollected = monthlyBreakdown.data.reduce((acc, m) => acc + m.collections, 0);
    const totalSpent = monthlyBreakdown.data.reduce((acc, m) => acc + m.expenses, 0);
    const netSavings = totalCollected - totalSpent;
    return { totalCollected, totalSpent, netSavings };
  }, [monthlyBreakdown]);

  // Export simple CSV report
  const handleExportCSV = () => {
    const headers = ['Month', 'Collections (INR)', 'Expenses (INR)', 'Net Balance (INR)'];
    const rows = monthlyBreakdown.data.map((m) => [
      m.monthName,
      m.collections.toFixed(2),
      m.expenses.toFixed(2),
      m.net.toFixed(2),
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `maintenance_report_${selectedYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <AdminLayout title="Financial Reports" subtitle="Synthesizing annual ledgers...">
        <div className="py-20 flex justify-center">
          <LoadingSpinner message="Calculating comprehensive financial reports..." />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      title="Financial Reports &amp; Statements"
      subtitle={`Complete audit trail and monthly balance sheets for ${selectedYear}`}
      actionButton={
        <div className="flex items-center space-x-3">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold text-white focus:outline-none focus:border-indigo-500"
          >
            {availableYears.map((yr) => (
              <option key={yr} value={yr}>Calendar Year {yr}</option>
            ))}
          </select>

          <button
            onClick={handleExportCSV}
            disabled={!monthlyBreakdown.hasData}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 transition-colors disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      }
    >
      <div className="space-y-8">
        
        {/* Year Summary Scorecard */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl bg-emerald-950/20 border border-emerald-900/40 backdrop-blur-xl">
            <span className="text-2xs font-semibold uppercase tracking-wider text-emerald-400 block mb-1">
              {selectedYear} Collections
            </span>
            <p className="text-2xl sm:text-3xl font-extrabold text-emerald-300">
              +{formatCurrency(yearTotals.totalCollected)}
            </p>
            <span className="text-2xs text-emerald-500/70">Total receipts in {selectedYear}</span>
          </div>

          <div className="p-5 rounded-2xl bg-rose-950/20 border border-rose-900/40 backdrop-blur-xl">
            <span className="text-2xs font-semibold uppercase tracking-wider text-rose-400 block mb-1">
              {selectedYear} Disbursements
            </span>
            <p className="text-2xl sm:text-3xl font-extrabold text-rose-300">
              −{formatCurrency(yearTotals.totalSpent)}
            </p>
            <span className="text-2xs text-rose-500/70">Total expenditures in {selectedYear}</span>
          </div>

          <div className="p-5 rounded-2xl bg-indigo-950/20 border border-indigo-900/40 backdrop-blur-xl">
            <span className="text-2xs font-semibold uppercase tracking-wider text-indigo-400 block mb-1">
              {selectedYear} Net Flow
            </span>
            <p className={`text-2xl sm:text-3xl font-extrabold ${yearTotals.netSavings >= 0 ? 'text-indigo-200' : 'text-rose-400'}`}>
              {formatCurrency(yearTotals.netSavings)}
            </p>
            <span className="text-2xs text-indigo-400/70">Surplus / Deficit in {selectedYear}</span>
          </div>
        </div>

        {/* Recharts Visualization */}
        <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800/80">
            <div>
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <BarChart3 className="w-4 h-4 text-indigo-400" />
                <span>Monthly Comparison ({selectedYear})</span>
              </h3>
              <p className="text-xs text-slate-400">Direct graphical representation of cash collected vs spent</p>
            </div>
          </div>

          {!monthlyBreakdown.hasData ? (
            <EmptyState
              icon={BarChart3}
              title={`No transactions recorded for ${selectedYear}`}
              description="Monthly bar charts will render as soon as payments or expenses are added for this period."
            />
          ) : (
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyBreakdown.data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
                  <XAxis dataKey="monthName" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} tickFormatter={(val) => `₹${val}`} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '0.75rem',
                      fontSize: '0.75rem',
                      color: '#f8fafc',
                    }}
                    formatter={(val: any) => [formatCurrency(val), '']}
                  />
                  <Legend wrapperStyle={{ fontSize: '0.75rem', paddingTop: '10px' }} />
                  <Bar dataKey="collections" name="Collections (+)" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expenses" name="Expenses (−)" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Monthly Breakdown Table */}
        <div className="overflow-hidden rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl shadow-xl">
          <div className="p-4 sm:p-5 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Full Month-by-Month Statement</span>
            </h3>
            <span className="text-xs text-slate-400 font-mono">
              All 12 Calendar Months
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="bg-slate-950/50 border-b border-slate-800 text-2xs font-semibold uppercase tracking-wider text-slate-400">
                  <th className="py-3.5 px-6">Month</th>
                  <th className="py-3.5 px-6 text-right">Collections</th>
                  <th className="py-3.5 px-6 text-right">Expenses</th>
                  <th className="py-3.5 px-6 text-right">Net Change</th>
                  <th className="py-3.5 px-6 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {monthlyBreakdown.data.map((m) => (
                  <tr key={m.monthIndex} className="hover:bg-slate-800/20 transition-colors">
                    <td className="py-3.5 px-6 font-semibold text-white whitespace-nowrap">
                      {m.monthName}
                    </td>
                    <td className="py-3.5 px-6 text-right font-medium text-emerald-400 whitespace-nowrap">
                      {m.collections > 0 ? `+${formatCurrency(m.collections)}` : '₹0'}
                    </td>
                    <td className="py-3.5 px-6 text-right font-medium text-rose-400 whitespace-nowrap">
                      {m.expenses > 0 ? `−${formatCurrency(m.expenses)}` : '₹0'}
                    </td>
                    <td
                      className={`py-3.5 px-6 text-right font-bold whitespace-nowrap ${
                        m.net > 0 ? 'text-emerald-400' : m.net < 0 ? 'text-rose-400' : 'text-slate-500'
                      }`}
                    >
                      {formatCurrency(m.net)}
                    </td>
                    <td className="py-3.5 px-6 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-2xs font-semibold uppercase tracking-wider ${
                          m.net > 0
                            ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/40'
                            : m.net < 0
                            ? 'bg-rose-950/60 text-rose-400 border border-rose-800/40'
                            : 'bg-slate-800 text-slate-500 border border-slate-700'
                        }`}
                      >
                        {m.net > 0 ? 'Surplus' : m.net < 0 ? 'Deficit' : 'Balanced'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-950/80 border-t-2 border-slate-800 font-bold text-white text-xs sm:text-sm">
                  <td className="py-4 px-6 uppercase tracking-wider text-2xs text-slate-400">Annual Total</td>
                  <td className="py-4 px-6 text-right text-emerald-400">+{formatCurrency(yearTotals.totalCollected)}</td>
                  <td className="py-4 px-6 text-right text-rose-400">−{formatCurrency(yearTotals.totalSpent)}</td>
                  <td className={`py-4 px-6 text-right ${yearTotals.netSavings >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {formatCurrency(yearTotals.netSavings)}
                  </td>
                  <td className="py-4 px-6 text-center">
                    <span className="text-2xs uppercase tracking-wider font-semibold text-slate-300">
                      {yearTotals.netSavings >= 0 ? 'Net Surplus' : 'Net Deficit'}
                    </span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

      </div>
    </AdminLayout>
  );
};

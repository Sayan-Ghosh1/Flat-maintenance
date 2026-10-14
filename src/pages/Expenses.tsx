import React, { useState, useMemo } from 'react';
import { Receipt, Search, Filter, Calendar, Tag, TrendingDown } from 'lucide-react';
import { useMaintenanceData } from '../hooks/useMaintenanceData';
import { ExpenseCard } from '../components/ExpenseCard';
import { EmptyState } from '../components/EmptyState';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { formatCurrency, formatDate, getMonthName, EXPENSE_CATEGORIES } from '../lib/formatters';

export const Expenses: React.FC = () => {
  const { loading, recentExpenses } = useMaintenanceData();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState<string>('all');

  // Compute available years
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    const currentYear = new Date().getFullYear();
    years.add(currentYear);
    recentExpenses.forEach((e) => {
      const eYear = new Date(e.expense_date).getFullYear();
      if (!isNaN(eYear)) years.add(eYear);
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [recentExpenses]);

  // Filter expenses
  const filteredExpenses = useMemo(() => {
    return recentExpenses.filter((e) => {
      const eDate = new Date(e.expense_date);
      const eYear = eDate.getFullYear();
      const eMonth = eDate.getMonth() + 1;

      const matchesSearch =
        e.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (e.description?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
        (e.reference_number?.toLowerCase().includes(searchTerm.toLowerCase()) || false);

      const matchesCategory =
        selectedCategory === 'all' || e.category.toLowerCase() === selectedCategory.toLowerCase();

      const matchesMonth = selectedMonth === 'all' || eMonth === Number(selectedMonth);
      const matchesYear = selectedYear === 'all' || eYear === Number(selectedYear);

      return matchesSearch && matchesCategory && matchesMonth && matchesYear;
    });
  }, [recentExpenses, searchTerm, selectedCategory, selectedMonth, selectedYear]);

  const totalFilteredExpenses = useMemo(() => {
    return filteredExpenses.reduce((acc, e) => acc + e.amount, 0);
  }, [filteredExpenses]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <LoadingSpinner message="Loading society expense disbursements..." />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-16">
      
      {/* Header & Overview */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-2">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-semibold text-rose-400 bg-rose-950/50 border border-rose-800/40">
            <Receipt className="w-3.5 h-3.5" />
            <span>Public Outflows</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
            Society Expenses
          </h1>
          <p className="text-sm text-slate-400 max-w-2xl">
            Itemized breakdown of all expenditures made from the society maintenance fund for repairs, services, and utilities.
          </p>
        </div>

        {/* Aggregated total of current filter */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl shrink-0">
          <span className="text-2xs font-semibold uppercase tracking-wider text-slate-400 block">
            Filtered Expenses Total
          </span>
          <span className="text-2xl font-black text-rose-400">
            −{formatCurrency(totalFilteredExpenses)}
          </span>
          <span className="text-2xs text-slate-400 block mt-0.5">
            {filteredExpenses.length} expenditures recorded
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
            placeholder="Search by expense title, bill/voucher number, or vendor notes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
          />
        </div>

        {/* Multi-Filter Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          
          {/* Category */}
          <div>
            <label className="block text-2xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Category
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="all">All Categories</option>
              {EXPENSE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

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

        </div>

      </div>

      {/* Main Content: Table & Cards */}
      {filteredExpenses.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title={recentExpenses.length === 0 ? "No expenses recorded yet." : "No matching expenses."}
          description={
            recentExpenses.length === 0
              ? "All society bills and maintenance expenditures will be displayed here."
              : "Try adjusting your search query or category filters."
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
                    <th className="py-4 px-6">Expense Date</th>
                    <th className="py-4 px-6">Category</th>
                    <th className="py-4 px-6">Title &amp; Description</th>
                    <th className="py-4 px-6">Method &amp; Voucher</th>
                    <th className="py-4 px-6 text-right">Amount Billed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-sm">
                  {filteredExpenses.map((e) => (
                    <tr key={e.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-4 px-6 font-medium text-white whitespace-nowrap">
                        {formatDate(e.expense_date)}
                      </td>
                      <td className="py-4 px-6 whitespace-nowrap">
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-2xs font-semibold uppercase tracking-wider bg-slate-800 text-indigo-300 border border-slate-700">
                          {e.category}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <div className="font-semibold text-white">
                          {e.title}
                        </div>
                        {e.description && (
                          <div className="text-xs text-slate-400 max-w-md line-clamp-2 mt-0.5">
                            {e.description}
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-6 text-xs text-slate-400">
                        <div>{e.payment_method || '—'}</div>
                        {e.reference_number && (
                          <div className="font-mono text-2xs text-slate-400">
                            Bill #{e.reference_number}
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-6 text-right font-bold text-rose-400 whitespace-nowrap text-base">
                        −{formatCurrency(e.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Cards */}
          <div className="grid grid-cols-1 gap-4 md:hidden">
            {filteredExpenses.map((e) => (
              <ExpenseCard key={e.id} expense={e} />
            ))}
          </div>
        </>
      )}

    </div>
  );
};

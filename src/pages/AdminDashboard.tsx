import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  CreditCard, 
  Receipt, 
  PlusCircle, 
  ArrowUpRight, 
  Wallet,
  Clock,
  Sparkles,
  BarChart2,
  PieChart as PieChartIcon
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
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { AdminLayout } from '../components/AdminLayout';
import { StatCard } from '../components/StatCard';
import { BalanceCard } from '../components/BalanceCard';
import { PaymentCard } from '../components/PaymentCard';
import { ExpenseCard } from '../components/ExpenseCard';
import { EmptyState } from '../components/EmptyState';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { useMaintenanceData } from '../hooks/useMaintenanceData';
import { formatCurrency, formatDate, getMonthName } from '../lib/formatters';

export const AdminDashboard: React.FC = () => {
  const { 
    loading, 
    summary, 
    settings, 
    members, 
    recentPayments, 
    recentExpenses, 
    refetch 
  } = useMaintenanceData();

  const currentMonthName = new Intl.DateTimeFormat('en-US', { month: 'long' }).format(new Date());

  // Prepare monthly data for Recharts (Last 6 months)
  const chartData = useMemo(() => {
    const monthsMap: Record<string, { month: string; collections: number; expenses: number }> = {};
    const today = new Date();

    // Initialize last 6 months in chronological order
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      monthsMap[key] = { month: label, collections: 0, expenses: 0 };
    }

    // Populate actual collections
    recentPayments.forEach((p) => {
      const d = new Date(p.payment_date);
      if (!isNaN(d.getTime())) {
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (monthsMap[key]) {
          monthsMap[key].collections += p.amount;
        }
      }
    });

    // Populate actual expenses
    recentExpenses.forEach((e) => {
      const d = new Date(e.expense_date);
      if (!isNaN(d.getTime())) {
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (monthsMap[key]) {
          monthsMap[key].expenses += e.amount;
        }
      }
    });

    const list = Object.values(monthsMap);
    const hasAnyData = list.some((item) => item.collections > 0 || item.expenses > 0);
    return hasAnyData ? list : [];
  }, [recentPayments, recentExpenses]);

  // Category breakdown for expenses
  const expenseCategoryData = useMemo(() => {
    const catMap: Record<string, number> = {};
    recentExpenses.forEach((e) => {
      catMap[e.category] = (catMap[e.category] || 0) + e.amount;
    });

    return Object.entries(catMap).map(([name, value]) => ({ name, value }));
  }, [recentExpenses]);

  const PIE_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#3b82f6', '#8b5cf6', '#ef4444', '#14b8a6'];

  if (loading) {
    return (
      <AdminLayout title="Admin Dashboard" subtitle="Loading financial telemetry...">
        <div className="py-20 flex justify-center">
          <LoadingSpinner message="Calculating society treasury balance..." />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      title="Administrative Dashboard"
      subtitle="Real-time control center for treasury, collections, and disbursements"
      actionButton={
        <div className="flex items-center space-x-2 flex-wrap gap-y-2">
          <Link
            to="/admin/members?add=true"
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/30 transition-all active:scale-95 border border-indigo-400/30"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>+ Add Member</span>
          </Link>
          <Link
            to="/admin/payments?add=true"
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-md shadow-emerald-600/30 transition-all active:scale-95 border border-emerald-400/30"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>+ Record Payment</span>
          </Link>
          <Link
            to="/admin/expenses?add=true"
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 shadow-md shadow-rose-600/30 transition-all active:scale-95 border border-rose-400/30"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>+ Add Expense</span>
          </Link>
        </div>
      }
    >
      <div className="space-y-8">
        
        {/* Treasury Balance Banner */}
        <BalanceCard
          balance={summary.current_balance}
          initialBalance={summary.initial_balance}
          totalCollected={summary.total_collected}
          totalExpenses={summary.total_expenses}
          societyName={settings.society_name}
          onRefresh={refetch}
        />

        {/* Quick Actions Hub */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-extrabold uppercase tracking-widest text-slate-400">
              Administrative Quick Actions
            </h2>
            <span className="text-2xs text-indigo-400 font-semibold">1-Click Fast Entry</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Link
              to="/admin/members?add=true"
              className="group p-5 rounded-2xl bg-gradient-to-br from-indigo-950/60 via-slate-900/80 to-slate-900/60 border border-indigo-500/30 hover:border-indigo-400/60 shadow-lg shadow-indigo-950/30 hover:shadow-indigo-600/20 transition-all flex items-center space-x-4 hover:translate-y-[-2px]"
            >
              <div className="p-3.5 rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-600/40 group-hover:scale-110 transition-transform shrink-0">
                <Users className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <span className="block text-xs font-bold text-indigo-400 uppercase tracking-wider">Residents</span>
                <span className="block text-base font-bold text-white group-hover:text-indigo-200 transition-colors">+ Add Member</span>
                <p className="text-2xs text-slate-400 truncate mt-0.5">Register flat & set dues</p>
              </div>
            </Link>

            <Link
              to="/admin/payments?add=true"
              className="group p-5 rounded-2xl bg-gradient-to-br from-emerald-950/60 via-slate-900/80 to-slate-900/60 border border-emerald-500/30 hover:border-emerald-400/60 shadow-lg shadow-emerald-950/30 hover:shadow-emerald-600/20 transition-all flex items-center space-x-4 hover:translate-y-[-2px]"
            >
              <div className="p-3.5 rounded-xl bg-emerald-600 text-white shadow-md shadow-emerald-600/40 group-hover:scale-110 transition-transform shrink-0">
                <CreditCard className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <span className="block text-xs font-bold text-emerald-400 uppercase tracking-wider">Collections</span>
                <span className="block text-base font-bold text-white group-hover:text-emerald-200 transition-colors">+ Record Payment</span>
                <p className="text-2xs text-slate-400 truncate mt-0.5">Log maintenance fee</p>
              </div>
            </Link>

            <Link
              to="/admin/expenses?add=true"
              className="group p-5 rounded-2xl bg-gradient-to-br from-rose-950/60 via-slate-900/80 to-slate-900/60 border border-rose-500/30 hover:border-rose-400/60 shadow-lg shadow-rose-950/30 hover:shadow-rose-600/20 transition-all flex items-center space-x-4 hover:translate-y-[-2px]"
            >
              <div className="p-3.5 rounded-xl bg-rose-600 text-white shadow-md shadow-rose-600/40 group-hover:scale-110 transition-transform shrink-0">
                <Receipt className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <span className="block text-xs font-bold text-rose-400 uppercase tracking-wider">Disbursements</span>
                <span className="block text-base font-bold text-white group-hover:text-rose-200 transition-colors">+ Add Expense</span>
                <p className="text-2xs text-slate-400 truncate mt-0.5">Vendor bills & repairs</p>
              </div>
            </Link>
          </div>
        </div>

        {/* Primary KPIs Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Collection"
            value={formatCurrency(summary.total_collected)}
            subtitle="Verified resident receipts"
            icon={TrendingUp}
            variant="emerald"
          />
          <StatCard
            title="Total Expenses"
            value={formatCurrency(summary.total_expenses)}
            subtitle="Disbursed vendor bills"
            icon={TrendingDown}
            variant="rose"
          />
          <StatCard
            title={`${currentMonthName} Collections`}
            value={formatCurrency(summary.current_month_collected)}
            subtitle="Month to date inflow"
            icon={CreditCard}
            variant="indigo"
          />
          <StatCard
            title={`${currentMonthName} Expenses`}
            value={formatCurrency(summary.current_month_expenses)}
            subtitle="Month to date outflow"
            icon={Receipt}
            variant="amber"
          />
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Bar Chart: 6-Month Cash Flow */}
          <div className="lg:col-span-2 p-6 rounded-3xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800/80">
              <div>
                <h3 className="text-base font-bold text-white flex items-center space-x-2">
                  <BarChart2 className="w-4 h-4 text-indigo-400" />
                  <span>Collections vs Expenses Trend</span>
                </h3>
                <p className="text-xs text-slate-400">Monthly comparison based on recorded transactions</p>
              </div>
              <Link to="/admin/reports" className="text-xs font-semibold text-indigo-400 hover:text-indigo-300">
                Full Report →
              </Link>
            </div>

            {chartData.length === 0 ? (
              <EmptyState
                icon={BarChart2}
                title="No financial history for charts yet"
                description="Once payments or expenses are recorded, monthly visual trends will plot automatically."
              />
            ) : (
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                    <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} />
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

          {/* Expense Category Breakdown */}
          <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl">
            <div className="mb-6 pb-4 border-b border-slate-800/80">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <PieChartIcon className="w-4 h-4 text-rose-400" />
                <span>Expense Breakdown</span>
              </h3>
              <p className="text-xs text-slate-400">Distribution by vendor category</p>
            </div>

            {expenseCategoryData.length === 0 ? (
              <EmptyState
                icon={Receipt}
                title="No expenses recorded yet"
                description="Category distributions will appear here when society expenses are logged."
              />
            ) : (
              <div className="h-72 w-full flex flex-col justify-between">
                <ResponsiveContainer width="100%" height="70%">
                  <PieChart>
                    <Pie
                      data={expenseCategoryData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={70}
                      paddingAngle={3}
                    >
                      {expenseCategoryData.map((_entry, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderColor: '#334155',
                        borderRadius: '0.75rem',
                        fontSize: '0.75rem',
                        color: '#f8fafc',
                      }}
                      formatter={(val: any) => [formatCurrency(val), 'Amount']}
                    />
                  </PieChart>
                </ResponsiveContainer>

                <div className="grid grid-cols-2 gap-2 text-2xs overflow-y-auto max-h-24 pr-1">
                  {expenseCategoryData.map((item, idx) => (
                    <div key={item.name} className="flex items-center space-x-1.5 truncate">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }}
                      />
                      <span className="text-slate-300 truncate">{item.name}:</span>
                      <span className="font-semibold text-white">{formatCurrency(item.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Recent Activity Dual Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Latest Payments */}
          <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl">
            <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-800/80">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <CreditCard className="w-4 h-4 text-emerald-400" />
                <span>Latest Payments</span>
              </h3>
              <Link to="/admin/payments" className="text-xs font-semibold text-emerald-400 hover:text-emerald-300">
                Manage Collections →
              </Link>
            </div>

            {recentPayments.length === 0 ? (
              <EmptyState
                icon={CreditCard}
                title="No payments recorded yet."
                description="Click '+ Record Payment' above to log resident maintenance fees."
              />
            ) : (
              <div className="space-y-3">
                {recentPayments.slice(0, 4).map((p) => (
                  <PaymentCard key={p.id} payment={p} />
                ))}
              </div>
            )}
          </div>

          {/* Latest Expenses */}
          <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl">
            <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-800/80">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <Receipt className="w-4 h-4 text-rose-400" />
                <span>Latest Expenses</span>
              </h3>
              <Link to="/admin/expenses" className="text-xs font-semibold text-rose-400 hover:text-rose-300">
                Manage Expenses →
              </Link>
            </div>

            {recentExpenses.length === 0 ? (
              <EmptyState
                icon={Receipt}
                title="No expenses recorded yet."
                description="Click '+ Add Expense' above to log utility and vendor invoices."
              />
            ) : (
              <div className="space-y-3">
                {recentExpenses.slice(0, 4).map((e) => (
                  <ExpenseCard key={e.id} expense={e} />
                ))}
              </div>
            )}
          </div>

        </div>

      </div>
    </AdminLayout>
  );
};

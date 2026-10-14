import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Building2, 
  Users, 
  CreditCard, 
  Receipt, 
  ArrowRight, 
  AlertCircle
} from 'lucide-react';
import { useMaintenanceData } from '../hooks/useMaintenanceData';
import { BalanceCard } from '../components/BalanceCard';
import { MemberCard } from '../components/MemberCard';
import { PaymentCard } from '../components/PaymentCard';
import { ExpenseCard } from '../components/ExpenseCard';
import { EmptyState } from '../components/EmptyState';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { APP_LOGO_URL } from '../constants/branding';

export const Home: React.FC = () => {
  const { 
    loading, 
    error, 
    settings, 
    summary, 
    members, 
    recentPayments, 
    recentExpenses, 
    refetch 
  } = useMaintenanceData();

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <LoadingSpinner message="Loading maintenance portal..." size="lg" />
      </div>
    );
  }

  const societyName = settings.society_name || 'Nani Villa Apartment';

  return (
    <div className="space-y-12 sm:space-y-16 pb-20">
      
      {/* Database connection banner if notice exists */}
      {error && (
        <div className="rounded-2xl p-4 bg-amber-950/40 border border-amber-800/60 text-amber-300 flex items-start space-x-3 text-sm backdrop-blur-xl">
          <AlertCircle className="w-5 h-5 shrink-0 text-amber-400 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold">Notice: Database Connection / Tables</p>
            <p className="text-amber-400/90 text-xs">{error}</p>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl border border-slate-800/80 bg-gradient-to-br from-slate-900/90 via-slate-900/70 to-indigo-950/30 backdrop-blur-2xl shadow-2xl shadow-black/50 p-6 sm:p-8 lg:p-10 transition-all duration-300">
        
        {/* Subtle decorative glowing mesh behind hero */}
        <div className="absolute -top-32 -left-32 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 -right-20 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          
          {/* Brand Logo & Name */}
          <div className="flex flex-col sm:flex-row items-center sm:items-center space-y-4 sm:space-y-0 sm:space-x-5 text-center sm:text-left">
            <div className="w-18 h-18 sm:w-22 sm:h-22 rounded-2xl bg-slate-900/90 border border-cyan-500/30 overflow-hidden flex items-center justify-center shadow-2xl shadow-indigo-500/20 shrink-0">
              <img
                src={APP_LOGO_URL}
                alt={societyName}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = 'none';
                  const fallback = e.currentTarget.parentElement?.querySelector('.fallback-icon');
                  if (fallback) fallback.classList.remove('hidden');
                }}
              />
              <div className="fallback-icon hidden w-full h-full bg-indigo-600/30 flex items-center justify-center text-indigo-400">
                <Building2 className="w-10 h-10" />
              </div>
            </div>

            <div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight">
                {societyName}
              </h1>
              <p className="text-base sm:text-lg text-cyan-200/90 font-medium mt-1 tracking-tight">
                Smart Maintenance. Complete Transparency.
              </p>
            </div>
          </div>

          {/* Quick Action Navigation Buttons */}
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
            <Link
              to="/members"
              className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-slate-100 hover:text-white bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700/80 transition-all inline-flex items-center space-x-2 shadow-lg shadow-black/20 hover:scale-102"
            >
              <Users className="w-4 h-4 text-cyan-400" />
              <span>Members Directory</span>
            </Link>

            <Link
              to="/payments"
              className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-slate-100 hover:text-white bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700/80 transition-all inline-flex items-center space-x-2 shadow-lg shadow-black/20 hover:scale-102"
            >
              <CreditCard className="w-4 h-4 text-emerald-400" />
              <span>Payment Records</span>
            </Link>

            <Link
              to="/expenses"
              className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-slate-100 hover:text-white bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700/80 transition-all inline-flex items-center space-x-2 shadow-lg shadow-black/20 hover:scale-102"
            >
              <Receipt className="w-4 h-4 text-rose-400" />
              <span>Expenses Ledger</span>
            </Link>
          </div>

        </div>
      </section>

      {/* Current Maintenance Balance Card (3D Tilt Glass Card) */}
      <section className="relative">
        <BalanceCard
          balance={summary.current_balance}
          initialBalance={summary.initial_balance}
          totalCollected={summary.total_collected}
          totalExpenses={summary.total_expenses}
          societyName={societyName}
          onRefresh={refetch}
        />
      </section>

      {/* Recent Activity: Collections & Expenses */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
        
        {/* Recent Maintenance Collections */}
        <div className="rounded-3xl p-6 sm:p-7 bg-gradient-to-br from-slate-900/70 to-slate-900/40 border border-slate-800/80 backdrop-blur-xl shadow-xl shadow-black/40 flex flex-col justify-between hover:border-slate-700/80 transition-all">
          <div>
            <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-800/80">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-md shadow-emerald-950/40">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white">Recent Collections</h3>
                  <p className="text-xs text-slate-400">Latest flat maintenance contributions</p>
                </div>
              </div>

              <Link
                to="/payments"
                className="inline-flex items-center space-x-1 text-xs font-bold text-cyan-400 hover:text-cyan-300 transition-colors group"
              >
                <span>View all</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>

            {recentPayments.length === 0 ? (
              <EmptyState
                icon={CreditCard}
                title="No collections recorded yet."
                description="Verified maintenance payments will show here once added."
              />
            ) : (
              <div className="space-y-3">
                {recentPayments.slice(0, 5).map((payment) => (
                  <PaymentCard key={payment.id} payment={payment} />
                ))}
              </div>
            )}
          </div>

          {recentPayments.length > 5 && (
            <div className="pt-4 text-center">
              <Link
                to="/payments"
                className="text-xs font-semibold text-slate-400 hover:text-white transition-colors"
              >
                +{recentPayments.length - 5} more records in full payment ledger →
              </Link>
            </div>
          )}
        </div>

        {/* Recent Maintenance Expenses */}
        <div className="rounded-3xl p-6 sm:p-7 bg-gradient-to-br from-slate-900/70 to-slate-900/40 border border-slate-800/80 backdrop-blur-xl shadow-xl shadow-black/40 flex flex-col justify-between hover:border-slate-700/80 transition-all">
          <div>
            <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-800/80">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-xl bg-rose-500/15 text-rose-400 border border-rose-500/30 shadow-md shadow-rose-950/40">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white">Recent Expenses</h3>
                  <p className="text-xs text-slate-400">Society maintenance disbursements</p>
                </div>
              </div>

              <Link
                to="/expenses"
                className="inline-flex items-center space-x-1 text-xs font-bold text-cyan-400 hover:text-cyan-300 transition-colors group"
              >
                <span>View all</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>

            {recentExpenses.length === 0 ? (
              <EmptyState
                icon={Receipt}
                title="No expenses recorded yet."
                description="Disbursements for electricity, repairs, and servicing will appear here once recorded."
              />
            ) : (
              <div className="space-y-3">
                {recentExpenses.slice(0, 5).map((expense) => (
                  <ExpenseCard key={expense.id} expense={expense} />
                ))}
              </div>
            )}
          </div>

          {recentExpenses.length > 5 && (
            <div className="pt-4 text-center">
              <Link
                to="/expenses"
                className="text-xs font-semibold text-slate-400 hover:text-white transition-colors"
              >
                +{recentExpenses.length - 5} more expense records in full ledger →
              </Link>
            </div>
          )}
        </div>

      </section>

      {/* Resident Members Preview */}
      <section className="rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-slate-900/50 via-slate-900/30 to-slate-950/40 border border-slate-800/80 backdrop-blur-xl space-y-6 shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
          <div>
            <h3 className="text-lg sm:text-xl font-bold text-white flex items-center space-x-2">
              <Users className="w-5 h-5 text-cyan-400" />
              <span>Resident Members</span>
            </h3>
            <p className="text-xs sm:text-sm text-slate-400">
              Clearance status of flat maintenance contributions
            </p>
          </div>

          <Link
            to="/members"
            className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-all shadow-sm"
          >
            <span>Full Member Directory</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {members.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No resident flats registered yet."
            description="Flat members will be displayed here once registered by the administrator."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {members.slice(0, 6).map((member) => (
              <MemberCard key={member.id} member={member} />
            ))}
          </div>
        )}
      </section>

    </div>
  );
};

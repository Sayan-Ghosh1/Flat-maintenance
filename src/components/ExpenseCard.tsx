import React from 'react';
import { Tag, Calendar, CreditCard, Hash } from 'lucide-react';
import { formatCurrency, formatDate } from '../lib/formatters';
import type { Expense } from '../types/database';

interface ExpenseCardProps {
  expense: Expense;
}

export const ExpenseCard: React.FC<ExpenseCardProps> = ({ expense }) => {
  const getCategoryColor = (category: string) => {
    switch (category.toLowerCase()) {
      case 'electricity':
        return 'text-amber-400 bg-amber-950/40 border-amber-800/40';
      case 'water':
        return 'text-cyan-400 bg-cyan-950/40 border-cyan-800/40';
      case 'security':
        return 'text-indigo-400 bg-indigo-950/40 border-indigo-800/40';
      case 'cleaning':
      case 'maid':
        return 'text-emerald-400 bg-emerald-950/40 border-emerald-800/40';
      case 'lift':
      case 'repair':
      case 'plumbing':
        return 'text-orange-400 bg-orange-950/40 border-orange-800/40';
      default:
        return 'text-slate-300 bg-slate-800 border-slate-700';
    }
  };

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl shadow-md transition-all hover:border-slate-700/80">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center space-x-2 flex-wrap gap-y-1">
            <span
              className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-2xs font-semibold uppercase tracking-wider border ${getCategoryColor(
                expense.category
              )}`}
            >
              <Tag className="w-3 h-3" />
              <span>{expense.category}</span>
            </span>
            <span className="text-xs text-slate-400">
              {formatDate(expense.expense_date)}
            </span>
          </div>

          <h4 className="text-sm sm:text-base font-semibold text-white pt-1">
            {expense.title}
          </h4>

          {expense.description && (
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-xl">
              {expense.description}
            </p>
          )}
        </div>

        <div className="text-right pl-4">
          <span className="text-base sm:text-lg font-bold text-rose-400 block whitespace-nowrap">
            −{formatCurrency(expense.amount)}
          </span>
          {expense.payment_method && (
            <span className="text-2xs text-slate-400 block font-medium">
              via {expense.payment_method}
            </span>
          )}
        </div>
      </div>

      {expense.reference_number && (
        <div className="mt-3 pt-2 border-t border-slate-800/60 flex items-center space-x-1 font-mono text-2xs text-slate-400">
          <Hash className="w-3 h-3 text-slate-400" />
          <span>Voucher/Bill: {expense.reference_number}</span>
        </div>
      )}
    </div>
  );
};

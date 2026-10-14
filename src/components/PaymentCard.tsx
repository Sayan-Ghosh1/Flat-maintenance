import React from 'react';
import { Calendar, CreditCard, User, Hash } from 'lucide-react';
import { formatCurrency, formatDate, getMonthName } from '../lib/formatters';
import type { Payment } from '../types/database';

interface PaymentCardProps {
  payment: Payment;
}

export const PaymentCard: React.FC<PaymentCardProps> = ({ payment }) => {
  let periodLabel = '';
  if (payment.start_month && payment.end_month && payment.start_year && payment.end_year) {
    if (payment.start_month === payment.end_month && payment.start_year === payment.end_year) {
      periodLabel = `${getMonthName(payment.start_month)} ${payment.start_year}`;
    } else {
      const count = (payment.end_year * 12 + payment.end_month) - (payment.start_year * 12 + payment.start_month) + 1;
      periodLabel = `${getMonthName(payment.start_month)} ${payment.start_year} – ${getMonthName(payment.end_month)} ${payment.end_year} (${count} mos)`;
    }
  } else if (payment.payment_month && payment.payment_year) {
    const rate = payment.member?.monthly_amount || 160;
    const inferred = (rate > 0 && payment.payment_type !== 'Annual' && payment.amount >= rate * 1.5)
      ? Math.round(payment.amount / rate)
      : 1;
    if (inferred > 1) {
      const endIdx = payment.payment_year * 12 + payment.payment_month;
      const startIdx = endIdx - inferred + 1;
      const sY = Math.floor((startIdx - 1) / 12);
      const sM = ((startIdx - 1) % 12) + 1;
      periodLabel = `${getMonthName(sM)} ${sY} – ${getMonthName(payment.payment_month)} ${payment.payment_year} (${inferred} mos)`;
    } else {
      periodLabel = `${getMonthName(payment.payment_month)} ${payment.payment_year}`;
    }
  }

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl shadow-md transition-all hover:border-slate-700/80">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-xs">
            {payment.member?.flat_number || 'Flat'}
          </div>
          <div>
            <h4 className="text-sm sm:text-base font-semibold text-white">
              {payment.member?.full_name || 'Member'}
            </h4>
            <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-400 mt-0.5">
              <span>{formatDate(payment.payment_date)}</span>
              <span>•</span>
              <span className="text-slate-300 font-medium">{payment.payment_method}</span>
              {periodLabel && (
                <>
                  <span>•</span>
                  <span className="text-indigo-300 font-medium bg-indigo-950/60 px-1.5 py-0.5 rounded text-3xs border border-indigo-800/40">
                    {periodLabel}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="text-right">
          <span className="text-base sm:text-lg font-bold text-emerald-400 block font-mono">
            +{formatCurrency(payment.amount)}
          </span>
          <span className="inline-block text-2xs uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
            {payment.payment_type}
          </span>
        </div>
      </div>

      {(payment.transaction_reference || payment.notes) && (
        <div className="mt-3 pt-2.5 border-t border-slate-800/60 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
          {payment.transaction_reference && (
            <span className="flex items-center space-x-1 font-mono text-2xs text-slate-400">
              <Hash className="w-3 h-3" />
              <span>Ref: {payment.transaction_reference}</span>
            </span>
          )}
          {payment.notes && (
            <span className="text-slate-400 italic text-2xs truncate max-w-xs">
              "{payment.notes}"
            </span>
          )}
        </div>
      )}
    </div>
  );
};

import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, ArrowUpRight } from 'lucide-react';
import { formatCurrency } from '../lib/formatters';
import type { Member } from '../types/database';

interface MemberCardProps {
  member: Member;
}

export const MemberCard: React.FC<MemberCardProps> = ({ member }) => {
  return (
    <Link
      to={`/members/${member.id}`}
      className="group relative block p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-slate-900/80 via-slate-900/60 to-slate-950/90 hover:from-slate-800/80 hover:to-indigo-950/40 border border-slate-800/80 hover:border-cyan-500/40 backdrop-blur-xl shadow-lg hover:shadow-2xl hover:shadow-cyan-950/30 transition-all duration-300 hover:-translate-y-1 active:scale-[0.99] overflow-hidden"
    >
      {/* Soft hover glow top-right */}
      <div className="absolute -top-12 -right-12 w-28 h-28 bg-cyan-500/10 rounded-full blur-xl group-hover:bg-cyan-500/20 transition-all pointer-events-none" />

      <div className="relative z-10">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500/20 to-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-black flex items-center justify-center text-sm font-mono tracking-tight group-hover:scale-105 group-hover:border-cyan-400/50 transition-all shadow-md">
              {member.flat_number}
            </div>
            <div>
              <h4 className="text-base font-bold text-white group-hover:text-cyan-200 transition-colors">
                {member.full_name}
              </h4>
              <div className="flex items-center space-x-2 text-xs text-slate-400 mt-0.5">
                {member.building && <span>Building {member.building} •</span>}
                <span className="capitalize">{member.status}</span>
                {member.monthly_amount > 0 && (
                  <span className="font-mono text-3xs text-indigo-300">
                    • {formatCurrency(member.monthly_amount)}/mo
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="p-1.5 rounded-xl bg-slate-800/60 border border-slate-700/60 text-slate-400 group-hover:text-cyan-300 group-hover:border-cyan-500/40 group-hover:translate-x-0.5 transition-all">
            <ArrowUpRight className="w-4 h-4" />
          </div>
        </div>

        {/* 3 Metrics Mini Grid */}
        <div className="mt-5 grid grid-cols-3 gap-2 py-3 px-3.5 rounded-xl bg-slate-950/70 border border-slate-800/70 text-center">
          <div>
            <span className="block text-3xs uppercase tracking-wider font-semibold text-slate-400">Total Paid</span>
            <span className="text-xs sm:text-sm font-bold text-emerald-400 font-mono">
              {formatCurrency(member.total_paid || 0)}
            </span>
          </div>
          <div>
            <span className="block text-3xs uppercase tracking-wider font-semibold text-slate-400">This Year</span>
            <span className="text-xs sm:text-sm font-semibold text-slate-200 font-mono">
              {formatCurrency(member.current_year_paid || 0)}
            </span>
          </div>
          <div>
            <span className="block text-3xs uppercase tracking-wider font-semibold text-slate-400">This Month</span>
            <span className="text-xs sm:text-sm font-semibold text-cyan-300 font-mono">
              {formatCurrency(member.current_month_paid || 0)}
            </span>
          </div>
        </div>

        {/* Clearance Ledger Status Bar without unwanted advance badges */}
        <div className="mt-3.5 flex items-center justify-between text-xs text-slate-400 px-1 pt-2 border-t border-slate-800/60">
          <div className="flex items-center space-x-1.5 truncate">
            <Calendar className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span className="truncate text-slate-300 font-medium text-xs">
              {member.clearance_summary?.paidThroughText || 'No payments recorded'}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
};

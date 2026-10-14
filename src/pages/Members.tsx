import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Users, Search, Building, ArrowUpDown, ChevronRight, Calendar, Filter, ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react';
import { useMaintenanceData } from '../hooks/useMaintenanceData';
import { MemberCard } from '../components/MemberCard';
import { EmptyState } from '../components/EmptyState';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { formatCurrency, formatDate } from '../lib/formatters';

export const Members: React.FC = () => {
  const { loading, members } = useMaintenanceData();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBuilding, setSelectedBuilding] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'flat' | 'name' | 'totalPaid'>('flat');

  // Extract unique buildings
  const buildings = useMemo(() => {
    const list = new Set<string>();
    members.forEach((m) => {
      if (m.building) list.add(m.building);
    });
    return Array.from(list).sort();
  }, [members]);

  // Filter & sort
  const filteredMembers = useMemo(() => {
    return members
      .filter((m) => {
        const matchesSearch =
          m.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          m.flat_number.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesBuilding =
          selectedBuilding === 'all' || m.building === selectedBuilding;
        return matchesSearch && matchesBuilding;
      })
      .sort((a, b) => {
        if (sortBy === 'flat') {
          return a.flat_number.localeCompare(b.flat_number, undefined, { numeric: true });
        }
        if (sortBy === 'name') {
          return a.full_name.localeCompare(b.full_name);
        }
        if (sortBy === 'totalPaid') {
          return (b.total_paid || 0) - (a.total_paid || 0);
        }
        return 0;
      });
  }, [members, searchTerm, selectedBuilding, sortBy]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <LoadingSpinner message="Loading member directory..." />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-16">
      
      {/* Page Header */}
      <div className="space-y-2">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-semibold text-indigo-400 bg-indigo-950/50 border border-indigo-800/40">
          <Users className="w-3.5 h-3.5" />
          <span>Resident Roster</span>
        </div>
        <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
          Member Directory &amp; Ledger
        </h1>
        <p className="text-sm text-slate-400 max-w-2xl">
          Complete transparent directory of flat owners and residents. Click on any member to inspect individual payment receipts.
        </p>
      </div>

      {/* Filters & Search Control Bar */}
      <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by flat number (e.g. A-101) or resident name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
          />
        </div>

        {/* Filters and Sorters */}
        <div className="flex items-center space-x-3 overflow-x-auto pb-1 md:pb-0">
          {/* Building filter */}
          {buildings.length > 0 && (
            <div className="flex items-center space-x-2 shrink-0">
              <span className="text-xs text-slate-400 hidden sm:inline">Building:</span>
              <select
                value={selectedBuilding}
                onChange={(e) => setSelectedBuilding(e.target.value)}
                className="px-3 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-xs font-medium text-slate-300 focus:outline-none focus:border-indigo-500"
              >
                <option value="all">All Buildings</option>
                {buildings.map((b) => (
                  <option key={b} value={b}>
                    Building {b}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Sort selector */}
          <div className="flex items-center space-x-2 shrink-0">
            <span className="text-xs text-slate-400 hidden sm:inline">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'flat' | 'name' | 'totalPaid')}
              className="px-3 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-xs font-medium text-slate-300 focus:outline-none focus:border-indigo-500"
            >
              <option value="flat">Flat Number</option>
              <option value="name">Resident Name</option>
              <option value="totalPaid">Highest Paid</option>
            </select>
          </div>
        </div>

      </div>

      {/* Main Content: Desktop Table vs Mobile Cards */}
      {filteredMembers.length === 0 ? (
        <EmptyState
          icon={Users}
          title={members.length === 0 ? "No members added yet." : "No matching members found."}
          description={
            members.length === 0
              ? "The administrator has not added any flat members yet."
              : "Try adjusting your search query or building filter."
          }
        />
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-hidden rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800/80 bg-slate-950/50 text-2xs font-semibold uppercase tracking-wider text-slate-400">
                    <th className="py-4 px-6">Flat</th>
                    <th className="py-4 px-6">Member</th>
                    <th className="py-4 px-6 text-right">Total Paid</th>
                    <th className="py-4 px-6 text-right">This Year</th>
                    <th className="py-4 px-6 text-right">This Month</th>
                    <th className="py-4 px-6">Last Payment</th>
                    <th className="py-4 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-sm">
                  {filteredMembers.map((member) => (
                    <tr
                      key={member.id}
                      className="hover:bg-slate-800/40 transition-colors group cursor-pointer"
                      onClick={() => navigate(`/members/${member.id}`)}
                    >
                      <td className="py-4 px-6 font-mono font-bold text-indigo-400 whitespace-nowrap">
                        <span className="px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                          {member.flat_number}
                        </span>
                        {member.building && (
                          <span className="text-2xs text-slate-400 font-sans ml-2">
                            Bldg {member.building}
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center space-x-2">
                          <Link
                            to={`/members/${member.id}`}
                            className="font-medium text-white group-hover:text-indigo-300 transition-colors"
                          >
                            {member.full_name}
                          </Link>
                        </div>
                        <div className="flex items-center space-x-2 mt-0.5 text-2xs text-slate-400">
                          <span>{member.clearance_summary?.paidThroughText || 'Not cleared yet'}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-right font-bold text-emerald-400 whitespace-nowrap">
                        {formatCurrency(member.total_paid || 0)}
                      </td>
                      <td className="py-4 px-6 text-right font-semibold text-slate-200 whitespace-nowrap">
                        {formatCurrency(member.current_year_paid || 0)}
                      </td>
                      <td className="py-4 px-6 text-right font-semibold text-indigo-300 whitespace-nowrap">
                        {formatCurrency(member.current_month_paid || 0)}
                      </td>
                      <td className="py-4 px-6 text-slate-300 whitespace-nowrap text-xs">
                        {member.last_payment_date ? formatDate(member.last_payment_date) : '—'}
                      </td>
                      <td className="py-4 px-4 text-center">
                        <Link
                          to={`/members/${member.id}`}
                          className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-medium text-indigo-300 bg-indigo-950/60 hover:bg-indigo-900/60 border border-indigo-800/40 transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span>Tracker</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Card View */}
          <div className="grid grid-cols-1 gap-4 md:hidden">
            {filteredMembers.map((member) => (
              <MemberCard key={member.id} member={member} />
            ))}
          </div>
        </>
      )}

    </div>
  );
};

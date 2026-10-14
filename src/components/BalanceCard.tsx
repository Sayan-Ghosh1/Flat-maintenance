import React, { useRef, useState, useEffect } from 'react';
import { Wallet, TrendingUp, TrendingDown, Building, RefreshCw, ShieldCheck, Sparkles } from 'lucide-react';
import { formatCurrency } from '../lib/formatters';

interface BalanceCardProps {
  balance: number;
  initialBalance: number;
  totalCollected: number;
  totalExpenses: number;
  societyName?: string;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export const BalanceCard: React.FC<BalanceCardProps> = ({
  balance,
  initialBalance,
  totalCollected,
  totalExpenses,
  societyName,
  onRefresh,
  isRefreshing = false,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [rotate, setRotate] = useState({ x: 0, y: 0 });
  const [glare, setGlare] = useState({ x: 50, y: 50, opacity: 0 });
  const [displayBalance, setDisplayBalance] = useState(balance);

  // Smooth counter transition when real database balance updates
  useEffect(() => {
    let startTimestamp: number | null = null;
    const startVal = displayBalance;
    const endVal = balance;
    const duration = 600; // ms

    if (startVal === endVal) return;

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayBalance(startVal + (endVal - startVal) * eased);
      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        setDisplayBalance(endVal);
      }
    };

    const animId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animId);
  }, [balance]);

  // Subtle 3D tilt on mouse movement with specular glare
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    // Constrain tilt to gentle 6 degrees max
    const rotateX = -((y - centerY) / centerY) * 5.5;
    const rotateY = ((x - centerX) / centerX) * 5.5;

    setRotate({ x: rotateX, y: rotateY });
    setGlare({
      x: (x / rect.width) * 100,
      y: (y / rect.height) * 100,
      opacity: 0.18,
    });
  };

  const handleMouseLeave = () => {
    setRotate({ x: 0, y: 0 });
    setGlare((prev) => ({ ...prev, opacity: 0 }));
  };

  const resolvedSocietyName = societyName || 'Nani Villa Apartment';

  return (
    <div
      style={{ perspective: '1200px' }}
      className="relative w-full transition-transform duration-300"
    >
      <div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          transform: `rotateX(${rotate.x}deg) rotateY(${rotate.y}deg)`,
          transformStyle: 'preserve-3d',
          transition: 'transform 0.18s cubic-bezier(0.2, 0, 0, 1), box-shadow 0.25s ease',
        }}
        className="relative overflow-hidden rounded-3xl p-6 sm:p-10 bg-gradient-to-br from-slate-900/90 via-slate-900/70 to-indigo-950/60 border border-indigo-500/30 shadow-2xl shadow-indigo-950/60 backdrop-blur-2xl group"
      >
        {/* Dynamic Specular Glare following mouse */}
        <div
          className="absolute inset-0 pointer-events-none transition-opacity duration-300"
          style={{
            background: `radial-gradient(circle 350px at ${glare.x}% ${glare.y}%, rgba(255,255,255,${glare.opacity}), transparent 75%)`,
          }}
        />

        {/* Ambient atmospheric glows */}
        <div className="absolute -top-32 -right-32 w-80 h-80 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-48 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

        {/* Animated glowing border stroke */}
        <div className="absolute inset-0 rounded-3xl border border-indigo-400/20 pointer-events-none group-hover:border-indigo-400/40 transition-colors duration-300" />

        <div className="relative z-10 flex flex-col space-y-7 sm:space-y-8">
          
          {/* Header Row: Live Treasury & Fund title */}
          <div className="flex items-start sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-3.5">
              <div className="w-11 h-11 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-cyan-300 shadow-lg shadow-indigo-500/20">
                <Wallet className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-3xs font-black tracking-widest text-emerald-400 uppercase">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>LIVE TREASURY</span>
                  </span>
                </div>
                <h2 className="text-sm sm:text-base font-bold text-slate-200 mt-1">
                  {resolvedSocietyName} Maintenance Fund
                </h2>
              </div>
            </div>

            <div className="flex items-center space-x-2 shrink-0">
              {onRefresh && (
                <button
                  type="button"
                  onClick={onRefresh}
                  disabled={isRefreshing}
                  title="Sync latest live ledger"
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-300 hover:text-white transition-all text-xs font-semibold disabled:opacity-50 shadow-sm"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-cyan-400' : 'text-slate-400'}`} />
                  <span className="hidden sm:inline">Sync</span>
                </button>
              )}
            </div>
          </div>

          {/* Current Maintenance Balance Headline */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-xs sm:text-sm font-bold uppercase tracking-widest text-indigo-300">
                CURRENT MAINTENANCE BALANCE
              </span>
            </div>
            
            <div className="flex items-baseline space-x-3 sm:space-x-4 flex-wrap">
              <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-cyan-200 drop-shadow-lg font-mono">
                {formatCurrency(displayBalance)}
              </h1>
            </div>
          </div>

          {/* 3 Pillars: Initial Balance, Total Collections, Total Expenses */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 pt-5 border-t border-slate-800/80">
            
            {/* Initial Balance */}
            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/90 backdrop-blur-md hover:border-slate-700 transition-colors shadow-inner">
              <div className="flex items-center space-x-2 text-slate-400 mb-1.5">
                <Building className="w-4 h-4 text-slate-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Initial Balance
                </span>
              </div>
              <p className="text-xl sm:text-2xl font-black text-slate-100 font-mono">
                {formatCurrency(initialBalance)}
              </p>
              <span className="text-3xs text-slate-400 font-medium mt-0.5 block">
                Baseline corpus before tracker
              </span>
            </div>

            {/* Total Collections */}
            <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 backdrop-blur-md hover:border-emerald-500/50 transition-colors shadow-inner">
              <div className="flex items-center space-x-2 text-emerald-400 mb-1.5">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-300">
                  Total Collections
                </span>
              </div>
              <p className="text-xl sm:text-2xl font-black text-emerald-300 font-mono">
                +{formatCurrency(totalCollected)}
              </p>
              <span className="text-3xs text-emerald-400/80 font-medium mt-0.5 block">
                Cumulative member maintenance
              </span>
            </div>

            {/* Total Expenses */}
            <div className="p-4 rounded-2xl bg-rose-950/30 border border-rose-500/30 backdrop-blur-md hover:border-rose-500/50 transition-colors shadow-inner">
              <div className="flex items-center space-x-2 text-rose-400 mb-1.5">
                <TrendingDown className="w-4 h-4 text-rose-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-rose-300">
                  Total Expenses
                </span>
              </div>
              <p className="text-xl sm:text-2xl font-black text-rose-300 font-mono">
                −{formatCurrency(totalExpenses)}
              </p>
              <span className="text-3xs text-rose-400/80 font-medium mt-0.5 block">
                Utilities, repairs &amp; vendor bills
              </span>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
};

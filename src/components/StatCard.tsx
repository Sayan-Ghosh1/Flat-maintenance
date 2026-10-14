import React, { useState, useRef } from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  variant?: 'default' | 'emerald' | 'indigo' | 'rose' | 'amber' | 'violet';
  trend?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = 'default',
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  const variantStyles = {
    default: {
      border: 'border-slate-800/80 hover:border-slate-700',
      bg: 'bg-slate-900/60 hover:bg-slate-900/80',
      glow: 'from-slate-500/10 to-transparent',
      iconBg: 'bg-slate-800/80 text-slate-200 border-slate-700/60',
      value: 'text-white',
      accent: 'text-slate-400',
    },
    indigo: {
      border: 'border-cyan-500/25 hover:border-cyan-400/50',
      bg: 'bg-slate-900/70 hover:bg-slate-900/90',
      glow: 'from-cyan-500/15 via-indigo-500/10 to-transparent',
      iconBg: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30 shadow-cyan-500/20',
      value: 'text-cyan-200',
      accent: 'text-cyan-400',
    },
    emerald: {
      border: 'border-emerald-500/25 hover:border-emerald-400/50',
      bg: 'bg-slate-900/70 hover:bg-slate-900/90',
      glow: 'from-emerald-500/15 via-emerald-600/10 to-transparent',
      iconBg: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 shadow-emerald-500/20',
      value: 'text-emerald-300',
      accent: 'text-emerald-400',
    },
    rose: {
      border: 'border-rose-500/25 hover:border-rose-400/50',
      bg: 'bg-slate-900/70 hover:bg-slate-900/90',
      glow: 'from-rose-500/15 via-rose-600/10 to-transparent',
      iconBg: 'bg-rose-500/15 text-rose-300 border-rose-500/30 shadow-rose-500/20',
      value: 'text-rose-300',
      accent: 'text-rose-400',
    },
    amber: {
      border: 'border-amber-500/25 hover:border-amber-400/50',
      bg: 'bg-slate-900/70 hover:bg-slate-900/90',
      glow: 'from-amber-500/15 via-amber-600/10 to-transparent',
      iconBg: 'bg-amber-500/15 text-amber-300 border-amber-500/30 shadow-amber-500/20',
      value: 'text-amber-300',
      accent: 'text-amber-400',
    },
    violet: {
      border: 'border-purple-500/25 hover:border-purple-400/50',
      bg: 'bg-slate-900/70 hover:bg-slate-900/90',
      glow: 'from-purple-500/15 via-violet-600/10 to-transparent',
      iconBg: 'bg-purple-500/15 text-purple-300 border-purple-500/30 shadow-purple-500/20',
      value: 'text-purple-300',
      accent: 'text-purple-400',
    },
  };

  const currentStyle = variantStyles[variant];

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const rotateX = -((y - rect.height / 2) / (rect.height / 2)) * 6;
    const rotateY = ((x - rect.width / 2) / (rect.width / 2)) * 6;
    setTilt({ x: rotateX, y: rotateY });
  };

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0 });
  };

  return (
    <div style={{ perspective: '800px' }} className="w-full">
      <div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) translateZ(0px)`,
          transition: 'transform 0.15s ease-out, box-shadow 0.25s ease',
        }}
        className={`relative overflow-hidden rounded-2xl p-5 sm:p-6 border ${currentStyle.border} ${currentStyle.bg} backdrop-blur-xl shadow-xl transition-all duration-300 group hover:-translate-y-1 hover:shadow-2xl`}
      >
        {/* Soft background radial gradient glow */}
        <div
          className={`absolute -top-12 -right-12 w-36 h-36 bg-gradient-to-br ${currentStyle.glow} rounded-full blur-2xl pointer-events-none group-hover:scale-125 transition-transform duration-500`}
        />

        <div className="relative z-10">
          <div className="flex items-center justify-between mb-3.5">
            <span className="text-2xs sm:text-xs font-bold tracking-wider uppercase text-slate-400">
              {title}
            </span>
            <div className={`p-2.5 rounded-xl border ${currentStyle.iconBg} shadow-sm group-hover:scale-110 transition-transform duration-200`}>
              <Icon className="w-4 h-4" />
            </div>
          </div>

          <div className="space-y-1">
            <p className={`text-2xl sm:text-3xl font-black tracking-tight ${currentStyle.value} font-mono`}>
              {value}
            </p>
            {subtitle && (
              <p className="text-xs text-slate-400/90 font-medium line-clamp-1">
                {subtitle}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

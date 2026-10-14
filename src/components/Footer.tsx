import React from 'react';
import { Link } from 'react-router-dom';
import { Building2 } from 'lucide-react';
import { APP_LOGO_URL } from '../constants/branding';

interface FooterProps {
  societyName?: string;
  address?: string;
}

export const Footer: React.FC<FooterProps> = ({ 
  societyName = 'Nani Villa Apartment',
  address
}) => {
  return (
    <footer className="w-full relative z-10 border-t border-slate-800/80 bg-slate-950/80 backdrop-blur-xl text-slate-400 mt-16 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-6">
          
          {/* Brand & Address */}
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-700/60 overflow-hidden flex items-center justify-center text-indigo-400 shrink-0 shadow-md shadow-black/40">
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
                <Building2 className="w-5 h-5" />
              </div>
            </div>
            <div>
              <p className="text-sm font-bold text-white tracking-tight">
                {societyName}
              </p>
              {address && (
                <p className="text-xs text-slate-400">
                  {address}
                </p>
              )}
            </div>
          </div>

          {/* Quick Nav Links */}
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs sm:text-sm text-slate-300">
            <Link to="/" className="hover:text-cyan-400 transition-colors">
              Home
            </Link>
            <Link to="/members" className="hover:text-cyan-400 transition-colors">
              Members
            </Link>
            <Link to="/payments" className="hover:text-cyan-400 transition-colors">
              Payments
            </Link>
            <Link to="/expenses" className="hover:text-cyan-400 transition-colors">
              Expenses
            </Link>
            <Link to="/admin/login" className="hover:text-indigo-400 font-medium transition-colors">
              Admin Portal
            </Link>
          </div>

          {/* Copyright */}
          <div className="text-xs text-slate-400 text-center sm:text-right">
            © {new Date().getFullYear()} {societyName}
          </div>

        </div>
      </div>
    </footer>
  );
};

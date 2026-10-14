import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Building2, Users, Receipt, CreditCard, Shield, Menu, X, LogOut, LayoutDashboard } from 'lucide-react';
import { APP_LOGO_URL } from '../constants/branding';
import { useAuth } from '../hooks/useAuth';

interface NavbarProps {
  societyName?: string;
}

export const Navbar: React.FC<NavbarProps> = ({ societyName = 'Nani Villa Apartment' }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const location = useLocation();
  const { isAdmin, user, signOut } = useAuth();

  // Scroll detection for compact navbar and progress indicator
  useEffect(() => {
    const handleScroll = () => {
      const currentScroll = window.scrollY;
      setIsScrolled(currentScroll > 20);

      const winHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      if (winHeight > 0) {
        setScrollProgress((currentScroll / winHeight) * 100);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { label: 'Overview', path: '/', icon: Building2 },
    { label: 'Members', path: '/members', icon: Users },
    { label: 'Payments', path: '/payments', icon: CreditCard },
    { label: 'Expenses', path: '/expenses', icon: Receipt },
  ];

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <header
      className={`sticky top-0 z-50 w-full backdrop-blur-2xl transition-all duration-300 border-b ${
        isScrolled
          ? 'bg-slate-950/90 border-slate-800/80 shadow-2xl shadow-indigo-950/40'
          : 'bg-slate-950/60 border-slate-800/40'
      }`}
    >
      {/* Scroll Progress Bar at very top */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-transparent">
        <div
          className="h-full bg-gradient-to-r from-indigo-500 via-cyan-400 to-emerald-400 transition-all duration-150 ease-out"
          style={{ width: `${scrollProgress}%` }}
        />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          className={`flex items-center justify-between transition-all duration-300 ${
            isScrolled ? 'h-16' : 'h-18 sm:h-20'
          }`}
        >
          {/* Logo & Society Brand */}
          <Link to="/" className="flex items-center space-x-3 group">
            <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-700/60 overflow-hidden flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-105 group-hover:border-cyan-400/50 transition-all shrink-0">
              <img
                src={APP_LOGO_URL}
                alt="Nani Villa Logo"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = 'none';
                  const fallback = e.currentTarget.parentElement?.querySelector('.fallback-icon');
                  if (fallback) fallback.classList.remove('hidden');
                }}
              />
              <div className="fallback-icon hidden w-full h-full bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 items-center justify-center text-white">
                <Building2 className="w-5 h-5" />
              </div>
            </div>
            <div>
              <span className="block text-base sm:text-lg font-black text-white tracking-tight leading-tight group-hover:text-cyan-200 transition-colors">
                {societyName}
              </span>
              <span className="block text-3xs font-bold text-slate-400 tracking-widest uppercase">
                Maintenance Portal
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1 lg:space-x-2">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const active = isActive(link.path);
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`relative inline-flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                    active
                      ? 'text-white bg-slate-800/90 shadow-sm border border-slate-700/80 shadow-cyan-500/5'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${active ? 'text-cyan-400' : 'text-slate-500'}`} />
                  <span>{link.label}</span>
                  {active && (
                    <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-4 h-0.5 rounded-full bg-cyan-400 shadow-sm shadow-cyan-400/50" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Admin Action Button (Desktop) */}
          <div className="hidden md:flex items-center space-x-3">
            {isAdmin ? (
              <div className="flex items-center space-x-2">
                <Link
                  to="/admin/dashboard"
                  className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 shadow-md shadow-indigo-600/25 border border-indigo-400/30 transition-all active:scale-95"
                >
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  <span>Admin Dashboard</span>
                </Link>
                <button
                  onClick={() => signOut()}
                  title="Sign out of Admin session"
                  className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-slate-900/80 border border-slate-800 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <Link
                to="/admin/login"
                className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800 transition-all shadow-sm"
              >
                <Shield className="w-3.5 h-3.5 text-slate-400" />
                <span>Admin Login</span>
              </Link>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center space-x-2">
            {isAdmin && (
              <Link
                to="/admin/dashboard"
                className="px-2.5 py-1 rounded-lg text-xs font-semibold text-white bg-indigo-600"
              >
                Admin
              </Link>
            )}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-900 focus:outline-none"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-slate-800 bg-slate-950/98 backdrop-blur-3xl px-4 pt-3 pb-6 space-y-2">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const active = isActive(link.path);
            return (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center space-x-3 px-4 py-3 rounded-xl text-base font-semibold transition-colors ${
                  active
                    ? 'text-white bg-indigo-600/20 text-cyan-300 border border-indigo-500/30'
                    : 'text-slate-300 hover:bg-slate-900'
                }`}
              >
                <Icon className={`w-5 h-5 ${active ? 'text-cyan-400' : 'text-slate-400'}`} />
                <span>{link.label}</span>
              </Link>
            );
          })}

          <div className="pt-3 border-t border-slate-800/80">
            {isAdmin ? (
              <div className="space-y-2">
                <Link
                  to="/admin/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center space-x-2 w-full py-2.5 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span>Admin Dashboard</span>
                </Link>
                <button
                  onClick={() => {
                    signOut();
                    setMobileMenuOpen(false);
                  }}
                  className="flex items-center justify-center space-x-2 w-full py-2.5 rounded-xl text-sm font-medium text-rose-400 hover:bg-rose-500/10 border border-rose-500/20"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            ) : (
              <Link
                to="/admin/login"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-center space-x-2 w-full py-2.5 rounded-xl text-sm font-bold text-slate-300 hover:text-white bg-slate-900 border border-slate-800"
              >
                <Shield className="w-4 h-4 text-slate-400" />
                <span>Admin Login</span>
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  CreditCard, 
  Receipt, 
  BarChart3, 
  Settings, 
  LogOut, 
  ExternalLink,
  Shield,
  Menu,
  X,
  Building2,
  ChevronRight,
  PlusCircle
} from 'lucide-react';
import { APP_LOGO_URL } from '../constants/branding';
import { useAuth } from '../hooks/useAuth';
import { ArchitecturalBackground } from './ArchitecturalBackground';

interface AdminLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  actionButton?: React.ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ 
  children, 
  title, 
  subtitle,
  actionButton 
}) => {
  const { user, adminRecord, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const adminNav = [
    { label: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
    { label: 'Members', path: '/admin/members', icon: Users },
    { label: 'Payments', path: '/admin/payments', icon: CreditCard },
    { label: 'Expenses', path: '/admin/expenses', icon: Receipt },
    { label: 'Reports', path: '/admin/reports', icon: BarChart3 },
    { label: 'Settings', path: '/admin/settings', icon: Settings },
  ];

  const handleSignOut = async () => {
    await signOut();
    navigate('/admin/login');
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row relative">
      <ArchitecturalBackground />
      
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 border-r border-slate-800/80 bg-slate-950/90 backdrop-blur-xl shrink-0 p-5 justify-between sticky top-0 h-screen">
        <div className="space-y-6">
          
          {/* Admin Brand */}
          <div className="flex items-center space-x-3 px-2">
            <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-700/60 overflow-hidden flex items-center justify-center text-white shadow-md shadow-indigo-500/20 shrink-0">
              <img
                src={APP_LOGO_URL}
                alt="Society Logo"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = 'none';
                  const fallback = e.currentTarget.parentElement?.querySelector('.fallback-icon');
                  if (fallback) fallback.classList.remove('hidden');
                }}
              />
              <div className="fallback-icon hidden w-full h-full bg-gradient-to-tr from-indigo-600 to-indigo-500 items-center justify-center text-white">
                <Shield className="w-5 h-5" />
              </div>
            </div>
            <div>
              <span className="block text-sm font-bold text-white tracking-tight">
                Society Admin
              </span>
              <span className="block text-2xs font-semibold text-emerald-400 uppercase tracking-widest">
                Authenticated
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            {adminNav.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    active
                      ? 'text-white bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Icon className={`w-4 h-4 ${active ? 'text-indigo-400' : 'text-slate-500'}`} />
                    <span>{item.label}</span>
                  </div>
                  {active && <ChevronRight className="w-3.5 h-3.5 text-indigo-400" />}
                </Link>
              );
            })}
          </nav>

          {/* Quick Action Shortcuts in Sidebar */}
          <div className="pt-4 mt-2 border-t border-slate-800/80 space-y-2">
            <span className="block px-2 text-3xs font-extrabold text-slate-400 uppercase tracking-widest">
              Direct Actions
            </span>
            <Link
              to="/admin/members?add=true"
              className="flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/40 shadow-sm transition-all hover:scale-101"
            >
              <PlusCircle className="w-4 h-4 text-indigo-400" />
              <span>+ Add Member</span>
            </Link>
            <Link
              to="/admin/payments?add=true"
              className="flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600/30 hover:bg-emerald-600/50 border border-emerald-500/40 shadow-sm transition-all hover:scale-101"
            >
              <PlusCircle className="w-4 h-4 text-emerald-400" />
              <span>+ Record Payment</span>
            </Link>
            <Link
              to="/admin/expenses?add=true"
              className="flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-bold text-white bg-rose-600/30 hover:bg-rose-600/50 border border-rose-500/40 shadow-sm transition-all hover:scale-101"
            >
              <PlusCircle className="w-4 h-4 text-rose-400" />
              <span>+ Add Expense</span>
            </Link>
          </div>
        </div>

        {/* User Card & Foot Actions */}
        <div className="space-y-3 pt-6 border-t border-slate-800/80">
          <div className="px-3 py-2 rounded-xl bg-slate-900/60 border border-slate-800/80">
            <span className="block text-2xs text-slate-400 font-semibold uppercase tracking-wider">
              Signed in as
            </span>
            <span className="block text-xs font-medium text-white truncate">
              {adminRecord?.name || user?.email || 'Administrator'}
            </span>
            <span className="block text-2xs text-indigo-400 truncate">
              {user?.email}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <Link
              to="/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 inline-flex items-center justify-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Public View</span>
            </Link>

            <button
              onClick={handleSignOut}
              title="Sign Out"
              className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 border border-slate-800 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

      </aside>

      {/* Mobile Top Header */}
      <div className="md:hidden sticky top-0 z-40 bg-slate-950/95 border-b border-slate-800 backdrop-blur-xl px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-700/60 overflow-hidden flex items-center justify-center text-white shrink-0">
            <img
              src={APP_LOGO_URL}
              alt="Society Logo"
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = 'none';
                const fallback = e.currentTarget.parentElement?.querySelector('.fallback-icon');
                if (fallback) fallback.classList.remove('hidden');
              }}
            />
            <div className="fallback-icon hidden w-full h-full bg-indigo-600 items-center justify-center text-white">
              <Shield className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span className="block text-sm font-bold text-white leading-tight">Admin Portal</span>
            <span className="block text-2xs text-slate-400">{user?.email}</span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Link
            to="/"
            className="p-2 rounded-lg bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
            title="Public Site"
          >
            <ExternalLink className="w-4 h-4" />
          </Link>
          <button
            onClick={() => setMobileNavOpen(!mobileNavOpen)}
            className="p-2 rounded-lg bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
          >
            {mobileNavOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileNavOpen && (
        <div className="md:hidden border-b border-slate-800 bg-slate-950 px-4 py-3 space-y-1">
          {adminNav.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileNavOpen(false)}
                className={`flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm font-medium ${
                  active
                    ? 'text-white bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                    : 'text-slate-300 hover:bg-slate-900'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
          
          {/* Mobile Quick Action Buttons */}
          <div className="pt-2 border-t border-slate-800 space-y-1.5">
            <span className="block px-3 text-3xs font-bold text-slate-400 uppercase tracking-widest">
              Direct Actions
            </span>
            <Link
              to="/admin/members?add=true"
              onClick={() => setMobileNavOpen(false)}
              className="flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600/30 border border-indigo-500/40"
            >
              <PlusCircle className="w-4 h-4 text-indigo-400" />
              <span>+ Add Member</span>
            </Link>
            <Link
              to="/admin/payments?add=true"
              onClick={() => setMobileNavOpen(false)}
              className="flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600/30 border border-emerald-500/40"
            >
              <PlusCircle className="w-4 h-4 text-emerald-400" />
              <span>+ Record Payment</span>
            </Link>
            <Link
              to="/admin/expenses?add=true"
              onClick={() => setMobileNavOpen(false)}
              className="flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-bold text-white bg-rose-600/30 border border-rose-500/40"
            >
              <PlusCircle className="w-4 h-4 text-rose-400" />
              <span>+ Add Expense</span>
            </Link>
          </div>

          <div className="pt-2 border-t border-slate-800">
            <button
              onClick={() => {
                setMobileNavOpen(false);
                handleSignOut();
              }}
              className="w-full flex items-center justify-center space-x-2 py-2 text-xs font-semibold text-rose-400 hover:bg-rose-950/20 rounded-lg"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Admin Content Body */}
      <main className="flex-1 min-w-0 p-4 sm:p-8 lg:p-10 max-w-7xl relative z-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-6 border-b border-slate-800/80">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {title}
            </h1>
            {subtitle && (
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                {subtitle}
              </p>
            )}
          </div>
          {actionButton && <div className="shrink-0">{actionButton}</div>}
        </div>

        {children}
      </main>

    </div>
  );
};

import React, { useState } from 'react';
import {
  RefreshCw,
  Search,
  Bell,
  ChevronLeft,
  ChevronDown,
  ExternalLink,
  LogOut,
  Calendar,
  Sparkles,
  Shield,
  Menu
} from 'lucide-react';
import BrandLogo from './BrandLogo';

export default function AdminTopBar({
  activeSection,
  setActiveSection = () => {},
  onRefresh,
  refreshing,
  onOpenMobileMenu = () => {},
  onSignOut,
  onOpenNotificationModal = () => {},
}) {
  const [dateRangeOpen, setDateRangeOpen] = useState(false);
  const [selectedRange, setSelectedRange] = useState('Jan 01 - Dec 31');
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  const navTabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'users', label: 'Users & Quotas' },
    { id: 'settings', label: 'Settings' },
  ];

  const handleBack = () => {
    if (activeSection !== 'overview') {
      setActiveSection('overview');
    } else if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = 'https://crm-amber-nine.vercel.app';
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-[#eef1f6]/95 backdrop-blur-md px-4 sm:px-8 pt-4 pb-3">
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-card px-4 sm:px-6 py-2.5 flex items-center justify-between gap-4">
        {/* Left: Brand & Pill Navigation (Zentra Style) */}
        <div className="flex items-center gap-4 lg:gap-6">
          <div className="flex items-center gap-2">
            <button
              onClick={handleBack}
              className="w-9 h-9 rounded-2xl flex items-center justify-center border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-all cursor-pointer shadow-2xs"
              title="Go back"
              aria-label="Go back"
            >
              <ChevronLeft size={17} />
            </button>

            <button
              onClick={onOpenMobileMenu}
              className="md:hidden w-9 h-9 rounded-2xl flex items-center justify-center border border-slate-200 bg-slate-50 text-slate-700"
            >
              <Menu size={18} />
            </button>

            <div className="flex items-center gap-2.5 pl-1">
              <BrandLogo size={30} />
              <div className="hidden sm:block">
                <span className="font-extrabold text-slate-900 text-sm tracking-tight">Travel-Trade</span>
                <span className="text-[10px] ml-1.5 px-2 py-0.5 rounded-full font-bold bg-slate-900 text-white uppercase tracking-wider">
                  Admin
                </span>
              </div>
            </div>
          </div>

          {/* Desktop Zentra-style Pill Navigation */}
          <nav className="hidden md:flex items-center bg-slate-100/90 p-1 rounded-full text-xs font-semibold">
            {navTabs.map((tab) => {
              const isActive = activeSection === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveSection(tab.id)}
                  className={`px-4 py-1.5 rounded-full transition-all cursor-pointer ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-sm font-bold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Center: Search Pill (Kristin Watson Style) */}
        <div className="hidden xl:flex items-center flex-1 max-w-xs relative">
          <Search size={14} className="absolute left-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search console, owners..."
            className="w-full pl-9 pr-4 py-1.5 text-xs rounded-full bg-slate-50 border border-slate-200/80 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-all text-slate-800 placeholder:text-slate-400"
          />
        </div>

        {/* Right: Actions, Date Filter & Profile Controls */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Zentra-style Date Range Pill */}
          <div className="hidden lg:relative lg:block">
            <button
              onClick={() => setDateRangeOpen(!dateRangeOpen)}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200/80 transition-colors shadow-2xs cursor-pointer"
            >
              <Calendar size={13} className="text-slate-500" />
              <span>{selectedRange}</span>
              <ChevronDown size={12} className="text-slate-400" />
            </button>

            {dateRangeOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-float border border-slate-200 p-2 z-50 text-xs">
                {['Jan 01 - Dec 31', 'Last 30 Days', 'This Quarter', 'All Time'].map((r) => (
                  <button
                    key={r}
                    onClick={() => {
                      setSelectedRange(r);
                      setDateRangeOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-xl transition-colors cursor-pointer ${
                      selectedRange === r ? 'bg-slate-100 font-bold text-slate-900' : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Send Notice Broadcast Button */}
          <button
            onClick={onOpenNotificationModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 transition-colors shadow-2xs cursor-pointer"
            title="Dispatch broadcast notification to Owner Dashboards"
          >
            <Bell size={13} className="text-amber-700" />
            <span className="hidden sm:inline">Send Notice</span>
          </button>

          {/* Refresh Telemetry */}
          <button
            onClick={onRefresh}
            className="w-8 h-8 rounded-full flex items-center justify-center border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors shadow-2xs cursor-pointer"
            title="Synchronize Live Metrics"
          >
            <RefreshCw size={13} className={refreshing ? 'animate-spin text-slate-900' : ''} />
          </button>

          {/* Open Sales App External Link */}
          <a
            href="https://crm-amber-nine.vercel.app"
            target="_blank"
            rel="noreferrer"
            className="hidden sm:flex items-center gap-1 text-xs font-bold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-full border border-slate-200 transition-colors"
          >
            <span>Sales CRM</span>
            <ExternalLink size={12} className="text-slate-500" />
          </a>

          {/* Profile Avatar Pill (Kristin Watson Style) */}
          <div className="relative">
            <button
              onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
              className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-full bg-slate-100 hover:bg-slate-200/80 border border-slate-200 transition-all cursor-pointer"
            >
              <div className="relative">
                <img
                  src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80"
                  alt="Admin Avatar"
                  className="w-7 h-7 rounded-full object-cover border border-white"
                />
                <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white" />
              </div>
              <span className="hidden md:inline text-xs font-bold text-slate-800">Admin</span>
              <ChevronDown size={12} className="text-slate-400" />
            </button>

            {profileDropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-float border border-slate-200 p-2 z-50 text-xs">
                <div className="p-2 border-b border-slate-100">
                  <div className="font-extrabold text-slate-900">Super Administrator</div>
                  <div className="text-[11px] text-slate-400 truncate">admin@travel-trade.com</div>
                </div>
                <div className="py-1">
                  <button
                    onClick={() => {
                      setActiveSection('settings');
                      setProfileDropdownOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-slate-700 hover:bg-slate-50 font-semibold"
                  >
                    Console Settings
                  </button>
                  <button
                    onClick={() => {
                      onOpenNotificationModal();
                      setProfileDropdownOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-slate-700 hover:bg-slate-50 font-semibold"
                  >
                    Broadcast Announcements
                  </button>
                </div>
                {onSignOut && (
                  <div className="pt-1 border-t border-slate-100">
                    <button
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        onSignOut();
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl text-rose-600 hover:bg-rose-50 font-bold flex items-center gap-1.5"
                    >
                      <LogOut size={13} />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Tab Navigation Bar */}
      <div className="md:hidden flex items-center gap-2 mt-2 px-1">
        {navTabs.map((tab) => {
          const isActive = activeSection === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSection(tab.id)}
              className={`flex-1 py-1.5 rounded-full text-xs font-bold transition-all ${
                isActive
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-white text-slate-600 border border-slate-200'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </header>
  );
}

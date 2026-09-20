import React, { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Crown,
  MessageSquare,
  Bell,
  SlidersHorizontal,
  LogOut,
  UserPlus,
  Sun,
  Moon,
  User as UserIcon,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import UserProfileModal from './UserProfileModal';
import PremiumPlanModal from './PremiumPlanModal';
import NotificationsPopover from './NotificationsPopover';
import TradeNotesModal from './TradeNotesModal';
import DashboardCustomizerModal from './DashboardCustomizerModal';

export default function TopBar({
  breadcrumb = 'Main Menu / Dashboard',
  onOpenStaffModal,
  onCustomizeWidget: customOnCustomize,
}) {
  const { profile, user, signOut, isOwner } = useAuth();
  const { theme, toggleTheme } = useTheme();

  // Interactive Modal States
  const [profileOpen, setProfileOpen] = useState(false);
  const [premiumOpen, setPremiumOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [customizerOpen, setCustomizerOpen] = useState(false);

  const parts = breadcrumb.split('/');
  const rootName = parts[0]?.trim() || 'Main Menu';
  const currentName = parts[1]?.trim() || 'Analytics';

  const displayName = profile?.name || profile?.full_name || user?.name || 'punia';
  const displayRole = isOwner ? 'admin' : (profile?.role || 'staff');
  const avatarUrl = profile?.avatar_url;
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <>
      <header className="sticky top-0 z-20 h-16 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 px-4 sm:px-6 lg:px-8 flex items-center justify-between transition-colors">
        {/* Left: Breadcrumbs & Navigation Controls */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <button
              onClick={() => window.history.back()}
              className="w-7 h-7 rounded-lg flex items-center justify-center border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
              aria-label="Go back"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              onClick={() => window.history.forward()}
              className="w-7 h-7 rounded-lg flex items-center justify-center border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
              aria-label="Go forward"
            >
              <ChevronRight size={14} />
            </button>
          </div>

          <div className="flex items-center gap-1.5 text-xs md:text-sm">
            <span className="text-slate-400 dark:text-slate-500 font-medium">{rootName}</span>
            <span className="text-slate-300 dark:text-slate-600">/</span>
            <span className="font-bold text-slate-900 dark:text-white">{currentName}</span>
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Interactive Crown Premium Access Pill */}
          <button
            onClick={() => setPremiumOpen(true)}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 hover:bg-amber-100/80 dark:hover:bg-amber-900/60 shadow-xs transition-all cursor-pointer group"
            title="Click to view Premium Trade License & Unlocked Features"
          >
            <Crown size={14} className="text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform" />
            <span>Premium Access</span>
          </button>

          {/* Action Buttons: Notes, Notifications, Dark Mode Toggle */}
          <div className="flex items-center gap-1">
            {/* Quick Trade Notes / Chat */}
            <button
              onClick={() => setNotesOpen(true)}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-white transition-colors cursor-pointer"
              title="Trade Notes & Internal Messages"
            >
              <MessageSquare size={16} />
            </button>

            {/* Notifications with relative popover */}
            <div className="relative">
              <button
                onClick={() => setNotifOpen(!notifOpen)}
                className={`relative w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                  notifOpen
                    ? 'bg-slate-100 dark:bg-slate-800 text-emerald-600 dark:text-emerald-400'
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-white'
                }`}
                title="Trade Notifications & Alerts"
              >
                <Bell size={16} />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-900 animate-pulse" />
              </button>

              <NotificationsPopover isOpen={notifOpen} onClose={() => setNotifOpen(false)} />
            </div>

            {/* Dark Mode / Light Mode Switcher */}
            <button
              onClick={toggleTheme}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-amber-500 dark:hover:text-amber-300 transition-colors cursor-pointer"
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? (
                <Sun size={16} className="text-amber-400 transition-transform rotate-0 hover:rotate-45" />
              ) : (
                <Moon size={16} className="text-slate-600 transition-transform -rotate-12 hover:rotate-0" />
              )}
            </button>
          </div>

          {/* Customize Widget Button */}
          <button
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750 shadow-xs transition-colors cursor-pointer"
            onClick={() => {
              if (customOnCustomize) customOnCustomize();
              setCustomizerOpen(true);
            }}
            title="Configure Dashboard Widgets & Preferences"
          >
            <SlidersHorizontal size={14} />
            <span>Customize Widget</span>
          </button>

          {/* Prominent + Add Staff Member Button */}
          {isOwner && (
            <button
              onClick={onOpenStaffModal}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs shadow-emerald-600/20 transition-all cursor-pointer shrink-0"
              title="Create and manage staff accounts"
            >
              <UserPlus size={14} />
              <span>+ Add Staff</span>
            </button>
          )}

          {/* User Profile Avatar & Signout with Panel Opener */}
          <div className="flex items-center gap-1.5 pl-2 sm:pl-3 border-l border-slate-200 dark:border-slate-800 shrink-0">
            {/* Interactive User Avatar / Details Trigger */}
            <button
              onClick={() => setProfileOpen(true)}
              className="flex items-center gap-2 p-1 sm:px-2 sm:py-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer group text-left"
              title={`View Profile & Activity: ${displayName} (${displayRole})`}
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-pink-600 to-rose-500 text-white flex items-center justify-center font-bold text-xs ring-2 ring-slate-100 dark:ring-slate-700 shadow-xs overflow-hidden">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
                ) : (
                  <span>{initials}</span>
                )}
              </div>
              <div className="hidden lg:block text-left">
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-tight group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                  {displayName}
                </div>
                <div className="text-[10px] text-slate-400 capitalize">
                  {displayRole}
                </div>
              </div>
            </button>

            {/* Quick Sign Out */}
            <button
              onClick={signOut}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
              title="Sign Out"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </header>

      {/* Modals */}
      <UserProfileModal isOpen={profileOpen} onClose={() => setProfileOpen(false)} />
      <PremiumPlanModal isOpen={premiumOpen} onClose={() => setPremiumOpen(false)} />
      <TradeNotesModal isOpen={notesOpen} onClose={() => setNotesOpen(false)} />
      <DashboardCustomizerModal
        isOpen={customizerOpen}
        onClose={() => setCustomizerOpen(false)}
      />
    </>
  );
}

import React, { useState } from 'react';
import BrandLogo from './BrandLogo';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { LogOut, UserPlus, Sun, Moon } from 'lucide-react';
import UserProfileModal from './UserProfileModal';

export default function MobileTopHeader({ companyName, onOpenStaffModal }) {
  const { profile, signOut, isOwner } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [profileOpen, setProfileOpen] = useState(false);

  return (
    <>
      <header className="md:hidden sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 px-4 py-2.5 shadow-xs transition-colors">
        <div className="flex items-center justify-between">
          {/* Brand & CRM Info */}
          <div className="flex items-center gap-2.5">
            <BrandLogo size={28} />
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-black text-slate-900 dark:text-white tracking-tight">
                  {companyName || 'Travel-Trade'}
                </span>
                <span
                  className={`text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded-full border ${
                    isOwner
                      ? 'bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                      : 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                  }`}
                >
                  {isOwner ? 'Owner' : 'Staff'}
                </span>
              </div>
              <div className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                Export & Commodity Trade CRM
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1.5">
            {/* Theme Switcher */}
            <button
              onClick={toggleTheme}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Toggle Light / Dark Mode"
            >
              {theme === 'dark' ? (
                <Sun size={15} className="text-amber-400" />
              ) : (
                <Moon size={15} className="text-slate-600" />
              )}
            </button>

            {isOwner && (
              <button
                onClick={onOpenStaffModal}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 text-xs font-bold hover:bg-emerald-100 transition-colors shadow-xs"
                title="Add New Staff Member"
              >
                <UserPlus size={13} className="text-emerald-700 dark:text-emerald-400" />
                <span>+ Staff</span>
              </button>
            )}

            {/* User Avatar with Profile Trigger */}
            <button
              onClick={() => setProfileOpen(true)}
              className="w-8 h-8 rounded-full bg-gradient-to-tr from-pink-600 to-rose-500 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-xs font-bold text-white overflow-hidden cursor-pointer"
              title="Open Profile Panel"
            >
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                (profile?.name || 'P').slice(0, 2).toUpperCase()
              )}
            </button>

            <button
              onClick={signOut}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
              title="Sign Out"
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </header>

      {/* User Profile Modal on Mobile */}
      <UserProfileModal isOpen={profileOpen} onClose={() => setProfileOpen(false)} />
    </>
  );
}

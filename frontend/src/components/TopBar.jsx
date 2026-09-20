import React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Crown,
  MessageSquare,
  Bell,
  SlidersHorizontal,
  LogOut,
  UserPlus,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function TopBar({ breadcrumb = 'Main Menu / Dashboard', onCustomizeWidget, onOpenStaffModal }) {
  const { profile, signOut, isOwner } = useAuth();

  const parts = breadcrumb.split('/');
  const rootName = parts[0]?.trim() || 'Main Menu';
  const currentName = parts[1]?.trim() || 'Analytics';

  return (
    <header className="sticky top-0 z-20 h-16 bg-white/80 backdrop-blur-md border-b border-slate-200/80 px-4 md:px-8 flex items-center justify-between">
      {/* Left: Breadcrumbs & Navigation Controls */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1">
          <button
            className="w-7 h-7 rounded-lg flex items-center justify-center border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors"
            aria-label="Go back"
          >
            <ChevronLeft size={14} />
          </button>
          <button
            className="w-7 h-7 rounded-lg flex items-center justify-center border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors"
            aria-label="Go forward"
          >
            <ChevronRight size={14} />
          </button>
        </div>

        <div className="flex items-center gap-1.5 text-xs md:text-sm">
          <span className="text-slate-400 font-medium">{rootName}</span>
          <span className="text-slate-300">/</span>
          <span className="font-bold text-slate-900">{currentName}</span>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 md:gap-3">
        {/* Crown Premium Access Pill */}
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 border border-amber-200 text-amber-800 shadow-sm">
          <Crown size={14} className="text-amber-600" />
          <span>Premium Access</span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1">
          <button
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
            title="Messages"
          >
            <MessageSquare size={16} />
          </button>

          <button
            className="relative w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
            title="Notifications"
          >
            <Bell size={16} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white" />
          </button>
        </div>

        {/* Customize Widget Button */}
        <button
          className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm transition-colors"
          onClick={onCustomizeWidget}
        >
          <SlidersHorizontal size={14} />
          <span>Customize Widget</span>
        </button>

        {/* Prominent + Add Staff Member Button */}
        {isOwner && (
          <button
            onClick={onOpenStaffModal}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs shadow-emerald-600/20 transition-all cursor-pointer"
            title="Create and manage staff accounts"
          >
            <UserPlus size={14} />
            <span>+ Add Staff</span>
          </button>
        )}

        {/* User Profile Avatar & Signout */}
        <div
          className="flex items-center gap-2 pl-2 border-l border-slate-200"
          title={`${profile?.name || 'Owner'} (${profile?.role || 'Admin'})`}
        >
          <img
            src={
              profile?.avatar_url ||
              'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&auto=format&fit=crop&q=80'
            }
            alt="Avatar"
            className="w-8 h-8 rounded-full object-cover ring-2 ring-slate-100 shadow-sm"
          />
          <button
            onClick={signOut}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
            title="Sign Out"
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </header>
  );
}

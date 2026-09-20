import React from 'react';
import BrandLogo from './BrandLogo';
import { useAuth } from '../context/AuthContext';
import { LogOut, UserPlus } from 'lucide-react';

export default function MobileTopHeader({ companyName, onOpenStaffModal }) {
  const { profile, signOut, isOwner } = useAuth();

  return (
    <header className="md:hidden sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 py-2.5 shadow-xs">
      <div className="flex items-center justify-between">
        {/* Brand & CRM Info */}
        <div className="flex items-center gap-2.5">
          <BrandLogo size={28} />
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-black text-slate-900 tracking-tight">
                {companyName || 'Travel-Trade'}
              </span>
              <span
                className={`text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded-full border ${
                  isOwner
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                }`}
              >
                {isOwner ? 'Owner' : 'Staff'}
              </span>
            </div>
            <div className="text-[10px] font-semibold text-emerald-600">
              Export & Commodity Trade CRM
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5">
          {isOwner && (
            <button
              onClick={onOpenStaffModal}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-300 text-xs font-bold hover:bg-emerald-100 transition-colors shadow-xs"
              title="Add New Staff Member"
            >
              <UserPlus size={13} className="text-emerald-700" />
              <span>+ Staff</span>
            </button>
          )}

          <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-xs font-bold text-slate-700 overflow-hidden">
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.name}
                className="w-full h-full object-cover"
              />
            ) : (
              (profile?.name || 'U')[0].toUpperCase()
            )}
          </div>

          <button
            onClick={signOut}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
            title="Sign Out"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </header>
  );
}

import React from 'react';

export default function PageSkeleton() {
  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 animate-pulse">
      {/* Header skeleton */}
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <div className="w-48 h-7 bg-slate-200 rounded-lg" />
          <div className="w-64 h-4 bg-slate-100 rounded" />
        </div>
        <div className="w-32 h-10 bg-slate-200 rounded-xl" />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="p-5 bg-white border border-slate-200/80 rounded-2xl space-y-3">
            <div className="flex justify-between items-center">
              <div className="w-20 h-4 bg-slate-100 rounded" />
              <div className="w-8 h-8 bg-slate-100 rounded-lg" />
            </div>
            <div className="w-28 h-8 bg-slate-200 rounded-lg" />
            <div className="w-24 h-3 bg-slate-100 rounded" />
          </div>
        ))}
      </div>

      {/* Main card skeleton */}
      <div className="p-6 bg-white border border-slate-200/80 rounded-2xl space-y-4">
        <div className="w-44 h-5 bg-slate-200 rounded" />
        <div className="space-y-3 pt-2">
          {[1, 2, 3, 4, 5].map((row) => (
            <div key={row} className="h-12 w-full bg-slate-50 border border-slate-100 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}

import React from 'react';

export default function SeatLegend() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-6 p-4 rounded-2xl bg-dark-900/60 border border-slate-800 text-xs text-slate-300">
      <div className="flex items-center gap-2">
        <div className="w-5 h-5 rounded-md bg-dark-800 border border-slate-700" />
        <span>Available</span>
      </div>

      <div className="flex items-center gap-2">
        <div className="w-5 h-5 rounded-md bg-brand-primary border border-indigo-400 shadow-glow-primary flex items-center justify-center text-[10px] text-white font-bold">
          ✓
        </div>
        <span className="text-white font-medium">Selected</span>
      </div>

      <div className="flex items-center gap-2">
        <div className="w-5 h-5 rounded-md bg-amber-500/20 border border-amber-500/50" />
        <span className="text-amber-300">Locked / In Progress</span>
      </div>

      <div className="flex items-center gap-2">
        <div className="w-5 h-5 rounded-md bg-slate-800 border border-slate-700 opacity-40 cursor-not-allowed" />
        <span className="text-slate-500">Sold / Booked</span>
      </div>
    </div>
  );
}

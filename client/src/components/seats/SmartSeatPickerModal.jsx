import React, { useState } from 'react';
import { Sparkles, X, Users, Eye, DollarSign, Armchair, DoorOpen, CheckCircle, Loader2 } from 'lucide-react';
import api from '../../services/api';

export default function SmartSeatPickerModal({ isOpen, onClose, showId, onSeatsSelected }) {
  const [ticketCount, setTicketCount] = useState(2);
  const [preference, setPreference] = useState('BEST_VIEW');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const preferences = [
    {
      id: 'BEST_VIEW',
      name: 'Best View',
      description: 'Optimal distance & center viewing angle',
      icon: Eye,
      color: 'from-brand-500 to-indigo-600'
    },
    {
      id: 'BUDGET',
      name: 'Best Value',
      description: 'Lowest price contiguous seats',
      icon: DollarSign,
      color: 'from-emerald-500 to-teal-600'
    },
    {
      id: 'RECLINER',
      name: 'VIP Recliner',
      description: 'Luxury recliner / executive row',
      icon: Armchair,
      color: 'from-amber-500 to-orange-600'
    },
    {
      id: 'AISLE',
      name: 'Aisle Access',
      description: 'Easy in/out near the walkway',
      icon: DoorOpen,
      color: 'from-purple-500 to-pink-600'
    }
  ];

  const handleRecommend = async () => {
    setLoading(true);
    setError('');

    try {
      const res = await api.get(`/recommendations/seats?showId=${showId}&count=${ticketCount}&preference=${preference}`);
      if (res.data?.recommendation?.seats) {
        const seatIds = res.data.recommendation.seats.map((s) => s.seatIdentifier);
        onSeatsSelected(seatIds);
        onClose();
      } else {
        setError('No contiguous seat combinations found for this count & preference.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Could not find contiguous seats.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg bg-dark-900 border border-white/10 rounded-2xl p-6 shadow-2xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-500 to-purple-600 flex items-center justify-center shadow-lg shadow-brand-500/30">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Smart Seat Recommender</h3>
              <p className="text-xs text-gray-400">AI-powered contiguous seat allocation</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step 1: Number of Tickets */}
        <div className="space-y-3">
          <label className="text-xs font-semibold uppercase tracking-wider text-gray-400 flex items-center gap-2">
            <Users className="w-4 h-4 text-brand-400" />
            Select Number of Tickets
          </label>
          <div className="grid grid-cols-6 gap-2">
            {[1, 2, 3, 4, 5, 6].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => setTicketCount(num)}
                className={`py-2.5 rounded-xl font-bold text-sm transition-all ${
                  ticketCount === num
                    ? 'bg-brand-600 text-white shadow-lg shadow-brand-500/30 border border-brand-400'
                    : 'bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10'
                }`}
              >
                {num}
              </button>
            ))}
          </div>
        </div>

        {/* Step 2: Seating Preference */}
        <div className="space-y-3">
          <label className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            Seating Preference
          </label>
          <div className="grid grid-cols-2 gap-3">
            {preferences.map((p) => {
              const Icon = p.icon;
              const isSelected = preference === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPreference(p.id)}
                  className={`p-3.5 rounded-xl border text-left transition-all relative flex flex-col justify-between ${
                    isSelected
                      ? 'bg-white/10 border-brand-500 shadow-md shadow-brand-500/20'
                      : 'bg-white/5 border-white/5 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-2">
                    <div className={`p-2 rounded-lg bg-gradient-to-tr ${p.color} text-white`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    {isSelected && <CheckCircle className="w-4 h-4 text-brand-400" />}
                  </div>
                  <div>
                    <h4 className="font-semibold text-white text-xs sm:text-sm">{p.name}</h4>
                    <p className="text-[11px] text-gray-400 mt-0.5">{p.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs">
            {error}
          </div>
        )}

        {/* Action Button */}
        <button
          onClick={handleRecommend}
          disabled={loading}
          className="w-full py-3.5 px-4 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-brand-500 via-purple-600 to-indigo-600 hover:from-brand-600 hover:to-indigo-700 shadow-xl shadow-brand-500/30 transition-all flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Finding Optimal Seats...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              Pick Best {ticketCount} {ticketCount > 1 ? 'Seats' : 'Seat'}
            </>
          )}
        </button>
      </div>
    </div>
  );
}

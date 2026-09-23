import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import api from '../services/api';
import { useAuthStore } from '../store/useAuthStore';
import { useToastStore } from '../store/useToastStore';
import SeatLegend from '../components/seats/SeatLegend';
import SmartSeatPickerModal from '../components/seats/SmartSeatPickerModal';
import {
  Film,
  MapPin,
  Clock,
  Calendar,
  Sparkles,
  ArrowRight,
  ChevronLeft,
  Timer,
  ShieldCheck,
  AlertTriangle,
  Wand2
} from 'lucide-react';

export default function SeatSelectionPage() {
  const { id: showId } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated, openAuthModal } = useAuthStore();
  const { success, error: toastError, warning } = useToastStore();

  const [loading, setLoading] = useState(true);
  const [showData, setShowData] = useState(null);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [lockedByOthers, setLockedByOthers] = useState(new Set());
  const [lockExpiresAt, setLockExpiresAt] = useState(null);
  const [timeLeftSeconds, setTimeLeftSeconds] = useState(0);
  const [isSmartPickerOpen, setIsSmartPickerOpen] = useState(false);

  // Session ID for guests
  const sessionIdRef = useRef(
    localStorage.getItem('showpulse_guest_session') ||
    `guest_${Math.random().toString(36).substring(2, 12)}`
  );

  useEffect(() => {
    localStorage.setItem('showpulse_guest_session', sessionIdRef.current);
  }, []);

  const currentUserId = user?._id || sessionIdRef.current;

  // Fetch show details and initial active locks
  useEffect(() => {
    fetchShowData();
  }, [showId]);

  const fetchShowData = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/shows/${showId}`);
      setShowData(res.data?.data || res.data);

      // Fetch active locks
      const locksRes = await api.get(`/shows/${showId}/locked-seats`);
      const activeLocks = locksRes.data?.data || locksRes.data || {};
      const othersLocked = new Set();
      const myLocked = [];

      Object.entries(activeLocks).forEach(([seatId, lock]) => {
        if (lock.userId === currentUserId) {
          myLocked.push(seatId);
          if (lock.expiresAt) {
            setLockExpiresAt(new Date(lock.expiresAt));
          }
        } else {
          othersLocked.add(seatId);
        }
      });

      setLockedByOthers(othersLocked);
      if (myLocked.length > 0) {
        setSelectedSeats(myLocked);
      }
    } catch (err) {
      console.error('Failed to load show details', err);
      toastError('Could not load seat map for this show');
    } finally {
      setLoading(false);
    }
  };

  // Socket.IO real-time synchronization
  useEffect(() => {
    const socket = io('/', {
      transports: ['websocket', 'polling']
    });

    socket.emit('join_show', showId);

    socket.on('seats_locked', (data) => {
      if (data.showId === showId) {
        if (data.lockedBy !== currentUserId) {
          setLockedByOthers((prev) => {
            const next = new Set(prev);
            data.seatIdentifiers.forEach((s) => next.add(s));
            return next;
          });
          // If another user locked a seat I currently had selected, remove it
          setSelectedSeats((prev) => prev.filter((s) => !data.seatIdentifiers.includes(s)));
        }
      }
    });

    socket.on('seats_unlocked', (data) => {
      if (data.showId === showId) {
        setLockedByOthers((prev) => {
          const next = new Set(prev);
          data.seatIdentifiers.forEach((s) => next.delete(s));
          return next;
        });
      }
    });

    return () => {
      socket.emit('leave_show', showId);
      socket.disconnect();
    };
  }, [showId, currentUserId]);

  // Countdown timer effect
  useEffect(() => {
    if (!lockExpiresAt) {
      setTimeLeftSeconds(0);
      return;
    }

    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((lockExpiresAt.getTime() - Date.now()) / 1000));
      setTimeLeftSeconds(remaining);

      if (remaining === 0) {
        clearInterval(interval);
        setSelectedSeats([]);
        setLockExpiresAt(null);
        warning('Seat lock expired. Please select your seats again.');
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [lockExpiresAt]);

  const handleSeatClick = async (seat) => {
    if (seat.status === 'BOOKED' || lockedByOthers.has(seat.seatIdentifier)) {
      return;
    }

    const isAlreadySelected = selectedSeats.includes(seat.seatIdentifier);

    if (isAlreadySelected) {
      // Unlock seat
      const nextSelected = selectedSeats.filter((s) => s !== seat.seatIdentifier);
      setSelectedSeats(nextSelected);

      try {
        await api.post(`/shows/${showId}/unlock-seats`, {
          seatIdentifiers: [seat.seatIdentifier],
          sessionId: sessionIdRef.current
        });
        if (nextSelected.length === 0) {
          setLockExpiresAt(null);
        }
      } catch (err) {
        console.error('Failed to unlock seat', err);
      }
    } else {
      // Check maximum seats limit
      if (selectedSeats.length >= 8) {
        toastError('You can select a maximum of 8 seats per booking');
        return;
      }

      const nextSelected = [...selectedSeats, seat.seatIdentifier];
      setSelectedSeats(nextSelected);

      try {
        const res = await api.post(`/shows/${showId}/lock-seats`, {
          seatIdentifiers: nextSelected,
          sessionId: sessionIdRef.current
        });
        const lockResData = res.data?.data || res.data;
        if (lockResData?.expiresAt) {
          setLockExpiresAt(new Date(lockResData.expiresAt));
        }
      } catch (err) {
        setSelectedSeats(selectedSeats);
        toastError(err.message || 'Seat could not be locked');
      }
    }
  };

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading || !showData) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <div className="inline-block w-8 h-8 border-4 border-brand-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-slate-400 mt-2">Loading interactive seat layout...</p>
      </div>
    );
  }

  const { show, seats } = showData;

  // Calculate pricing breakdown
  const selectedSeatObjects = seats.filter((s) => selectedSeats.includes(s.seatIdentifier));
  const subtotal = selectedSeatObjects.reduce((acc, s) => acc + (s.price || 200), 0);
  const convenienceFee = selectedSeats.length > 0 ? selectedSeats.length * 30 : 0;
  const taxes = Math.round(convenienceFee * 0.18); // 18% GST on convenience fee
  const grandTotal = subtotal + convenienceFee + taxes;

  // Group seats by category and then by row
  const categoryOrder = ['RECLINER', 'VIP', 'PREMIUM', 'REGULAR'];
  const seatsByCategory = {};

  seats.forEach((seat) => {
    if (!seatsByCategory[seat.category]) {
      seatsByCategory[seat.category] = {};
    }
    if (!seatsByCategory[seat.category][seat.row]) {
      seatsByCategory[seat.category][seat.row] = [];
    }
    seatsByCategory[seat.category][seat.row].push(seat);
  });

  const handleSmartSeatsPicked = async (seatIds) => {
    try {
      if (selectedSeats.length > 0) {
        await api.post(`/shows/${showId}/unlock-seats`, {
          seatIdentifiers: selectedSeats,
          sessionId: sessionIdRef.current
        });
      }

      const res = await api.post(`/shows/${showId}/lock-seats`, {
        seatIdentifiers: seatIds,
        sessionId: sessionIdRef.current
      });

      const lockData = res.data?.data || res.data;
      if (res.data?.success || lockData?.success || lockData?.lockedSeats) {
        setSelectedSeats(seatIds);
        if (lockData?.expiresAt) {
          setLockExpiresAt(new Date(lockData.expiresAt));
        }
        success(`✨ ${seatIds.length} optimal seats locked for you!`);
      }
    } catch (err) {
      toastError(err.response?.data?.message || err.message || 'Failed to lock recommended seats');
    }
  };

  return (
    <div className="min-h-screen bg-dark-950 text-slate-100 pb-32">
      {/* Top Details & Timer Header */}
      <div className="sticky top-16 z-30 bg-dark-950/90 backdrop-blur-md border-b border-slate-800/80 px-4 sm:px-6 lg:px-8 py-4">
        <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              to={`/movies/${show.movie?._id}`}
              className="p-2 rounded-xl bg-dark-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </Link>

            <div>
              <h1 className="text-base sm:text-lg font-bold font-display text-white flex items-center gap-2">
                <span>{show.movie?.title}</span>
                <span className="text-xs px-2 py-0.5 rounded bg-brand-primary/20 text-indigo-300 border border-brand-primary/30">
                  {show.format}
                </span>
              </h1>
              <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
                <span>{show.venue?.name}</span>
                <span>&bull;</span>
                <span className="text-slate-300 font-medium">{show.date} at {show.startTime}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Smart Pick Button */}
            <button
              onClick={() => setIsSmartPickerOpen(true)}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-purple-600/30 to-brand-500/30 border border-purple-500/40 hover:border-purple-400 text-purple-200 hover:text-white transition-all text-xs font-semibold shadow-md shadow-purple-500/10"
            >
              <Wand2 className="w-3.5 h-3.5 text-purple-300 animate-pulse" />
              <span>Smart Pick</span>
            </button>

            {/* Lock Countdown Timer */}
            {selectedSeats.length > 0 && timeLeftSeconds > 0 && (
              <div className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl border animate-pulse ${
                timeLeftSeconds < 120
                  ? 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                  : 'bg-amber-500/15 border-amber-500/30 text-amber-300'
              }`}>
                <Timer className="w-4 h-4" />
                <span className="text-xs font-bold">
                  Seats Locked: {formatTimer(timeLeftSeconds)}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Seat Map Area */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
        {/* Curved Screen Visualization */}
        <div className="relative text-center space-y-3 pt-4">
          <div className="w-3/4 mx-auto h-3 rounded-full bg-gradient-to-r from-transparent via-brand-primary to-transparent opacity-80 blur-sm shadow-glow-primary" />
          <svg className="w-full max-w-lg mx-auto h-8 text-brand-primary/40" viewBox="0 0 400 20" fill="none">
            <path d="M10 18 Q 200 2 390 18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
          <span className="text-[11px] uppercase tracking-widest text-slate-500 font-bold block">
            Auditorium Screen this way
          </span>
        </div>

        {/* Legend */}
        <SeatLegend />

        {/* Seat Rows Matrix */}
        <div className="space-y-8 overflow-x-auto py-4">
          {categoryOrder.map((catKey) => {
            const rowsObj = seatsByCategory[catKey];
            if (!rowsObj) return null;

            const categoryPrice = show.priceTiers?.find((t) => t.category === catKey)?.price || 200;

            return (
              <div key={catKey} className="space-y-3">
                {/* Category Price Header */}
                <div className="flex items-center justify-between pb-2 border-b border-slate-800/80 text-xs">
                  <span className="font-bold text-slate-300 tracking-wider uppercase">
                    {catKey} SEATING
                  </span>
                  <span className="text-brand-primary font-extrabold text-sm">
                    ₹{categoryPrice}
                  </span>
                </div>

                {/* Rows */}
                <div className="space-y-2.5 flex flex-col items-center">
                  {Object.entries(rowsObj).map(([rowLabel, rowSeats]) => (
                    <div key={rowLabel} className="flex items-center gap-3">
                      {/* Row Label */}
                      <span className="w-6 text-center text-xs font-bold text-slate-500">
                        {rowLabel}
                      </span>

                      {/* Row Seats */}
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        {rowSeats.map((seat) => {
                          const isSelected = selectedSeats.includes(seat.seatIdentifier);
                          const isLockedOther = lockedByOthers.has(seat.seatIdentifier);
                          const isBooked = seat.status === 'BOOKED' || !seat.isAvailable;

                          let seatClasses = 'bg-dark-850 border-slate-700/80 text-slate-300 hover:border-brand-primary hover:text-white cursor-pointer';

                          if (isBooked) {
                            seatClasses = 'bg-dark-950/60 border-slate-800 text-slate-600 opacity-40 cursor-not-allowed';
                          } else if (isSelected) {
                            seatClasses = 'bg-brand-primary border-indigo-400 text-white font-bold shadow-glow-primary scale-105';
                          } else if (isLockedOther) {
                            seatClasses = 'bg-amber-500/20 border-amber-500/40 text-amber-300 cursor-not-allowed animate-pulse';
                          }

                          return (
                            <button
                              key={seat._id}
                              onClick={() => handleSeatClick(seat)}
                              disabled={isBooked || isLockedOther}
                              title={`${seat.seatIdentifier} (${catKey} - ₹${seat.price})`}
                              className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg border text-[11px] font-semibold flex items-center justify-center transition-all ${seatClasses}`}
                            >
                              {seat.number}
                            </button>
                          );
                        })}
                      </div>

                      <span className="w-6 text-center text-xs font-bold text-slate-500">
                        {rowLabel}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Sticky Bottom Summary Checkout Drawer */}
      {selectedSeats.length > 0 && (
        <div className="fixed bottom-0 inset-x-0 z-40 glass-dropdown border-t border-slate-800 p-4 shadow-2xl animate-slide-up">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Selected Seats List */}
            <div className="flex flex-wrap items-center gap-3">
              <div>
                <span className="text-[10px] uppercase tracking-wider text-slate-400 block font-semibold">
                  Selected Seats ({selectedSeats.length})
                </span>
                <div className="flex flex-wrap items-center gap-1.5 mt-1">
                  {selectedSeats.map((seatId) => (
                    <span
                      key={seatId}
                      className="px-2 py-0.5 rounded-md bg-brand-primary/20 border border-brand-primary/40 text-white text-xs font-bold"
                    >
                      {seatId}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Price & Checkout CTA */}
            <div className="flex items-center gap-6">
              <div className="text-right">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Total Amount</span>
                <span className="text-2xl font-extrabold text-white">
                  ₹{grandTotal.toLocaleString()}
                </span>
                <p className="text-[10px] text-slate-500">
                  Incl. ₹{convenienceFee + taxes} convenience fee & GST
                </p>
              </div>

              <button
                onClick={() => {
                  if (!isAuthenticated) {
                    openAuthModal('login');
                  } else {
                    navigate('/checkout', {
                      state: {
                        bookingType: 'MOVIE',
                        showId,
                        movie: show.movie,
                        venue: show.venue,
                        show,
                        selectedSeats
                      }
                    });
                  }
                }}
                className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-brand-primary to-brand-secondary hover:opacity-95 text-white font-semibold text-xs shadow-glow-primary transition-all flex items-center gap-2 transform active:scale-95"
              >
                <span>{isAuthenticated ? 'Proceed to Pay' : 'Sign in to Pay'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Smart Seat Picker Modal */}
      <SmartSeatPickerModal
        isOpen={isSmartPickerOpen}
        onClose={() => setIsSmartPickerOpen(false)}
        showId={showId}
        onSeatsSelected={handleSmartSeatsPicked}
      />
    </div>
  );
}

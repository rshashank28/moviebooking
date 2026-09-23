import React, { useState } from 'react';
import api from '../services/api';
import {
  QrCode,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Scan,
  User,
  Film,
  MapPin,
  Clock
} from 'lucide-react';

export default function QRScannerPage() {
  const [tokenInput, setTokenInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [scanResult, setScanResult] = useState(null);

  const handleScanSubmit = async (e) => {
    e.preventDefault();
    if (!tokenInput.trim()) return;

    setLoading(true);
    setScanResult(null);

    try {
      const res = await api.post('/bookings/tickets/scan-checkin', {
        token: tokenInput.trim()
      });
      setScanResult(res.data?.data || res.data);
    } catch (err) {
      setScanResult({
        isValid: false,
        status: 'FAILED',
        message: err.message || 'Check-in validation failed'
      });
    } finally {
      setLoading(false);
    }
  };

  const booking = scanResult?.booking;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      {/* Header */}
      <div className="text-center space-y-2 pb-6 border-b border-slate-800">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-primary/10 border border-brand-primary/30 text-indigo-300 text-xs font-semibold">
          <Scan className="w-3.5 h-3.5" />
          <span>Organizer / Gate Terminal</span>
        </div>
        <h1 className="text-3xl font-extrabold font-display text-white">
          Ticket Gate Scanner & Pass Verification
        </h1>
        <p className="text-xs text-slate-400 max-w-lg mx-auto">
          Scan QR codes or enter booking verification tokens to validate authentic admission and prevent duplicate entries.
        </p>
      </div>

      {/* Input Scanner Form */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4 max-w-xl mx-auto">
        <form onSubmit={handleScanSubmit} className="space-y-3">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
            Scan QR Data / Token / Booking ID
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="e.g. SP-MOV-XXXX or SPQR-SP-MOV-XXXX-..."
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              className="flex-1 px-4 py-3 rounded-xl bg-dark-900 border border-slate-700 text-white placeholder-slate-500 text-xs font-mono focus:outline-none focus:border-brand-primary"
              autoFocus
            />
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 rounded-xl bg-brand-primary hover:bg-indigo-600 text-white text-xs font-semibold shadow-glow-primary transition-all flex items-center gap-1.5"
            >
              <Scan className="w-4 h-4" />
              <span>{loading ? 'Checking...' : 'Validate'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Result Card */}
      {scanResult && (
        <div className={`p-6 rounded-3xl border max-w-xl mx-auto space-y-4 animate-scale-up ${
          scanResult.isValid
            ? 'bg-emerald-950/40 border-emerald-500/40'
            : 'bg-rose-950/40 border-rose-500/40'
        }`}>
          <div className="flex items-center gap-3">
            {scanResult.isValid ? (
              <CheckCircle2 className="w-8 h-8 text-emerald-400 shrink-0" />
            ) : (
              <XCircle className="w-8 h-8 text-rose-400 shrink-0" />
            )}
            <div>
              <h3 className={`text-lg font-bold ${scanResult.isValid ? 'text-emerald-300' : 'text-rose-300'}`}>
                {scanResult.message}
              </h3>
              <p className="text-xs text-slate-400">Status Code: {scanResult.status}</p>
            </div>
          </div>

          {booking && (
            <div className="pt-4 border-t border-slate-800/80 space-y-2 text-xs text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-400">Customer:</span>
                <span className="font-bold text-white">{booking.user?.name} ({booking.user?.phone || booking.user?.email})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Experience / Movie:</span>
                <span className="font-bold text-white">{booking.movie?.title || booking.event?.title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Seats / Passes:</span>
                <span className="font-bold text-brand-primary">
                  {booking.seats?.map((s) => s.seatIdentifier).join(', ') || `${booking.eventPasses?.length} Passes`}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Booking ID:</span>
                <span className="font-mono font-bold text-white">{booking.bookingId}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

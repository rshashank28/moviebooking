import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import {
  Film,
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  Download,
  Printer,
  Share2,
  Sparkles,
  Ticket,
  ChevronLeft,
  ShieldCheck,
  QrCode
} from 'lucide-react';

export default function TicketViewPage() {
  const { id: bookingId } = useParams();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBookingDetails();
  }, [bookingId]);

  const fetchBookingDetails = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/bookings/${bookingId}`);
      setBooking(res.data);
    } catch (err) {
      console.error('Failed to load booking ticket', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <div className="inline-block w-8 h-8 border-4 border-brand-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-slate-400 mt-2">Loading digital pass & QR verification...</p>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-4">
        <h2 className="text-2xl font-bold text-white">Ticket Not Found</h2>
        <Link to="/" className="px-4 py-2 bg-brand-primary rounded-xl text-white text-xs font-semibold">
          Return Home
        </Link>
      </div>
    );
  }

  const isMovie = booking.bookingType === 'MOVIE';
  const title = isMovie ? booking.movie?.title : booking.event?.title;
  const poster = isMovie ? booking.movie?.poster : booking.event?.poster;
  const venueName = isMovie ? booking.venue?.name : booking.event?.venueName;
  const venueAddress = isMovie ? booking.venue?.address : booking.event?.address;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      {/* Top Controls */}
      <div className="flex items-center justify-between">
        <Link
          to="/"
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </Link>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-dark-900 border border-slate-700 hover:border-slate-500 text-xs font-semibold text-white transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Ticket</span>
          </button>
        </div>
      </div>

      {/* Digital Ticket Pass Card */}
      <div className="rounded-3xl overflow-hidden border border-slate-800 bg-gradient-to-b from-dark-900 to-dark-950 shadow-2xl relative">
        {/* Pass Header */}
        <div className="p-6 bg-dark-850/80 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-brand-primary flex items-center justify-center shadow-glow-primary">
              <Ticket className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold block">
                Official Digital Entry Pass
              </span>
              <span className="text-sm font-extrabold text-white">ShowPulse Verified</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>{booking.bookingStatus}</span>
            </span>
          </div>
        </div>

        {/* Main Pass Content */}
        <div className="p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row gap-6 items-start">
            <img
              src={poster}
              alt="poster"
              className="w-28 sm:w-36 aspect-[2/3] object-cover rounded-2xl border border-slate-700 bg-dark-900 shadow-xl shrink-0"
            />

            <div className="space-y-3 flex-1">
              <div>
                <span className="text-xs text-brand-primary font-bold uppercase tracking-wider">
                  {isMovie ? 'Cinema Pass' : 'Live Event Pass'}
                </span>
                <h1 className="text-2xl sm:text-3xl font-extrabold font-display text-white mt-0.5">
                  {title}
                </h1>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs pt-1">
                <div>
                  <span className="text-[10px] uppercase text-slate-500 font-bold block">Date & Time</span>
                  <p className="font-bold text-white mt-0.5">
                    {booking.show?.date || (booking.event?.date && new Date(booking.event.date).toLocaleDateString())}
                  </p>
                  <p className="text-slate-400">{booking.show?.startTime || booking.event?.startTime}</p>
                </div>

                <div>
                  <span className="text-[10px] uppercase text-slate-500 font-bold block">Auditorium / Screen</span>
                  <p className="font-bold text-white mt-0.5">
                    {booking.screen?.name || 'Main Arena'}
                  </p>
                  <p className="text-slate-400">{booking.show?.format || 'Standard Pass'}</p>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800/80">
                <span className="text-[10px] uppercase text-slate-500 font-bold block">Venue & Location</span>
                <p className="font-bold text-white text-xs mt-0.5">{venueName}</p>
                <p className="text-[11px] text-slate-400">{venueAddress}</p>
              </div>
            </div>
          </div>

          {/* Seat Numbers Ribbon */}
          <div className="p-4 rounded-2xl bg-dark-850 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block">
                Reserved Seats / Passes
              </span>
              <div className="flex flex-wrap items-center gap-2 mt-1.5">
                {booking.seats?.map((seat) => (
                  <span
                    key={seat.seatIdentifier}
                    className="px-3 py-1 rounded-lg bg-brand-primary/20 border border-brand-primary/50 text-white font-extrabold text-sm shadow-glow-primary"
                  >
                    {seat.seatIdentifier}
                  </span>
                ))}
                {booking.eventPasses?.map((p, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 rounded-lg bg-brand-primary/20 border border-brand-primary/50 text-white font-extrabold text-sm"
                  >
                    {p.quantity}x {p.categoryName}
                  </span>
                ))}
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block">Booking ID</span>
              <span className="text-base font-mono font-bold text-white">{booking.bookingId}</span>
            </div>
          </div>

          {/* Perforated Divider */}
          <div className="relative py-2">
            <div className="border-t-2 border-dashed border-slate-800" />
            <div className="absolute -left-10 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-dark-950 border border-slate-800" />
            <div className="absolute -right-10 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-dark-950 border border-slate-800" />
          </div>

          {/* QR Code Verification Section */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 p-4 rounded-2xl bg-dark-950/80 border border-slate-800/80">
            <div className="space-y-1 text-center sm:text-left">
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                <ShieldCheck className="w-4 h-4" />
                <span>Encrypted Fast Check-In QR</span>
              </div>
              <p className="text-xs text-slate-300">
                Present this tamper-proof QR code at the cinema entrance or turnstile scanner.
              </p>
              <p className="text-[11px] text-slate-500 font-mono">
                Token: {booking.qrVerificationToken?.slice(0, 24)}...
              </p>
            </div>

            {/* QR Code Graphic */}
            <div className="p-3 bg-white rounded-2xl shadow-xl shrink-0">
              {booking.qrCodeData ? (
                <img
                  src={booking.qrCodeData}
                  alt="Ticket QR Code"
                  className="w-32 h-32 object-contain"
                />
              ) : (
                <div className="w-32 h-32 flex items-center justify-center text-slate-900">
                  <QrCode className="w-16 h-16" />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

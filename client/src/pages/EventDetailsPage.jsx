import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import ReviewSection from '../components/reviews/ReviewSection';
import {
  Calendar,
  Clock,
  MapPin,
  Sparkles,
  ShieldCheck,
  Tag,
  Users,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export default function EventDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedTicketCategory, setSelectedTicketCategory] = useState(null);
  const [ticketQuantity, setTicketQuantity] = useState(1);

  useEffect(() => {
    fetchEventDetails();
  }, [id]);

  const fetchEventDetails = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/events/${id}`);
      setEvent(res.data);
      if (res.data?.ticketCategories?.length > 0) {
        setSelectedTicketCategory(res.data.ticketCategories[0]);
      }
    } catch (err) {
      console.error('Failed to load event details', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <div className="inline-block w-8 h-8 border-4 border-brand-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-slate-400 mt-2">Loading event details & pass availability...</p>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center space-y-4">
        <h2 className="text-2xl font-bold text-white">Event Not Found</h2>
        <Link to="/events" className="px-4 py-2 bg-brand-primary rounded-xl text-white text-xs font-semibold">
          Back to Events
        </Link>
      </div>
    );
  }

  const formattedDate = new Date(event.date).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  const totalAmount = (selectedTicketCategory?.price || 0) * ticketQuantity;

  return (
    <div className="space-y-10 pb-20">
      {/* Event Header Banner */}
      <div className="relative min-h-[420px] bg-dark-950 overflow-hidden border-b border-slate-800">
        <div className="absolute inset-0">
          <img
            src={event.banner || event.poster}
            alt={event.title}
            className="w-full h-full object-cover object-center opacity-30 filter blur-sm scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-dark-950 via-dark-950/80 to-transparent" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 relative z-10">
          <div className="flex flex-col md:flex-row gap-8 items-start">
            {/* Event Poster Card */}
            <div className="w-64 shrink-0 rounded-2xl overflow-hidden shadow-2xl border border-slate-700/80 bg-dark-900 aspect-[4/3] sm:aspect-[16/10]">
              <img
                src={event.poster || event.banner}
                alt={event.title}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Event Info */}
            <div className="flex-1 space-y-4">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-secondary/15 border border-brand-secondary/30 text-rose-300 text-xs font-bold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" />
                <span>{event.category.replace('_', ' ')}</span>
              </div>

              <h1 className="text-3xl sm:text-5xl font-extrabold font-display text-white tracking-tight leading-tight">
                {event.title}
              </h1>

              {event.artist && (
                <p className="text-base sm:text-lg text-indigo-300 font-semibold">
                  Featuring {event.artist}
                </p>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs text-slate-300 max-w-xl">
                <div className="flex items-center gap-2.5 p-3 rounded-xl bg-dark-900/80 border border-slate-800">
                  <Calendar className="w-4 h-4 text-brand-primary shrink-0" />
                  <div>
                    <p className="font-semibold text-white">{formattedDate}</p>
                    <p className="text-[11px] text-slate-400">{event.startTime} {event.endTime ? `to ${event.endTime}` : 'onwards'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 p-3 rounded-xl bg-dark-900/80 border border-slate-800">
                  <MapPin className="w-4 h-4 text-rose-400 shrink-0" />
                  <div>
                    <p className="font-semibold text-white">{event.venueName}</p>
                    <p className="text-[11px] text-slate-400">{event.address}, {event.city}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid: Description & Pass Picker */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Left Column: About & Terms */}
          <div className="lg:col-span-2 space-y-8">
            <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
              <h2 className="text-xl font-bold font-display text-white">About the Event</h2>
              <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">
                {event.description}
              </p>
            </div>

            {/* Cancellation Policy Alert */}
            <div className="p-4 rounded-2xl bg-dark-900/80 border border-slate-800 flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <h4 className="font-bold text-white">Cancellation & Refund Policy</h4>
                <p className="text-slate-400">
                  {event.cancellationPolicy?.isAllowed
                    ? `Eligible for ${event.cancellationPolicy.refundPercentage}% refund if cancelled at least ${event.cancellationPolicy.cutoffHours} hours prior to showtime.`
                    : 'This event is strictly non-refundable and non-transferable.'}
                </p>
              </div>
            </div>

            {/* Terms and Conditions */}
            {event.terms?.length > 0 && (
              <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-3">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">
                  Terms & Conditions
                </h3>
                <ul className="space-y-2 text-xs text-slate-300 list-disc list-inside">
                  {event.terms.map((t, idx) => (
                    <li key={idx}>{t}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Verified Reviews Section */}
            <ReviewSection itemType="EVENT" itemId={event._id} itemTitle={event.title} />
          </div>

          {/* Right Column: Ticket Category Selection & Order Card */}
          <div className="sticky top-20 glass-panel p-6 rounded-2xl border border-slate-800 space-y-6 shadow-2xl">
            <div>
              <h3 className="text-lg font-bold font-display text-white">Select Tickets</h3>
              <p className="text-xs text-slate-400 mt-0.5">Choose your entry pass category</p>
            </div>

            <div className="space-y-3">
              {event.ticketCategories?.map((cat, idx) => {
                const isSelected = selectedTicketCategory?.name === cat.name;
                const remaining = cat.capacity - (cat.soldCount || 0);

                return (
                  <button
                    key={idx}
                    onClick={() => setSelectedTicketCategory(cat)}
                    className={`w-full p-4 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'bg-brand-primary/20 border-brand-primary shadow-glow-primary'
                        : 'bg-dark-900 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-sm">{cat.name}</span>
                      <span className="font-extrabold text-base text-brand-primary">₹{cat.price.toLocaleString()}</span>
                    </div>
                    {cat.description && (
                      <p className="text-xs text-slate-400 mt-1">{cat.description}</p>
                    )}
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-800/80 text-[11px]">
                      <span className="text-emerald-400 font-semibold">{remaining} passes remaining</span>
                      {isSelected && <CheckCircle2 className="w-4 h-4 text-brand-primary" />}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Quantity Selector */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              <span className="text-xs font-semibold text-slate-300">Quantity</span>
              <div className="flex items-center gap-3 bg-dark-900 px-3 py-1.5 rounded-xl border border-slate-800">
                <button
                  onClick={() => setTicketQuantity(Math.max(1, ticketQuantity - 1))}
                  className="text-slate-400 hover:text-white font-bold text-sm px-1"
                >
                  -
                </button>
                <span className="text-xs font-bold text-white w-4 text-center">{ticketQuantity}</span>
                <button
                  onClick={() => setTicketQuantity(Math.min(10, ticketQuantity + 1))}
                  className="text-slate-400 hover:text-white font-bold text-sm px-1"
                >
                  +
                </button>
              </div>
            </div>

            {/* Total Summary */}
            <div className="p-4 rounded-xl bg-dark-900 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Total Payable</span>
                <span className="text-xl font-extrabold text-white">₹{totalAmount.toLocaleString()}</span>
              </div>
              <span className="text-[10px] text-slate-500">Excl. Convenience Fee</span>
            </div>

            <button
              onClick={() => {
                navigate('/checkout', {
                  state: {
                    bookingType: 'EVENT',
                    eventId: event._id,
                    event,
                    passes: [
                      {
                        categoryName: selectedTicketCategory?.name,
                        quantity: ticketQuantity,
                        pricePerPass: selectedTicketCategory?.price
                      }
                    ]
                  }
                });
              }}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-brand-secondary to-rose-600 hover:opacity-95 text-white font-semibold text-xs shadow-glow-rose transition-all flex items-center justify-center gap-2"
            >
              <span>Proceed to Book</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

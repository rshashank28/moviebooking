import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, MapPin, Tag } from 'lucide-react';

export default function EventCard({ event }) {
  if (!event) return null;

  const minPrice = event.ticketCategories?.length
    ? Math.min(...event.ticketCategories.map((t) => t.price))
    : 499;

  const formattedDate = new Date(event.date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    weekday: 'short'
  });

  return (
    <Link
      to={`/events/${event.slug || event._id}`}
      className="group flex flex-col glass-card rounded-2xl overflow-hidden border border-slate-800/80 hover:border-slate-700 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1.5"
    >
      {/* Event Banner / Poster */}
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-dark-900">
        <img
          src={event.poster || event.banner}
          alt={event.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
          onError={(e) => {
            e.target.src = 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?q=80&w=800&auto=format&fit=crop';
          }}
        />

        {/* Category Pill */}
        <div className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-dark-950/85 backdrop-blur-md border border-slate-800 text-[11px] font-bold text-brand-secondary shadow-lg">
          {event.category.replace('_', ' ')}
        </div>

        {/* Date Pill */}
        <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-lg bg-dark-950/90 text-xs font-semibold text-white border border-slate-800 flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-brand-primary" />
          <span>{formattedDate}</span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
        <div>
          <h3 className="font-bold text-white text-base leading-snug group-hover:text-brand-primary transition-colors line-clamp-1">
            {event.title}
          </h3>
          {event.artist && (
            <p className="text-xs text-indigo-300 mt-0.5 font-medium line-clamp-1">
              {event.artist}
            </p>
          )}
          <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-400 line-clamp-1">
            <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span>{event.venueName}, {event.city}</span>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
          <div>
            <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Starting from</span>
            <span className="text-sm font-bold text-white">₹{minPrice.toLocaleString()}</span>
          </div>

          <button className="px-4 py-2 rounded-xl bg-brand-primary/20 hover:bg-brand-primary text-indigo-300 hover:text-white text-xs font-semibold transition-all border border-brand-primary/30">
            Book Pass
          </button>
        </div>
      </div>
    </Link>
  );
}

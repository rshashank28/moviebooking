import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useCityStore } from '../store/useCityStore';
import api from '../services/api';
import EventCard from '../components/events/EventCard';
import { Sparkles, Music, Trophy, Mic2, Theater, Filter } from 'lucide-react';

const CATEGORIES = [
  { id: 'ALL', label: 'All Experiences', icon: Sparkles },
  { id: 'CONCERTS', label: 'Concerts & Music', icon: Music },
  { id: 'STANDUP_COMEDY', label: 'Standup Comedy', icon: Mic2 },
  { id: 'SPORTS', label: 'Sports & Stadiums', icon: Trophy },
  { id: 'THEATRE', label: 'Theatre & Plays', icon: Theater }
];

export default function EventsPage({ defaultCategory }) {
  const { selectedCity } = useCityStore();
  const [searchParams] = useSearchParams();

  const initialCat = defaultCategory || searchParams.get('category') || 'ALL';
  const [selectedCategory, setSelectedCategory] = useState(initialCat);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (defaultCategory) {
      setSelectedCategory(defaultCategory);
    }
  }, [defaultCategory]);

  useEffect(() => {
    fetchEvents();
  }, [selectedCity, selectedCategory]);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const params = {
        city: selectedCity?.name,
        category: selectedCategory !== 'ALL' ? selectedCategory : undefined,
        limit: 20
      };
      const res = await api.get('/events', { params });
      setEvents(res.data?.data || []);
    } catch (err) {
      console.error('Failed to load events', err);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-brand-secondary uppercase tracking-wider mb-1">
            <Sparkles className="w-4 h-4" />
            <span>Live Experiences & Passes</span>
          </div>
          <h1 className="text-3xl font-extrabold font-display text-white tracking-tight">
            Events & Concerts in {selectedCity?.name}
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Live music festivals, arena tours, standup comedy, and sports matches
          </p>
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const isSelected = selectedCategory === cat.id;

          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-semibold whitespace-nowrap transition-all ${
                isSelected
                  ? 'bg-brand-secondary/20 border-brand-secondary text-white shadow-glow-rose'
                  : 'bg-dark-900 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* Events Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="rounded-2xl bg-dark-900 border border-slate-800 animate-pulse h-80" />
          ))}
        </div>
      ) : events.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event) => (
            <EventCard key={event._id} event={event} />
          ))}
        </div>
      ) : (
        <div className="py-20 text-center space-y-4 max-w-md mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-dark-900 border border-slate-800 flex items-center justify-center mx-auto text-slate-500">
            <Sparkles className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-white">No Events Found</h3>
          <p className="text-xs text-slate-400">
            No active events scheduled in {selectedCity?.name} for this category.
          </p>
          <button
            onClick={() => setSelectedCategory('ALL')}
            className="px-4 py-2 rounded-xl bg-brand-primary text-white text-xs font-semibold shadow-glow-primary"
          >
            Show All Events
          </button>
        </div>
      )}
    </div>
  );
}

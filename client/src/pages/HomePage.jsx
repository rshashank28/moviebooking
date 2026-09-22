import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useCityStore } from '../store/useCityStore';
import api from '../services/api';
import MovieCard from '../components/movies/MovieCard';
import EventCard from '../components/events/EventCard';
import {
  Film,
  Sparkles,
  MapPin,
  ArrowRight,
  ShieldCheck,
  Zap,
  Activity,
  Music,
  Trophy,
  Flame,
  ChevronRight
} from 'lucide-react';

export default function HomePage() {
  const { selectedCity, setModalOpen } = useCityStore();
  const [serverHealth, setServerHealth] = useState(null);
  const [movies, setMovies] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHomeData();
  }, [selectedCity]);

  const fetchHomeData = async () => {
    setLoading(true);
    try {
      const [healthRes, moviesRes, eventsRes] = await Promise.all([
        api.get('/health').catch(() => ({ data: { status: 'offline' } })),
        api.get('/movies', { params: { city: selectedCity?.name, limit: 4, sort: 'trending' } }).catch(() => ({ data: [] })),
        api.get('/events', { params: { city: selectedCity?.name, limit: 3 } }).catch(() => ({ data: [] }))
      ]);

      setServerHealth(healthRes.data);
      setMovies(moviesRes.data || []);
      setEvents(eventsRes.data || []);
    } catch (err) {
      console.error('Home data error', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-16 pb-20">
      {/* Hero Banner */}
      <section className="relative overflow-hidden pt-12 pb-20 px-4 sm:px-6 lg:px-8 border-b border-slate-800/80 bg-gradient-to-b from-dark-900 via-dark-950 to-dark-950">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-brand-primary/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/3 right-1/4 w-80 h-80 bg-brand-secondary/15 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto relative z-10 text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-primary/10 border border-brand-primary/30 text-indigo-400 text-xs font-semibold tracking-wide uppercase shadow-glow-primary">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Discover Top Experiences in {selectedCity?.name || 'Your City'}</span>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold font-display tracking-tight text-white max-w-4xl mx-auto leading-tight">
            Book Tickets for <br />
            <span className="text-gradient-primary">Movies, Concerts & Shows</span>
          </h1>

          <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Experience ultra-fast booking with real-time seat locking, instant QR passes, verified cinema schedules, and AI personalized recommendations.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <button
              onClick={() => setModalOpen(true)}
              className="flex items-center gap-2 px-6 py-3.5 rounded-xl bg-dark-900 border border-slate-700 hover:border-brand-primary text-white font-medium text-sm transition-all hover:shadow-glow-primary"
            >
              <MapPin className="w-4 h-4 text-brand-primary" />
              <span>Explore in {selectedCity?.name}</span>
            </button>
            <Link
              to="/movies"
              className="flex items-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-brand-primary to-brand-secondary hover:opacity-95 text-white font-semibold text-sm shadow-glow-primary transition-all"
            >
              <span>Explore Movies</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* System Status Indicator */}
          <div className="pt-8 flex items-center justify-center">
            <div className="inline-flex items-center gap-3 px-4 py-2 rounded-xl bg-dark-900/90 border border-slate-800 text-xs text-slate-400">
              <span className="flex items-center gap-1.5 font-medium">
                <Activity className="w-3.5 h-3.5 text-brand-primary animate-pulse" />
                API Core:
              </span>
              <span className="text-emerald-400 font-semibold">
                {serverHealth?.status === 'healthy' ? 'Active & Healthy' : 'Online'}
              </span>
              <span className="text-slate-600">|</span>
              <span className="text-slate-400">
                Lock Engine: <strong className="text-slate-200">{serverHealth?.redis || 'Ready'}</strong>
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Popular Categories Banner */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Link
            to="/movies"
            className="flex items-center gap-3.5 p-4 rounded-2xl glass-card border border-slate-800/80 hover:border-brand-primary hover:shadow-glow-primary transition-all group"
          >
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-brand-primary group-hover:scale-110 transition-transform">
              <Film className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-white text-sm">Movies</h4>
              <p className="text-[11px] text-slate-400 mt-0.5">Now Showing in {selectedCity?.name}</p>
            </div>
          </Link>

          <Link
            to="/events?category=CONCERTS"
            className="flex items-center gap-3.5 p-4 rounded-2xl glass-card border border-slate-800/80 hover:border-brand-secondary hover:shadow-glow-rose transition-all group"
          >
            <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 group-hover:scale-110 transition-transform">
              <Music className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-white text-sm">Concerts</h4>
              <p className="text-[11px] text-slate-400 mt-0.5">Live Music & Arenas</p>
            </div>
          </Link>

          <Link
            to="/comedy"
            className="flex items-center gap-3.5 p-4 rounded-2xl glass-card border border-slate-800/80 hover:border-amber-500 hover:shadow-glow-amber transition-all group"
          >
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-white text-sm">Comedy</h4>
              <p className="text-[11px] text-slate-400 mt-0.5">Standup Shows</p>
            </div>
          </Link>

          <Link
            to="/sports"
            className="flex items-center gap-3.5 p-4 rounded-2xl glass-card border border-slate-800/80 hover:border-emerald-500 transition-all group"
          >
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
              <Trophy className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-white text-sm">Sports</h4>
              <p className="text-[11px] text-slate-400 mt-0.5">Stadiums & Matches</p>
            </div>
          </Link>
        </div>
      </section>

      {/* Trending Movies Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-brand-secondary uppercase tracking-wider mb-1">
              <Flame className="w-4 h-4 text-brand-secondary" />
              <span>Trending in {selectedCity?.name}</span>
            </div>
            <h2 className="text-2xl font-bold font-display text-white">Recommended Movies</h2>
          </div>
          <Link
            to="/movies"
            className="text-xs font-semibold text-brand-primary hover:text-indigo-400 flex items-center gap-1"
          >
            <span>See All ({movies.length})</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="rounded-2xl bg-dark-900 border border-slate-800 animate-pulse h-96" />
            ))}
          </div>
        ) : movies.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
            {movies.map((movie) => (
              <MovieCard key={movie._id} movie={movie} />
            ))}
          </div>
        ) : (
          <div className="p-8 rounded-2xl glass-card border border-slate-800 text-center space-y-2">
            <p className="text-xs text-slate-400">No movies currently seeded in {selectedCity?.name}. Run `npm run seed` or choose another city.</p>
          </div>
        )}
      </section>

      {/* Popular Events & Live Concerts */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-1">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span>Unforgettable Nights</span>
            </div>
            <h2 className="text-2xl font-bold font-display text-white">Live Events & Concerts</h2>
          </div>
          <Link
            to="/events"
            className="text-xs font-semibold text-brand-primary hover:text-indigo-400 flex items-center gap-1"
          >
            <span>See All Events</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div key={n} className="rounded-2xl bg-dark-900 border border-slate-800 animate-pulse h-72" />
            ))}
          </div>
        ) : events.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {events.map((event) => (
              <EventCard key={event._id} event={event} />
            ))}
          </div>
        ) : (
          <div className="p-8 rounded-2xl glass-card border border-slate-800 text-center space-y-2">
            <p className="text-xs text-slate-400">No live events scheduled in {selectedCity?.name} right now.</p>
          </div>
        )}
      </section>
    </div>
  );
}

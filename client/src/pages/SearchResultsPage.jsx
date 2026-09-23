import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useCityStore } from '../store/useCityStore';
import api from '../services/api';
import MovieCard from '../components/movies/MovieCard';
import EventCard from '../components/events/EventCard';
import {
  Search,
  Film,
  Sparkles,
  MapPin,
  Calendar,
  ChevronRight,
  Filter
} from 'lucide-react';

export default function SearchResultsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { selectedCity } = useCityStore();

  const queryParam = searchParams.get('q') || '';
  const [searchTerm, setSearchTerm] = useState(queryParam);
  const [activeTab, setActiveTab] = useState('ALL');
  const [results, setResults] = useState({ movies: [], events: [], venues: [], totalResults: 0 });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setSearchTerm(queryParam);
    if (queryParam.trim()) {
      executeSearch(queryParam.trim());
    }
  }, [queryParam, selectedCity]);

  const executeSearch = async (term) => {
    setLoading(true);
    try {
      const res = await api.get('/search', {
        params: {
          q: term,
          city: selectedCity?.name
        }
      });
      setResults(res.data?.data || res.data);
    } catch (err) {
      console.error('Search error', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      setSearchParams({ q: searchTerm.trim() });
    }
  };

  const { movies = [], events = [], venues = [], totalResults = 0 } = results;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Search Header Form */}
      <div className="max-w-2xl mx-auto space-y-3 text-center">
        <h1 className="text-2xl sm:text-3xl font-bold font-display text-white">
          Search Results for <span className="text-brand-primary">"{queryParam}"</span>
        </h1>
        <p className="text-xs text-slate-400">
          Searching across movies, concerts, comedy specials, and venues in {selectedCity?.name}
        </p>

        <form onSubmit={handleSearchSubmit} className="relative mt-4">
          <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search movies, artists, venues..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-dark-900 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-brand-primary shadow-2xl"
          />
        </form>
      </div>

      {/* Tabs Filter */}
      <div className="flex items-center justify-center gap-2 border-b border-slate-800 pb-4">
        {[
          { id: 'ALL', label: `All (${totalResults})` },
          { id: 'MOVIES', label: `Movies (${movies.length})` },
          { id: 'EVENTS', label: `Events (${events.length})` },
          { id: 'VENUES', label: `Venues (${venues.length})` }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === tab.id
                ? 'bg-brand-primary text-white shadow-glow-primary'
                : 'bg-dark-900 border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Results Display */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="rounded-2xl bg-dark-900 border border-slate-800 animate-pulse h-80" />
          ))}
        </div>
      ) : totalResults > 0 ? (
        <div className="space-y-12">
          {/* Movies Section */}
          {(activeTab === 'ALL' || activeTab === 'MOVIES') && movies.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-bold text-white uppercase tracking-wider">
                <Film className="w-4 h-4 text-brand-primary" />
                <span>Matching Movies ({movies.length})</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                {movies.map((m) => (
                  <MovieCard key={m._id} movie={m} />
                ))}
              </div>
            </div>
          )}

          {/* Events Section */}
          {(activeTab === 'ALL' || activeTab === 'EVENTS') && events.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-bold text-white uppercase tracking-wider">
                <Sparkles className="w-4 h-4 text-brand-secondary" />
                <span>Matching Live Events ({events.length})</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                {events.map((e) => (
                  <EventCard key={e._id} event={e} />
                ))}
              </div>
            </div>
          )}

          {/* Venues Section */}
          {(activeTab === 'ALL' || activeTab === 'VENUES') && venues.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-bold text-white uppercase tracking-wider">
                <MapPin className="w-4 h-4 text-emerald-400" />
                <span>Matching Theaters & Venues ({venues.length})</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {venues.map((v) => (
                  <div key={v._id} className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-2">
                    <h3 className="font-bold text-white text-base">{v.name}</h3>
                    <p className="text-xs text-slate-400 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-500" />
                      <span>{v.address}, {v.city}</span>
                    </p>
                    <div className="flex flex-wrap gap-1 pt-1">
                      {v.amenities?.map((am) => (
                        <span key={am} className="px-2 py-0.5 rounded bg-dark-900 border border-slate-800 text-[10px] text-slate-400">
                          {am}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="py-20 text-center space-y-3 max-w-md mx-auto">
          <Search className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="text-lg font-bold text-white">No Results Found</h3>
          <p className="text-xs text-slate-400">
            We couldn't find any movies, events, or cinemas matching "{queryParam}". Try searching by another keyword.
          </p>
        </div>
      )}
    </div>
  );
}

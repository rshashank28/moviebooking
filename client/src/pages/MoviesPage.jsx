import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useCityStore } from '../store/useCityStore';
import api from '../services/api';
import MovieCard from '../components/movies/MovieCard';
import { Film, Filter, SlidersHorizontal, Sparkles } from 'lucide-react';

const GENRES = ['All', 'Action', 'Sci-Fi', 'Drama', 'Comedy', 'Thriller', 'Horror', 'Adventure'];
const LANGUAGES = ['All', 'Hindi', 'English', 'Telugu', 'Tamil', 'Malayalam'];
const FORMATS = ['All', '2D', '3D', 'IMAX 3D', '4DX', 'Dolby Cinema'];

export default function MoviesPage() {
  const { selectedCity } = useCityStore();
  const [searchParams, setSearchParams] = useSearchParams();

  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedGenre, setSelectedGenre] = useState(searchParams.get('genre') || 'All');
  const [selectedLanguage, setSelectedLanguage] = useState(searchParams.get('language') || 'All');
  const [selectedFormat, setSelectedFormat] = useState(searchParams.get('format') || 'All');
  const [status, setStatus] = useState('NOW_SHOWING');
  const [sortBy, setSortBy] = useState('trending');

  useEffect(() => {
    fetchMovies();
  }, [selectedCity, selectedGenre, selectedLanguage, selectedFormat, status, sortBy]);

  const fetchMovies = async () => {
    setLoading(true);
    try {
      const params = {
        city: selectedCity?.name,
        status: status === 'ALL' ? undefined : status,
        genre: selectedGenre !== 'All' ? selectedGenre : undefined,
        language: selectedLanguage !== 'All' ? selectedLanguage : undefined,
        format: selectedFormat !== 'All' ? selectedFormat : undefined,
        sort: sortBy,
        limit: 20
      };

      const res = await api.get('/movies', { params });
      setMovies(res.data || []);
    } catch (err) {
      console.error('Failed to load movies', err);
      setMovies([]);
    } finally {
      setLoading(false);
    }
  };

  const resetFilters = () => {
    setSelectedGenre('All');
    setSelectedLanguage('All');
    setSelectedFormat('All');
    setStatus('NOW_SHOWING');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-brand-primary uppercase tracking-wider mb-1">
            <Film className="w-4 h-4" />
            <span>Cinema in {selectedCity?.name}</span>
          </div>
          <h1 className="text-3xl font-extrabold font-display text-white tracking-tight">
            Movies in {selectedCity?.name}
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Discover verified schedules, IMAX releases, and reserved seating
          </p>
        </div>

        {/* Status Switcher Tabs (Now Showing vs Upcoming) */}
        <div className="flex items-center gap-2 bg-dark-900 p-1.5 rounded-xl border border-slate-800">
          <button
            onClick={() => setStatus('NOW_SHOWING')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              status === 'NOW_SHOWING'
                ? 'bg-brand-primary text-white shadow-glow-primary'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Now Showing
          </button>
          <button
            onClick={() => setStatus('UPCOMING')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              status === 'UPCOMING'
                ? 'bg-brand-primary text-white shadow-glow-primary'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Upcoming Releases
          </button>
        </div>
      </div>

      {/* Filter & Sort Strip */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-dark-900/60 border border-slate-800/80">
        <div className="flex flex-wrap items-center gap-2">
          {/* Genre Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
            {GENRES.map((g) => (
              <button
                key={g}
                onClick={() => setSelectedGenre(g)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  selectedGenre === g
                    ? 'bg-brand-primary/20 text-brand-primary border border-brand-primary/40 font-semibold'
                    : 'bg-dark-850 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        {/* Language & Sort Selects */}
        <div className="flex items-center gap-3">
          <select
            value={selectedLanguage}
            onChange={(e) => setSelectedLanguage(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-dark-850 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-brand-primary"
          >
            {LANGUAGES.map((l) => (
              <option key={l} value={l}>Language: {l}</option>
            ))}
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-dark-850 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-brand-primary"
          >
            <option value="trending">Sort: Trending</option>
            <option value="rating">Sort: Top Rated</option>
            <option value="releaseDate">Sort: Release Date</option>
          </select>
        </div>
      </div>

      {/* Movies Grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
            <div key={n} className="rounded-2xl bg-dark-900 border border-slate-800 animate-pulse h-96" />
          ))}
        </div>
      ) : movies.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
          {movies.map((movie) => (
            <MovieCard key={movie._id} movie={movie} />
          ))}
        </div>
      ) : (
        <div className="py-20 text-center space-y-4 max-w-md mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-dark-900 border border-slate-800 flex items-center justify-center mx-auto text-slate-500">
            <Film className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-white">No Movies Found</h3>
          <p className="text-xs text-slate-400">
            No movies match your active filters in {selectedCity?.name}. Try changing your filters.
          </p>
          <button
            onClick={resetFilters}
            className="px-4 py-2 rounded-xl bg-brand-primary text-white text-xs font-semibold shadow-glow-primary"
          >
            Reset Filters
          </button>
        </div>
      )}
    </div>
  );
}

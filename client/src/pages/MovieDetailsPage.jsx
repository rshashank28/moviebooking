import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useCityStore } from '../store/useCityStore';
import api from '../services/api';
import ReviewSection from '../components/reviews/ReviewSection';
import {
  Star,
  Clock,
  Calendar,
  MapPin,
  Play,
  Heart,
  Share2,
  Sparkles,
  Film,
  X,
  Info,
  ChevronRight
} from 'lucide-react';

export default function MovieDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { selectedCity } = useCityStore();

  const [movieData, setMovieData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState('');
  const [showTrailerModal, setShowTrailerModal] = useState(false);

  useEffect(() => {
    fetchMovieDetails();
  }, [id, selectedCity, selectedDate]);

  const fetchMovieDetails = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/movies/${id}`, {
        params: {
          city: selectedCity?.name,
          date: selectedDate || undefined
        }
      });
      setMovieData(res.data);
      if (!selectedDate && res.data?.availableDates?.length > 0) {
        setSelectedDate(res.data.availableDates[0]);
      }
    } catch (err) {
      console.error('Failed to load movie details', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !movieData) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <div className="inline-block w-8 h-8 border-4 border-brand-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-slate-400 mt-2">Loading showtimes and cinema schedules...</p>
      </div>
    );
  }

  const movie = movieData?.movie;
  const venues = movieData?.venues || [];
  const availableDates = movieData?.availableDates || [];

  if (!movie) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center space-y-4">
        <h2 className="text-2xl font-bold text-white">Movie Not Found</h2>
        <Link to="/movies" className="px-4 py-2 bg-brand-primary rounded-xl text-white text-xs font-semibold">
          Back to Movies
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-20">
      {/* Hero Backdrop & Details */}
      <div className="relative min-h-[480px] bg-dark-950 overflow-hidden border-b border-slate-800">
        {/* Banner Background with Gradient */}
        <div className="absolute inset-0">
          <img
            src={movie.banner || movie.poster}
            alt={movie.title}
            className="w-full h-full object-cover object-center opacity-25 filter blur-sm scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-dark-950 via-dark-950/80 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-dark-950 via-dark-950/70 to-transparent" />
        </div>

        {/* Content Container */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 relative z-10">
          <div className="flex flex-col md:flex-row gap-8 items-start">
            {/* Poster */}
            <div className="w-56 sm:w-64 shrink-0 rounded-2xl overflow-hidden shadow-2xl border border-slate-700/80 bg-dark-900 aspect-[2/3] relative group">
              <img
                src={movie.poster}
                alt={movie.title}
                className="w-full h-full object-cover"
              />
              {movie.trailerUrl && (
                <button
                  onClick={() => setShowTrailerModal(true)}
                  className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 text-white text-xs font-semibold"
                >
                  <div className="w-12 h-12 rounded-full bg-brand-primary flex items-center justify-center shadow-glow-primary">
                    <Play className="w-6 h-6 fill-white text-white ml-0.5" />
                  </div>
                  <span>Watch Trailer</span>
                </button>
              )}
            </div>

            {/* Info Body */}
            <div className="flex-1 space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-dark-900 border border-slate-700 text-amber-400 flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  {movie.rating ? movie.rating.toFixed(1) : '8.5'}/10 ({movie.reviewCount || '1.2k'} Votes)
                </span>
                <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-dark-900 border border-slate-700 text-slate-300">
                  {movie.ageRating || 'UA'}
                </span>
                {movie.formats?.map((fmt) => (
                  <span key={fmt} className="px-2 py-0.5 rounded text-[10px] font-semibold bg-brand-primary/20 text-indigo-300 border border-brand-primary/30">
                    {fmt}
                  </span>
                ))}
              </div>

              <h1 className="text-3xl sm:text-5xl font-extrabold font-display text-white tracking-tight leading-tight">
                {movie.title}
              </h1>

              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-brand-primary" />
                  {Math.floor(movie.duration / 60)}h {movie.duration % 60}m
                </span>
                <span>&bull;</span>
                <span>{movie.genres?.join(', ')}</span>
                <span>&bull;</span>
                <span>{movie.languages?.join(', ')}</span>
                <span>&bull;</span>
                <span>
                  Released {new Date(movie.releaseDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <a
                  href="#showtimes"
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-brand-primary to-indigo-600 hover:from-indigo-500 hover:to-indigo-700 text-white font-semibold text-xs shadow-glow-primary transition-all"
                >
                  Book Tickets in {selectedCity?.name}
                </a>

                {movie.trailerUrl && (
                  <button
                    onClick={() => setShowTrailerModal(true)}
                    className="flex items-center gap-2 px-5 py-3 rounded-xl bg-dark-900/80 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-semibold transition-colors"
                  >
                    <Play className="w-4 h-4 text-brand-secondary fill-brand-secondary" />
                    <span>Watch Trailer</span>
                  </button>
                )}
              </div>

              {/* Synopsis */}
              <div className="pt-4 border-t border-slate-800/80 max-w-3xl">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  About the Movie
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  {movie.description}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cast & Crew Carousel / Grid */}
      {movie.cast?.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
          <h2 className="text-xl font-bold font-display text-white">Cast & Crew</h2>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-4">
            {movie.cast.map((person, idx) => (
              <div key={idx} className="glass-card p-3 rounded-xl border border-slate-800 text-center space-y-2">
                <div className="w-14 h-14 mx-auto rounded-full bg-dark-850 border border-slate-700 flex items-center justify-center font-bold text-white text-base">
                  {person.name[0]}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white line-clamp-1">{person.name}</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">{person.role || 'Actor'}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Verified Reviews Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <ReviewSection itemType="MOVIE" itemId={movie._id} itemTitle={movie.title} />
      </section>

      {/* Showtimes & Cinemas Section */}
      <section id="showtimes" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 pt-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <h2 className="text-2xl font-bold font-display text-white">
              Select Showtime in {selectedCity?.name}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Choose your cinema, auditorium format, and time slot
            </p>
          </div>
        </div>

        {/* Date Selector Strip */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {availableDates.length > 0 ? (
            availableDates.map((dateStr) => {
              const d = new Date(dateStr);
              const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
              const dayNum = d.toLocaleDateString('en-US', { day: 'numeric' });
              const monthName = d.toLocaleDateString('en-US', { month: 'short' });
              const isSelected = selectedDate === dateStr;

              return (
                <button
                  key={dateStr}
                  onClick={() => setSelectedDate(dateStr)}
                  className={`flex flex-col items-center min-w-[70px] p-2.5 rounded-xl border transition-all ${
                    isSelected
                      ? 'bg-brand-primary text-white border-brand-primary shadow-glow-primary font-bold'
                      : 'bg-dark-900/80 border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white'
                  }`}
                >
                  <span className="text-[10px] uppercase tracking-wider">{dayName}</span>
                  <span className="text-base font-extrabold">{dayNum}</span>
                  <span className="text-[10px] uppercase">{monthName}</span>
                </button>
              );
            })
          ) : (
            <div className="text-xs text-slate-400 py-2">
              No shows scheduled currently in {selectedCity?.name}. Try selecting another city.
            </div>
          )}
        </div>

        {/* Venues & Showtimes List */}
        <div className="space-y-4">
          {venues.length > 0 ? (
            venues.map(({ venue, shows }) => (
              <div
                key={venue._id}
                className="glass-panel rounded-2xl p-5 border border-slate-800/90 space-y-4 hover:border-slate-700 transition-colors"
              >
                {/* Venue Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <span>{venue.name}</span>
                    </h3>
                    <p className="text-xs text-slate-400 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-500" />
                      <span>{venue.address}</span>
                    </p>
                  </div>

                  {/* Amenities */}
                  <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                    {venue.amenities?.map((am) => (
                      <span key={am} className="px-2 py-0.5 rounded bg-dark-900 border border-slate-800 text-slate-400">
                        {am}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Showtimes Grid */}
                <div className="pt-2 border-t border-slate-800/60 flex flex-wrap items-center gap-3">
                  {shows.map((show) => {
                    const minPrice = show.priceTiers?.length
                      ? Math.min(...show.priceTiers.map((p) => p.price))
                      : 180;

                    return (
                      <button
                        key={show._id}
                        onClick={() => navigate(`/shows/${show._id}`)}
                        className="group flex flex-col items-center justify-center min-w-[100px] p-2.5 rounded-xl bg-dark-900 hover:bg-brand-primary/20 border border-slate-800 hover:border-brand-primary transition-all text-center"
                      >
                        <span className="text-sm font-bold text-white group-hover:text-brand-primary transition-colors">
                          {show.startTime}
                        </span>
                        <span className="text-[10px] text-indigo-300 font-semibold mt-0.5">
                          {show.format} &bull; {show.language}
                        </span>
                        <span className="text-[9px] text-slate-500 mt-1">
                          from ₹{minPrice}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          ) : (
            <div className="py-12 text-center space-y-3 glass-panel rounded-2xl border border-slate-800">
              <Film className="w-10 h-10 text-slate-600 mx-auto" />
              <h4 className="text-base font-bold text-white">No Showtimes Found</h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                There are no scheduled showtimes for {movie.title} in {selectedCity?.name} on {selectedDate}.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Trailer Modal */}
      {showTrailerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
          <div className="w-full max-w-4xl bg-dark-950 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl relative">
            <div className="flex items-center justify-between p-4 border-b border-slate-800">
              <span className="text-sm font-bold text-white">{movie.title} - Official Trailer</span>
              <button
                onClick={() => setShowTrailerModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="aspect-video bg-black flex items-center justify-center">
              <div className="text-center p-8 space-y-3">
                <Play className="w-12 h-12 text-brand-primary mx-auto" />
                <p className="text-sm text-slate-300 font-medium">Trailer Preview Player</p>
                <p className="text-xs text-slate-500">HD 4K Dolby Cinema Master Stream</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

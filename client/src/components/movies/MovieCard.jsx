import React from 'react';
import { Link } from 'react-router-dom';
import { Star, Clock, Film } from 'lucide-react';

export default function MovieCard({ movie }) {
  if (!movie) return null;

  return (
    <Link
      to={`/movies/${movie.slug || movie._id}`}
      className="group flex flex-col glass-card rounded-2xl overflow-hidden border border-slate-800/80 hover:border-slate-700 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1.5"
    >
      {/* Poster */}
      <div className="relative aspect-[2/3] w-full overflow-hidden bg-dark-900">
        <img
          src={movie.poster}
          alt={movie.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
          onError={(e) => {
            e.target.src = 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=800&auto=format&fit=crop';
          }}
        />

        {/* Rating Badge */}
        <div className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-dark-950/85 backdrop-blur-md border border-slate-800 text-xs font-bold text-amber-400 flex items-center gap-1 shadow-lg">
          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
          <span>{movie.rating ? movie.rating.toFixed(1) : '8.5'}/10</span>
          {movie.reviewCount > 0 && (
            <span className="text-[10px] text-slate-400 font-normal">
              ({movie.reviewCount > 1000 ? `${(movie.reviewCount / 1000).toFixed(1)}k` : movie.reviewCount})
            </span>
          )}
        </div>

        {/* Age Rating & Format Pill */}
        <div className="absolute bottom-3 right-3 flex items-center gap-1.5">
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-dark-950/80 text-slate-300 border border-slate-700">
            {movie.ageRating || 'UA'}
          </span>
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-brand-primary/80 text-white shadow-glow-primary">
            {movie.formats?.[0] || '2D'}
          </span>
        </div>
      </div>

      {/* Info Body */}
      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
        <div>
          <h3 className="font-bold text-white text-base leading-snug group-hover:text-brand-primary transition-colors line-clamp-1">
            {movie.title}
          </h3>
          <p className="text-xs text-slate-400 mt-1 line-clamp-1">
            {movie.genres?.join(', ') || 'Action, Drama'}
          </p>
          <div className="flex items-center gap-2 mt-2 text-[11px] text-slate-500 font-medium">
            <span>{movie.languages?.join(', ') || 'Hindi'}</span>
            <span>&bull;</span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-slate-500" />
              {Math.floor(movie.duration / 60)}h {movie.duration % 60}m
            </span>
          </div>
        </div>

        <button className="w-full py-2.5 rounded-xl bg-dark-850 hover:bg-brand-primary text-white text-xs font-semibold transition-all border border-slate-700/80 hover:border-transparent group-hover:shadow-glow-primary">
          Book Tickets
        </button>
      </div>
    </Link>
  );
}

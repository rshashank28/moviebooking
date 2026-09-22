import React from 'react';
import { Link } from 'react-router-dom';
import { Film, Home } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="text-center space-y-6 max-w-md">
        <div className="w-20 h-20 mx-auto rounded-3xl bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center text-brand-primary shadow-glow-primary">
          <Film className="w-10 h-10" />
        </div>
        <div className="space-y-2">
          <h1 className="text-5xl font-extrabold font-display text-white">404</h1>
          <h2 className="text-xl font-semibold text-slate-200">Page Not Found</h2>
          <p className="text-xs text-slate-400">
            The page or show you are looking for doesn't exist or has been moved.
          </p>
        </div>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-primary hover:bg-indigo-600 text-white font-semibold text-xs shadow-glow-primary transition-all"
        >
          <Home className="w-4 h-4" />
          <span>Back to Home</span>
        </Link>
      </div>
    </div>
  );
}

import React from 'react';
import { Link } from 'react-router-dom';
import { Film, ShieldCheck, Zap, Headphones, Heart } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-dark-950 border-t border-slate-900 mt-20 pt-16 pb-12 text-slate-400 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Value Props Bar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pb-12 border-b border-slate-800/80">
          <div className="flex items-center gap-4 p-4 rounded-2xl bg-dark-900/60 border border-slate-800/60">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-brand-primary shrink-0">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-semibold text-white text-sm">Real-time Seat Locking</h4>
              <p className="text-slate-400 mt-0.5">Instant 10-minute hold with zero double bookings.</p>
            </div>
          </div>

          <div className="flex items-center gap-4 p-4 rounded-2xl bg-dark-900/60 border border-slate-800/60">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-semibold text-white text-sm">100% Secure Checkout</h4>
              <p className="text-slate-400 mt-0.5">Encrypted payments with instant QR digital tickets.</p>
            </div>
          </div>

          <div className="flex items-center gap-4 p-4 rounded-2xl bg-dark-900/60 border border-slate-800/60">
            <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shrink-0">
              <Headphones className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-semibold text-white text-sm">24x7 Customer Support</h4>
              <p className="text-slate-400 mt-0.5">Instant booking cancellations and automated refunds.</p>
            </div>
          </div>
        </div>

        {/* Links Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 py-12">
          <div>
            <h5 className="font-semibold text-white uppercase tracking-wider text-[11px] mb-4">
              Movies by City
            </h5>
            <ul className="space-y-2">
              <li><Link to="/movies?city=patna" className="hover:text-white transition-colors">Movies in Patna</Link></li>
              <li><Link to="/movies?city=delhi-ncr" className="hover:text-white transition-colors">Movies in Delhi-NCR</Link></li>
              <li><Link to="/movies?city=mumbai" className="hover:text-white transition-colors">Movies in Mumbai</Link></li>
              <li><Link to="/movies?city=bangalore" className="hover:text-white transition-colors">Movies in Bengaluru</Link></li>
              <li><Link to="/movies?city=hyderabad" className="hover:text-white transition-colors">Movies in Hyderabad</Link></li>
            </ul>
          </div>

          <div>
            <h5 className="font-semibold text-white uppercase tracking-wider text-[11px] mb-4">
              Experience & Categories
            </h5>
            <ul className="space-y-2">
              <li><Link to="/events" className="hover:text-white transition-colors">Live Music & Concerts</Link></li>
              <li><Link to="/comedy" className="hover:text-white transition-colors">Standup Comedy</Link></li>
              <li><Link to="/sports" className="hover:text-white transition-colors">Cricket & Sports</Link></li>
              <li><Link to="/theatre" className="hover:text-white transition-colors">Theatre & Drama</Link></li>
              <li><Link to="/offers" className="hover:text-white transition-colors">Coupons & Rewards</Link></li>
            </ul>
          </div>

          <div>
            <h5 className="font-semibold text-white uppercase tracking-wider text-[11px] mb-4">
              Organizer & Partner
            </h5>
            <ul className="space-y-2">
              <li><Link to="/organizer" className="hover:text-white transition-colors">Organizer Portal</Link></li>
              <li><Link to="/corporate" className="hover:text-white transition-colors">List Your Event</Link></li>
              <li><Link to="/venues" className="hover:text-white transition-colors">Register Venue / Cinema</Link></li>
              <li><Link to="/api-docs" className="hover:text-white transition-colors">Developer APIs</Link></li>
            </ul>
          </div>

          <div>
            <h5 className="font-semibold text-white uppercase tracking-wider text-[11px] mb-4">
              Platform & Legal
            </h5>
            <ul className="space-y-2">
              <li><Link to="/about" className="hover:text-white transition-colors">About ShowPulse</Link></li>
              <li><Link to="/terms" className="hover:text-white transition-colors">Terms of Service</Link></li>
              <li><Link to="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
              <li><Link to="/cancellation" className="hover:text-white transition-colors">Refund & Cancellation</Link></li>
            </ul>
          </div>
        </div>

        {/* Bottom copyright */}
        <div className="pt-8 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Film className="w-4 h-4 text-brand-primary" />
            <span className="font-semibold text-white font-display">ShowPulse</span>
            <span>&copy; {new Date().getFullYear()} ShowPulse Inc. All rights reserved.</span>
          </div>

          <div className="flex items-center gap-1 text-slate-500">
            <span>Engineered with</span>
            <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
            <span>for high-throughput live ticketing.</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

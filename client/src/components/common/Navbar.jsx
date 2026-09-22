import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useCityStore } from '../../store/useCityStore';
import { useAuthStore } from '../../store/useAuthStore';
import {
  Film,
  MapPin,
  Search,
  User,
  Sparkles,
  ChevronDown,
  Menu,
  X,
  Ticket,
  LogOut,
  Shield,
  Briefcase
} from 'lucide-react';

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedCity, setModalOpen } = useCityStore();
  const { user, isAuthenticated, logout, openAuthModal } = useAuthStore();
  
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setMobileMenuOpen(false);
    }
  };

  const navLinks = [
    { label: 'Movies', path: '/movies', icon: Film },
    { label: 'Events & Concerts', path: '/events', icon: Sparkles },
    { label: 'Sports', path: '/sports' },
    { label: 'Plays & Comedy', path: '/comedy' },
    { label: 'Offers', path: '/offers' },
  ];

  return (
    <header className="sticky top-0 z-40 w-full glass-panel border-b border-slate-800/80">
      {/* Top Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo & City Selector */}
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-primary to-brand-secondary flex items-center justify-center shadow-glow-primary group-hover:scale-105 transition-transform">
                <Film className="w-5 h-5 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-bold font-display tracking-tight text-white flex items-center gap-1">
                  Show<span className="text-brand-secondary">Pulse</span>
                </span>
                <span className="text-[10px] text-slate-400 font-medium tracking-wider uppercase -mt-1">
                  Tickets & Events
                </span>
              </div>
            </Link>

            {/* City Selector Button */}
            <button
              onClick={() => setModalOpen(true)}
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-dark-900/80 hover:bg-slate-800 border border-slate-800 text-xs font-medium text-slate-300 hover:text-white transition-colors"
            >
              <MapPin className="w-3.5 h-3.5 text-brand-primary" />
              <span>{selectedCity?.name || 'Select City'}</span>
              <ChevronDown className="w-3 h-3 text-slate-500" />
            </button>
          </div>

          {/* Search Input */}
          <form
            onSubmit={handleSearchSubmit}
            className="hidden md:flex flex-1 max-w-md relative"
          >
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search for Movies, Events, Plays, Sports and Activities..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-dark-900 border border-slate-800 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all"
            />
          </form>

          {/* Right Action Controls */}
          <div className="flex items-center gap-3">
            {/* City Selector Button (Mobile) */}
            <button
              onClick={() => setModalOpen(true)}
              className="flex md:hidden items-center gap-1 px-2.5 py-1.5 rounded-lg bg-dark-900 border border-slate-800 text-xs text-slate-300"
            >
              <MapPin className="w-3.5 h-3.5 text-brand-primary" />
              <span>{selectedCity?.name || 'City'}</span>
            </button>

            {/* Auth / Profile Area */}
            {isAuthenticated && user ? (
              <div className="relative">
                <button
                  onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                  className="flex items-center gap-2 p-1.5 pr-3 rounded-full bg-dark-900 border border-slate-700/80 hover:border-brand-primary transition-all text-xs text-slate-200"
                >
                  <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-indigo-500 to-rose-500 flex items-center justify-center font-bold text-white text-xs">
                    {user.name ? user.name[0].toUpperCase() : 'U'}
                  </div>
                  <span className="hidden sm:inline font-medium max-w-[100px] truncate">
                    {user.name}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {/* Profile Dropdown */}
                {profileDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 glass-dropdown rounded-xl shadow-2xl py-2 border border-slate-800 animate-fade-in z-50">
                    <div className="px-4 py-2 border-b border-slate-800">
                      <p className="text-xs text-slate-400">Signed in as</p>
                      <p className="text-sm font-semibold text-white truncate">{user.email}</p>
                      <span className="inline-block mt-1 px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase rounded bg-brand-primary/20 text-indigo-300">
                        {user.role || 'CUSTOMER'}
                      </span>
                    </div>

                    <Link
                      to="/dashboard"
                      onClick={() => setProfileDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-xs text-slate-300 hover:bg-slate-800/80 hover:text-white"
                    >
                      <User className="w-4 h-4 text-slate-400" />
                      My Profile & Bookings
                    </Link>

                    {user.role === 'ORGANIZER' && (
                      <Link
                        to="/organizer"
                        onClick={() => setProfileDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-xs text-amber-300 hover:bg-amber-950/30"
                      >
                        <Briefcase className="w-4 h-4 text-amber-400" />
                        Organizer Portal
                      </Link>
                    )}

                    {user.role === 'ADMIN' && (
                      <Link
                        to="/admin"
                        onClick={() => setProfileDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-xs text-rose-300 hover:bg-rose-950/30"
                      >
                        <Shield className="w-4 h-4 text-rose-400" />
                        Admin Control Center
                      </Link>
                    )}

                    <div className="border-t border-slate-800 mt-1 pt-1">
                      <button
                        onClick={() => {
                          logout();
                          setProfileDropdownOpen(false);
                        }}
                        className="flex items-center gap-2.5 w-full px-4 py-2 text-xs text-rose-400 hover:bg-rose-950/20 text-left"
                      >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => openAuthModal('login')}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-brand-primary to-indigo-600 hover:from-indigo-500 hover:to-indigo-700 text-white text-xs font-semibold shadow-glow-primary transition-all transform active:scale-95"
              >
                Sign In
              </button>
            )}

            {/* Mobile Menu Toggle Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg bg-dark-900 border border-slate-800 text-slate-300 hover:text-white"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Secondary Category Navigation (Desktop) */}
      <div className="hidden md:block bg-dark-900/60 border-t border-slate-800/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-11 text-xs font-medium">
            <div className="flex items-center gap-6">
              {navLinks.map((link) => {
                const isActive = location.pathname.startsWith(link.path);
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    className={`transition-colors py-2 flex items-center gap-1.5 ${
                      isActive
                        ? 'text-brand-primary font-semibold border-b-2 border-brand-primary'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    {link.icon && <link.icon className="w-3.5 h-3.5" />}
                    <span>{link.label}</span>
                  </Link>
                );
              })}
            </div>

            <div className="flex items-center gap-4 text-slate-400">
              <Link to="/corporate" className="hover:text-slate-200 transition-colors">
                List Your Event
              </Link>
              <Link to="/offers" className="text-amber-400 hover:text-amber-300 flex items-center gap-1 transition-colors">
                <Sparkles className="w-3.5 h-3.5" />
                Special Offers
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Menu (Overlay) */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-800 bg-dark-950 p-4 space-y-4">
          <form onSubmit={handleSearchSubmit} className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search movies, events..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-dark-900 border border-slate-800 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-primary"
            />
          </form>

          <div className="grid grid-cols-2 gap-2 pt-2">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 p-3 rounded-xl bg-dark-900 border border-slate-800/80 text-xs font-medium text-slate-200 hover:border-brand-primary"
              >
                {link.icon && <link.icon className="w-4 h-4 text-brand-primary" />}
                <span>{link.label}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}

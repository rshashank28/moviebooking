import React, { useState } from 'react';
import { useCityStore, CITIES } from '../../store/useCityStore';
import { MapPin, Search, X, Check } from 'lucide-react';

export default function CitySelectorModal() {
  const { isModalOpen, setModalOpen, selectedCity, setCity } = useCityStore();
  const [searchQuery, setSearchQuery] = useState('');

  if (!isModalOpen) return null;

  const filteredCities = CITIES.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.state.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const popularCities = CITIES.filter((c) => c.isPopular);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="glass-dropdown w-full max-w-2xl rounded-2xl border border-slate-700/60 p-6 shadow-2xl relative">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2 text-white font-semibold text-lg">
            <MapPin className="w-5 h-5 text-brand-primary" />
            <span>Select Your City</span>
          </div>
          <button
            onClick={() => setModalOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="mt-4 relative">
          <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search for your city (e.g. Patna, Mumbai, Bangalore)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 rounded-xl bg-dark-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-brand-primary transition-colors text-sm"
            autoFocus
          />
        </div>

        {/* Popular Cities */}
        {!searchQuery && (
          <div className="mt-6">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
              Popular Cities
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {popularCities.map((city) => {
                const isSelected = selectedCity.id === city.id;
                return (
                  <button
                    key={city.id}
                    onClick={() => setCity(city)}
                    className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                      isSelected
                        ? 'bg-brand-primary/20 border-brand-primary text-white shadow-glow-primary'
                        : 'bg-dark-850/70 border-slate-800 text-slate-300 hover:border-slate-600 hover:text-white'
                    }`}
                  >
                    <span>{city.name}</span>
                    {isSelected && <Check className="w-4 h-4 text-brand-primary" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* All Cities / Search Results */}
        <div className="mt-6">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
            {searchQuery ? 'Search Results' : 'All Cities'}
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-56 overflow-y-auto pr-1">
            {filteredCities.map((city) => {
              const isSelected = selectedCity.id === city.id;
              return (
                <button
                  key={city.id}
                  onClick={() => setCity(city)}
                  className={`flex items-center justify-between px-3.5 py-2 rounded-lg text-sm text-left transition-colors ${
                    isSelected
                      ? 'bg-brand-primary/20 text-brand-primary font-semibold'
                      : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                  }`}
                >
                  <div>
                    <p>{city.name}</p>
                    <p className="text-xs text-slate-500">{city.state}</p>
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-brand-primary shrink-0" />}
                </button>
              );
            })}
            {filteredCities.length === 0 && (
              <div className="col-span-full py-8 text-center text-slate-500 text-sm">
                No cities found matching "{searchQuery}"
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

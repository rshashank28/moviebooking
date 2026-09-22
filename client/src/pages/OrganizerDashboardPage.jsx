import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useAuthStore } from '../store/useAuthStore';
import { useToastStore } from '../store/useToastStore';
import {
  Briefcase,
  Plus,
  TrendingUp,
  Ticket,
  Calendar,
  DollarSign,
  Download,
  Users,
  Sparkles,
  MapPin,
  Clock,
  X,
  CheckCircle2
} from 'lucide-react';

export default function OrganizerDashboardPage() {
  const { user, isAuthenticated, openAuthModal } = useAuthStore();
  const { success, error: toastError } = useToastStore();

  const [stats, setStats] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // New Event Form State
  const [formData, setFormData] = useState({
    title: '',
    category: 'CONCERTS',
    artist: '',
    venueName: '',
    address: '',
    city: 'Patna',
    date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    startTime: '07:00 PM',
    endTime: '10:00 PM',
    capacity: 300,
    poster: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?q=80&w=800&auto=format&fit=crop',
    description: '',
    ticketCategories: [
      { name: 'Standard Pass', price: 499, capacity: 200, soldCount: 0, description: 'General access' },
      { name: 'VIP Pass', price: 1499, capacity: 100, soldCount: 0, description: 'Front rows & lounge access' }
    ]
  });

  useEffect(() => {
    if (!isAuthenticated) {
      openAuthModal('login');
      return;
    }
    fetchOrganizerData();
  }, [isAuthenticated]);

  const fetchOrganizerData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/organizer/stats');
      setStats(res.data.stats);
      setEvents(res.data.events || []);
    } catch (err) {
      console.error('Failed to load organizer stats', err);
      toastError(err.message || 'Access restricted to Organizer accounts');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/organizer/events', formData);
      success('Event published successfully!');
      setShowCreateModal(false);
      fetchOrganizerData();
    } catch (err) {
      toastError(err.message || 'Failed to publish event');
    } finally {
      setSubmitting(false);
    }
  };

  const handleExportCSV = async () => {
    try {
      const response = await fetch('/api/organizer/export-csv', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`
        }
      });
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `showpulse_sales_report_${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      success('Sales report CSV downloaded!');
    } catch (err) {
      toastError('Failed to export CSV');
    }
  };

  if (!isAuthenticated || (user?.role !== 'ORGANIZER' && user?.role !== 'ADMIN')) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-4">
        <Briefcase className="w-12 h-12 text-amber-400 mx-auto" />
        <h2 className="text-xl font-bold text-white">Organizer Portal Access</h2>
        <p className="text-xs text-slate-400">
          This portal is reserved for event organizers and cinema partners.
        </p>
        <button
          onClick={() => openAuthModal('register')}
          className="px-6 py-2.5 rounded-xl bg-brand-primary text-white text-xs font-semibold shadow-glow-primary"
        >
          Register as Organizer
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-400 uppercase tracking-wider mb-1">
            <Briefcase className="w-4 h-4" />
            <span>Organizer Management Portal</span>
          </div>
          <h1 className="text-3xl font-extrabold font-display text-white tracking-tight">
            Event Performance & Revenue Analytics
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-dark-900 border border-slate-700 hover:border-slate-500 text-xs font-semibold text-white transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-dark-950 font-bold text-xs shadow-glow-amber transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Event</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs uppercase font-bold tracking-wider">Total Revenue</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <h3 className="text-2xl font-extrabold text-white">
            ₹{stats?.totalRevenue?.toLocaleString() || 0}
          </h3>
          <p className="text-[10px] text-emerald-400 font-semibold">100% verified payouts</p>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs uppercase font-bold tracking-wider">Tickets Sold</span>
            <Ticket className="w-4 h-4 text-brand-primary" />
          </div>
          <h3 className="text-2xl font-extrabold text-white">
            {stats?.totalTicketsSold || 0}
          </h3>
          <p className="text-[10px] text-slate-400">Across all active passes</p>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs uppercase font-bold tracking-wider">Active Events</span>
            <Calendar className="w-4 h-4 text-amber-400" />
          </div>
          <h3 className="text-2xl font-extrabold text-white">
            {stats?.totalEvents || 0}
          </h3>
          <p className="text-[10px] text-slate-400">Published live catalog</p>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs uppercase font-bold tracking-wider">Capacity Occupancy</span>
            <TrendingUp className="w-4 h-4 text-indigo-400" />
          </div>
          <h3 className="text-2xl font-extrabold text-white">
            {stats?.occupancyRate || 0}%
          </h3>
          <p className="text-[10px] text-indigo-300 font-semibold">Attendee conversion rate</p>
        </div>
      </div>

      {/* Events List Table */}
      <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden space-y-4 p-6">
        <h3 className="text-base font-bold font-display text-white">Your Managed Events & Shows</h3>

        {events.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-dark-900 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
                <tr>
                  <th className="p-3">Event Title</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">City & Venue</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">Capacity</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {events.map((evt) => (
                  <tr key={evt._id} className="hover:bg-dark-900/60 transition-colors">
                    <td className="p-3 font-bold text-white flex items-center gap-2.5">
                      <img src={evt.poster} alt="poster" className="w-8 h-10 object-cover rounded-md bg-dark-900" />
                      <span>{evt.title}</span>
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded bg-brand-primary/20 text-indigo-300 font-semibold text-[10px]">
                        {evt.category}
                      </span>
                    </td>
                    <td className="p-3">{evt.venueName}, {evt.city}</td>
                    <td className="p-3">{new Date(evt.date).toLocaleDateString()} at {evt.startTime}</td>
                    <td className="p-3 font-bold text-white">{evt.capacity} seats</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold text-[10px]">
                        {evt.status}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <Link
                        to={`/events/${evt.slug || evt._id}`}
                        className="text-brand-primary hover:underline font-semibold"
                      >
                        View Page
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center text-slate-500 text-xs">
            No events published yet. Click "Create New Event" above to publish your first show!
          </div>
        )}
      </div>

      {/* Create Event Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="glass-dropdown w-full max-w-2xl rounded-3xl border border-slate-700 p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-lg font-bold text-white">Publish New Live Event</h3>
                <p className="text-xs text-slate-400">Configure ticket tiers, pricing, and venue address</p>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="p-1 rounded-lg text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateEvent} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Event Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Arijit Singh Arena Live"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-dark-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-brand-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-dark-900 border border-slate-700 text-white text-xs"
                  >
                    <option value="CONCERTS">Concerts & Music</option>
                    <option value="STANDUP_COMEDY">Standup Comedy</option>
                    <option value="SPORTS">Sports & Matches</option>
                    <option value="THEATRE">Theatre & Drama</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Artist / Performer</label>
                  <input
                    type="text"
                    placeholder="e.g. Zakir Khan"
                    value={formData.artist}
                    onChange={(e) => setFormData({ ...formData, artist: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-dark-900 border border-slate-700 text-white text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">City</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Patna"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-dark-900 border border-slate-700 text-white text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-dark-900 border border-slate-700 text-white text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Venue Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Patliputra Sports Arena"
                    value={formData.venueName}
                    onChange={(e) => setFormData({ ...formData, venueName: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-dark-900 border border-slate-700 text-white text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Venue Address</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Kankarbagh Main Road"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-dark-900 border border-slate-700 text-white text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Event Description</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Describe your event..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-dark-900 border border-slate-700 text-white text-xs resize-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-dark-900 text-slate-400 hover:text-white text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-dark-950 font-bold text-xs shadow-glow-amber transition-all disabled:opacity-50"
                >
                  {submitting ? 'Publishing...' : 'Publish Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

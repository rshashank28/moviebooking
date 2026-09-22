import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { useAuthStore } from '../store/useAuthStore';
import { useToastStore } from '../store/useToastStore';
import {
  Shield,
  Users,
  Film,
  Calendar,
  DollarSign,
  Tag,
  Search,
  Plus,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Sparkles,
  Building2,
  X
} from 'lucide-react';

export default function AdminDashboardPage() {
  const { user, isAuthenticated, openAuthModal } = useAuthStore();
  const { success, error: toastError } = useToastStore();

  const [activeTab, setActiveTab] = useState('METRICS');
  const [metrics, setMetrics] = useState(null);
  const [usersList, setUsersList] = useState([]);
  const [organizersList, setOrganizersList] = useState([]);
  const [couponsList, setCouponsList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search in user list
  const [userSearch, setUserSearch] = useState('');

  // Modals
  const [showAddMovieModal, setShowAddMovieModal] = useState(false);
  const [showAddCouponModal, setShowAddCouponModal] = useState(false);

  // Movie Form
  const [movieForm, setMovieForm] = useState({
    title: '',
    poster: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=800&auto=format&fit=crop',
    banner: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=1600&auto=format&fit=crop',
    description: '',
    genres: ['Action', 'Thriller'],
    languages: ['Hindi', 'English'],
    duration: 155,
    ageRating: 'UA 16+',
    rating: 9.0
  });

  // Coupon Form
  const [couponForm, setCouponForm] = useState({
    code: '',
    description: 'Flat 20% discount on cinema passes',
    discountType: 'PERCENTAGE',
    discountValue: 20,
    maxDiscount: 150,
    minOrderAmount: 300
  });

  useEffect(() => {
    if (!isAuthenticated) {
      openAuthModal('login');
      return;
    }
    fetchAdminData();
  }, [isAuthenticated]);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const [metricsRes, usersRes, orgsRes, couponsRes] = await Promise.all([
        api.get('/admin/metrics'),
        api.get('/admin/users'),
        api.get('/admin/organizers'),
        api.get('/admin/coupons')
      ]);

      setMetrics(metricsRes.data?.overview);
      setUsersList(usersRes.data || []);
      setOrganizersList(orgsRes.data || []);
      setCouponsList(couponsRes.data || []);
    } catch (err) {
      console.error('Admin API error', err);
      toastError(err.message || 'Access restricted to Administrator accounts');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleUserStatus = async (userId, currentStatus) => {
    const nextStatus = currentStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    try {
      await api.patch(`/admin/users/${userId}/status`, { status: nextStatus });
      success(`User account status updated to ${nextStatus}`);
      fetchAdminData();
    } catch (err) {
      toastError(err.message || 'Failed to update user status');
    }
  };

  const handleUpdateOrganizerStatus = async (orgId, status) => {
    try {
      await api.patch(`/admin/organizers/${orgId}/status`, { status });
      success(`Organizer status updated to ${status}`);
      fetchAdminData();
    } catch (err) {
      toastError(err.message || 'Failed to update organizer status');
    }
  };

  const handleCreateMovie = async (e) => {
    e.preventDefault();
    try {
      await api.post('/admin/movies', movieForm);
      success('Movie published successfully to catalog!');
      setShowAddMovieModal(false);
      fetchAdminData();
    } catch (err) {
      toastError(err.message || 'Failed to add movie');
    }
  };

  const handleCreateCoupon = async (e) => {
    e.preventDefault();
    try {
      await api.post('/admin/coupons', couponForm);
      success(`Coupon ${couponForm.code.toUpperCase()} created!`);
      setShowAddCouponModal(false);
      fetchAdminData();
    } catch (err) {
      toastError(err.message || 'Failed to create coupon');
    }
  };

  if (!isAuthenticated || user?.role !== 'ADMIN') {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-4">
        <Shield className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="text-xl font-bold text-white">Administrator Command Center</h2>
        <p className="text-xs text-slate-400">
          This panel is restricted exclusively to platform administrators.
        </p>
        <button
          onClick={() => openAuthModal('login')}
          className="px-6 py-2.5 rounded-xl bg-brand-primary text-white text-xs font-semibold shadow-glow-primary"
        >
          Sign In as Admin
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-rose-400 uppercase tracking-wider mb-1">
            <Shield className="w-4 h-4" />
            <span>Master Administration Command Center</span>
          </div>
          <h1 className="text-3xl font-extrabold font-display text-white tracking-tight">
            Platform Operations & Management
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddMovieModal(true)}
            className="px-4 py-2.5 rounded-xl bg-brand-primary hover:bg-indigo-600 text-white text-xs font-semibold shadow-glow-primary transition-all flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Add Movie</span>
          </button>
          <button
            onClick={() => setShowAddCouponModal(true)}
            className="px-4 py-2.5 rounded-xl bg-dark-900 border border-slate-700 hover:border-slate-500 text-white text-xs font-semibold transition-all flex items-center gap-1.5"
          >
            <Tag className="w-4 h-4 text-brand-secondary" />
            <span>New Coupon</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
        {[
          { id: 'METRICS', label: 'Platform Analytics', icon: DollarSign },
          { id: 'USERS', label: `Users (${usersList.length})`, icon: Users },
          { id: 'ORGANIZERS', label: `Organizers (${organizersList.length})`, icon: Building2 },
          { id: 'COUPONS', label: `Coupons (${couponsList.length})`, icon: Tag }
        ].map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-rose-500 text-white shadow-glow-rose font-bold'
                  : 'bg-dark-900 border border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: Platform Analytics */}
      {activeTab === 'METRICS' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-1">
              <span className="text-xs uppercase font-bold text-slate-400">Gross Ticket Volume</span>
              <h3 className="text-2xl font-extrabold text-white">₹{metrics?.totalGMV?.toLocaleString() || 0}</h3>
              <p className="text-[10px] text-emerald-400 font-semibold">{metrics?.totalBookings || 0} Bookings Confirmed</p>
            </div>

            <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-1">
              <span className="text-xs uppercase font-bold text-slate-400">Platform 5% Fee Revenue</span>
              <h3 className="text-2xl font-extrabold text-brand-primary">₹{metrics?.platformCommission?.toLocaleString() || 0}</h3>
              <p className="text-[10px] text-slate-400">Net platform earnings</p>
            </div>

            <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-1">
              <span className="text-xs uppercase font-bold text-slate-400">Total Registered Users</span>
              <h3 className="text-2xl font-extrabold text-white">{metrics?.totalUsers || 0}</h3>
              <p className="text-[10px] text-slate-400">{metrics?.totalOrganizers || 0} Approved Organizers</p>
            </div>

            <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-1">
              <span className="text-xs uppercase font-bold text-slate-400">Active Theaters & Shows</span>
              <h3 className="text-2xl font-extrabold text-amber-400">{metrics?.totalShows || 0}</h3>
              <p className="text-[10px] text-slate-400">Across {metrics?.totalVenues || 0} Cinema Venues</p>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Users Management */}
      {activeTab === 'USERS' && (
        <div className="glass-panel rounded-2xl border border-slate-800 p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="text-base font-bold text-white">Registered Users & Roles</h3>
            <div className="relative max-w-xs w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-dark-900 border border-slate-700 text-xs text-white placeholder-slate-500"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-dark-900 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
                <tr>
                  <th className="p-3">User Name</th>
                  <th className="p-3">Email & Phone</th>
                  <th className="p-3">Role</th>
                  <th className="p-3">Loyalty Pts</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Moderation Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {usersList
                  .filter((u) => u.name?.toLowerCase().includes(userSearch.toLowerCase()) || u.email?.toLowerCase().includes(userSearch.toLowerCase()))
                  .map((u) => (
                    <tr key={u._id} className="hover:bg-dark-900/60">
                      <td className="p-3 font-bold text-white">{u.name}</td>
                      <td className="p-3">{u.email} {u.phone && `• ${u.phone}`}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-dark-900 border border-slate-800 text-slate-300">
                          {u.role}
                        </span>
                      </td>
                      <td className="p-3 font-bold text-amber-400">{u.loyaltyPoints || 0} pts</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          u.status === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                        }`}>
                          {u.status}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => handleToggleUserStatus(u._id, u.status)}
                          className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-colors ${
                            u.status === 'ACTIVE'
                              ? 'bg-rose-500/10 hover:bg-rose-500/20 border-rose-500/30 text-rose-300'
                              : 'bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/30 text-emerald-300'
                          }`}
                        >
                          {u.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Organizers Approvals */}
      {activeTab === 'ORGANIZERS' && (
        <div className="glass-panel rounded-2xl border border-slate-800 p-6 space-y-4">
          <h3 className="text-base font-bold text-white">Event & Cinema Partner Verification Queue</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-dark-900 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
                <tr>
                  <th className="p-3">Organization Name</th>
                  <th className="p-3">Business Contact</th>
                  <th className="p-3">Commission</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {organizersList.map((org) => (
                  <tr key={org._id} className="hover:bg-dark-900/60">
                    <td className="p-3 font-bold text-white">{org.organizationName}</td>
                    <td className="p-3">{org.businessEmail} • {org.businessPhone}</td>
                    <td className="p-3 font-bold text-brand-primary">{org.commissionRate || 5}%</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300">
                        {org.status}
                      </span>
                    </td>
                    <td className="p-3 text-right space-x-2">
                      <button
                        onClick={() => handleUpdateOrganizerStatus(org._id, 'APPROVED')}
                        className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-semibold"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleUpdateOrganizerStatus(org._id, 'SUSPENDED')}
                        className="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-semibold"
                      >
                        Suspend
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: Coupons */}
      {activeTab === 'COUPONS' && (
        <div className="glass-panel rounded-2xl border border-slate-800 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white">Active Promo Codes & Discounts</h3>
            <button
              onClick={() => setShowAddCouponModal(true)}
              className="px-4 py-2 rounded-xl bg-brand-primary text-white text-xs font-semibold shadow-glow-primary"
            >
              + Create Coupon
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {couponsList.map((c) => (
              <div key={c._id} className="p-4 rounded-2xl bg-dark-900 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-base text-amber-400 tracking-wider">{c.code}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">Active</span>
                </div>
                <p className="text-xs text-slate-300">{c.description || `${c.discountValue}% off`}</p>
                <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-800 flex justify-between">
                  <span>Min Order: ₹{c.minOrderAmount}</span>
                  <span>Max Save: ₹{c.maxDiscount}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Movie Modal */}
      {showAddMovieModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="glass-dropdown w-full max-w-xl rounded-3xl border border-slate-700 p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">Add New Movie</h3>
              <button onClick={() => setShowAddMovieModal(false)} className="p-1 rounded-lg text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateMovie} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Movie Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Avatar: The Way of Water"
                  value={movieForm.title}
                  onChange={(e) => setMovieForm({ ...movieForm, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-dark-900 border border-slate-700 text-white text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Duration (mins)</label>
                  <input
                    type="number"
                    value={movieForm.duration}
                    onChange={(e) => setMovieForm({ ...movieForm, duration: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-dark-900 border border-slate-700 text-white text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Age Rating</label>
                  <input
                    type="text"
                    value={movieForm.ageRating}
                    onChange={(e) => setMovieForm({ ...movieForm, ageRating: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-dark-900 border border-slate-700 text-white text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Description / Synopsis</label>
                <textarea
                  rows={3}
                  required
                  value={movieForm.description}
                  onChange={(e) => setMovieForm({ ...movieForm, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-dark-900 border border-slate-700 text-white text-xs resize-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddMovieModal(false)}
                  className="px-4 py-2 rounded-xl bg-dark-900 text-slate-400 hover:text-white text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-brand-primary text-white text-xs font-semibold shadow-glow-primary"
                >
                  Publish Movie
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Coupon Modal */}
      {showAddCouponModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="glass-dropdown w-full max-w-md rounded-3xl border border-slate-700 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">Create Promo Coupon</h3>
              <button onClick={() => setShowAddCouponModal(false)} className="p-1 rounded-lg text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCoupon} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Coupon Code</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. FESTIVE100"
                  value={couponForm.code}
                  onChange={(e) => setCouponForm({ ...couponForm, code: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 rounded-xl bg-dark-900 border border-slate-700 text-white text-xs font-mono uppercase"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Discount % or ₹</label>
                  <input
                    type="number"
                    required
                    value={couponForm.discountValue}
                    onChange={(e) => setCouponForm({ ...couponForm, discountValue: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-dark-900 border border-slate-700 text-white text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Max Discount (₹)</label>
                  <input
                    type="number"
                    value={couponForm.maxDiscount}
                    onChange={(e) => setCouponForm({ ...couponForm, maxDiscount: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-dark-900 border border-slate-700 text-white text-xs"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddCouponModal(false)}
                  className="px-4 py-2 rounded-xl bg-dark-900 text-slate-400 hover:text-white text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-brand-primary text-white text-xs font-semibold shadow-glow-primary"
                >
                  Create Code
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

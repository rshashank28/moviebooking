import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuthStore } from '../store/useAuthStore';
import { useToastStore } from '../store/useToastStore';
import {
  Ticket,
  Heart,
  Gift,
  Bell,
  User,
  Calendar,
  Clock,
  MapPin,
  QrCode,
  Copy,
  Check,
  AlertTriangle,
  Sparkles,
  ShieldCheck,
  Trash2,
  X
} from 'lucide-react';

export default function UserDashboardPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated, openAuthModal } = useAuthStore();
  const { success, error: toastError } = useToastStore();

  const [activeTab, setActiveTab] = useState('PASSES');
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [copiedCode, setCopiedCode] = useState(false);

  // Cancellation modal state
  const [selectedBookingToCancel, setSelectedBookingToCancel] = useState(null);
  const [cancelReason, setCancelReason] = useState('Schedule change');
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      openAuthModal('login');
      return;
    }
    fetchDashboard();
  }, [isAuthenticated]);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const res = await api.get('/user/dashboard');
      setDashboardData(res.data);
    } catch (err) {
      console.error('Failed to load dashboard', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyReferral = () => {
    if (user?.referralCode) {
      navigator.clipboard.writeText(user.referralCode);
      setCopiedCode(true);
      success('Referral code copied to clipboard!');
      setTimeout(() => setCopiedCode(false), 3000);
    }
  };

  const handleCancelBooking = async () => {
    if (!selectedBookingToCancel) return;
    setCancelling(true);
    try {
      const res = await api.post('/refunds/cancel-booking', {
        bookingId: selectedBookingToCancel.bookingId,
        reason: cancelReason
      });
      success(`Booking cancelled. ₹${res.data?.refund?.refundAmount} refund processed!`);
      setSelectedBookingToCancel(null);
      fetchDashboard();
    } catch (err) {
      toastError(err.message || 'Failed to cancel booking');
    } finally {
      setCancelling(false);
    }
  };

  const handleMarkNotificationRead = async (notifId) => {
    try {
      await api.patch(`/user/notifications/${notifId}/read`);
      fetchDashboard();
    } catch (err) {
      console.error(err);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-4">
        <h2 className="text-xl font-bold text-white">Sign In Required</h2>
        <p className="text-xs text-slate-400">Please sign in to access your digital tickets and rewards.</p>
        <button
          onClick={() => openAuthModal('login')}
          className="px-6 py-2.5 rounded-xl bg-brand-primary text-white text-xs font-semibold shadow-glow-primary"
        >
          Sign In Now
        </button>
      </div>
    );
  }

  if (loading && !dashboardData) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-20 text-center">
        <div className="inline-block w-8 h-8 border-4 border-brand-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-slate-400 mt-2">Loading customer hub & tickets...</p>
      </div>
    );
  }

  const {
    tierInfo = {},
    upcomingBookings = [],
    pastBookings = [],
    wishlistItems = [],
    notifications = [],
    stats = {}
  } = dashboardData || {};

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Profile Header & Loyalty Tier Card */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-brand-primary to-brand-secondary flex items-center justify-center font-extrabold text-white text-2xl shadow-glow-primary">
            {user?.name ? user.name[0].toUpperCase() : 'U'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold font-display text-white">{user?.name}</h1>
              <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-brand-primary/20 text-indigo-300 border border-brand-primary/40">
                {user?.role || 'CUSTOMER'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">{user?.email} {user?.phone && `• ${user.phone}`}</p>
          </div>
        </div>

        {/* Loyalty Tier Pill & Progress */}
        <div className="p-4 rounded-2xl bg-dark-900 border border-slate-800 w-full md:w-80 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              ShowPulse Tier: <strong className="text-amber-400">{tierInfo.tier || 'BRONZE'}</strong>
            </span>
            <span className="text-xs font-extrabold text-white">
              {stats.loyaltyPoints || 0} pts
            </span>
          </div>

          <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
            <div
              className="bg-gradient-to-r from-amber-400 to-brand-primary h-2 rounded-full transition-all duration-500"
              style={{ width: `${tierInfo.progress || 20}%` }}
            />
          </div>

          {tierInfo.nextTier && (
            <p className="text-[10px] text-slate-400">
              {tierInfo.pointsNeeded} more points to reach <strong className="text-white">{tierInfo.nextTier}</strong>
            </p>
          )}
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
        {[
          { id: 'PASSES', label: `My Tickets & Passes (${upcomingBookings.length})`, icon: Ticket },
          { id: 'WISHLIST', label: `Saved Wishlist (${wishlistItems.length})`, icon: Heart },
          { id: 'LOYALTY', label: 'Loyalty & Referrals', icon: Gift },
          { id: 'NOTIFICATIONS', label: `Notifications (${notifications.filter((n) => !n.isRead).length})`, icon: Bell }
        ].map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-brand-primary text-white shadow-glow-primary'
                  : 'bg-dark-900 border border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: Passes & Bookings */}
      {activeTab === 'PASSES' && (
        <div className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">
              Upcoming Passes ({upcomingBookings.length})
            </h3>

            {upcomingBookings.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {upcomingBookings.map((b) => (
                  <div
                    key={b._id}
                    className="glass-panel p-5 rounded-2xl border border-slate-800 flex flex-col justify-between space-y-4 hover:border-slate-700 transition-all"
                  >
                    <div className="flex gap-4 items-start">
                      <img
                        src={b.movie?.poster || b.event?.poster}
                        alt="poster"
                        className="w-16 h-24 object-cover rounded-xl border border-slate-700 bg-dark-900 shrink-0"
                      />
                      <div className="space-y-1 flex-1">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-dark-900 border border-slate-800 text-indigo-300 font-bold">
                          {b.bookingId}
                        </span>
                        <h4 className="text-base font-bold text-white line-clamp-1">
                          {b.movie?.title || b.event?.title}
                        </h4>
                        <p className="text-xs text-slate-400">{b.venue?.name || b.event?.venueName}</p>
                        <p className="text-xs text-slate-300 font-medium">
                          Seats: {b.seats?.map((s) => s.seatIdentifier).join(', ') || `${b.eventPasses?.length} Passes`}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                      <span className="text-xs font-bold text-white">
                        ₹{b.pricing?.finalAmount?.toLocaleString()}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setSelectedBookingToCancel(b)}
                          className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-medium transition-colors"
                        >
                          Cancel
                        </button>
                        <Link
                          to={`/tickets/${b.bookingId}`}
                          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-brand-primary hover:bg-indigo-600 text-white text-xs font-semibold shadow-glow-primary transition-colors"
                        >
                          <QrCode className="w-3.5 h-3.5" />
                          <span>View QR Pass</span>
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 rounded-2xl glass-panel border border-slate-800 text-center space-y-2">
                <Ticket className="w-8 h-8 text-slate-600 mx-auto" />
                <h4 className="text-sm font-bold text-white">No Upcoming Tickets</h4>
                <p className="text-xs text-slate-400">Book tickets for latest blockbuster movies or concerts!</p>
                <Link to="/movies" className="inline-block mt-2 px-4 py-2 bg-brand-primary rounded-xl text-white text-xs font-semibold">
                  Browse Movies
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Wishlist */}
      {activeTab === 'WISHLIST' && (
        <div className="space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">
            Saved Movies & Events ({wishlistItems.length})
          </h3>

          {wishlistItems.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {wishlistItems.map((item) => {
                const target = item.movie || item.event;
                if (!target) return null;
                const link = item.itemType === 'MOVIE' ? `/movies/${target.slug || target._id}` : `/events/${target.slug || target._id}`;

                return (
                  <Link
                    key={item._id}
                    to={link}
                    className="glass-card p-3 rounded-2xl border border-slate-800 space-y-2 group hover:border-brand-primary transition-all"
                  >
                    <img
                      src={target.poster}
                      alt={target.title}
                      className="w-full aspect-[2/3] object-cover rounded-xl group-hover:scale-105 transition-transform"
                    />
                    <h4 className="text-xs font-bold text-white line-clamp-1 group-hover:text-brand-primary transition-colors">
                      {target.title}
                    </h4>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="p-8 rounded-2xl glass-panel border border-slate-800 text-center space-y-2">
              <Heart className="w-8 h-8 text-slate-600 mx-auto" />
              <h4 className="text-sm font-bold text-white">Wishlist is Empty</h4>
              <p className="text-xs text-slate-400">Save movies and events to receive notifications when seats open!</p>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Loyalty & Referrals */}
      {activeTab === 'LOYALTY' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          {/* Referral Card */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-4 h-4" />
              <span>Invite Friends & Earn Rewards</span>
            </div>
            <h3 className="text-lg font-bold text-white">Give ₹100, Get 50 Loyalty Points</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Share your personal referral code with friends. When they sign up, they get 150 points immediately, and you earn 50 points on their first ticket booking.
            </p>

            <div className="flex items-center gap-2 p-3 rounded-xl bg-dark-900 border border-slate-700">
              <span className="font-mono font-bold text-lg text-white flex-1 tracking-wider">
                {user?.referralCode || 'SPWELCOME'}
              </span>
              <button
                onClick={handleCopyReferral}
                className="px-4 py-2 rounded-lg bg-brand-primary hover:bg-indigo-600 text-white text-xs font-semibold shadow-glow-primary transition-colors flex items-center gap-1.5"
              >
                {copiedCode ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copiedCode ? 'Copied' : 'Copy Code'}</span>
              </button>
            </div>
          </div>

          {/* Tier Benefits */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">
              ShowPulse Tier Privileges
            </h3>
            <div className="space-y-2 text-xs">
              <div className="p-2.5 rounded-xl bg-dark-900 border border-slate-800 flex justify-between items-center">
                <span className="font-bold text-amber-400">Bronze (0 - 499 pts)</span>
                <span className="text-slate-400">Standard 10% cashpoint back</span>
              </div>
              <div className="p-2.5 rounded-xl bg-dark-900 border border-slate-800 flex justify-between items-center">
                <span className="font-bold text-slate-300">Silver (500 - 999 pts)</span>
                <span className="text-slate-400">Zero cancellation fee pass</span>
              </div>
              <div className="p-2.5 rounded-xl bg-dark-900 border border-slate-800 flex justify-between items-center">
                <span className="font-bold text-amber-300">Gold (1000 - 1999 pts)</span>
                <span className="text-slate-400">Early access booking window</span>
              </div>
              <div className="p-2.5 rounded-xl bg-dark-900 border border-slate-800 flex justify-between items-center">
                <span className="font-bold text-indigo-400">Platinum (2000+ pts)</span>
                <span className="text-slate-400">Complimentary F&B Lounge vouchers</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Notifications */}
      {activeTab === 'NOTIFICATIONS' && (
        <div className="space-y-3 max-w-2xl">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">
            Recent In-App Alerts
          </h3>

          {notifications.length > 0 ? (
            notifications.map((n) => (
              <div
                key={n._id}
                onClick={() => handleMarkNotificationRead(n._id)}
                className={`p-4 rounded-2xl border transition-colors cursor-pointer flex items-start justify-between gap-4 ${
                  n.isRead
                    ? 'bg-dark-900/40 border-slate-800 text-slate-400'
                    : 'bg-dark-900 border-brand-primary/40 text-slate-200'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-white">{n.title}</h4>
                    {!n.isRead && (
                      <span className="w-2 h-2 rounded-full bg-brand-primary" />
                    )}
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">{n.message}</p>
                  <span className="text-[10px] text-slate-500 block pt-1">
                    {new Date(n.createdAt).toLocaleDateString()} at {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="p-8 rounded-2xl glass-panel border border-slate-800 text-center space-y-2">
              <Bell className="w-8 h-8 text-slate-600 mx-auto" />
              <h4 className="text-sm font-bold text-white">No Notifications</h4>
              <p className="text-xs text-slate-400">You are all caught up!</p>
            </div>
          )}
        </div>
      )}

      {/* Cancel Booking Confirmation Modal */}
      {selectedBookingToCancel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="glass-dropdown w-full max-w-md rounded-2xl border border-slate-700 p-6 shadow-2xl space-y-4 relative">
            <button
              onClick={() => setSelectedBookingToCancel(null)}
              className="absolute right-4 top-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 text-rose-400 font-bold text-base">
              <AlertTriangle className="w-5 h-5" />
              <span>Cancel Booking & Request Refund</span>
            </div>

            <p className="text-xs text-slate-300">
              Are you sure you want to cancel booking <strong className="text-white">{selectedBookingToCancel.bookingId}</strong>?
            </p>

            <div className="p-3.5 rounded-xl bg-dark-900 border border-slate-800 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-400">Original Paid:</span>
                <span className="font-bold text-white">₹{selectedBookingToCancel.pricing?.finalAmount}</span>
              </div>
              <div className="flex justify-between text-emerald-400 font-bold">
                <span>Refund (75% Policy):</span>
                <span>₹{Math.round(selectedBookingToCancel.pricing?.finalAmount * 0.75)}</span>
              </div>
              <p className="text-[10px] text-slate-500 pt-1 border-t border-slate-800">
                Refund is processed immediately to original payment source.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Cancellation Reason</label>
              <select
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-dark-900 border border-slate-700 text-xs text-white"
              >
                <option value="Schedule change">Schedule change</option>
                <option value="Booked wrong showtime/date">Booked wrong showtime/date</option>
                <option value="Personal emergency">Personal emergency</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                onClick={() => setSelectedBookingToCancel(null)}
                className="px-4 py-2 rounded-xl bg-dark-900 text-slate-400 hover:text-white text-xs font-semibold"
              >
                Keep Booking
              </button>
              <button
                onClick={handleCancelBooking}
                disabled={cancelling}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition-all disabled:opacity-50"
              >
                {cancelling ? 'Cancelling...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

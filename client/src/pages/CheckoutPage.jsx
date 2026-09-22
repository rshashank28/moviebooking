import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { useAuthStore } from '../store/useAuthStore';
import { useToastStore } from '../store/useToastStore';
import {
  CreditCard,
  Tag,
  Gift,
  ShieldCheck,
  Clock,
  MapPin,
  Calendar,
  Film,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  ChevronLeft
} from 'lucide-react';

export default function CheckoutPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, openAuthModal } = useAuthStore();
  const { success, error: toastError, warning } = useToastStore();

  const checkoutState = location.state || {};
  const {
    bookingType = 'MOVIE',
    showId,
    eventId,
    movie,
    event,
    venue,
    show,
    selectedSeats = [],
    passes = []
  } = checkoutState;

  const [loading, setLoading] = useState(false);
  const [calculatingPrice, setCalculatingPrice] = useState(true);
  const [pricing, setPricing] = useState(null);
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState('');
  const [useLoyaltyPoints, setUseLoyaltyPoints] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('RAZORPAY_CARD');

  useEffect(() => {
    if (!showId && !eventId) {
      navigate('/movies');
      return;
    }
    fetchPriceBreakdown();
  }, [showId, eventId, appliedCoupon, useLoyaltyPoints, user]);

  const fetchPriceBreakdown = async () => {
    setCalculatingPrice(true);
    try {
      const payload = {
        bookingType,
        showId,
        eventId,
        seatIdentifiers: selectedSeats,
        passes,
        couponCode: appliedCoupon || undefined,
        loyaltyPointsToRedeem: useLoyaltyPoints ? Math.min(user?.loyaltyPoints || 0, 200) : 0
      };

      const res = await api.post('/bookings/calculate-price', payload);
      setPricing(res.data);
    } catch (err) {
      console.error('Pricing calculation error', err);
      toastError(err.message || 'Failed to calculate price');
    } finally {
      setCalculatingPrice(false);
    }
  };

  const handleApplyCoupon = (e) => {
    e.preventDefault();
    if (!couponInput.trim()) return;
    setAppliedCoupon(couponInput.trim().toUpperCase());
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon('');
    setCouponInput('');
  };

  const handleProceedPayment = async () => {
    if (!isAuthenticated) {
      openAuthModal('login');
      return;
    }

    setLoading(true);
    try {
      // 1. Create Booking & Order on Backend
      const bookingPayload = {
        bookingType,
        showId,
        eventId,
        seatIdentifiers: selectedSeats,
        passes,
        couponCode: appliedCoupon || undefined,
        loyaltyPointsToRedeem: useLoyaltyPoints ? Math.min(user?.loyaltyPoints || 0, 200) : 0
      };

      const orderRes = await api.post('/bookings/create', bookingPayload);
      const { bookingId, razorpayOrder } = orderRes.data;

      // 2. Perform Payment Verification (Dev Mock / Razorpay SDK Integration)
      // Generates verifiable test payment signature
      const mockPaymentId = `pay_${Math.random().toString(36).substring(2, 12)}`;
      const testSignature = `test_sig_${bookingId}`;

      const verifyRes = await api.post('/payments/verify', {
        bookingId,
        razorpay_order_id: razorpayOrder.id,
        razorpay_payment_id: mockPaymentId,
        razorpay_signature: testSignature,
        method: paymentMethod
      });

      success(`Booking Confirmed! You earned ${verifyRes.data?.pointsEarned || 30} loyalty points.`);
      navigate(`/tickets/${bookingId}`);
    } catch (err) {
      console.error('Payment checkout error', err);
      toastError(err.message || 'Payment verification failed');
    } finally {
      setLoading(false);
    }
  };

  if (!pricing && calculatingPrice) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <div className="inline-block w-8 h-8 border-4 border-brand-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-slate-400 mt-2">Calculating final invoice & taxes...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-xl bg-dark-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-2xl font-bold font-display text-white">Order Review & Checkout</h1>
          <p className="text-xs text-slate-400">Review your ticket details and select payment method</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left 2 Columns: Order Summary & Discounts & Payment Options */}
        <div className="lg:col-span-2 space-y-6">
          {/* Ticket Summary Card */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">
              Booking Overview
            </h2>

            <div className="flex gap-4 items-center">
              <img
                src={movie?.poster || event?.poster}
                alt="poster"
                className="w-20 h-28 object-cover rounded-xl border border-slate-700/80 bg-dark-900 shrink-0"
              />

              <div className="space-y-1.5 flex-1">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-brand-primary/20 text-indigo-300 border border-brand-primary/30">
                  {bookingType === 'MOVIE' ? `${show?.format || '2D'} • ${show?.language || 'Hindi'}` : event?.category}
                </span>
                <h3 className="text-lg font-bold text-white leading-tight">
                  {movie?.title || event?.title}
                </h3>
                <p className="text-xs text-slate-300 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-brand-primary shrink-0" />
                  <span>{venue?.name || event?.venueName}</span>
                </p>
                <p className="text-xs text-slate-400 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span>{show?.date || (event?.date && new Date(event.date).toLocaleDateString())} at {show?.startTime || event?.startTime}</span>
                </p>
              </div>
            </div>

            {/* Selected Seats / Passes */}
            <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-400">Seats:</span>
                <div className="flex flex-wrap gap-1.5">
                  {selectedSeats.map((s) => (
                    <span
                      key={s}
                      className="px-2.5 py-1 rounded-md bg-dark-900 border border-slate-700 text-xs font-bold text-white shadow-sm"
                    >
                      {s}
                    </span>
                  ))}
                  {passes.map((p, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-md bg-dark-900 border border-slate-700 text-xs font-bold text-white shadow-sm"
                    >
                      {p.quantity}x {p.categoryName}
                    </span>
                  ))}
                </div>
              </div>

              <span className="text-xs font-medium text-slate-400">
                {selectedSeats.length || passes.reduce((a, b) => a + b.quantity, 0)} Ticket(s)
              </span>
            </div>
          </div>

          {/* Offers, Coupons & Loyalty Redemption */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-5">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Tag className="w-4 h-4 text-brand-secondary" />
              <span>Offers & Promo Codes</span>
            </h3>

            {/* Coupon Box */}
            <form onSubmit={handleApplyCoupon} className="flex gap-2">
              <input
                type="text"
                placeholder="Enter Promo / Coupon Code (e.g. SPFIRST50)"
                value={couponInput}
                onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                disabled={!!appliedCoupon}
                className="flex-1 px-4 py-2.5 rounded-xl bg-dark-900 border border-slate-700 text-white placeholder-slate-500 text-xs font-semibold uppercase focus:outline-none focus:border-brand-primary"
              />
              {appliedCoupon ? (
                <button
                  type="button"
                  onClick={handleRemoveCoupon}
                  className="px-4 py-2.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-semibold transition-colors"
                >
                  Remove
                </button>
              ) : (
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-brand-primary hover:bg-indigo-600 text-white text-xs font-semibold shadow-glow-primary transition-all"
                >
                  Apply
                </button>
              )}
            </form>

            {appliedCoupon && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between">
                <span className="flex items-center gap-1.5 font-semibold">
                  <CheckCircle2 className="w-4 h-4" />
                  Coupon {appliedCoupon} applied (-₹{pricing?.discountAmount || 0})
                </span>
              </div>
            )}

            {/* Loyalty Points Redemption Box */}
            {isAuthenticated && user && user.loyaltyPoints > 0 && (
              <div className="p-4 rounded-xl bg-dark-900/80 border border-slate-800 flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
                    <Gift className="w-4 h-4 text-amber-400" />
                    <span>Redeem ShowPulse Loyalty Points</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    You have <strong className="text-white">{user.loyaltyPoints} points</strong> (Save up to ₹{Math.min(user.loyaltyPoints, 200)})
                  </p>
                </div>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useLoyaltyPoints}
                    onChange={(e) => setUseLoyaltyPoints(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                </label>
              </div>
            )}
          </div>

          {/* Payment Method Selector */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <CreditCard className="w-4 h-4 text-brand-primary" />
              <span>Select Payment Method</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { id: 'RAZORPAY_CARD', label: 'Credit / Debit Card', sub: 'Visa, Mastercard, RuPay' },
                { id: 'RAZORPAY_UPI', label: 'UPI / QR', sub: 'Google Pay, PhonePe, Paytm' },
                { id: 'RAZORPAY_NETBANKING', label: 'Net Banking', sub: 'All Indian Banks' }
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => setPaymentMethod(m.id)}
                  className={`p-3.5 rounded-xl border text-left transition-all ${
                    paymentMethod === m.id
                      ? 'bg-brand-primary/20 border-brand-primary shadow-glow-primary'
                      : 'bg-dark-900 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <p className="text-xs font-bold text-white">{m.label}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{m.sub}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Pricing Breakdown & Payment CTA */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-6 shadow-2xl sticky top-24">
          <h3 className="text-base font-bold font-display text-white">Payment Summary</h3>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between text-slate-300">
              <span>Ticket Base Price</span>
              <span>₹{pricing?.baseAmount?.toLocaleString() || 0}</span>
            </div>

            <div className="flex items-center justify-between text-slate-300">
              <span>Convenience Fee</span>
              <span>₹{pricing?.convenienceFee || 0}</span>
            </div>

            <div className="flex items-center justify-between text-slate-300">
              <span>Integrated GST (18%)</span>
              <span>₹{pricing?.taxAmount || 0}</span>
            </div>

            {pricing?.discountAmount > 0 && (
              <div className="flex items-center justify-between text-emerald-400 font-semibold">
                <span>Coupon Discount</span>
                <span>-₹{pricing.discountAmount}</span>
              </div>
            )}

            {pricing?.loyaltyDiscount > 0 && (
              <div className="flex items-center justify-between text-amber-400 font-semibold">
                <span>Loyalty Points ({pricing.loyaltyPointsRedeemed} pts)</span>
                <span>-₹{pricing.loyaltyDiscount}</span>
              </div>
            )}

            <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
              <span className="text-sm font-bold text-white">Total Amount</span>
              <span className="text-2xl font-extrabold text-brand-primary">
                ₹{pricing?.finalAmount?.toLocaleString() || 0}
              </span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-dark-900/90 border border-slate-800/80 flex items-center gap-2 text-[11px] text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>256-Bit Encrypted Secure Checkout</span>
          </div>

          <button
            onClick={handleProceedPayment}
            disabled={loading}
            className="w-full py-4 rounded-xl bg-gradient-to-r from-brand-primary to-indigo-600 hover:from-indigo-500 hover:to-indigo-700 text-white font-bold text-sm shadow-glow-primary transition-all flex items-center justify-center gap-2 disabled:opacity-50 transform active:scale-95"
          >
            {loading ? (
              <span>Confirming Payment...</span>
            ) : (
              <>
                <span>Pay ₹{pricing?.finalAmount?.toLocaleString() || 0}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

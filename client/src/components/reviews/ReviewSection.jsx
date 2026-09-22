import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import { useAuthStore } from '../../store/useAuthStore';
import { useToastStore } from '../../store/useToastStore';
import {
  Star,
  ShieldCheck,
  MessageSquare,
  Sparkles,
  Plus,
  ThumbsUp,
  X,
  CheckCircle2
} from 'lucide-react';

export default function ReviewSection({ itemType = 'MOVIE', itemId, itemTitle }) {
  const { user, isAuthenticated, openAuthModal } = useAuthStore();
  const { success, error: toastError } = useToastStore();

  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // New review form
  const [rating, setRating] = useState(10);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');

  useEffect(() => {
    fetchReviews();
  }, [itemId]);

  const fetchReviews = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/reviews/${itemType}/${itemId}`);
      setReviews(res.data || []);
    } catch (err) {
      console.error('Failed to load reviews', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      openAuthModal('login');
      return;
    }

    if (!comment.trim()) {
      toastError('Please write your review thoughts');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post('/reviews', {
        itemType,
        itemId,
        rating,
        title,
        comment
      });
      success('Review posted! You earned +20 loyalty points.');
      setShowModal(false);
      setTitle('');
      setComment('');
      fetchReviews();
    } catch (err) {
      toastError(err.message || 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pt-6">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-bold font-display text-white flex items-center gap-2">
            <span>Verified Customer Reviews</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-dark-900 border border-slate-800 text-slate-400">
              {reviews.length}
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Real feedback from confirmed attendees who booked on ShowPulse
          </p>
        </div>

        <button
          onClick={() => {
            if (!isAuthenticated) openAuthModal('login');
            else setShowModal(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-primary hover:bg-indigo-600 text-white text-xs font-semibold shadow-glow-primary transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Write a Review (+20 pts)</span>
        </button>
      </div>

      {/* Reviews List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="p-4 rounded-xl bg-dark-900 border border-slate-800 animate-pulse h-24" />
          ))}
        </div>
      ) : reviews.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {reviews.map((rev) => (
            <div
              key={rev._id}
              className="glass-card p-5 rounded-2xl border border-slate-800 space-y-3 flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-brand-primary to-indigo-600 flex items-center justify-center font-bold text-white text-xs">
                      {rev.user?.name ? rev.user.name[0].toUpperCase() : 'U'}
                    </div>
                    <div>
                      <span className="text-xs font-bold text-white block">
                        {rev.user?.name || 'Verified User'}
                      </span>
                      {rev.isVerifiedBooking && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-semibold">
                          <ShieldCheck className="w-3 h-3" />
                          Verified Attendee
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="px-2 py-1 rounded-lg bg-dark-950 border border-slate-800 text-xs font-bold text-amber-400 flex items-center gap-1">
                    <Star className="w-3 h-3 fill-amber-400" />
                    <span>{rev.rating}/10</span>
                  </div>
                </div>

                {rev.title && (
                  <h4 className="text-xs font-bold text-slate-200">{rev.title}</h4>
                )}
                <p className="text-xs text-slate-300 leading-relaxed">
                  "{rev.comment}"
                </p>
              </div>

              <div className="text-[10px] text-slate-500 pt-2 border-t border-slate-800/80">
                Posted {new Date(rev.createdAt).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-8 rounded-2xl glass-panel border border-slate-800 text-center space-y-2">
          <MessageSquare className="w-8 h-8 text-slate-600 mx-auto" />
          <h4 className="text-sm font-bold text-white">No Reviews Yet</h4>
          <p className="text-xs text-slate-400">
            Be the first to share your review and earn 20 ShowPulse loyalty points!
          </p>
        </div>
      )}

      {/* Review Submission Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="glass-dropdown w-full max-w-lg rounded-2xl border border-slate-700 p-6 shadow-2xl relative space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-base font-bold text-white">Review {itemTitle}</h3>
                <p className="text-xs text-slate-400">Share your experience with the community</p>
              </div>
              <button onClick={() => setShowModal(false)} className="p-1 rounded-lg text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitReview} className="space-y-4">
              {/* Rating Stepper */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Your Rating (1 to 10 Stars)
                </label>
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                        rating === star
                          ? 'bg-amber-400 text-dark-950 shadow-glow-amber scale-105'
                          : 'bg-dark-900 border border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {star}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Review Headline (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Masterpiece visual effects and thrilling screenplay!"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-dark-900 border border-slate-700 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-brand-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Detailed Review
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Write your honest review here..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-dark-900 border border-slate-700 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-brand-primary resize-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-dark-900 text-slate-400 hover:text-white text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl bg-brand-primary hover:bg-indigo-600 text-white text-xs font-semibold shadow-glow-primary transition-all flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{submitting ? 'Submitting...' : 'Submit Review (+20 pts)'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

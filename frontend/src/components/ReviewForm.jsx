// ============================================================
// ReviewForm.jsx — lets logged-in users submit product reviews
// Optimistic UI: shows the review immediately while posting to backend
// ============================================================
import React, { useState } from 'react';
import useStore from '../store/useStore';
import toast from 'react-hot-toast';

export default function ReviewForm({ productId, onReviewAdded }) {
  const [rating, setRating]   = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  const { isLoggedIn, user } = useStore(s => ({
    isLoggedIn: s.isLoggedIn,
    user:       s.user,
  }));

  if (!isLoggedIn) {
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-center">
        <p className="text-slate-500 text-sm">
          <span className="text-lg mr-1">🔐</span>
          <button
            onClick={() => document.dispatchEvent(new CustomEvent('openLogin'))}
            className="text-brand-purple font-semibold hover:underline"
          >
            Login
          </button>
          {' '}to write a review
        </p>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (rating === 0) { toast.error('Please select a star rating'); return; }
    if (!comment.trim()) { toast.error('Please write a comment'); return; }

    setLoading(true);
    const review = {
      user:    user.username,
      rating,
      comment: comment.trim(),
      date:    new Date().toISOString(),
    };

    // Optimistic update: show immediately
    onReviewAdded(review);
    setRating(0);
    setComment('');
    toast.success('Review posted! 🌟');

    // Then persist to backend (fire-and-forget, no loading state for UX)
    try {
      await fetch(`/api/products/${productId}/reviews`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ userId: user.username, rating, comment: comment.trim() }),
      });
    } catch {
      // Already shown optimistically — silent fail is acceptable here
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
      <p className="font-semibold text-slate-800 text-sm mb-3">
        Write a Review as <span className="text-brand-purple">{user.username}</span>
      </p>

      {/* Star picker */}
      <div className="flex gap-1 mb-3">
        {[1, 2, 3, 4, 5].map(star => (
          <button
            key={star}
            type="button"
            onClick={() => setRating(star)}
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(0)}
            className="text-2xl transition-transform hover:scale-110 active:scale-95"
          >
            <span className={
              star <= (hovered || rating)
                ? 'text-amber-400'
                : 'text-slate-200'
            }>★</span>
          </button>
        ))}
        {rating > 0 && (
          <span className="text-xs text-slate-500 self-center ml-1">
            {['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][rating]}
          </span>
        )}
      </div>

      {/* Comment */}
      <textarea
        value={comment}
        onChange={e => setComment(e.target.value)}
        placeholder="What did you think of this product? (virtual experience counts!)"
        className="input-field resize-none text-sm"
        rows={3}
        maxLength={500}
      />
      <div className="flex items-center justify-between mt-2">
        <span className="text-xs text-slate-400">{comment.length}/500</span>
        <button
          type="submit"
          disabled={loading || rating === 0 || !comment.trim()}
          className="btn-primary text-sm px-5 py-2 rounded-xl disabled:opacity-50"
        >
          {loading ? 'Posting...' : 'Post Review ✨'}
        </button>
      </div>
    </form>
  );
}

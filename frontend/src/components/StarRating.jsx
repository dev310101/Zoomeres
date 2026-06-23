import React from 'react';

export default function StarRating({ rating, size = 'sm' }) {
  const s = size === 'sm' ? 'text-sm' : 'text-base';
  return (
    <span className={`inline-flex ${s}`}>
      {[1,2,3,4,5].map(i => (
        <span key={i} className={i <= Math.round(rating) ? 'star-filled' : 'star-empty'}>
          ★
        </span>
      ))}
    </span>
  );
}

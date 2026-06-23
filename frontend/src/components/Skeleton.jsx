import React from 'react';

export function ProductCardSkeleton() {
  return (
    <div className="card p-0 overflow-hidden">
      <div className="skeleton w-full h-48 bg-slate-200 rounded-t-2xl" />
      <div className="p-3 space-y-2">
        <div className="skeleton h-4 bg-slate-200 rounded w-3/4" />
        <div className="skeleton h-3 bg-slate-200 rounded w-1/2" />
        <div className="skeleton h-4 bg-slate-200 rounded w-1/3" />
        <div className="skeleton h-8 bg-slate-200 rounded-xl w-full mt-2" />
      </div>
    </div>
  );
}

export function ProductGridSkeleton({ count = 8 }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}

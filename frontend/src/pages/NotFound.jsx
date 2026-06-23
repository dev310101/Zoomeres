import React from 'react';
import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4">
      <div className="text-8xl mb-4 animate-bounce">🛒</div>
      <h1 className="text-6xl font-extrabold text-brand-purple mb-2">404</h1>
      <h2 className="text-xl font-bold text-slate-700 mb-2">this page got sold out 😭</h2>
      <p className="text-slate-400 mb-8 max-w-sm">
        looks like this page ghosted you. very gen z of it actually.
      </p>
      <div className="flex gap-3 flex-wrap justify-center">
        <Link to="/" className="btn-primary px-6 py-3 rounded-2xl">🏠 home</Link>
        <Link to="/products" className="btn-secondary px-6 py-3 rounded-2xl">🛍️ browse stuff</Link>
      </div>
    </div>
  );
}

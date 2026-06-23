import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SlidersHorizontal } from 'lucide-react';
import ProductCard from '../components/ProductCard';
import { ProductGridSkeleton } from '../components/Skeleton';
import { fetchProducts } from '../utils/api';
import useStore from '../store/useStore';
import toast from 'react-hot-toast';

const CATEGORIES = ['All', 'Gadgets', 'Fashion', 'Beauty', 'Grocery', 'Gaming'];
const SORTS = [
  { value: '', label: 'Relevance' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'rating', label: 'Top Rated' },
];

export default function ProductList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState('');
  const trackSearch = useStore(s => s.trackSearch);

  const search = searchParams.get('search') || '';
  const category = searchParams.get('category') || 'All';

  useEffect(() => {
    setLoading(true);
    const params = {};
    if (search) params.search = search;
    if (category !== 'All') params.category = category;
    if (sort) params.sort = sort;

    fetchProducts(params)
      .then(setProducts)
      .catch(() => toast.error('Failed to load products'))
      .finally(() => setLoading(false));
  }, [search, category, sort]);

  return (
    <div className="max-w-7xl mx-auto px-3 md:px-6 py-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-slate-800">
            {search ? `Results for "${search}"` : category === 'All' ? 'All Products' : category}
          </h1>
          {!loading && (
            <p className="text-slate-400 text-sm">{products.length} products found</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <SlidersHorizontal size={16} className="text-slate-400" />
          <select
            value={sort}
            onChange={e => setSort(e.target.value)}
            className="input-field w-auto text-sm"
          >
            {SORTS.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Category pills */}
      <div className="flex gap-2 overflow-x-auto pb-3 mb-5 scrollbar-none">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setSearchParams(cat === 'All' ? {} : { category: cat })}
            className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-semibold transition-all
                        ${category === cat
                          ? 'bg-brand-purple text-white'
                          : 'bg-white text-slate-600 border border-slate-200 hover:border-brand-purple'
                        }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <ProductGridSkeleton count={8} />
      ) : products.length === 0 ? (
        <div className="text-center py-16">
          <span className="text-6xl">🔍</span>
          <p className="text-slate-500 mt-4 font-medium">No products found</p>
          <p className="text-slate-400 text-sm">Try a different search or category</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {products.filter(p => !p.isVIPOnly).map(p => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}

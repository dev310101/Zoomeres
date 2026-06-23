/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Zoomeres Gen Z palette
        brand: {
          purple:       '#7C3AED',
          'purple-dark': '#6d28d9',
          'purple-light':'#8b5cf6',
          orange:       '#F97316',
          'orange-dark': '#ea6c0a',
          'orange-light':'#fb923c',
          pink:         '#EC4899',
          'pink-dark':  '#db2777',
          cyan:         '#06B6D4',
          dark:         '#0F172A',
        },
        gold: '#F59E0B',
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'sans-serif'],
      },
      backgroundImage: {
        'brand-gradient':    'linear-gradient(135deg, #7C3AED 0%, #EC4899 100%)',
        'orange-gradient':   'linear-gradient(135deg, #F97316 0%, #EC4899 100%)',
        'cyan-gradient':     'linear-gradient(135deg, #06B6D4 0%, #7C3AED 100%)',
        'card-gradient':     'linear-gradient(135deg, rgba(124,58,237,0.08) 0%, rgba(236,72,153,0.05) 100%)',
      },
      animation: {
        'bounce-cart':  'bounceCart 0.5s cubic-bezier(0.36, 0.07, 0.19, 0.97)',
        'slide-in':     'slideIn 0.3s ease-out',
        'fade-in':      'fadeIn 0.3s ease-out',
        'pulse-ring':   'pulseRing 1.5s cubic-bezier(0.215, 0.61, 0.355, 1) infinite',
        'shimmer':      'shimmer 1.5s infinite',
        'glow-pulse':   'glowPulse 2s ease-in-out infinite',
        'float':        'float 3s ease-in-out infinite',
      },
      keyframes: {
        bounceCart: {
          '0%, 100%': { transform: 'scale(1)' },
          '30%':      { transform: 'scale(1.25)' },
          '60%':      { transform: 'scale(0.9)' },
        },
        slideIn: {
          from: { transform: 'translateX(100%)' },
          to:   { transform: 'translateX(0)' },
        },
        fadeIn: {
          from: { opacity: 0, transform: 'translateY(8px)' },
          to:   { opacity: 1, transform: 'translateY(0)' },
        },
        pulseRing: {
          '0%':   { transform: 'scale(0.8)', opacity: 0.8 },
          '100%': { transform: 'scale(1.6)', opacity: 0 },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        glowPulse: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(124,58,237,0.3)' },
          '50%':      { boxShadow: '0 0 40px rgba(124,58,237,0.6)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%':      { transform: 'translateY(-8px)' },
        },
      },
    },
  },
  plugins: [],
}

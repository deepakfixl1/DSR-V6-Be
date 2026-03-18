/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      colors: {
        admin: {
          bg: '#0F172A',
          surface: '#111827',
          card: '#1F2937',
          border: '#374151',
          'border-subtle': '#1F2937',
          text: '#E5E7EB',
          muted: '#9CA3AF',
          disabled: '#6B7280',
        },
        brand: {
          DEFAULT: '#3B82F6',
          hover: '#2563EB',
          muted: 'rgba(59,130,246,0.12)',
        },
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-in': 'slideIn 0.2s ease-out',
        'slide-up': 'slideUp 0.2s ease-out',
      },
      keyframes: {
        fadeIn: { from: { opacity: 0 }, to: { opacity: 1 } },
        slideIn: { from: { transform: 'translateX(-8px)', opacity: 0 }, to: { transform: 'translateX(0)', opacity: 1 } },
        slideUp: { from: { transform: 'translateY(8px)', opacity: 0 }, to: { transform: 'translateY(0)', opacity: 1 } },
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.3)',
        dropdown: '0 10px 25px rgba(0,0,0,0.5)',
        modal: '0 20px 60px rgba(0,0,0,0.6)',
      },
    },
  },
  plugins: [],
}

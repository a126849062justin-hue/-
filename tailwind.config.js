/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./*.html'],
  theme: {
    extend: {
      colors: {
        // sci colors reference CSS custom properties (--theme-*-rgb) defined
        // via inline <style> in each HTML page (set dynamically by the theme system)
        sci: {
          base: 'rgba(var(--theme-base-rgb), <alpha-value>)',
          surface: 'rgba(var(--theme-surface-rgb), <alpha-value>)',
          cyan: 'rgba(var(--theme-cyan-rgb), <alpha-value>)',
          gold: 'rgba(var(--theme-gold-rgb), <alpha-value>)',
          gray: '#94a3b8',
          accent: 'rgba(var(--theme-cyan-rgb), <alpha-value>)',
        },
        // 課程/課表頁內容用 token（值由各頁 inline :root 的 --color-* 控制，已對齊官網青色）
        brand: {
          bg: 'rgb(var(--color-bg) / <alpha-value>)',
          panel: 'rgb(var(--color-panel) / <alpha-value>)',
          text: 'rgb(var(--color-text) / <alpha-value>)',
          muted: 'rgb(var(--color-muted) / <alpha-value>)',
          border: 'rgb(var(--color-border) / <alpha-value>)',
          red: 'rgb(var(--color-red) / <alpha-value>)',
          'red-dark': 'rgb(var(--color-red-dark) / <alpha-value>)',
        }
      },
      fontFamily: {
        sans: ['Inter', '"Noto Sans TC"', 'sans-serif'],
        heading: ['Montserrat', '"Noto Sans TC"', 'sans-serif'],
        orbitron: ['"Orbitron"', 'sans-serif'],
      },
      animation: {
        'marquee': 'marquee 40s linear infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        marquee: {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(-100%)' },
        },
      },
    }
  },
  plugins: [],
}

/** @type {import('tailwindcss').Config} */
const config = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        text: 'var(--c-text)',
        'text-2': 'var(--c-text-2)',
        accent: 'var(--c-accent)',
        surface: 'var(--c-surface)',
        muted: 'var(--c-muted)',
        border: 'var(--c-border)',
        error: 'var(--c-error)',
        success: 'var(--c-success)',
        warning: 'var(--c-warning)',
        info: 'var(--c-info)',
        'neutral-bg': 'var(--c-neutral-bg)',
        'neutral-label': 'var(--c-neutral-label)',
      },
      fontFamily: {
        sans: ['var(--font-stack)'],
      },
      fontSize: {
        xs: ['var(--font-xs)', { lineHeight: 'var(--lh-base)' }],
        sm: ['var(--font-sm)', { lineHeight: '1.5' }],
        md: ['var(--font-md)', { lineHeight: '1.25' }],
      },
      borderRadius: {
        xs: 'var(--radius-xs)',
        sm: 'var(--radius-sm)',
        lg: 'var(--radius-lg)',
      },
      boxShadow: {
        1: 'var(--shadow-1)',
      },
      minHeight: {
        control: 'var(--space-8)',
      },
      transitionDuration: {
        instant: 'var(--dur-instant)',
        fast: 'var(--dur-fast)',
      },
    },
  },
  plugins: [],
}

export default config

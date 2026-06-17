import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // --- Charte graphique Novacampus Alliance ---
        nc: {
          // Bleus principaux
          navy:    '#002044',   // fond sidebar / navbar
          navymd:  '#1c3d5e',   // hover sidebar
          cyan:    '#4eaac4',   // accent principal (logo, liens actifs)
          light:   '#f0f4fa',   // fond contenu clair

          // Violets secondaires
          purple:  '#443880',
          purplemd:'#665493',
          purplelg: '#8863d2',
          lavender: '#ab81cd',

          // Sémantiques
          success:  '#4b6a6a',
          alert:    '#e15d1b',
          warning:  '#dfa000',
          neutral:  '#b37280',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

export default config

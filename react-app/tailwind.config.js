        /** @type {import('tailwindcss').Config} */
        export default {
          content: [
            "./index.html",
            "./src/**/*.{js,ts,jsx,tsx}",
          ],
          theme: {
            extend: {
              fontFamily: {
                sans: ['Manrope', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
              },
              colors: {
                background: 'rgb(var(--background-rgb) / <alpha-value>)',
                surface: 'rgb(var(--surface-rgb) / <alpha-value>)',
                primary: {
                  DEFAULT: 'rgb(var(--primary-rgb) / <alpha-value>)',
                  foreground: 'rgb(var(--primary-foreground-rgb) / <alpha-value>)',
                },
                secondary: {
                  DEFAULT: 'rgb(var(--secondary-rgb) / <alpha-value>)',
                  foreground: 'rgb(var(--secondary-foreground-rgb) / <alpha-value>)',
                },
                accent: {
                  DEFAULT: 'rgb(var(--accent-rgb) / <alpha-value>)',
                  foreground: 'rgb(var(--accent-foreground-rgb) / <alpha-value>)',
                },
                muted: 'rgb(var(--surface-rgb) / <alpha-value>)',
                border: 'rgb(var(--border-rgb) / <alpha-value>)',
              },
              borderRadius: {
                'xl': '1rem',
                '2xl': '1.5rem',
                '3xl': '2rem',
              },
              animation: {
                'fade-in': 'fadeIn 0.5s ease-out forwards',
                'slide-up': 'slideUp 0.5s ease-out forwards',
                'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                blob: "blob 7s infinite",
              },
              keyframes: {
                fadeIn: {
                  '0%': { opacity: '0' },
                  '100%': { opacity: '1' },
                },
                slideUp: {
                  '0%': { opacity: '0', transform: 'translateY(20px)' },
                  '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                blob: {
                  "0%": {
                    transform: "translate(0px, 0px) scale(1)",
                  },
                  "33%": {
                    transform: "translate(30px, -50px) scale(1.1)",
                  },
                  "66%": {
                    transform: "translate(-20px, 20px) scale(0.9)",
                  },
                  "100%": {
                    transform: "translate(0px, 0px) scale(1)",
                  },
                },
              },
            },
          },
          plugins: [],
        }

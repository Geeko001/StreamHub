/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                // Material You Dark Theme
                surface: {
                    DEFAULT: '#0a0a0a',
                    dim: '#141414',
                    container: '#1a1a1a',
                    'container-high': '#242424',
                    'container-highest': '#2e2e2e',
                },
                primary: {
                    DEFAULT: '#1db954',
                    dim: '#168d40',
                    container: '#0d4d22',
                },
                secondary: {
                    DEFAULT: '#b3b3b3',
                    container: '#3d3d3d',
                },
                accent: {
                    purple: '#a855f7',
                    blue: '#3b82f6',
                    pink: '#ec4899',
                    orange: '#f97316',
                },
                on: {
                    surface: '#ffffff',
                    'surface-variant': '#b3b3b3',
                    primary: '#000000',
                    'primary-container': '#1db954',
                }
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
            },
            animation: {
                'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'bounce-subtle': 'bounce-subtle 1s ease-in-out infinite',
                'gradient': 'gradient 8s ease infinite',
                'slide-up': 'slide-up 0.3s ease-out',
                'slide-down': 'slide-down 0.3s ease-out',
            },
            keyframes: {
                'bounce-subtle': {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-5px)' },
                },
                'gradient': {
                    '0%, 100%': { backgroundPosition: '0% 50%' },
                    '50%': { backgroundPosition: '100% 50%' },
                },
                'slide-up': {
                    '0%': { transform: 'translateY(100%)', opacity: '0' },
                    '100%': { transform: 'translateY(0)', opacity: '1' },
                },
                'slide-down': {
                    '0%': { transform: 'translateY(-100%)', opacity: '0' },
                    '100%': { transform: 'translateY(0)', opacity: '1' },
                },
            },
            backdropBlur: {
                xs: '2px',
            },
            boxShadow: {
                'glow': '0 0 20px rgba(29, 185, 84, 0.3)',
                'glow-lg': '0 0 40px rgba(29, 185, 84, 0.4)',
            }
        },
    },
    plugins: [],
}

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        uno: {
          red: '#e53935',
          yellow: '#fbc02d',
          green: '#43a047',
          blue: '#1e88e5',
          black: '#1a1a1a',
        },
      },
    },
  },
  plugins: [],
};

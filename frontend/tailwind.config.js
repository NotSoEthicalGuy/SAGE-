/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        navy: '#0f172a',
        electric: '#3b82f6',
      },
      boxShadow: {
        glass: '0 10px 30px rgba(15,23,42,0.3)',
      },
    },
  },
  plugins: [],
}
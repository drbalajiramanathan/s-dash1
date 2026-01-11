/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: '#eef2ff', // Very light indigo/blue (Sky-ish)
        surface: '#ffffff',

        // Tab Colors (Pastels)
        tab: {
          posture: '#bfdbfe', // Blue 200
          walking: '#bbf7d0', // Green 200
          feeding: '#fed7aa', // Orange 200
          rumination: '#ddd6fe', // Violet 200
          temp: '#fecaca',    // Red 200
          heart: '#fbcfe8',   // Pink 200
          gps: '#a5f3fc',     // Cyan 200
          transitions: '#e9d5ff', // Purple 200
          activity: '#fde68a', // Amber 200
          drinking: '#bae6fd', // Sky 200
          env: '#c7d2fe',     // Indigo 200
        }
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.07)',
        'card': '0 4px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px -1px rgba(0, 0, 0, 0.02)',
        'glow': '0 0 15px rgba(59, 130, 246, 0.5)',
        'depth': '5px 5px 10px #d1d5db, -5px -5px 10px #ffffff', // Neumorphic-ish depth
      },
      fontFamily: {
        sans: ['Outfit', 'Inter', 'sans-serif'], // Premium font
      }
    },
  },
  plugins: [],
}

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        neon: {
          purple: "#a855f7",
          cyan: "#06b6d4",
        },
      },
      boxShadow: {
        "glow-purple": "0 0 25px rgba(168,85,247,0.45)",
        "glow-cyan": "0 0 25px rgba(6,182,212,0.45)",
      },
      keyframes: {
        "pulse-slow": {
          "0%, 100%": { opacity: 1 },
          "50%": { opacity: 0.45 },
        },
      },
      animation: {
        "pulse-slow": "pulse-slow 1.8s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

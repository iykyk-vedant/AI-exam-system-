/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          blue: "#1e3a8a",
          amber: "#d97706",
          green: "#15803d",
        }
      }
    },
  },
  plugins: [],
}

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Theme Colors requested: Ice Silver (#DDE3E8), Deep Aubergine (#3A0F34), Marigold (#EAA000)
        icesilver: {
          50: "#FFFFFF",
          100: "#F4F7F9",
          200: "#E6ECF0",
          DEFAULT: "#DDE3E8",
          400: "#B9C7D2",
          500: "#95AAB9",
          600: "#718A9C",
        },
        aubergine: {
          950: "#170515",
          900: "#22081F",
          850: "#2B0B27",
          DEFAULT: "#3A0F34",
          700: "#4D1546",
          600: "#631C5B",
          500: "#7F2474",
          400: "#9D3290",
        },
        marigold: {
          300: "#FFCA58",
          400: "#FFB526",
          DEFAULT: "#EAA000",
          600: "#C78600",
          700: "#A36D00",
        },
      },
    },
  },
  plugins: [],
};

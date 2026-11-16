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
      fontFamily: {
        mono: [
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Monaco",
          "Consolas",
          '"Liberation Mono"',
          '"Courier New"',
          "monospace",
        ],
        sans: [
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Monaco",
          "Consolas",
          '"Liberation Mono"',
          '"Courier New"',
          "monospace",
        ],
      },
      colors: {
        // 60:30:10 Rule: 60% Deep Graphite, 30% Soft Cloud White, 10% Lime Yellow
        graphite: {
          950: "#0D0E11",
          900: "#121316", // 60% Canvas base
          850: "#181B1F", // 60% Bento card surface
          800: "#1E2228", // Bento inner containers
          750: "#242931", // Input & active tile backgrounds
          700: "#2D333E", // Subtle borders
          600: "#39414E",
          500: "#4D5666",
          DEFAULT: "#181B1F",
        },
        cloud: {
          50: "#FFFFFF",
          100: "#F4F6F8", // 30% Primary Soft Cloud White text
          200: "#E6EBF0",
          300: "#CCD5DF",
          400: "#A6B2C0", // 30% Secondary Soft Cloud White text
          500: "#7E8C9E", // 30% Muted labels
          600: "#5A6677",
          DEFAULT: "#F4F6F8",
        },
        limeyellow: {
          300: "#E7FF6B",
          400: "#DCFF3B",
          DEFAULT: "#CCFF00", // 10% High-impact accent
          600: "#A8D400",
          700: "#84A600",
        },
      },
    },
  },
  plugins: [],
};

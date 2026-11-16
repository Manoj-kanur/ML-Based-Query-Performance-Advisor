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
        border: "hsl(215 27.9% 16.9%)",
        background: "hsl(222.2 84% 4.9%)",
        foreground: "hsl(210 40% 98%)",
        primary: {
          DEFAULT: "hsl(217.2 91.2% 59.8%)",
          foreground: "hsl(222.2 47.4% 11.2%)",
        },
        card: {
          DEFAULT: "hsl(222.2 84% 6.5%)",
          foreground: "hsl(210 40% 98%)",
        },
      },
    },
  },
  plugins: [],
};

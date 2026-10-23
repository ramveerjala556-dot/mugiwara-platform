import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/app/**/*.{ts,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "1.5rem",
      screens: { "2xl": "1400px" },
    },
    extend: {
      colors: {
        // MUGIWARA palette — midnight seas and treasure gold.
        midnight: {
          950: "#050b1a",
          900: "#081228",
          800: "#0c1a38",
          700: "#12244c",
          600: "#1b3266",
        },
        navy: {
          DEFAULT: "#0a1733",
          soft: "#122347",
        },
        gold: {
          50: "#fff9e6",
          100: "#fdeec2",
          200: "#fadf8f",
          300: "#f6cd57",
          400: "#f2bd2e",
          500: "#e0a30f",
          600: "#b57f09",
          700: "#8a5f08",
          800: "#5f4106",
          900: "#3a2704",
        },
        ocean: {
          400: "#4bb6e8",
          500: "#2a95d4",
          600: "#1d76b0",
        },
        parchment: "#f4e9d0",
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        glass: "0 8px 32px rgba(4, 10, 25, 0.45)",
        glow: "0 0 30px rgba(242, 189, 46, 0.25)",
      },
      backgroundImage: {
        "ocean-sunset":
          "linear-gradient(180deg, #0a1733 0%, #102a52 35%, #1d5b8f 70%, #e0a34f 100%)",
        "gold-sheen":
          "linear-gradient(135deg, #f6cd57 0%, #e0a30f 50%, #b57f09 100%)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "pulse-slow": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.55" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.4s ease-out both",
        "pulse-slow": "pulse-slow 2.4s ease-in-out infinite",
        shimmer: "shimmer 2s infinite",
      },
    },
  },
  plugins: [],
};

export default config;

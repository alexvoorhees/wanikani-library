import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        "border-subtle": "hsl(var(--border-subtle))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        "background-paper": "hsl(var(--background-paper))",
        "background-reading": "hsl(var(--background-reading))",
        foreground: "hsl(var(--foreground))",
        "foreground-muted": "hsl(var(--foreground-muted))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
          vermilion: "hsl(var(--accent-vermilion))",
        },
        info: {
          DEFAULT: "hsl(var(--info))",
          foreground: "hsl(var(--info-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      fontFamily: {
        sans: [
          "Hiragino Kaku Gothic ProN",
          "Hiragino Sans",
          "-apple-system",
          "BlinkMacSystemFont",
          "Noto Sans JP",
          "Yu Gothic",
          "Meiryo",
          "sans-serif",
        ],
        serif: [
          "Hiragino Mincho ProN",
          "Noto Serif JP",
          "Yu Mincho",
          "serif",
        ],
        japanese: [
          "Hiragino Mincho ProN",
          "Noto Serif JP",
          "Yu Mincho",
          "Hiragino Kaku Gothic ProN",
          "serif",
        ],
      },
      fontSize: {
        xs: ["var(--font-size-xs)", { lineHeight: "var(--leading-normal)" }],
        sm: ["var(--font-size-sm)", { lineHeight: "var(--leading-normal)" }],
        base: ["var(--font-size-base)", { lineHeight: "var(--leading-relaxed)" }],
        lg: ["var(--font-size-lg)", { lineHeight: "var(--leading-relaxed)" }],
        xl: ["var(--font-size-xl)", { lineHeight: "var(--leading-relaxed)" }],
        "2xl": ["var(--font-size-2xl)", { lineHeight: "var(--leading-tight)" }],
        "3xl": ["var(--font-size-3xl)", { lineHeight: "var(--leading-tight)" }],
        "4xl": ["var(--font-size-4xl)", { lineHeight: "var(--leading-tight)" }],
      },
      lineHeight: {
        tight: "var(--leading-tight)",
        normal: "var(--leading-normal)",
        relaxed: "var(--leading-relaxed)",
        reading: "var(--leading-reading)",
      },
      borderRadius: {
        lg: "var(--radius-lg)",
        md: "var(--radius)",
        sm: "calc(var(--radius) - 2px)",
      },
      boxShadow: {
        sm: "var(--shadow-sm)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
      },
      spacing: {
        "18": "4.5rem",
        "22": "5.5rem",
      },
    },
  },
  plugins: [],
};

export default config;

import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        bengali: ['"Noto Sans Bengali"', 'sans-serif'],
        display: ['"Playfair Display"', '"Noto Sans Bengali"', 'serif'],
      },
      colors: {
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
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        rose: {
          soft: "hsl(var(--rose-soft))",
          glow: "hsl(var(--rose-glow))",
        },
        heirloom: {
          bg: "hsl(var(--heirloom-bg))",
          paper: "hsl(var(--heirloom-paper))",
          cream: "hsl(var(--heirloom-cream))",
          ink: "hsl(var(--heirloom-ink))",
          "ink-soft": "hsl(var(--heirloom-ink-soft))",
          "ink-mute": "hsl(var(--heirloom-ink-mute))",
          line: "hsl(var(--heirloom-line))",
          gold: "hsl(var(--heirloom-gold))",
          "gold-deep": "hsl(var(--heirloom-gold-deep))",
          seal: "hsl(var(--heirloom-seal))",
        },
        coral: "hsl(var(--coral))",

        peach: "hsl(var(--peach))",
        gold: "hsl(var(--gold))",
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      fontSize: {
        micro: ["0.625rem", { lineHeight: "0.875rem" }],
      },
      boxShadow: {
        "heirloom-card": "0 1px 0 hsl(var(--heirloom-gold) / 0.1), 0 8px 24px -16px hsl(var(--heirloom-gold) / 0.25)",
        "heirloom-hairline": "0 1px 0 hsl(var(--heirloom-gold) / 0.08)",
        "heirloom-sticky": "0 8px 18px -18px hsl(var(--heirloom-ink) / 0.35)",
        "heirloom-sticky-soft": "0 4px 12px -8px hsl(var(--heirloom-ink) / 0.15)",
        "heirloom-pop": "0 12px 30px -12px hsl(var(--heirloom-ink) / 0.3)",
        "heirloom-sheet": "0 -12px 40px -12px hsl(var(--heirloom-ink) / 0.3)",
        "heirloom-dialog": "0 20px 50px -15px hsl(var(--heirloom-ink) / 0.3)",
        "heirloom-float": "0 10px 30px -10px hsl(var(--heirloom-gold-deep) / 0.4)",
        "heirloom-chip": "0 2px 8px hsl(var(--heirloom-gold-deep) / 0.35)",
        "heirloom-photo": "0 4px 12px hsl(var(--heirloom-gold-deep) / 0.15)",
        "heirloom-toast": "0 6px 20px -10px hsl(var(--heirloom-ink) / 0.35)",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },

      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "float": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        "pulse-soft": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.7" },
        },
        "shimmer": {
          "0%": { backgroundPosition: "200% 0" },
          "100%": { backgroundPosition: "-200% 0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "float": "float 3s ease-in-out infinite",
        "pulse-soft": "pulse-soft 2s ease-in-out infinite",
        "shimmer": "shimmer 1.4s linear infinite",

      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;

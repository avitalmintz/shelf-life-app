import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: { center: true, padding: "1rem", screens: { "2xl": "1400px" } },
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui'],
        display: ['Fraunces', 'ui-serif', 'Georgia'],
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
          soft: "hsl(var(--primary-soft))",
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
        cat: {
          place:    { DEFAULT: "hsl(var(--cat-place))",   foreground: "hsl(var(--cat-place-fg))" },
          watch:    { DEFAULT: "hsl(var(--cat-watch))",   foreground: "hsl(var(--cat-watch-fg))" },
          read:     { DEFAULT: "hsl(var(--cat-read))",    foreground: "hsl(var(--cat-read-fg))" },
          style:    { DEFAULT: "hsl(var(--cat-style))",   foreground: "hsl(var(--cat-style-fg))" },
          product:  { DEFAULT: "hsl(var(--cat-product))", foreground: "hsl(var(--cat-product-fg))" },
          recipe:   { DEFAULT: "hsl(var(--cat-recipe))",  foreground: "hsl(var(--cat-recipe-fg))" },
          idea:     { DEFAULT: "hsl(var(--cat-idea))",    foreground: "hsl(var(--cat-idea-fg))" },
          other:    { DEFAULT: "hsl(var(--cat-other))",   foreground: "hsl(var(--cat-other-fg))" },
        },
        prio: {
          low:  { DEFAULT: "hsl(var(--prio-low))",  foreground: "hsl(var(--prio-low-fg))" },
          med:  { DEFAULT: "hsl(var(--prio-med))",  foreground: "hsl(var(--prio-med-fg))" },
          high: { DEFAULT: "hsl(var(--prio-high))", foreground: "hsl(var(--prio-high-fg))" },
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 4px)",
        sm: "calc(var(--radius) - 8px)",
      },
      backgroundImage: {
        'gradient-warm': 'var(--gradient-warm)',
        'gradient-soft': 'var(--gradient-soft)',
      },
      boxShadow: {
        card: 'var(--shadow-card)',
        pop: 'var(--shadow-pop)',
      },
      keyframes: {
        "accordion-down": { from: { height: "0" }, to: { height: "var(--radix-accordion-content-height)" } },
        "accordion-up":   { from: { height: "var(--radix-accordion-content-height)" }, to: { height: "0" } },
        "fade-in": { from: { opacity: "0", transform: "translateY(6px)" }, to: { opacity: "1", transform: "translateY(0)" } },
        "pop-in":  { "0%": { opacity: "0", transform: "scale(.96)" }, "100%": { opacity: "1", transform: "scale(1)" } },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in .35s ease-out both",
        "pop-in":  "pop-in .25s ease-out both",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;

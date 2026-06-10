/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      // Tokens do design system do simulador (tema Windows 11)
      colors: {
        desktop: {
          DEFAULT: "#0a0a0a",
          surface: "#1c1c1e",
          elevated: "#2c2c2e",
          border: "#3a3a3c",
        },
        accent: {
          DEFAULT: "#0078d4",
          hover: "#106ebe",
          subtle: "#deecf9",
        },
      },
      borderRadius: {
        window: "8px",
      },
      boxShadow: {
        window: "0 8px 32px rgba(0, 0, 0, 0.45)",
        taskbar: "0 -1px 0 rgba(255, 255, 255, 0.08)",
      },
      fontFamily: {
        system: ["Segoe UI", "system-ui", "-apple-system", "sans-serif"],
      },
    },
  },
  plugins: [],
}

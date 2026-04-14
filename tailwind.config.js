/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        // Ninja Dark Palette
        'ninja': {
          'void': '#000000',      // Pure black
          'shadow': '#0a0a0a',    // Almost black
          'night': '#111111',     // Dark charcoal
          'steel': '#1a1a1a',     // Steel black
          'smoke': '#2a2a2a',     // Smoke gray
          'ash': '#3a3a3a',       // Ash gray
        },
        // Punk Accent Colors
        'punk': {
          'electric': '#00ff41',   // Electric green
          'blood': '#ff0040',      // Blood red
          'toxic': '#ff6600',      // Toxic orange
          'cyber': '#00ffff',      // Cyber cyan
          'neon': '#ff00ff',       // Neon magenta
          'acid': '#ccff00',       // Acid yellow
        },
        // Danger/Warning Colors
        'danger': {
          'dark': '#660000',
          'DEFAULT': '#ff0040',
          'bright': '#ff3366',
        }
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'ninja-void': 'linear-gradient(135deg, #000000, #0a0a0a, #111111)',
        'ninja-shadow': 'linear-gradient(135deg, #0a0a0a, #111111, #1a1a1a)',
        'punk-electric': 'linear-gradient(135deg, #00ff41, #00cc33, #009926)',
        'punk-blood': 'linear-gradient(135deg, #ff0040, #cc0033, #990026)',
        'deadly-mist': 'radial-gradient(circle at center, rgba(0,0,0,0.9), rgba(10,10,10,0.95), rgba(0,0,0,1))',
      },
      boxShadow: {
        'ninja': '0 0 20px rgba(0, 255, 65, 0.3)',
        'punk': '0 0 30px rgba(255, 0, 64, 0.4)',
        'deadly': '0 0 40px rgba(0, 0, 0, 0.8)',
        'electric': '0 0 25px rgba(0, 255, 255, 0.5)',
      },
      animation: {
        'flicker': 'flicker 2s infinite alternate',
        'pulse-punk': 'pulse-punk 1.5s ease-in-out infinite alternate',
        'shadow-dance': 'shadow-dance 3s ease-in-out infinite',
      }
    },
  },
  plugins: [],
} 
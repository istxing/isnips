/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        apple: {
          bg: '#F5F5F7',
          surface: '#FFFFFF',
          'surface-secondary': '#FBFBFD',
          'surface-dark': '#1C1C1E',
          'surface-dark-secondary': '#2C2C2E',
          text: '#1D1D1F',
          'text-secondary': '#6E6E73',
          'text-tertiary': '#86868B',
          'text-dark': '#F5F5F7',
          'text-dark-secondary': '#98989D',
          blue: '#0071E3',
          'blue-hover': '#0077ED',
          border: 'rgba(0, 0, 0, 0.06)',
          'border-dark': 'rgba(255, 255, 255, 0.08)',
        },
      },
      borderRadius: {
        xs: '8px',
        sm: '10px',
        md: '12px',
        lg: '16px',
        xl: '20px',
        '2xl': '24px',
      },
      boxShadow: {
        'apple-sm': '0 2px 12px rgba(0, 0, 0, 0.04)',
        'apple-md': '0 4px 20px rgba(0, 0, 0, 0.06)',
        'apple-lg': '0 12px 36px rgba(0, 0, 0, 0.08)',
      },
      fontFamily: {
        apple: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"SF Pro Display"',
          '"SF Pro Text"',
          '"PingFang SC"',
          '"PingFang TC"',
          'sans-serif',
        ],
      },
    },
  },
  plugins: [],
};

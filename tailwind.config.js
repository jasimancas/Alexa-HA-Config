
// tailwind.config.js (or tailwind.config.mjs)
import withMT from "@material-tailwind/react/utils/withMT";

export default withMT({
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./src/**/*.{js,ts,jsx,tsx}",  // if you use /src
    "./public/**/*.html",
  ],
  darkMode: "media", // Follow browser/OS preference
  theme: {
    extend: {
      colors: {
        // Home Assistant color scheme
        ha: {
          // Primary blue
          primary: '#03A9F4',
          'primary-light': '#4FC3F7',
          'primary-dark': '#0288D1',
          // Accent
          accent: '#FF9800',
          // Light mode
          'light-bg': '#FAFAFA',
          'light-card': '#FFFFFF',
          'light-sidebar': '#E5E5E5',
          'light-divider': '#E0E0E0',
          'light-text': '#212121',
          'light-text-secondary': '#727272',
          // Dark mode
          'dark-bg': '#111318',
          'dark-card': '#1C1C1C',
          'dark-sidebar': '#1E1E1E',
          'dark-divider': '#3D3D3D',
          'dark-text': '#E1E1E1',
          'dark-text-secondary': '#9E9E9E',
          // States
          success: '#4CAF50',
          warning: '#FF9800',
          error: '#F44336',
          info: '#2196F3',
        },
      },
    },
  },
  plugins: [],
});

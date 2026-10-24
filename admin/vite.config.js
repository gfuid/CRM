import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Older iPads / iPhones (Safari 14+) must still be able to run the app; the default target would show a blank page there
  build: {
    target: ['es2020', 'safari14', 'chrome87', 'edge88', 'firefox78'],
  },
  server: {
    port: 5174,
  },
});

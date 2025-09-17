import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ command }) => {
  return {
    plugins: [react()],
    server: {
      // only affects "vite dev"
      cors: command === "serve" ? true : false,
    },
  };
});
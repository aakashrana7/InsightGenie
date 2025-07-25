import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  root: './client',  // tell vite to use 'client' folder as root
  plugins: [react()],
  publicDir: 'public',  // points to ./client/public by default
  build: {
    outDir: '../dist', // output folder relative to root, optional
  }
})

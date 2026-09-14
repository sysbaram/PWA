import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/postcss';

export default defineConfig({ base: './', css: { postcss: { plugins: [tailwindcss()] } }, plugins: [react()] });

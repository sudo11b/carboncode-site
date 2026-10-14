import { defineConfig } from 'astro/config';

// Static output only. The API is a separate Worker (worker/index.ts) that sits
// in front of these files; Astro never runs on the server.
export default defineConfig({
  output: 'static',
  outDir: './dist',
  build: { format: 'file' }, // /admin -> dist/admin.html, served at /admin
});

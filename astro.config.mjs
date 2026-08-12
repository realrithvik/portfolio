import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import keystatic from '@keystatic/astro';
import cloudflare from '@astrojs/cloudflare';

export default defineConfig({
  site: 'https://rithvik.dev',
  // React and the adapter exist only to serve the Keystatic admin UI at /keystatic.
  // Every page of the site itself stays static.
  integrations: [react(), keystatic()],
  adapter: cloudflare(),
  output: 'static',
});

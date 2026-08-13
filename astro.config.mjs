import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import keystatic from '@keystatic/astro';
import cloudflare from '@astrojs/cloudflare';

export default defineConfig({
  site: 'https://portfolio.rikiserver.win',
  // React and the adapter exist only to serve the Keystatic admin UI at /keystatic.
  // Every page of the site itself stays static.
  integrations: [react(), keystatic()],
  adapter: cloudflare(),
  output: 'static',
  vite: {
    define: {
      // Keystatic's admin UI reads this from import.meta.env in the *client* bundle,
      // so it has to be inlined at build time. Baked in rather than set as a
      // Cloudflare build variable: it is public, it never changes, and build-time vs
      // runtime variables are separate screens there — an easy silent misconfiguration.
      // The three credentials are different: Keystatic reads those from
      // locals.runtime.env, so they stay runtime secrets and never touch the repo.
      'import.meta.env.PUBLIC_KEYSTATIC_GITHUB_APP_SLUG':
        JSON.stringify('rithvik-portfolio-cms'),
    },
  },
});

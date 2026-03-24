import base44 from "@base44/vite-plugin"
import fs from 'node:fs'
import path from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const repoName = process.env.GITHUB_REPOSITORY?.split('/')[1];
const base = process.env.GITHUB_ACTIONS === 'true' && repoName ? `/${repoName}/` : '/';

const spaFallbackPlugin = () => ({
  name: 'spa-fallback',
  closeBundle() {
    const distDir = path.resolve(process.cwd(), 'dist');
    const indexPath = path.join(distDir, 'index.html');
    const fallbackPath = path.join(distDir, '404.html');

    if (fs.existsSync(indexPath)) {
      const assetDir = path.join(distDir, 'assets');
      const iconFile = fs.existsSync(assetDir)
        ? fs.readdirSync(assetDir).find((name) => /^chromeicon-.*\.png$/i.test(name))
        : null;

      if (iconFile) {
        const normalizedBase = base.endsWith('/') ? base.slice(0, -1) : base;
        const iconHref = `${normalizedBase}/assets/${iconFile}`;
        let html = fs.readFileSync(indexPath, 'utf8');

        html = html.replace(/^\s*<link rel="icon"[^>]*>\r?\n?/m, '');
        html = html.replace(/^\s*<link rel="shortcut icon"[^>]*>\r?\n?/m, '');
        html = html.replace(/^\s*<link rel="apple-touch-icon"[^>]*>\r?\n?/m, '');
        html = html.replace(
          /<meta name="viewport" content="width=device-width, initial-scale=1\.0"\s*\/>/,
          `<link rel="icon" type="image/png" href="${iconHref}" />\n    <link rel="shortcut icon" href="${iconHref}" />\n    <link rel="apple-touch-icon" href="${iconHref}" />\n    <meta name="viewport" content="width=device-width, initial-scale=1.0" />`
        );

        fs.writeFileSync(indexPath, html);
      }

      fs.copyFileSync(indexPath, fallbackPath);
    }
  },
});

// https://vite.dev/config/
export default defineConfig({
  base,
  plugins: [
    base44({
      // Support for legacy code that imports the base44 SDK with @/integrations, @/entities, etc.
      // can be removed if the code has been updated to use the new SDK imports from @base44/sdk
      legacySDKImports: process.env.BASE44_LEGACY_SDK_IMPORTS === 'true',
      hmrNotifier: true,
      navigationNotifier: true,
      analyticsTracker: true,
      visualEditAgent: true
    }),
    react(),
    spaFallbackPlugin(),
  ],
  server: {
    host: 'localhost',
  },
});

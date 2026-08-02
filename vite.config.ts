import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

// Strip `crossorigin` attribute from HTML tags in production builds.
// Electron loads via file:// protocol where crossorigin breaks import.meta.url resolution,
// causing new URL("asset.webp", import.meta.url) to produce broken paths.
function stripCrossOrigin(): Plugin {
  return {
    name: 'strip-crossorigin',
    enforce: 'post',
    transformIndexHtml(html) {
      return html.replace(/\s+crossorigin(?=[>\s/])/g, '');
    },
  };
}

// Proxy AI API requests through the dev server to bypass CORS in browser mode.
// Works only in Vite dev mode. For Firebase production, a Cloud Function proxy is needed.
function aiApiProxy(): Plugin {
  return {
    name: 'ai-api-proxy',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/ai-proxy') || req.method !== 'POST') {
          return next();
        }
        const chunks: Buffer[] = [];
        for await (const chunk of req) {
          chunks.push(chunk instanceof Buffer ? chunk : Buffer.from(chunk));
        }
        try {
          const raw = Buffer.concat(chunks).toString();
          const parsed = JSON.parse(raw);
          const { url, headers: reqHeaders, requestBody } = parsed;
          if (!url) {
            console.error('[ai-proxy] Missing url in request body');
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Missing url' }));
            return;
          }
          console.log(`[ai-proxy] Forwarding to: ${url.substring(0, 80)}...`);
          const fetchOptions: RequestInit = {
            method: 'POST',
            headers: { ...reqHeaders },
          };
          if (requestBody) {
            fetchOptions.body = JSON.stringify(requestBody);
          }
          const response = await fetch(url, fetchOptions);
          const responseText = await response.text();
          console.log(`[ai-proxy] Response status: ${response.status}, body length: ${responseText.length}`);
          const contentType = response.headers.get('content-type') || 'application/json';
          res.writeHead(response.status, {
            'Content-Type': contentType.includes('json') ? contentType : 'application/json',
            'Access-Control-Allow-Origin': '*',
          });
          res.end(responseText);
        } catch (err: any) {
          console.error('[ai-proxy] Error:', err.message);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: err.message }));
        }
      });
    },
  };
}

// Fix asset URLs for Electron asar + file:// protocol.
// Vite generates `new URL("asset.webp", import.meta.url).href` for imported assets.
// In Electron with asar + file:// protocol, import.meta.url doesn't resolve correctly.
// This plugin replaces those calls with simple string literals.
function fixElectronAssetUrls(): Plugin {
  return {
    name: 'fix-electron-asset-urls',
    enforce: 'post',
    renderChunk(code) {
      const before = (code.match(/new URL\(/g) || []).length;
      const result = code.replace(
        /(\+)?new URL\((['"])((?:(?!\2).)+)\2\s*,\s*import\.meta\.url\)\.href/g,
        (_, prefix, quote, filename) => `${prefix || ''}"./assets/${filename}"`
      );
      const after = (result.match(/new URL\(/g) || []).length;
      if (before > 0) {
        console.log(`[fix-electron-asset-urls] Replaced ${before - after} of ${before} new URL() calls`);
      }
      return { code: result, map: null };
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  base: './',
  plugins: [
    react(),
    tailwindcss(),
    stripCrossOrigin(),
    fixElectronAssetUrls(),
    aiApiProxy(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
  server: {
    port: 3000,
  },
  build: {
    modulePreload: false,
    assetsInlineLimit: 0,
    rollupOptions: {
      output: {
        entryFileNames: 'js/[name]-[hash].js',
        chunkFileNames: 'js/[name]-[hash].js',
        assetFileNames: 'assets/[name].[ext]',
      },
    },
  },
});

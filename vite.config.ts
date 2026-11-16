import { defineConfig } from 'vite';
import { renderPage, meta } from './src/render';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;');

export default defineConfig({
  plugins: [
    {
      name: 'render-content',
      transformIndexHtml: (html) =>
        html
          .replace('<!--page-->', renderPage())
          .replaceAll('%TITLE%', esc(meta.title))
          .replaceAll('%DESCRIPTION%', esc(meta.description)),
    },
  ],
});

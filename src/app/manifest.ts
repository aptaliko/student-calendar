import type { MetadataRoute } from 'next';

// Lets the app be installed from the browser (iPhone: Share → Add to Home Screen).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Ημερολόγιο Μαθητών',
    short_name: 'Μαθήματα',
    description: 'Μαθήματα, παρουσίες και πληρωμές μαθητών.',
    lang: 'el',
    start_url: '/',
    display: 'standalone',
    background_color: '#f6f5fb',
    theme_color: '#7c3aed',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}

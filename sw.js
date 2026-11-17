// Service Worker — Vida em Moz
// Minimal: no caching strategy yet, just registers cleanly so the
// browser stops throwing a 404 on /VIDAEMMOZ/sw.js

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => { /* pass-through, no cache */ });

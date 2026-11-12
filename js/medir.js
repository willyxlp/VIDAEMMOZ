/* ============================================================
   Vida na Banda — 📈 medição (FILA 0s, dono 30 out: «we should add pixels»)
   1) Origem: guarda o primeiro toque (?utm_source=…&utm_campaign=… / ?ref=… / site de onde veio) e,
      quando a personagem nasce, manda-o ao servidor (marcar_origem) — assim sabemos que post trouxe quem.
   2) Vercel Web Analytics: conta visitas sem cookies e sem dados pessoais (só no site a sério).
   3) Pixels Meta / TikTok: só ligam se houver ID abaixo E o jogador aceitar no aviso de cookies.
      Os IDs dos pixels são públicos (não são segredos). Ao pô-los, abrir também os domínios na CSP do vercel.json:
        script-src https://connect.facebook.net https://analytics.tiktok.com
        connect-src https://www.facebook.com https://connect.facebook.net https://analytics.tiktok.com
        frame-src (Meta) https://www.facebook.com
   Eventos: medir('conta') quando cria conta; medir('registo') quando a personagem nasce. Nunca mandar email/nome.
   ============================================================ */
(function () {
  const PIXEL = { meta: '', tiktok: '' };   // Meta (Facebook + Instagram) desde 30 out; TikTok: falta o ID
  const PROD = /(^|\.)vidanabanda\.com$/.test(location.hostname);
  const get = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const set = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { } };

  // 1) origem — primeiro toque
  try {
    const q = new URLSearchParams(location.search);
    let o = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'ref']
      .filter(k => q.get(k)).map(k => k.replace('utm_', '') + '=' + q.get(k)).join('&');
    if (!o && document.referrer) {
      try { const h = new URL(document.referrer).hostname; if (h && !/(^|\.)vidanabanda\.com$/.test(h) && h !== location.hostname) o = 'referrer=' + h; } catch (e) { }
    }
    o = o.replace(/[^A-Za-z0-9_.:\/=&-]/g, '').slice(0, 120);
    if (o && !get('vel_origem')) set('vel_origem', o);
  } catch (e) { }
  window.origemGuardada = () => get('vel_origem');

  // 2) Vercel Web Analytics (sem cookies)
  window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };
  if (PROD) { const s = document.createElement('script'); s.defer = true; s.src = '/_vercel/insights/script.js'; document.head.appendChild(s); }

  // 3) pixels com consentimento
  const temPixel = !!(PIXEL.meta || PIXEL.tiktok);
  function ligarPixels() {
    if (!PROD || !temPixel || window.__pixelsLigados) return;
    window.__pixelsLigados = true;
    if (PIXEL.meta) {
      const f = window.fbq = function () { f.callMethod ? f.callMethod.apply(f, arguments) : f.queue.push(arguments); };
      if (!window._fbq) window._fbq = f; f.push = f; f.loaded = true; f.version = '2.0'; f.queue = [];
      const s = document.createElement('script'); s.async = true; s.src = 'https://connect.facebook.net/en_US/fbevents.js'; document.head.appendChild(s);
      f('init', PIXEL.meta); f('track', 'PageView');
    }
    if (PIXEL.tiktok) {
      const t = window.ttq = window.ttq || [];
      ['page', 'track', 'identify', 'instances', 'debug', 'on', 'off', 'once', 'ready', 'alias', 'group', 'enableCookie', 'disableCookie']
        .forEach(m => { t[m] = function () { t.push([m].concat([].slice.call(arguments))); }; });
      const s = document.createElement('script'); s.async = true; s.src = 'https://analytics.tiktok.com/i18n/pixel/events.js?sdkid=' + encodeURIComponent(PIXEL.tiktok) + '&lib=ttq'; document.head.appendChild(s);
      t.page();
    }
  }
  function avisoCookies() {
    if (!PROD || !temPixel || get('vel_cookies') || document.getElementById('avisoCookies')) return;
    const T = s => (typeof tr === 'function' ? tr(s) : s);
    const d = document.createElement('div'); d.id = 'avisoCookies';
    d.setAttribute('role', 'dialog'); d.setAttribute('aria-label', T('Cookies'));
    d.style.cssText = 'position:fixed;left:12px;right:12px;bottom:12px;z-index:99999;max-width:460px;margin:0 auto;padding:14px;border-radius:14px;background:#141821;color:#fff;font:14px/1.4 Inter,system-ui,sans-serif;box-shadow:0 8px 30px rgba(0,0,0,.45)';
    d.innerHTML = `<div>${T('Usamos cookies para melhorar o jogo e o que te mostramos.')} <a href="termos.html#privacidade" style="color:#FFCB00">${T('Privacidade')}</a></div>
      <div style="display:flex;gap:8px;margin-top:10px"><button class="btn sm" data-c="sim" style="flex:1">${T('Aceitar')}</button><button class="btn sm ghost" data-c="nao" style="flex:1">${T('Recusar')}</button></div>`;
    d.querySelectorAll('[data-c]').forEach(b => b.addEventListener('click', () => {
      set('vel_cookies', b.dataset.c); d.remove(); if (b.dataset.c === 'sim') ligarPixels();
    }));
    document.body.appendChild(d);
  }
  if (get('vel_cookies') === 'sim') ligarPixels();
  const pronto = fn => document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', fn, { once: true }) : fn();
  pronto(() => setTimeout(avisoCookies, 1500));

  // eventos: só o nome do evento, nunca dados pessoais
  const NOMES = { conta: ['Lead', 'SubmitForm'], registo: ['CompleteRegistration', 'CompleteRegistration'] };
  window.medir = function (ev) {
    try {
      window.va('event', { name: ev });
      const n = NOMES[ev]; if (!n) return;
      if (window.fbq) window.fbq('track', n[0]);
      if (window.ttq && window.ttq.track) window.ttq.track(n[1]);
    } catch (e) { }
  };
  // quando a personagem nasce: evento + origem para o servidor (uma vez)
  window.medirRegisto = function () {
    window.medir('registo');
    const o = get('vel_origem');
    if (o && typeof sb !== 'undefined' && sb.rpc) sb.rpc('marcar_origem', { p_origem: o }).then(() => { }, () => { });
  };
})();

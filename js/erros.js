/* ============================================================
   Vida na Banda — ERROS
   Quando alguma coisa rebenta no telemóvel de um jogador, manda um
   resumo para o Supabase (sem dados pessoais) para corrigirmos depressa.
   ============================================================ */
// FILA 0ba-A (dono, 1 nov): site de teste — em teste.vidanabanda.com (e nas pré-visualizações da Vercel) o jogo usa a base de TESTE, nunca a real.
window.VEL_TESTE = /^teste\./.test(location.hostname) || /\.vercel\.app$/.test(location.hostname);
window.VEL_LOCAL = /^(127\.0\.0\.1|localhost)$/.test(location.hostname);
window.VEL_SUPA = window.VEL_CONFIG && window.VEL_CONFIG.url && !/YOUR-PROJECT-REF/.test(window.VEL_CONFIG.url) ? window.VEL_CONFIG : null;
if (!window.VEL_SUPA) {
  alert('Falta preencher config.js com o URL e a chave do teu projeto Supabase.');
  window.VEL_SUPA = { url: 'https://invalid.localhost', key: 'none' };
}
if (window.VEL_TESTE) document.addEventListener('DOMContentLoaded', () => {   // faixa «TESTE» sempre visível e o Google não indexa
  const m = document.createElement('meta'); m.name = 'robots'; m.content = 'noindex, nofollow'; document.head.appendChild(m);
  const f = document.createElement('div'); f.id = 'faixaTeste'; f.textContent = 'TESTE · base de testes · nada aqui conta no jogo a sério';
  f.style.cssText = 'position:fixed;left:0;right:0;top:0;z-index:99999;background:repeating-linear-gradient(45deg,#ffcb00 0 12px,#121014 12px 24px);color:#fff;font:900 11px system-ui,sans-serif;text-align:center;padding:2px 0;text-shadow:0 0 3px #000,0 0 3px #000;pointer-events:none;letter-spacing:.05em';
  document.body.appendChild(f);
});
(() => {
  const URL_ERRO = window.VEL_SUPA.url + '/rest/v1/rpc/registar_erro';
  const CHAVE = window.VEL_SUPA.key;
  const VERSAO = document.querySelector('meta[name="versao"]')?.content || '2026-10-21';   // 6 nov: carimbada por tools/gerar_linguas.py
  const vistos = new Set(); let enviados = 0;
  // dono 6 nov: não contar como erro o que vem de extensões do browser (carteiras cripto, etc.) nem avisos normais ao jogador
  const ignorar = m => !m || /^Script error\.?$/.test(m) || /ResizeObserver loop/.test(m) || /extension:\/\//.test(m)
    || /window\.ethereum|SCDynimacBridge|No Listener: tabs:|webkit-masked-url|__firefox__|Failed to start the audio device/.test(m) || /^Confirma que não és um robô/.test(m);
  function token() {
    try { for (const k of Object.keys(localStorage)) if (/^sb-.*-auth-token$/.test(k)) return JSON.parse(localStorage.getItem(k))?.access_token; } catch { }
    return null;
  }
  function enviar(msg, origem, pilha) {
    msg = String(msg || '').slice(0, 500);
    if (ignorar(msg) || /extension:\/\//.test(origem || '') || /^\/(\?[^:]*)?:1:\d+$/.test(origem || '') || enviados >= 10) return;   // «/:1:…» = código metido na página pelo browser da app (Firefox iOS, carteiras), não é nosso
    const k = msg + '|' + origem; if (vistos.has(k)) return; vistos.add(k); enviados++;
    if (location.hostname === '127.0.0.1' || location.hostname === 'localhost') { console.warn('[erro]', msg, origem); return; }
    try {
      fetch(URL_ERRO, {
        method: 'POST', keepalive: true,
        headers: { 'Content-Type': 'application/json', apikey: CHAVE, Authorization: 'Bearer ' + (token() || CHAVE) },
        body: JSON.stringify({ p_msg: msg, p_origem: origem || null, p_pilha: String(pilha || '').slice(0, 3000) || null,
          p_ua: navigator.userAgent, p_url: location.pathname + location.hash, p_versao: VERSAO }),
      }).catch(() => { });
    } catch { }
  }
  window.addEventListener('error', e => {
    const f = (e.filename || '').replace(location.origin, '');
    enviar(e.message, f ? `${f}:${e.lineno}:${e.colno}` : '', e.error?.stack);
  });
  window.addEventListener('unhandledrejection', e => {
    const r = e.reason; enviar(r?.message || String(r), 'promessa', r?.stack);
  });
  window.registarErro = enviar;
})();

// Dono, 1 nov: aviso na consola contra burlas (como o do Facebook) — quem pede para colar código aqui quer roubar a tua conta.
(function () {
  try {
    const l = (localStorage.getItem('vel_lingua') || navigator.language || 'pt').slice(0, 2);
    const T = {
      pt: ['Pára!', 'Isto é uma ferramenta para programadores. Se alguém te disse para copiar e colar algo aqui para "desbloquear" uma função do Vida na Banda, ganhar kumbu ou Ouro, ou entrar na conta de outra pessoa, é uma burla — vai dar-lhe acesso à TUA conta.'],
      en: ['Stop!', 'This is a browser feature for developers. If someone told you to copy and paste something here to "unlock" a Vida na Banda feature, get free kumbu or Ouro, or get into someone else\'s account, it\'s a scam — it will give them access to YOUR account.'],
      fr: ['Stop !', "Ceci est un outil pour les développeurs. Si quelqu'un t'a dit de copier-coller quelque chose ici pour « débloquer » une fonction de Vida na Banda, avoir du kumbu ou de l'Ouro gratuit, ou entrer dans le compte de quelqu'un d'autre, c'est une arnaque — cela lui donnera accès à TON compte."],
    }[l] || null;
    const [titulo, texto] = T || [];
    console.log('%c' + (titulo || 'Pára!'), 'color:#cc092f;font:900 52px system-ui,sans-serif;-webkit-text-stroke:1px #000;text-shadow:2px 2px 0 #ffcb00');
    console.log('%c' + (texto || ''), 'font:600 16px system-ui,sans-serif;line-height:1.5');
  } catch (e) { }
})();

// Aviso que não depende da base de dados (dono, 5 nov 21:24: «the game is upgrading rn, so let everyone know»):
// /aviso.json no site; quando "ativo", mostra uma faixa no topo — funciona mesmo com a base a reiniciar.
(function avisoSite() {
  const ver = () => fetch('/aviso.json?t=' + Date.now(), { cache: 'no-store' }).then(r => r.ok ? r.json() : null).then(a => {
    let f = document.getElementById('faixaAviso');
    if (!a || !a.ativo) { f && f.remove(); return; }
    let l = 'pt'; try { l = localStorage.getItem('vel_lingua') || (navigator.language || 'pt').slice(0, 2); } catch { }
    const txt = a[l] || a.pt;
    if (!f) {
      f = document.createElement('div'); f.id = 'faixaAviso'; f.setAttribute('role', 'status');
      f.style.cssText = 'position:fixed;left:8px;right:8px;top:calc(8px + env(safe-area-inset-top));z-index:2147483000;padding:10px 14px;border:2px solid #141012;border-radius:12px;background:#ffcb00;color:#141012;font:700 14px system-ui,sans-serif;text-align:center;box-shadow:3px 3px 0 #141012;cursor:pointer';
      f.onclick = () => f.remove();
      (document.body || document.documentElement).appendChild(f);
    }
    f.textContent = txt;
  }).catch(() => { });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ver); else ver();
  setInterval(ver, 60000);
})();

// 8 nov (auditoria): (1) Safari antigo (iOS < 16) não tem roundRect → 85 erros/dia; (2) quando o iPhone fica sem memória para
// desenhos, getContext('2d') devolve null e rebentava o chão, os retratos dos sítios e as miniaturas (~1.000 erros/dia).
// Agora: roundRect desenha-se à mão; e um getContext falhado devolve um «contexto vazio» que não faz nada em vez de rebentar o jogo.
(() => {
  const C2D = window.CanvasRenderingContext2D, PATHS = [C2D, window.Path2D, window.OffscreenCanvasRenderingContext2D].filter(Boolean);
  for (const K of PATHS) if (!K.prototype.roundRect) K.prototype.roundRect = function (x, y, w, h, r) {
    let rr = Array.isArray(r) ? r[0] : r; rr = Math.max(0, Math.min(+rr || 0, Math.abs(w) / 2, Math.abs(h) / 2));
    this.moveTo(x + rr, y); this.arcTo(x + w, y, x + w, y + h, rr); this.arcTo(x + w, y + h, x, y + h, rr);
    this.arcTo(x, y + h, x, y, rr); this.arcTo(x, y, x + w, y, rr); this.closePath(); return this;
  };
  const HC = window.HTMLCanvasElement; if (!HC) return;
  const orig = HC.prototype.getContext;
  let vazio = null;
  const contextoVazio = cv => {
    if (!vazio) {
      const nada = () => vazio;
      vazio = new Proxy(function () { }, {
        get: (t, k) => k === 'canvas' ? cv : k === 'measureText' ? () => ({ width: 0 }) : k === 'getImageData' || k === 'createImageData' ? () => ({ data: new Uint8ClampedArray(4), width: 1, height: 1 })
          : k === 'createLinearGradient' || k === 'createRadialGradient' || k === 'createPattern' ? () => ({ addColorStop() { } }) : k === Symbol.toPrimitive ? undefined : nada,
        set: () => true, apply: () => vazio,
      });
    }
    return vazio;
  };
  HC.prototype.getContext = function (tipo, ...r) {
    const g = orig.call(this, tipo, ...r);
    if (g || (tipo !== '2d')) return g;
    try { window.dispatchEvent(new CustomEvent('vb:semcanvas')); } catch { }
    return contextoVazio(this);
  };
})();

/* ============================================================
   Guia do novato (Onboarding, dono 8 nov 12:31 — desenho aprovado: «Onboarding guide — first session»)
   5 passos com prémios em Kz, guia sempre à vista, passo feito, fim do dia, «Volta amanhã» e,
   por último, o pacote de boas-vindas (do chat Money: window.abrirPacoteInicial / pacoteInicialDisponivel).
   O servidor confirma cada passo pelas ações do jogador (acoes_dia) e paga uma vez — ver
   supabase/migrations/20261108200100_guia_novato.sql. Uma janela de cada vez.
   ============================================================ */
const GUIA_PASSOS = [
  { ic: 'fome', cor: '#4cbf74', t: 'Mata a fome', s: 'Come numa cantina', dica: 'A barriga está quase vazia. Vai à cantina e pede comida.', feito: 'Barriga cheia!', feitoTxt: 'Come sempre antes que a barriga fique vazia: com fome tudo cansa mais.' },
  { ic: 'vagas', cor: '#a98bff', t: 'Arranja um emprego', s: 'Telemóvel → Vagas', dica: 'Abre o Telemóvel e toca em Vagas. Zungueiro/a dá para começar já, sem estudo nem entrevista.', feito: 'Já tens trabalho!', feitoTxt: 'Trabalha bem e pede promoção: cada nível paga +25%.' },
  { ic: 'relogio', cor: '#a98bff', t: 'Faz o teu primeiro turno', s: 'Vai ao trabalho e carrega em Trabalhar', dica: 'Vai ao teu trabalho (o sítio está em Telemóvel → Vagas) e carrega em Trabalhar. Um biscato também conta.', feito: 'Primeiro turno feito!', feitoTxt: 'Cada turno paga o teu salário e faz subir o desempenho.' },
  { ic: 'estrela', cor: '#ffcb00', t: 'Escolhe o teu sonho', s: 'Empresário, artista, político…', dica: 'Abre o Telemóvel → Objetivos e escolhe o que queres ser em Luanda.', feito: 'Já tens um sonho!', feitoTxt: 'Os teus objetivos dizem-te o que fazer a seguir para lá chegar.' },
  { ic: 'falar', cor: '#35c2b4', t: 'Diz olá ao bairro', s: 'Manda uma mensagem no chat', dica: 'Toca em Falar e escreve uma mensagem ao bairro (ou toca noutro jogador).', feito: 'O bairro já te conhece!', feitoTxt: 'Toca nos outros jogadores para fazer amigos, namorar e até casar.' },
];
const GUIA_SVG = {
  fome: '<path d="M3 11h18a9 9 0 0 1-18 0Z"/><path d="M8 4c0 2 2 2 2 4M13 4c0 2 2 2 2 4"/>',
  vagas: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 13h18"/>',
  relogio: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2M9 2h6"/>',
  estrela: '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9Z"/>',
  falar: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12Z"/>',
  presente: '<rect x="3" y="8" width="18" height="13" rx="2"/><path d="M12 8v13M3 12h18M12 8c-2-4-6-4-6-1s6 1 6 1Zm0 0c2-4 6-4 6-1s-6 1-6 1Z"/>',
  certo: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  cima: '<path d="m6 15 6-6 6 6"/>', baixo: '<path d="m6 9 6 6 6-6"/>',
  candeeiro: '<path d="M8 3h8l3 7H5Z"/><path d="M12 10v8M8 21h8"/>',
  bau: '<path d="M5 10h14v10H5Z"/><path d="M4 7h16v3H4ZM12 7v13"/>', sofa: '<path d="M3 18h18M5 18v-6a7 7 0 0 1 14 0v6M12 5V3"/>',
  taca: '<path d="M6 3h12l-1 7a5 5 0 0 1-10 0Z"/><path d="M12 15v4M8 21h8"/>',
  sino: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0"/>',
};
const guiaIc = (n, cor = 'currentColor', t = 20, w = 2) => `<svg class="gu-svg" width="${t}" height="${t}" viewBox="0 0 24 24" fill="none" stroke="${cor}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${GUIA_SVG[n] || ''}</svg>`;

let guiaFimMostrado = false, guiaEst = null, guiaAtivo = false, guiaMin = false, guiaTimer = 0, guiaRealce = 0, guiaOcupado = false, guiaPremios = [500, 1000, 1000, 500, 500], guiaFila = [];

(function guiaEstilo() {
  if (document.getElementById('guiaCss')) return;
  const s = document.createElement('style'); s.id = 'guiaCss';
  s.textContent = `
#guiaCard{position:fixed;left:50%;transform:translateX(-50%);width:min(540px,calc(100% - 20px));z-index:25;background:var(--bg2);border:2px solid var(--gold);border-radius:16px;padding:12px;display:flex;flex-direction:column;gap:10px;color:var(--ink);box-shadow:0 8px 24px rgba(0,0,0,.35)}
#guiaCard.min{width:auto;left:auto;right:10px;transform:none;padding:6px 6px 6px 12px;flex-direction:row;align-items:center;gap:8px;border-radius:999px}
#guiaCard .gu-top{display:flex;align-items:center;gap:10px}
#guiaCard .gu-ic{width:40px;height:40px;border-radius:12px;background:var(--card2);display:flex;align-items:center;justify-content:center;flex:none}
#guiaCard .gu-tx{flex:1;min-width:0;display:flex;flex-direction:column;gap:1px}
#guiaCard .gu-k{font-size:11px;font-weight:800;letter-spacing:.06em;color:var(--gold)}
#guiaCard .gu-t{font-family:var(--f-disp),var(--f-corpo),sans-serif;font-size:18px;font-weight:800;line-height:1.1}
#guiaCard .gu-d{font-size:13px;color:var(--muted);line-height:1.35}
#guiaCard .gu-x{width:44px;height:44px;border:0;border-radius:12px;background:transparent;color:var(--muted);display:flex;align-items:center;justify-content:center;flex:none;cursor:pointer}
#guiaCard .gu-bar{display:flex;align-items:center;gap:10px}
#guiaCard .gu-seg{flex:1;display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:4px}
#guiaCard .gu-seg i{height:6px;border-radius:3px;background:var(--line)}
#guiaCard .gu-seg i.on{background:var(--gold)}
.gu-chip{font-size:12px;font-weight:800;color:var(--on-gold);background:var(--gold);border-radius:999px;padding:4px 8px;white-space:nowrap}
#guiaCard .gu-ir{height:40px;border-radius:12px;border:0;background:var(--gold);color:var(--on-gold);font:800 14px var(--f-corpo),sans-serif;cursor:pointer;padding:0 14px}
.gu-alvo{outline:3px solid var(--gold)!important;outline-offset:3px;border-radius:14px;animation:guPulse 1.4s ease-out infinite}
@keyframes guPulse{0%{box-shadow:0 0 0 0 rgba(255,203,0,.55)}100%{box-shadow:0 0 0 18px rgba(255,203,0,0)}}
.gu-lista{list-style:none;margin:10px 0;padding:0;display:flex;flex-direction:column;gap:8px}
.gu-lista li{display:flex;align-items:center;gap:12px;background:var(--card);border:var(--borda) solid var(--line);border-radius:14px;padding:10px 12px}
.gu-lista .gu-o{width:36px;height:36px;border-radius:50%;background:var(--card2);display:flex;align-items:center;justify-content:center;flex:none}
.gu-lista .gu-n{flex:1;min-width:0;display:flex;flex-direction:column}.gu-lista .gu-n small{color:var(--muted);font-size:13px}
.gu-kz{font-weight:800;font-size:13px;color:var(--gold);white-space:nowrap}
.gu-big{font-family:var(--f-disp),var(--f-corpo),sans-serif;font-weight:800;font-size:28px;color:var(--gold);text-align:center;margin:6px 0}
.gu-ok{width:64px;height:64px;border-radius:50%;background:var(--green);display:flex;align-items:center;justify-content:center;margin:4px auto 8px}
.gu-centro{text-align:center}
.gu-dias{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:6px;margin:12px 0}
.gu-dias>div{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:10px 4px;display:flex;flex-direction:column;align-items:center;gap:6px;font-size:11px;color:var(--muted);text-align:center}
.gu-dias>div.feito{border-color:var(--green);color:var(--green)}.gu-dias>div.hoje{border:2px solid var(--gold);color:var(--gold);font-weight:800}
.gu-fila{display:flex;flex-direction:column;gap:10px;background:var(--card);border:1px solid var(--line);border-radius:14px;padding:12px;margin:8px 0;font-size:14px}
.gu-fila>div{display:flex;align-items:center;gap:10px}
.gu-pack{border-radius:18px;overflow:hidden;background:var(--card);border:1.5px solid var(--gold);margin:12px 0}
.gu-pack-top{height:120px;position:relative;background:radial-gradient(120% 90% at 78% 20%,#5a3d06 0%,#2a1f10 45%,#1e1a1d 80%)}
.gu-moeda{position:absolute;border-radius:50%;background:#ffcb00;box-shadow:inset 0 -5px 0 #c98500}
.gu-pack-b{padding:14px 16px 16px;display:flex;flex-direction:column;gap:12px}
.gu-pack-g{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}
.gu-pack-g>div{background:var(--card2);border-radius:10px;padding:8px;display:flex;flex-direction:column;gap:2px}.gu-pack-g span{font-size:11px;color:var(--muted);line-height:1.25}
@media (prefers-reduced-motion: reduce){.gu-alvo{animation:none}}
/* 8 nov (dono «Yes, with the pin»): guia no estilo novo — cartões com imagem, botão grande, marcador no mundo */
.gu2-sheet .gu2-heroi{position:relative;margin:-4px -4px 12px;border-radius:18px;overflow:hidden;height:150px}
.gu2-heroi img{width:100%;height:100%;object-fit:cover;display:block}.gu2-heroi::after{content:'';position:absolute;inset:0;background:linear-gradient(180deg,transparent 30%,var(--bg2))}
.gu2-heroi>div{position:absolute;left:14px;right:14px;bottom:8px;z-index:1;display:flex;flex-direction:column;gap:2px}.gu2-heroi b{font:800 24px var(--f-disp),var(--f-corpo),sans-serif}.gu2-heroi span{font-size:13px;color:var(--muted)}
.gu2-l{display:flex;justify-content:space-between;align-items:baseline;margin:0 0 10px;color:var(--muted)}.gu2-l b{color:var(--gold)}
.gu2-grelha{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
.gu2-passo{position:relative;background:var(--card);border:1px solid var(--line);border-radius:16px;padding:12px;display:flex;flex-direction:column;gap:5px;min-width:0}
.gu2-passo.on{border:2px solid var(--gold)}.gu2-passo b{font-size:14px}.gu2-passo small{font-size:12px;color:var(--muted)}
.gu2-n{position:absolute;top:10px;right:10px;width:24px;height:24px;border-radius:50%;background:var(--card2);color:var(--muted);font:800 12px var(--f-corpo),sans-serif;font-style:normal;display:grid;place-items:center}.gu2-passo.on .gu2-n{background:var(--gold);color:#141216}
.gu2-ic{width:40px;height:40px;flex:none;border-radius:12px;display:grid;place-items:center;background:color-mix(in srgb,var(--c,var(--gold)) 16%,transparent)}
.gu2-kz{color:var(--gold);font-size:13px;white-space:nowrap}
.gu2-linha{display:flex;gap:12px;align-items:center;background:var(--card);border:1px solid var(--line);border-radius:16px;padding:10px 12px;margin-top:10px}.gu2-linha.on{border:2px solid var(--gold)}
.gu2-t{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}.gu2-t b{font-size:14px}.gu2-t small{font-size:12px;color:var(--muted)}
.gu2-ouro{display:flex;gap:12px;align-items:center;background:color-mix(in srgb,var(--gold) 12%,var(--card));border:1px solid var(--gold);border-radius:16px;padding:10px 12px;margin-top:10px;font-size:13px}
.gu2-ouro.col{flex-direction:column;justify-content:center;text-align:center;gap:6px;margin:0;padding:16px 10px}.gu2-ouro.col b{font-size:22px;color:var(--gold)}.gu2-ouro small{color:var(--muted)}
.gu2-dois{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin:12px 0}
.gu2-cx{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:12px;display:flex;flex-direction:column;gap:5px}.gu2-cx b{font-size:13px}.gu2-cx small{font-size:12px;color:var(--muted)}
.gu2-cinco{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:6px}
.gu2-cinco span{background:color-mix(in srgb,var(--green) 14%,var(--card));border-radius:12px;height:56px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;color:var(--green);font-size:10px;font-weight:700;text-align:center}
.gu2-grande{height:52px;font-size:16px;margin-top:14px}
.gu2-link{display:block;margin:10px auto 0;background:none;border:0;color:var(--muted);font:600 13px var(--f-corpo),sans-serif;cursor:pointer;padding:8px}
.gu2-k{display:block;font-size:12px;font-weight:800;letter-spacing:.08em;color:var(--gold);margin-top:6px}.gu2-k.verde{color:var(--green)}
.gu2-premio{width:84px;height:84px;border-radius:24px;background:var(--gold);display:grid;place-items:center;margin:10px auto 0}
#guiaCard.gu2{border-radius:18px;padding:12px;gap:10px;box-shadow:0 10px 30px rgba(0,0,0,.5)}
#guiaCard.gu2 .gu2-icg{width:48px;height:48px;border-radius:14px;background:color-mix(in srgb,var(--c,var(--gold)) 16%,transparent)}
#guiaCard.gu2 .gu-seg{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:4px}#guiaCard.gu2 .gu-seg i{height:6px;border-radius:3px;background:var(--line)}#guiaCard.gu2 .gu-seg i.on{background:var(--gold)}
#guiaCard .gu2-ir{height:48px;border-radius:12px;border:0;background:var(--gold);color:var(--on-gold,#141216);font:800 15px var(--f-corpo),sans-serif;cursor:pointer;width:100%}
`;
  document.head.appendChild(s);
})();

/* ---------- estado no servidor ---------- */
async function guiaLer() {
  const pg = typeof pre === 'function' ? pre('guia') : null;   // 9 nov: vem no arranque_tudo
  const { data, error } = pg ? { data: pg.v, error: null } : await sb.rpc('guia_estado');
  if (error || !data) return null;
  guiaEst = data; if (Array.isArray(data.premios)) guiaPremios = data.premios;
  return data;
}
const guiaRecebido = k => !!guiaEst?.recebidos?.[String(k + 1)];
const guiaPassoAtual = () => { for (let k = 0; k < 5; k++) if (!guiaRecebido(k)) return k; return 5; };
const guiaJanelaAberta = () => !!document.querySelector('.veil, .pergunta, .tel-modal') || (typeof emJogoAgora === 'function' && emJogoAgora());

/* ---------- arranque: chamado pelo jogo ao entrar (conta nova) e para retomar ---------- */
async function guiaIniciar() {
  const e = await guiaLer();
  if (!e) return typeof tutorial === 'function' && tutorial();   // servidor sem o guia → o texto antigo
  if (!e.novo || e.saltou) return;
  if (e.fim) return guiaDepoisDoFim();
  if (guiaPassoAtual() === 0 && !e.feitos?.some(Boolean)) return guiaBoasVindas();
  guiaComecar();
}
async function guiaRetomar() {
  const e = await guiaLer();
  if (!e || !e.novo) return;
  if (e.dia_por_receber) return guiaPremioDia();
  if (e.saltou) return;
  if (!e.fim) guiaComecar();
}
window.guiaIniciar = guiaIniciar; window.guiaRetomar = guiaRetomar;

/* ---------- 1 · boas-vindas ---------- */
function guiaBoasVindas() {
  const b = typeof bairro === 'function' ? bairro(J.bairro) : null, total = guiaPremios.reduce((a, x) => a + x, 0);
  const cartao = (p, k) => `<div class="gu2-passo${k === 0 ? ' on' : ''}"><i class="gu2-n">${k + 1}</i><span class="gu2-ic" style="--c:${p.cor}">${guiaIc(p.ic, p.cor, 22)}</span>
      <b>${esc(tr(p.t))}</b><small>${esc(tr(p.s))}</small><b class="gu2-kz">+${fmtKz(guiaPremios[k])}</b></div>`;
  const p5 = GUIA_PASSOS[4];
  const el = sheet(`<div class="gu2-heroi"><img src="img/bairros/${esc(J.bairro)}.webp" alt="" onerror="this.src='img/bairros/mutamba.webp'"><div><b>${esc(tr('Bem-vindo a Luanda!'))}</b><span>${esc(tr('Estás em {0}, ao pé da paragem.').replace('{0}', b?.nome || 'Luanda'))}</span></div></div>
    <div class="gu2-l"><span>${esc(tr('O teu primeiro dia: 5 passos'))}</span><b>+${fmtKz(total)}</b></div>
    <div class="gu2-grelha">${GUIA_PASSOS.slice(0, 4).map(cartao).join('')}</div>
    <div class="gu2-linha"><span class="gu2-ic" style="--c:${p5.cor}">${guiaIc(p5.ic, p5.cor, 22)}</span><span class="gu2-t"><b>5 · ${esc(tr(p5.t))}</b><small>${esc(tr(p5.s))}</small></span><b class="gu2-kz">+${fmtKz(guiaPremios[4])}</b></div>
    <div class="gu2-ouro">${guiaIc('presente', 'var(--gold)', 22)}<span>${esc(tr('No fim:'))} <b>${esc(tr('+{0} e um candeeiro para a casa').replace('{0}', fmtKz(guiaEst?.premio_fim || 2000)))}</b></span></div>
    <button class="btn full gu2-grande" id="guComecar">${esc(tr('Bora começar'))}</button>
    <button class="gu2-link" id="guSaltar">${esc(tr('Já sei jogar — saltar o guia'))}</button>`, () => { if (!guiaAtivo && !guiaEst?.saltou) guiaComecar(); });
  el.classList.add('gu2-sheet');
  el.querySelector('#guComecar').onclick = () => { fecharSheets(); };
  el.querySelector('#guSaltar').onclick = async () => { guiaEst = { ...guiaEst, saltou: true }; fecharSheets(); guiaParar(); await sb.rpc('guia_saltar'); };
}

/* ---------- 2 · guia sempre à vista ---------- */
function guiaComecar() {
  guiaAtivo = true;
  guiaDesenhar();
  // 8 nov: sem relógio próprio (regra 1 do Dev) — o guia só confirma depois de uma ação (vb:acao) ou de uma mensagem no chat
  clearInterval(guiaRealce); guiaRealce = setInterval(guiaRealcar, 700);
  setTimeout(guiaVerificar, 1500);
}
function guiaParar() {
  guiaAtivo = false; clearInterval(guiaRealce);
  document.getElementById('guiaCard')?.remove();
  document.querySelectorAll('.gu-alvo').forEach(x => x.classList.remove('gu-alvo'));
}
function guiaTopo() {
  const t = document.querySelector('#hud .topo');
  return (t && !document.getElementById('hud')?.classList.contains('hide') ? t.getBoundingClientRect().bottom : 100) + 8;
}
function guiaDesenhar() {
  if (!guiaAtivo) return;
  const k = guiaPassoAtual(); if (k >= 5) { guiaParar(); return guiaFim(); }
  const p = GUIA_PASSOS[k];
  let c = document.getElementById('guiaCard');
  if (!c) { c = document.createElement('div'); c.id = 'guiaCard'; c.setAttribute('role', 'status'); document.body.appendChild(c); }
  c.style.top = guiaTopo() + 'px';
  c.classList.toggle('min', guiaMin); c.classList.add('gu2');
  const segs = GUIA_PASSOS.map((_, i) => `<i class="${guiaRecebido(i) || i === k ? 'on' : ''}"></i>`).join('');
  if (guiaMin) {
    c.innerHTML = `<span class="gu-k">${k + 1}/5</span><b style="font-size:14px">${esc(tr(p.t))}</b><button class="gu-x" id="guAbrir" aria-label="${esc(tr('Abrir o guia'))}">${guiaIc('baixo')}</button>`;
    c.querySelector('#guAbrir').onclick = () => { guiaMin = false; guiaDesenhar(); };
    return;
  }
  const ac = guiaAcaoPasso(k);
  c.innerHTML = `<div class="gu-top"><span class="gu-ic gu2-icg" style="--c:${p.cor}">${guiaIc(p.ic, p.cor, 26)}</span>
      <div class="gu-tx"><span class="gu-k">${esc(tr('PASSO {0} DE 5').replace('{0}', k + 1))} · +${fmtKz(guiaPremios[k])}</span><b class="gu-t">${esc(tr(p.t))}</b><span class="gu-d">${esc(tr(p.dica))}</span></div>
      <button class="gu-x" id="guMin" aria-label="${esc(tr('Minimizar o guia'))}">${guiaIc('cima')}</button></div>
    <div class="gu-seg" aria-hidden="true">${segs}</div>
    ${ac ? `<button class="gu2-ir" id="guIr">${esc(ac.txt)} ›</button>` : ''}`;
  c.querySelector('#guMin').onclick = () => { guiaMin = true; guiaDesenhar(); };
  c.querySelector('#guIr')?.addEventListener('click', () => { const a = guiaAcaoPasso(k); if (k === 0 || k === 2) { guiaMin = true; guiaDesenhar(); } a?.fazer(); });   // fecha o cartão: vês o marcador e o caminho
}
// o botão de cada passo: leva-te lá (ou abre a app certa)
function guiaAcaoPasso(k) {
  if (k === 0) { const o = guiaCantina(); return o ? { txt: tr('Levar-me a {0}').replace('{0}', tr(o.spec.nome)), fazer: () => typeof tocarObjeto === 'function' && tocarObjeto(o) } : null; }
  if (k === 1) return { txt: tr('Abrir as Vagas'), fazer: () => abrirTelemovel('vagas') };
  if (k === 2) { const o = guiaTrabalho(); return o ? { txt: tr('Levar-me ao trabalho'), fazer: () => typeof tocarObjeto === 'function' && tocarObjeto(o) } : { txt: tr('Ver onde é o meu trabalho'), fazer: () => abrirTelemovel('vagas') }; }
  if (k === 3) return { txt: tr('Abrir os Objetivos'), fazer: () => abrirTelemovel('objetivos') };
  if (k === 4) return { txt: tr('Abrir o chat'), fazer: () => document.getElementById('bFalar')?.click() };
  return null;
}
// o sítio do teu trabalho, se for neste bairro
function guiaTrabalho() {
  if (typeof cena === 'undefined' || cena?.tipo !== 'bairro' || !cena.objetos || !J?.emprego) return null;
  return cena.objetos.find(o => o.spec?.acao?.some?.(a => a.t === 'emprego' && a.id === J.emprego)) || null;
}
// 3D e 2.5D: um marcador amarelo a saltitar por cima do sítio do passo (chamado pelo jogo ao desenhar as etiquetas)
function guiaPino(ecraDe, t) {
  if (!guiaAtivo || typeof ctx === 'undefined') return;
  const k = guiaPassoAtual(), o = k === 0 ? guiaCantina() : k === 2 ? guiaTrabalho() : null; if (!o) return;
  const [sx, sy] = ecraDe(o.x + o.w / 2, o.y + o.d / 2, (o.h || 30) + 46 + Math.sin(t / 260) * 5);
  if (!isFinite(sx) || !isFinite(sy)) return;
  const txt = tr(k === 0 ? 'Come aqui' : 'Trabalha aqui');
  ctx.save();
  ctx.font = '800 13px Figtree, Inter, sans-serif'; const w = ctx.measureText(txt).width + 20;
  ctx.fillStyle = '#ffcb00'; ctx.strokeStyle = '#141216'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.roundRect ? ctx.roundRect(sx - w / 2, sy - 52, w, 26, 13) : ctx.rect(sx - w / 2, sy - 52, w, 26); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#141216'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(txt, sx, sy - 39);
  ctx.beginPath(); ctx.moveTo(sx, sy + 14); ctx.lineTo(sx - 13, sy - 4); ctx.arc(sx, sy - 10, 14, Math.PI * 0.82, Math.PI * 0.18); ctx.closePath();
  ctx.fillStyle = '#ffcb00'; ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.arc(sx, sy - 10, 5.5, 0, Math.PI * 2); ctx.fillStyle = '#141216'; ctx.fill();
  ctx.restore();
}
window.guiaPino = guiaPino;
// a cantina (ou outro sítio de comer) mais perto, no bairro onde estás
function guiaCantina() {
  if (typeof cena === 'undefined' || cena?.tipo !== 'bairro' || !cena.objetos || !eu) return null;
  const todos = cena.objetos.filter(o => o.spec?.acao?.some?.(a => a.t === 'comida'));
  const sitios = todos.filter(o => !o.spec.acao.some(a => a.t === 'paragem')), c = sitios.length ? sitios : todos;   // 8 nov: uma cantina a sério antes da paragem
  if (!c.length) return null;
  return c.sort((a, b) => Math.hypot(a.x - eu.x, a.y - eu.y) - Math.hypot(b.x - eu.x, b.y - eu.y))[0];
}
// realça o botão certo: no mundo o Telemóvel / Falar; dentro do telemóvel a app
function guiaRealcar() {
  if (!guiaAtivo) return;
  document.querySelectorAll('.gu-alvo').forEach(x => x.classList.remove('gu-alvo'));
  const k = guiaPassoAtual(), telOn = typeof telAberto !== 'undefined' && telAberto;
  const alvo = { 1: telOn ? '.icapp[data-app="vagas"]' : '#bTel', 2: telOn ? '.icapp[data-app="vagas"]' : '#bTel', 3: telOn ? '.icapp[data-app="objetivos"]' : '#bTel', 4: telOn ? null : '#bFalar' }[k];
  if (alvo && !guiaMin) document.querySelector(alvo)?.classList.add('gu-alvo');
  const c = document.getElementById('guiaCard'); if (c) { c.style.top = guiaTopo() + 'px'; c.style.display = telOn || document.querySelector('.veil') ? 'none' : ''; }
}

/* ---------- 3 · confirmar passos e pagar ---------- */
async function guiaVerificar() {
  if (!guiaAtivo || guiaOcupado) return;
  guiaOcupado = true;
  try {
    const e = await guiaLer(); if (!e) return;
    if (e.saltou) return guiaParar();
    for (let k = 0; k < 5; k++) {
      if (e.feitos?.[k] && !guiaRecebido(k)) {
        const { data, error } = await sb.rpc('guia_receber', { p_passo: k + 1 });
        if (error) continue;
        if (data?.jogador) setJogador(data.jogador);
        if (data?.guia) guiaEst = data.guia;
        guiaFila.push(k);
      }
    }
    guiaDesenhar();
    guiaMostrarFeitos();
  } finally { guiaOcupado = false; }
}
function guiaMostrarFeitos() {
  if (!guiaFila.length) return;
  if (guiaJanelaAberta()) return setTimeout(guiaMostrarFeitos, 2500);   // uma janela de cada vez
  const k = guiaFila.shift(), p = GUIA_PASSOS[k], prox = guiaPassoAtual();
  if (prox >= 5) { guiaFila = []; guiaParar(); return guiaFim(); }
  const n = GUIA_PASSOS[prox], ac = guiaAcaoPasso(prox);
  const el = sheet(`<div class="gu-centro"><div class="gu-ok">${guiaIc('certo', '#121014', 34, 3)}</div>
      <span class="gu2-k verde">${esc(tr('PASSO {0} DE 5 FEITO').replace('{0}', k + 1))}</span>
      <h3 style="margin:4px 0">${esc(tr(p.feito))}</h3><div class="gu-big">+${fmtKz(guiaPremios[k])}</div></div>
    <span class="gu2-k">${esc(tr('A seguir'))}</span>
    <div class="gu2-linha on"><span class="gu2-ic" style="--c:${n.cor}">${guiaIc(n.ic, n.cor, 22)}</span><span class="gu2-t"><b>${esc(tr(n.t))}</b><small>${esc(tr(n.s))}</small></span><b class="gu2-kz">+${fmtKz(guiaPremios[prox])}</b></div>
    <p class="m">${esc(tr(p.feitoTxt))}</p>
    ${ac ? `<button class="btn full gu2-grande" id="guSeg">${esc(ac.txt)}</button>` : ''}
    <button class="gu2-link" data-fechar>${esc(tr(ac ? 'Depois' : 'Continuar'))}</button>`, () => setTimeout(guiaMostrarFeitos, 400));
  el.classList.add('gu2-sheet');
  el.querySelector('#guSeg')?.addEventListener('click', () => { fecharSheets(); setTimeout(() => ac.fazer(), 250); });
}

/* ---------- 5 · primeiro dia feito ---------- */
function guiaFim(repetir) {
  if (guiaFimMostrado && !repetir) return; guiaFimMostrado = true;
  if (guiaJanelaAberta()) return setTimeout(() => guiaFim(true), 2500);
  const curto = ['Comer', 'Emprego', 'Turno', 'Sonho', 'Olá'], total = guiaPremios.reduce((a, x) => a + x, 0) + (guiaEst?.premio_fim || 2000);
  const el = sheet(`<div class="gu-centro"><span class="gu2-k">5 / 5</span>
      <h3 style="margin:4px 0;font-size:28px">${esc(tr('Primeiro dia feito!'))}</h3><p class="m">${esc(tr('Já és da banda, {0}. Luanda é tua.').replace('{0}', (J?.nome || '').split(' ')[0]))}</p></div>
    <div class="gu2-dois"><div class="gu2-ouro col"><b>+${fmtKz(guiaEst?.premio_fim || 2000)}</b><small>${esc(tr('Bónus do 1.º dia'))}</small></div>
      <div class="gu2-ouro col">${guiaIc('candeeiro', 'var(--gold)', 30)}<small>${esc(tr('Candeeiro para a casa'))}</small></div></div>
    <div class="gu2-cinco">${curto.map(t => `<span>${guiaIc('certo', 'var(--green)', 18, 3)}${esc(tr(t))}</span>`).join('')}</div>
    <p class="m" style="text-align:center">${esc(tr('Ganhaste {0} hoje no guia.').replace('{0}', fmtKz(total)))}</p>
    <button class="btn full gu2-grande" id="guReceber">${esc(tr('Receber prémio'))}</button>`);
  el.classList.add('gu2-sheet');
  el.querySelector('#guReceber').onclick = async (ev) => {
    ev.currentTarget.disabled = true;
    const { data, error } = await sb.rpc('guia_fim');
    if (error) { toast(typeof limparErro === 'function' ? limparErro(error.message) : error.message, 'mau'); ev.currentTarget.disabled = false; return; }
    if (data?.jogador) setJogador(data.jogador);
    if (data?.guia) guiaEst = data.guia;
    toast(data?.msg || tr('Primeiro dia feito!'), 'bom', 4000);
    fecharSheets(); setTimeout(guiaAmanha, 500);
  };
}
function guiaDepoisDoFim() {
  if (guiaEst?.oferta_vista) return;
  guiaOferta();
}

/* ---------- 6 · volta amanhã ---------- */
function guiaAmanha() {
  if (guiaJanelaAberta()) return setTimeout(guiaAmanha, 2500);
  const dias = [[1, 'certo', tr('Feito'), 'feito'], [2, 'presente', fmtKz(3000), 'hoje'], [3, 'bau', tr('Baú ×2'), ''], [5, 'sofa', tr('Sofá'), ''], [7, 'taca', fmtKz(10000), '']];
  const el = sheet(`<span class="gu2-k">${esc(tr('AMANHÃ ESPERA-TE'))}</span>
    <h3 style="margin:4px 0">${esc(tr('Volta amanhã e recebe {0}').replace('{0}', fmtKz(3000)))}</h3>
    <div class="gu-dias">${dias.map(([n, ic, txt, cl]) => `<div class="${cl}"><span>${esc(tr('Dia {0}').replace('{0}', n))}</span>${guiaIc(ic, cl === 'feito' ? 'var(--green)' : cl === 'hoje' ? 'var(--gold)' : 'var(--dim)', 22)}<b>${esc(txt)}</b></div>`).join('')}</div>
    <div class="gu2-dois"><div class="gu2-cx">${guiaIc('vagas', '#a98bff', 22)}<b>${esc(tr('Turno de amanhã'))}</b><small>${esc(tr('Paga mais se não faltares'))}</small></div>
      <div class="gu2-cx">${guiaIc('falar', '#35c2b4', 22)}<b>${esc(tr('O bairro responde'))}</b><small>${esc(tr('À tua mensagem de hoje'))}</small></div></div>
    <div class="gu2-linha">${guiaIc('certo', 'var(--green)', 20, 3)}<span class="gu2-t"><small>${esc(tr('Enquanto estás fora, os azares quase param e tens 3 dias de proteção de novato.'))}</small></span></div>
    <button class="btn full gu2-grande" data-fechar>${esc(tr('Combinado, até amanhã'))}</button>
    <button class="btn full ghost" id="guLembrar" style="margin-top:8px">${guiaIc('sino', 'currentColor', 18)} ${esc(tr('Lembrar-me amanhã por e-mail'))}</button>`, () => setTimeout(guiaOferta, 500));
  el.classList.add('gu2-sheet');
  el.querySelector('#guLembrar').onclick = async (ev) => {
    ev.currentTarget.disabled = true; await sb.rpc('guia_lembrar');
    toast(tr('Combinado: amanhã mandamos-te um e-mail.'), 'bom'); fecharSheets();
  };
}

/* ---------- 7 · por último: o pacote de boas-vindas (do chat Money) ---------- */
function guiaOferta() {
  if (guiaEst?.oferta_vista) return;
  if (typeof window.pacoteInicialDisponivel !== 'function' || typeof window.abrirPacoteInicial !== 'function') return;   // ainda não existe → sem ecrã 7
  if (!window.pacoteInicialDisponivel()) return;
  if (guiaJanelaAberta()) return setTimeout(guiaOferta, 2500);
  guiaEst = { ...guiaEst, oferta_vista: true }; sb.rpc('guia_oferta_vista');
  const el = sheet(`<div class="gu-centro"><span class="gu-k" style="color:var(--gold);font-size:12px;font-weight:800;letter-spacing:.08em">${esc(tr('UM PRESENTE PARA QUEM CHEGA'))}</span>
      <h3 style="margin:4px 0">${esc(tr('Começa com o pé direito'))}</h3><p class="m">${esc(tr('Só para a tua primeira compra: 2,5 vezes mais Ouro pelo mesmo preço.'))}</p></div>
    <div class="gu-pack"><div class="gu-pack-top">
        <span class="gu-moeda" style="right:28px;top:18px;width:84px;height:84px;display:flex;align-items:center;justify-content:center;font:800 20px var(--f-disp),sans-serif;color:#4a3000">500</span>
        <span class="gu-moeda" style="right:100px;top:60px;width:42px;height:42px"></span><span class="gu-moeda" style="right:12px;top:80px;width:30px;height:30px"></span>
        <div style="position:absolute;left:16px;top:16px;display:flex;flex-direction:column;gap:8px;align-items:flex-start">
          <span style="font-size:11px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:#121014;background:#ffcb00;padding:4px 9px;border-radius:999px">${esc(tr('Só uma vez'))}</span>
          <b style="font:800 22px var(--f-disp),sans-serif;line-height:1.1;max-width:170px;color:#f6efe6">${esc(tr('Pacote de boas-vindas'))}</b></div></div>
      <div class="gu-pack-b"><div style="display:flex;align-items:baseline;gap:8px"><b style="font:800 40px var(--f-disp),sans-serif;color:var(--gold);line-height:1">500</b><b>${esc(tr('Ouro'))}</b>
          <span style="margin-left:auto;font-size:13px;color:var(--muted)">${esc(tr('normalmente'))} <s>200</s></span></div>
        <div class="gu-pack-g"><div><b>2,5×</b><span>${esc(tr('mais Ouro pelo mesmo preço'))}</span></div><div><b>${fmtKz(50000)}</b><span>${esc(tr('em compras nas lojas'))}</span></div><div><b>16</b><span>${esc(tr('ajudantes no teu negócio'))}</span></div></div></div></div>
    <button class="btn full" id="guComprar">${esc(tr('Comprar · 1,99 €'))}</button>
    <button class="btn full ghost" id="guAgoraNao" style="margin-top:8px">${esc(tr('Agora não — começar a minha vida'))}</button>
    <p class="m" style="font-size:12px;text-align:center;margin-top:8px">${esc(tr('Pagas com cartão numa página segura da Stripe. Se fechares, o pacote espera por ti na loja de Ouro até à tua primeira compra.'))}</p>`);
  el.querySelector('#guAgoraNao').onclick = () => fecharSheets();
  el.querySelector('#guComprar').onclick = () => { fecharSheets(); try { window.abrirPacoteInicial({ origem: 'guia', aoFechar: () => {} }); } catch { } };
}

/* ---------- prémio de entrada (dias 2, 3, 5, 7) ---------- */
function guiaPremioDia() {
  if (guiaJanelaAberta()) return setTimeout(guiaPremioDia, 3000);
  const m = guiaEst?.dia_por_receber; if (!m) return;
  const premio = { 2: [fmtKz(3000), 'presente'], 3: [tr('Baú ×2'), 'bau'], 5: [tr('Um sofá'), 'sofa'], 7: [fmtKz(10000), 'taca'] }[m] || ['', 'presente'];
  const seguinte = { 2: [3, tr('baú a dobrar')], 3: [5, tr('um sofá')], 5: [7, fmtKz(10000)] }[m];
  const el = sheet(`<div class="gu-centro"><span class="gu2-k">${esc(tr('DIA {0} EM LUANDA').replace('{0}', m))}</span>
      <h3 style="margin:4px 0">${esc(tr('Voltaste! Aqui está o teu prémio'))}</h3>
      <div class="gu2-premio">${guiaIc(premio[1], '#121014', 44)}</div><div class="gu-big">${esc(premio[0])}</div></div>
    ${seguinte ? `<div class="gu2-linha">${guiaIc('bau', 'var(--muted)', 20)}<span class="gu2-t"><small>${esc(tr('Dia {0}: {1}').replace('{0}', seguinte[0]).replace('{1}', seguinte[1]))}</small></span></div>` : ''}
    <button class="btn full gu2-grande" id="guDia">${esc(tr('Receber'))}</button>`);
  el.classList.add('gu2-sheet');
  el.querySelector('#guDia').onclick = async (ev) => {
    ev.currentTarget.disabled = true;
    const { data, error } = await sb.rpc('guia_dia');
    fecharSheets();
    if (error) return;
    if (data?.jogador) setJogador(data.jogador);
    if (data?.guia) guiaEst = data.guia;
    toast(data?.msg || '', 'bom', 4000);
    if (!guiaEst?.saltou && !guiaEst?.fim) setTimeout(guiaComecar, 800);
  };
}

/* ---------- ouvir o jogo: cada ação e cada mensagem no chat ---------- */
document.addEventListener('vb:acao', () => { if (guiaAtivo) setTimeout(guiaVerificar, 800); });
document.addEventListener('submit', e => { if (guiaAtivo && e.target?.id === 'fChat') setTimeout(guiaVerificar, 1500); }, true);
addEventListener('resize', () => guiaAtivo && guiaDesenhar());

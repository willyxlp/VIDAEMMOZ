/* ============================================================
   Vida na Banda — 🏎️ Kart da Maianga: o kartódromo, o resultado e o ranking da semana (0k-E, 27 out).
   O jogo em si está em js/kart.js (three.js, só se descarrega quando vais correr).
   ============================================================ */
const KART_PRECO = 400;
function kartHTML() {
  const ok = typeof temWebGL === 'function' && temWebGL();
  return `<div class="sec"><h4>🏎️ ${tr('Kart da Maianga')}</h4><span>${tr('3 voltas · tu contra 3')}</span></div>
    <p class="m">${tr('Corrida de karts pelas ruas da Maianga. Apanha as caixas «?»: turbo de gasosa ou cascas de manga para quem vem atrás.')}</p>
    <p class="m">${tr('Prémios: 1.º 3.000 Kz · 2.º 1.500 Kz · 3.º 600 Kz (até 15.000 Kz por dia).')}</p>
    ${ok ? `<div class="list"><div class="row"><span class="e">🏁</span><div class="t"><b>${tr('Uma corrida')}</b><small>${tr('−5 energia')}</small></div><button class="btn sm" data-kart>${fmtKz(KART_PRECO)}</button></div></div>`
      : `<p class="m">${tr('O kart precisa dos gráficos 3D (WebGL), que este aparelho não tem ligados.')}</p>`}
    ${ok ? `<div class="sec"><h4>🗺️ ${tr('Campeonato')}</h4><span data-kart-estrelas></span></div>
    <p class="m">${tr('15 etapas em 3 pistas: Maianga, Marginal e Ilha. Passa cada etapa para abrir a seguinte.')}</p>
    <button class="btn full" data-kart-mapa>🏁 ${tr('Abrir o mapa')}</button>` : ''}
    <div data-kart-ranking style="margin-top:10px"><div class="empty">${tr('A carregar o ranking…')}</div></div>`;
}
/* ---------- 0dp-3 bit 2 (dono 6 nov): mapa de níveis — uma estrada sinuosa com 15 etapas (inspirado nos mapas de níveis, mas de corridas) ---------- */
const KART_PISTAS = { maianga: ['🏙️', 'Maianga'], marginal: ['🌊', 'Marginal'], ilha: ['🏝️', 'Ilha'] };
const estrelasTxt = n => '★'.repeat(n) + '☆'.repeat(3 - n);
function objetivosEtapa(e) {
  return [`${tr('Passar')}: ${tr('chegar em {0}.º ou melhor').replace('{0}', e.alvo_pos)}`, `★ ${tr('Ganhar a corrida')}`, `★ ${tr('Abaixo de {0}').replace('{0}', tempoKart(e.alvo_tempo))}`]
    .concat(e.noite ? [`🌙 ${tr('Corrida de noite')}`] : []).concat(e.rivais > 0 ? [`🏎️ ${tr('Rivais mais rápidos')}`] : []);
}
async function abrirMapaKart() {
  const { data, error } = await sb.rpc('kart_mapa');
  if (error || !data) return toast(limparErro(error?.message || ''), 'mau');
  const E = data.etapas || [], N = E.length, W = 340, PASSO = 96, H = N * PASSO + 150;
  // de baixo para cima (a etapa 1 em baixo), em zigue-zague suave
  const pos = E.map((e, i) => [Math.round(W / 2 + 108 * Math.sin(i * 0.95)), H - 70 - i * PASSO]);
  let d = `M ${pos[0][0]} ${pos[0][1] + 60}`;
  pos.forEach(([x, y], i) => { const [px, py] = i ? pos[i - 1] : [x, y + 60]; const my = (py + y) / 2; d += ` C ${px} ${my}, ${x} ${my}, ${x} ${y}`; });
  d += ` C ${pos[N - 1][0]} ${pos[N - 1][1] - 40}, ${W / 2} ${pos[N - 1][1] - 50}, ${W / 2} 30`;
  const atual = E.find(e => e.estado === 'atual');
  const faixas = ['maianga', 'marginal', 'ilha'].map((p, k) => {
    const y1 = H - 20 - k * 5 * PASSO, y0 = y1 - 5 * PASSO, aberta = E[k * 5]?.estado !== 'fechada';
    return `<rect x="0" y="${y0}" width="${W}" height="${5 * PASSO}" fill="${['#2a2118', '#14232c', '#13261c'][k]}" opacity=".9"/>
      <text x="12" y="${y1 - 12}" font-size="13" font-weight="900" fill="${aberta ? '#FFCB00' : '#ffffff55'}">${KART_PISTAS[p][0]} ${esc(tr('Pista da') + ' ' + KART_PISTAS[p][1])}${aberta ? '' : ' 🔒'}</text>`;
  }).join('');
  const nos = E.map((e, i) => {
    const [x, y] = pos[i], marco = e.marco_kz > 0;
    const cor = e.estado === 'feita' ? '#2e9e5b' : e.estado === 'atual' ? '#FFCB00' : '#4a4540';
    const forma = marco ? `<rect x="${x - 26}" y="${y - 26}" width="52" height="52" rx="10" fill="url(#xadrez)" stroke="${cor}" stroke-width="4"/>`
      : `<circle cx="${x}" cy="${y}" r="25" fill="${cor}" stroke="#111" stroke-width="3"/><circle cx="${x}" cy="${y}" r="17" fill="none" stroke="#ffffff55" stroke-width="2" stroke-dasharray="4 4"/>`;
    const txt = e.estado === 'fechada' ? `<text x="${x}" y="${y + 6}" text-anchor="middle" font-size="18">🔒</text>`
      : `<text x="${x}" y="${y + 7}" text-anchor="middle" font-size="20" font-weight="900" fill="${marco ? '#111' : e.estado === 'atual' ? '#111' : '#fff'}" ${marco ? 'stroke="#fff" stroke-width="3" paint-order="stroke"' : ''}>${e.etapa}</text>`;
    const est = e.estado === 'feita' ? `<text x="${x}" y="${y + 42}" text-anchor="middle" font-size="14" fill="#FFCB00" letter-spacing="1">${estrelasTxt(e.estrelas)}</text>` : '';
    const anel = e.estado === 'atual' ? `<circle cx="${x}" cy="${y}" r="31" fill="none" stroke="#FFCB00" stroke-width="3" class="km-pulso"/><text x="${x + (x > W / 2 ? -46 : 46)}" y="${y + 8}" text-anchor="middle" font-size="24">🏎️</text>` : '';
    const premio = marco ? `<text x="${x + (x > W / 2 ? -40 : 40)}" y="${y - 22}" text-anchor="middle" font-size="11" font-weight="800" fill="${e.estado === 'feita' ? '#ffffff88' : '#FFCB00'}">🏆 +${fmtKz(e.marco_kz)}</text>` : '';
    return `<g data-etapa="${e.etapa}" style="cursor:${e.estado === 'fechada' ? 'default' : 'pointer'}">${anel}${forma}${txt}${est}${premio}</g>`;
  }).join('');
  const svg = `<svg viewBox="0 0 ${W} ${H}" width="100%" style="display:block" role="img" aria-label="${esc(tr('Mapa do campeonato'))}">
    <defs><pattern id="xadrez" width="13" height="13" patternUnits="userSpaceOnUse"><rect width="13" height="13" fill="#f2f2f2"/><rect width="6.5" height="6.5" fill="#111"/><rect x="6.5" y="6.5" width="6.5" height="6.5" fill="#111"/></pattern></defs>
    ${faixas}
    <path d="${d}" fill="none" stroke="#cc092f" stroke-width="40" stroke-linecap="round"/>
    <path d="${d}" fill="none" stroke="#f2f2f2" stroke-width="40" stroke-dasharray="12 12" stroke-linecap="butt"/>
    <path d="${d}" fill="none" stroke="#3b3d42" stroke-width="32" stroke-linecap="round"/>
    <path d="${d}" fill="none" stroke="#ffffffaa" stroke-width="2.5" stroke-dasharray="10 12"/>
    <text x="${W / 2}" y="22" text-anchor="middle" font-size="16" font-weight="900" fill="#FFCB00">🏆 ${esc(tr('Rei/Rainha do kart'))}</text>
    ${nos}</svg>`;
  const el = sheet(`<h3>🗺️ ${tr('Campeonato do Kart')}</h3>
    <p class="m"><span data-sem-traducao>★ ${data.estrelas}/${data.total}</span> · ${atual ? `${tr('Etapa atual')}: <b data-sem-traducao>${atual.etapa}</b>` : tr('Campeonato completo!')}</p>
    <div class="km-mapa" style="max-height:62vh;overflow-y:auto;overflow-x:hidden;border-radius:16px;background:#1a1612">${svg}</div>
    <div data-km-det style="margin-top:10px"></div>`);
  const caixa = el.querySelector('.km-mapa');
  const alvo = atual || E.filter(e => e.estado === 'feita').pop() || E[0];
  requestAnimationFrame(() => { caixa.scrollTop = Math.max(0, pos[alvo.etapa - 1][1] / H * caixa.scrollHeight - caixa.clientHeight / 2); });
  const detalhe = e => {
    const det = el.querySelector('[data-km-det]');
    det.innerHTML = `<div class="list"><div class="row"><span class="e">${KART_PISTAS[e.pista][0]}</span><div class="t"><b>${tr('Etapa')} <span data-sem-traducao>${e.etapa}</span> · ${esc(tr('Pista da') + ' ' + KART_PISTAS[e.pista][1])}</b>
      <small>${objetivosEtapa(e).map(esc).join('<br>')}${e.marco_kz ? `<br>🏆 ${tr('Marco')}: +${fmtKz(e.marco_kz)} (${tr('uma vez')})` : ''}${e.melhor ? `<br>${tr('O teu melhor')}: ${tempoKart(e.melhor)} · ${estrelasTxt(e.estrelas)}` : ''}</small></div></div></div>
      <button class="btn full" data-km-correr style="margin-top:8px">🏁 ${tr('Correr')} · ${fmtKz(KART_PRECO)}</button>`;
    det.querySelector('[data-km-correr]').onclick = () => jogarKart(null, e);
  };
  el.querySelectorAll('[data-etapa]').forEach(g => g.addEventListener('click', () => {
    const e = E[+g.dataset.etapa - 1]; if (e.estado === 'fechada') return toast(tr('Primeiro passa a etapa {0}.').replace('{0}', e.etapa - 1), 'info');
    detalhe(e);
  }));
  if (atual) detalhe(atual);
}
const tempoKart = t => t == null ? '—' : `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}.${String(Math.floor(t * 10) % 10)}`;
async function rankingKart(div) {
  if (!div) return;
  const { data, error } = await sb.rpc('kart_ranking');
  if (error || !data) { div.innerHTML = ''; return; }
  const linhas = (data.topo || []).map((r, i) => `<div class="row ${r.eu ? 'mine' : ''}"><span class="e">${['🥇', '🥈', '🥉'][i] || (i + 1) + '.'}</span><div class="t"><b>${esc(r.nome)}</b></div><b>${tempoKart(r.tempo)}</b></div>`).join('');
  div.innerHTML = `<div class="sec"><h4>🏆 ${tr('Melhores tempos da semana')}</h4><span>${tr('O teu recorde')}: ${tempoKart(data.recorde)}${data.melhor_volta ? ` · ${tr('Melhor volta')}: ${tempoKart(data.melhor_volta)}` : ''}</span></div>
    <div class="list">${linhas || `<div class="empty">${tr('Ninguém correu esta semana. Sê o primeiro!')}</div>`}</div>`;
}
function ligarKart(el) {
  el.querySelector('[data-kart]')?.addEventListener('click', () => jogarKart());
  el.querySelector('[data-kart-mapa]')?.addEventListener('click', () => abrirMapaKart());
  rankingKart(el.querySelector('[data-kart-ranking]'));
  const es = el.querySelector('[data-kart-estrelas]');
  if (es) sb.rpc('kart_mapa').then(({ data }) => { if (data && es.isConnected) es.textContent = `★ ${data.estrelas}/${data.total}`; }, () => { });
}
async function jogarKart(desafio = null, etapa = null) {   // 0dp-3 bit 2: etapa = uma etapa do mapa (o servidor confere se está aberta)   // 0ck: desafio = {id, nome} quando é um desafio de outro jogador
  if (!(typeof temWebGL === 'function' && temWebGL())) return toast(tr('O kart precisa dos gráficos 3D (WebGL), que este aparelho não tem ligados.'), 'mau');
  fecharSheets();
  const mod = import('./kart.js');
  const rk = sb.rpc('kart_ranking');   // 0dp-3: a tua melhor volta, para o «⚡ Volta mais rápida!» durante a corrida
  const r = await acao('kart_comecar', etapa ? { p_etapa: etapa.etapa } : {});
  if (!r?.corrida) return;
  let melhorVolta = null; try { melhorVolta = (await rk).data?.melhor_volta || null; } catch { }
  try { await mod; } catch (e) { console.warn('kart não carregou', e); return toast(tr('O kart não carregou neste aparelho.'), 'mau'); }
  let res;
  try {
    res = await window.KART.jogar({ semente: r.semente, ap: typeof apVisivel === 'function' ? apVisivel(minhaAparencia(), idadeDe(J)) : minhaAparencia(),
      noite: etapa?.noite ? 0.6 : typeof escuridao === 'function' ? escuridao() : 0, melhorVolta,
      pista: etapa?.pista || 'maianga', rivais: +(etapa?.rivais || 0), novoAd: typeof anuncioViagem === 'function' ? anuncioViagem : null, auto: !!window.__kartAuto });
  } catch (e) { console.warn('kart falhou', e); return toast(tr('O kart falhou neste aparelho.'), 'mau'); }
  try { if (typeof registarExposicao === 'function') registarExposicao(res.exposicao); } catch { }
  const f = await acao('kart_acabar', { p_corrida: r.corrida, p_posicao: res.posicao, p_tempo: res.tempo, p_acabou: !res.fugiu, p_voltas: res.voltasT?.length ? res.voltasT : null }, { silencio: true });
  const voltasHTML = (res.voltasT || []).length ? `<div class="row"><span class="e">⏱️</span><div class="t"><b>${tr('Voltas')}</b><small data-sem-traducao>${res.voltasT.map((t, i) => `${i + 1}: ${tempoKart(t)}`).join(' · ')}</small></div></div>` : '';
  const el = sheet(`<h3>🏎️ ${tr('Kart da Maianga')}</h3>
    <div style="text-align:center;margin:8px 0 14px"><div style="font:900 52px Inter,system-ui,sans-serif;color:#FFCB00">${res.fugiu ? '—' : res.posicao + '.º'}</div><div class="m">${res.fugiu ? tr('Desististe da corrida.') : tempoKart(res.tempo)}</div></div>
    ${f?.ok ? `<div class="list"><div class="row"><span class="e">💰</span><div class="t"><b>${tr('Prémio')}</b></div><b>+${fmtKz(f.kz || 0)}</b></div>
      <div class="row"><span class="e">🏆</span><div class="t"><b>${tr('O teu recorde')}: ${tempoKart(f.melhor)}</b>${f.melhor_volta ? `<small>${tr('Melhor volta')}: ${tempoKart(f.melhor_volta)}${f.volta_recorde ? ' · ⚡ ' + tr('Novo recorde de volta!') : ''}</small>` : ''}</div></div>${voltasHTML}</div>` : `<p class="m">${esc(tr(f?.msg || 'Esta corrida não contou.'))}</p>`}
    ${f?.etapa ? `<div class="list" style="margin-top:8px"><div class="row ${f.etapa.passou ? 'mine' : ''}"><span class="e">🗺️</span><div class="t"><b>${tr('Etapa')} <span data-sem-traducao>${f.etapa.etapa}</span> · <span data-sem-traducao style="color:#FFCB00;letter-spacing:1px">${estrelasTxt(f.etapa.estrelas)}</span></b>
      <small>${f.etapa.passou ? (f.etapa.proxima && !f.etapa.antes ? tr('Passaste! Etapa {0} desbloqueada.').replace('{0}', f.etapa.proxima) : tr('Passaste!')) : tr('Não passaste: precisavas de chegar em {0}.º ou melhor.').replace('{0}', f.etapa.alvo_pos)}${f.etapa.marco_kz ? `<br>🏆 ${tr('Marco')}: +${fmtKz(f.etapa.marco_kz)}${f.etapa.etapa < 15 ? ' · ' + tr('Nova pista desbloqueada!') : ''}` : ''}</small></div></div></div>` : ''}
    <div style="display:flex;gap:8px;margin-top:14px;flex-wrap:wrap">${etapa ? `<button class="btn" data-km-de-novo style="flex:1">${f?.etapa?.passou && f.etapa.proxima ? tr('Próxima etapa') : tr('Tentar outra vez')} · ${fmtKz(KART_PRECO)}</button><button class="btn ghost" data-kart-mapa>🗺️ ${tr('Mapa')}</button>` : `<button class="btn" data-kart style="flex:1">${tr('Correr outra vez')} · ${fmtKz(KART_PRECO)}</button>`}<button class="btn ghost" data-fechar>${tr('Fechar')}</button></div>
    <div data-kart-ranking style="margin-top:12px"></div>`);
  ligarKart(el);
  el.querySelector('[data-km-de-novo]')?.addEventListener('click', async () => {
    const { data } = await sb.rpc('kart_mapa'); const E = data?.etapas || [];
    const prox = f?.etapa?.passou && f.etapa.proxima ? E[f.etapa.proxima - 1] : E[etapa.etapa - 1];
    jogarKart(null, prox || etapa);
  });
  if (desafio && f?.ok && typeof fecharDesafio === 'function') fecharDesafio(desafio, r.corrida);
}

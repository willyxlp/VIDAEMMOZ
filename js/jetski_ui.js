/* ============================================================
   Vida na Banda — 🌊 Jet Ski na Baía: o quiosque na Ilha, o resultado e o ranking da semana.
   O jogo em si está em js/jetski.js (three.js, só se descarrega quando vais jogar).
   O servidor abre e fecha cada corrida (jetski_comecar / jetski_acabar) e confere os pontos.
   ============================================================ */
const JETSKI_PRECO = 500, JETSKI_ESCUDO = 300;

function jetskiHTML() {
  const ok = typeof temWebGL === 'function' && temWebGL();
  return `<div class="sec"><h4>🌊 ${tr('Jet Ski na Baía')}</h4><span>${tr('Ranking da semana')}</span></div>
    <p class="m">${tr('Acelera pela Baía de Luanda: desvia-te do lixo, das boias e dos barcos, salta por cima dos tubarões e apanha as moedas.')}</p>
    <p class="m">${tr('Cada moeda vale 10 Kz. Um novo recorde pessoal dá 1 Ouro (até 3 por dia).')}</p>
    ${ok ? `<div class="list">
      <div class="row">${arteListaHTML('acao', 'barco')}<div class="t"><b>${tr('Uma corrida')}</b><small>${tr('1 vida · −5 energia')}</small></div><button class="btn sm" data-jetski="0">${fmtKz(JETSKI_PRECO)}</button></div>
      <div class="row">${arteListaHTML('acao', 'barco')}<div class="t"><b>${tr('Com escudo')} 🛡️</b><small>${tr('Aguenta uma pancada')}</small></div><button class="btn sm ghost" data-jetski="1">${fmtKz(JETSKI_PRECO + JETSKI_ESCUDO)}</button></div>
    </div>` : `<p class="m">${tr('O Jet Ski precisa dos gráficos 3D (WebGL), que este aparelho não tem ligados.')}</p>`}
    <div data-jetski-ranking style="margin-top:10px"><div class="empty">${tr('A carregar o ranking…')}</div></div>`;
}
async function rankingJetski(div) {
  if (!div) return;
  const { data, error } = await sb.rpc('jetski_ranking');
  if (error || !data) { div.innerHTML = ''; return; }
  const linhas = (data.topo || []).map((r, i) => `<div class="row ${r.eu ? 'mine' : ''}"><span class="e">${['🥇', '🥈', '🥉'][i] || (i + 1) + '.'}</span><div class="t"><b>${esc(r.nome)}</b></div><b>${Number(r.pontos).toLocaleString()}</b></div>`).join('');
  div.innerHTML = `<div class="sec"><h4>🏆 ${tr('Ranking da semana')}</h4><span>${tr('O teu recorde')}: ${Number(data.recorde || 0).toLocaleString()}</span></div>
    <div class="list">${linhas || `<div class="empty">${tr('Ninguém jogou esta semana. Sê o primeiro!')}</div>`}</div>`;
}
function ligarJetski(el) {
  el.querySelectorAll('[data-jetski]').forEach(b => b.addEventListener('click', () => jogarJetski(b.dataset.jetski === '1')));
  rankingJetski(el.querySelector('[data-jetski-ranking]'));
}
async function jogarJetski(escudo, desafio = null) {   // 0ck: desafio = {id, nome} quando é um desafio de outro jogador
  if (!(typeof temWebGL === 'function' && temWebGL())) return toast('O Jet Ski precisa dos gráficos 3D (WebGL), que este aparelho não tem ligados.', 'mau');
  fecharSheets();
  const mod = import('./jetski.js');           // descarrega o jogo enquanto o servidor abre a corrida
  const r = await acao('jetski_comecar', { p_escudo: !!escudo });
  if (!r?.corrida) return;
  try { await mod; } catch (e) { console.warn('jet ski não carregou', e); return toast('O Jet Ski não carregou neste aparelho.', 'mau'); }
  let res;
  try {
    res = await window.JETSKI.jogar({ semente: r.semente, escudo: r.escudo, recorde: r.recorde, avisos: r.avisos !== false,   // 0p: sinais só nas 2 primeiras corridas
      ap: typeof apVisivel === 'function' ? apVisivel(minhaAparencia(), idadeDe(J)) : minhaAparencia(),
      noite: typeof escuridao === 'function' ? escuridao() : 0, ad: typeof anuncioViagem === 'function' ? anuncioViagem() : null, auto: !!window.__jetskiAuto,
      // 0cz (12): ao cair, pagar metade do que a corrida já rendeu para continuar (o servidor confere e cobra)
      continuar: window.__jetskiAuto && !window.__jetskiContinuar ? null : async ({ moedas, duracao }) => !!(await acao('jetski_continuar', { p_corrida: r.corrida, p_moedas: moedas, p_duracao: duracao }))?.ok });
  } catch (e) { console.warn('jet ski falhou', e); return toast('O Jet Ski falhou neste aparelho.', 'mau'); }
  if (res.duracao < 1) return toast('Corrida cancelada.', 'info');
  const f = await acao('jetski_acabar', { p_corrida: r.corrida, p_pontos: res.pontos, p_moedas: res.moedas, p_duracao: res.duracao }, { silencio: true });
  resultadoJetski(res, f, escudo);
  if (desafio && f && f.tipo !== 'mau' && typeof fecharDesafio === 'function') fecharDesafio(desafio, r.corrida);
}
function resultadoJetski(res, f, escudo) {
  const valida = f && f.tipo !== 'mau';
  const el = sheet(`<h3>🌊 ${tr('Jet Ski na Baía')}</h3>
    <div style="text-align:center;margin:8px 0 14px"><div style="font:900 44px Inter,system-ui,sans-serif;color:#FFCB00">${res.pontos.toLocaleString()}</div><div class="m">${tr('pontos')}</div></div>
    ${valida ? `<div class="list">
      <div class="row"><span class="e">🪙</span><div class="t"><b>${res.moedas} ${tr('moedas')}</b><small>${tr('10 Kz cada (máx. 20.000 Kz por dia)')}</small></div><b>+${fmtKz(f.kz || 0)}</b></div>
      ${f.recorde ? `<div class="row mine"><span class="e">🏆</span><div class="t"><b>${tr('Novo recorde!')}</b><small>${f.ouro ? tr('+1 Ouro') : tr('Já ganhaste o Ouro de hoje (máx. 3)')}</small></div></div>` : `<div class="row"><span class="e">🏆</span><div class="t"><b>${tr('O teu recorde')}: ${Number(f.melhor || 0).toLocaleString()}</b></div></div>`}
      ${!f.recorde && f.melhor > 0 && res.pontos >= f.melhor * 0.6 ? `<div class="row"><span class="e">🎯</span><div class="t"><b>${tr('Faltaram')} ${(f.melhor - res.pontos + 1).toLocaleString()} ${tr('pontos para o teu recorde!')}</b><small>${tr('Estás quase. As moedas já são tuas.')}</small></div></div>` : ''}
      <div class="row"><span class="e">📊</span><div class="t"><b>${tr('Lugar no ranking da semana')}: ${f.posicao || '—'}</b></div></div>
    </div>` : `<p class="m">${f?.msg ? esc(tr(f.msg)) : tr('Esta corrida não contou.')}</p>`}
    <div style="display:flex;gap:8px;margin-top:14px"><button class="btn" data-jetski="${escudo ? 1 : 0}" style="flex:1">${tr('Jogar outra vez')} · ${fmtKz(JETSKI_PRECO + (escudo ? JETSKI_ESCUDO : 0))}</button><button class="btn ghost" data-fechar>${tr('Fechar')}</button></div>
    <div data-jetski-ranking style="margin-top:12px"></div>`);
  el.querySelector('[data-jetski]').addEventListener('click', () => jogarJetski(escudo));
  rankingJetski(el.querySelector('[data-jetski-ranking]'));
}

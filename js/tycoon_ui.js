/* ============================================================
   Vida na Banda — 🎮 abrir o tycoon de um negócio (FILA 0ef). Só no site de teste por agora.
   O jogo (three.js) está em js/tycoon.js e só se descarrega quando entras.
   As notas do tycoon são só do tycoon (nunca viram Kz). O progresso fica neste aparelho (localStorage).
   ============================================================ */
const TYCOON_TIPOS = ['cantina', 'discoteca', 'salao', 'loja'];   // 9 nov 21:00 (dono): lançamento — cantina, discoteca, salão e loja
const TY_ABRIR = { cantina: ['🍲', 'A abrir a cantina…'], discoteca: ['🪩', 'A abrir a discoteca…'], salao: ['💇🏾‍♀️', 'A abrir o salão…'], loja: ['🛒', 'A abrir a loja…'] };
// tipos que ainda só existem no site de teste (o salão de beleza, 9 nov)
const TYCOON_TESTE = [];
const tycoonTem = tipo => TYCOON_TIPOS.includes(tipo) || (!!window.VEL_TESTE && TYCOON_TESTE.includes(tipo));
let tycoonAberto = null;
// 9 nov 21:20: coroas do ranking guardadas 5 min por jogador (eram ~17 pedidos/s à Supabase depois do lançamento)
const _coroasCache = new Map();
function tycoonCoroas(id) {
  const c = _coroasCache.get(id); if (c && Date.now() - c.t < 5 * 60000) return c.p;
  const p = sb.rpc('tycoon_coroas', { p_jogador: id }).then(r => { if (r.error) _coroasCache.delete(id); return r; });
  _coroasCache.set(id, { t: Date.now(), p }); return p;
}
function abrirTycoon(e) {
  if (tycoonAberto || !e || !tycoonTem(e.tipo)) return;
  if (typeof J === 'undefined' || !J) return;   // 7 nov (dono): o tycoon só para quem tem sessão iniciada
  if (typeof fecharTelemovel === 'function') try { fecharTelemovel(true); } catch { }
  const chave = 'vel_tycoon_' + e.id;
  let estado = null; try { estado = JSON.parse(localStorage.getItem(chave) || 'null'); } catch { }
  const v = document.createElement('div'); v.id = 'tycoon';
  v.innerHTML = `<div class="tyHud"><div class="tyCaixa" title="${esc(tr('Notas do negócio (só deste jogo, não são Kz)'))}"><span class="tyNota" aria-hidden="true"></span> <b id="tyNotas">0</b></div>
      <div class="tyNivel"><div class="tyNivL"><span>⭐ ${esc(tr('Nível'))} <b id="tyNiv">1</b></span><small id="tyFaltam"></small></div><i><em id="tyBarra"></em></i><small class="tyProx" id="tyProx"></small></div>
      <button class="tyBtn" id="tySom" type="button" aria-label="${esc(tr('Som'))}">🔊</button>
      <button class="tyFechar" type="button" aria-label="${esc(tr('Sair'))}">✕</button></div>
    <button class="tyMelhorar" id="tyMelhorar" type="button">⬆️ <span>${esc(tr('Melhorias'))}</span></button>
    <button class="tyLoja" id="tyLoja" type="button">🛍️ <span>${esc(tr('Loja'))}</span></button>
    <div class="tyBoosts" id="tyBoosts"></div>
    <div class="tyPainel hide" id="tyLojaP"></div>
    <div class="tyPainel hide" id="tyPainel"></div>
    <div class="tyOferta" id="tyOferta"></div>
    <button class="tyObj" id="tyObj" type="button">🎯 <span>${esc(tr('Objetivos'))}</span><em class="hide" id="tyObjN"></em></button>
    <div class="tyPainel hide" id="tyObjP"></div>
    <button class="tyRank" id="tyRank" type="button">🏆 <span id="tyRankT">${esc(tr('Ranking'))}</span></button>
    <div class="tyPainel hide" id="tyRankP"></div>
    <button class="tyFil hide" id="tyFil" type="button">🏢 <span>${esc(tr('Filiais'))}</span></button>
    <div class="tyPainel hide" id="tyFilP"></div>
    <div class="tyPonta hide" id="tyPonta">🔥 <b>${esc(tr('Hora de ponta!'))}</b> <span>${esc(tr('Clientes a triplicar'))}</span> <em id="tyPontaT"></em></div>
    <div class="tyPasso hide" id="tyPasso"><small id="tyPassoN"></small><span id="tyPassoT"></span></div>
    <div class="tyKz hide" id="tyKz"></div>
    <div class="tyDica fora" id="tyDica">${esc(tr('Arrasta o dedo para andar. Fica ao pé do balcão para sentar os clientes, leva-lhes a comida do fogão e apanha o dinheiro das mesas.'))}</div>
    <div class="tyBolso" id="tyBolso"></div><div class="tyAviso" id="tyAviso"></div><div class="tyLuz hide" id="tyLuz">⚡ ${esc(tr('Sem luz'))}</div>
    <div class="tyCarregar" id="tyCarregar">${(TY_ABRIR[e.tipo] || TY_ABRIR.cantina)[0]} ${esc(tr((TY_ABRIR[e.tipo] || TY_ABRIR.cantina)[1]))}</div>`;
  document.body.appendChild(v);
  // 9 nov 17:45 (dono: «touch anywhere outside of the popup/modal, it should close, this includes other buttons. this is for all games»):
  // com um painel ou janela aberta, tocar fora fecha-a — e esse toque não faz mais nada (nem anda, nem carrega noutro botão).
  // Janelas com escolha: tocar fora = a opção sem custo («Agora não», «Recolher», «Receber», «Está bem»).
  let engolir = 0;
  v.addEventListener('pointerdown', ev => {
    const alvo = ev.target, dentro = el => el && el.contains(alvo);
    const paineis = [...v.querySelectorAll('.tyPainel:not(.hide)')], janelas = [...v.querySelectorAll('.tyPedirOuro')], oferta = v.querySelector('#tyOferta.on');
    let fechou = false;
    if (janelas.length) {
      const j = janelas[janelas.length - 1];
      if (dentro(j.querySelector('.tyPOCaixa') || j)) return;
      const bt = ['[data-nao]', '[data-x1]', '[data-ok]', '[data-sim]'].map(q => j.querySelector(q)).find(Boolean);
      if (bt) bt.click(); else j.remove(); fechou = true;
    } else if (paineis.length) {
      if (paineis.some(dentro)) return;
      paineis.forEach(x => x.classList.add('hide')); fechou = true;
    }
    if (oferta && !dentro(oferta)) oferta.classList.remove('on', 'contratar');
    if (fechou) { ev.stopPropagation(); ev.preventDefault(); engolir = Date.now(); }
  }, true);
  v.addEventListener('click', ev => { if (engolir && Date.now() - engolir < 700) { engolir = 0; ev.stopPropagation(); ev.preventDefault(); } }, true);
  const $t = s => v.querySelector(s);
  let tAviso = null;
  const aviso = txt => { const a = $t('#tyAviso'); a.textContent = txt; a.classList.add('on'); clearTimeout(tAviso); tAviso = setTimeout(() => a.classList.remove('on'), 2600); };
  tycoonAberto = { v, jogo: null };
  // 7 nov (dono): o tycoon de uma empresa TUA dá Kz a sério à caixa (no máx. 1,5 × a venda normal do dia; o servidor controla)
  const real = typeof e.id === 'number' || /^\d+$/.test(String(e.id));
  let porEnviar = 0, aEnviar = false;
  const enviar = async () => {
    if (!real || aEnviar || porEnviar <= 0) return;
    aEnviar = true; const n = Math.min(porEnviar, 300); porEnviar -= n;
    try {
      const { data, error } = await sb.rpc('tycoon_receber', { p_empresa: +e.id, p_notas: n });
      if (error) porEnviar += n;
      else if (data) { const k = $t('#tyKz'); k.classList.remove('hide'); k.textContent = `🏪 ${tr('Para a empresa hoje')}: ${fmtKz(data.hoje)} / ${fmtKz(data.max)}`; }
    } catch { porEnviar += n; }
    aEnviar = false;
  };
  const tEnviar = setInterval(enviar, 15000);
  tycoonAberto.enviar = () => { clearInterval(tEnviar); enviar(); };
  let ultimo = null, assPainel = '', mudo = false; try { mudo = localStorage.getItem('vel_tycoon_mudo') === '1'; } catch { }
  $t('#tySom').textContent = mudo ? '🔇' : '🔊';
  $t('#tySom').onclick = () => { mudo = !mudo; $t('#tySom').textContent = mudo ? '🔇' : '🔊'; try { localStorage.setItem('vel_tycoon_mudo', mudo ? '1' : '0'); } catch { } };
  // sons feitos na hora (sem ficheiros): moeda, pop, comprar, subir de nível
  let ac = null;
  const som = k => {
    if (mudo) return;
    try {
      ac = ac || new (window.AudioContext || window.webkitAudioContext)(); if (ac.state === 'suspended') ac.resume();
      const nota = (f, t0, d, tipo = 'sine', vol = 0.08) => { const o = ac.createOscillator(), g = ac.createGain(); o.type = tipo; o.frequency.value = f; g.gain.setValueAtTime(vol, ac.currentTime + t0); g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + t0 + d); o.connect(g).connect(ac.destination); o.start(ac.currentTime + t0); o.stop(ac.currentTime + t0 + d + 0.02); };
      if (k === 'moeda') { nota(1320, 0, 0.08, 'square', 0.03); nota(1760, 0.05, 0.1, 'square', 0.03); }
      else if (k === 'pop' || k === 'pagar') nota(k === 'pop' ? 660 : 520, 0, 0.07, 'triangle', 0.06);
      else if (k === 'servir') { nota(784, 0, 0.09, 'triangle'); nota(988, 0.07, 0.12, 'triangle'); }
      else if (k === 'comprar') { [523, 659, 784, 1046].forEach((f, i) => nota(f, i * 0.07, 0.16, 'triangle', 0.07)); }
      else if (k === 'nivel') { [523, 659, 784, 1046, 1318].forEach((f, i) => nota(f, i * 0.09, 0.25, 'square', 0.04)); }
    } catch { }
  };
  // 7 nov (dono): coisas pagas com Ouro — sem Ouro suficiente, vai logo para a loja do Ouro
  const chaveOuro = String(e.id);
  // 7 nov 16:36 (dono): sem Ouro, NÃO sai do jogo — janela de comprar Ouro aqui dentro; o pagamento abre noutra janela,
  // o jogo fica à espera e, quando o Ouro chega, «Comprar agora» termina a compra que a pessoa queria.
  const pedirOuro = (preco, depois) => {
    $t('#tyPedirOuro')?.remove();
    const c = document.createElement('div'); c.id = 'tyPedirOuro'; c.className = 'tyPedirOuro';
    const pacs = (typeof D !== 'undefined' && D.pacotes || []).filter(x => typeof precoOuro === 'function' && precoOuro(x));
    const desenha = () => {
      const tens = J?.ouro || 0, chega = tens >= preco;
      c.innerHTML = `<div class="tyPOCaixa"><b class="tyPOTit">🪙 ${esc(tr(chega ? 'O teu Ouro chegou!' : 'Falta-te Ouro'))}</b>
        <p>${esc(tr('Precisas de {0} Ouro. Tens {1}.').replace('{0}', preco.toLocaleString('pt-PT')).replace('{1}', tens.toLocaleString('pt-PT')))}</p>
        ${chega ? `<button type="button" class="tyPOSim" data-agora>✅ ${esc(tr('Comprar agora'))} · 🪙 ${preco.toLocaleString('pt-PT')}</button>` : `<div class="tyPOPacs">${pacs.map(x => `<button type="button" class="tyPOPac ${x.destaque ? 'dest' : ''}" data-pac="${esc(x.id)}">${x.destaque ? `<em class="tyPOSelo">${esc(tr(x.destaque))}</em>` : ''}<span>🪙 ${(x.ouro + x.bonus).toLocaleString('pt-PT')}</span><b>${precoOuro(x)}</b></button>`).join('')}</div>
        <small>${esc(tr('O pagamento abre noutra janela. O jogo fica à tua espera — quando o Ouro chegar, a compra termina aqui.'))}</small>`}
        <button type="button" class="tyPONao" data-nao>${esc(tr('Agora não'))}</button></div>`;
      c.querySelectorAll('[data-pac]').forEach(b => b.onclick = async () => {
        b.disabled = true; const ok = await comprarPacoteNovaJanela(b.dataset.pac); b.disabled = false;
        if (ok && !vigia) { vigia = setInterval(verOuro, 5000); addEventListener('focus', verOuro); }
      });
      c.querySelector('[data-agora]')?.addEventListener('click', () => { fechar(); depois(); });
      c.querySelector('[data-nao]').onclick = fechar;
    };
    let vigia = 0;
    const fechar = () => { clearInterval(vigia); removeEventListener('focus', verOuro); c.remove(); };
    const verOuro = async () => {
      if (!c.isConnected || !tycoonAberto) { fechar(); return; }
      const antes = J?.ouro || 0; try { await atualizarOuro(); } catch { }
      if ((J?.ouro || 0) !== antes) desenha();
    };
    desenha(); v.appendChild(c);
  };
  const comprarOuro = async (item, preco) => {
    if ((J?.ouro || 0) < preco) { pedirOuro(preco, () => comprarOuro(item, preco)); return; }
    const { data, error } = await sb.rpc('tycoon_ouro', { p_chave: chaveOuro, p_item: item });
    if (error) { toast(tr(String(error.message || '').replace(/^.*?: /, '')), 'mau'); return; }
    if (J) J.ouro = data.ouro;
    tycoonAberto?.jogo?.aplicarCompras(data.compras); som('comprar');
    if (!$t('#tyLojaP').classList.contains('hide')) desenharLoja();
  };
  const desenharPainel = () => {
    const h = ultimo; if (!h) return;
    const estrelas = m => m.max ? ` · ${'★'.repeat(Math.min(m.nivel, m.max))}${'☆'.repeat(Math.max(0, m.max - m.nivel))}` : m.max === null && m.nivel ? ` · ${tr('Nível')} ${m.nivel}` : '';
    $t('#tyPainel').innerHTML = `<div class="tyPTit">⬆️ ${esc(tr('Melhorias'))}<button type="button" class="tyPFechar">✕</button></div>` + h.melhorias.map(m => `<div class="tyPLinha"><span class="e">${m.icon}</span>
      <div class="t"><b>${esc(tr(m.nome))}</b><small>${esc(tr(m.desc))}${estrelas(m)}</small></div>
      ${m.preco === null ? `<span class="tyMax">${esc(tr('Máximo'))}</span>` : `<button type="button" data-m="${m.id}" ${h.caixa >= m.preco ? '' : 'disabled'}><span class="tyNota" aria-hidden="true"></span> ${m.preco}</button>`}</div>`).join('')
      + `<div class="tyPSub">🪙 ${esc(tr('Com Ouro'))} <small>(${esc(tr('tens'))} ${(J?.ouro || 0).toLocaleString('pt-PT')})</small></div>` + (h.ouro || []).map(m => `<div class="tyPLinha"><span class="e">${m.icon}</span>
      <div class="t"><b>${esc(tr(m.nome))}</b><small>${esc(tr(m.desc))}${estrelas(m)}</small></div>
      ${m.preco === null ? `<span class="tyMax">${esc(tr('Máximo'))}</span>` : `<button type="button" class="ouro" data-o="${m.id}" data-p="${m.preco}">🪙 ${m.preco}</button>`}</div>`).join('');
    $t('.tyPFechar').onclick = () => $t('#tyPainel').classList.add('hide');
    $t('#tyPainel').querySelectorAll('[data-m]').forEach(b => b.onclick = () => { tycoonAberto?.jogo?.melhorar(b.dataset.m); desenharPainel(); });
    $t('#tyPainel').querySelectorAll('[data-o]').forEach(b => b.onclick = async () => { b.disabled = true; await comprarOuro(b.dataset.o, +b.dataset.p); if (tycoonAberto) desenharPainel(); });
  };
  // ---------- boosts (o nosso «ver um anúncio»: grátis de tempos a tempos, ou já com Ouro) ----------
  const mmss = n => `${Math.floor(n / 60)}:${String(n % 60).padStart(2, '0')}`;
  const usarBoost = async (b) => {
    const jogo = tycoonAberto?.jogo; if (!jogo || b.ativoS) return;
    if (!b.livreS) { jogo.ativarBoost(b.id); return; }
    if ((J?.ouro || 0) < b.ouro) { pedirOuro(b.ouro, () => usarBoost(b)); return; }
    const { data, error } = await sb.rpc('tycoon_ouro', { p_chave: chaveOuro, p_item: 'boost_' + b.id });
    if (error) { toast(tr(String(error.message || '').replace(/^.*?: /, '')), 'mau'); return; }
    if (J) J.ouro = data.ouro; tycoonAberto?.jogo?.ativarBoost(b.id, true);
  };
  let boostsAgora = [];
  const desenharBoosts = lista => {
    boostsAgora = lista;
    const box = $t('#tyBoosts');
    if (box.children.length !== lista.length) {   // cria os botões uma vez; depois só muda o texto (senão o botão foge debaixo do dedo)
      box.innerHTML = lista.map(b => `<button type="button" data-b="${b.id}" aria-label="${esc(tr(b.nome))}"><span class="i">${b.id === 'dinheiro' ? '<span class="tyNota" aria-hidden="true"></span>×2' : b.icon}</span><small></small></button>`).join('');
      box.querySelectorAll('[data-b]').forEach(el => el.onclick = () => usarBoost(boostsAgora.find(x => x.id === el.dataset.b)));
    }
    lista.forEach(b => { const el = box.querySelector(`[data-b="${b.id}"]`); if (!el) return;
      el.className = b.ativoS ? 'ativo' : !b.livreS ? 'gratis' : '';
      el.querySelector('small').textContent = b.ativoS ? mmss(b.ativoS) : !b.livreS ? tr('Grátis') : `🪙${b.ouro}`; });
  };
  // ---------- loja (Ouro): oferta de hoje, pacote inicial, Patrão, Passe, animais ----------
  const desenharLoja = () => {
    const jogo = tycoonAberto?.jogo; if (!jogo) return;
    const L = jogo.lojaInfo();
    $t('#tyLojaP').innerHTML = `<div class="tyPTit">🛍️ ${esc(tr('Loja'))} <small style="margin-left:8px;font-weight:600;color:#6b625c">🪙 ${(J?.ouro || 0).toLocaleString('pt-PT')}</small><button type="button" class="tyPFechar">✕</button></div>`
      + L.map(m => `<div class="tyPLinha"><span class="e">${m.icon}</span><div class="t"><b>${esc(tr(m.nome))}</b><small>${esc(tr(m.desc || ''))}</small></div>
        ${m.feito ? `<span class="tyMax">${esc(tr(m.feitoTxt || 'Já tens'))}</span>` : `<button type="button" class="ouro" data-l="${m.id}" data-p="${m.ouro}">🪙 ${m.ouro}</button>`}</div>`).join('')
      + `<p class="tyPNota">${esc(tr('O Ouro compra-se na loja do Ouro (📱 → Ouro).'))}</p>`;
    $t('#tyLojaP .tyPFechar').onclick = () => $t('#tyLojaP').classList.add('hide');
    $t('#tyLojaP').querySelectorAll('[data-l]').forEach(b => b.onclick = async () => { b.disabled = true; await comprarOuro(b.dataset.l, +b.dataset.p); if (tycoonAberto) desenharLoja(); });
  };
  $t('#tyLoja').onclick = () => { $t('#tyPainel').classList.add('hide'); $t('#tyLojaP').classList.toggle('hide'); desenharLoja(); };
  // oferta discreta no topo (não para o jogo)
  let tOf = null;
  const mostrarOferta = of => {
    const el = $t('#tyOferta');
    el.innerHTML = `<span>${of.inicial ? `🚀 ${esc(tr('Pacote inicial: empregado + ténis + 200 notas'))}` : `⏭️ ${esc(tr('Salta para o nível {0}').replace('{0}', of.para))}`}</span><button type="button" data-sim>🪙 ${of.preco}</button><button type="button" class="x" data-nao aria-label="${esc(tr('Agora não'))}">✕</button>`;
    el.classList.add('on'); clearTimeout(tOf); tOf = setTimeout(() => el.classList.remove('on'), 12000);
    el.querySelector('[data-nao]').onclick = () => el.classList.remove('on');
    el.querySelector('[data-sim]').onclick = () => { el.classList.remove('on'); comprarOuro(of.inicial ? 'inicial' : 'nivel', of.preco); };
  };
  $t('#tyMelhorar').onclick = () => { $t('#tyLojaP').classList.add('hide'); $t('#tyPainel').classList.toggle('hide'); desenharPainel(); };
  // 7 nov 19:35 (fase 1): o progresso também fica no servidor — abre-se o mais recente (deste aparelho ou do servidor)
  let ultimoEnvio = 0, pendente = null, tSrv = null;
  const enviarEstado = () => { tSrv = null; if (!pendente) return; const st = pendente; pendente = null; ultimoEnvio = Date.now(); sb.rpc('tycoon_guardar', { p_chave: chaveOuro, p_estado: st }).then(() => { }, () => { }); };
  const guardarServidor = st => { pendente = st; if (tSrv) return; tSrv = setTimeout(enviarEstado, Math.max(2500, 15000 - (Date.now() - ultimoEnvio))); };
  tycoonAberto.enviarEstado = () => { if (!pendente) return; clearTimeout(tSrv); tSrv = null; const falta = 2600 - (Date.now() - ultimoEnvio); falta > 0 ? setTimeout(enviarEstado, falta) : enviarEstado(); };
  const lerServidor = sb.rpc('tycoon_ler', { p_chave: chaveOuro }).then(r => r.data, () => null);
  // ganhos de quando estavas fora: «Recolher» ou «Recolher ×2» com Ouro
  const recolherFora = (g, min, fn) => {
    $t('#tyRecolher')?.remove();
    const w = document.createElement('div'); w.id = 'tyRecolher'; w.className = 'tyPedirOuro';
    w.innerHTML = `<div class="tyPOCaixa"><div class="tyPOTit">🧺 ${esc(tr('Enquanto estavas fora ({0} min), a equipa ganhou {1} notas!').replace('{0}', min).replace('{1}', g))}</div>
      <button type="button" class="tyPOSim" data-x2><span class="tyNota" aria-hidden="true"></span> ${esc(tr('Recolher a dobrar'))} · 20 ${esc(tr('Ouro'))}</button>
      <button type="button" class="tyPONao" data-x1>${esc(tr('Recolher'))} (${g})</button></div>`;
    v.appendChild(w);
    w.querySelector('[data-x1]').onclick = () => { w.remove(); fn(false); };
    const x2 = async () => {
      if ((J?.ouro || 0) < 20) { w.remove(); pedirOuro(20, () => { recolherFora(g, min, fn); }); return; }
      const { data, error } = await sb.rpc('tycoon_ouro', { p_chave: chaveOuro, p_item: 'recolher_x2' });
      if (error) { toast(tr(String(error.message || '').replace(/^.*?: /, '')), 'mau'); return; }
      if (J) J.ouro = data.ouro; w.remove(); fn(true);
    };
    w.querySelector('[data-x2]').onclick = x2;
  };
  // 7 nov (dono: «heavy emphasis on the leaderboards»): a tua posição sempre à vista; tocar → zona / cidade / quem segues, semana / sempre
  const rk = { ambito: 'bairro', periodo: 'semana', dados: null, coroa: null, avisado: false };
  const ordinal = ordinalTy;
  const lerRanking = async (ambito = 'bairro', periodo = 'semana') => { try { const { data } = await sb.rpc('tycoon_ranking', { p_ambito: ambito, p_periodo: periodo, p_tipo: e.tipo }); return data; } catch { return null; } };
  const chipRanking = async () => {
    const d = await lerRanking(); if (!tycoonAberto || !d) return;
    const zona = bairro(d.bairro)?.nome || d.bairro || '';
    $t('#tyRankT').textContent = d.eu ? `${ordinal(d.eu.pos)} · ${zona}` : tr('Ranking');
    $t('#tyRank').classList.toggle('coroa', !!rk.coroa);
    if (!rk.avisado && real) { rk.avisado = true;
      setTimeout(() => { if (!tycoonAberto) return;
        if (d.eu && d.eu.pos === 1) aviso('🏆 ' + tr('Estás em 1.º na tua zona! Aguenta até domingo para ganhar {0} Ouro.').replace('{0}', d.premio));
        else if (d.eu && d.acima) aviso('🏆 ' + tr('Estás em {0} na tua zona — faltam {1} notas para passar «{2}».').replace('{0}', ordinal(d.eu.pos)).replace('{1}', (d.acima.pontos - d.eu.pontos + 1).toLocaleString('pt-PT')).replace('{2}', d.acima.nome));
        else aviso('🏆 ' + tr('Serve clientes para entrares no ranking da tua zona. O 1.º ganha {0} Ouro todas as semanas!').replace('{0}', d.premio)); }, 6000); }
  };
  const desenharRanking = async () => {
    const el = $t('#tyRankP'); const zonaN = d => bairro(d?.bairro)?.nome || d?.bairro || '';
    const abas = (k, op) => `<div class="tyRkAbas">${op.map(([v, t]) => `<button type="button" data-rk-${k}="${v}" class="${rk[k] === v ? 'on' : ''}">${esc(tr(t))}</button>`).join('')}</div>`;
    const cab = `<div class="tyPTit">🏆 ${esc(tr('Ranking'))}<button type="button" class="tyPFechar">✕</button></div>` + abas('ambito', [['bairro', 'A minha zona'], ['cidade', 'Cidade toda'], ['amigos', 'Quem sigo']]) + abas('periodo', [['semana', 'Esta semana'], ['sempre', 'Sempre']]);
    el.innerHTML = cab + `<div class="empty">${esc(tr('A carregar…'))}</div>`;
    const d = await lerRanking(rk.ambito, rk.periodo); if (!tycoonAberto) return;
    const med = n => `<b class="${n <= 3 ? 'm' + n : ''}">${n}</b>`;
    const linhas = (d?.lista || []).map(x => `<div class="tyRkL ${x.eu ? 'eu' : ''}"><span class="p">${med(x.pos)}</span><div class="t"><b>${esc(x.nome)}</b><small>${esc(x.dono || '')}${rk.ambito !== 'bairro' ? ' · ' + esc(bairro(x.bairro)?.nome || x.bairro) : ''}</small></div><span class="n"><span class="tyNota" aria-hidden="true"></span> ${Number(x.pontos).toLocaleString('pt-PT')}</span></div>`).join('');
    const eu = d?.eu && !(d.lista || []).some(x => x.eu) ? `<div class="tyRkL eu"><span class="p"><b>${d.eu.pos}</b></span><div class="t"><b>${esc(d.eu.nome)}</b></div><span class="n">${Number(d.eu.pontos).toLocaleString('pt-PT')}</span></div>` : '';
    const falta = d?.eu && d.acima ? `<p class="tyRkFalta">${esc(tr('Faltam {0} notas para passares «{1}».').replace('{0}', (d.acima.pontos - d.eu.pontos + 1).toLocaleString('pt-PT')).replace('{1}', d.acima.nome))}</p>` : '';
    el.innerHTML = cab + (rk.ambito === 'bairro' ? `<p class="tyRkZona">📍 ${esc(zonaN(d))}</p>` : '') + falta + (linhas || `<div class="empty">${esc(tr('Ainda ninguém pontuou. Sê o primeiro!'))}</div>`) + eu
      + `<p class="tyPNota">👑 ${esc(tr('Todas as segundas: o 1.º de cada zona e o top 3 da cidade ganham {0} Ouro, e o top 3 fica com coroa durante a semana. Pontos = notas que o teu negócio ganha.').replace('{0}', d?.premio || 200))}</p>`;
    el.querySelector('.tyPFechar').onclick = () => el.classList.add('hide');
    el.querySelectorAll('[data-rk-ambito]').forEach(b => b.onclick = () => { rk.ambito = b.dataset.rkAmbito; desenharRanking(); });
    el.querySelectorAll('[data-rk-periodo]').forEach(b => b.onclick = () => { rk.periodo = b.dataset.rkPeriodo; desenharRanking(); });
  };
  $t('#tyRank').onclick = () => { $t('#tyPainel').classList.add('hide'); $t('#tyLojaP').classList.add('hide'); const el = $t('#tyRankP'); el.classList.toggle('hide'); if (!el.classList.contains('hide')) desenharRanking(); };
  if (real) tycoonCoroas(uid).then(({ data }) => { rk.coroa = (data || []).find(c => String(c.empresa) === String(e.id)) || null; if (rk.coroa && tycoonAberto) { $t('#tyRank').classList.add('coroa'); aviso('👑 ' + coroaTexto(rk.coroa)); } }, () => { });
  chipRanking(); const tRank = setInterval(() => tycoonAberto ? chipRanking() : clearInterval(tRank), 120000);
  // 7 nov (fase 4): objetivos do dia e da semana, sequência de 7 dias e coleção de decorações
  let objAba = 'hoje';
  const barra = (c, n) => `<i class="tyObjBar"><em style="width:${Math.min(100, Math.round(100 * c / Math.max(1, n)))}%"></em></i><small>${c}/${n}</small>`;
  const desenharObj = () => {
    const jogo = tycoonAberto?.jogo; if (!jogo) return; const I = jogo.objInfo(), el = $t('#tyObjP');
    const ABAS = [['hoje', '🎯 ' + tr('Hoje')], ['semana', '📅 ' + tr('Semana')], ['seq', '🔥 ' + tr('Sequência')], ['colecao', '🖼️ ' + tr('Coleção')]];
    const linhaObj = (g, i) => `<div class="tyPLinha"><div class="t"><b>${esc(g.txt)}</b>${barra(g.cont, g.n)}</div>
      ${g.rec ? `<span class="tyMax">✓</span>` : g.cont >= g.n ? `<button type="button" data-rec="${i}"><span class="tyNota" aria-hidden="true"></span> +${g.premio}</button>` : `<span class="tyObjP"><span class="tyNota" aria-hidden="true"></span> ${g.premio}</span>`}</div>`;
    let corpo = '';
    if (objAba === 'hoje') corpo = I.hoje.map(linhaObj).join('') + `<p class="tyPNota">🎁 ${esc(tr('Os 3 de hoje: dinheiro a dobrar de oferta. Objetivos novos todos os dias à meia-noite.'))}</p>`;
    else if (objAba === 'semana') corpo = linhaObj(I.semana, 'semana') + `<p class="tyPNota">🎁 ${esc(tr('Prémio da semana: notas e uma decoração da coleção desta semana.'))}</p>`;
    else if (objAba === 'seq') corpo = `<div class="tySeq">${[1, 2, 3, 4, 5, 6, 7].map(d => `<span class="${d < I.seq.dias || (d === I.seq.dias && !I.seq.porReceber) ? 'feito' : d === I.seq.dias ? 'hoje' : ''}"><b>${d}</b><small>${d === 7 ? '🎁' : ''}</small></span>`).join('')}</div>
        <p class="tyPNota">🔥 ${esc(tr('Entra todos os dias: cada dia seguido dá mais notas; o 7.º dá 500 notas e velocidade a dobrar. Se falhares um dia, volta ao 1.'))}</p>
        ${I.seq.porReceber ? `<button type="button" class="tyPOSim" data-seq><span class="tyNota" aria-hidden="true"></span> ${esc(tr('Receber'))} +${I.seq.premio}</button>` : ''}`;
    else corpo = I.colecao.map(d => `<div class="tyPLinha"><span class="e">${d.icon}</span><div class="t"><b>${esc(tr(d.nome))}</b><small>+1,5% ${esc(tr('ao que os clientes pagam'))}</small></div>
        ${d.tenho ? `<span class="tyMax">✓</span>` : `<button type="button" data-dec="${d.id}" ${(ultimo?.caixa || 0) >= d.preco ? '' : 'disabled'}><span class="tyNota" aria-hidden="true"></span> ${d.preco}</button>`}</div>`).join('')
        + `<p class="tyPNota">🖼️ ${esc(tr('Coleção: {0} de {1} · bónus +{2}%. Decorações novas todas as segundas-feiras. Animais: {3} de 3 (na Loja).').replace('{0}', I.total).replace('{1}', I.de).replace('{2}', String(I.bonus).replace('.', ',')).replace('{3}', I.pets))}</p>`;
    el.innerHTML = `<div class="tyPTit">🎯 ${esc(tr('Objetivos'))}<button type="button" class="tyPFechar">✕</button></div><div class="tyRkAbas">${ABAS.map(([k, t]) => `<button type="button" data-oba="${k}" class="${objAba === k ? 'on' : ''}">${esc(t)}</button>`).join('')}</div>` + corpo;
    el.querySelector('.tyPFechar').onclick = () => el.classList.add('hide');
    el.querySelectorAll('[data-oba]').forEach(b => b.onclick = () => { objAba = b.dataset.oba; desenharObj(); });
    el.querySelectorAll('[data-rec]').forEach(b => b.onclick = () => { jogo.receberObj(b.dataset.rec === 'semana' ? 'semana' : +b.dataset.rec); desenharObj(); });
    el.querySelector('[data-seq]')?.addEventListener('click', () => { jogo.receberSeq(); desenharObj(); });
    el.querySelectorAll('[data-dec]').forEach(b => b.onclick = () => { jogo.comprarDecor(b.dataset.dec); desenharObj(); });
  };
  $t('#tyObj').onclick = () => { ['#tyPainel', '#tyLojaP', '#tyRankP'].forEach(x => $t(x).classList.add('hide')); const el = $t('#tyObjP'); el.classList.toggle('hide'); if (!el.classList.contains('hide')) desenharObj(); };
  const sequencia = (dias, premio, fn) => {
    $t('#tySeqPop')?.remove();
    const w = document.createElement('div'); w.id = 'tySeqPop'; w.className = 'tyPedirOuro';
    w.innerHTML = `<div class="tyPOCaixa"><div class="tyPOTit">🔥 ${esc(tr('Dia {0} seguido!').replace('{0}', dias))}</div>
      <div class="tySeq">${[1, 2, 3, 4, 5, 6, 7].map(d => `<span class="${d < dias ? 'feito' : d === dias ? 'hoje' : ''}"><b>${d}</b><small>${d === 7 ? '🎁' : ''}</small></span>`).join('')}</div>
      <button type="button" class="tyPOSim" data-sim><span class="tyNota" aria-hidden="true"></span> ${esc(tr('Receber'))} +${premio}</button></div>`;
    v.appendChild(w); w.querySelector('[data-sim]').onclick = () => { w.remove(); fn(); };
  };
  // 7 nov (fase 5): filiais — ir de uma para outra (escolhes o transporte e vês a viagem com o anúncio), bónus da cadeia, abandono
  const avisoJanela = (tit, linhas) => {
    const w = document.createElement('div'); w.className = 'tyPedirOuro'; w.id = 'tyAvisoJ';
    w.innerHTML = `<div class="tyPOCaixa"><div class="tyPOTit">${esc(tit)}</div>${linhas.map(l => `<p class="tyAvL">${esc(l)}</p>`).join('')}<button type="button" class="tyPOSim" data-ok>${esc(tr('Está bem'))}</button></div>`;
    v.appendChild(w); w.querySelector('[data-ok]').onclick = () => w.remove();
  };
  let cadeia = [];
  const irParaFilial = x => {
    fecharTycoon();
    if (x.bairro === J.bairro) { setTimeout(() => abrirTycoon(x), 300); return; }
    const el = sheet(`<h3>🏢 ${esc(x.nome)}</h3><p class="m">${esc(tr('Como vais até lá?'))} 📍 ${esc(bairro(x.bairro)?.nome || x.bairro)}</p>${grelhaDestinos(meiosParaDestino(x.bairro).map(m => opcaoViagem(x.bairro, m)))}`);
    el.querySelectorAll('[data-viajar]').forEach(bt => bt.onclick = async () => { await viajar(bt.dataset.viajar, bt.dataset.meio); if (J.bairro === x.bairro) abrirTycoon(x); });
  };
  const desenharFiliais = () => {
    const el = $t('#tyFilP');
    el.innerHTML = `<div class="tyPTit">🏢 ${esc(tr('Filiais'))}<button type="button" class="tyPFechar">✕</button></div>` + cadeia.map(x => `<div class="tyPLinha"><div class="t"><b>${esc(x.nome)}</b><small>📍 ${esc(bairro(x.bairro)?.nome || x.bairro)}${x.matriz ? '' : ' · ' + esc(tr('sede'))}</small></div>
      ${String(x.id) === String(e.id) ? `<span class="tyMax">${esc(tr('Estás aqui'))}</span>` : `<button type="button" data-ir="${x.id}">${esc(tr('Ir'))}</button>`}</div>`).join('')
      + `<p class="tyPNota">🏪 ${esc(tr('Acaba o tycoon de um negócio (as 5 salas novas) e ganhas uma licença de filial grátis. Cada tycoon acabado dá +10% a toda a cadeia.'))}</p>`;
    el.querySelector('.tyPFechar').onclick = () => el.classList.add('hide');
    el.querySelectorAll('[data-ir]').forEach(b => b.onclick = () => irParaFilial(cadeia.find(x => String(x.id) === b.dataset.ir)));
  };
  $t('#tyFil').onclick = () => { ['#tyPainel', '#tyLojaP', '#tyRankP', '#tyObjP'].forEach(x => $t(x).classList.add('hide')); const el = $t('#tyFilP'); el.classList.toggle('hide'); if (!el.classList.contains('hide')) desenharFiliais(); };
  const fase5 = async jogo => {
    if (!real) return;
    const m = e.matriz || e.id;
    try {
      const [a, b] = await Promise.all([sb.from('empresas').select('id,nome,bairro,tipo,matriz').eq('id', m).eq('falida', false), sb.from('empresas').select('id,nome,bairro,tipo,matriz').eq('matriz', m).eq('falida', false)]);
      cadeia = [...(a.data || []), ...(b.data || [])].filter(x => x.tipo === e.tipo);
      if (cadeia.length > 1 && tycoonAberto) $t('#tyFil').classList.remove('hide');
    } catch { }
    sb.rpc('tycoon_bonus', { p_empresa: +e.id }).then(({ data }) => { if (data > 0 && tycoonAberto) { jogo.definirBonus(data); aviso('🏪 ' + tr('Bónus da cadeia: +{0}% em tudo o que os clientes pagam.').replace('{0}', Math.round(data * 100))); } }, () => { });
    sb.rpc('tycoon_problemas_de', { p_chave: chaveOuro }).then(({ data }) => { const t = tycoonAberto ? jogo.aplicarProblemas(data) : []; if (t.length) avisoJanela('🏚️ ' + tr('Enquanto estiveste fora:'), t); }, () => { });
  };
  const completo = () => {
    if (!real || !tycoonAberto) return;
    setTimeout(async () => {
      if (!tycoonAberto) return;
      await sb.rpc('tycoon_guardar', { p_chave: chaveOuro, p_estado: tycoonAberto.jogo.estado() }).then(() => { }, () => { });   // o servidor confirma pelo que está guardado
      const { data, error } = await sb.rpc('tycoon_completar', { p_empresa: +e.id });
      if (error) { aviso('🏪 ' + tr(String(error.message || '').replace(/^.*?: /, ''))); return; }
      tycoonAberto.jogo.marcarCompleto(); if (data?.bonus) tycoonAberto.jogo.definirBonus(data.bonus);
      if (!data?.ja) avisoJanela('🏪 ' + tr({ discoteca: 'Acabaste esta discoteca!', salao: 'Acabaste este salão!', loja: 'Acabaste esta loja!' }[e.tipo] || 'Acabaste esta cantina!'), [tr(data?.licenca ? 'Ganhaste uma licença de filial grátis. Abre a filial em 📱 Negócios e começa outra vez, com bónus.' : 'Já tens o máximo de filiais, mas o bónus de +10% fica para toda a cadeia.')]);
    }, 500);
  };
  // hora de ponta: faixa com contagem e os boosts a brilhar
  let tPonta = null;
  const horaPonta = seg => {
    clearInterval(tPonta); const el = $t('#tyPonta'), bx = $t('#tyBoosts');
    if (!seg) { el.classList.add('hide'); bx.classList.remove('ponta'); return; }
    const fim = Date.now() + seg * 1000; el.classList.remove('hide'); bx.classList.add('ponta');
    const tick = () => { const r = Math.max(0, Math.ceil((fim - Date.now()) / 1000)); $t('#tyPontaT').textContent = `${Math.floor(r / 60)}:${String(r % 60).padStart(2, '0')}`; if (!r) horaPonta(0); };
    tick(); tPonta = setInterval(tick, 500);
  };
  Promise.all([import('./tycoon.js'), lerServidor]).then(([, srv]) => {
    if (srv && typeof srv === 'object' && (!estado || (srv.saiu || 0) > (estado.saiu || 0))) estado = srv;
    $t('#tyCarregar').remove();
    tycoonAberto.jogo = window.TYCOON.iniciar(v, {
      tipo: e.tipo, nome: e.nome, ap: J && J.aparencia ? J.aparencia : {}, estado,
      guardar: st => { try { localStorage.setItem(chave, JSON.stringify(st)); } catch { } guardarServidor(st); },
      recolher: recolherFora, horaPonta, sequencia, completo,
      aviso, som, oferta: mostrarOferta, boosts: desenharBoosts,
      ofertaInicial: of => mostrarOferta({ ...of, inicial: true }),
      ganhou: n => { porEnviar += n; },
      passo: p => { const el = $t('#tyPasso'); if (!p) { el.classList.add('hide'); return; } el.classList.remove('hide'); $t('#tyPassoN').textContent = `${tr('Passo')} ${p.n}/${p.de}`; $t('#tyPassoT').textContent = p.txt; },
      dica: d => { const el = $t('#tyDica'); if (d) { el.textContent = d; el.classList.remove('fora'); } else el.classList.add('fora'); },
      boostAcabou: (b) => {
        const bt = $t(`[data-b="${b.id}"]`); if (bt) { bt.classList.add('acabou'); setTimeout(() => bt.classList.remove('acabou'), 8000); }
        // 7 nov 19:35 / 8 nov 00:21 (dono): cada boost grátis é uma vez por dia; quando acaba, oferece-se outra vez com Ouro (sem Ouro → janela do Ouro)
        const el = $t('#tyOferta');
        const txt = b.id === 'ajudante' ? tr('A ajuda grátis de hoje acabou.') : `${tr(b.nome)}: ${tr('a vez grátis de hoje acabou.')}`;
        const bot = b.id === 'ajudante' ? tr('Contratar ajudante') : tr('Ativar outra vez');
        el.innerHTML = `<span>${b.icon} ${esc(txt)}</span><button type="button" data-sim>${esc(bot)} · ${b.ouro} ${esc(tr('Ouro'))}</button><button type="button" class="x" data-nao aria-label="${esc(tr('Fechar'))}">✕</button>`;
        el.classList.add('on', 'contratar'); clearTimeout(tOf); tOf = setTimeout(() => el.classList.remove('on', 'contratar'), 25000);
        el.querySelector('[data-nao]').onclick = () => el.classList.remove('on', 'contratar');
        el.querySelector('[data-sim]').onclick = () => { el.classList.remove('on', 'contratar'); const info = boostsAgora.find(x => x.id === b.id); if (info) usarBoost(info); };
      },
      fora: (ganho, min) => aviso(tr('Enquanto estavas fora ({0} min), a equipa ganhou {1} notas!').replace('{0}', min).replace('{1}', ganho)),
      hud: h => {
        ultimo = h;
        { const n = h.objetivos || 0, b = $t('#tyObjN'); b.textContent = n; b.classList.toggle('hide', !n); $t('#tyObj').classList.toggle('brilha', !!n); }
        // só redesenha o painel quando muda o que se pode comprar (senão o botão foge debaixo do dedo)
        const ass = h.melhorias.map(m => m.id + m.nivel + (m.preco !== null && h.caixa >= m.preco)).join();
        if (ass !== assPainel) { assPainel = ass; if (!$t('#tyPainel').classList.contains('hide')) desenharPainel(); }
        $t('#tyMelhorar').classList.toggle('brilha', h.melhorias.some(m => m.preco !== null && h.caixa >= m.preco));
        $t('#tyNotas').textContent = h.caixa; $t('#tyNiv').textContent = h.nivel; $t('#tyBarra').style.width = Math.min(100, Math.round(100 * h.xp / h.falta)) + '%';
        $t('#tyFaltam').textContent = tr('faltam {0} clientes').replace('{0}', h.falta - h.xp);
        $t('#tyProx').textContent = h.proximo ? `${tr('A seguir')} (⭐ ${h.proximo.nivel}): ${h.proximo.icon} ${h.proximo.nome}` : tr('Tudo desbloqueado!');
        $t('#tyLuz').classList.toggle('hide', !h.luz); $t('#tyBolso').textContent = h.leva ? `🍽️ ${h.leva}/${h.max}` : '';
      },
    });
    fase5(tycoonAberto.jogo);
    sb.rpc('tycoon_compras_de', { p_chave: chaveOuro }).then(({ data }) => { if (data && tycoonAberto?.jogo) tycoonAberto.jogo.aplicarCompras(data); }, () => { });
  }).catch(err => { console.warn('tycoon ' + (err && err.stack || err)); fecharTycoon(); toast(tr('O jogo não abriu neste aparelho.'), 'mau'); });
  $t('.tyFechar').onclick = fecharTycoon;
}
function fecharTycoon() {
  if (!tycoonAberto) return;
  try { tycoonAberto.enviar && tycoonAberto.enviar(); } catch { }
  try { tycoonAberto.jogo && tycoonAberto.jogo.parar(); } catch { }
  try { tycoonAberto.enviarEstado && tycoonAberto.enviarEstado(); } catch { }
  tycoonAberto.v.remove(); tycoonAberto = null;
}
// no site de teste: ?tycoon=cantina abre logo DEPOIS de entrares na conta (com uma cantina de mentira se não tiveres nenhuma)
function tycoonDoLink() { if (window.VEL_TESTE && /[?&]tycoon=/.test(location.search)) abrirTycoon({ id: 'teste', tipo: 'cantina', nome: 'Cantina da Mãe Rosa' }); }

// 👑 coroas do ranking do tycoon (ganhas na semana passada; valem esta semana) — perfil e cartão do negócio
const TY_TIPO_NOME = { cantina: 'cantina', discoteca: 'discoteca', salao: 'salão de beleza', loja: 'loja' };
const ordinalTy = n => (typeof lingua !== 'undefined' && lingua === 'en') ? '#' + n : (typeof lingua !== 'undefined' && lingua === 'fr') ? n + 'e' : n + '.º';
function coroaTexto(c) {
  const lugar = ordinalTy(c.posicao);
  return c.ambito === 'cidade' ? tr('{0} melhor {1} da cidade (semana passada)').replace('{0}', lugar).replace('{1}', tr(TY_TIPO_NOME[c.tipo] || c.tipo))
    : tr('{0} melhor {1} de {2} (semana passada)').replace('{0}', lugar).replace('{1}', tr(TY_TIPO_NOME[c.tipo] || c.tipo)).replace('{2}', (typeof bairro === 'function' && bairro(c.bairro)?.nome) || c.bairro);
}
function coroasTyHTML(lista) { return (lista || []).length ? `<div class="chips coroas-ty">${lista.map(c => `<span class="chip coroa">👑 ${esc(coroaTexto(c))}</span>`).join('')}</div>` : ''; }
function mostrarCoroas(id, alvo) {
  tycoonCoroas(id).then(({ data }) => { const el = typeof alvo === 'string' ? document.querySelector(alvo) : alvo; if (el && data?.length) el.insertAdjacentHTML("beforeend", coroasTyHTML(data)); }, () => { });
}

/* ============================================================
   9 nov 21:00 (dono): anúncio em ecrã inteiro das novidades — os negócios ganharam vida. Uma vez por jogador (neste aparelho).
   ============================================================ */
const NOVIDADES_CHAVE = 'vel_novidades_9nov';
function mostrarNovidades(forcar) {
  try { if (!forcar && localStorage.getItem(NOVIDADES_CHAVE)) return; } catch { }
  if (document.querySelector('.novidades')) return;
  const pontos = [
    ['🎮', tr('Entra no teu negócio e põe-no a funcionar: sentas os clientes, serves e apanhas o dinheiro.')],
    ['🍲', tr('Cantina, discoteca, salão e loja já têm jogo próprio.')],
    ['💰', tr('Quanto mais jogas, mais a caixa enche.')],
    ['🏬', tr('Abre filiais noutros bairros.')],
    ['👑', tr('Rankings todas as semanas, com prémios em Ouro.')],
    ['🏦', tr('Sem dinheiro? O banco empresta para o teu 1.º negócio.')],
    ['📱', tr('E o telemóvel tem um visual novo.')],
  ];
  const v = document.createElement('div'); v.className = 'novidades'; v.setAttribute('role', 'dialog'); v.setAttribute('aria-modal', 'true');
  v.innerHTML = `<div class="nov-caixa">
      <button class="nov-x" aria-label="${esc(tr('Fechar'))}">✕</button>
      <div class="nov-topo"><div class="nov-emo" aria-hidden="true" data-sem-traducao>🏪</div><small>${esc(tr('Novidade'))}</small>
        <h2>${esc(tr('Os teus negócios ganharam vida!'))}</h2><p>${esc(tr('Agora podes entrar no teu negócio e geri-lo com as tuas mãos.'))}</p></div>
      <ul class="nov-lista">${pontos.map(([e, t]) => `<li><span aria-hidden="true"${e === '🎮' ? ' data-sem-traducao' : ''}>${e}</span><span>${esc(t)}</span></li>`).join('')}</ul>
      <div class="nov-botoes"><button class="btn full" data-nov="ir">${esc(tr('Ver os meus negócios'))}</button><button class="btn ghost full" data-nov="depois">${esc(tr('Agora não'))}</button></div>
    </div>`;
  const fechar = () => { try { localStorage.setItem(NOVIDADES_CHAVE, '1'); } catch { } v.remove(); };
  v.querySelector('.nov-x').onclick = fechar;
  v.querySelector('[data-nov="depois"]').onclick = fechar;
  v.querySelector('[data-nov="ir"]').onclick = () => { fechar(); try { abrirTelemovel('empresas'); } catch { } };
  document.body.appendChild(v);
}
// mostra quando o jogo já está aberto e sem outras janelas (nunca a meio do tutorial nem dentro de um tycoon)
(function esperarNovidades() {
  // 9 nov 21:00: espalha o anúncio por 0–5 min depois de entrar (para não irem todos às Empresas ao mesmo tempo)
  let n = 0; const desde = Date.now() + (window.__MOSTRAR_NOV ? 0 : Math.random() * 5 * 60000);
  const t = setInterval(() => {
    if (Date.now() < desde) return;
    if (++n > 120) return clearInterval(t);
    const pronto = typeof J !== 'undefined' && J && typeof uid !== 'undefined' && uid && document.querySelector('#carregar.hide');
    if (!pronto) return;
    let tut = true; try { tut = !!localStorage.getItem('vel_tut_' + uid); } catch { }
    if (!tut || tycoonAberto || document.querySelector('.veil, .tel-modal, .pergunta, #telVeil:not([hidden])')) return;
    clearInterval(t); mostrarNovidades();
  }, 3000);
})();

/* ============================================================
   Vida na Banda — DINHEIRO E IMÓVEIS
   Banco (poupança, empréstimos), comprar casas, ser senhorio,
   vender, e o ranking pelo património.
   Usa as variáveis globais de jogo.js e vida.js.
   ============================================================ */
const precoCasa = c => c.preco_ouro ? 0 : c.renda * 60;   // 8 nov: casas VIP (Ouro) não têm preço em Kz

/* ---------- 🏦 Banco ---------- */
async function renderBanco(body) {
  if (J.poupanca == null) { body.innerHTML = '<div class="empty">Esta parte ainda está a ser instalada no servidor. Tenta mais tarde!</div>'; return; }
  const [{ data: cr }, { data: irt }] = await Promise.all([sb.rpc('meu_credito'), sb.rpc('meus_impostos')]);
  const atraso = J.divida > 0 && J.divida_prazo && new Date(J.divida_prazo) < new Date();
  const prazo = J.divida > 0 && J.divida_prazo ? Math.ceil((new Date(J.divida_prazo) - Date.now()) / 864e5) : null;
  if (typeof ui2 === 'function' && ui2()) return ui2Banco(body, cr, irt, atraso, prazo);   // 8 nov: redesenho (teste)
  body.innerHTML = `
    <div class="rel" style="margin-top:0">
      <div class="lbl"><span>👛 Carteira</span><span class="price">${saldoKz()}</span></div>
      <div class="lbl" style="margin-top:8px"><span>🐷 Poupança · 0,5%/dia até 1.000.000 Kz</span><span class="price" style="color:var(--green)">${fmtKz(J.poupanca)}</span></div>
      <div class="lbl" style="margin-top:8px"><span>💳 Dívida · 1,5%/dia</span><span class="price" style="color:${J.divida ? 'var(--red)' : 'var(--dim)'}">${fmtKz(J.divida)}</span></div>
      ${J.divida ? `<small style="display:block;margin-top:6px;color:${atraso ? '#ff9b9b' : 'var(--muted)'};font-size:12px">${atraso ? '📞 Em atraso! Os cobradores levam 30% da carteira por dia e, ao fim de 7 dias, penhoram um imóvel.' : `Prazo: ${prazo} dia${prazo === 1 ? '' : 's'}.`}</small>` : ''}
      ${irt ? `<div class="lbl" style="margin-top:8px"><span>🧾 IRT desta semana · ${irt.taxa}%</span><span class="price" style="color:var(--dim)">${fmtKz(irt.imposto)}</span></div>
      <small style="display:block;margin-top:4px;color:var(--muted);font-size:12px"><span>Salário da semana: ${fmtKz(irt.bruto)}</span> · <span>${irt.proximo ? `Próximo escalão a partir de ${fmtKz(irt.proximo)}` : 'Escalão máximo'}</span></small>` : ''}
      ${cr ? `<div class="lbl" style="margin-top:12px;font-weight:600;color:var(--muted)"><span>📊 Património</span><span>${fmtKz(cr.patrimonio)}</span></div>` : ''}
    </div>
    <label>Valor (Kz)</label><input class="inp" id="iBanco" type="number" min="100" step="100" placeholder="ex: 10000">
    <div class="grelha">
      <button data-b="depositar"><span class="e">🐷</span><span>Pôr na poupança</span></button>
      <button data-b="levantar"><span class="e">🏧</span><span>Levantar</span></button>
      ${J.divida ? `<button data-b="pagar"><span class="e">💳</span><span>Pagar dívida</span></button>` : ''}
      <button data-b="emprestar" ${J.bairro !== 'mutamba' ? 'disabled' : ''}><span class="e">🏦</span><span>Pedir empréstimo${J.bairro !== 'mutamba' ? '<small style="display:block;font-weight:600;color:var(--dim);font-size:11px">Só ao balcão, na Baixa</small>' : ''}</span></button>
    </div>
    <p class="m" style="margin-top:12px">💡 Podes pedir até <b>${cr ? fmtKz(Math.max(0, cr.limite - J.divida)) : '…'}</b>. O limite sobe com a reputação, o estudo, o salário e os imóveis que tens. Comissão de 5% e 7 dias para pagar.</p>
    <p class="m">🧾 IRT: o salário paga imposto por escalões da semana (segunda a domingo): até 70.000 Kz não paga, depois 10%, 17% acima de 300.000 e 25% acima de 1.500.000. Retido em cada turno.</p>`;
  body.querySelectorAll('[data-b]').forEach(b => b.onclick = async () => {
    const v = parseInt(body.querySelector('#iBanco').value, 10);
    if (!v || v < 100) return toast('Escreve um valor (mínimo 100 Kz).', 'mau');
    const op = b.dataset.b;
    if (op === 'emprestar') return confirmar(`Pedir ${fmtKz(v)} emprestado?`, `Vais dever ${fmtKz(Math.ceil(v * 1.05))} e a dívida cresce 1,5% por dia. Tens 7 dias. Se não pagares, vêm os cobradores — e depois a penhora.`, 'Pedir empréstimo',
      async () => { if (await acao('banco', { p_acao: op, p_valor: v })) abrirTelemovel('banco'); });
    if (await acao('banco', { p_acao: op, p_valor: v })) abrirTelemovel('banco');
  });
}

/* ---------- 🏘️ Imóveis ---------- */
async function lerImoveis(filtro) {
  let q = sb.from('propriedades').select('*');
  q = filtro(q);
  const { data, error } = await q;
  if (error) return null;
  const nomes = await nomesDe(data.flatMap(p => [p.dono, p.inquilino]).filter(Boolean));
  return data.map(p => ({ ...p, c: casaDe(p.casa), donoNome: nomes[p.dono], inqNome: nomes[p.inquilino] }));
}
async function renderImoveis(body) {
  body.innerHTML = '<div class="empty">A carregar…</div>';
  const meus = await lerImoveis(q => q.eq('dono', uid).order('id'));
  if (!meus) { body.innerHTML = '<div class="empty">Esta parte ainda está a ser instalada no servidor. Tenta mais tarde!</div>'; return; }
  if (typeof ui2 === 'function' && ui2() && !meus.length) return ui2ImoveisVazio(body);   // 8 nov: redesenho (teste)
  const total = meus.reduce((s, p) => s + precoCasa(p.c), 0);
  const rendas = meus.filter(p => p.inquilino).reduce((s, p) => s + p.renda, 0);
  body.innerHTML = `<p class="m">Comprar uma casa custa 60 dias de renda — e depois nunca mais pagas renda. As casas que não usas podes arrendar a outros jogadores ou vender.</p>
    ${meus.length ? `<div class="chips"><span class="chip">🏘️ ${meus.length} imóve${meus.length === 1 ? 'l' : 'is'} · ${fmtKz(total)}</span>${rendas ? `<span class="chip">💵 Recebes ${fmtKz(rendas)}/dia</span>` : ''}</div>` : ''}
    ${meus.length ? meus.map(p => {
      const moro = J.propriedade === p.id;
      const estado = moro ? '🏠 Moras aqui' : p.inquilino ? `🔑 Arrendada a ${esc(p.inqNome || '?')} · ${fmtKz(p.renda)}/dia` : p.a_venda ? `🪧 À venda por ${fmtKz(p.preco_venda)}` : p.renda ? `🪧 Para arrendar a ${fmtKz(p.renda)}/dia` : '🚪 Vazia';
      return `<div class="rel" data-p="${p.id}"><div class="lbl"><span>${p.c.emoji} ${esc(p.c.nome)}</span><span style="color:var(--dim);font-weight:600">📍 ${esc(bairro(p.bairro)?.nome || '')}</span></div>
        <p class="m" style="margin:6px 0 0">${estado}</p>
        <div class="grelha">
          ${!moro && p.bairro === J.bairro ? `<button data-x="entrar"><span class="e">🚪</span><span>Entrar</span></button>` : ''}
          ${!moro && !p.inquilino ? `<button data-x="morar"><span class="e">🏠</span><span>Morar aqui</span></button>` : ''}
          ${!moro && !p.inquilino && !p.a_venda ? `<button data-x="arrendar"><span class="e">🪧</span><span>${p.renda ? 'Mudar a renda' : 'Arrendar a jogadores'}</span></button>` : ''}
          ${p.renda && !p.inquilino ? `<button data-x="retirar"><span class="e">✋</span><span>Tirar do mercado</span></button>` : ''}
          ${!p.a_venda ? `<button data-x="anunciar"><span class="e">💰</span><span>Pôr à venda</span></button>` : `<button data-x="retirar"><span class="e">✋</span><span>Tirar de venda</span></button>`}
          <button data-x="vender" class="perigo"><span class="e">🏢</span><span>Vender à imobiliária · ${fmtKz(Math.floor(precoCasa(p.c) * 0.85))}</span></button>
        </div></div>`;
    }).join('') : '<div class="empty">Ainda não tens imóveis. Vai a um prédio ou quintal e carrega em "Comprar".</div>'}`;
  for (const p of meus) {
    const el = body.querySelector(`[data-p="${p.id}"]`);
    const x = k => el.querySelector(`[data-x="${k}"]`);
    const depois = () => abrirTelemovel('imoveis');
    x('entrar')?.addEventListener('click', () => entrarImovel(p));
    x('morar')?.addEventListener('click', async () => { if (await acao('mudar_para', { p_prop: p.id })) { await carregarMinhaMobilia(); depois(); } });
    x('arrendar')?.addEventListener('click', () => pedirValor(`Renda por dia · ${esc(p.c.nome)}`, `Entre ${fmtKz(p.c.renda / 2)} e ${fmtKz(p.c.renda * 3)}. A imobiliária cobra ${fmtKz(p.c.renda)}.`, p.renda || p.c.renda,
      async v => { if (await acao('anunciar_imovel', { p_prop: p.id, p_renda: v, p_preco: null })) depois(); }));
    x('anunciar')?.addEventListener('click', () => pedirValor(`Vender ${esc(p.c.nome)} a outro jogador`, `Entre ${fmtKz(precoCasa(p.c) / 2)} e ${fmtKz(precoCasa(p.c) * 5)}. Novo custa ${fmtKz(precoCasa(p.c))}.${p.inquilino ? ' O inquilino fica com o novo dono.' : ''}`, precoCasa(p.c),
      async v => { if (await acao('anunciar_imovel', { p_prop: p.id, p_renda: p.inquilino ? p.renda : null, p_preco: v })) depois(); }));
    x('retirar')?.addEventListener('click', async () => { if (await acao('anunciar_imovel', { p_prop: p.id, p_renda: p.inquilino ? p.renda : null, p_preco: null })) depois(); });
    x('vender')?.addEventListener('click', () => confirmar(`Vender ${esc(p.c.nome)} à imobiliária?`, `Recebes já ${fmtKz(Math.floor(precoCasa(p.c) * 0.85))}.${p.inquilino ? ' O inquilino vai ter de sair.' : ''}${J.propriedade === p.id ? ' Ficas sem casa.' : ''}`, 'Vender',
      async () => { if (await acao('vender_imovel', { p_prop: p.id })) { await carregarMinhaMobilia(); depois(); } }));
  }
  if (typeof ui2Como === 'function') ui2Como(body, 'Como funcionam a compra e o arrendamento');
}
function pedirValor(titulo, texto, inicial, fn) {
  const el = sheet(`<h3>${titulo}</h3><p class="m">${texto}</p><label>Valor (Kz)</label><input class="inp" id="iValor" type="number" min="100" step="100" value="${inicial}"><button class="btn full" id="sim">Confirmar</button>`);
  el.querySelector('#sim').onclick = () => { const v = parseInt(el.querySelector('#iValor').value, 10); if (!v) return toast('Escreve um valor.', 'mau'); fn(v); };
}

/* ---------- no prédio / quintal: comprar, e casas de jogadores ---------- */
async function imoveisNoLugar(div, casaId, depois) {
  const c = casaDe(casaId);
  const [ps, minhas, { data: kota }] = await Promise.all([lerImoveis(q => q.eq('casa', casaId).neq('dono', uid)), lerImoveis(q => q.eq('casa', casaId).eq('dono', uid)), sb.rpc('meu_preco_kota')]);
  // LL16: «preço de kota» — quem é mais rico/a paga mais à imobiliária
  const pk = kota || 0, precoK = precoCasa(c) + Math.floor(precoCasa(c) * pk / 100);
  const notaK = pk ? ` · ${tr('preço de kota')} +${pk}%` : '';
  if (!div.isConnected) return;
  const jaTenho = (minhas || []).length > 0 || J.casa === casaId;
  const livres = (ps || []).filter(p => (p.renda && !p.inquilino) || p.a_venda);
  // #1/#2: as tuas casas aqui onde não moras (vazias ou arrendadas) — podes sempre entrar
  const outras = (minhas || []).filter(p => p.id !== J.propriedade);
  div.innerHTML = (outras.length ? `<div class="sec"><h4>As tuas casas aqui</h4></div><div class="list">${outras.map(p => `<div class="row mine"><span class="e">🔑</span><div class="t"><b>A tua casa · ${esc(c.nome)}</b><small>${p.inquilino ? `Arrendada a ${esc(p.inqNome || '?')} · ${fmtKz(p.renda)}/dia` : 'Não moras aqui'}</small></div><button class="btn sm" data-ent-imovel="${p.id}">Entrar</button>${p.inquilino ? '' : `<button class="btn sm ghost" data-morar-imovel="${p.id}">Morar aqui</button>`}</div>`).join('')}</div>` : '') + `<div class="sec"><h4>Comprar</h4><span>Sem renda para sempre</span></div>
    ${jaTenho ? `<div class="list"><div class="row mine"><span class="e">🔑</span><div class="t"><b>${(minhas || []).length ? 'Já és dono/a de uma casa aqui' : 'Já arrendas uma casa aqui'}</b><small>${(minhas || []).length ? 'Vê e gere os teus imóveis em 📱 → Imóveis.' : 'Vives aqui de renda. Para seres dono/a, compra uma casa à venda.'}</small></div></div></div>` : c.preco_ouro ? `<div class="list"><div class="row"><span class="e">👑</span><div class="t"><b>${tr('Casa VIP · só com Ouro')}</b><small>${c.largura}×${c.fundo} · ${tr('conforto')} ${'★'.repeat(c.conforto)} · ${tr('2 andares')}</small></div><button class="btn sm" data-comprar-ouro-casa>🪙 ${c.preco_ouro.toLocaleString('pt-PT')}</button></div></div>` : `<div class="list"><div class="row"><span class="e">🔑</span><div class="t"><b>Comprar à imobiliária</b><small>${fmtKz(precoK)}${notaK} · ou pede um empréstimo no banco</small></div><button class="btn sm" data-comprar>Comprar</button></div></div>`}
    ${livres.length ? `<div class="sec"><h4>Casas de jogadores</h4></div><div class="list">${livres.map(p => `
      ${p.renda && !p.inquilino ? `<div class="row"><span class="e">🏠</span><div class="t"><b>Arrendar a ${esc(p.donoNome || '?')}</b><small>${fmtKz(p.renda)}/dia (imobiliária: ${fmtKz(c.renda)})</small></div><button class="btn sm" data-arr="${p.id}">Arrendar</button></div>` : ''}
      ${p.a_venda ? `<div class="row"><span class="e">🪧</span><div class="t"><b>À venda por ${esc(p.donoNome || '?')}</b><small>${p.inquilino ? `Com inquilino (${esc(p.inqNome || '?')}) a pagar ${fmtKz(p.renda)}/dia` : 'Vazia'}</small></div><button class="btn sm" data-comp="${p.id}">${fmtKz(p.preco_venda)}</button></div>` : ''}`).join('')}</div>` : ''}`;
  if (div.querySelector('[data-comprar-ouro-casa]')) div.querySelector('[data-comprar-ouro-casa]').onclick = () => {
    if ((J.ouro || 0) < c.preco_ouro) return typeof sugerirOuro === 'function' ? sugerirOuro(c.preco_ouro) : toast(tr('Precisas de {0} Ouro. Tens {1}.').replace('{0}', c.preco_ouro).replace('{1}', J.ouro || 0), 'mau');
    const el = sheet(`<h3>👑 ${esc(tr(c.nome))}</h3><p class="m">${esc(tr(c.descricao))}</p><p class="m">${tr('Custa {0} Ouro. Não pagas renda; podes arrendá-la a outros jogadores. As casas VIP não se vendem.').replace('{0}', c.preco_ouro.toLocaleString('pt-PT'))}</p>
      <button class="btn full" id="cMorarO">${tr('Comprar e morar lá')}</button><button class="btn full ghost" id="cInvestO" style="margin-top:8px">${tr('Comprar para investir')}</button>`);
    const vai = async morar => { if (await acao('comprar_casa_ouro', { p_casa: casaId, p_morar: morar })) { fecharSheets(); await carregarMinhaMobilia(); } };
    el.querySelector('#cMorarO').onclick = () => vai(true); el.querySelector('#cInvestO').onclick = () => vai(false);
  };
  if (div.querySelector('[data-comprar]')) div.querySelector('[data-comprar]').onclick = () => {
    const el = sheet(`<h3>Comprar ${esc(c.nome)} 🔑</h3><p class="m">Custa ${fmtKz(precoK)}${pk ? ` (${tr('preço de kota')}: +${pk}% — ${tr('quem tem mais património paga mais')})` : ''}. Depois não pagas renda — e se não morares lá, podes arrendá-la a outros jogadores.</p>
      <button class="btn full" id="cMorar">Comprar e morar lá</button><button class="btn full ghost" id="cInvest" style="margin-top:8px">Comprar para investir</button>`);
    const vai = async morar => { if (await acao('comprar_casa', { p_casa: casaId, p_morar: morar })) { fecharSheets(); await carregarMinhaMobilia(); } };
    el.querySelector('#cMorar').onclick = () => vai(true); el.querySelector('#cInvest').onclick = () => vai(false);
  };
  div.querySelectorAll('[data-arr]').forEach(b => b.onclick = () => confirmar('Arrendar esta casa?', 'Pagas o primeiro dia já, e depois todos os dias ao dono. Se não pagares, ficas na rua.', 'Arrendar',
    async () => { if (await acao('arrendar_imovel', { p_prop: +b.dataset.arr })) { fecharSheets(); await carregarMinhaMobilia(); } }));
  div.querySelectorAll('[data-comp]').forEach(b => b.onclick = () => confirmar('Comprar esta casa?', 'O dinheiro vai direto para o dono.', 'Comprar',
    async () => { if (await acao('comprar_imovel', { p_prop: +b.dataset.comp })) { fecharSheets(); } }));
  div.querySelectorAll('[data-ent-imovel]').forEach(b => b.onclick = () => entrarImovel(outras.find(p => p.id === +b.dataset.entImovel)));
  div.querySelectorAll('[data-morar-imovel]').forEach(b => b.onclick = async () => { if (await acao('mudar_para', { p_prop: +b.dataset.morarImovel })) { fecharSheets(); await carregarMinhaMobilia(); } });
}

// Entrar numa casa tua onde não moras. Sem inquilino: entras e podes decorar (os móveis ficam nessa casa).
// Arrendada a um jogador: entras como visita (só ver, nada se mexe).
async function entrarImovel(p) {
  if (!p) return;
  if (p.bairro !== J.bairro) return toast(`Essa casa fica em ${bairro(p.bairro)?.nome || p.bairro}. Vai até lá primeiro.`, 'info');
  fecharSheets(); fecharTelemovel();
  if (p.inquilino) {
    const { data: t } = await sb.from('jogadores').select('id,nome,casa,parede,chao').eq('id', p.inquilino).maybeSingle();
    if (!t || t.casa !== p.casa) return toast('Não foi possível entrar agora.', 'mau');
    await irParaCasa(t);
    return toast(`A tua casa, arrendada a ${t.nome}. Estás de visita: não podes mexer em nada. 🔑`, 'info', 5000);
  }
  await irParaCasa({ id: 'imovel-' + p.id, nome: J.nome, casa: p.casa, parede: J.parede, chao: J.chao }, { prop: p.id });
  toast('A tua casa (não moras aqui). Podes decorá-la: o que puseres cá fica cá. 🔑', 'info', 5000);
}

/* ---------- 🏆 Ranking pelo património ---------- */
async function renderRanking(body) {
  body.innerHTML = '<div class="empty">A carregar…</div>';
  const { data, error } = await sb.rpc('ranking');
  if (error) return false;
  if (typeof ui2 === 'function' && ui2()) { await ui2Ranking(body, data); return true; }   // 8 nov: redesenho (teste)
  const CL = { musseque: '🏚️', media: '🏠', rica: '🏛️' };
  // LL44 · o pódio: os 3 mais ricos em cima, com as personagens (2.º · 1.º · 3.º)
  const pod = data.slice(0, 3), ordem = [1, 0, 2].filter(i => pod[i]);
  const podio = pod.length ? `<div class="podio">${ordem.map(i => { const p = pod[i]; return `<div class="pod p${i + 1} ${p.id === uid ? 'eu' : ''}">
      ${i === 0 ? '<div class="coroa">👑</div>' : ''}<canvas id="pod${i}" width="160" height="200"></canvas>
      <b>${esc(p.nome)}</b><small>${fmtKz(p.patrimonio)}</small><div class="degrau"><span>${i + 1}</span></div></div>`; }).join('')}</div>` : '';
  if (jogamHoje == null && typeof carregarJogamHoje === 'function') carregarJogamHoje();
  body.innerHTML = `${podio}<p class="m">${typeof textoJogamHoje === 'function' && jogamHoje != null ? `<span class="online">${textoJogamHoje()}</span><br>` : ''}Património = carteira + poupança + imóveis − dívidas. O ícone mostra onde cada um nasceu.</p><div class="list">${data.map((p, i) => i < 3 ? '' : `<div class="row ${p.id === uid ? 'mine' : ''}"><span class="e" style="font-family:'Bricolage Grotesque';font-weight:800;color:${i ? 'var(--dim)' : 'var(--gold)'}">${i + 1}</span><div class="t"><b>${CL[p.classe] || ''} ${esc(p.nome)}</b><small>${p.emprego ? esc(emprego(p.emprego)?.nome || '') : 'Desempregado'} · ${esc(bairro(p.bairro)?.nome || '')}${p.imoveis ? ` · 🏘️ ${p.imoveis}` : ''}</small></div><span class="price">${fmtKz(p.patrimonio)}</span></div>`).join('')}</div>`;
  pod.forEach((p, i) => registarPreview('pod' + i, apVisivel(p.aparencia || {}, p.idade)));
  if (pod.length && !previewAnim) animarPreview();
  return true;
}

/* ---------- 💸 Transferir: sem complicações ---------- */
async function renderKumbu(body, extra) {
  const recentes = ls.get('vel_env_' + uid) || [];
  const { data: rel } = await sb.from('relacoes').select('a,b,nivel').or(`a.eq.${uid},b.eq.${uid}`).order('nivel', { ascending: false }).limit(12);
  const ids = (rel || []).map(r => r.a === uid ? r.b : r.a);
  const nm = await nomesDe(ids);   // 8 nov (I4): nomes guardados no telemóvel
  const nomes = [...new Set([...recentes, ...ids.map(i => nm[i]).filter(Boolean)])].slice(0, 10);
  if (typeof ui2 === 'function' && ui2()) return ui2Kumbu(body, extra, nomes, recentes);   // 8 nov: redesenho (teste)
  body.innerHTML = `<div class="rel" style="margin-top:0;text-align:center"><small class="m">O teu saldo</small><div style="font-family:'Bricolage Grotesque';font-size:30px;font-weight:800;color:var(--gold)">${saldoKz()}</div></div>
    <form id="fEnviar" style="margin-top:12px"><label>Para quem?</label><input class="inp" id="iDest" required maxlength="16" value="${esc(extra || '')}" placeholder="Nome do jogador" autocomplete="off">
      ${nomes.length ? `<div class="chips">${nomes.map(n => `<button type="button" class="chip" data-n="${esc(n)}">👤 ${esc(n)}</button>`).join('')}</div>` : ''}
      <label style="margin-top:10px">Quanto?</label><input class="inp" id="iVal" type="number" min="1" step="1" required placeholder="0">
      <div class="chips">${[500, 1000, 5000, 10000, 50000].map(v => `<button type="button" class="chip" data-v="${v}">${fmtKz(v)}</button>`).join('')}</div>
      <button class="btn full" type="submit" style="margin-top:12px">Enviar 💸</button></form>
    <p class="m" style="margin-top:10px">Chega na hora, sem taxas. Qualquer pessoa pode enviar e receber.</p>`;
  body.querySelectorAll('[data-n]').forEach(b => b.onclick = () => { body.querySelector('#iDest').value = b.dataset.n; });
  body.querySelectorAll('[data-v]').forEach(b => b.onclick = () => { body.querySelector('#iVal').value = b.dataset.v; });
  body.querySelector('#fEnviar').onsubmit = async e => {
    e.preventDefault();
    const nome = body.querySelector('#iDest').value.trim(), v = parseInt(body.querySelector('#iVal').value, 10);
    const bt = body.querySelector('button[type=submit]'); bt.disabled = true;
    const r = await acao('enviar_kumbu', { p_nome: nome, p_valor: v });
    bt.disabled = false;
    if (r) { ls.set('vel_env_' + uid, [nome, ...recentes.filter(x => x.toLowerCase() !== nome.toLowerCase())].slice(0, 5)); renderKumbu(body); }
  };
}

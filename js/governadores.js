/* ============================================================
   Vida na Banda — GOVERNADORES DAS 7 PROVÍNCIAS (FILA 0dh-5 / 0di, dono 5 nov)
   Eleições de 2 em 2 semanas; vota-se onde se nasceu e onde se vive; o candidato escreve uma mensagem que todos veem;
   cartão com a personagem de fato (ou vestido), nome, mensagem, origem e trabalho; barra para votar a todos;
   o governador escolhe uma medida (lista grande: vê 6 de cada vez, baralha e pesquisa), nomeia a equipa e pode desviar.
   Política 100% fictícia.
   ============================================================ */
let PROV = null, PROV_MEDIDAS = null, _provEm = 0;
const PROV_CARGOS = { governador: 'Governador/a', vice: 'Vice-governador/a', saude: 'Secretário/a da Saúde', transportes: 'Secretário/a dos Transportes' };
const provLoc = () => typeof lingua !== 'undefined' && lingua === 'en' ? 'en-GB' : typeof lingua !== 'undefined' && lingua === 'fr' ? 'fr-FR' : 'pt-PT';
const provNome = id => PROV?.provincias?.find(p => p.id === id)?.nome || id;

async function carregarProv(forcar) {
  if (!J || (!forcar && Date.now() - _provEm < 60e3)) return PROV;
  const pp = typeof pre === 'function' ? pre('prov') : null;   // 9 nov: vem no arranque()
  const { data, error } = pp?.v != null ? { data: pp.v, error: null } : await sb.rpc('prov_estado');
  if (!error && data) { PROV = data; _provEm = Date.now(); }
  barraVotar();
  return PROV;
}
setInterval(() => { if (J && !document.hidden) carregarProv(true); }, 20 * 60 * 1000);   // 9 nov (custos): era de 5 em 5 min
// a barra não tapa janelas, o telemóvel, perguntas nem minijogos
setInterval(() => {
  const f = document.getElementById('barraVotar'); if (!f) return;
  const tapa = document.querySelector('.veil, .tel-modal, .pergunta, #telVeil') || (typeof telAberto !== 'undefined' && telAberto) || (typeof emJogoAgora === 'function' && emJogoAgora());
  f.style.display = tapa ? 'none' : 'flex';
}, 700);
setTimeout(function primeira() { if (typeof J !== 'undefined' && J) carregarProv(true); else setTimeout(primeira, 3000); }, 4000);

// roupa de campanha: fato (gravata) ou vestido, conforme o estilo da personagem
function apFormal(ap) {
  ap = ap || {};
  const saia = [1, 3, 4].includes(ap.roupa || 0);
  return saia ? { ...ap, roupa: 3 } : { ...ap, roupa: 2, calca: '#1f2a44' };
}
const fechaTxt = iso => new Date(iso).toLocaleDateString(provLoc(), { weekday: 'long', day: 'numeric', month: 'numeric', timeZone: 'Africa/Luanda' }) + ' 20h';

/* ---------- barra «vai votar» para todos ---------- */
function eleicaoParaMim() {
  return (PROV?.eleicoes || []).find(e => e.posso_votar && !e.votei && !(() => { try { return localStorage.getItem('vel_prov_nao_' + e.id); } catch { return null; } })());
}
function barraVotar() {
  let f = document.getElementById('barraVotar');
  const e = eleicaoParaMim();
  if (!e || (typeof emJogoAgora === 'function' && emJogoAgora())) { f && f.remove(); return; }
  if (!f) {
    f = document.createElement('div'); f.id = 'barraVotar';
    f.style.cssText = 'position:fixed;left:8px;right:8px;bottom:calc(84px + env(safe-area-inset-bottom));z-index:60;display:flex;gap:8px;align-items:center;padding:8px 10px;border:2px solid #141012;border-radius:12px;background:#fff6d6;color:#141012;font:600 13px system-ui,sans-serif;box-shadow:3px 3px 0 #141012;max-width:520px;margin:0 auto';
    document.body.appendChild(f);
  }
  const n = 1 + (e.candidatos || []).length;
  // dono 6 nov: quem nasceu numa província e vive noutra tem 2 votos — a barra diz qual é (e que é o segundo)
  const ondeTxt = PROV.vivo === PROV.nasci ? '' : e.provincia === PROV.nasci ? tr('onde nasceste') : tr('onde vives');
  const jaVotou = (PROV.eleicoes || []).some(x => x.votei);
  f.innerHTML = `<span style="font-size:22px">🗳️</span><div style="flex:1;min-width:0"><b>${esc(tr('Eleições para governador/a de {0}').replace('{0}', provNome(e.provincia)))}${ondeTxt ? ` <small>(${esc(ondeTxt)})</small>` : ''}</b><br><small>${jaVotou ? '☑️ ' + esc(tr('Tens um segundo voto aqui.')) + ' · ' : ''}${esc(tr('{0} candidatos · fecha {1}').replace('{0}', n).replace('{1}', fechaTxt(e.fecha_em)))}</small></div>
    <button class="btn sm" data-bv="votar">${esc(tr('Votar'))}</button><button class="btn sm ghost" data-bv="nao" title="${esc(tr('Não me interessa'))}">${esc(tr('Não me interessa'))}</button>`;
  f.querySelector('[data-bv="votar"]').onclick = () => { f.remove(); window._provFoco = true; abrirTelemovel('governo'); };
  f.querySelector('[data-bv="nao"]').onclick = () => {
    try { localStorage.setItem('vel_prov_nao_' + e.id, '1'); } catch { }
    f.remove(); toast(tr('Quem não vota deixa os outros decidirem por si. 🤷'), 'info', 4000);
  };
}

/* ---------- secção no app Governo ---------- */
async function provHTML() {
  await carregarProv(true);
  if (!PROV) return '';
  const P = PROV, c = P.cargo;
  let h = `<div class="sub2" id="provTopo">🏛️ ${esc(tr('Governos provinciais'))}</div>`;
  if (c) h += provPainelHTML();
  for (const e of P.eleicoes || []) {
    const pr = P.provincias.find(x => x.id === e.provincia);
    const minha = e.provincia === P.vivo || e.provincia === P.nasci;
    if (!minha) continue;
    h += `<div class="rel" style="margin-top:8px"><b>🗳️ ${esc(tr('Eleições para governador/a de {0}').replace('{0}', pr.nome))}</b>
      <div class="m" style="margin:2px 0 6px">${esc(tr('Fecha {0}').replace('{0}', fechaTxt(e.fecha_em)))} · ${esc(tr('Salário: {0} por dia').replace('{0}', fmtKz(pr.salario)))}</div>
      <div class="provCands">${(e.candidatos || []).map((k, i) => `<div class="provCand ${k.id === uid ? 'mine' : ''}">
          <canvas id="pc_${e.id}_${i}" width="110" height="140"></canvas>
          <div class="pcT"><b>${esc(k.nome)}</b><q>${esc(k.mensagem)}</q>
            <small>📍 ${esc(tr('Origem'))}: ${esc(k.origem || '—')}</small><small>💼 ${esc(k.emprego || tr('Sem trabalho'))}</small>
            ${e.posso_votar && !e.votei && k.id !== uid ? `<button class="btn sm" data-pvotar="${e.id}:${k.id}">${esc(tr('Votar'))}</button>` : ''}</div></div>`).join('')}
        <div class="provCand npc"><div class="sem-av">🎗️</div><div class="pcT"><b>${esc(e.npc.nome)}</b><q>${esc(e.npc.mensagem)}</q>
          <small>${esc(partidoDe(e.npc.nome) || '')}</small>${e.posso_votar && !e.votei ? `<button class="btn sm ghost" data-pvotar="${e.id}:">${esc(tr('Votar'))}</button>` : ''}</div></div>
      </div>
      <p class="m" style="margin-top:6px">${e.votei ? '☑️ ' + esc(tr('Já votaste.')) : e.posso_votar ? esc(tr('Votas onde nasceste e onde vives. Um voto por pessoa.')) : esc(tr('Só maiores de 18 anos votam.'))}</p>
      ${!P.candidato_em && !P.proibido && !c ? `<button class="btn sm" data-pcand="${e.provincia}">✋ ${esc(tr('Candidatar-me ({0})').replace('{0}', fmtKz(50000)))}</button>` : ''}
    </div>`;
  }
  h += `<div class="list" style="margin-top:8px">${P.provincias.map(pr => `<div class="row"><span class="e">${pr.id === P.vivo ? '🏠' : '🏛️'}</span><div class="t"><b>${esc(pr.nome)}</b>
      <small>${esc(tr('Governador/a'))}: ${esc(pr.governador || pr.governador_npc || tr('a decidir nas eleições'))}${pr.medida ? ` · ${pr.medida.emoji} ${esc(tr(pr.medida.nome))}` : ''}</small></div></div>`).join('')}</div>`;
  return h;
}

function provPainelHTML() {
  const c = PROV.cargo, pr = PROV.provincias.find(x => x.id === c.provincia), gov = c.cargo === 'governador';
  let h = `<div class="rel" style="margin-top:8px;border-color:var(--gold)"><b>🏛️ ${esc(tr(PROV_CARGOS[c.cargo]))} · ${esc(pr.nome)}</b>
    <div class="chips"><span class="chip">💼 ${fmtKz(c.salario)}/${esc(tr('dia'))}</span><span class="chip">💰 ${esc(tr('Orçamento'))} ${fmtKz(pr.orcamento)}</span><span class="chip">📅 ${esc(tr('até {0}').replace('{0}', new Date(c.ate).toLocaleDateString(provLoc())))}</span></div>
    <p class="m">🚘 ${esc(tr('Carro oficial e motorista pagos pelo Estado enquanto tiveres o cargo.'))}</p>`;
  if (gov) {
    h += `<div class="sub2" style="margin-top:6px">📜 ${esc(tr('Medida da província'))}</div>
      <p class="m">${pr.medida ? `${pr.medida.emoji} <b>${esc(tr(pr.medida.nome))}</b> — ${esc(tr(pr.medida.descricao))}` : esc(tr('Ainda não escolheste. Muda-se uma vez por semana e paga-se do orçamento.'))}</p>
      <div style="display:flex;gap:6px;margin:6px 0"><input class="inp" id="pmBusca" placeholder="🔎 ${esc(tr('Pesquisar medidas'))}" style="flex:1"><button class="btn sm ghost" id="pmBaralhar">🔀 ${esc(tr('Baralhar'))}</button></div>
      <div class="list" id="pmLista"></div>
      <div class="sub2">👥 ${esc(tr('A tua equipa'))}</div><div class="list">${['vice', 'saude', 'transportes'].map(k => {
        const q = (PROV.equipa || []).find(x => x.cargo === k);
        return `<div class="row"><span class="e">${k === 'vice' ? '🎖️' : k === 'saude' ? '🏥' : '🚌'}</span><div class="t"><b>${esc(tr(PROV_CARGOS[k]))}</b><small>${q ? `${esc(q.nome)} · ${fmtKz(q.salario)}/${esc(tr('dia'))}` : esc(tr('Vago'))}</small></div><button class="btn sm ghost" data-pnomear="${k}">${esc(tr(q ? 'Mudar' : 'Nomear'))}</button></div>`;
      }).join('')}</div>`;
  }
  h += `<div class="list" style="margin-top:8px"><div class="row"><span class="e">🤫</span><div class="t"><b>${esc(tr('Desviar do orçamento'))}</b><small>${esc(tr(gov ? 'Risco de ser apanhado/a: 15%. Apanhado/a = perdes TUDO, o cargo e nunca mais concorres.' : 'Risco de ser apanhado/a: 30%. Apanhado/a = perdes TUDO, o cargo e nunca mais concorres.'))}</small></div>
    <button class="btn sm red" data-pdesviar ${c.desviou_hoje ? 'disabled' : ''}>${esc(tr(c.desviou_hoje ? 'Amanhã' : 'Desviar'))}</button></div></div></div>`;
  return h;
}

async function ligarProv(body, depois) {
  const P = PROV; if (!P) return;
  // personagens de fato/vestido nos cartões
  let algum = false;
  for (const e of P.eleicoes || []) (e.candidatos || []).forEach((k, i) => { if (document.getElementById(`pc_${e.id}_${i}`)) { registarPreview(`pc_${e.id}_${i}`, apFormal(k.aparencia)); algum = true; } });
  if (algum && !previewAnim) animarPreview();
  body.querySelectorAll('[data-pvotar]').forEach(b => b.onclick = async () => {
    const [el, cand] = b.dataset.pvotar.split(':'); const e = P.eleicoes.find(x => String(x.id) === el);
    const nome = cand ? e.candidatos.find(k => k.id === cand).nome : e.npc.nome;
    if (!await perguntar(tr('Votar em {0}? Não dá para mudar.').replace('{0}', nome))) return;
    const disp = typeof idAparelho === 'function' ? idAparelho() : null;
    if (await acao('prov_votar', { p_eleicao: +el, p_candidato: cand || null, p_disp: disp })) { await carregarProv(true); depois(); }
  });
  body.querySelectorAll('[data-pcand]').forEach(b => b.onclick = () => pedirMensagemCampanha(b.dataset.pcand, depois));
  body.querySelectorAll('[data-pnomear]').forEach(b => b.onclick = () => pedirNomeacao(b.dataset.pnomear, depois));
  body.querySelector('[data-pdesviar]')?.addEventListener('click', () => {
    const pr = P.provincias.find(x => x.id === P.cargo.provincia), max = Math.floor(pr.orcamento * 0.1);
    pedirValor('🤫 ' + tr('Desviar do orçamento'), tr('Máximo {0} (10% do orçamento). Se te apanharem perdes tudo.').replace('{0}', fmtKz(max)), Math.min(max, 100000), async v => {
      const r = await acao('prov_desviar', { p_valor: v }); fecharSheetsTel();
      if (r?.apanhado) toast(tr('🚨 Apanhado/a! Perdeste tudo e o cargo.'), 'mau', 8000);
      await carregarProv(true); depois();
    });
  });
  if (P.cargo?.cargo === 'governador') await ligarMedidas(body, depois);
}

/* ---------- medidas: 6 de cada vez, baralhar e pesquisar ---------- */
async function ligarMedidas(body, depois) {
  if (!PROV_MEDIDAS) { const { data } = await sb.rpc('prov_medidas_lista'); PROV_MEDIDAS = data || []; }
  const lista = body.querySelector('#pmLista'), busca = body.querySelector('#pmBusca'); if (!lista) return;
  let ordem = [...PROV_MEDIDAS].sort(() => Math.random() - 0.5);
  const sem = s => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const mostrar = () => {
    const q = sem(busca.value.trim());
    const vis = (q ? ordem.filter(m => sem(m.nome + ' ' + m.descricao + ' ' + tr(m.nome) + ' ' + tr(m.descricao)).includes(q)) : ordem).slice(0, 6);
    lista.innerHTML = vis.length ? vis.map(m => `<div class="row"><span class="e">${m.emoji}</span><div class="t"><b>${esc(tr(m.nome))}</b><small>${esc(tr(m.descricao))}${m.custo ? ` · ${esc(tr('custa {0}/dia').replace('{0}', fmtKz(m.custo)))}` : ''}</small></div><button class="btn sm" data-pmed="${esc(m.id)}">${esc(tr('Escolher'))}</button></div>`).join('')
      : `<div class="empty">${esc(tr('Nenhuma medida com esse nome.'))}</div>`;
    lista.querySelectorAll('[data-pmed]').forEach(b => b.onclick = async () => {
      const m = PROV_MEDIDAS.find(x => x.id === b.dataset.pmed);
      if (!await perguntar(tr('Pôr em vigor «{0}»? Só podes mudar daqui a uma semana.').replace('{0}', tr(m.nome)))) return;
      if (await acao('prov_medida', { p_medida: m.id })) { await carregarProv(true); depois(); }
    });
  };
  busca.oninput = mostrar;
  body.querySelector('#pmBaralhar').onclick = () => { ordem = [...ordem.slice(6), ...ordem.slice(0, 6).sort(() => Math.random() - 0.5)]; busca.value = ''; mostrar(); };
  mostrar();
}

/* ---------- janelas: mensagem de campanha e nomeação ---------- */
function janelaProv(html, aoAbrir) {
  const v = document.createElement('div'); v.className = 'pergunta';
  v.innerHTML = `<div class="pergCaixa" style="max-width:360px">${html}</div>`;
  v.onclick = e => { if (e.target === v) v.remove(); };
  document.body.appendChild(v); aoAbrir(v);
}
function pedirMensagemCampanha(prov, depois) {
  janelaProv(`<p><b>✋ ${esc(tr('Candidatura a governador/a de {0}').replace('{0}', provNome(prov)))}</b></p>
    <p class="m">${esc(tr('Escreve a mensagem que todos os eleitores vão ver (10 a 200 letras). Custa {0}.').replace('{0}', fmtKz(50000)))}</p>
    <textarea class="inp" id="pcMsg" maxlength="200" rows="4" style="width:100%;box-sizing:border-box"></textarea><small class="m" id="pcN">0/200</small>
    <div class="pergBot"><button class="btn ghost" data-x>${esc(tr('Cancelar'))}</button><button class="btn" data-ok>${esc(tr('Candidatar'))}</button></div>`, v => {
    const t = v.querySelector('#pcMsg'); t.focus();
    t.oninput = () => { v.querySelector('#pcN').textContent = t.value.length + '/200'; };
    v.querySelector('[data-x]').onclick = () => v.remove();
    v.querySelector('[data-ok]').onclick = async () => {
      if (await acao('prov_candidatar', { p_provincia: prov, p_mensagem: t.value })) { v.remove(); await carregarProv(true); depois(); }
    };
  });
}
function pedirNomeacao(cargo, depois) {
  janelaProv(`<p><b>${esc(tr('Nomear'))}: ${esc(tr(PROV_CARGOS[cargo]))}</b></p>
    <p class="m">${esc(tr('Nome exato do jogador. Salário mínimo {0} por dia (podes dar mais). Deixa o nome vazio para deixar o cargo vago.').replace('{0}', fmtKz(150000)))}</p>
    <input class="inp" id="pnNome" placeholder="${esc(tr('Nome do jogador'))}" style="width:100%;box-sizing:border-box;margin-bottom:6px">
    <input class="inp" id="pnSal" type="number" min="150000" max="500000" step="10000" value="150000" style="width:100%;box-sizing:border-box">
    <div class="pergBot"><button class="btn ghost" data-x>${esc(tr('Cancelar'))}</button><button class="btn" data-ok>${esc(tr('Nomear'))}</button></div>`, v => {
    v.querySelector('[data-x]').onclick = () => v.remove();
    v.querySelector('[data-ok]').onclick = async () => {
      if (await acao('prov_nomear', { p_cargo: cargo, p_nome: v.querySelector('#pnNome').value, p_salario: +v.querySelector('#pnSal').value || 150000 })) { v.remove(); await carregarProv(true); depois(); }
    };
  });
}

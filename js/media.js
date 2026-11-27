/* ============================================================
   Vida na Banda — MEDIA
   💛 Mbilu (rede social: posts, fotos, gostos, comentários,
   seguidores, fãs, viral, receitas de influencer) e
   📰 Jornal de Maputo (as notícias do que os jogadores fazem).
   ============================================================ */
let muxAba = 'feed', meusGostos = new Set(), aSeguir = new Set();
const FOTOS = ['🌅', '🏖️', '🍗', '💃', '⚽', '🚐', '🎉', '😎', '🌴', '🏙️', '💍', '👶'];
const FOTO_COR = { '🌅': ['#ff9a5c', '#c4467a'], '🏖️': ['#5ec8e0', '#e9d39c'], '🍗': ['#f5b81c', '#c0392b'], '💃': ['#e86aa6', '#3b1f4a'], '⚽': ['#4f9a3c', '#1d5c2a'], '🚐': ['#3d7cc9', '#f5f1e8'], '🎉': ['#c08cff', '#ff7aa8'], '😎': ['#ffd56b', '#e08a1c'], '🌴': ['#7ed39a', '#16a3a3'], '🏙️': ['#5a7d94', '#2a3b55'], '💍': ['#f2ead8', '#c9962a'], '👶': ['#ffc07a', '#ff9ad5'], '✨': ['#ffe28a', '#c08cff'] };
const fmtN = n => n >= 1e6 ? (n / 1e6).toFixed(1).replace('.0', '') + 'M' : n >= 1e3 ? (n / 1e3).toFixed(1).replace('.0', '') + 'k' : String(n);
// os gostos do "público" vão chegando nas primeiras 2 horas
const gostosDe = p => p.gostos + Math.round(p.npc * Math.min(1, (Date.now() - new Date(p.criado_em)) / 7200e3));

async function renderMuxima(body) {
  const abas = [['feed', '🏠 Para ti'], ['seguir', '👥 A seguir'], ['eu', '🤳 Eu']];
  body.innerHTML = `<div class="abas">${abas.map(([k, n]) => `<button class="${muxAba === k ? 'on' : ''}" data-aba="${k}">${n}</button>`).join('')}</div><div id="muxC"><div class="empty">A carregar…</div></div>`;
  body.querySelectorAll('[data-aba]').forEach(b => b.onclick = () => { muxAba = b.dataset.aba; renderMuxima(body); });
  const c = body.querySelector('#muxC');
  const [g, s] = await Promise.all([sb.from('gostos').select('post_id').eq('jogador_id', uid), sb.from('seguir').select('alvo').eq('quem', uid)]);
  if (g.error) { c.innerHTML = '<div class="empty">Esta parte ainda está a ser instalada no servidor. Tenta mais tarde!</div>'; return; }
  if (J && J.handle_definido === false && !renderMuxima._pediu) { renderMuxima._pediu = true; setTimeout(() => mudarHandle(() => renderMuxima(body), true), 100); }
  meusGostos = new Set((g.data || []).map(x => x.post_id)); aSeguir = new Set((s.data || []).map(x => x.alvo));
  if (muxAba === 'eu') return renderMuxEu(c, body);
  let q = sb.from('mbilu_posts').select('*').order('criado_em', { ascending: false }).limit(40);
  if (muxAba === 'seguir') { if (!aSeguir.size) { c.innerHTML = compositorHTML() + '<div class="empty">Ainda não segues ninguém. No "Para ti", toca em <b>Seguir</b> nas pessoas de que gostas.</div>'; ligarCompositor(c, body); return; } q = q.in('autor', [...aSeguir]); }
  const { data } = await q;
  const posts = (data || []).filter(p => !bloqueados.has(p.autor));
  c.innerHTML = procurarHTML() + compositorHTML() + (posts.length ? posts.map(postHTML).join('') : '<div class="empty">Ainda não há posts. Sê o primeiro!</div>');
  ligarCompositor(c, body); ligarPosts(c, posts, body);
  ligarProcurar(c, x => `<button class="btn sm ${aSeguir.has(x.id) ? 'ghost' : ''}" data-seg-pq="${x.id}">${aSeguir.has(x.id) ? 'A seguir' : 'Seguir'}</button>`);
  c.addEventListener('procurou', () => c.querySelectorAll('[data-seg-pq]').forEach(b => b.onclick = async () => {
    const id = b.dataset.segPq, seguir = !aSeguir.has(id);
    const r = await sb.rpc('seguir_jogador', { p_alvo: id, p_sim: seguir });
    if (r.error) { toast(limparErro(r.error.message), 'mau'); return; }
    seguir ? aSeguir.add(id) : aSeguir.delete(id); b.textContent = seguir ? 'A seguir' : 'Seguir'; b.classList.toggle('ghost', seguir);
  }));
}

function compositorHTML() {
  return `<div class="compor"><textarea id="mTxt" maxlength="220" placeholder="${esc(tr(`O que se passa, ${J.nome}?`))}"></textarea>
    <div class="fotos"><button type="button" class="on" data-foto="">Sem foto</button>${FOTOS.map(f => `<button type="button" data-foto="${f}">${f}</button>`).join('')}</div>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px"><small class="m">📍 ${esc(bairro(J.bairro)?.nome || '')}</small><button class="btn sm" id="mPub">Publicar</button></div></div>`;
}
function ligarCompositor(c, body) {
  let foto = '';
  c.querySelectorAll('[data-foto]').forEach(b => b.onclick = () => { foto = b.dataset.foto; c.querySelectorAll('[data-foto]').forEach(x => x.classList.toggle('on', x === b)); });
  c.querySelector('#mPub').onclick = async () => {
    const t = c.querySelector('#mTxt').value.trim(); if (!t) return toast('Escreve alguma coisa.', 'mau');
    const b = c.querySelector('#mPub'); b.disabled = true;
    const r = await acao('publicar', { p_texto: t, p_foto: foto || null });
    b.disabled = false;
    if (r) { muxAba = 'feed'; renderMuxima(body); carregarObjetivos(); }
  };
}
function fotoHTML(p) {
  if (!p.foto) return '';
  const [a, z] = FOTO_COR[p.foto] || ['#666', '#333'];
  return `<div class="foto" style="background:linear-gradient(150deg,${a},${z})"><span>${p.foto}</span><small>📍 ${esc(bairro(p.bairro)?.nome || '')}</small></div>`;
}
function postHTML(p) {
  const meu = p.autor === uid, g = gostosDe(p);
  return `<div class="post" data-id="${p.id}">
    <div class="cab"><span class="av" data-perfil="${p.autor}" style="cursor:pointer">${esc((p.handle || p.nome)[0].toUpperCase())}</span><div><b data-perfil="${p.autor}" style="cursor:pointer" data-sem-traducao>@${esc(p.handle || p.nome)}</b>${p.viral ? ' <span class="viral">🔥 viral</span>' : ''}<small>${esc(bairro(p.bairro)?.nome || '')} · ${tempoRel(p.criado_em)}${p.patrocinado ? ' · Patrocinado' : ''}</small></div>
      ${meu ? '' : `<button class="seg ${aSeguir.has(p.autor) ? 'on' : ''}" data-seg="${p.autor}">${aSeguir.has(p.autor) ? 'A seguir' : 'Seguir'}</button>`}</div>
    ${fotoHTML(p)}
    <div class="txt" ${p.patrocinado ? '' : 'data-sem-traducao'}>${esc(p.texto)}</div>
    <div class="acoes"><button data-gosto="${p.id}" class="${meusGostos.has(p.id) ? 'on' : ''}">${meusGostos.has(p.id) ? '❤️' : '🤍'} ${fmtN(g)}</button><button data-com="${p.id}">💬 ${p.comentarios}</button>
      <span style="flex:1"></span>${meu || J.admin ? `<button data-apagar="${p.id}">🗑️</button>` : `<button data-den="${p.id}">⋯</button>`}</div></div>`;
}
function ligarPosts(c, posts, body) {
  c.querySelectorAll('[data-perfil]').forEach(b => b.onclick = () => { const p = posts.find(x => x.autor === b.dataset.perfil); if (p) abrirPerfilMbilu(p, () => renderMuxima(body)); });
  c.querySelectorAll('[data-gosto]').forEach(b => b.onclick = async () => {
    const id = +b.dataset.gosto, p = posts.find(x => x.id === id);
    const { data, error } = await sb.rpc('gostar', { p_post: id }); if (error) return toast(error.message, 'mau');
    if (data.gosto) { meusGostos.add(id); p.gostos++; } else { meusGostos.delete(id); p.gostos--; }
    b.classList.toggle('on', data.gosto); b.innerHTML = `${data.gosto ? '❤️' : '🤍'} ${fmtN(gostosDe(p))}`;
  });
  c.querySelectorAll('[data-seg]').forEach(b => b.onclick = async () => {
    const id = b.dataset.seg, sim = !aSeguir.has(id);
    const { data, error } = await sb.rpc('seguir_jogador', { p_alvo: id, p_sim: sim }); if (error) return toast(error.message, 'mau');
    sim ? aSeguir.add(id) : aSeguir.delete(id); toast(data.msg, 'info');
    c.querySelectorAll(`[data-seg="${id}"]`).forEach(x => { x.classList.toggle('on', sim); x.textContent = sim ? 'A seguir' : 'Seguir'; });
  });
  c.querySelectorAll('[data-com]').forEach(b => b.onclick = () => abrirComentarios(posts.find(x => x.id === +b.dataset.com), () => renderMuxima(body)));
  c.querySelectorAll('[data-apagar]').forEach(b => b.onclick = async () => {
    if (!await perguntar('Apagar este post?')) return;
    const { error } = await sb.rpc('apagar_post', { p_post: +b.dataset.apagar }); if (error) return toast(error.message, 'mau');
    renderMuxima(body);
  });
  c.querySelectorAll('[data-den]').forEach(b => b.onclick = async () => {
    const p = posts.find(x => x.id === +b.dataset.den);
    if (!await perguntar(`Denunciar este post de ${p.nome} aos administradores?`)) return;
    await acao('denunciar', { p_alvo: p.autor, p_motivo: 'outro', p_texto: 'Post no Mbilu de @' + (p.handle || p.nome) + ': ' + p.texto });
  });
}
// perfil no Mbilu: @handle (o da app) + nome original da conta
function abrirPerfilMbilu(p, depois) {
  const meu = p.autor === uid;
  const el = sheet(`<div style="text-align:center"><span class="av" style="width:56px;height:56px;font-size:26px;margin:0 auto">${esc((p.handle || p.nome)[0].toUpperCase())}</span>
    <h3 style="margin:6px 0 0" data-sem-traducao>@${esc(p.handle || p.nome)}</h3><p class="m" style="margin:2px 0 10px">Nome da conta: <b data-sem-traducao>${esc(p.nome)}</b></p></div>
    ${meu ? '<button class="btn full" id="pmMudar">✏️ Mudar o meu @</button>' : `<button class="btn full ${aSeguir.has(p.autor) ? 'ghost' : ''}" id="pmSeg">${aSeguir.has(p.autor) ? 'A seguir' : 'Seguir'}</button>`}`);
  el.querySelector('#pmMudar')?.addEventListener('click', () => { fecharSheets(); mudarHandle(depois); });
  const sg = el.querySelector('#pmSeg'); if (sg) sg.onclick = async () => {
    const sim = !aSeguir.has(p.autor), { data, error } = await sb.rpc('seguir_jogador', { p_alvo: p.autor, p_sim: sim }); if (error) return toast(limparErro(error.message), 'mau');
    sim ? aSeguir.add(p.autor) : aSeguir.delete(p.autor); toast(data.msg, 'info'); sg.textContent = sim ? 'A seguir' : 'Seguir'; sg.classList.toggle('ghost', sim); depois && depois();
  };
}
// escolher / mudar o @ (primeira vez grátis; depois 1 mudança de 14 em 14 dias)
function mudarHandle(depois, primeira) {
  const el = sheet(`<h3>✏️ ${primeira ? 'Escolhe o teu @ no Mbilu' : 'Mudar o meu @'}</h3>
    <p class="m">${primeira ? 'É o nome que aparece nos teus posts e comentários. Podes aceitar a sugestão ou escrever outro.' : 'O novo @ aparece logo em todos os teus posts antigos. Só o podes mudar outra vez daqui a 14 dias.'}</p>
    <div style="display:flex;align-items:center;gap:6px;margin:8px 0"><b>@</b><input class="inp" id="hdIn" maxlength="20" autocomplete="off" autocapitalize="none" value="${esc(J.handle || '')}" style="margin:0"></div>
    <small id="hdErro" style="display:block;color:#cc092f;min-height:18px"></small>
    <button class="btn full" id="hdOk">${primeira ? 'Guardar o meu @' : 'Mudar o @'}</button>`);
  const inp = el.querySelector('#hdIn'), err = el.querySelector('#hdErro'), ok = el.querySelector('#hdOk');
  const enviar = async () => {
    ok.disabled = true; err.textContent = '';
    const { data, error } = await sb.rpc('definir_handle', { p_handle: inp.value });
    ok.disabled = false;
    if (error) { err.textContent = limparErro(error.message); return; }
    J.handle = data.handle; J.handle_definido = true; if (!primeira) J.handle_mudado_em = new Date().toISOString();
    toast(data.msg, 'bom', 5000); fecharSheets(); depois && depois();
  };
  ok.onclick = enviar; inp.onkeydown = e => { if (e.key === 'Enter') enviar(); };
}
async function abrirComentarios(p, depois) {
  const { data } = await sb.from('mbilu_comentarios').select('*').eq('post_id', p.id).order('criado_em').limit(50);
  const lista = (data || []).filter(x => !bloqueados.has(x.autor));
  const el = sheet(`<h3>💬 Comentários</h3><p class="m">@${esc(p.handle || p.nome)}: "${esc(p.texto.slice(0, 80))}"</p>
    <div class="coms">${lista.length ? lista.map(x => `<div class="com"><b data-sem-traducao>@${esc(x.handle || x.nome)}</b> <span data-sem-traducao>${esc(x.texto)}</span><small>${tempoRel(x.criado_em)}</small></div>`).join('') : '<div class="empty">Sem comentários ainda.</div>'}</div>
    <div style="display:flex;gap:6px;margin-top:10px"><input class="inp" id="cTxt" maxlength="160" placeholder="Escreve um comentário…" style="margin:0"><button class="btn sm" id="cEnv">Enviar</button></div>`);
  el.querySelector('#cEnv').onclick = async () => {
    const t = el.querySelector('#cTxt').value.trim(); if (!t) return;
    const { error } = await sb.rpc('comentar', { p_post: p.id, p_texto: t }); if (error) return toast(limparErro(error.message), 'mau');
    p.comentarios++; abrirComentarios(p, depois); depois && depois();
  };
}

async function renderMuxEu(c, body) {
  const [{ data: posts }, { count: seg }] = await Promise.all([
    sb.from('mbilu_posts').select('*').eq('autor', uid).order('criado_em', { ascending: false }).limit(20),
    sb.from('seguir').select('quem', { count: 'exact', head: true }).eq('alvo', uid)]);
  const fas = J.fas || 0, hoje = hojeMaputo();
  const total = (posts || []).reduce((s, p) => s + gostosDe(p), 0);
  c.innerHTML = `<div class="rel" style="margin-top:0;text-align:center">
      <span class="av" style="width:56px;height:56px;font-size:26px;margin:0 auto">${esc(J.nome[0].toUpperCase())}</span>
      <h3 style="margin:6px 0 0" data-sem-traducao>@${esc(J.handle || J.nome)}</h3><small class="m">Nome da conta: ${esc(J.nome)}</small><div style="margin-top:6px"><button class="btn sm ghost" id="mudarHandle">✏️ Mudar @</button></div>
      <div class="stats"><div><b>${fmtN(fas)}</b><small>fãs</small></div><div><b>${seg || 0}</b><small>seguidores</small></div><div><b>${fmtN(total)}</b><small>gostos</small></div></div></div>
    <div class="sub2">💰 Ganhar com o Mbilu</div>
    <div class="list">
      <div class="row ${fas >= 200 ? '' : 'lock'}"><span class="e">💸</span><div class="t"><b>Receita diária</b><small>${fas >= 200 ? `3 MT por fã (${fmtMt(Math.min(200000, fas * 3))} hoje). Precisas de ter publicado nos últimos 2 dias.` : `A partir de 200 fãs (faltam ${200 - fas})`}</small></div><button class="btn sm" data-inf="receita" ${fas >= 200 && J.influencer_dia !== hoje ? '' : 'disabled'}>${J.influencer_dia === hoje ? 'Recebido' : 'Receber'}</button></div>
      <div class="row ${fas >= 1000 ? '' : 'lock'}"><span class="e">🤝</span><div class="t"><b>Post patrocinado</b><small>${fas >= 1000 ? `Uma marca paga-te ${fmtMt(2500)} (valor de demonstração) por um post (1 por dia).` : `A partir de 1.000 fãs (faltam ${fmtN(1000 - fas)})`}</small></div><button class="btn sm" data-inf="patrocinio" ${fas >= 1000 && J.patrocinio_dia !== hoje ? '' : 'disabled'}>${J.patrocinio_dia === hoje ? 'Feito' : 'Aceitar'}</button></div>
    </div>
    <p class="m" style="margin-top:8px">Ganhas fãs a publicar (com foto é melhor), quando gostam, comentam ou te seguem. De vez em quando um post fica viral 🔥.</p>
    <div class="sub2">Os meus posts</div>${(posts || []).length ? posts.map(postHTML).join('') : '<div class="empty">Ainda não publicaste nada.</div>'}`;
  c.querySelectorAll('[data-inf]').forEach(b => b.onclick = async () => { b.disabled = true; if (await acao('influencer', { p_tipo: b.dataset.inf })) { const { data } = await sb.rpc('estado'); if (data) setJogador(data.jogador); renderMuxima(body); } else b.disabled = false; });
  c.querySelector('#mudarHandle')?.addEventListener('click', () => mudarHandle(() => renderMuxima(body)));
  ligarPosts(c, posts || [], body);
}

/* ---------- 📰 Jornal de Maputo ---------- */
// LL3 · coroas da semana (segunda a domingo, hora de Maputo)
const COROAS = [
  ['rico', '👑', 'O/A mais rico/a', v => fmtMt(v)],
  ['popular', '⭐', 'O/A mais popular', v => `${fmtN(v)} gostos`],
  ['cozinheiro', '🍲', 'Melhor cozinheiro/a', v => `${fmtN(v)} pratos`],
  ['condutor', '🚗', 'Melhor condutor/a', v => `${fmtN(v)} viagens ao volante`],
  ['trabalhador', '🛠️', 'O/A mais trabalhador/a', v => `${fmtN(v)} turnos`],
  ['jetski', '🌊', 'Rei/Rainha do Jet Ski', v => `${fmtN(v)} pontos`],
  ['crew', '👥', 'Melhor crew', v => `${fmtN(v)} ações`]];
function coroasHTML(js) {
  if (!js) return '';
  const passadas = COROAS.map(([t, e, nome, fmt]) => { const c = (js.coroas || []).find(x => x.tipo === t); return c && { t, e, nome, fmt, c }; }).filter(Boolean);
  const cartoes = passadas.map(({ t, e, nome, fmt, c }, i) => `<div class="coroa-c ${c.id === uid ? 'eu' : ''}">
      ${t === 'crew' || !c.aparencia ? `<div class="sem-av">${e}</div>` : `<canvas id="cor${i}" width="160" height="200"></canvas>`}
      <small class="tit">${e} ${nome}</small><b>${esc(c.nome)}</b><small>${fmt(c.valor)}</small></div>`).join('');
  const agora = COROAS.map(([t, e, nome, fmt]) => { const l = (js.agora || {})[t] || []; return l.length ? `<div class="nota"><span>${e}</span><div><b>${nome}</b><small>${l.map((p, i) => `${i + 1}. ${esc(p.nome)} — ${t === 'rico' ? fmtMt(p.valor) : fmtN(p.valor)}`).join(' · ')}</small></div></div>` : ''; }).join('');
  return `<div class="sub2">👑 Coroas da semana passada</div>
    ${cartoes ? `<div class="coroas">${cartoes}</div>` : '<div class="empty">Ainda ninguém foi coroado/a. As coroas saem à segunda-feira.</div>'}
    <div class="sub2">🏁 Esta semana, até agora</div><p class="m">Fecha domingo à meia-noite. Quem ganhar leva a coroa e +5 de reputação.</p>
    ${agora || '<div class="empty">Ainda ninguém pontuou esta semana.</div>'}`;
}
function ligarCoroas(js) {
  let algum = false;
  COROAS.map(([t]) => (js?.coroas || []).find(x => x.tipo === t)).filter(Boolean).forEach((c, i) => {
    if (c.tipo !== 'crew' && c.aparencia) { registarPreview('cor' + i, apVisivel(c.aparencia, c.idade)); algum = true; }
  });
  if (algum && !previewAnim) animarPreview();
}
async function renderJornal(body) {
  const [f, v, cr] = await Promise.all([
    sb.from('fofocas').select('*').order('criado_em', { ascending: false }).limit(40),
    sb.from('mbilu_posts').select('*').eq('viral', true).order('criado_em', { ascending: false }).limit(3),
    sb.rpc('jornal_semana')]);
  const coroas = cr.error ? null : cr.data;
  const noticias = f.data || [];
  const capa = noticias[0];
  if (typeof ui2 === 'function' && ui2()) { jornalSec = null; return ui2Jornal(body, noticias, coroas, v.data || []); }   // 8 nov: redesenho (teste)
  const corpo = t => t.replace(/^\p{Extended_Pictographic}️?\s*/u, '');
  const emo = t => (t.match(/^\p{Extended_Pictographic}️?/u) || ['📰'])[0];
  body.innerHTML = `<div class="jornal">
    <div class="masthead">JORNAL DE LUANDA<small>${esc(dataTexto())} · Notícias dos bairros</small></div>
    ${capa ? `<div class="capa"><div class="e">${emo(capa.texto)}</div><h3>${esc(corpo(capa.texto))}</h3><small>${esc(bairro(capa.bairro)?.nome || 'Maputo')} · há ${tempoRel(capa.criado_em)}</small></div>` : '<div class="empty">Dia calmo em Maputo. Nada a reportar.</div>'}
    ${coroasHTML(coroas)}
    ${(v.data || []).length ? `<div class="sub2">🔥 Viral no Mbilu</div>${v.data.map(p => `<div class="row"><span class="e">${p.foto || '🔥'}</span><div class="t"><b>"${esc(p.texto.slice(0, 70))}"</b><small>@${esc(p.handle || p.nome)} · ${fmtN(gostosDe(p))} gostos</small></div></div>`).join('')}` : ''}
    <div class="sub2">Últimas</div>
    ${noticias.slice(1).map(n => `<div class="nota"><span>${emo(n.texto)}</span><div><b>${esc(corpo(n.texto))}</b><small>${esc(bairro(n.bairro)?.nome || 'Maputo')} · há ${tempoRel(n.criado_em)}</small></div></div>`).join('')}
  </div>`;
  ligarCoroas(coroas);
}

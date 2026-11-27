/* ============================================================
   Vida na Banda — MEDIA
   💛 Mbilu (rede social: posts, fotos, gostos, comentários,
   seguidores, fãs, viral, receitas de influencer) e
   📰 Jornal de Maputo (as notícias do que os jogadores fazem).
   ============================================================ */
let muxAba = 'feed', meusGostos = new Set(), aSeguir = new Set();
const FOTOS = ['🌅', '🏖️', '🍗', '💃', '⚽', '🚐', '🎉', '😎', '🌴', '🏙️', '💍', '👶'];
const FOTO_COR = { '🌅': ['#ff9a5c', '#c4467a'], '🏖️': ['#5ec8e0', '#e9d39c'], '🍗': ['#f5b81c', '#c0392b'], '💃': ['#e86aa6', '#3b1f4a'], '⚽': ['#4f9a3c', '#1d5c2a'], '🚐': ['#3d7cc9', '#f5f1e8'], '🎉': ['#c08cff', '#ff7aa8'], '😎': ['#ffd56b', '#e08a1c'], '🌴': ['#7ed39a', '#16a3a3'], '🏙️': ['#5a7d94', '#2a3b55'], '💍': ['#f2ead8', '#c9962a'], '👶': ['#ffc07a', '#ff9ad5'], '✨': ['#ffe28a', '#c08cff'] };
(function () { if (document.getElementById('mbStyle')) return; const st = document.createElement('style'); st.id = 'mbStyle';
  st.textContent = `.mbav{width:40px;height:40px;border-radius:50%;overflow:hidden;background:linear-gradient(140deg,#ff9ad5,#a03fd0);display:inline-flex;align-items:flex-end;justify-content:center;flex:none;color:#fff;font-weight:800;font-size:18px;align-items:center;cursor:pointer}
  .mbav img{width:100%;height:100%;object-fit:cover;object-position:50% 20%;background:#f6e3ee}.mbav.g{width:84px;height:84px;font-size:34px}
  .mbst{display:flex;gap:10px;overflow-x:auto;padding:4px 2px 10px;margin-bottom:6px}.mbst button{background:none;border:0;display:flex;flex-direction:column;align-items:center;gap:3px;font-size:11px;color:inherit;min-width:58px;cursor:pointer}
  .mbst .novo{width:54px;height:54px;border-radius:50%;border:2px dashed #a03fd0;display:grid;place-items:center;font-size:30px;font-weight:300;color:#a03fd0;line-height:1}.mbst .ring{padding:2px;border-radius:50%;background:linear-gradient(45deg,#f5b81c,#e0313f,#a03fd0)}.mbst .ring.eu{background:#bbb}.mbst .ring .mbav{border:2px solid var(--bg,#fff);width:50px;height:50px}
  .mbgrid{display:grid;grid-template-columns:repeat(3,1fr);gap:3px;margin-top:8px}.mbtile{aspect-ratio:1;border:0;border-radius:6px;display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:30px;color:#fff;padding:4px;cursor:pointer;overflow:hidden;position:relative}
  .mbtile small{font-size:10px;line-height:1.2;display:block;margin-top:2px;max-height:3.6em;overflow:hidden}.mbtile i{position:absolute;right:4px;bottom:2px;font-size:10px;font-style:normal}
  .mbpop{position:absolute;left:50%;top:40%;font-size:64px;transform:translate(-50%,-50%);pointer-events:none;animation:mbpop .8s ease-out forwards}@keyframes mbpop{0%{opacity:0;transform:translate(-50%,-50%) scale(.3)}30%{opacity:1;transform:translate(-50%,-50%) scale(1.2)}100%{opacity:0;transform:translate(-50%,-80%) scale(1)}}
  .mbstory{border-radius:18px;padding:22px 16px;min-height:280px;color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:10px}.mbstory .big{font-size:80px}.mbstory p{font-size:18px;font-weight:700;margin:0}`;
  document.head.appendChild(st); })();
const mbPerf = {};
async function carregarPerfisMbilu(ids) {
  const faltam = [...new Set(ids)].filter(i => i && !mbPerf[i]); if (!faltam.length || typeof ui2Perfis !== 'function') return;
  try { Object.assign(mbPerf, await ui2Perfis(faltam)); } catch { }
}
function rostoMb(autor, nome, handle, grande) {
  const pf = mbPerf[autor], ini = esc(((handle || nome || '?')[0] || '?').toUpperCase());
  const img = pf?.aparencia && typeof ui2Retrato === 'function' ? (() => { try { return `<img src="${ui2Retrato(pf)}" alt="" draggable="false">`; } catch { return ''; } })() : '';
  return `<span class="mbav${grande ? ' g' : ''}" data-perfil="${autor}">${img || ini}</span>`;
}
const fmtN = n => n >= 1e6 ? (n / 1e6).toFixed(1).replace('.0', '') + 'M' : n >= 1e3 ? (n / 1e3).toFixed(1).replace('.0', '') + 'k' : String(n);
// os gostos do "público" vão chegando nas primeiras 2 horas
const gostosDe = p => p.gostos + Math.round(p.npc * Math.min(1, (Date.now() - new Date(p.criado_em)) / 7200e3));

async function renderMuxima(body) {
  if (muxAba === 'seguir') muxAba = 'feed';
  const abas = [['feed', '🏠 Para ti'], ['explorar', '🔥 Explorar'], ['eu', '🤳 Eu']];
  body.innerHTML = `<div class="abas">${abas.map(([k, n]) => `<button class="${muxAba === k ? 'on' : ''}" data-aba="${k}">${n}</button>`).join('')}</div><div id="muxC"><div class="empty">A carregar…</div></div>`;
  body.querySelectorAll('[data-aba]').forEach(b => b.onclick = () => { muxAba = b.dataset.aba; renderMuxima(body); });
  const c = body.querySelector('#muxC');
  const [g, s] = await Promise.all([sb.from('gostos').select('post_id').eq('jogador_id', uid), sb.from('seguir').select('alvo').eq('quem', uid)]);
  if (g.error) { c.innerHTML = '<div class="empty">Esta parte ainda está a ser instalada no servidor. Tenta mais tarde!</div>'; return; }
  if (J && J.handle_definido === false && !renderMuxima._pediu) { renderMuxima._pediu = true; setTimeout(() => mudarHandle(() => renderMuxima(body), true), 100); }
  meusGostos = new Set((g.data || []).map(x => x.post_id)); aSeguir = new Set((s.data || []).map(x => x.alvo));
  if (muxAba === 'eu') return renderMuxEu(c, body);
  let q = sb.from('mbilu_posts').select('*').order('criado_em', { ascending: false }).limit(40);
  if (muxAba === 'feed') q = q.in('autor', [...aSeguir, uid]);   // só quem sigo e eu
  if (muxAba === 'explorar') q = sb.from('mbilu_posts').select('*').gte('criado_em', new Date(Date.now() - 7 * 864e5).toISOString()).order('gostos', { ascending: false }).limit(30);
  if (muxAba === 'seguir') { if (!aSeguir.size) { c.innerHTML = compositorHTML() + '<div class="empty">Ainda não segues ninguém. No "Para ti", toca em <b>Seguir</b> nas pessoas de que gostas.</div>'; ligarCompositor(c, body); return; } q = q.in('autor', [...aSeguir]); }
  const { data } = await q;
  const posts = (data || []).filter(p => !bloqueados.has(p.autor));
  const { data: sts } = await sb.from('mbilu_stories').select('*').order('criado_em', { ascending: false }).limit(150);
  const stories = (sts || []).filter(x => !bloqueados.has(x.autor));
  await carregarPerfisMbilu([...posts.map(p => p.autor), ...stories.map(x => x.autor)]);
  c.innerHTML = procurarHTML() + storiesHTML(stories) + (muxAba === 'explorar' ? '<p class="m" style="margin:0 0 8px">🔥 Os posts com mais gostos da semana.</p>' : compositorHTML()) + (posts.length ? posts.map(postHTML).join('') : (muxAba === 'feed' ? '<div class="empty">Ainda não há posts de quem segues. Publica o teu primeiro ou segue pessoas no <b>Explorar</b>.</div>' : '<div class="empty">Ainda não há posts. Sê o primeiro!</div>'));
  ligarCompositor(c, body); ligarPosts(c, posts, body); ligarStories(c, stories, body);
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
  let foto = ''; if (!c.querySelector('#mPub')) return;
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
    <div class="cab">${rostoMb(p.autor, p.nome, p.handle)}<div><b data-perfil="${p.autor}" style="cursor:pointer" data-sem-traducao>@${esc(p.handle || p.nome)}</b>${p.viral ? ' <span class="viral">🔥 viral</span>' : ''}<small>${esc(bairro(p.bairro)?.nome || '')} · ${tempoRel(p.criado_em)}${p.patrocinado ? ' · Patrocinado' : ''}</small></div>
      ${meu ? '' : `<button class="seg ${aSeguir.has(p.autor) ? 'on' : ''}" data-seg="${p.autor}">${aSeguir.has(p.autor) ? 'A seguir' : 'Seguir'}</button>`}</div>
    ${fotoHTML(p)}
    <div class="txt" ${p.patrocinado ? '' : 'data-sem-traducao'}>${esc(p.texto)}</div>
    <div class="acoes"><button data-gosto="${p.id}" class="${meusGostos.has(p.id) ? 'on' : ''}">${meusGostos.has(p.id) ? '❤️' : '🤍'} ${fmtN(g)}</button><button data-com="${p.id}">💬 ${p.comentarios}</button>
      <span style="flex:1"></span>${meu || J.admin ? `<button data-apagar="${p.id}">🗑️</button>` : `<button data-den="${p.id}">⋯</button>`}</div></div>`;
}
function ligarPosts(c, posts, body) {
  c.querySelectorAll('.post .foto, .post .txt').forEach(e => e.ondblclick = () => {
    const post = e.closest('.post'), g = post?.querySelector('[data-gosto]'); if (!g) return;
    post.style.position = 'relative'; const h = document.createElement('span'); h.className = 'mbpop'; h.textContent = '❤️'; post.appendChild(h); setTimeout(() => h.remove(), 850);
    if (!g.classList.contains('on')) g.click();
  });
  c.querySelectorAll('[data-perfil]').forEach(b => b.onclick = () => { const p = posts.find(x => x.autor === b.dataset.perfil); abrirPerfilMbilu(p || { autor: b.dataset.perfil }, () => renderMuxima(body)); });
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
// perfil no Mbilu: cara da personagem, @ + nome da conta, bio, números e os posts
async function abrirPerfilMbilu(p, depois) {
  const id = p.autor || p.id, meu = id === uid;
  const [{ data: pf, error }, { data: ps }] = await Promise.all([sb.rpc('mbilu_perfil', { p_id: id }), sb.from('mbilu_posts').select('*').eq('autor', id).order('criado_em', { ascending: false }).limit(30)]);
  if (error) return toast(limparErro(error.message), 'mau');
  mbPerf[id] = pf; const posts = ps || [], sigo = aSeguir.has(id) || pf.sigo;
  const tiles = posts.map((x, k) => { const [a, z] = FOTO_COR[x.foto] || ['#a03fd0', '#ff7aa8']; return `<button class="mbtile" data-t="${k}" style="background:linear-gradient(150deg,${a},${z})">${x.foto ? x.foto : ''}<small data-sem-traducao>${esc(x.texto.slice(0, 40))}</small><i>❤️ ${fmtN(gostosDe(x))}</i></button>`; }).join('');
  const el = sheet(`<div style="text-align:center">${rostoMb(id, pf.nome, pf.handle, true)}
    <h3 style="margin:6px 0 0" data-sem-traducao>@${esc(pf.handle || pf.nome)}</h3>
    <p class="m" style="margin:2px 0">Nome da conta: <b data-sem-traducao>${esc(pf.nome)}</b> · 📍 ${esc(bairro(pf.bairro)?.nome || '')}</p>
    ${pf.bio ? `<p data-sem-traducao style="margin:6px 0">${esc(pf.bio)}</p>` : (meu ? '<p class="m">Ainda sem bio.</p>' : '')}
    <div class="stats"><div><b>${pf.n_posts}</b><small>posts</small></div><div><b>${fmtN(pf.seguidores)}</b><small>seguidores</small></div><div><b>${pf.a_seguir}</b><small>a seguir</small></div><div><b>${fmtN(pf.fas)}</b><small>fãs</small></div></div>
    <div style="display:flex;gap:8px;margin-top:10px">${meu ? '<button class="btn sm" id="pmBio" style="flex:1">📝 Editar bio</button><button class="btn sm ghost" id="pmMudar" style="flex:1">✏️ Mudar @</button>' : `<button class="btn sm ${sigo ? 'ghost' : ''}" id="pmSeg" style="flex:1">${sigo ? 'A seguir' : 'Seguir'}</button><button class="btn sm ghost" id="pmVer" style="flex:1">🧑 Ver pessoa</button>`}</div></div>
    ${posts.length ? `<div class="mbgrid">${tiles}</div>` : '<div class="empty">Ainda sem posts.</div>'}`);
  el.querySelector('#pmMudar')?.addEventListener('click', () => { fecharSheets(); mudarHandle(depois); });
  el.querySelector('#pmBio')?.addEventListener('click', () => { fecharSheets(); editarBio(pf.bio, depois); });
  el.querySelector('#pmVer')?.addEventListener('click', () => { fecharSheets(); tocarPessoa({ id, nome: pf.nome, ap: pf.aparencia }); });
  el.querySelectorAll('[data-t]').forEach(b => b.onclick = () => abrirComentarios(posts[+b.dataset.t], () => { }));
  const sg = el.querySelector('#pmSeg'); if (sg) sg.onclick = async () => {
    const sim = !aSeguir.has(id), { data, error } = await sb.rpc('seguir_jogador', { p_alvo: id, p_sim: sim }); if (error) return toast(limparErro(error.message), 'mau');
    sim ? aSeguir.add(id) : aSeguir.delete(id); toast(data.msg, 'info'); sg.textContent = sim ? 'A seguir' : 'Seguir'; sg.classList.toggle('ghost', sim); depois && depois();
  };
}
function editarBio(atual, depois) {
  const el = sheet(`<h3>📝 A minha bio</h3><textarea class="inp" id="bioIn" maxlength="120" rows="3" placeholder="Fala de ti em poucas palavras…">${esc(atual || '')}</textarea><button class="btn full" id="bioOk" style="margin-top:8px">Guardar</button>`);
  el.querySelector('#bioOk').onclick = async () => { const nb = el.querySelector('#bioIn').value.trim().slice(0, 120); if (await acao('definir_bio', { p_bio: nb })) { J.bio = nb || null; fecharSheets(); depois && depois(); } };
}
// ✨ stories: 24 horas, círculos no topo
function storiesHTML(stories) {
  const grupos = []; for (const x of stories) { let g = grupos.find(y => y.autor === x.autor); if (!g) grupos.push(g = { autor: x.autor, handle: x.handle, nome: x.nome, itens: [] }); g.itens.push(x); }
  grupos.sort((a, b) => (a.autor === uid ? -1 : b.autor === uid ? 1 : 0)); window._mbGrupos = grupos;
  return `<div class="mbst"><button id="stNovo"><span class="novo">+</span>Criar story</button>${grupos.map((g, i) => `<button data-st="${i}"><span class="ring">${rostoMb(g.autor, g.nome, g.handle)}</span><span data-sem-traducao>${g.autor === uid ? 'O teu story' : '@' + esc((g.handle || g.nome).slice(0, 9))}</span></button>`).join('')}</div>`;
}
function ligarStories(c, stories, body) {
  c.querySelector('#stNovo')?.addEventListener('click', ev => { ev.stopPropagation(); novoStory(() => renderMuxima(body)); });
  c.querySelectorAll('[data-st]').forEach(b => b.onclick = ev => { ev.stopPropagation(); abrirStory(window._mbGrupos[+b.dataset.st], 0); });
  c.querySelectorAll('.mbst [data-perfil]').forEach(x => x.onclick = ev => ev.stopPropagation());
}
function abrirStory(g, k) {
  const x = g.itens[g.itens.length - 1 - k]; if (!x) return fecharSheets();
  const [a, z] = FOTO_COR[x.foto] || ['#a03fd0', '#ff7aa8'];
  const el = sheet(`<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">${rostoMb(g.autor, g.nome, g.handle)}<div><b data-sem-traducao>@${esc(g.handle || g.nome)}</b><br><small class="m">${tempoRel(x.criado_em)} · ${k + 1}/${g.itens.length}</small></div></div>
    <div class="mbstory" style="background:linear-gradient(150deg,${a},${z})"><div class="big">${x.foto || '✨'}</div><p data-sem-traducao>${esc(x.texto)}</p></div>
    <button class="btn full" id="stProx" style="margin-top:8px">${k + 1 < g.itens.length ? 'Seguinte ›' : 'Fechar'}</button>`);
  el.querySelector('#stProx').onclick = () => k + 1 < g.itens.length ? abrirStory(g, k + 1) : fecharSheets();
}
function novoStory(depois) {
  let foto = '';
  const el = sheet(`<h3>✨ Novo story</h3><p class="m">Fica visível 24 horas (máximo 5 por dia).</p>
    <textarea class="inp" id="stTxt" maxlength="100" rows="2" placeholder="O que se passa agora?"></textarea>
    <div class="fotos" style="margin:8px 0"><button type="button" class="on" data-sf="">Sem emoji</button>${FOTOS.map(f => `<button type="button" data-sf="${f}">${f}</button>`).join('')}</div>
    <button class="btn full" id="stOk">Publicar story</button>`);
  el.querySelectorAll('[data-sf]').forEach(b => b.onclick = () => { foto = b.dataset.sf; el.querySelectorAll('[data-sf]').forEach(x => x.classList.toggle('on', x === b)); });
  el.querySelector('#stOk').onclick = async () => { const t = el.querySelector('#stTxt').value.trim(); if (!t) return toast('Escreve alguma coisa.', 'mau'); if (await acao('story_publicar', { p_texto: t, p_foto: foto || null })) { fecharSheets(); depois && depois(); } };
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
  await carregarPerfisMbilu([uid]);
  const [{ data: posts }, { count: seg }] = await Promise.all([
    sb.from('mbilu_posts').select('*').eq('autor', uid).order('criado_em', { ascending: false }).limit(20),
    sb.from('seguir').select('quem', { count: 'exact', head: true }).eq('alvo', uid)]);
  const fas = J.fas || 0, hoje = hojeMaputo();
  const total = (posts || []).reduce((s, p) => s + gostosDe(p), 0);
  c.innerHTML = `<div class="rel" style="margin-top:0;text-align:center">
      ${rostoMb(uid, J.nome, J.handle, true)}
      <h3 style="margin:6px 0 0" data-sem-traducao>@${esc(J.handle || J.nome)}</h3><small class="m">Nome da conta: ${esc(J.nome)}</small>${J.bio ? `<p data-sem-traducao style="margin:6px 0">${esc(J.bio)}</p>` : ''}<div style="margin-top:6px;display:flex;gap:6px;justify-content:center"><button class="btn sm" id="verPerfil">👤 Ver perfil</button><button class="btn sm ghost" id="mudarHandle">✏️ Mudar @</button></div>
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
  c.querySelector('#verPerfil')?.addEventListener('click', () => abrirPerfilMbilu({ autor: uid }, () => renderMuxima(body)));
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
    <div class="masthead">JORNAL DE MAPUTO<small>${esc(dataTexto())} · Notícias dos bairros</small></div>
    ${capa ? `<div class="capa"><div class="e">${emo(capa.texto)}</div><h3>${esc(corpo(capa.texto))}</h3><small>${esc(bairro(capa.bairro)?.nome || 'Maputo')} · há ${tempoRel(capa.criado_em)}</small></div>` : '<div class="empty">Dia calmo em Maputo. Nada a reportar.</div>'}
    ${coroasHTML(coroas)}
    ${(v.data || []).length ? `<div class="sub2">🔥 Viral no Mbilu</div>${v.data.map(p => `<div class="row"><span class="e">${p.foto || '🔥'}</span><div class="t"><b>"${esc(p.texto.slice(0, 70))}"</b><small>@${esc(p.handle || p.nome)} · ${fmtN(gostosDe(p))} gostos</small></div></div>`).join('')}` : ''}
    <div class="sub2">Últimas</div>
    ${noticias.slice(1).map(n => `<div class="nota"><span>${emo(n.texto)}</span><div><b>${esc(corpo(n.texto))}</b><small>${esc(bairro(n.bairro)?.nome || 'Maputo')} · há ${tempoRel(n.criado_em)}</small></div></div>`).join('')}
  </div>`;
  ligarCoroas(coroas);
}

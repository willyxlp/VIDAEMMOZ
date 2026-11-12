/* ============================================================
   Vida na Banda — 📢 CANAL (FILA 0cl, 3 nov)
   Publicações da equipa: novidades, eventos, sorteios, avisos (e, mais tarde, patrocinadas).
   Os jogadores só leem; quem publica é um admin (Admin → 📢 Canal). O «não lido» fica neste aparelho.
   ============================================================ */
let canalPosts = [];
const canalVistoChave = () => 'vel_canal_visto_' + (typeof uid !== 'undefined' ? uid : '');
function canalNaoLidos() {
  let v = ''; try { v = localStorage.getItem(canalVistoChave()) || ''; } catch { }
  return canalPosts.filter(p => p.publicar_em > v).length;
}
async function carregarCanal() {
  const pb = typeof publico === 'function' ? await publico() : null;   // 9 nov: /api/publico (guardado 30 s na Vercel)
  const { data, error } = pb?.canal ? { data: pb.canal, error: null } : await sb.from('canal_posts').select('*').order('publicar_em', { ascending: false }).limit(30);
  if (!error) canalPosts = data || [];
  if (typeof atualizarPontoTel === 'function') atualizarPontoTel();
}
// o texto na língua do jogador (se a equipa o escreveu); senão o português, que o idioma.js tenta traduzir
function canalTexto(p) {
  const l = typeof lingua !== 'undefined' ? lingua : 'pt';
  const t = l === 'en' ? p.titulo_en : l === 'fr' ? p.titulo_fr : null, x = l === 'en' ? p.texto_en : l === 'fr' ? p.texto_fr : null;
  return { titulo: t || p.titulo, texto: x || p.texto, proprio: !!(t && x) || l === 'pt' };
}
async function renderCanal(body) {
  body.innerHTML = '<div class="empty">A carregar…</div>';
  await carregarCanal();
  try { if (canalPosts[0]) localStorage.setItem(canalVistoChave(), canalPosts[0].publicar_em); } catch { }
  if (typeof atualizarPontoTel === 'function') atualizarPontoTel();
  if (typeof ui2 === 'function' && ui2()) return ui2Canal(body);   // 8 nov: redesenho (teste)
  const appNome = id => (APPS.find(a => a.id === id) || {}).n;
  body.innerHTML = `<p class="m">${tr('Novidades, eventos e avisos da equipa do Vida na Banda.')}</p>` + (canalPosts.length ? `<div class="list">${canalPosts.map(p => {
    const c = canalTexto(p), st = c.proprio ? ' data-sem-traducao' : '';
    return `<div class="rel canalPost">${p.patrocinado ? `<small class="canalPat">${tr('Patrocinado')}${p.marca ? ` · <span data-sem-traducao>${esc(p.marca)}</span>` : ''}</small>` : ''}
      ${p.imagem ? `<img src="${esc(p.imagem)}" alt="" loading="lazy" style="width:100%;border-radius:10px;display:block;margin-bottom:8px">` : ''}
      <b style="display:block;font-size:16px"${st}>${esc(c.titulo)}</b>
      <p class="m" style="white-space:pre-line;margin:6px 0 0"${st}>${esc(c.texto)}</p>
      <small style="display:block;color:var(--dim);font-size:11.5px;margin-top:6px">${new Date(p.publicar_em).toLocaleDateString(typeof lingua !== 'undefined' && lingua === 'en' ? 'en-GB' : lingua === 'fr' ? 'fr-FR' : 'pt-PT', { day: 'numeric', month: 'short' })}</small>
      ${p.botao_app && appNome(p.botao_app) ? `<button class="btn sm" data-canal-app="${esc(p.botao_app)}" style="margin-top:8px">${tr('Abrir')} ${esc(tr(appNome(p.botao_app)))}</button>` : ''}</div>`; }).join('')}</div>`
    : `<div class="empty">${tr('Ainda não há publicações.')}</div>`);
  body.querySelectorAll('[data-canal-app]').forEach(b => b.onclick = () => abrirTelemovel(b.dataset.canalApp));
}

/* ---------- Admin → 📢 Canal ---------- */
async function admCanal(body) {
  const apps = APPS.filter(a => !a.admin && a.id !== 'canal');
  body.innerHTML = `${admTopo('📢 Canal')}<p class="m">Publica para todos os jogadores. O texto em português é obrigatório; em inglês e francês é opcional (sem eles, o jogo tenta traduzir).</p>
    <form id="fCanal">
      <label>Título (PT)</label><input class="inp" id="cTit" maxlength="120" required>
      <label>Texto (PT)</label><textarea class="inp" id="cTxt" maxlength="2000" rows="4" required></textarea>
      <details style="margin-top:8px"><summary class="m">🇬🇧 Inglês e 🇫🇷 francês (opcional)</summary>
        <label>Title (EN)</label><input class="inp" id="cTitEn" maxlength="120"><label>Text (EN)</label><textarea class="inp" id="cTxtEn" maxlength="2000" rows="3"></textarea>
        <label>Titre (FR)</label><input class="inp" id="cTitFr" maxlength="120"><label>Texte (FR)</label><textarea class="inp" id="cTxtFr" maxlength="2000" rows="3"></textarea></details>
      <label>Imagem (opcional, até 2 MB)</label><input class="inp" id="cImg" type="file" accept="image/png,image/jpeg,image/webp">
      <label>Botão que abre uma app (opcional)</label><select class="inp" id="cApp"><option value="">— sem botão —</option>${apps.map(a => `<option value="${a.id}">${a.e} ${esc(a.n)}</option>`).join('')}</select>
      <label class="maior"><input type="checkbox" id="cPat"> Patrocinado (de uma marca)</label><input class="inp" id="cMarca" maxlength="60" placeholder="Nome da marca">
      <label>Publicar em (vazio = agora)</label><input class="inp" id="cQuando" type="datetime-local">
      <button class="btn full" type="submit" style="margin-top:10px">Publicar</button></form>
    <div class="sub2">Publicações</div><div id="cLista"><div class="empty">A carregar…</div></div>`;
  const f = body.querySelector('#fCanal'), v = id => body.querySelector(id).value.trim();
  f.onsubmit = async ev => {
    ev.preventDefault();
    const btn = f.querySelector('button[type=submit]'); btn.disabled = true;
    try {
      let imagem = null; const fich = body.querySelector('#cImg').files[0];
      if (fich) {
        if (fich.size > 2 * 1024 * 1024) { toast('A imagem tem mais de 2 MB.', 'mau'); return; }
        const nome = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${(fich.type.split('/')[1] || 'jpg').replace('jpeg', 'jpg')}`;
        const { error: eu } = await sb.storage.from('canal').upload(nome, fich, { contentType: fich.type, upsert: false });
        if (eu) { toast(limparErro(eu.message), 'mau'); return; }
        imagem = sb.storage.from('canal').getPublicUrl(nome).data.publicUrl;
      }
      const q = v('#cQuando');
      const p = { titulo: v('#cTit'), texto: v('#cTxt'), titulo_en: v('#cTitEn'), texto_en: v('#cTxtEn'), titulo_fr: v('#cTitFr'), texto_fr: v('#cTxtFr'),
        imagem, botao_app: v('#cApp'), patrocinado: body.querySelector('#cPat').checked, marca: v('#cMarca'), publicar_em: q ? new Date(q).toISOString() : '' };
      if (await acao('admin_canal_publicar', { p })) admIr('canal');
    } finally { btn.disabled = false; }
  };
  const { data, error } = await sb.rpc('admin_canal_lista');
  const l = body.querySelector('#cLista'); if (error) return admErro(l, error);
  l.innerHTML = data.length ? `<div class="list">${data.map(p => `<div class="row" style="flex-wrap:wrap"><div class="t"><b data-sem-traducao>${esc(p.titulo)}</b>
      <small>${new Date(p.publicar_em) > new Date() ? '⏰ ' + tr('agendada para') + ' ' : ''}<span data-sem-traducao>${new Date(p.publicar_em).toLocaleString('pt-PT', { dateStyle: 'short', timeStyle: 'short' })}</span>${p.patrocinado ? ' · ' + tr('Patrocinado') : ''}${p.titulo_en ? ' · EN' : ''}${p.titulo_fr ? ' · FR' : ''}</small></div>
      <button class="btn sm ghost" data-apagar="${p.id}">Apagar</button></div>`).join('')}</div>` : '<div class="empty">Ainda não há publicações.</div>';
  l.querySelectorAll('[data-apagar]').forEach(b => b.onclick = async () => { if (await perguntar('Apagar esta publicação?')) { if (await acao('admin_canal_apagar', { p_id: +b.dataset.apagar })) admIr('canal'); } });
}

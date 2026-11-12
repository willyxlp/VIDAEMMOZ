/* ============================================================
   Vida na Banda — SALAS por bairro (FILA 0ez-2, dono 8 nov 19:38/19:43)
   «put people in different servers with smart matching … see their friends but also meet new people» · 75 por sala ·
   sala visível e «Juntar-me» no Social · chat por sala. O servidor escolhe (escolher_sala): amigos/par/família/grupo/DMs,
   mesma região (fuso) e língua, mesmas horas de jogo, salas com vida e um pouco de acaso. A sala 1 usa os nomes antigos.
   ============================================================ */
let salaAtual = 1, salaAtiva = false, salaAmigo = null;
const salaCanal = b => 'b-' + b + (salaAtual > 1 ? '-s' + salaAtual : '');
const salaChat = b => 'bairro:' + b + (salaAtual > 1 ? ':' + salaAtual : '');
// 9 nov: salas privadas (nº ≥ 1000) — quem cria e os seus amigos; só nelas há voz
const nomeSala = n => n >= 1000 ? tr('Sala privada') : tr('Sala {0}').replace('{0}', n);
async function criarSalaPrivada() {
  if (cena?.tipo !== 'bairro') { toast(tr('Sai à rua para começar uma sala privada.'), 'info'); return; }
  const { data, error } = await sb.rpc('criar_sala_privada');
  if (error) { toast(typeof limparErro === 'function' ? limparErro(error.message) : error.message, 'mau'); return; }
  fecharTelemovel?.(); await mudarSala({ sala: data.sala });
}
async function escolherSala(extra = {}) {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || null, lg = (navigator.language || '').slice(0, 5) || null;
    const { data, error } = await sb.rpc('escolher_sala', { p_fuso: tz, p_lingua: lg, p_amigo: extra.amigo || salaAmigo || null, p_sala: extra.sala || null });
    salaAmigo = null;
    if (error) { if (extra.sala || extra.amigo) toast(typeof limparErro === 'function' ? limparErro(error.message) : error.message, 'mau'); return extra.sala || extra.amigo ? null : (salaAtual = 1); }
    salaAtiva = !!data?.ativo; salaAtual = data?.sala || 1;
    return salaAtual;
  } catch { salaAtiva = false; return salaAtual = 1; }
}
// trocar de sala sem sair do bairro
async function mudarSala(extra) {
  if (cena?.tipo !== 'bairro') return;
  const antes = salaAtual, s = await escolherSala(extra);
  if (!s) return;
  if (s === antes && canal) { toast(tr('Já estás nessa sala.'), 'info'); return; }
  try { if (canal) rtRemover(canal); } catch { }   // 9 nov: tempo real próprio
  canal = null; outros.clear();
  entrarNoCanal(salaCanal(J.bairro));
  await ligarChat(J.bairro);
  hud(); fecharSheets();
  toast(s >= 1000 ? tr('Estás numa sala privada. Os teus amigos juntam-se a ti pelo Social. Liga a 🎤 Voz para falarem.') : tr('Estás na sala {0}.').replace('{0}', s), 'bom', s >= 1000 ? 6000 : 3000);
}
// lista das salas do bairro
async function abrirSalas() {
  const { data, error } = await sb.rpc('salas_bairro');
  if (error || !data) return;
  const el = sheet(`<h3>${esc(tr('Salas de {0}').replace('{0}', bairro(J.bairro)?.nome || ''))}</h3>
    <p class="m">${esc(tr('Cada sala tem até {0} pessoas. Escolhemos a tua pelos teus amigos, pela tua zona e pelas horas a que jogas — mas podes trocar.').replace('{0}', data.tamanho || 75))}</p>
    <div class="list">${(data.salas || []).map(s => `<div class="row ${s.sala === salaAtual ? 'mine' : ''}"><span class="e">🏘️</span>
      <div class="t"><b>${esc(tr('Sala {0}').replace('{0}', s.sala))}</b><small>${esc(tr('{0} pessoas').replace('{0}', s.n))}${s.amigos ? ' · ' + esc(tr(s.amigos === 1 ? '1 amigo/a' : '{0} amigos').replace('{0}', s.amigos)) : ''}</small></div>
      ${s.sala === salaAtual ? `<span class="price">${esc(tr('Estás aqui'))}</span>` : `<button class="btn sm" data-sala="${s.sala}" ${s.n >= (data.tamanho || 75) ? 'disabled' : ''}>${esc(tr(s.n >= (data.tamanho || 75) ? 'Cheia' : 'Entrar na sala'))}</button>`}</div>`).join('')}
      ${(data.privadas || []).map(s => `<div class="row ${s.sala === salaAtual ? 'mine' : ''}"><span class="e">🔒</span>
      <div class="t"><b>${esc(s.minha ? tr('A tua sala privada') : tr('Sala privada de {0}').replace('{0}', s.dono))}</b><small>${esc(tr('{0} pessoas').replace('{0}', s.n))} · ${esc(tr('com voz'))}</small></div>
      ${s.sala === salaAtual ? `<span class="price">${esc(tr('Estás aqui'))}</span>` : `<button class="btn sm" data-sala="${s.sala}">${esc(tr('Entrar na sala'))}</button>`}</div>`).join('')}</div>
    <button class="btn full ghost" data-privada style="margin-top:10px">＋ ${esc(tr('Começar uma sala privada'))}</button>
    <small style="display:block;color:var(--dim);font-size:12px;margin-top:6px">${esc(tr('Só tu e os teus amigos. Na sala privada podem falar por voz quando estão perto um do outro.'))}</small>`);
  el.querySelector('[data-privada]')?.addEventListener('click', criarSalaPrivada);
  el.querySelectorAll('[data-sala]').forEach(b => b.onclick = () => mudarSala({ sala: +b.dataset.sala }));
}
// no Social: amigos online, onde estão e «Juntar-me»
async function salasSocial(body) {
  const { data } = await sb.rpc('amigos_salas'); if (!data?.length || !body.isConnected) return;
  const caixa = document.createElement('div'); caixa.className = 'salas-amigos';
  caixa.innerHTML = `<div class="sub2" style="margin-top:0">${esc(tr('Amigos online agora'))}</div><div class="list">${data.map(f => {
    const aqui = f.bairro === J.bairro, mesma = aqui && f.sala === salaAtual && cena?.tipo === 'bairro';
    return `<div class="row"><span class="e">🟢</span><div class="t"><b data-sem-traducao>${esc(f.nome)}</b><small>${esc(bairro(f.bairro)?.nome || f.bairro)} · ${esc((f.sala >= 1000 ? tr('Sala privada') : tr('Sala {0}')).replace('{0}', f.sala))}</small></div>
      ${mesma ? `<span class="price">${esc(tr('Na tua sala'))}</span>` : `<button class="btn sm" data-juntar="${f.id}" data-b="${esc(f.bairro)}" data-n="${esc(f.nome)}">${esc(tr(aqui ? 'Juntar-me' : 'Ir ter com'))}</button>`}</div>`; }).join('')}</div>`;
  caixa.insertAdjacentHTML('beforeend', `<button class="btn sm ghost" data-privada style="margin-top:8px">＋ ${esc(tr('Começar uma sala privada'))}</button>`);
  caixa.querySelector('[data-privada]').onclick = criarSalaPrivada;
  body.prepend(caixa);
  caixa.querySelectorAll('[data-juntar]').forEach(b => b.onclick = () => {
    if (b.dataset.b === J.bairro && cena?.tipo === 'bairro') { fecharTelemovel?.(); return mudarSala({ amigo: b.dataset.juntar }); }
    salaAmigo = b.dataset.juntar;
    toast(b.dataset.b === J.bairro ? tr('Sai à rua: vais ficar na sala de {0}.').replace('{0}', b.dataset.n)
      : tr('Vai a {0} (paragem de candongueiros). Quando chegares, ficas na sala de {1}.').replace('{0}', bairro(b.dataset.b)?.nome || b.dataset.b).replace('{1}', b.dataset.n), 'info', 6000);
  });
}
// de minuto a minuto na rua: mantém o lugar e aprende as horas a que jogas
// 8 nov (0fe-1): o lugar na sala é mantido pelo pulso de minuto a minuto
// tocar no «📍 bairro · Sala N» do topo abre a lista
document.addEventListener('click', e => { if (salaAtiva && e.target.closest?.('#hLoc') && cena?.tipo === 'bairro') abrirSalas(); });

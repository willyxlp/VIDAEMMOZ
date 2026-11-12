/* ============================================================
   Vida na Banda — ESCOLHAS
   Problemas do dia a dia (luz, água, doença, cheias, gasolina)
   chegam como uma decisão com várias opções.
   ============================================================ */
let dilema = null, dilemaVisto = null;

async function carregarDilemas() {
  const pd = typeof pre === 'function' ? pre('dilema') : null;   // 9 nov: vem no arranque()
  const { data, error } = pd ? { data: pd.v ? [pd.v] : [], error: null } : await sb.from('dilemas').select('*').eq('estado', 'novo').order('criado_em').limit(1);
  if (error) return;
  dilema = data?.[0] || null;
  atualizarPillDilema();
  if (dilema && dilemaVisto !== dilema.id && !painelAberto()) mostrarDilema();
}
// 8 nov (0fe-1): o pulso avisa quando há um dilema novo (era de 2 em 2 min; também chega logo pelo aviso)

function atualizarPillDilema() {
  let b = document.getElementById('bDilema');
  if (!dilema) { b?.remove(); return; }
  if (!b) {
    b = document.createElement('button'); b.id = 'bDilema'; b.className = 'pill-dilema';
    b.onclick = () => mostrarDilema();
    document.body.appendChild(b);
  }
  b.textContent = `❗ ${dilema.titulo.replace(/!$/, '')} · decidir`;
}

function mostrarDilema() {
  if (!dilema) return;
  dilemaVisto = dilema.id;
  const d = dilema;
  const el = sheet(`<div class="dilema"><h3>${esc(d.titulo)}</h3><p class="m">${esc(d.texto)}</p>
    <div class="list">${d.opcoes.map(o => `<button class="row opcao" data-op="${esc(o.id)}" style="text-align:left"><div class="t"><b>${esc(o.t)}</b><small>${esc(o.d || '')}</small>${o.p != null ? `<small class="hip ${o.p >= 60 ? 'boa' : o.p >= 35 ? 'meia' : 'ma'}">🎲 <span>${o.p}% de hipótese</span></small>` : ''}</div><span class="price">›</span></button>`).join('')}</div>
    <p class="m" style="margin-top:10px;font-size:12px">Se não decidires em 2 horas, a vida decide por ti.</p></div>`);
  el.querySelectorAll('[data-op]').forEach(b => b.onclick = async () => {
    el.querySelectorAll('[data-op]').forEach(x => x.disabled = true);
    const r = await acao('decidir', { p_id: d.id, p_opcao: b.dataset.op });
    if (r) { dilema = null; atualizarPillDilema(); fecharSheets(); document.querySelectorAll('.tel-modal').forEach(x => x.remove()); carregarObjetivos(); }
    else el.querySelectorAll('[data-op]').forEach(x => x.disabled = false);
  });
}

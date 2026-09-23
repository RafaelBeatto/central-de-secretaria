/* =========================================================
   HISTÓRICO — tudo o que foi feito no sistema, por dia
   Lê a coleção 'historico' (gravada por registrarHistorico em
   01-core.js). Cada linha abre o registro de origem, se ele ainda
   existir. Nomes de módulo antigos ('solicitacoes', 'eventos'…,
   gravados pelo Kanban) são tratados como os atuais.
   ========================================================= */
const HI_MODULOS = {
  secretaria:   { rotulo:'Secretaria',  apelidos:['solicitacoes'] },
  agenda:       { rotulo:'Agenda',      apelidos:['eventos'] },
  documento:    { rotulo:'Documentos',  apelidos:['documentos'] },
  projeto:      { rotulo:'Projetos',    apelidos:['projetos'] },
  empresa:      { rotulo:'Empresas',    apelidos:[] },
  atendimentos: { rotulo:'Atendimentos',apelidos:[] },
  'gerador-documentos': { rotulo:'Gerador', apelidos:[] },
  sistema:      { rotulo:'Sistema',     apelidos:[] }
};
const HI_POR_PAGINA = 150;
let hiEstado = { busca:'', modulo:'', acao:'', periodo:'30', dia:'', limite:HI_POR_PAGINA };
const hiEsc = s => escapeHTML(s ?? '');

function hiModulo(m){
  if (HI_MODULOS[m]) return m;
  return Object.keys(HI_MODULOS).find(k => HI_MODULOS[k].apelidos.includes(m)) || m;
}
/* Data local (não UTC): uma ação às 22h em Brasília continua no mesmo dia. */
function hiDia(ts){ return isoFromDate(new Date(ts)); }
function hiHora(ts){ const d = new Date(ts); return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`; }
function hiTituloDia(iso){
  const d = daysDiffFromToday(iso);
  if (d === 0) return 'Hoje';
  if (d === -1) return 'Ontem';
  const txt = parseISODate(iso).toLocaleDateString('pt-BR', { weekday:'long', day:'numeric', month:'long', year: iso.slice(0,4) === todayISO().slice(0,4) ? undefined : 'numeric' });
  return txt.charAt(0).toUpperCase() + txt.slice(1);
}

/* Onde abrir o registro de uma linha — null se ele não existe mais. */
function hiDestino(h){
  const id = h.refId; if (!id) return null;
  const tenta = (col, fn) => DB.getById(col, id) ? () => fn(id) : null;
  switch (hiModulo(h.modulo)) {
    case 'secretaria': return tenta('solicitacoes', abrirDetalheSolicitacao);
    case 'agenda': return tenta('eventos', abrirDetalheEvento);
    case 'documento': return tenta('documentos', abrirDetalheDocumento);
    case 'projeto': return tenta('projetos', i => abrirDetalheProjeto(i));
    case 'empresa': return typeof getEmpresaGlobal === 'function' && getEmpresaGlobal(id) ? () => abrirFichaEmpresaGlobal(id) : null;
    case 'atendimentos': return tenta('atendimentos', abrirAtendimento) || tenta('atendimento-alunos', abrirHistoricoAluno) || tenta('atendimento-profissionais', abrirFichaProfissional);
    case 'gerador-documentos': return tenta('gerador-documentos', i => abrirDocumentoGerado(i));
  }
  return null;
}

function hiFiltrar(lista){
  const hoje = todayISO();
  const desde = hiEstado.periodo === 'tudo' || hiEstado.periodo === 'dia' ? '' : atendAddDias(hoje, -(Number(hiEstado.periodo) - 1));
  const q = normalizarFiltro(hiEstado.busca);
  return lista.filter(h => {
    const dia = hiDia(h.timestamp);
    if (hiEstado.periodo === 'dia' && hiEstado.dia && dia !== hiEstado.dia) return false;
    if (desde && dia < desde) return false;
    if (hiEstado.acao && h.acao !== hiEstado.acao) return false;
    if (q && !normalizarFiltro(h.descricao).includes(q)) return false;
    return true;
  });
}

function hiLinhaHTML(h, idx){
  const mod = hiModulo(h.modulo);
  const abre = !!hiDestino(h);
  return `<li class="hi-linha m-${hiEsc(mod)}">
    <time>${hiHora(h.timestamp)}</time>
    <span class="hi-modulo">${hiEsc(HI_MODULOS[mod]?.rotulo || h.modulo)}</span>
    ${abre
      ? `<button type="button" class="hi-texto" data-hi="abrir" data-idx="${idx}"><span>${hiEsc(h.descricao)}</span><i aria-hidden="true">→</i></button>`
      : `<span class="hi-texto is-estatico"><span>${hiEsc(h.descricao)}</span></span>`}
    <span class="hi-acao a-${hiEsc(String(h.acao).replace(/\s+/g,'-'))}">${hiEsc(h.acao)}</span>
  </li>`;
}

let hiVisiveis = [];
function renderHistorico(){
  const root = document.getElementById('hiRoot'); if (!root) return;
  const todos = DB.getAll('historico').slice().sort((a,b) => b.timestamp - a.timestamp);
  const noPeriodo = hiFiltrar(todos);
  const contagem = {};
  noPeriodo.forEach(h => { const m = hiModulo(h.modulo); contagem[m] = (contagem[m]||0) + 1; });
  const filtrados = hiEstado.modulo ? noPeriodo.filter(h => hiModulo(h.modulo) === hiEstado.modulo) : noPeriodo;
  hiVisiveis = filtrados.slice(0, hiEstado.limite);
  const acoes = [...new Set(todos.map(h => h.acao).filter(Boolean))].sort((a,b) => a.localeCompare(b,'pt-BR'));

  const porDia = {};
  filtrados.forEach(h => { const d = hiDia(h.timestamp); porDia[d] = (porDia[d]||0) + 1; });
  const grupos = [];
  hiVisiveis.forEach((h, i) => {
    const dia = hiDia(h.timestamp);
    if (!grupos.length || grupos[grupos.length-1].dia !== dia) grupos.push({ dia, itens:[] });
    grupos[grupos.length-1].itens.push(hiLinhaHTML(h, i));
  });

  const chip = (valor, rotulo, n) => `<button type="button" class="hi-chip ${hiEstado.modulo===valor?'is-ativo':''}" data-hi="modulo" data-valor="${hiEsc(valor)}" aria-pressed="${hiEstado.modulo===valor}">${hiEsc(rotulo)}<span>${n}</span></button>`;
  const focoBusca = document.activeElement?.id === 'hiBusca';
  const filtrando = hiEstado.busca || hiEstado.modulo || hiEstado.acao || hiEstado.periodo !== '30';

  root.innerHTML = `
    <div class="hi-filtros">
      <input type="search" class="input" id="hiBusca" placeholder="Buscar nas ações… (ex.: nome de aluno, documento, tarefa)" value="${hiEsc(hiEstado.busca)}" aria-label="Buscar no histórico">
      <select class="input" id="hiPeriodo" aria-label="Período">
        ${[['1','Hoje'],['7','Últimos 7 dias'],['30','Últimos 30 dias'],['tudo','Tudo'],['dia','Um dia específico…']].map(([v,t]) => `<option value="${v}" ${hiEstado.periodo===v?'selected':''}>${t}</option>`).join('')}
      </select>
      ${hiEstado.periodo === 'dia' ? `<input type="date" class="input" id="hiDia" value="${hiEsc(hiEstado.dia)}" max="${todayISO()}" aria-label="Dia">` : ''}
      <select class="input" id="hiAcao" aria-label="Tipo de ação"><option value="">Todas as ações</option>${acoes.map(a => `<option value="${hiEsc(a)}" ${hiEstado.acao===a?'selected':''}>${hiEsc(a.charAt(0).toUpperCase()+a.slice(1))}</option>`).join('')}</select>
      ${filtrando ? '<button type="button" class="btn btn-sm" data-hi="limpar">Limpar filtros</button>' : ''}
      <button type="button" class="btn btn-sm hi-apagar" data-hi="apagar">🗑 Limpar histórico…</button>
    </div>
    <div class="hi-chips" role="group" aria-label="Módulo">
      ${chip('', 'Tudo', noPeriodo.length)}
      ${Object.keys(HI_MODULOS).filter(m => contagem[m]).map(m => chip(m, HI_MODULOS[m].rotulo, contagem[m])).join('')}
    </div>
    ${grupos.length ? grupos.map(g => `<section class="hi-dia"><h3>${hiEsc(hiTituloDia(g.dia))}<span>${porDia[g.dia]}</span></h3><ul>${g.itens.join('')}</ul></section>`).join('')
      : `<div class="hi-vazio">${todos.length ? 'Nenhuma ação com esses filtros.' + (hiEstado.periodo !== 'tudo' ? ' <button type="button" class="btn btn-sm" data-hi="tudo">Ver todo o período</button>' : '') : 'Nada registrado ainda. Cada vez que algo é criado, alterado, concluído ou excluído, aparece aqui.'}</div>`}
    ${filtrados.length > hiVisiveis.length ? `<button type="button" class="btn hi-mais" data-hi="mais">Mostrar mais (${filtrados.length - hiVisiveis.length} restantes)</button>` : ''}
    ${todos.length >= 1000 ? '<p class="hi-nota">O histórico guarda as 1.000 ações mais recentes; as mais antigas vão saindo.</p>' : ''}`;
  if (focoBusca) { const b = document.getElementById('hiBusca'); b.focus(); b.setSelectionRange(b.value.length, b.value.length); }
}

/* Apaga ações do histórico: tudo ou só as mais antigas que um prazo.
   Deixa uma linha registrando a limpeza, para ficar claro depois por que
   o histórico começa ali. */
function abrirLimparHistorico(){
  const total = DB.getAll('historico').length;
  const opcoes = [['tudo','Tudo'],['30','Mais antigas que 30 dias'],['90','Mais antigas que 90 dias'],['365','Mais antigas que 1 ano']];
  const alvo = v => {
    if (v === 'tudo') return DB.getAll('historico');
    const limite = atendAddDias(todayISO(), -Number(v));
    return DB.getAll('historico').filter(h => hiDia(h.timestamp) < limite);
  };
  openModal('Limpar histórico', `<form id="formLimparHist">
    <div class="field"><label for="hiApagarQuais">O que apagar</label>
      <select id="hiApagarQuais" class="input">${opcoes.map(([v,t]) => `<option value="${v}">${t}</option>`).join('')}</select></div>
    <p class="hi-apagar-conta" id="hiApagarConta"></p>
    <p class="muted">Isso não apaga tarefas, documentos nem atendimentos — só o registro do que foi feito. Some também do histórico dentro de cada tarefa, documento e empresa, e do número "tarefas concluídas" do Dashboard. Não dá para desfazer.</p>
    <div class="modal-actions">
      <button type="button" class="btn btn-ghost" id="hiApagarBackup">⭳ Baixar backup antes</button>
      <button type="button" class="btn btn-ghost" id="hiApagarCancelar">Cancelar</button>
      <button class="btn at-perigo" id="hiApagarOk">Apagar</button>
    </div></form>`);
  const sel = document.getElementById('hiApagarQuais');
  const atualizar = () => {
    const n = alvo(sel.value).length;
    document.getElementById('hiApagarConta').textContent = n ? `${n} de ${total} ação(ões) serão apagadas.` : 'Nenhuma ação nesse período.';
    document.getElementById('hiApagarOk').disabled = !n;
    document.getElementById('hiApagarOk').textContent = n ? `Apagar ${n}` : 'Apagar';
  };
  sel.onchange = atualizar; atualizar();
  document.getElementById('hiApagarCancelar').onclick = closeModal;
  document.getElementById('hiApagarBackup').onclick = () => exportarBackupCompleto();
  document.getElementById('formLimparHist').onsubmit = e => {
    e.preventDefault();
    const remover = new Set(alvo(sel.value).map(h => h.id));
    if (!remover.size) return;
    DB.saveAll('historico', DB.getAll('historico').filter(h => !remover.has(h.id)));
    const texto = sel.value === 'tudo' ? 'todo o histórico' : opcoes.find(o => o[0] === sel.value)[1].toLowerCase();
    registrarHistorico({ modulo:'sistema', acao:'limpeza', descricao:`Histórico limpo: ${remover.size} ação(ões) apagadas (${texto}).` });
    closeModal();
    hiEstado.limite = HI_POR_PAGINA;
    renderHistorico();
    showToast(`✓ ${remover.size} ação(ões) apagadas do histórico.`);
  };
}

(function ligarHistorico(){
  const root = document.getElementById('hiRoot'); if (!root) return;
  const reiniciar = () => { hiEstado.limite = HI_POR_PAGINA; renderHistorico(); };
  root.addEventListener('click', e => {
    const b = e.target.closest('[data-hi]'); if (!b || !root.contains(b)) return;
    const a = b.dataset.hi;
    if (a === 'abrir') hiDestino(hiVisiveis[Number(b.dataset.idx)])?.();
    else if (a === 'modulo') { hiEstado.modulo = b.dataset.valor; reiniciar(); }
    else if (a === 'apagar') abrirLimparHistorico();
    else if (a === 'mais') { hiEstado.limite += HI_POR_PAGINA; renderHistorico(); }
    else if (a === 'tudo') { hiEstado.periodo = 'tudo'; reiniciar(); }
    else if (a === 'limpar') { hiEstado = { ...hiEstado, busca:'', modulo:'', acao:'', periodo:'30', dia:'' }; reiniciar(); }
  });
  root.addEventListener('input', e => { if (e.target.id === 'hiBusca') { hiEstado.busca = e.target.value; reiniciar(); } });
  root.addEventListener('change', e => {
    const t = e.target;
    if (t.id === 'hiPeriodo') { hiEstado.periodo = t.value; if (t.value === 'dia' && !hiEstado.dia) hiEstado.dia = todayISO(); }
    else if (t.id === 'hiDia') hiEstado.dia = t.value;
    else if (t.id === 'hiAcao') hiEstado.acao = t.value;
    else return;
    reiniciar();
  });
})();

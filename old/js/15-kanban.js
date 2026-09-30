/* =========================================================
   KANBAN — as tarefas e as execuções de projeto em colunas por situação
   As colunas são as situações que existem de verdade (as mesmas da
   Secretaria e de Projetos), então mover um cartão faz exatamente o que
   mudar a situação na tela de origem faria: concluir tarefa usa
   concluirAtividade (rotinas voltam no próximo ciclo), reabrir limpa a
   data de conclusão, tudo vai para o Histórico.
   Os quadros personalizados da versão antiga ('kanban-quadros') não são
   mais usados — a coleção fica guardada e continua no backup.
   ========================================================= */
const KB_QUADROS = {
  tarefas:  { rotulo:'Tarefas',  colunas:['Pendente','Em andamento','Aguardando','Concluída'] },
  projetos: { rotulo:'Execuções de projeto', colunas:['Planejamento','Em execução','Suspenso','Concluído'] }
};
const KB_DIAS_CONCLUIDAS = 14;
let kbEstado = { quadro:'tarefas', busca:'', responsavel:'', verConcluidas:false, menu:null };
const kbEsc = s => escapeHTML(s ?? '');

/* ---------- cartões ---------- */
function kbTarefas(){
  const limite = atendAddDias(todayISO(), -KB_DIAS_CONCLUIDAS);
  return DB.getAll('solicitacoes')
    .filter(s => !ehTarefaRenovacaoDocumento(s) && s.status !== 'Cancelada')
    .filter(s => s.status !== 'Concluída' || kbEstado.verConcluidas || (s.dataConclusao || '') >= limite)
    .map(s => {
      const pz = prazoAtividade(s), sub = Array.isArray(s.subtarefas) ? s.subtarefas : [];
      return { id:s.id, coluna: KB_QUADROS.tarefas.colunas.includes(s.status) ? s.status : 'Pendente', titulo:s.titulo,
        responsavel:s.responsavel || '', prioridade:s.prioridade === 'Normal' ? 'Média' : (s.prioridade || 'Média'),
        prazo: pz.data, prazoTexto: s.status === 'Concluída' ? (s.dataConclusao ? `concluída em ${formatDateBR(s.dataConclusao).slice(0,5)}` : 'concluída') : pz.texto,
        prazoTom: s.status === 'Concluída' ? 'ok' : pz.tom, recorrente: tarefaRecorrente(s),
        sub: sub.length ? `${sub.filter(x => x.feito).length}/${sub.length}` : '' };
    });
}
function kbProjetos(){
  return DB.getAll('projetos')
    .filter(p => p.tipo !== 'recurso' && !p.arquivado && p.status !== 'Cancelado')
    .map(p => {
      const pai = p.paiId ? DB.getById('projetos', p.paiId) : null;
      const pd = projectData({ ...p });
      const faltam = projectChecklist(pd).filter(i => !i[1]).length;
      const fin = p.tipo === 'execucao' ? execucaoFinanceiro(p) : null;
      return { id:p.id, coluna:p.status || 'Planejamento', titulo:p.nome, responsavel:p.responsavel || '',
        sub: pai ? pai.nome : 'projeto antigo', faltam, pct: fin ? fin.pct : projectProgress(pd),
        prazo: p.dataFim || null, prazoTexto: p.dataFim ? `até ${formatDateBR(p.dataFim)}` : '', prazoTom: p.dataFim && daysDiffFromToday(p.dataFim) < 0 && p.status !== 'Concluído' ? 'danger' : 'neutral' };
    });
}
function kbFiltrar(cards){
  const q = normalizarFiltro(kbEstado.busca);
  return cards.filter(c => (!q || normalizarFiltro(`${c.titulo} ${c.responsavel} ${c.sub || ''}`).includes(q))
    && (!kbEstado.responsavel || c.responsavel === kbEstado.responsavel));
}
function kbOrdenar(a, b){
  return (a.prazo || '9999').localeCompare(b.prazo || '9999') || (prioridadePeso(b.prioridade) - prioridadePeso(a.prioridade)) || a.titulo.localeCompare(b.titulo, 'pt-BR');
}

/* ---------- mover ---------- */
function kbMover(id, destino){
  if (kbEstado.quadro === 'tarefas') {
    const s = DB.getById('solicitacoes', id); if (!s || s.status === destino) return;
    if (destino === 'Concluída') return concluirAtividade(id); // rotina: registra o ciclo e volta com a próxima data
    const eraConcluida = s.status === 'Concluída';
    DB.update('solicitacoes', id, { status: destino, dataConclusao: null, atualizadoEm: Date.now() });
    registrarHistorico({ modulo:'secretaria', acao: eraConcluida ? 'reabertura' : 'edição', descricao:`Situação de "${s.titulo}" alterada para ${destino}.`, refId:id });
    showToast(`✓ ${destino}`);
    return renderKanban();
  }
  const p = DB.getById('projetos', id); if (!p || p.status === destino) return;
  const aplicar = () => {
    DB.update('projetos', id, { status: destino });
    registrarHistorico({ modulo:'projeto', acao:'edição', descricao:`Situação de "${p.nome}" alterada para ${destino}.`, refId:id });
    showToast(`✓ ${destino}`);
    renderKanban();
  };
  const faltam = destino === 'Concluído' ? projectChecklist(projectData({ ...p })).filter(i => !i[1]) : [];
  if (faltam.length) confirmAction(`"${p.nome}" ainda tem ${faltam.length} etapa(s) pendente(s): ${faltam.map(i => i[0]).join(', ')}. Marcar como concluído mesmo assim?`, aplicar);
  else aplicar();
}

/* ---------- desenho ---------- */
function kbCartaoHTML(c, colunas){
  const menuAberto = kbEstado.menu === c.id;
  const meta = kbEstado.quadro === 'tarefas'
    ? [c.prazoTexto && `<span class="kb-prazo tom-${c.prazoTom}">${kbEsc(c.prazoTexto)}</span>`,
       ['Alta','Urgente'].includes(c.prioridade) && `<span class="kb-prio p-${c.prioridade === 'Urgente' ? 'urgente' : 'alta'}">${c.prioridade}</span>`,
       c.recorrente && '<span title="Tarefa que se repete">↻</span>', c.sub && `<span title="Subtarefas">☑ ${c.sub}</span>`]
    : [c.prazoTexto && `<span class="kb-prazo tom-${c.prazoTom}">${kbEsc(c.prazoTexto)}</span>`,
       c.faltam ? `<span class="kb-prio p-alta" title="Etapas do checklist que faltam">${c.faltam} etapa${c.faltam===1?'':'s'}</span>` : '<span class="kb-ok">✓ checklist</span>'];
  return `<article class="kb-cartao" draggable="true" data-kb-card="${kbEsc(c.id)}">
    <button type="button" class="kb-cartao-corpo" data-kb="abrir" data-id="${kbEsc(c.id)}">
      <strong>${kbEsc(c.titulo || 'Sem título')}</strong>
      ${kbEstado.quadro === 'projetos' ? `<small>${kbEsc(c.sub)}</small><span class="db-medidor" title="${c.pct}%"><i style="width:${c.pct}%"></i></span>` : ''}
      <span class="kb-meta">${meta.filter(Boolean).join('')}</span>
      ${c.responsavel ? `<span class="kb-resp" title="${kbEsc(c.responsavel)}">${kbEsc(c.responsavel)}</span>` : ''}
    </button>
    <button type="button" class="kb-mover" data-kb="menu" data-id="${kbEsc(c.id)}" aria-label="Mover ${kbEsc(c.titulo)}" aria-expanded="${menuAberto}">⋮</button>
    ${menuAberto ? `<div class="kb-menu" role="menu"><span>Mover para</span>${colunas.filter(col => col !== c.coluna).map(col => `<button type="button" role="menuitem" data-kb="mover" data-id="${kbEsc(c.id)}" data-coluna="${kbEsc(col)}">${kbEsc(col)}</button>`).join('')}</div>` : ''}
  </article>`;
}

function renderKanban(){
  const root = document.getElementById('kbRoot'); if (!root) return;
  const def = KB_QUADROS[kbEstado.quadro];
  const todos = kbEstado.quadro === 'tarefas' ? kbTarefas() : kbProjetos();
  const cards = kbFiltrar(todos);
  // Situações antigas fora da lista (ex.: projeto "Em andamento") ganham
  // uma coluna própria para nada sumir do quadro.
  const extras = [...new Set(cards.map(c => c.coluna).filter(c => !def.colunas.includes(c)))];
  const colunas = [...def.colunas, ...extras];
  const responsaveis = [...new Set(todos.map(c => c.responsavel).filter(Boolean))].sort((a,b) => a.localeCompare(b,'pt-BR'));
  const focoBusca = document.activeElement?.id === 'kbBusca';
  const aba = (v) => `<button type="button" class="ge-aba ${kbEstado.quadro===v?'is-ativa':''}" data-kb="quadro" data-valor="${v}" aria-pressed="${kbEstado.quadro===v}">${KB_QUADROS[v].rotulo}</button>`;
  root.innerHTML = `
    <div class="kb-barra">
      <div class="ge-abas">${aba('tarefas')}${aba('projetos')}</div>
      <input type="search" class="input" id="kbBusca" placeholder="Buscar…" value="${kbEsc(kbEstado.busca)}" aria-label="Buscar no quadro">
      ${responsaveis.length ? `<select class="input" id="kbResp" aria-label="Responsável"><option value="">Todos os responsáveis</option>${responsaveis.map(r => `<option ${r===kbEstado.responsavel?'selected':''}>${kbEsc(r)}</option>`).join('')}</select>` : ''}
    </div>
    <div class="kb-colunas" style="--kb-n:${colunas.length}">
      ${colunas.map(col => {
        const lista = cards.filter(c => c.coluna === col).sort(kbOrdenar);
        const extra = !def.colunas.includes(col);
        const concluida = col === 'Concluída';
        return `<section class="kb-coluna ${extra?'is-extra':''}" data-kb-coluna="${kbEsc(col)}" ${extra ? '' : 'data-kb-alvo="1"'}>
          <header><h3>${kbEsc(col)}</h3><span>${lista.length}</span></header>
          ${concluida ? `<p class="kb-nota">${kbEstado.verConcluidas ? 'Todas as concluídas.' : `Últimos ${KB_DIAS_CONCLUIDAS} dias.`} <button type="button" class="at-link" data-kb="ver-concluidas">${kbEstado.verConcluidas ? 'Só as recentes' : 'Ver todas'}</button></p>` : ''}
          ${extra ? '<p class="kb-nota">Situação antiga. Mova os cartões para uma das colunas ao lado.</p>' : ''}
          <div class="kb-cartoes">${lista.map(c => kbCartaoHTML(c, def.colunas)).join('') || '<p class="kb-vazio">—</p>'}</div>
          ${kbEstado.quadro === 'tarefas' && !concluida && !extra ? `<form class="kb-add" data-kb-add="${kbEsc(col)}"><input type="text" class="input" placeholder="＋ Nova tarefa" aria-label="Nova tarefa em ${kbEsc(col)}"></form>` : ''}
        </section>`;
      }).join('')}
    </div>`;
  if (focoBusca) { const b = document.getElementById('kbBusca'); b.focus(); b.setSelectionRange(b.value.length, b.value.length); }
}

function kbNovaTarefa(titulo, status){
  const novo = { id:DB.nextId('SOL','solicitacao'), titulo, tipo:'Tarefa', prioridade:'Média', descricao:'', responsavel:kbEstado.responsavel || '', categoria:'', prazo:'', horario:'',
    status, recorrencia:null, anexos:[], criadoEm:Date.now(), atualizadoEm:Date.now() };
  DB.insert('solicitacoes', novo);
  registrarHistorico({ modulo:'secretaria', acao:'criação', descricao:`Tarefa "${titulo}" criada.`, refId:novo.id });
  renderKanban();
  document.querySelector(`[data-kb-add="${CSS.escape(status)}"] input`)?.focus();
}

/* ---------- eventos ---------- */
(function ligarKanban(){
  const root = document.getElementById('kbRoot'); if (!root) return;
  root.addEventListener('click', e => {
    const b = e.target.closest('[data-kb]');
    if (!b) { if (kbEstado.menu && !e.target.closest('.kb-menu')) { kbEstado.menu = null; renderKanban(); } return; }
    const a = b.dataset.kb;
    if (a === 'quadro') { kbEstado = { ...kbEstado, quadro:b.dataset.valor, responsavel:'', menu:null }; renderKanban(); }
    else if (a === 'abrir') { kbEstado.menu = null; kbEstado.quadro === 'tarefas' ? abrirDetalheSolicitacao(b.dataset.id) : abrirDetalheProjeto(b.dataset.id); }
    else if (a === 'menu') { kbEstado.menu = kbEstado.menu === b.dataset.id ? null : b.dataset.id; renderKanban(); root.querySelector('.kb-menu button')?.focus(); }
    else if (a === 'mover') { kbEstado.menu = null; kbMover(b.dataset.id, b.dataset.coluna); }
    else if (a === 'ver-concluidas') { kbEstado.verConcluidas = !kbEstado.verConcluidas; renderKanban(); }
  });
  root.addEventListener('keydown', e => { if (e.key === 'Escape' && kbEstado.menu) { const id = kbEstado.menu; kbEstado.menu = null; renderKanban(); root.querySelector(`[data-kb="menu"][data-id="${CSS.escape(id)}"]`)?.focus(); } });
  root.addEventListener('input', e => { if (e.target.id === 'kbBusca') { kbEstado.busca = e.target.value; renderKanban(); } });
  root.addEventListener('change', e => { if (e.target.id === 'kbResp') { kbEstado.responsavel = e.target.value; renderKanban(); } });
  root.addEventListener('submit', e => {
    const f = e.target.closest('[data-kb-add]'); if (!f) return;
    e.preventDefault();
    const titulo = f.querySelector('input').value.trim();
    if (titulo) kbNovaTarefa(titulo, f.dataset.kbAdd);
  });
  // arrastar e soltar (no celular e pelo teclado, o botão ⋮ faz o mesmo)
  root.addEventListener('dragstart', e => {
    const card = e.target.closest('[data-kb-card]'); if (!card) return;
    e.dataTransfer.setData('text/plain', card.dataset.kbCard); e.dataTransfer.effectAllowed = 'move';
    card.classList.add('is-arrastando');
  });
  root.addEventListener('dragend', e => { e.target.closest?.('[data-kb-card]')?.classList.remove('is-arrastando'); root.querySelectorAll('.is-alvo').forEach(c => c.classList.remove('is-alvo')); });
  root.addEventListener('dragover', e => {
    const col = e.target.closest('[data-kb-alvo]'); if (!col) return;
    e.preventDefault();
    root.querySelectorAll('.is-alvo').forEach(c => c !== col && c.classList.remove('is-alvo'));
    col.classList.add('is-alvo');
  });
  root.addEventListener('drop', e => {
    const col = e.target.closest('[data-kb-alvo]'); if (!col) return;
    e.preventDefault(); col.classList.remove('is-alvo');
    const id = e.dataTransfer.getData('text/plain');
    if (id) kbMover(id, col.dataset.kbColuna);
  });
})();

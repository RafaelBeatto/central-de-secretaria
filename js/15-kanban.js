/* ---------------------------------------------------------
   15. KANBAN - SISTEMA DE QUADROS
   --------------------------------------------------------- */

function initKanban(){
  if (!DB.getAll('kanban-quadros')) {
    DB.saveAll('kanban-quadros', []);
  }
  // Remove quadros que apontavam para os módulos Processos/Protocolos,
  // descontinuados — o quadro ficaria vazio e sem tipo válido.
  const quadros = DB.getAll('kanban-quadros') || [];
  const validos = quadros.filter(q => !['processos','protocolos'].includes(q?.tipo));
  if (validos.length !== quadros.length) DB.saveAll('kanban-quadros', validos);
}

function getQuadros(){
  return DB.getAll('kanban-quadros') || [];
}

function salvarQuadro(quadro){
  let quadros = getQuadros();
  const idx = quadros.findIndex(q => q.id === quadro.id);
  if (idx >= 0) {
    quadros[idx] = quadro;
  } else {
    quadro.id = 'quad-' + Date.now();
    quadro.criadoEm = new Date().toISOString();
    quadros.push(quadro);
  }
  DB.saveAll('kanban-quadros', quadros);
  return quadro;
}

function deletarQuadro(id){
  let quadros = getQuadros();
  quadros = quadros.filter(q => q.id !== id);
  DB.saveAll('kanban-quadros', quadros);
}

function getQuadro(id){
  return getQuadros().find(q => q.id === id);
}

/* RENDERIZAR LISTA DE QUADROS */
function renderKanban(){
  const container = document.getElementById('listaQuadros');
  const quadros = getQuadros();

  container.innerHTML = `
    <div class="kanban-header">
      <div>
        <h2>Meus Quadros Kanban</h2>
        <p class="muted">${quadros.length} quadro${quadros.length !== 1 ? 's' : ''}</p>
      </div>
      <button class="btn btn-primary" onclick="abrirModalNovoQuadro()">+ Criar novo quadro</button>
    </div>

    <div class="quadros-grid">
      ${quadros.length === 0 ?
        `<div class="empty-state" style="grid-column: 1/-1;">
          Nenhum quadro criado ainda. <br>
          <button class="btn btn-primary" onclick="abrirModalNovoQuadro()" style="margin-top: 12px;">Criar primeiro quadro</button>
        </div>` :
        quadros.map(q => renderCardQuadro(q)).join('')
      }
    </div>`;
}

function renderCardQuadro(quadro){
  const dados = obterDadosQuadro(quadro);
  const totalCards = Object.values(dados.porStatus).reduce((a, b) => a + b, 0);

  return `
    <div class="quadro-card">
      <div class="quadro-card-header">
        <div>
          <h3>${escapeHTML(quadro.nome)}</h3>
          <p class="muted">${quadro.tipo} · ${totalCards} item${totalCards !== 1 ? 's' : ''}</p>
        </div>
        <div class="quadro-menu">
          <button class="icon-btn" onclick="abrirMenuQuadro(event, '${quadro.id}')">⋯</button>
        </div>
      </div>

      <div class="quadro-stats">
        ${Object.entries(dados.porStatus).map(([col, count]) =>
          `<div class="stat-col"><span class="stat-label">${col}</span><span class="stat-num">${count}</span></div>`
        ).join('')}
      </div>

      <div class="quadro-card-footer">
        <small class="muted">Modificado ${formatDateBR(quadro.ultimoAcesso || quadro.criadoEm)}</small>
        <button class="btn btn-primary" onclick="abrirQuadro('${quadro.id}')">Abrir</button>
      </div>
    </div>`;
}

function abrirMenuQuadro(e, id){
  e.stopPropagation();
  const menu = document.createElement('div');
  menu.className = 'context-menu';
  menu.innerHTML = `
    <button onclick="abrirModalNovoQuadro('${id}')">✏️ Editar</button>
    <button onclick="if(confirm('Deletar este quadro?')) { deletarQuadro('${id}'); renderKanban(); showToast('Quadro deletado'); }">🗑️ Deletar</button>`;
  menu.style.position = 'absolute';
  menu.style.right = '0';
  menu.style.top = '40px';
  document.body.appendChild(menu);
  document.addEventListener('click', () => menu.remove(), { once: true });
}

function abrirQuadro(id){
  renderQuadroKanban(id);
}

/* MODAL: CRIAR/EDITAR QUADRO */
function abrirModalNovoQuadro(id = null){
  const backdrop = document.getElementById('modalBackdrop');
  const modal = document.getElementById('modal');
  const body = document.getElementById('modalBody');

  const quadro = id ? getQuadro(id) : null;
  const isEdit = !!id;

  const tiposDisponibles = [
    { val: 'solicitacoes', label: '📋 Solicitações (Tarefas)' },
    { val: 'projetos', label: '📁 Projetos/Demandas' },
    { val: 'agenda', label: '📅 Eventos da Agenda' }
  ];

  const colunasDefault = {
    solicitacoes: ['Pendente', 'Em andamento', 'Concluída', 'Cancelada'],
    projetos: ['Planejamento', 'Em execução', 'Testes', 'Concluído'],
    agenda: ['Planejado', 'Confirmado', 'Realizado', 'Cancelado']
  };

  // Preserva o que já foi digitado quando o modal é redesenhado
  // (adicionar/remover coluna). Só reinicia ao abrir um modal diferente.
  if (window.kbModalId !== id || !Array.isArray(window.kbColunasTemp)) {
    window.kbModalId = id;
    window.kbTipoTemp = quadro?.tipo || 'solicitacoes';
    window.kbNomeTemp = quadro?.nome || '';
    window.kbCompartilhadoTemp = !!quadro?.compartilhado;
    window.kbColunasTemp = [...(quadro?.colunas || colunasDefault[window.kbTipoTemp])];
  }

  const tipo = window.kbTipoTemp;
  const colunas = window.kbColunasTemp;

  body.innerHTML = `
    <label>Nome do quadro:</label>
    <input type="text" id="kbNome" class="input" value="${escapeHTML(window.kbNomeTemp || '')}" placeholder="Ex: Meu Kanban" oninput="window.kbNomeTemp = this.value">

    <label>Tipo de dados:</label>
    <select id="kbTipo" class="input" onchange="kbMudarTipo(this.value)">
      ${tiposDisponibles.map(t => `<option value="${t.val}" ${tipo === t.val ? 'selected' : ''}>${t.label}</option>`).join('')}
    </select>

    <label>Colunas do quadro:</label>
    <div id="kbColunas" style="display: flex; flex-direction: column; gap: 8px;">
      ${colunas.map((col, i) => `
        <div style="display: flex; gap: 8px;">
          <input type="text" class="input" style="flex: 1;" value="${escapeHTML(col)}" oninput="window.kbColunasTemp[${i}] = this.value">
          <button class="btn btn-ghost" onclick="kbRemoverColuna(${i})">✕</button>
        </div>
      `).join('')}
    </div>
    <button class="btn btn-ghost" style="width: 100%; margin-top: 8px;" onclick="kbAdicionarColuna()">+ Adicionar coluna</button>

    <label>Compartilhamento:</label>
    <select id="kbCompartilhado" class="input" onchange="window.kbCompartilhadoTemp = (this.value === 'true')">
      <option value="false" ${!window.kbCompartilhadoTemp ? 'selected' : ''}>🔒 Apenas eu</option>
      <option value="true" ${window.kbCompartilhadoTemp ? 'selected' : ''}>👥 Todos (compartilhado)</option>
    </select>

    <div style="display: flex; gap: 8px; margin-top: 20px; justify-content: flex-end;">
      <button class="btn btn-ghost" onclick="fecharKbModal()">Cancelar</button>
      <button class="btn btn-primary" onclick="kbSalvarQuadro()">
        ${isEdit ? 'Atualizar' : 'Criar'} Quadro
      </button>
    </div>`;

  document.getElementById('modalTitle').textContent = `${isEdit ? 'Editar' : 'Criar novo'} Quadro`;
  backdrop.hidden = false;
}

function kbMudarTipo(tipo){
  const colunasDefault = {
    solicitacoes: ['Pendente', 'Em andamento', 'Concluída', 'Cancelada'],
    projetos: ['Planejamento', 'Em execução', 'Testes', 'Concluído'],
    agenda: ['Planejado', 'Confirmado', 'Realizado', 'Cancelado']
  };
  window.kbTipoTemp = tipo;
  window.kbColunasTemp = [...colunasDefault[tipo]];
  abrirModalNovoQuadro(window.kbModalId);
}

function kbAdicionarColuna(){
  if (!Array.isArray(window.kbColunasTemp)) window.kbColunasTemp = [];
  window.kbColunasTemp.push('Nova coluna');
  abrirModalNovoQuadro(window.kbModalId);
}

function kbRemoverColuna(i){
  if (!Array.isArray(window.kbColunasTemp)) return;
  if (window.kbColunasTemp.length <= 1) return showToast('O quadro precisa de pelo menos uma coluna');
  window.kbColunasTemp.splice(i, 1);
  abrirModalNovoQuadro(window.kbModalId);
}

function kbSalvarQuadro(){
  const nome = document.getElementById('kbNome').value.trim();
  const tipo = document.getElementById('kbTipo').value;
  const colunas = (window.kbColunasTemp || []).filter(v => v && v.trim()).map(v => v.trim());
  const compartilhado = document.getElementById('kbCompartilhado').value === 'true';

  if (!nome) return showToast('Digite um nome para o quadro');
  if (!colunas.length) return showToast('Adicione pelo menos uma coluna');

  const editandoId = window.kbModalId || null;
  const original = editandoId ? getQuadro(editandoId) : null;

  const quadro = {
    ...(original || {}),
    id: editandoId || undefined,
    nome, tipo, colunas, compartilhado,
    ultimoAcesso: new Date().toISOString()
  };
  if (!quadro.id) delete quadro.id;

  salvarQuadro(quadro);
  fecharKbModal();
  renderKanban();
  showToast(editandoId ? 'Quadro atualizado!' : 'Quadro criado com sucesso!');
}

function fecharKbModal(){
  const backdrop = document.getElementById('modalBackdrop');
  const body = document.getElementById('modalBody');
  if (backdrop) backdrop.hidden = true;
  if (body) body.innerHTML = '';
  window.kbColunasTemp = null;
  window.kbModalId = undefined;
  window.kbTipoTemp = null;
  window.kbNomeTemp = null;
  window.kbCompartilhadoTemp = false;
}

/* RENDERIZAR KANBAN (Drag-Drop) */
function renderQuadroKanban(id){
  const quadro = getQuadro(id);
  if (!quadro) return renderKanban();

  const dados = obterDadosQuadro(quadro);
  const container = document.getElementById('listaQuadros');

  container.innerHTML = `
    <div class="kanban-board">
      <div class="kanban-toolbar">
        <button class="btn btn-ghost" onclick="renderKanban()">← Voltar</button>
        <h2>${escapeHTML(quadro.nome)}</h2>
        <div style="flex: 1;"></div>
        <button class="btn btn-ghost" onclick="abrirMenuQuadro(event, '${id}')">⋯</button>
      </div>

      <div class="kanban-columns">
        ${quadro.colunas.map(col => `
          <div class="kanban-col">
            <div class="col-header">
              <h3>${escapeHTML(col)}</h3>
              <span class="col-count">${dados.porStatus[col] || 0}</span>
            </div>
            <div class="col-cards" data-column="${col}">
              ${(dados.cards[col] || []).map(card => renderCardKanban(card, col)).join('')}
            </div>
            <button class="btn btn-ghost" style="width: 100%; margin-top: 8px;" onclick="criarCardRapido('${id}', '${col}')">+ Novo</button>
          </div>
        `).join('')}
      </div>
    </div>`;

  document.querySelectorAll('.col-cards').forEach(col => {
    col.addEventListener('dragover', e => {
      e.preventDefault();
      col.style.background = 'rgba(36, 85, 163, 0.08)';
    });
    col.addEventListener('dragleave', () => col.style.background = '');
    col.addEventListener('drop', e => {
      e.preventDefault();
      col.style.background = '';
      const cardId = e.dataTransfer.getData('cardId');
      const coluna = col.dataset.column;
      moverCard(id, cardId, coluna);
    });
  });
}

function renderCardKanban(card, coluna){
  const prioridade = card.prioridade || 'Média';
  const prioridadeCor = { 'Urgente': '🔴', 'Alta': '🟠', 'Média': '🟡', 'Baixa': '🟢' }[prioridade] || '🟡';

  return `
    <div class="kanban-card" draggable="true" data-card-id="${card.id}"
         ondragstart="event.dataTransfer.setData('cardId', '${card.id}')"
         onclick="abrirDetalhesCardKanban('${card.tipo}', '${card.id}')">
      <div class="card-title">${escapeHTML(card.titulo || card.nome || 'Sem título')}</div>
      <div class="card-meta">
        ${card.responsavel ? `<span class="card-resp">👤 ${escapeHTML(card.responsavel)}</span>` : ''}
        ${prioridade ? `<span class="card-prio">${prioridadeCor} ${prioridade}</span>` : ''}
      </div>
      ${card.dataVencimento ? `<div class="card-prazo">📅 ${formatDateBR(card.dataVencimento)}</div>` : ''}
    </div>`;
}

function moverCard(quadroId, cardId, novaColuna){
  const quadro = getQuadro(quadroId);
  const dados = obterDadosQuadro(quadro);

  let card = null;
  for (const col of Object.values(dados.cards)) {
    card = col.find(c => c.id === cardId);
    if (card) break;
  }

  if (!card) return;

  const tipoTabela = {
    solicitacoes: 'solicitacoes',
    projetos: 'projetos',
    agenda: 'eventos'
  }[quadro.tipo];

  const item = DB.getById(tipoTabela, card.id);
  if (item) {
    item.status = novaColuna;
    DB.update(tipoTabela, item.id, item);
    registrarHistorico({ modulo: tipoTabela, acao: 'edição', descricao: `"${item.titulo || item.nome || card.id}" movido para coluna: ${novaColuna}`, refId: item.id });
    renderQuadroKanban(quadroId);
    showToast(`Card movido para ${novaColuna}`);
  }
}

function obterDadosQuadro(quadro){
  const tipoTabela = {
    solicitacoes: 'solicitacoes',
    projetos: 'projetos',
    agenda: 'eventos'
  }[quadro.tipo];

  let items = DB.getAll(tipoTabela) || [];

  items = items.map(item => ({
    id: item.id,
    tipo: quadro.tipo,
    titulo: item.titulo || item.nome || item.assunto || '',
    status: item.status || quadro.colunas[0],
    responsavel: item.responsavel || '',
    prioridade: item.prioridade || 'Média',
    dataVencimento: item.dataVencimento || item.prazo || item.dataPrazo || ''
  }));

  const cards = {};
  quadro.colunas.forEach(col => {
    cards[col] = items.filter(i => i.status === col);
  });

  const porStatus = {};
  quadro.colunas.forEach(col => {
    porStatus[col] = cards[col].length;
  });

  return { cards, porStatus };
}

function abrirDetalhesCardKanban(tipo, id){
  const funcs = {
    solicitacoes: () => abrirDetalheSolicitacao(id),
    projetos: () => abrirDetalheProjeto(id),
    agenda: () => abrirDetalheEvento(id)
  };

  (funcs[tipo] || (() => {}))();
}

function criarCardRapido(quadroId, coluna){
  const quadro = getQuadro(quadroId);
  const tipoForm = {
    solicitacoes: 'openFormSolicitacao',
    projetos: 'openFormProjeto',
    agenda: 'openFormEvento'
  }[quadro.tipo];

  if (window[tipoForm]) {
    window[tipoForm]();
  }
}

initKanban();

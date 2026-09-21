/* ---------------------------------------------------------
   19. ATENDIMENTOS (controle semanal de atendimentos)
   Aba independente da Agenda. Reaproveita: DB/STORAGE_KEYS
   (01-core.js), registrarHistorico/showToast/confirmAction/
   openModal/closeModal/escapeHTML (01-core.js e 03-dashboard.js),
   cabeçalho institucional e DOC_A4_PRINT_CSS (17-gerador-documentos.js).
   Etapa 1: agenda semanal, cadastro individual/em lote, presença,
   justificativa de falta, remarcação, resumo da semana, duplicar
   semana, PDF semanal. (Recorrência automática, integração com
   Pendências, histórico detalhado e relatório mensal ficam para
   as próximas etapas, combinado com o usuário.)
   --------------------------------------------------------- */

/* -----------------------------------------------------------
   19.1 CADASTROS DE APOIO — ALUNOS E PROFISSIONAIS
   Cadastros leves (nome) só para popular os selects e evitar
   digitação inconsistente. Não duplicam nenhum módulo existente.
   ----------------------------------------------------------- */
function getAtendAlunos(){ return DB.getAll('atendimento-alunos'); }
function getAtendProfissionais(){ return DB.getAll('atendimento-profissionais'); }

function garantirAtendCadastro(entity, nome){
  const nomeTrim = (nome || '').trim();
  if (!nomeTrim) return null;
  const lista = DB.getAll(entity);
  const existente = lista.find(x => x.nome.toLowerCase() === nomeTrim.toLowerCase());
  if (existente) return existente;
  const novo = { id: uid(entity === 'atendimento-alunos' ? 'alu' : 'prof'), nome: nomeTrim };
  DB.insert(entity, novo);
  return novo;
}

/* Campo do atendimento que referencia cada cadastro ('alunoId'/'alunoNome'
   ou 'profissionalId'/'profissionalNome'), usado por renomear/mesclar/excluir. */
function atendCamposDe(entity){
  return entity === 'atendimento-alunos'
    ? { campoId: 'alunoId', campoNome: 'alunoNome' }
    : { campoId: 'profissionalId', campoNome: 'profissionalNome' };
}

function renomearAtendCadastro(entity, id, novoNome){
  const nomeTrim = (novoNome || '').trim();
  if (!nomeTrim) return showToast('Digite um nome.');
  DB.update(entity, id, { nome: nomeTrim });
  const { campoId, campoNome } = atendCamposDe(entity);
  const atendimentos = getAtendimentos().map(a => a[campoId] === id ? { ...a, [campoNome]: nomeTrim } : a);
  DB.saveAll('atendimentos', atendimentos);
  registrarHistorico({ modulo: 'atendimentos', acao: 'edição', descricao: `Cadastro renomeado para "${nomeTrim}".`, refId: id });
}

/* Mescla origemId em destinoId: todo atendimento que apontava para
   origem passa a apontar para destino, e o cadastro de origem é removido.
   Usado para unificar duplicatas (ex.: "João" e "joão" cadastrados separados). */
function mesclarAtendCadastro(entity, origemId, destinoId){
  if (origemId === destinoId) return showToast('Selecione dois registros diferentes para mesclar.');
  const destino = DB.getById(entity, destinoId);
  if (!destino) return showToast('Registro de destino não encontrado.');
  const { campoId, campoNome } = atendCamposDe(entity);
  const atendimentos = getAtendimentos().map(a => a[campoId] === origemId ? { ...a, [campoId]: destinoId, [campoNome]: destino.nome } : a);
  DB.saveAll('atendimentos', atendimentos);
  DB.remove(entity, origemId);
  registrarHistorico({ modulo: 'atendimentos', acao: 'edição', descricao: `Cadastro mesclado em "${destino.nome}".`, refId: destinoId });
}

function excluirAtendCadastro(entity, id){
  const { campoId } = atendCamposDe(entity);
  const emUso = getAtendimentos().some(a => a[campoId] === id);
  if (emUso) return showToast('Não é possível excluir: existem atendimentos vinculados a este registro. Mescle-o em outro antes.');
  const item = DB.getById(entity, id);
  confirmAction(`Excluir "${item?.nome}"? Este registro não tem nenhum atendimento vinculado.`, () => {
    DB.remove(entity, id);
    showToast('Registro excluído.');
    renderGestaoAlunosProfissionais();
  });
}

/* -----------------------------------------------------------
   19.2 SEMANA — utilitários de data (segunda a sexta)
   ----------------------------------------------------------- */
const ATEND_DIAS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'];

function atendSegundaDaSemana(iso){
  const d = parseISODate(iso) || new Date();
  const diaSemana = d.getDay(); // 0=dom..6=sab
  const offset = diaSemana === 0 ? -6 : 1 - diaSemana;
  const seg = new Date(d.getFullYear(), d.getMonth(), d.getDate() + offset);
  return `${seg.getFullYear()}-${String(seg.getMonth()+1).padStart(2,'0')}-${String(seg.getDate()).padStart(2,'0')}`;
}
function atendAddDias(iso, dias){
  const d = parseISODate(iso);
  const nova = new Date(d.getFullYear(), d.getMonth(), d.getDate() + dias);
  return `${nova.getFullYear()}-${String(nova.getMonth()+1).padStart(2,'0')}-${String(nova.getDate()).padStart(2,'0')}`;
}
function atendDatasDaSemana(segundaIso){
  return ATEND_DIAS.map((_, i) => atendAddDias(segundaIso, i));
}

let atendSemanaAtual = atendSegundaDaSemana(todayISO());

/* -----------------------------------------------------------
   19.3 CRUD DE ATENDIMENTOS
   Cada atendimento: {id, alunoId, alunoNome, profissionalId,
   profissionalNome, data, horario, observacao, presenca:
   'veio'|'faltou'|'nao_informado', faltaMotivo, faltaObs,
   remarcadoPara: {data,horario,profissionalId,profissionalNome,motivo} | null,
   remarcadoDeId: id do atendimento original (se este é fruto de remarcação),
   criadoEm, atualizadoEm}
   ----------------------------------------------------------- */
function getAtendimentos(){ return DB.getAll('atendimentos'); }

function criarAtendimento({ alunoNome, profissionalNome, data, horario, observacao, serieId }){
  const aluno = garantirAtendCadastro('atendimento-alunos', alunoNome);
  const prof = garantirAtendCadastro('atendimento-profissionais', profissionalNome);
  if (!aluno || !prof || !data || !horario) return null;
  const registro = {
    id: uid('atd'),
    alunoId: aluno.id, alunoNome: aluno.nome,
    profissionalId: prof.id, profissionalNome: prof.nome,
    data, horario, observacao: (observacao || '').trim(),
    presenca: 'nao_informado', faltaMotivo: '', faltaObs: '',
    remarcadoPara: null, remarcadoDeId: null, serieId: serieId || null,
    criadoEm: Date.now()
  };
  DB.insert('atendimentos', registro);
  return registro;
}

/* Gera ocorrências futuras de um atendimento recorrente. `ate` (ISO)
   é opcional — sem ela, gera 8 semanas. Editar/cancelar uma ocorrência
   específica não afeta as demais (cada uma é um registro independente,
   ligado apenas por serieId para referência). */
function criarAtendimentosRecorrentes({ alunoNome, profissionalNome, data, horario, observacao, ate }){
  const serieId = uid('serie');
  const limite = ate ? parseISODate(ate) : null;
  const criados = [];
  let dataAtual = data;
  for (let i = 0; i < 52; i++) { // trava de segurança: nunca mais que 1 ano
    if (limite && parseISODate(dataAtual) > limite) break;
    const registro = criarAtendimento({ alunoNome, profissionalNome, data: dataAtual, horario, observacao, serieId });
    if (registro) criados.push(registro);
    dataAtual = atendAddDias(dataAtual, 7);
    if (!limite && i >= 7) break; // sem data-limite: gera 8 semanas
  }
  return criados;
}

function atualizarPresenca(id, presenca, faltaMotivo, faltaObs){
  const patch = { presenca };
  if (presenca === 'faltou') {
    patch.faltaMotivo = faltaMotivo || '';
    patch.faltaObs = faltaObs || '';
  } else {
    patch.faltaMotivo = '';
    patch.faltaObs = '';
  }
  const atualizado = DB.update('atendimentos', id, patch);
  if (atualizado) {
    registrarHistorico({ modulo: 'atendimentos', acao: 'status', descricao: `Presença de "${atualizado.alunoNome}" (${formatDateBR(atualizado.data)} ${atualizado.horario}) marcada como ${presenca === 'veio' ? 'Compareceu' : presenca === 'faltou' ? 'Faltou' : 'Não informado'}.`, refId: id });
  }
  return atualizado;
}

function excluirAtendimento(id){
  const item = DB.getById('atendimentos', id);
  if (!item) return;
  confirmAction(`Excluir o atendimento de "${item.alunoNome}" em ${formatDateBR(item.data)} ${item.horario}?`, () => {
    DB.remove('atendimentos', id);
    registrarHistorico({ modulo: 'atendimentos', acao: 'exclusão', descricao: `Atendimento de "${item.alunoNome}" (${formatDateBR(item.data)} ${item.horario}) excluído.`, refId: id });
    showToast('Atendimento excluído.');
    renderAtendimentos();
  });
}

/* -----------------------------------------------------------
   19.4 VIEW PRINCIPAL — agenda semanal
   ----------------------------------------------------------- */
function renderAtendimentos(){
  const container = document.getElementById('atendimentosConteudo');
  if (!container) return;

  const datas = atendDatasDaSemana(atendSemanaAtual);
  const fimSemana = datas[datas.length - 1];
  const todos = getAtendimentos();
  const filtros = getFiltrosValores('filtrosAtendimentos');

  let daSemana = todos.filter(a => datas.includes(a.data));
  if (filtros.aluno) daSemana = daSemana.filter(a => a.alunoId === filtros.aluno);
  if (filtros.profissional) daSemana = daSemana.filter(a => a.profissionalId === filtros.profissional);
  if (filtros.presenca) daSemana = daSemana.filter(a => a.presenca === filtros.presenca);
  if (filtros.busca) {
    const q = normalizarFiltro(filtros.busca);
    daSemana = daSemana.filter(a => normalizarFiltro(a.alunoNome + ' ' + a.profissionalNome).includes(q));
  }

  // Popular filtros de aluno/profissional
  const selAluno = document.querySelector('#filtrosAtendimentos [data-filter="aluno"]');
  if (selAluno) {
    const atual = selAluno.value;
    selAluno.innerHTML = '<option value="">Aluno: todos</option>' + getAtendAlunos().sort((a,b)=>a.nome.localeCompare(b.nome,'pt-BR')).map(a => `<option value="${a.id}">${escapeHTML(a.nome)}</option>`).join('');
    if (atual) selAluno.value = atual;
  }
  const selProf = document.querySelector('#filtrosAtendimentos [data-filter="profissional"]');
  if (selProf) {
    const atual = selProf.value;
    selProf.innerHTML = '<option value="">Profissional: todos</option>' + getAtendProfissionais().sort((a,b)=>a.nome.localeCompare(b.nome,'pt-BR')).map(p => `<option value="${p.id}">${escapeHTML(p.nome)}</option>`).join('');
    if (atual) selProf.value = atual;
  }

  document.getElementById('atendSemanaLabel').textContent = `${formatDateBR(atendSemanaAtual)} — ${formatDateBR(fimSemana)}`;

  // Resumo da semana
  const total = daSemana.length;
  const compareceram = daSemana.filter(a => a.presenca === 'veio').length;
  const faltaram = daSemana.filter(a => a.presenca === 'faltou').length;
  const naoInformados = daSemana.filter(a => a.presenca === 'nao_informado').length;
  const taxa = total ? ((compareceram / total) * 100).toFixed(1).replace('.', ',') : '0,0';

  const porProfissional = {};
  daSemana.forEach(a => {
    if (!porProfissional[a.profissionalNome]) porProfissional[a.profissionalNome] = { total: 0, presentes: 0, faltas: 0 };
    porProfissional[a.profissionalNome].total++;
    if (a.presenca === 'veio') porProfissional[a.profissionalNome].presentes++;
    if (a.presenca === 'faltou') porProfissional[a.profissionalNome].faltas++;
  });

  document.getElementById('atendResumo').innerHTML = `
    <div class="stat-grid">
      <div class="stat-card c-primary"><div class="stat-num">${total}</div><div class="stat-label">Atendimentos</div></div>
      <div class="stat-card c-ok"><div class="stat-num">${compareceram}</div><div class="stat-label">Compareceram</div></div>
      <div class="stat-card c-danger"><div class="stat-num">${faltaram}</div><div class="stat-label">Faltaram</div></div>
      <div class="stat-card c-neutral"><div class="stat-num">${naoInformados}</div><div class="stat-label">Não informados</div></div>
      <div class="stat-card c-warn"><div class="stat-num">${taxa}%</div><div class="stat-label">Taxa de presença</div></div>
    </div>
    ${Object.keys(porProfissional).length ? `<div class="modelos-header" style="margin-top:16px;margin-bottom:8px"><p class="muted" style="margin:0">Resumo por profissional</p></div>
    <div class="card-grid" style="grid-template-columns:repeat(auto-fill,minmax(200px,1fr))">
      ${Object.entries(porProfissional).map(([nome, s]) => `
        <div class="modelo-card" style="align-items:flex-start;text-align:left">
          <strong>${escapeHTML(nome)}</strong>
          <small class="muted">${s.total} atendimento${s.total!==1?'s':''} · ${s.presentes} presente${s.presentes!==1?'s':''} · ${s.faltas} falta${s.faltas!==1?'s':''}</small>
        </div>`).join('')}
    </div>` : ''}
  `;

  // Agenda por dia
  const porDia = document.getElementById('atendPorDia');
  porDia.innerHTML = datas.map((data, i) => {
    const doDia = daSemana.filter(a => a.data === data).sort((a,b) => a.horario.localeCompare(b.horario));
    return `
      <div class="panel" style="margin-bottom:14px">
        <div class="panel-head"><h2>${ATEND_DIAS[i].toUpperCase()} — ${formatDateBR(data).slice(0,5)}</h2></div>
        ${doDia.length ? `
        <div class="table-wrap">
          <table class="data-table">
            <thead><tr><th>Horário</th><th>Aluno</th><th>Profissional</th><th>Presença</th><th>Observação</th><th></th></tr></thead>
            <tbody>
              ${doDia.map(a => atendLinhaHTML(a)).join('')}
            </tbody>
          </table>
        </div>` : '<p class="muted" style="padding:14px">Nenhum atendimento cadastrado.</p>'}
      </div>`;
  }).join('');

  atendBindAcoes(container);
}

function atendPresencaBadge(a){
  if (a.presenca === 'veio') return '<span class="badge-pill badge-ok">🟢 Veio</span>';
  if (a.presenca === 'faltou') return '<span class="badge-pill badge-danger">🔴 Faltou</span>';
  return '<span class="badge-pill badge-neutral">⚪ Não informado</span>';
}

function atendLinhaHTML(a){
  const remarcado = a.remarcadoPara ? `<br><small class="muted">↳ Remarcado para ${formatDateBR(a.remarcadoPara.data)} — ${a.remarcadoPara.horario}${a.remarcadoPara.profissionalNome ? ' — ' + escapeHTML(a.remarcadoPara.profissionalNome) : ''}</small>` : '';
  const faltaInfo = a.presenca === 'faltou' && a.faltaMotivo ? `<br><small class="muted">Motivo: ${escapeHTML(a.faltaMotivo)}</small>` : '';
  return `
    <tr data-atd-id="${a.id}">
      <td>${escapeHTML(a.horario)}</td>
      <td><a href="#" class="atd-link-aluno" data-aluno-id="${a.alunoId}">${escapeHTML(a.alunoNome)}</a></td>
      <td><a href="#" class="atd-link-prof" data-prof-id="${a.profissionalId}">${escapeHTML(a.profissionalNome)}</a></td>
      <td>${atendPresencaBadge(a)}${faltaInfo}${remarcado}</td>
      <td>${escapeHTML(a.observacao || '—')}</td>
      <td style="white-space:nowrap">
        <button class="btn btn-sm btn-primary" data-atd-act="veio" data-atd-id="${a.id}" title="Marcar presença">✓</button>
        <button class="btn btn-sm btn-danger" data-atd-act="faltou" data-atd-id="${a.id}" title="Marcar falta">✕</button>
        <button class="btn btn-sm btn-ghost" data-atd-act="remarcar" data-atd-id="${a.id}" title="Remarcar">🔄</button>
        <button class="btn btn-sm btn-ghost" data-atd-act="excluir" data-atd-id="${a.id}" title="Excluir">🗑</button>
      </td>
    </tr>`;
}

function atendBindAcoes(container){
  container.querySelectorAll('[data-atd-act]').forEach(btn => {
    const id = btn.dataset.atdId;
    const acao = btn.dataset.atdAct;
    btn.addEventListener('click', () => {
      if (acao === 'veio') atualizarPresenca(id, 'veio') && renderAtendimentos();
      else if (acao === 'faltou') abrirJustificativaFalta(id);
      else if (acao === 'remarcar') abrirModalRemarcar(id);
      else if (acao === 'excluir') excluirAtendimento(id);
    });
  });
  container.querySelectorAll('.atd-link-aluno').forEach(a => {
    a.addEventListener('click', (e) => { e.preventDefault(); abrirHistoricoAluno(a.dataset.alunoId); });
  });
  container.querySelectorAll('.atd-link-prof').forEach(a => {
    a.addEventListener('click', (e) => { e.preventDefault(); abrirFichaProfissional(a.dataset.profId); });
  });
}

/* -----------------------------------------------------------
   19.5 JUSTIFICATIVA DE FALTA
   ----------------------------------------------------------- */
const ATEND_MOTIVOS_FALTA = ['Doença', 'Consulta médica', 'Transporte', 'Não avisou', 'Compromisso', 'Outro'];

function abrirJustificativaFalta(id){
  const item = DB.getById('atendimentos', id);
  if (!item) return;
  openModal(`Motivo da falta: ${item.alunoNome}`, `
    <label>Motivo da falta:</label>
    <select id="atdMotivoFalta" class="input">
      ${ATEND_MOTIVOS_FALTA.map(m => `<option ${item.faltaMotivo===m?'selected':''}>${m}</option>`).join('')}
    </select>
    <label>Observação (opcional):</label>
    <textarea id="atdObsFalta" class="input" style="height:70px">${escapeHTML(item.faltaObs || '')}</textarea>
    <div class="modal-actions" style="margin-top:16px">
      <button type="button" class="btn btn-ghost" id="btnCancelarFalta">Cancelar</button>
      <button type="button" class="btn btn-primary" id="btnSalvarFalta">Salvar</button>
    </div>
  `);
  document.getElementById('btnCancelarFalta').addEventListener('click', closeModal);
  document.getElementById('btnSalvarFalta').addEventListener('click', () => {
    const motivo = document.getElementById('atdMotivoFalta').value;
    const obs = document.getElementById('atdObsFalta').value.trim();
    atualizarPresenca(id, 'faltou', motivo, obs);
    closeModal();
    renderAtendimentos();
    showToast('Falta registrada.');
  });
}

/* -----------------------------------------------------------
   19.6 REMARCAÇÃO — mantém o registro original no histórico
   ----------------------------------------------------------- */
function abrirModalRemarcar(id){
  const item = DB.getById('atendimentos', id);
  if (!item) return;
  const profissionais = getAtendProfissionais();
  openModal(`Remarcar atendimento: ${item.alunoNome}`, `
    <label>Nova data:</label>
    <input type="date" id="atdRemData" class="input" value="${item.data}">
    <label>Novo horário:</label>
    <input type="time" id="atdRemHorario" class="input" value="${item.horario}">
    <label>Profissional:</label>
    <select id="atdRemProf" class="input">
      ${profissionais.map(p => `<option value="${p.id}" ${p.id===item.profissionalId?'selected':''}>${escapeHTML(p.nome)}</option>`).join('')}
    </select>
    <label>Motivo da remarcação:</label>
    <input type="text" id="atdRemMotivo" class="input" placeholder="Ex: Profissional em outro atendimento">
    <div class="modal-actions" style="margin-top:16px">
      <button type="button" class="btn btn-ghost" id="btnCancelarRemarcar">Cancelar</button>
      <button type="button" class="btn btn-primary" id="btnSalvarRemarcar">Remarcar</button>
    </div>
  `);
  document.getElementById('btnCancelarRemarcar').addEventListener('click', closeModal);
  document.getElementById('btnSalvarRemarcar').addEventListener('click', () => {
    const novaData = document.getElementById('atdRemData').value;
    const novoHorario = document.getElementById('atdRemHorario').value;
    const profId = document.getElementById('atdRemProf').value;
    const motivo = document.getElementById('atdRemMotivo').value.trim();
    if (!novaData || !novoHorario) return showToast('Informe data e horário.');
    const prof = profissionais.find(p => p.id === profId);

    // Mantém o registro original (histórico) e cria um novo atendimento remarcado.
    DB.update('atendimentos', id, { remarcadoPara: { data: novaData, horario: novoHorario, profissionalId: prof?.id || item.profissionalId, profissionalNome: prof?.nome || item.profissionalNome, motivo } });
    const novo = {
      id: uid('atd'), alunoId: item.alunoId, alunoNome: item.alunoNome,
      profissionalId: prof?.id || item.profissionalId, profissionalNome: prof?.nome || item.profissionalNome,
      data: novaData, horario: novoHorario, observacao: item.observacao,
      presenca: 'nao_informado', faltaMotivo: '', faltaObs: '',
      remarcadoPara: null, remarcadoDeId: id, criadoEm: Date.now()
    };
    DB.insert('atendimentos', novo);
    registrarHistorico({ modulo: 'atendimentos', acao: 'edição', descricao: `Atendimento de "${item.alunoNome}" remarcado de ${formatDateBR(item.data)} ${item.horario} para ${formatDateBR(novaData)} ${novoHorario}.`, refId: id });
    closeModal();
    renderAtendimentos();
    showToast('✓ Atendimento remarcado.');
  });
}

/* -----------------------------------------------------------
   19.6b HISTÓRICO DO ALUNO / FICHA DO PROFISSIONAL
   Filtráveis por período. Reaproveitam atendPresencaBadge/formatDateBR.
   ----------------------------------------------------------- */
function abrirHistoricoAluno(alunoId){
  const aluno = DB.getById('atendimento-alunos', alunoId);
  if (!aluno) return showToast('Aluno não encontrado');

  const renderLista = (de, ate) => {
    let lista = getAtendimentos().filter(a => a.alunoId === alunoId);
    if (de) lista = lista.filter(a => a.data >= de);
    if (ate) lista = lista.filter(a => a.data <= ate);
    lista.sort((a,b) => (b.data+b.horario).localeCompare(a.data+a.horario));
    const presentes = lista.filter(a => a.presenca === 'veio').length;
    const faltas = lista.filter(a => a.presenca === 'faltou').length;
    document.getElementById('atdHistLista').innerHTML = `
      <p class="muted">${lista.length} atendimento(s) · ${presentes} presença(s) · ${faltas} falta(s)</p>
      <div class="table-wrap"><table class="data-table">
        <thead><tr><th>Data</th><th>Horário</th><th>Profissional</th><th>Presença</th><th>Observação</th></tr></thead>
        <tbody>${lista.map(a => `<tr>
          <td>${formatDateBR(a.data)}</td><td>${escapeHTML(a.horario)}</td><td>${escapeHTML(a.profissionalNome)}</td>
          <td>${atendPresencaBadge(a)}${a.faltaMotivo ? `<br><small class="muted">${escapeHTML(a.faltaMotivo)}</small>` : ''}${a.remarcadoPara ? `<br><small class="muted">↳ Remarcado p/ ${formatDateBR(a.remarcadoPara.data)} ${a.remarcadoPara.horario}</small>` : ''}</td>
          <td>${escapeHTML(a.observacao || '—')}</td>
        </tr>`).join('') || '<tr><td colspan="5" class="muted">Nenhum atendimento no período.</td></tr>'}</tbody>
      </table></div>`;
  };

  openModal(`👤 Histórico de atendimentos: ${aluno.nome}`, `
    <div class="filters" style="margin-bottom:10px">
      <input type="date" class="input" id="atdHistDe" title="De">
      <input type="date" class="input" id="atdHistAte" title="Até">
    </div>
    <div id="atdHistLista"></div>
    <div class="modal-actions" style="margin-top:16px"><button type="button" class="btn btn-ghost" id="btnFecharHistAluno">Fechar</button></div>
  `);
  renderLista(null, null);
  document.getElementById('atdHistDe').addEventListener('change', (e) => renderLista(e.target.value || null, document.getElementById('atdHistAte').value || null));
  document.getElementById('atdHistAte').addEventListener('change', (e) => renderLista(document.getElementById('atdHistDe').value || null, e.target.value || null));
  document.getElementById('btnFecharHistAluno').addEventListener('click', closeModal);
}

function abrirFichaProfissional(profId){
  const prof = DB.getById('atendimento-profissionais', profId);
  if (!prof) return showToast('Profissional não encontrado');

  const renderFicha = (de, ate) => {
    let lista = getAtendimentos().filter(a => a.profissionalId === profId);
    if (de) lista = lista.filter(a => a.data >= de);
    if (ate) lista = lista.filter(a => a.data <= ate);
    lista.sort((a,b) => (b.data+b.horario).localeCompare(a.data+a.horario));
    const presentes = lista.filter(a => a.presenca === 'veio').length;
    const faltas = lista.filter(a => a.presenca === 'faltou').length;
    const alunosUnicos = [...new Set(lista.map(a => a.alunoNome))];
    const taxa = lista.length ? ((presentes / lista.length) * 100).toFixed(1).replace('.', ',') : '0,0';
    document.getElementById('atdFichaConteudo').innerHTML = `
      <div class="stat-grid">
        <div class="stat-card c-primary"><div class="stat-num">${lista.length}</div><div class="stat-label">Atendimentos</div></div>
        <div class="stat-card c-ok"><div class="stat-num">${presentes}</div><div class="stat-label">Presenças</div></div>
        <div class="stat-card c-danger"><div class="stat-num">${faltas}</div><div class="stat-label">Faltas</div></div>
        <div class="stat-card c-warn"><div class="stat-num">${taxa}%</div><div class="stat-label">Taxa de presença</div></div>
      </div>
      <p class="muted" style="margin-top:10px">Alunos atendidos: ${alunosUnicos.map(escapeHTML).join(', ') || '—'}</p>
      <div class="table-wrap"><table class="data-table">
        <thead><tr><th>Data</th><th>Horário</th><th>Aluno</th><th>Presença</th></tr></thead>
        <tbody>${lista.map(a => `<tr>
          <td>${formatDateBR(a.data)}</td><td>${escapeHTML(a.horario)}</td><td>${escapeHTML(a.alunoNome)}</td><td>${atendPresencaBadge(a)}</td>
        </tr>`).join('') || '<tr><td colspan="4" class="muted">Nenhum atendimento no período.</td></tr>'}</tbody>
      </table></div>`;
  };

  openModal(`👩‍🏫 Ficha do profissional: ${prof.nome}`, `
    <div class="filters" style="margin-bottom:10px">
      <input type="date" class="input" id="atdFichaDe" title="De">
      <input type="date" class="input" id="atdFichaAte" title="Até">
    </div>
    <div id="atdFichaConteudo"></div>
    <div class="modal-actions" style="margin-top:16px"><button type="button" class="btn btn-ghost" id="btnFecharFicha">Fechar</button></div>
  `);
  renderFicha(null, null);
  document.getElementById('atdFichaDe').addEventListener('change', (e) => renderFicha(e.target.value || null, document.getElementById('atdFichaAte').value || null));
  document.getElementById('atdFichaAte').addEventListener('change', (e) => renderFicha(document.getElementById('atdFichaDe').value || null, e.target.value || null));
  document.getElementById('btnFecharFicha').addEventListener('click', closeModal);
}

/* -----------------------------------------------------------
   19.6c GESTÃO DE ALUNOS E PROFISSIONAIS
   Renomear, mesclar duplicados e excluir (só se sem atendimentos
   vinculados). Evita que o histórico fique fragmentado por nomes
   digitados de forma inconsistente ao longo do tempo.
   ----------------------------------------------------------- */
function renderGestaoAlunosProfissionais(){
  const corpo = document.getElementById('atdGestaoConteudo');
  if (!corpo) return;

  const contarUso = (entity, id) => {
    const { campoId } = atendCamposDe(entity);
    return getAtendimentos().filter(a => a[campoId] === id).length;
  };

  const listaHTML = (entity, lista) => lista.sort((a,b) => a.nome.localeCompare(b.nome, 'pt-BR')).map(item => `
    <div class="workspace-item" data-entity="${entity}" data-id="${item.id}">
      <div style="flex:1;display:flex;gap:8px;align-items:center">
        <input type="text" class="input atdGestaoNome" value="${escapeHTML(item.nome)}" style="flex:1">
        <small class="muted">${contarUso(entity, item.id)} atendimento(s)</small>
      </div>
      <div class="item-actions">
        <button type="button" class="btn btn-sm btn-ghost atdGestaoRenomear">Salvar nome</button>
        <button type="button" class="btn btn-sm btn-ghost atdGestaoMesclar">Mesclar em...</button>
        <button type="button" class="btn btn-sm btn-danger atdGestaoExcluir">Excluir</button>
      </div>
    </div>`).join('') || '<p class="muted">Nenhum registro cadastrado.</p>';

  corpo.innerHTML = `
    <h3 style="margin-bottom:8px">Alunos</h3>
    <div class="workspace-list" id="atdGestaoAlunos">${listaHTML('atendimento-alunos', getAtendAlunos())}</div>
    <h3 style="margin:20px 0 8px">Profissionais</h3>
    <div class="workspace-list" id="atdGestaoProfs">${listaHTML('atendimento-profissionais', getAtendProfissionais())}</div>
  `;

  corpo.querySelectorAll('.workspace-item').forEach(row => {
    const entity = row.dataset.entity;
    const id = row.dataset.id;
    row.querySelector('.atdGestaoRenomear').addEventListener('click', () => {
      renomearAtendCadastro(entity, id, row.querySelector('.atdGestaoNome').value);
      renderGestaoAlunosProfissionais();
      showToast('✓ Nome atualizado.');
    });
    row.querySelector('.atdGestaoExcluir').addEventListener('click', () => excluirAtendCadastro(entity, id));
    row.querySelector('.atdGestaoMesclar').addEventListener('click', () => {
      const outros = (entity === 'atendimento-alunos' ? getAtendAlunos() : getAtendProfissionais()).filter(x => x.id !== id);
      if (!outros.length) return showToast('Não há outro registro para mesclar.');
      openModal('Mesclar em qual registro?', `
        <p class="muted">Todos os atendimentos deste registro passarão para o registro escolhido, e este será removido.</p>
        <select id="atdMesclarDestino" class="input">${outros.sort((a,b)=>a.nome.localeCompare(b.nome,'pt-BR')).map(o => `<option value="${o.id}">${escapeHTML(o.nome)}</option>`).join('')}</select>
        <div class="modal-actions" style="margin-top:16px">
          <button type="button" class="btn btn-ghost" id="btnCancelarMesclar">Cancelar</button>
          <button type="button" class="btn btn-danger" id="btnConfirmarMesclar">Mesclar</button>
        </div>
      `);
      document.getElementById('btnCancelarMesclar').addEventListener('click', () => abrirGestaoAlunosProfissionais());
      document.getElementById('btnConfirmarMesclar').addEventListener('click', () => {
        const destinoId = document.getElementById('atdMesclarDestino').value;
        mesclarAtendCadastro(entity, id, destinoId);
        showToast('✓ Registros mesclados.');
        abrirGestaoAlunosProfissionais();
      });
    });
  });
}

function abrirGestaoAlunosProfissionais(){
  openModal('👥 Alunos e Profissionais', `
    <div id="atdGestaoConteudo"></div>
    <div class="modal-actions" style="margin-top:16px"><button type="button" class="btn btn-ghost" id="btnFecharGestaoAtend">Fechar</button></div>
  `);
  renderGestaoAlunosProfissionais();
  document.getElementById('btnFecharGestaoAtend').addEventListener('click', () => { closeModal(); renderAtendimentos(); });
}

/* -----------------------------------------------------------
   19.7 NOVO ATENDIMENTO (individual + em lote)
   ----------------------------------------------------------- */
function abrirModalNovoAtendimento(){
  const alunos = getAtendAlunos();
  const profissionais = getAtendProfissionais();
  const datalistAlunos = `<datalist id="dlAtendAlunos">${alunos.map(a => `<option value="${escapeHTML(a.nome)}">`).join('')}</datalist>`;
  const datalistProfs = `<datalist id="dlAtendProfs">${profissionais.map(p => `<option value="${escapeHTML(p.nome)}">`).join('')}</datalist>`;

  openModal('Novo atendimento', `
    <div class="modelos-header" style="margin-bottom:10px">
      <div style="display:flex;gap:8px">
        <button type="button" class="btn btn-sm btn-primary" id="atdTabIndividual">Individual</button>
        <button type="button" class="btn btn-sm btn-ghost" id="atdTabLote">➕ Adicionar vários atendimentos</button>
      </div>
    </div>
    <div id="atdFormIndividual">
      <label>Aluno:</label>
      <input type="text" id="atdAluno" class="input" list="dlAtendAlunos" placeholder="Nome do aluno">
      <label>Profissional/professora:</label>
      <input type="text" id="atdProf" class="input" list="dlAtendProfs" placeholder="Nome do profissional">
      <label>Data:</label>
      <input type="date" id="atdData" class="input" value="${atendSemanaAtual}">
      <label>Horário:</label>
      <input type="time" id="atdHorario" class="input">
      <label>Observação (opcional):</label>
      <textarea id="atdObs" class="input" style="height:60px"></textarea>
      <label>Repetição:</label>
      <select id="atdRecorrencia" class="input">
        <option value="nao">Não repetir</option>
        <option value="semanal">Toda semana</option>
        <option value="semanal_ate">Toda semana, até uma data</option>
      </select>
      <div id="atdRecorrenciaAteWrap" hidden>
        <label>Repetir até:</label>
        <input type="date" id="atdRecorrenciaAte" class="input">
      </div>
    </div>
    <div id="atdFormLote" hidden>
      <p class="muted">Preencha uma linha por atendimento. Deixe em branco o que não for usar.</p>
      <div id="atdLoteLinhas"></div>
      <button type="button" class="btn btn-sm btn-ghost" id="btnAtdLoteAddLinha">＋ Adicionar linha</button>
    </div>
    ${datalistAlunos}${datalistProfs}
    <div class="modal-actions" style="margin-top:16px">
      <button type="button" class="btn btn-ghost" id="btnCancelarAtd">Cancelar</button>
      <button type="button" class="btn btn-primary" id="btnSalvarAtd">Adicionar</button>
    </div>
  `);

  let modo = 'individual';
  const linhaLoteHTML = (i) => `
    <div class="atd-lote-linha" data-i="${i}" style="display:grid;grid-template-columns:1.3fr 1.3fr 1fr .8fr auto;gap:6px;margin-bottom:6px">
      <input type="text" class="input atdLoteAluno" list="dlAtendAlunos" placeholder="Aluno">
      <input type="text" class="input atdLoteProf" list="dlAtendProfs" placeholder="Profissional">
      <select class="input atdLoteDia">${ATEND_DIAS.map((d, di) => `<option value="${di}">${d}</option>`).join('')}</select>
      <input type="time" class="input atdLoteHorario">
      <button type="button" class="btn btn-sm btn-danger atdLoteRemover" data-i="${i}">✕</button>
    </div>`;
  let loteCount = 0;
  const addLinhaLote = () => {
    document.getElementById('atdLoteLinhas').insertAdjacentHTML('beforeend', linhaLoteHTML(loteCount));
    const novaLinha = document.querySelector(`.atd-lote-linha[data-i="${loteCount}"]`);
    novaLinha.querySelector('.atdLoteRemover').addEventListener('click', () => novaLinha.remove());
    loteCount++;
  };

  document.getElementById('atdTabIndividual').addEventListener('click', () => {
    modo = 'individual';
    document.getElementById('atdFormIndividual').hidden = false;
    document.getElementById('atdFormLote').hidden = true;
    document.getElementById('atdTabIndividual').className = 'btn btn-sm btn-primary';
    document.getElementById('atdTabLote').className = 'btn btn-sm btn-ghost';
  });
  document.getElementById('atdTabLote').addEventListener('click', () => {
    modo = 'lote';
    document.getElementById('atdFormIndividual').hidden = true;
    document.getElementById('atdFormLote').hidden = false;
    document.getElementById('atdTabLote').className = 'btn btn-sm btn-primary';
    document.getElementById('atdTabIndividual').className = 'btn btn-sm btn-ghost';
    if (!loteCount) { addLinhaLote(); addLinhaLote(); addLinhaLote(); }
  });
  document.getElementById('btnAtdLoteAddLinha').addEventListener('click', addLinhaLote);
  document.getElementById('atdRecorrencia').addEventListener('change', (e) => {
    document.getElementById('atdRecorrenciaAteWrap').hidden = e.target.value !== 'semanal_ate';
  });

  document.getElementById('btnCancelarAtd').addEventListener('click', closeModal);
  document.getElementById('btnSalvarAtd').addEventListener('click', () => {
    if (modo === 'individual') {
      const aluno = document.getElementById('atdAluno').value.trim();
      const prof = document.getElementById('atdProf').value.trim();
      const data = document.getElementById('atdData').value;
      const horario = document.getElementById('atdHorario').value;
      const obs = document.getElementById('atdObs').value.trim();
      const recorrencia = document.getElementById('atdRecorrencia').value;
      if (!aluno || !prof || !data || !horario) return showToast('Preencha aluno, profissional, data e horário.');
      if (recorrencia === 'nao') {
        criarAtendimento({ alunoNome: aluno, profissionalNome: prof, data, horario, observacao: obs });
        registrarHistorico({ modulo: 'atendimentos', acao: 'criação', descricao: `Atendimento de "${aluno}" com "${prof}" criado para ${formatDateBR(data)} ${horario}.` });
        showToast('✓ Atendimento adicionado.');
      } else {
        const ate = recorrencia === 'semanal_ate' ? document.getElementById('atdRecorrenciaAte').value : null;
        const criados = criarAtendimentosRecorrentes({ alunoNome: aluno, profissionalNome: prof, data, horario, observacao: obs, ate });
        registrarHistorico({ modulo: 'atendimentos', acao: 'criação', descricao: `Programação recorrente de "${aluno}" com "${prof}" criada (${criados.length} ocorrência(s), ${horario}).` });
        showToast(`✓ ${criados.length} atendimento(s) recorrentes adicionados.`);
      }
      closeModal();
      renderAtendimentos();
    } else {
      let criados = 0;
      document.querySelectorAll('.atd-lote-linha').forEach(linha => {
        const aluno = linha.querySelector('.atdLoteAluno').value.trim();
        const prof = linha.querySelector('.atdLoteProf').value.trim();
        const diaIdx = Number(linha.querySelector('.atdLoteDia').value);
        const horario = linha.querySelector('.atdLoteHorario').value;
        if (!aluno || !prof || !horario) return;
        const data = atendDatasDaSemana(atendSemanaAtual)[diaIdx];
        criarAtendimento({ alunoNome: aluno, profissionalNome: prof, data, horario, observacao: '' });
        criados++;
      });
      if (!criados) return showToast('Preencha ao menos uma linha completa.');
      registrarHistorico({ modulo: 'atendimentos', acao: 'criação', descricao: `${criados} atendimento(s) adicionados em lote.` });
      closeModal();
      renderAtendimentos();
      showToast(`✓ ${criados} atendimento(s) adicionados.`);
    }
  });
}

/* -----------------------------------------------------------
   19.8 DUPLICAR SEMANA — copia programação, zera presença
   ----------------------------------------------------------- */
function duplicarSemanaAnterior(){
  confirmAction('Deseja copiar a programação da semana anterior para esta semana?', () => {
    const semanaAnteriorInicio = atendAddDias(atendSemanaAtual, -7);
    const datasAnteriores = atendDatasDaSemana(semanaAnteriorInicio);
    const datasAtuais = atendDatasDaSemana(atendSemanaAtual);
    const anteriores = getAtendimentos().filter(a => datasAnteriores.includes(a.data));
    if (!anteriores.length) { closeModal(); return showToast('Não há atendimentos na semana anterior para copiar.'); }

    let copiados = 0;
    anteriores.forEach(a => {
      const idxDia = datasAnteriores.indexOf(a.data);
      const novaData = datasAtuais[idxDia];
      criarAtendimento({ alunoNome: a.alunoNome, profissionalNome: a.profissionalNome, data: novaData, horario: a.horario, observacao: a.observacao });
      copiados++;
    });
    registrarHistorico({ modulo: 'atendimentos', acao: 'criação', descricao: `${copiados} atendimento(s) copiados da semana anterior (presença não copiada).` });
    renderAtendimentos();
    showToast(`✓ ${copiados} atendimento(s) copiados. Presença começa como "Não informado".`);
  });
}

/* -----------------------------------------------------------
   19.9 FECHAMENTO DA SEMANA
   ----------------------------------------------------------- */
function abrirFechamentoSemana(){
  const datas = atendDatasDaSemana(atendSemanaAtual);
  const daSemana = getAtendimentos().filter(a => datas.includes(a.data));
  const semPresenca = daSemana.filter(a => a.presenca === 'nao_informado');
  const semProfissional = daSemana.filter(a => !a.profissionalNome);
  const semAluno = daSemana.filter(a => !a.alunoNome);
  const pronta = !semPresenca.length && !semProfissional.length && !semAluno.length && daSemana.length > 0;

  const compareceram = daSemana.filter(a => a.presenca === 'veio').length;
  const faltaram = daSemana.filter(a => a.presenca === 'faltou').length;

  openModal('Fechamento da semana', pronta ? `
    <div class="notice-box success">
      🟢 ${daSemana.length} atendimentos registrados<br>
      🟢 ${compareceram} presenças<br>
      🟢 ${faltaram} faltas<br>
      🟢 Todos os horários preenchidos
    </div>
    <p><strong>✓ Semana pronta para relatório</strong></p>
    <div class="modal-actions" style="margin-top:16px">
      <button type="button" class="btn btn-ghost" id="btnFecharFechamento">Fechar</button>
      <button type="button" class="btn btn-primary" id="btnGerarPdfFechamento">📄 Gerar PDF</button>
    </div>
  ` : `
    <div class="notice-box warning">
      <b>⚠️ A semana ainda possui pendências</b><br>
      ${semPresenca.length ? `🔴 ${semPresenca.length} atendimento(s) sem presença registrada<br>` : ''}
      ${semProfissional.length ? `🔴 ${semProfissional.length} horário(s) sem profissional<br>` : ''}
      ${semAluno.length ? `🔴 ${semAluno.length} atendimento(s) sem aluno<br>` : ''}
      ${!daSemana.length ? '🔴 Nenhum atendimento cadastrado nesta semana<br>' : ''}
    </div>
    <div class="modal-actions" style="margin-top:16px">
      <button type="button" class="btn btn-ghost" id="btnFecharFechamento">Fechar</button>
      <button type="button" class="btn btn-primary" id="btnGerarPdfFechamento">📄 Gerar PDF mesmo assim</button>
    </div>
  `);
  document.getElementById('btnFecharFechamento').addEventListener('click', closeModal);
  document.getElementById('btnGerarPdfFechamento').addEventListener('click', () => { closeModal(); gerarPdfAtendimentos(datas[0], datas[datas.length-1]); });
}

/* -----------------------------------------------------------
   19.10 RELATÓRIO PDF — reaproveita cabeçalho institucional
   e o CSS de página A4 já usados pelo Gerador de Documentos.
   ----------------------------------------------------------- */
async function gerarPdfAtendimentos(dataInicio, dataFim){
  const todos = getAtendimentos().filter(a => a.data >= dataInicio && a.data <= dataFim).sort((a,b) => (a.data+a.horario).localeCompare(b.data+b.horario));
  const cabecalho = await montarCabecalhoInstitucionalHTML();

  const total = todos.length;
  const compareceram = todos.filter(a => a.presenca === 'veio').length;
  const faltaram = todos.filter(a => a.presenca === 'faltou').length;
  const naoInformados = todos.filter(a => a.presenca === 'nao_informado').length;
  const taxa = total ? ((compareceram / total) * 100).toFixed(1).replace('.', ',') : '0,0';

  const porProfissional = {};
  todos.forEach(a => {
    if (!porProfissional[a.profissionalNome]) porProfissional[a.profissionalNome] = { total: 0, presentes: 0, faltas: 0 };
    porProfissional[a.profissionalNome].total++;
    if (a.presenca === 'veio') porProfissional[a.profissionalNome].presentes++;
    if (a.presenca === 'faltou') porProfissional[a.profissionalNome].faltas++;
  });

  const presencaTexto = { veio: '✓ Veio', faltou: '✕ Faltou', nao_informado: 'Não informado' };

  const documentoHTML = `
    <div class="doc-a4-page">
      ${cabecalho}
      <div class="doc-a4-titulo">RELATÓRIO DE ATENDIMENTOS</div>
      <p style="text-align:center;font-size:11pt;margin-bottom:20px">Período: ${formatDateBR(dataInicio)} a ${formatDateBR(dataFim)}</p>
      <table style="width:100%;border-collapse:collapse;font-size:10pt">
        <thead><tr style="border-bottom:1.5px solid #000">
          <th style="text-align:left;padding:4px">Data</th><th style="text-align:left;padding:4px">Horário</th>
          <th style="text-align:left;padding:4px">Aluno</th><th style="text-align:left;padding:4px">Profissional</th>
          <th style="text-align:left;padding:4px">Presença</th><th style="text-align:left;padding:4px">Observação</th>
        </tr></thead>
        <tbody>
          ${todos.map(a => `<tr style="border-bottom:1px solid #ccc">
            <td style="padding:4px">${formatDateBR(a.data)}</td><td style="padding:4px">${escapeHTML(a.horario)}</td>
            <td style="padding:4px">${escapeHTML(a.alunoNome)}</td><td style="padding:4px">${escapeHTML(a.profissionalNome)}</td>
            <td style="padding:4px">${presencaTexto[a.presenca] || ''}</td><td style="padding:4px">${escapeHTML(a.observacao || '')}</td>
          </tr>`).join('')}
        </tbody>
      </table>
      <div style="margin-top:24px;font-size:11pt">
        <strong>RESUMO</strong><br>
        Total de atendimentos: ${total}<br>
        Compareceram: ${compareceram}<br>
        Não compareceram: ${faltaram}<br>
        Não informados: ${naoInformados}<br>
        Taxa de presença: ${taxa}%
      </div>
      ${Object.keys(porProfissional).length ? `<div style="margin-top:16px;font-size:11pt">
        <strong>RESUMO POR PROFISSIONAL</strong>
        <table style="width:100%;border-collapse:collapse;margin-top:6px">
          <thead><tr style="border-bottom:1px solid #000"><th style="text-align:left;padding:4px">Profissional</th><th style="text-align:left;padding:4px">Atendimentos</th><th style="text-align:left;padding:4px">Presenças</th><th style="text-align:left;padding:4px">Faltas</th></tr></thead>
          <tbody>${Object.entries(porProfissional).map(([nome, s]) => `<tr><td style="padding:4px">${escapeHTML(nome)}</td><td style="padding:4px">${s.total}</td><td style="padding:4px">${s.presentes}</td><td style="padding:4px">${s.faltas}</td></tr>`).join('')}</tbody>
        </table>
      </div>` : ''}
      <div class="doc-a4-assinatura">
        <div class="doc-a4-linha-assinatura">_________________________</div>
        <div>Responsável pelo relatório</div>
      </div>
      <div class="doc-a4-assinatura">
        <div class="doc-a4-linha-assinatura">_________________________</div>
        <div>Data: ___/___/______</div>
      </div>
    </div>`;

  openModal('Visualizar relatório', `
    <div class="doc-a4-preview-wrap">${documentoHTML}</div>
    <div class="modal-actions no-print" style="margin-top:16px">
      <button type="button" class="btn btn-ghost" id="btnFecharPreviewAtd">Fechar</button>
      <button type="button" class="btn btn-secondary" id="btnImprimirAtd">🖨 Imprimir</button>
      <button type="button" class="btn btn-primary" id="btnPdfAtd">⭳ Salvar como PDF</button>
    </div>
  `);
  document.getElementById('btnFecharPreviewAtd').addEventListener('click', closeModal);
  document.getElementById('btnImprimirAtd').addEventListener('click', () => imprimirDocumentoGerador(documentoHTML, 'Relatorio_Atendimentos'));
  document.getElementById('btnPdfAtd').addEventListener('click', () => salvarPdfGerador(documentoHTML, 'Relatorio_Atendimentos'));
}

/* -----------------------------------------------------------
   19.10b RELATÓRIO PERSONALIZADO / MENSAL — reaproveita gerarPdfAtendimentos
   ----------------------------------------------------------- */
function abrirRelatorioPersonalizado(){
  const hoje = todayISO();
  const inicioMes = hoje.slice(0, 8) + '01';
  openModal('Relatório de atendimentos', `
    <label>Data inicial:</label>
    <input type="date" id="atdRelDe" class="input" value="${inicioMes}">
    <label>Data final:</label>
    <input type="date" id="atdRelAte" class="input" value="${hoje}">
    <p class="muted" style="margin-top:6px">Dica: para o relatório mensal, use o primeiro e o último dia do mês desejado.</p>
    <div class="modal-actions" style="margin-top:16px">
      <button type="button" class="btn btn-ghost" id="btnCancelarRelAtd">Cancelar</button>
      <button type="button" class="btn btn-primary" id="btnGerarRelAtd">Gerar PDF</button>
    </div>
  `);
  document.getElementById('btnCancelarRelAtd').addEventListener('click', closeModal);
  document.getElementById('btnGerarRelAtd').addEventListener('click', () => {
    const de = document.getElementById('atdRelDe').value;
    const ate = document.getElementById('atdRelAte').value;
    if (!de || !ate) return showToast('Informe as duas datas.');
    closeModal();
    gerarPdfAtendimentos(de, ate);
  });
}

/* -----------------------------------------------------------
   19.10c ATALHO NO DASHBOARD — chamado por renderDashboard()
   (03-dashboard.js) se a função existir; bloco ocultável pela
   personalização de dashboard já existente (data-dash-block).
   ----------------------------------------------------------- */
function renderAtendimentosHojeDashboard(){
  const alvo = document.getElementById('atendimentosHojeResumo');
  if (!alvo) return;
  const hoje = todayISO();
  const doDia = getAtendimentos().filter(a => a.data === hoje);
  const compareceram = doDia.filter(a => a.presenca === 'veio').length;
  const faltaram = doDia.filter(a => a.presenca === 'faltou').length;
  const naoInformados = doDia.filter(a => a.presenca === 'nao_informado').length;
  alvo.innerHTML = `
    <div class="stat-card c-primary"><div class="stat-num">${doDia.length}</div><div class="stat-label">Atendimentos de hoje</div></div>
    <div class="stat-card c-ok"><div class="stat-num">${compareceram}</div><div class="stat-label">Compareceram</div></div>
    <div class="stat-card c-danger"><div class="stat-num">${faltaram}</div><div class="stat-label">Faltas</div></div>
    <div class="stat-card c-neutral"><div class="stat-num">${naoInformados}</div><div class="stat-label">Não informados</div></div>`;
}

/* -----------------------------------------------------------
   19.11 NAVEGAÇÃO ENTRE SEMANAS + INICIALIZAÇÃO
   ----------------------------------------------------------- */
function atendSemanaAnterior(){ atendSemanaAtual = atendAddDias(atendSemanaAtual, -7); renderAtendimentos(); }
function atendProximaSemana(){ atendSemanaAtual = atendAddDias(atendSemanaAtual, 7); renderAtendimentos(); }

function initAtendimentos(){
  document.getElementById('btnAtendSemanaAnterior')?.addEventListener('click', atendSemanaAnterior);
  document.getElementById('btnAtendProximaSemana')?.addEventListener('click', atendProximaSemana);
  document.getElementById('btnAtendEscolherSemana')?.addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'date'; input.value = atendSemanaAtual; input.style.position = 'fixed'; input.style.opacity = '0';
    document.body.appendChild(input);
    input.addEventListener('change', () => { atendSemanaAtual = atendSegundaDaSemana(input.value); renderAtendimentos(); input.remove(); });
    input.showPicker ? input.showPicker() : input.click();
  });
  document.getElementById('btnNovoAtendimento')?.addEventListener('click', abrirModalNovoAtendimento);
  document.getElementById('btnDuplicarSemanaAtend')?.addEventListener('click', duplicarSemanaAnterior);
  document.getElementById('btnFechamentoSemana')?.addEventListener('click', abrirFechamentoSemana);
  document.getElementById('btnGerarPdfAtend')?.addEventListener('click', () => {
    const datas = atendDatasDaSemana(atendSemanaAtual);
    gerarPdfAtendimentos(datas[0], datas[datas.length - 1]);
  });
  document.getElementById('btnRelatorioPersonalizadoAtend')?.addEventListener('click', abrirRelatorioPersonalizado);
  document.getElementById('btnGestaoAlunosProfissionais')?.addEventListener('click', abrirGestaoAlunosProfissionais);
  document.querySelectorAll('#filtrosAtendimentos [data-filter]').forEach(el => {
    el.addEventListener('input', renderAtendimentos);
    el.addEventListener('change', renderAtendimentos);
  });
}
initAtendimentos();

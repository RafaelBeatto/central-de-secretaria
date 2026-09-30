/* ---------------------------------------------------------
   21. CENTRAL DE PENDÊNCIAS
   --------------------------------------------------------- */

/* Um atendimento só é considerado pendência quando a data dele já chegou
   (hoje ou antes). Usa a mesma comparação de data real (daysDiffFromToday)
   já usada para classificar "atrasado" logo abaixo, em vez de comparar
   texto (a.data <= hojeIso) — isso evita divergência com atendimentos
   antigos cuja data não esteja perfeitamente no formato AAAA-MM-DD. */
function atendimentoDataJaChegou(a){
  const dias = daysDiffFromToday(a.data);
  return dias !== null && dias <= 0;
}

function coletarTodasPendencias(){
  const pendencias = [];
  const solicitacoes = DB.getAll('solicitacoes');
  const documentos = DB.getAll('documentos');
  const eventos = DB.getAll('eventos');

  // Documentos vencidos (URGENTE)
  documentos.filter(d => situacaoDocumento(d).chave === 'vencido').forEach(d => {
    pendencias.push({
      id: `doc-vencido-${d.id}`,
      tipo: 'documento_vencido',
      prioridade: 'urgente',
      titulo: `Documento vencido: ${d.nome}`,
      descricao: `Venceu em ${formatDateBR(d.dataValidade)}`,
      data: d.dataValidade,
      origem: { modulo: 'documentos', id: d.id, funcao: () => abrirDetalheDocumento(d.id) },
      icon: '🔴'
    });
  });

  // Documentos vencendo em até 7 dias (ATENÇÃO)
  documentos.filter(d => {
    const s = situacaoDocumento(d);
    return s.chave === 'vencendo' && daysDiffFromToday(d.dataValidade) <= 7;
  }).forEach(d => {
    const dias = daysDiffFromToday(d.dataValidade);
    pendencias.push({
      id: `doc-vencendo-${d.id}`,
      tipo: 'documento_vencendo',
      prioridade: 'atencao',
      titulo: `Documento vencendo: ${d.nome}`,
      descricao: `Vence em ${formatDateBR(d.dataValidade)} (${dias} dia${dias===1?'':'s'})`,
      data: d.dataValidade,
      origem: { modulo: 'documentos', id: d.id, funcao: () => abrirDetalheDocumento(d.id) },
      icon: '🟠'
    });
  });

  // Tarefas atrasadas (URGENTE) — usa prazoAtividade() para refletir corretamente
  // tarefas recorrentes (cujo prazo real é recorrencia.proxima, não s.prazo).
  const naoConcluidas = solicitacoes.filter(s => !ehTarefaRenovacaoDocumento(s));
  naoConcluidas.filter(solicitacaoAtrasada).forEach(s => {
    const prazo = prazoAtividade(s).data || s.prazo;
    pendencias.push({
      id: `sol-atrasada-${s.id}`,
      tipo: 'tarefa_atrasada',
      prioridade: 'urgente',
      titulo: `Tarefa atrasada: ${s.titulo}`,
      descricao: `${prazoTexto(prazo).texto}${s.responsavel ? ` · ${s.responsavel}` : ''}`,
      data: prazo,
      origem: { modulo: 'solicitacoes', id: s.id, funcao: () => abrirDetalheSolicitacao(s.id) },
      icon: '🔴'
    });
  });

  // Tarefas para hoje (PRÓXIMAS AÇÕES)
  naoConcluidas.filter(s => {
    const pz = prazoAtividade(s);
    return !solicitacaoAtrasada(s) &&
           pz.data &&
           pz.tom !== 'ok' &&
           daysDiffFromToday(pz.data) === 0 &&
           !['Concluída','Cancelada'].includes(s.status);
  }).forEach(s => {
    const prazo = prazoAtividade(s).data;
    pendencias.push({
      id: `sol-hoje-${s.id}`,
      tipo: 'tarefa_hoje',
      prioridade: 'proximo',
      titulo: `Tarefa de hoje: ${s.titulo}`,
      descricao: `Prazo hoje${s.responsavel ? ` · ${s.responsavel}` : ''}`,
      data: prazo,
      origem: { modulo: 'solicitacoes', id: s.id, funcao: () => abrirDetalheSolicitacao(s.id) },
      icon: '🟡'
    });
  });

  // Tarefas próximas (próximos 3 dias) (PRÓXIMAS AÇÕES)
  naoConcluidas.filter(s => {
    const pz = prazoAtividade(s);
    const dias = pz.data ? daysDiffFromToday(pz.data) : null;
    return !solicitacaoAtrasada(s) &&
           pz.data &&
           pz.tom !== 'ok' &&
           dias > 0 &&
           dias <= 3 &&
           !['Concluída','Cancelada'].includes(s.status);
  }).forEach(s => {
    const prazo = prazoAtividade(s).data;
    const dias = daysDiffFromToday(prazo);
    pendencias.push({
      id: `sol-proximo-${s.id}`,
      tipo: 'tarefa_proxima',
      prioridade: 'proximo',
      titulo: `Prazo próximo: ${s.titulo}`,
      descricao: `Em ${dias} dia${dias===1?'':'s'}${s.responsavel ? ` · ${s.responsavel}` : ''}`,
      data: prazo,
      origem: { modulo: 'solicitacoes', id: s.id, funcao: () => abrirDetalheSolicitacao(s.id) },
      icon: '🟡'
    });
  });

  // Eventos de hoje (PRÓXIMAS AÇÕES)
  eventos.filter(e => {
    const eventDate = parseISODate(e.data);
    const today = new Date();
    const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    return eventDate && eventDate.getTime() === todayDate.getTime() && !e.concluido;
  }).forEach(e => {
    pendencias.push({
      id: `evt-hoje-${e.id}`,
      tipo: 'evento_hoje',
      prioridade: 'proximo',
      titulo: `Compromisso de hoje: ${e.titulo}`,
      descricao: [e.horarioInicio || 'sem horário', e.local].filter(Boolean).join(' · '),
      data: e.data,
      origem: { modulo: 'eventos', id: e.id, funcao: () => abrirDetalheEvento(e.id) },
      icon: '🟡'
    });
  });

  // Atendimentos sem presença registrada, da semana atual ou anteriores (ATENÇÃO)
  if (typeof getAtendimentos === 'function') {
    getAtendimentos().filter(a => a.presenca === 'nao_informado' && atendimentoDataJaChegou(a) && !a.remarcadoPara).forEach(a => {
      const atrasado = daysDiffFromToday(a.data) < 0;
      pendencias.push({
        id: `atd-${a.id}`,
        tipo: atrasado ? 'atendimento_atrasado' : 'atendimento_sem_presenca',
        prioridade: atrasado ? 'urgente' : 'atencao',
        titulo: `Atendimento sem presença: ${a.alunoNome} (${a.profissionalNome})`,
        descricao: `${formatDateBR(a.data)} às ${a.horario}`,
        data: a.data,
        origem: { modulo: 'atendimentos', id: a.id, funcao: () => abrirAtendimento(a.id) },
        icon: atrasado ? '🔴' : '🟠'
      });
    });
  }

  // Alunos com faltas seguidas (busca ativa)
  if (typeof atAlunosComFaltasSeguidas === 'function') {
    atAlunosComFaltasSeguidas().forEach(x => {
      pendencias.push({
        id: `faltas-${x.aluno.id}`, tipo: 'aluno_faltas', prioridade: 'atencao',
        titulo: `Faltas seguidas: ${x.aluno.nome}`,
        descricao: `${x.n} faltas seguidas desde ${formatDateBR(x.desde)}${x.motivos.length ? ` · ${x.motivos.join(', ')}` : ''}`,
        data: x.ultima,
        origem: { modulo: 'atendimentos', id: x.aluno.id, funcao: () => abrirHistoricoAluno(x.aluno.id) },
        icon: '🟠'
      });
    });
  }

  // Projetos aguardando alguma ação (🟣): reaproveita o checklist que já existe
  // dentro de cada projeto (projectChecklist), sem duplicar essa lógica.
  pendencias.push(...coletarPendenciasDeProjetos());

  return pendencias;
}

/* Só Execuções (Filhos) — e projetos antigos ainda não classificados,
   para não quebrar o comportamento anterior — passam pelo checklist
   operacional. Recursos (Pais) não têm cotações/documentos/pagamentos
   próprios (isso pertence às Execuções), então rodar o checklist neles
   sempre mostraria as 7 etapas em falso, o que seria exatamente o
   "falso alerta" que o sistema deve evitar. */
function coletarPendenciasDeProjetos(){
  if (typeof projectData !== 'function' || typeof projectChecklist !== 'function') return [];
  const pendencias = [];
  const todos = DB.getAll('projetos');
  const arquivado = p => p.arquivado || (p.paiId && todos.find(x => x.id === p.paiId)?.arquivado);
  // Pendências registradas à mão dentro de um projeto (seção Pendências do projeto).
  todos.filter(p => !arquivado(p) && !['Concluído','Cancelado','Encerrado'].includes(p.status)).forEach(p => {
    (p.pendencias || []).filter(x => x && x.status !== 'Concluída').forEach(x => {
      pendencias.push({
        id: `prj-item-${p.id}-${x.id}`, tipo: 'projeto_item', prioridade: 'atencao',
        titulo: `Pendência do projeto: ${x.titulo}`,
        descricao: [p.nome, x.prioridade && !['Normal','Média'].includes(x.prioridade) && `prioridade ${x.prioridade.toLowerCase()}`].filter(Boolean).join(' · '),
        data: null,
        origem: { modulo: 'projetos', id: p.id, itemId: x.id, funcao: () => abrirDetalheProjeto(p.id, 'pendencias') },
        icon: '🟣'
      });
    });
  });
  todos
    .filter(p => p.tipo !== 'recurso' && !arquivado(p) && !['Concluído', 'Cancelado', 'Suspenso'].includes(p.status))
    .forEach(p => {
      const pd = projectData({ ...p });
      const recurso = pd.paiId ? DB.getById('projetos', pd.paiId) : null;
      const faltando = projectChecklist(pd).filter(item => !item[1]);
      const rotulo = recurso ? 'Execução' : 'Projeto';
      faltando.forEach(([label, , tabKey]) => {
        pendencias.push({
          id: `prj-${p.id}-${tabKey}`,
          tipo: 'projeto_pendencia',
          prioridade: 'atencao',
          titulo: `${rotulo} aguardando ação: ${p.nome} — ${label}`,
          descricao: recurso ? `Recurso: ${recurso.nome} · Execução: ${p.nome} · Etapa pendente: ${label}` : `Etapa pendente: ${label}`,
          data: p.dataFim || null,
          origem: { modulo: 'projetos', id: p.id, funcao: () => abrirDetalheProjeto(p.id, abaProjetoParaPendencia(tabKey)) },
          icon: '🟣'
        });
      });
    });
  return pendencias;
}

/* ---------------------------------------------------------
   21.1 CENTRAL DE AÇÕES (Dashboard)
   Reclassifica os mesmos tipos que coletarTodasPendencias() já detecta,
   nos 4 grupos que a Central de Ações mostra. Não recalcula nada e não
   duplica dado: é só um mapeamento tipo → grupo visual.
   --------------------------------------------------------- */
const CATEGORIA_ACAO_POR_TIPO = {
  tarefa_atrasada: 'atrasado',
  documento_vencido: 'atrasado',
  atendimento_atrasado: 'atrasado',
  tarefa_hoje: 'hoje',
  evento_hoje: 'hoje',
  atendimento_sem_presenca: 'hoje',
  documento_vencendo: 'atencao',
  projeto_pendencia: 'atencao',
  projeto_item: 'atencao',
  aluno_faltas: 'atencao',
  tarefa_proxima: 'proximo'
};
function categoriaAcao(pendencia){
  return CATEGORIA_ACAO_POR_TIPO[pendencia.tipo] || 'atencao';
}


/* ---------------------------------------------------------
   21.2 LINHAS COM AÇÃO RÁPIDA — usadas aqui e no Dashboard
   reg(fn) guarda a ação e devolve um índice; attr é o nome do
   data-atributo que o despachante de cada tela escuta (data-pd, data-db).
   --------------------------------------------------------- */
const PEND_ROTULO_TIPO = {
  tarefa_atrasada:'Tarefa', tarefa_hoje:'Tarefa', tarefa_proxima:'Tarefa',
  documento_vencido:'Documento', documento_vencendo:'Documento',
  atendimento_atrasado:'Atendimento', atendimento_sem_presenca:'Atendimento',
  evento_hoje:'Agenda', projeto_pendencia:'Projeto', projeto_item:'Projeto', aluno_faltas:'Faltas seguidas'
};
const PEND_ORIGEM = {
  tarefa_atrasada:'tarefas', tarefa_hoje:'tarefas', tarefa_proxima:'tarefas',
  documento_vencido:'documentos', documento_vencendo:'documentos',
  atendimento_atrasado:'atendimentos', atendimento_sem_presenca:'atendimentos',
  evento_hoje:'agenda', projeto_pendencia:'projetos', projeto_item:'projetos', aluno_faltas:'atendimentos'
};
const PEND_TOM = { atrasado:'danger', hoje:'hoje', atencao:'warn', proximo:'neutral' };

function pendLinhaHTML(p, reg, attr){
  const a = fn => `data-${attr}="${reg(fn)}"`;
  const titulo = p.titulo.replace(/^[^:]+:\s*/, '');
  let acoes = '';
  if (p.tipo.startsWith('tarefa_')) acoes = `<button type="button" class="btn btn-sm" ${a(() => concluirAtividade(p.origem.id))}>✓ Concluir</button>`;
  else if (p.tipo.startsWith('documento_')) acoes = `<button type="button" class="btn btn-sm" ${a(() => abrirFormRenovarDocumento(p.origem.id))}>Renovar</button>`;
  else if (p.tipo.startsWith('atendimento_')) acoes = `<div class="at-presenca">
      <button type="button" ${a(() => { atualizarPresenca(p.origem.id, 'veio'); renderCurrentView(); })}>✓ Veio</button>
      <button type="button" ${a(() => abrirJustificativaFalta(p.origem.id))}>✕ Faltou</button></div>`;
  else if (p.tipo === 'evento_hoje') acoes = `<button type="button" class="btn btn-sm" ${a(() => marcarEventoConcluido(p.origem.id))}>✓ Feito</button>`;
  else if (p.tipo === 'aluno_faltas') acoes = `<button type="button" class="btn btn-sm" ${a(() => atMarcarContatoFamilia(p.origem.id))}>✓ Família contatada</button>`;
  else if (p.tipo === 'projeto_item') acoes = `<button type="button" class="btn btn-sm" ${a(() => togglePendenciaProjeto(p.origem.id, p.origem.itemId, true))}>✓ Resolvida</button>`;
  return `<div class="db-item t-${PEND_TOM[categoriaAcao(p)]}">
    <button type="button" class="db-item-corpo pd-abrir" ${a(() => p.origem.funcao())}><span class="db-tipo">${PEND_ROTULO_TIPO[p.tipo] || 'Item'}</span><strong>${escapeHTML(titulo)}</strong>${p.descricao ? `<small>${escapeHTML(p.descricao)}</small>` : ''}</button>
    ${acoes ? `<div class="db-item-acoes">${acoes}</div>` : ''}
  </div>`;
}

/* Monta as linhas por categoria. As etapas do checklist de um mesmo
   projeto viram uma linha só; atendimentos sem presença acima de
   maxAtend (por categoria) também, levando à tela de Atendimentos. */
function pendMontarLinhas(pendencias, reg, attr, maxAtend = 5){
  const cats = { atrasado:[], hoje:[], atencao:[], proximo:[] };
  const atend = { atrasado:[], hoje:[] }, porProjeto = new Map();
  pendencias.forEach(p => {
    const cat = categoriaAcao(p);
    if (p.tipo === 'projeto_pendencia') { if (!porProjeto.has(p.origem.id)) porProjeto.set(p.origem.id, []); porProjeto.get(p.origem.id).push(p); return; }
    if (p.tipo.startsWith('atendimento_') && atend[cat]) { atend[cat].push(p); return; }
    (cats[cat] || cats.atencao).push(p);
  });
  const porData = (x, y) => String(x.data || '9999').localeCompare(String(y.data || '9999'));
  const linhas = {};
  Object.keys(cats).forEach(k => { linhas[k] = cats[k].sort(porData).map(p => pendLinhaHTML(p, reg, attr)); });
  Object.entries(atend).forEach(([cat, lista]) => {
    if (lista.length <= maxAtend) { lista.sort(porData).forEach(p => linhas[cat].push(pendLinhaHTML(p, reg, attr))); return; }
    const maisAntigo = lista.map(p => DB.getById('atendimentos', p.origem.id)).filter(Boolean).sort((x, y) => x.data.localeCompare(y.data))[0];
    const ir = reg(() => { atEstado.soPendentes = true; atEstado.dia = 'semana'; atEstado.painel = null; atendSemanaAtual = atendSegundaDaSemana(maisAntigo.data); goToView('atendimentos'); });
    linhas[cat].push(`<div class="db-item t-${PEND_TOM[cat]}">
      <button type="button" class="db-item-corpo pd-abrir" data-${attr}="${ir}"><span class="db-tipo">Atendimentos</span><strong>${lista.length} atendimentos sem presença marcada</strong><small>${cat === 'hoje' ? 'De hoje' : `O mais antigo é de ${formatDateBR(maisAntigo.data)}`}</small></button>
      <div class="db-item-acoes"><button type="button" class="btn btn-sm" data-${attr}="${ir}">Registrar</button></div></div>`);
  });
  porProjeto.forEach(lista => {
    const pr = DB.getById('projetos', lista[0].origem.id);
    const pai = pr?.paiId ? DB.getById('projetos', pr.paiId) : null;
    const etapas = lista.map(p => p.titulo.split(' — ').pop());
    linhas.atencao.push(`<div class="db-item t-warn">
      <button type="button" class="db-item-corpo pd-abrir" data-${attr}="${reg(() => lista[0].origem.funcao())}"><span class="db-tipo">Projeto</span><strong>${escapeHTML(pr?.nome)}${pai ? ` <em>· ${escapeHTML(pai.nome)}</em>` : ''}</strong><small>Falta: ${etapas.map(escapeHTML).join(', ')}</small></button>
    </div>`);
  });
  return linhas;
}

/* ---------------------------------------------------------
   21.3 TELA DE PENDÊNCIAS
   --------------------------------------------------------- */
let pdEstado = { origem:'', busca:'' };
let pdAcoes = [];
function pdAcao(fn){ pdAcoes.push(fn); return pdAcoes.length - 1; }
const PD_SECOES = [
  ['atrasado', 'Atrasado', 'Passou do prazo — resolva primeiro.'],
  ['hoje', 'Para hoje', 'Tarefas, compromissos e atendimentos de hoje.'],
  ['atencao', 'Precisa de atenção', 'Documentos perto de vencer e etapas de projetos.'],
  ['proximo', 'Próximos dias', 'Tarefas com prazo nos próximos 3 dias.']
];
const PD_ORIGENS = [['tarefas','Tarefas'],['documentos','Documentos'],['atendimentos','Atendimentos'],['agenda','Agenda'],['projetos','Projetos']];

function renderPendencias(){
  const root = document.getElementById('pdRoot'); if (!root) return;
  pdAcoes = [];
  const todas = coletarTodasPendencias();
  const q = normalizarFiltro(pdEstado.busca);
  const visiveis = todas.filter(p => (!pdEstado.origem || PEND_ORIGEM[p.tipo] === pdEstado.origem)
    && (!q || normalizarFiltro(`${p.titulo} ${p.descricao || ''}`).includes(q)));
  const linhas = pendMontarLinhas(visiveis, pdAcao, 'pd', 8);
  // Conta como a lista mostra: as etapas de um projeto são uma linha só.
  const porOrigem = {}, vistos = new Set();
  todas.forEach(p => {
    if (p.tipo === 'projeto_pendencia') { if (vistos.has(p.origem.id)) return; vistos.add(p.origem.id); }
    const o = PEND_ORIGEM[p.tipo]; porOrigem[o] = (porOrigem[o] || 0) + 1;
  });
  const totalLinhas = Object.values(porOrigem).reduce((a, b) => a + b, 0);
  const conta = k => linhas[k].length;
  const frase = { atrasado: n => n === 1 ? 'atrasado' : 'atrasados', hoje: () => 'para hoje', atencao: n => n === 1 ? 'precisa de atenção' : 'precisam de atenção', proximo: () => 'nos próximos dias' };
  const resumo = PD_SECOES.filter(([k]) => conta(k)).map(([k]) => `<b class="t-${PEND_TOM[k]}">${conta(k)}</b> ${frase[k](conta(k))}`).join(' · ');
  const chip = (v, t, n) => `<button type="button" class="hi-chip ${pdEstado.origem===v?'is-ativo':''}" data-pd-origem="${v}" aria-pressed="${pdEstado.origem===v}">${t}<span>${n}</span></button>`;
  const focoBusca = document.activeElement?.id === 'pdBusca';
  root.innerHTML = `
    <p class="pd-resumo">${todas.length ? (resumo || 'Nada com esses filtros.') : ''}</p>
    ${todas.length ? `<div class="pd-filtros">
      <input type="search" class="input" id="pdBusca" placeholder="Buscar…" value="${escapeHTML(pdEstado.busca)}" aria-label="Buscar pendência">
      <div class="hi-chips">${chip('', 'Tudo', totalLinhas)}${PD_ORIGENS.filter(([k]) => porOrigem[k]).map(([k, t]) => chip(k, t, porOrigem[k])).join('')}</div>
    </div>` : ''}
    ${!todas.length ? '<div class="db-emdia pd-emdia"><strong>✓ Nada pendente</strong><span>Nenhuma tarefa atrasada, documento vencendo, atendimento sem presença ou etapa de projeto esperando.</span></div>'
      : PD_SECOES.filter(([k]) => conta(k)).map(([k, t, dica]) => `<section class="db-card pd-secao">
          <header><h2 class="t-${PEND_TOM[k]}">${t} <span>${conta(k)}</span></h2><small>${dica}</small></header>
          ${linhas[k].join('')}
        </section>`).join('')}`;
  if (focoBusca) { const b = document.getElementById('pdBusca'); b.focus(); b.setSelectionRange(b.value.length, b.value.length); }
}

(function ligarPendencias(){
  const root = document.getElementById('pdRoot'); if (!root) return;
  root.addEventListener('click', e => {
    const o = e.target.closest('[data-pd-origem]');
    if (o) { pdEstado.origem = o.dataset.pdOrigem; renderPendencias(); return; }
    const b = e.target.closest('[data-pd]');
    if (b && root.contains(b)) pdAcoes[Number(b.dataset.pd)]?.();
  });
  root.addEventListener('input', e => { if (e.target.id === 'pdBusca') { pdEstado.busca = e.target.value; renderPendencias(); } });
})();

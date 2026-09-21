/* ---------------------------------------------------------
   21. CENTRAL DE PENDÊNCIAS
   --------------------------------------------------------- */

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
      descricao: `${prazoTexto(prazo).texto} (Responsável: ${s.responsavel || 'Não atribuído'})`,
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
      descricao: `Prazo hoje (Responsável: ${s.responsavel || 'Não atribuído'})`,
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
      descricao: `Em ${dias} dia${dias===1?'':'s'} (Responsável: ${s.responsavel || 'Não atribuído'})`,
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
    return eventDate && eventDate.getTime() === todayDate.getTime() && e.status !== 'Concluído';
  }).forEach(e => {
    pendencias.push({
      id: `evt-hoje-${e.id}`,
      tipo: 'evento_hoje',
      prioridade: 'proximo',
      titulo: `Compromisso de hoje: ${e.titulo}`,
      descricao: `${e.horario || 'Sem horário'} (Local: ${e.local || 'Sem local'})`,
      data: e.data,
      origem: { modulo: 'eventos', id: e.id, funcao: () => abrirDetalheEvento(e.id) },
      icon: '🟡'
    });
  });

  // Atendimentos sem presença registrada, da semana atual ou anteriores (ATENÇÃO)
  if (typeof getAtendimentos === 'function') {
    const hojeIso = todayISO();
    getAtendimentos().filter(a => a.presenca === 'nao_informado' && a.data <= hojeIso && !a.remarcadoPara).forEach(a => {
      const atrasado = daysDiffFromToday(a.data) < 0;
      pendencias.push({
        id: `atd-${a.id}`,
        tipo: atrasado ? 'atendimento_atrasado' : 'atendimento_sem_presenca',
        prioridade: atrasado ? 'urgente' : 'atencao',
        titulo: `Atendimento sem presença: ${a.alunoNome} (${a.profissionalNome})`,
        descricao: `${formatDateBR(a.data)} às ${a.horario}`,
        data: a.data,
        origem: { modulo: 'atendimentos', id: a.id, funcao: () => { goToView('atendimentos'); atendSemanaAtual = atendSegundaDaSemana(a.data); renderAtendimentos(); } },
        icon: atrasado ? '🔴' : '🟠'
      });
    });
  }

  return pendencias;
}

function renderPendencias(){
  const filtros = getFiltrosValores('filtrosPendencias');
  let pendencias = coletarTodasPendencias();

  if (filtros.prioridade) {
    pendencias = pendencias.filter(p => p.prioridade === filtros.prioridade);
  }
  if (filtros.tipo) {
    pendencias = pendencias.filter(p => p.tipo === filtros.tipo);
  }

  // Ordenar por prioridade e depois por data
  const prioridades = { urgente: 0, atencao: 1, proximo: 2 };
  pendencias.sort((a, b) => {
    const priorDiff = (prioridades[a.prioridade] || 9) - (prioridades[b.prioridade] || 9);
    if (priorDiff !== 0) return priorDiff;

    const dataA = parseISODate(a.data)?.getTime() || 0;
    const dataB = parseISODate(b.data)?.getTime() || 0;
    return dataA - dataB;
  });

  const container = document.getElementById('listaPendencias');
  const emptyEl = document.getElementById('vazioPendencias');

  if (!pendencias.length) {
    container.hidden = true;
    emptyEl.hidden = false;
    return;
  }

  container.hidden = false;
  emptyEl.hidden = true;

  // Agrupar por prioridade
  const grupos = {
    urgente: [],
    atencao: [],
    proximo: []
  };
  pendencias.forEach(p => {
    if (grupos[p.prioridade]) grupos[p.prioridade].push(p);
  });

  let html = '';

  if (grupos.urgente.length) {
    html += `<div class="pendencias-group"><div class="pendencias-group-title">🔴 Urgentes (${grupos.urgente.length})</div>`;
    html += grupos.urgente.map((p, i) => `
      <div class="pendencia-card urgente" data-idx="urgente-${i}">
        <div class="pendencia-header">
          <div class="pendencia-title">${escapeHTML(p.titulo)}</div>
          <span class="pendencia-icon">${p.icon}</span>
        </div>
        <div class="pendencia-desc">${escapeHTML(p.descricao)}</div>
        <div class="pendencia-footer">
          <span class="pendencia-date">${formatDateBR(p.data) || 'Sem data'}</span>
          <button class="btn btn-sm btn-primary pendencia-action" data-idx="urgente-${i}">Acessar</button>
        </div>
      </div>
    `).join('');
    html += `</div>`;
  }

  if (grupos.atencao.length) {
    html += `<div class="pendencias-group"><div class="pendencias-group-title">🟠 Atenção (${grupos.atencao.length})</div>`;
    html += grupos.atencao.map((p, i) => `
      <div class="pendencia-card atencao" data-idx="atencao-${i}">
        <div class="pendencia-header">
          <div class="pendencia-title">${escapeHTML(p.titulo)}</div>
          <span class="pendencia-icon">${p.icon}</span>
        </div>
        <div class="pendencia-desc">${escapeHTML(p.descricao)}</div>
        <div class="pendencia-footer">
          <span class="pendencia-date">${formatDateBR(p.data) || 'Sem data'}</span>
          <button class="btn btn-sm btn-primary pendencia-action" data-idx="atencao-${i}">Acessar</button>
        </div>
      </div>
    `).join('');
    html += `</div>`;
  }

  if (grupos.proximo.length) {
    html += `<div class="pendencias-group"><div class="pendencias-group-title">🟡 Próximas ações (${grupos.proximo.length})</div>`;
    html += grupos.proximo.map((p, i) => `
      <div class="pendencia-card proximo" data-idx="proximo-${i}">
        <div class="pendencia-header">
          <div class="pendencia-title">${escapeHTML(p.titulo)}</div>
          <span class="pendencia-icon">${p.icon}</span>
        </div>
        <div class="pendencia-desc">${escapeHTML(p.descricao)}</div>
        <div class="pendencia-footer">
          <span class="pendencia-date">${formatDateBR(p.data) || 'Sem data'}</span>
          <button class="btn btn-sm btn-primary pendencia-action" data-idx="proximo-${i}">Acessar</button>
        </div>
      </div>
    `).join('');
    html += `</div>`;
  }

  container.innerHTML = html;

  // Bindear ações
  document.querySelectorAll('.pendencia-action').forEach(btn => {
    const idx = btn.dataset.idx;
    const [grupo, i] = idx.split('-');
    const p = grupos[grupo][Number(i)];
    if (p && p.origem) {
      btn.addEventListener('click', () => {
        if (p.origem.funcao) p.origem.funcao();
      });
    }
  });
}

// Renderizar pendências ao mudar filtros
document.querySelectorAll('#filtrosPendencias [data-filter]').forEach(el => {
  el.addEventListener('change', renderPendencias);
});

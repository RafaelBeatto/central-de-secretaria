/* ---------------------------------------------------------
   9. DASHBOARD
   --------------------------------------------------------- */
const DASHBOARD_BLOCOS = [
  { key:'stats', label:'Cartões de resumo (totais, pendentes, atrasadas...)' },
  { key:'resumo-hoje', label:'🔴🟠🔵🟣 Resumo do dia (atrasadas, vencendo, hoje, projetos)' },
  { key:'hoje', label:'📅 Hoje (linha do tempo do dia)' },
  { key:'spotlight', label:'Suas prioridades de hoje' },
  { key:'projetos-andamento', label:'📁 Projetos em andamento' },
  { key:'graficos', label:'Gráficos e KPIs' },
  { key:'atencao', label:'O que precisa da sua atenção?' },
  { key:'atividade', label:'Atividade recente' },
  { key:'atendimentos-hoje', label:'Atendimentos de hoje' }
];
function getDashboardConfig(){
  const cfg = DB.getConfig();
  if (!cfg.dashboardBlocos){
    cfg.dashboardBlocos = Object.fromEntries(DASHBOARD_BLOCOS.map(b => [b.key, true]));
    DB.saveConfig(cfg);
  }
  return cfg.dashboardBlocos;
}
function setDashboardConfig(blocos){
  const cfg = DB.getConfig();
  cfg.dashboardBlocos = blocos;
  DB.saveConfig(cfg);
}
function aplicarVisibilidadeDashboard(){
  const blocos = getDashboardConfig();
  document.querySelectorAll('[data-dash-block]').forEach(el => {
    const key = el.dataset.dashBlock;
    el.hidden = blocos[key] === false;
  });
}
function abrirPersonalizarDashboard(){
  const blocos = getDashboardConfig();
  openModal('Personalizar dashboard', `
    <p class="muted" style="margin-bottom:10px">Escolha o que deve aparecer no seu Dashboard. A escolha fica salva neste navegador.</p>
    <div class="checklist-edit">
      ${DASHBOARD_BLOCOS.map(b => `
        <div class="checklist-edit-row">
          <input type="checkbox" id="dashblk_${b.key}" data-dash-toggle="${b.key}" ${blocos[b.key]!==false?'checked':''}>
          <label for="dashblk_${b.key}" style="flex:1">${escapeHTML(b.label)}</label>
        </div>`).join('')}
    </div>
    <div class="modal-actions"><button type="button" class="btn btn-ghost" id="btnFecharPersonalizar">Fechar</button></div>
  `);
  document.querySelectorAll('[data-dash-toggle]').forEach(cb => {
    cb.addEventListener('change', (e) => {
      const blocos = getDashboardConfig();
      blocos[e.target.dataset.dashToggle] = e.target.checked;
      setDashboardConfig(blocos);
      aplicarVisibilidadeDashboard();
    });
  });
  document.getElementById('btnFecharPersonalizar').addEventListener('click', closeModal);
}
document.getElementById('btnPersonalizarDashboard')?.addEventListener('click', abrirPersonalizarDashboard);

function renderDashboard(){
  // Tarefas automáticas de renovação de documento não aparecem no Dashboard
  // (ficam apenas em Pendências e no módulo Documentos).
  const solicitacoes = DB.getAll('solicitacoes').filter(s => !ehTarefaRenovacaoDocumento(s));
  const documentos = DB.getAll('documentos');
  const eventos = DB.getAll('eventos');

  const pendentes = solicitacoes.filter(s => s.status === 'Pendente').length;
  const atrasadas = solicitacoes.filter(solicitacaoAtrasada).length;
  const concluidas = solicitacoes.filter(s => s.status === 'Concluída').length;

  // Documentos vencidos são tratados exclusivamente no módulo Documentos.
  const docsVencendo = documentos.filter(d => situacaoDocumento(d).chave === 'vencendo').length;

  const stats = [
    { label:'Total de solicitações', value: solicitacoes.length, tom:'primary', view:'solicitacoes' },
    { label:'Solicitações pendentes', value: pendentes, tom:'neutral', view:'solicitacoes' },
    { label:'Solicitações atrasadas', value: atrasadas, tom:'danger', view:'solicitacoes' },
    { label:'Solicitações concluídas', value: concluidas, tom:'ok', view:'solicitacoes' },
    { label:'Total de documentos', value: documentos.length, tom:'primary', view:'documentos' },
    { label:'Documentos vencendo', value: docsVencendo, tom:'warn', view:'documentos' }
  ];

  document.getElementById('statGrid').innerHTML = stats.map(s => `
    <div class="stat-card c-${s.tom}" data-view="${s.view}">
      <div class="stat-num">${s.value}</div>
      <div class="stat-label">${s.label}</div>
    </div>
  `).join('');
  document.querySelectorAll('#statGrid .stat-card').forEach(el => {
    el.addEventListener('click', () => goToView(el.dataset.view));
  });

  // Renderizar dashboard spotlight operacional
  renderDashboardSpotlight();

  renderResumoHojeCores();
  renderProjetosAndamento();
  renderAttentionList();
  renderActivityList();
  if (typeof renderAtendimentosHojeDashboard === 'function') renderAtendimentosHojeDashboard();
  renderHojeTimeline();
  aplicarVisibilidadeDashboard();
}

/* ---------------------------------------------------------
   9.1 RESUMO DO DIA — "PRECISA DE ATENÇÃO" (Fase 2 e 10)
   Reaproveita a mesma central de pendências usada na view
   Pendências (coletarTodasPendencias), então nunca fica
   desatualizado em relação a ela nem duplica a lógica de cálculo.
   --------------------------------------------------------- */
function renderResumoHojeCores(){
  const box = document.getElementById('resumoHojeCores');
  if (!box) return;
  if (typeof coletarTodasPendencias !== 'function'){ box.innerHTML = ''; return; }

  const pendencias = coletarTodasPendencias();
  const contar = (...tipos) => pendencias.filter(p => tipos.includes(p.tipo)).length;

  const cards = [
    { icon:'🔴', label:'atrasada(s)', valor: contar('tarefa_atrasada','atendimento_atrasado'), tom:'danger', view:'pendencias' },
    { icon:'🟠', label:'documento(s) vencendo/vencido', valor: contar('documento_vencido','documento_vencendo'), tom:'warn', view:'documentos' },
    { icon:'🔵', label:'tarefa(s)/compromisso(s) hoje', valor: contar('tarefa_hoje','evento_hoje'), tom:'primary', view:'agenda' },
    { icon:'🟣', label:'projeto(s) aguardando ação', valor: new Set(pendencias.filter(p=>p.tipo==='projeto_pendencia').map(p=>p.origem.id)).size, tom:'purple', view:'projetos' }
  ];

  box.innerHTML = cards.map(c => `
    <button type="button" class="stat-card c-${c.tom} resumo-hoje-card" data-view="${c.view}">
      <div class="stat-num">${c.icon} ${c.valor}</div>
      <div class="stat-label">${c.label}</div>
    </button>
  `).join('');
  box.querySelectorAll('[data-view]').forEach(el => el.addEventListener('click', () => goToView(el.dataset.view)));
}

/* ---------------------------------------------------------
   9.2 PROJETOS EM ANDAMENTO (Fase 5 e 10)
   Reaproveita projectProgress/projectData/projetoStatusTom,
   já usados no workspace de Projetos — nenhum cálculo novo.
   --------------------------------------------------------- */
function renderProjetosAndamento(){
  const box = document.getElementById('projetosAndamento');
  if (!box) return;
  if (typeof projectData !== 'function' || typeof projectProgress !== 'function'){ box.hidden = true; return; }

  const ativos = DB.getAll('projetos')
    .filter(p => !['Concluído','Cancelado'].includes(p.status))
    .map(p => ({ p, progresso: projectProgress(projectData({ ...p })) }))
    .sort((a,b) => a.progresso - b.progresso)
    .slice(0, 6);

  box.hidden = false;
  if (!ativos.length){
    box.innerHTML = `<div class="panel-head"><h2>📁 Projetos em andamento</h2></div><p class="muted" style="padding:0 4px">Nenhum projeto em andamento no momento.</p>`;
    return;
  }

  box.innerHTML = `
    <div class="panel-head">
      <h2>📁 Projetos em andamento</h2>
      <a href="#" class="link-btn" onclick="goToView('projetos'); return false;">Ver todos os projetos →</a>
    </div>
    <div class="projetos-andamento-list">
      ${ativos.map(({p, progresso}) => `
        <div class="projeto-andamento-item" data-id="${escapeHTML(p.id)}">
          <div class="projeto-andamento-head">
            <strong>${escapeHTML(p.nome)}</strong>
            ${badgeHTML(projetoStatusTom(p.status), p.status || 'Sem status')}
          </div>
          <div class="project-progress"><i style="width:${progresso}%"></i></div>
          <small class="muted">${progresso}% do processo documentado</small>
        </div>
      `).join('')}
    </div>`;
  box.querySelectorAll('.projeto-andamento-item').forEach(el => {
    el.addEventListener('click', () => abrirDetalheProjeto(el.dataset.id));
  });
}

function renderHojeTimeline(){
  const box = document.getElementById('hojeTimeline');
  if (!box) return;
  const hoje = todayISO();
  const itens = [];

  // Agenda: eventos, tarefas da secretaria, documentos e projetos (fonte única já existente)
  if (typeof eventosAgendaCompletos === 'function'){
    eventosAgendaCompletos().filter(e => e.data === hoje).forEach(e => {
      let tipo = 'outro', icone = '🟠';
      if (e._origem === 'secretaria') { tipo = 'tarefa'; icone = '🔵'; }
      else if (e.tipo === 'Reunião' || e.tipo === 'Evento' || e.tipo === 'Compromisso' || e.tipo === 'Visita') { tipo = 'reuniao'; icone = '🟣'; }
      itens.push({
        horario: e.horarioInicio || '',
        icone, tipo,
        titulo: e.titulo,
        sub: e.responsavel ? `Responsável: ${e.responsavel}` : '',
        onClick: () => abrirDetalheEvento(e.id)
      });
    });
  }

  // Atendimentos de hoje (fonte única já existente)
  if (typeof getAtendimentos === 'function'){
    getAtendimentos().filter(a => a.data === hoje).forEach(a => {
      itens.push({
        horario: a.horario || '',
        icone: '🟢', tipo: 'atendimento',
        titulo: a.alunoNome || 'Atendimento',
        sub: a.profissionalNome ? `Profissional: ${a.profissionalNome}` : '',
        onClick: () => { goToView('atendimentos'); atendSemanaAtual = atendSegundaDaSemana(a.data); renderAtendimentos(); }
      });
    });
  }

  if (!itens.length){
    box.innerHTML = `<p class="muted">Nenhuma atividade programada para hoje.</p>`;
    return;
  }

  const comHorario = itens.filter(i => i.horario).sort((a,b) => a.horario.localeCompare(b.horario));
  const semHorario = itens.filter(i => !i.horario);
  const ordenados = [...comHorario, ...semHorario];

  const labelTipo = { tarefa:'Tarefa', reuniao:'Reunião', atendimento:'Atendimento', outro:'Compromisso' };

  box.innerHTML = ordenados.map((i, idx) => `
    <div class="activity-item" data-hoje-idx="${idx}" style="cursor:pointer">
      <strong>${i.horario ? i.horario : 'Sem horário'} — ${i.icone} ${escapeHTML(labelTipo[i.tipo] || 'Compromisso')} — ${escapeHTML(i.titulo)}</strong>
      ${i.sub ? `<small>${escapeHTML(i.sub)}</small>` : ''}
    </div>
  `).join('');

  box.querySelectorAll('[data-hoje-idx]').forEach(el => {
    el.addEventListener('click', () => ordenados[Number(el.dataset.hojeIdx)].onClick());
  });
}

function renderDashboardSpotlight(){
  const solicitacoes = DB.getAll('solicitacoes').filter(s => !ehTarefaRenovacaoDocumento(s));
  const documentos = DB.getAll('documentos');
  const eventos = DB.getAll('eventos');

  const urgentes = [];

  // Urgentes: tarefas atrasadas
  const tarefasAtrasadas = solicitacoes.filter(solicitacaoAtrasada).slice(0, 2);
  tarefasAtrasadas.forEach(s => {
    urgentes.push({
      tipo: 'tarefa',
      titulo: s.titulo,
      subtipo: 'Atrasada',
      icon: '<span class="dot dot-danger"></span>',
      action: () => abrirDetalheSolicitacao(s.id)
    });
  });

  // Documentos vencidos não entram aqui: são tratados apenas no módulo Documentos.

  // Próximas: documentos vencendo (7 dias)
  const docsVencendo7 = documentos.filter(d => {
    const s = situacaoDocumento(d);
    return s.chave === 'vencendo' && daysDiffFromToday(d.dataValidade) <= 7;
  }).slice(0, 2);

  let spotlightHTML = `
    <div class="panel spotlight-panel">
      <div class="panel-head">
        <h2>Suas prioridades de hoje</h2>
        <a href="#" class="link-btn" onclick="goToView('pendencias'); return false;">Ver todas as pendências →</a>
      </div>
  `;

  if (urgentes.length) {
    spotlightHTML += `<div class="spotlight-section urgent">
      <div class="spotlight-title"><span class="dot dot-danger"></span>Urgentes</div>
      <div class="spotlight-items">`;
    urgentes.forEach((item, i) => {
      spotlightHTML += `
        <div class="spotlight-item" data-idx="${i}">
          <div class="spotlight-icon">${item.icon}</div>
          <div class="spotlight-content">
            <div class="spotlight-item-title">${escapeHTML(item.titulo)}</div>
            <div class="spotlight-item-sub">${item.subtipo}</div>
          </div>
          <button class="btn btn-sm spotlight-btn" data-idx="${i}">Ir</button>
        </div>
      `;
    });
    spotlightHTML += `</div></div>`;
  }

  if (docsVencendo7.length) {
    spotlightHTML += `<div class="spotlight-section attention">
      <div class="spotlight-title"><span class="dot dot-warn"></span>Próximas ações</div>
      <div class="spotlight-items">`;
    docsVencendo7.forEach((item, i) => {
      const dias = daysDiffFromToday(item.dataValidade);
      // o índice continua a contagem dos urgentes, para casar com allItems
      const idx = urgentes.length + i;
      spotlightHTML += `
        <div class="spotlight-item" data-idx="${idx}">
          <div class="spotlight-icon"><span class="dot dot-warn"></span></div>
          <div class="spotlight-content">
            <div class="spotlight-item-title">${escapeHTML(item.nome)}</div>
            <div class="spotlight-item-sub">Vence em ${dias} dia${dias===1?'':'s'}</div>
          </div>
          <button class="btn btn-sm spotlight-btn" data-idx="${idx}">Ir</button>
        </div>
      `;
    });
    spotlightHTML += `</div></div>`;
  }

  if (!urgentes.length && !docsVencendo7.length) {
    spotlightHTML += `<p class="muted" style="padding: 16px;">Nenhuma pendência urgente. Continue acompanhando! 🎯</p>`;
  }

  spotlightHTML += `</div>`;

  document.getElementById('dashboardSpotlight').innerHTML = spotlightHTML;

  // Bindear ações
  const allItems = [...urgentes, ...docsVencendo7.map(d => ({
    action: () => abrirDetalheDocumento(d.id)
  }))];

  document.querySelectorAll('.spotlight-btn').forEach(btn => {
    const idx = Number(btn.dataset.idx);
    btn.addEventListener('click', () => {
      if (allItems[idx]) allItems[idx].action();
    });
  });

  document.querySelectorAll('.spotlight-item').forEach(el => {
    const idx = Number(el.dataset.idx);
    el.addEventListener('click', (e) => {
      if (!e.target.closest('.spotlight-btn') && allItems[idx]) {
        allItems[idx].action();
      }
    });
  });
}

/* Reaproveita a central de pendências (coletarTodasPendencias, em
   11-pendencias.js) como fonte única, para que "O que precisa da sua
   atenção?" no Dashboard nunca fique desalinhado com a view Pendências
   nem duplique a lógica de detecção. Durante a primeira renderização
   (antes de 11-pendencias.js carregar) cai num cálculo mínimo local. */
function renderAttentionList(){
  const container = document.getElementById('attentionList');
  const tomPorPrioridade = { urgente:'danger', atencao:'warn', proximo:'warn' };

  let itens;
  if (typeof coletarTodasPendencias === 'function'){
    itens = coletarTodasPendencias().map(p => ({
      tom: tomPorPrioridade[p.prioridade] || 'neutral',
      titulo: `${p.icon} ${p.titulo}`,
      sub: p.descricao,
      action: () => p.origem?.funcao?.()
    }));
  } else {
    // Fallback mínimo enquanto os demais módulos ainda carregam.
    const solicitacoes = DB.getAll('solicitacoes').filter(s => !ehTarefaRenovacaoDocumento(s));
    itens = solicitacoes.filter(solicitacaoAtrasada).map(s => ({
      tom:'danger', titulo: `Solicitação atrasada: ${s.titulo}`,
      sub: prazoTexto(s.prazo).texto, action: () => abrirDetalheSolicitacao(s.id)
    }));
  }

  if (!itens.length){
    container.innerHTML = `<p class="muted">Nenhum item precisa de atenção no momento. 🎉</p>`;
    return;
  }
  container.innerHTML = itens.slice(0,12).map((it,i) => `
    <div class="attn-item" data-idx="${i}">
      <span class="attn-dot ${it.tom}"></span>
      <div class="attn-main">
        <div class="attn-title">${escapeHTML(it.titulo)}</div>
        <div class="attn-sub">${escapeHTML(it.sub)}</div>
      </div>
    </div>
  `).join('');
  container.querySelectorAll('.attn-item').forEach((el,i) => {
    el.addEventListener('click', () => itens[i].action());
  });
}

function renderActivityList(){
  // O registro de auditoria da tarefa automática de renovação continua
  // existindo no Histórico completo; só não aparece neste resumo do Dashboard.
  const historico = DB.getAll('historico')
    .filter(h => !(h.modulo === 'documento' && h.acao === 'renovação'))
    .slice(0, 8);
  const container = document.getElementById('activityList');
  if (!historico.length){
    container.innerHTML = `<p class="muted">Nenhuma atividade registrada ainda.</p>`;
    return;
  }
  container.innerHTML = `<div class="activity-day">Recentes</div>` + historico.map(h => `
    <div class="activity-row">
      <span class="activity-time">${new Date(h.timestamp).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</span>
      <span>${escapeHTML(h.descricao)}</span>
    </div>
  `).join('');
}

/* ---------------------------------------------------------
   10. NOTIFICAÇÕES
   --------------------------------------------------------- */
function renderNotifications(){
  const solicitacoes = DB.getAll('solicitacoes');
  const documentos = DB.getAll('documentos');

  const atrasadas = solicitacoes.filter(solicitacaoAtrasada).length;
  const vencendo7 = documentos.filter(d => {
    const s = situacaoDocumento(d);
    return s.chave === 'vencendo' && daysDiffFromToday(d.dataValidade) <= 7;
  }).length;
  const aguardando = solicitacoes.filter(s => s.status === 'Aguardando').length;

  const notifs = [];
  if (atrasadas) notifs.push({ icon:'<span class="dot dot-danger"></span>', text:`${atrasadas} solicitaç${atrasadas===1?'ão':'ões'} atrasada${atrasadas===1?'':'s'}`, view:'solicitacoes' });
  if (vencendo7) notifs.push({ icon:'<span class="dot dot-warn"></span>', text:`${vencendo7} documento${vencendo7===1?'':'s'} vencendo nos próximos 7 dias`, view:'documentos' });
  if (aguardando) notifs.push({ icon:'<span class="dot dot-primary"></span>', text:`${aguardando} solicitaç${aguardando===1?'ão':'ões'} aguardando ação`, view:'solicitacoes' });

  const badge = document.getElementById('notifBadge');
  if (notifs.length){ badge.hidden = false; badge.textContent = notifs.length; }
  else { badge.hidden = true; }

  const list = document.getElementById('notifList');
  list.innerHTML = notifs.length
    ? notifs.map((n,i) => `<div class="notif-item" data-idx="${i}">${n.icon} ${escapeHTML(n.text)}</div>`).join('')
    : `<div class="notif-item" style="cursor:default">Nenhuma notificação no momento.</div>`;
  list.querySelectorAll('.notif-item[data-idx]').forEach((el,i) => {
    el.addEventListener('click', () => { goToView(notifs[i].view); document.getElementById('notifPanel').hidden = true; });
  });
}
document.getElementById('btnNotif').addEventListener('click', () => {
  const panel = document.getElementById('notifPanel');
  panel.hidden = !panel.hidden;
});
document.getElementById('btnCloseNotif').addEventListener('click', () => {
  document.getElementById('notifPanel').hidden = true;
});

/* ---------------------------------------------------------
   11. HELPERS GERAIS
   --------------------------------------------------------- */
function escapeHTML(str){
  if (str === null || str === undefined) return '';
  return String(str)
    .replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')
    .replaceAll('"','&quot;').replaceAll("'",'&#039;');
}
function badgeHTML(tom, texto){
  return `<span class="badge-pill badge-${tom}">${escapeHTML(texto)}</span>`;
}
function uniqueResponsaveis(...listas){
  const set = new Set();
  listas.forEach(l => l.forEach(item => item.responsavel && set.add(item.responsavel)));
  return [...set].sort();
}


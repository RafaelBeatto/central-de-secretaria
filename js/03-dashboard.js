/* =========================================================
   DASHBOARD — a página de entrada
   Responde três perguntas, sem repetir as outras telas:
   o que está atrasado ou pede atenção (com a ação ali mesmo),
   o que acontece hoje e nos próximos dias, e como vão os projetos.
   Tudo vem das fontes que já existem: coletarTodasPendencias()
   (Pendências), eventosAgendaCompletos() (Agenda), getAtendimentos()
   e recursoResumoFinanceiro() (Projetos).
   ========================================================= */
const dbEsc = s => escapeHTML(s ?? '');
const DB_TIPO_ROTULO = {
  tarefa_atrasada:'Tarefa', documento_vencido:'Documento', documento_vencendo:'Documento',
  atendimento_atrasado:'Atendimento', projeto_pendencia:'Projeto'
};
let dbAcoes = [];
function dbAcao(fn){ dbAcoes.push(fn); return dbAcoes.length - 1; }

function dbSaudacao(){
  const h = new Date().getHours();
  return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
}
function dbDataLonga(iso){
  return parseISODate(iso).toLocaleDateString('pt-BR', { weekday:'long', day:'numeric', month:'long' });
}
function dbDiaCurto(iso){
  const d = daysDiffFromToday(iso);
  if (d === 1) return 'amanhã';
  return parseISODate(iso).toLocaleDateString('pt-BR', { weekday:'short', day:'2-digit', month:'2-digit' }).replace('.', '');
}

/* ---------- Para resolver: atrasados e o que pede atenção ---------- */
function dbParaResolver(pendencias){
  const grupos = { atrasado:[], atencao:[] };
  const atdAtrasados = [], porProjeto = new Map();
  pendencias.forEach(p => {
    const cat = categoriaAcao(p);
    if (!grupos[cat]) return;
    if (p.tipo === 'atendimento_atrasado') { atdAtrasados.push(p); return; }
    if (p.tipo === 'projeto_pendencia') {
      const id = p.origem.id;
      if (!porProjeto.has(id)) porProjeto.set(id, []);
      porProjeto.get(id).push(p);
      return;
    }
    grupos[cat].push(p);
  });
  const ordemData = (a,b) => String(a.data||'9999').localeCompare(String(b.data||'9999'));
  grupos.atrasado.sort(ordemData); grupos.atencao.sort(ordemData);

  const linhas = { atrasado: grupos.atrasado.map(p => dbLinhaPendencia(p)), atencao: grupos.atencao.map(p => dbLinhaPendencia(p)) };

  /* Atendimentos sem presença: poucos → um por linha com Veio/Faltou;
     muitos → uma linha só que leva à tela de atendimentos filtrada. */
  if (atdAtrasados.length <= 2) atdAtrasados.forEach(p => linhas.atrasado.push(dbLinhaPendencia(p)));
  else {
    const maisAntigo = atdAtrasados.map(p => DB.getById('atendimentos', p.origem.id)).filter(Boolean).sort((a,b) => a.data.localeCompare(b.data))[0];
    const ir = dbAcao(() => { atEstado.soPendentes = true; atEstado.dia = 'semana'; atEstado.painel = null; atendSemanaAtual = atendSegundaDaSemana(maisAntigo.data); goToView('atendimentos'); });
    linhas.atrasado.push(`<div class="db-item t-danger">
      <button type="button" class="db-item-corpo" data-db="${ir}"><span class="db-tipo">Atendimentos</span><strong>${atdAtrasados.length} atendimentos sem presença marcada</strong><small>O mais antigo é de ${formatDateBR(maisAntigo.data)}</small></button>
      <div class="db-item-acoes"><button type="button" class="btn btn-sm" data-db="${ir}">Registrar</button></div></div>`);
  }
  /* Projetos: uma linha por projeto, com as etapas que faltam. */
  porProjeto.forEach(lista => {
    const pr = DB.getById('projetos', lista[0].origem.id);
    const etapas = lista.map(p => p.titulo.split(' — ').pop());
    const abrir = dbAcao(() => lista[0].origem.funcao());
    const pai = pr?.paiId ? DB.getById('projetos', pr.paiId) : null;
    linhas.atencao.push(`<div class="db-item t-warn">
      <button type="button" class="db-item-corpo" data-db="${abrir}"><span class="db-tipo">Projeto</span><strong>${dbEsc(pr?.nome)}${pai ? ` <em>· ${dbEsc(pai.nome)}</em>` : ''}</strong><small>Próxima etapa: ${dbEsc(etapas[0])}${etapas.length > 1 ? ` · mais ${etapas.length - 1}` : ''}</small></button>
    </div>`);
  });
  return linhas;
}

function dbLinhaPendencia(p){
  const tom = categoriaAcao(p) === 'atrasado' ? 'danger' : 'warn';
  const abrir = dbAcao(() => p.origem.funcao());
  const titulo = p.titulo.replace(/^[^:]+:\s*/, '');
  let acoes = '';
  if (p.tipo === 'tarefa_atrasada') acoes = `<button type="button" class="btn btn-sm" data-db="${dbAcao(() => concluirAtividade(p.origem.id))}">✓ Concluir</button>`;
  else if (p.tipo === 'documento_vencido' || p.tipo === 'documento_vencendo') acoes = `<button type="button" class="btn btn-sm" data-db="${dbAcao(() => abrirFormRenovarDocumento(p.origem.id))}">Renovar</button>`;
  else if (p.tipo === 'atendimento_atrasado') acoes = `<div class="at-presenca">
      <button type="button" data-db="${dbAcao(() => { atualizarPresenca(p.origem.id, 'veio'); renderDashboard(); })}">✓ Veio</button>
      <button type="button" data-db="${dbAcao(() => abrirJustificativaFalta(p.origem.id))}">✕ Faltou</button></div>`;
  return `<div class="db-item t-${tom}">
    <button type="button" class="db-item-corpo" data-db="${abrir}"><span class="db-tipo">${DB_TIPO_ROTULO[p.tipo] || 'Item'}</span><strong>${dbEsc(titulo)}</strong><small>${dbEsc(p.descricao)}</small></button>
    ${acoes ? `<div class="db-item-acoes">${acoes}</div>` : ''}
  </div>`;
}

/* ---------- Hoje e próximos dias (Agenda + Atendimentos) ---------- */
function dbHojeHTML(agenda){
  const hoje = todayISO();
  const itens = agenda.filter(e => e.data === hoje && e._origem !== 'documento')
    .sort((a,b) => String(a.horarioInicio||'99').localeCompare(String(b.horarioInicio||'99')));
  const atd = getAtendimentos().filter(a => a.data === hoje);
  const r = atd.length ? atResumo(atd) : null;
  const linhas = itens.map(e => {
    const marcavel = e._origem === 'evento' || e._origem === 'secretaria';
    const abrir = dbAcao(() => abrirDetalheEvento(e.id));
    return `<li class="db-agenda-item o-${agGrupoOrigem(e)} ${e.concluido?'is-feito':''}">
      <span class="db-hora">${dbEsc(e.horarioInicio) || '—'}</span>
      ${marcavel ? `<button type="button" class="ag-check ${e.concluido?'is-feito':''}" data-db="${dbAcao(() => marcarEventoConcluido(e.id))}" aria-label="${e.concluido?'Reabrir':'Marcar como feito'}: ${dbEsc(e.titulo)}">${e.concluido?'✓':''}</button>` : '<span class="db-check-vazio"></span>'}
      <button type="button" class="db-agenda-corpo" data-db="${abrir}"><strong>${dbEsc(e.titulo)}</strong><small>${dbEsc([e.tipo, e.local, e.responsavel].filter(Boolean).join(' · '))}</small></button>
    </li>`;
  });
  const atdLinha = r ? (() => {
    const ir = dbAcao(() => { atEstado.dia = hoje; atEstado.painel = null; atEstado.soPendentes = false; atendSemanaAtual = atendSegundaDaSemana(hoje); goToView('atendimentos'); });
    const pct = r.total ? Math.round((r.veio + r.faltou) / r.total * 100) : 0;
    return `<button type="button" class="db-atd" data-db="${ir}">
      <span><strong>Atendimentos de hoje: ${r.total}</strong><small>${r.veio} vieram · ${r.faltou} faltaram${r.semRegistro ? ` · ${r.semRegistro} sem registro` : ''}</small></span>
      <span class="db-medidor" title="${pct}% com presença registrada"><i style="width:${pct}%"></i></span>
    </button>`;
  })() : '';
  if (!linhas.length && !atdLinha) return '<p class="db-nada">Nada marcado para hoje.</p>';
  return `${atdLinha}${linhas.length ? `<ul class="db-agenda">${linhas.join('')}</ul>` : ''}`;
}

function dbProximosHTML(agenda){
  const itens = agenda.filter(e => { const d = daysDiffFromToday(e.data); return d > 0 && d <= 7 && !e.concluido && e._origem !== 'documento'; })
    .sort((a,b) => (a.data + String(a.horarioInicio||'')).localeCompare(b.data + String(b.horarioInicio||'')));
  if (!itens.length) return '<p class="db-nada">Nada nos próximos 7 dias.</p>';
  const mostrar = itens.slice(0, 7);
  return `<ul class="db-agenda">${mostrar.map(e => `<li class="db-agenda-item o-${agGrupoOrigem(e)}">
      <span class="db-hora">${dbEsc(dbDiaCurto(e.data))}</span>
      <span class="db-marca-origem"></span>
      <button type="button" class="db-agenda-corpo" data-db="${dbAcao(() => abrirDetalheEvento(e.id))}"><strong>${dbEsc(e.titulo)}</strong><small>${dbEsc([e.horarioInicio, e.tipo, e.local].filter(Boolean).join(' · '))}</small></button>
    </li>`).join('')}</ul>
    ${itens.length > mostrar.length ? `<button type="button" class="db-mais" data-db="${dbAcao(() => { agEstado.modo = 'lista'; goToView('agenda'); })}">+ ${itens.length - mostrar.length} na Agenda →</button>` : ''}`;
}

/* ---------- Projetos em andamento ---------- */
function dbProjetosHTML(){
  if (typeof recursoResumoFinanceiro !== 'function') return '';
  const todos = DB.getAll('projetos');
  const recursos = todos.filter(p => p.tipo === 'recurso' && !p.arquivado && p.status !== 'Encerrado');
  const legados = todos.filter(p => !p.tipo && !p.arquivado && !['Concluído','Cancelado'].includes(p.status));
  if (!recursos.length && !legados.length) return '';
  const linhaR = r => {
    const f = recursoResumoFinanceiro(r);
    const pct = f.recebido > 0 ? Math.min(100, Math.round(f.executado / f.recebido * 100)) : 0;
    const prazo = r.dataFim ? daysDiffFromToday(r.dataFim) : null;
    return `<button type="button" class="db-projeto" data-db="${dbAcao(() => abrirDetalheProjeto(r.id))}">
      <span class="db-projeto-nome"><strong>${dbEsc(r.nome)}</strong><small>${f.qtdExecucoes} execuç${f.qtdExecucoes===1?'ão':'ões'}${prazo !== null ? ` · ${prazo < 0 ? `terminou em ${formatDateBR(r.dataFim)}` : `termina em ${formatDateBR(r.dataFim)}`}` : ''}</small></span>
      <span class="db-projeto-valor"><span class="db-medidor"><i style="width:${pct}%"></i></span><small>${formatMoney(f.executado)} de ${formatMoney(f.recebido)} · ${pct}%</small></span>
    </button>`;
  };
  const linhaL = p => {
    const pct = projectProgress(projectData({ ...p }));
    return `<button type="button" class="db-projeto" data-db="${dbAcao(() => abrirDetalheProjeto(p.id))}">
      <span class="db-projeto-nome"><strong>${dbEsc(p.nome)}</strong><small>Projeto antigo · ainda sem recurso</small></span>
      <span class="db-projeto-valor"><span class="db-medidor"><i style="width:${pct}%"></i></span><small>${pct}% do processo documentado</small></span>
    </button>`;
  };
  return `<section class="db-card db-projetos">
    <header><h2>Projetos em andamento</h2><button type="button" class="db-link" data-db="${dbAcao(() => goToView('projetos'))}">Ver projetos →</button></header>
    ${recursos.map(linhaR).join('')}${legados.map(linhaL).join('')}
  </section>`;
}

/* ---------- Como estamos: três números que nenhuma outra tela resume ---------- */
function dbNumerosHTML(){
  const seteDias = Date.now() - 7 * 86400000;
  const feitas = DB.getAll('historico').filter(h => h.modulo === 'secretaria' && h.acao === 'conclusão' && h.timestamp >= seteDias).length;
  const docs = DB.getAll('documentos').filter(d => d.dataValidade);
  const docsOk = docs.filter(d => situacaoDocumento(d).chave !== 'vencido').length;
  const seg = atendSegundaDaSemana(todayISO()), datas = atendDatasDaSemana(seg);
  const sem = atResumo(getAtendimentos().filter(a => datas.includes(a.data)));
  const numero = (valor, rotulo, detalhe, fn) => `<button type="button" class="db-numero" data-db="${dbAcao(fn)}"><strong>${valor}</strong><span>${rotulo}</span>${detalhe ? `<small>${detalhe}</small>` : ''}</button>`;
  return `<section class="db-numeros" aria-label="Como estamos">
    ${numero(feitas, 'tarefas concluídas', 'nos últimos 7 dias', () => goToView('solicitacoes'))}
    ${numero(docs.length ? `${docsOk}<em>/${docs.length}</em>` : '—', 'documentos em dia', docs.length && docsOk < docs.length ? `${docs.length - docsOk} vencido${docs.length - docsOk === 1 ? '' : 's'}` : (docs.length ? 'todos válidos' : 'nenhum com validade'), () => goToView('documentos'))}
    ${numero(sem.taxa === null ? '—' : sem.taxa + '%', 'presença nos atendimentos', sem.taxa === null ? 'nenhuma presença marcada nesta semana' : 'nesta semana', () => { atEstado.dia = todayISO(); atEstado.painel = null; atendSemanaAtual = seg; goToView('atendimentos'); })}
  </section>`;
}

function renderDashboard(){
  const root = document.getElementById('dbRoot'); if (!root) return;
  // Durante o carregamento inicial alguns módulos ainda não existem;
  // o carregador renderiza de novo quando todos estiverem prontos.
  if (typeof coletarTodasPendencias !== 'function' || typeof getAtendimentos !== 'function') { root.innerHTML = ''; return; }
  dbAcoes = [];
  const hoje = todayISO();
  const pendencias = coletarTodasPendencias();
  const resolver = dbParaResolver(pendencias);
  const agenda = eventosAgendaCompletos();
  const nAtrasado = resolver.atrasado.length, nAtencao = resolver.atencao.length;
  const nHoje = agenda.filter(e => e.data === hoje && e._origem !== 'documento' && !e.concluido).length;

  const resumo = !nAtrasado && !nAtencao
    ? `Tudo em dia${nHoje ? `, e ${nHoje} ${nHoje === 1 ? 'coisa' : 'coisas'} na agenda de hoje` : ''}.`
    : [nAtrasado && `<b class="t-danger">${nAtrasado} atrasado${nAtrasado === 1 ? '' : 's'}</b>`, nAtencao && `<b class="t-warn">${nAtencao} pedindo atenção</b>`, nHoje && `${nHoje} na agenda de hoje`].filter(Boolean).join(' · ');

  const LIMITE = 6;
  const grupo = (chave, titulo, tom) => {
    const l = resolver[chave]; if (!l.length) return '';
    return `<div class="db-grupo"><h3 class="t-${tom}">${titulo} <span>${l.length}</span></h3>${l.slice(0, LIMITE).join('')}
      ${l.length > LIMITE ? `<button type="button" class="db-mais" data-db="${dbAcao(() => goToView('pendencias'))}">+ ${l.length - LIMITE} em Pendências →</button>` : ''}</div>`;
  };

  root.innerHTML = `
    <header class="db-topo">
      <h2>${dbSaudacao()}! <span>${dbEsc(dbDataLonga(hoje))}</span></h2>
      <p>${resumo}</p>
    </header>
    <div class="db-grade">
      <section class="db-card db-resolver">
        <header><h2>Para resolver</h2><button type="button" class="db-link" data-db="${dbAcao(() => goToView('pendencias'))}">Todas as pendências →</button></header>
        ${nAtrasado || nAtencao ? grupo('atrasado', 'Atrasado', 'danger') + grupo('atencao', 'Precisa de atenção', 'warn') : '<div class="db-emdia"><strong>✓ Nada atrasado</strong><span>Nenhuma tarefa, documento, atendimento ou projeto esperando por você.</span></div>'}
      </section>
      <div class="db-lateral">
        <section class="db-card">
          <header><h2>Hoje</h2><button type="button" class="db-link" data-db="${dbAcao(() => { agEstado.modo = 'semana'; agEstado.ref = hoje; goToView('agenda'); })}">Agenda →</button></header>
          ${dbHojeHTML(agenda)}
        </section>
        <section class="db-card">
          <header><h2>Próximos 7 dias</h2></header>
          ${dbProximosHTML(agenda)}
        </section>
      </div>
    </div>
    ${dbProjetosHTML()}
    ${dbNumerosHTML()}`;
}

(function ligarDashboard(){
  const root = document.getElementById('dbRoot'); if (!root) return;
  root.addEventListener('click', e => {
    const b = e.target.closest('[data-db]');
    if (b && root.contains(b)) dbAcoes[Number(b.dataset.db)]?.();
  });
})();

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

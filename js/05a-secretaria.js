/* =========================================================
   SECRETARIA — tarefas e rotinas
   Lista agrupada pelo que importa no dia (atrasadas, hoje, esta
   semana…) com um painel de detalhe na própria página. As tarefas
   continuam na coleção 'solicitacoes'; Agenda, Kanban, Pendências,
   Dashboard e Pesquisa leem as mesmas funções deste arquivo.
   ========================================================= */

/* ---------- regras (usadas por outros módulos) ---------- */
function tarefaRecorrente(s){
  return !!(s.recorrencia && s.recorrencia.frequencia && s.recorrencia.frequencia !== 'Única');
}
function proximaRecorrencia(item){
  const rec=item.recorrencia;
  if(!rec || !rec.frequencia || rec.frequencia==='Única') return item.prazo||null;
  if(rec.proxima) return rec.proxima;
  const base=item.ultimaOcorrencia || item.prazo || todayISO();
  const d=parseISODate(base)||new Date();
  if(rec.frequencia==='Diária') d.setDate(d.getDate()+1);
  else if(rec.frequencia==='Semanal'){
    const alvo=Number(rec.diaSemana ?? d.getDay()); let diff=(alvo-d.getDay()+7)%7; if(diff===0) diff=7; d.setDate(d.getDate()+diff);
  } else if(rec.frequencia==='Mensal'){
    return addMesesISO(isoFromDate(d),1,Math.min(Number(rec.diaMes||d.getDate()),31));
  } else if(rec.frequencia==='Anual'){
    return addMesesISO(isoFromDate(d),12);
  }
  return isoFromDate(d);
}
function proximaRecorrenciaApos(data){
  const rec=data.recorrencia; const atual=parseISODate(data.recorrencia?.proxima || data.prazo || todayISO()) || new Date();
  const d=new Date(atual);
  if(rec.frequencia==='Diária') d.setDate(d.getDate()+1);
  else if(rec.frequencia==='Semanal') d.setDate(d.getDate()+7);
  else if(rec.frequencia==='Mensal') return addMesesISO(isoFromDate(d),1,Number(rec.diaMes||d.getDate()));
  else if(rec.frequencia==='Anual') return addMesesISO(isoFromDate(d),12);
  return isoFromDate(d);
}
function prazoAtividade(s){
  const recorrente = tarefaRecorrente(s);
  const prazo = recorrente ? (s.recorrencia?.proxima || proximaRecorrencia(s)) : s.prazo;
  if (!prazo) return {tom:'neutral',texto:'Sem prazo',data:null};
  const d = daysDiffFromToday(prazo);
  if (recorrente){
    // A próxima ocorrência só vai para o futuro depois que o ciclo atual é
    // feito (concluirAtividade); `ultimaConclusao` evita reabrir no mesmo dia.
    if (d > 0 || (d === 0 && s.ultimaConclusao === todayISO())) return {tom:'ok',texto:`Feita · volta em ${formatDateBR(prazo)}`,data:prazo};
    if (d < 0) return {tom:'danger',texto:`Atrasada · ${formatDateBR(prazo)}`,data:prazo};
    return {tom:'danger',texto:'Hoje',data:prazo};
  }
  if (s.status === 'Concluída') return {tom:'ok',texto:'Concluída',data:prazo};
  if (d < 0 && !['Concluída','Cancelada'].includes(s.status)) return {tom:'danger',texto:`Atrasada · ${formatDateBR(prazo)}`,data:prazo};
  if (d === 0) return {tom:'danger',texto:'Hoje',data:prazo};
  if (d <= 3) return {tom:'warn',texto:`${d} dia${d===1?'':'s'} · ${formatDateBR(prazo)}`,data:prazo};
  return {tom:'neutral',texto:formatDateBR(prazo),data:prazo};
}
function solicitacaoAtrasada(s){
  const p = prazoAtividade(s).data;
  return !!p && daysDiffFromToday(p) < 0 && !['Concluída','Cancelada'].includes(s.status);
}
function badgeStatusSolicitacao(status){
  return ({'Pendente':'neutral','Em andamento':'primary','Aguardando':'warn','Concluída':'ok','Cancelada':'neutral'})[status] || 'neutral';
}
/* 'Normal' é o nome antigo de 'Média' — os dois valem o mesmo. */
function prioridadePeso(p){ return ({Urgente:4,Alta:3,'Média':2,Normal:2,Baixa:1}[p] || 0); }
function badgePrioridade(p){ return ({Baixa:'neutral','Média':'primary',Normal:'primary',Alta:'warn',Urgente:'danger'})[p] || 'neutral'; }

const STATUS_TAREFA = ['Pendente','Em andamento','Aguardando','Concluída','Cancelada'];
const PRIORIDADES_TAREFA = ['Baixa','Média','Alta','Urgente'];

function concluirAtividade(id){
  const item=DB.getById('solicitacoes',id); if(!item) return;
  if(tarefaRecorrente(item)){
    const atual=item.recorrencia?.proxima||item.prazo||todayISO();
    if(daysDiffFromToday(atual)>0 || item.ultimaConclusao===todayISO()){ showToast(`Já feita neste ciclo. Volta em ${formatDateBR(atual)}.`); return; }
    const next=proximaRecorrenciaApos({...item,recorrencia:{...item.recorrencia,proxima:atual}});
    DB.update('solicitacoes',id,{ultimaOcorrencia:atual,ultimaConclusao:todayISO(),recorrencia:{...item.recorrencia,proxima:next},status:'Pendente'});
    registrarHistorico({modulo:'secretaria',acao:'conclusão',descricao:`Tarefa "${item.titulo}" realizada. Próxima ocorrência: ${formatDateBR(next)}.`,refId:id});
    showToast(`✓ Feito. Próxima vez: ${formatDateBR(next)}`);
  } else {
    if(item.status==='Concluída'){ showToast('Esta tarefa já está concluída.'); return; }
    DB.update('solicitacoes',id,{status:'Concluída',dataConclusao:todayISO()});
    registrarHistorico({modulo:'secretaria',acao:'conclusão',descricao:`Tarefa "${item.titulo}" concluída.`,refId:id});
    showToast('✓ Tarefa concluída.');
  }
  renderCurrentView();
}

/* Desfaz um clique errado: reabre a tarefa única ou devolve a rotina
   para a ocorrência que acabou de ser marcada como feita hoje. */
function reabrirAtividade(id){
  const item=DB.getById('solicitacoes',id); if(!item) return;
  if(tarefaRecorrente(item)){
    if(item.ultimaConclusao!==todayISO()) return;
    DB.update('solicitacoes',id,{ultimaConclusao:null,recorrencia:{...item.recorrencia,proxima:item.ultimaOcorrencia||item.recorrencia?.proxima}});
  } else {
    DB.update('solicitacoes',id,{status:'Pendente',dataConclusao:null});
  }
  registrarHistorico({modulo:'secretaria',acao:'reabertura',descricao:`Tarefa "${item.titulo}" reaberta.`,refId:id});
  showToast('↩ Tarefa reaberta.');
  renderCurrentView();
}

/* ---------- estado da tela ---------- */
let secEstado = { sel:null, busca:'', responsavel:'', prioridade:'', verConcluidas:false };

function abrirDetalheSolicitacao(id){
  if(!DB.getById('solicitacoes',id)) return;
  secEstado.sel = id;
  if(!document.getElementById('modalBackdrop').hidden) closeModal();
  if(typeof currentView !== 'undefined' && currentView !== 'solicitacoes') goToView('solicitacoes');
  else renderSolicitacoes();
  document.querySelector(`.sec-linha[data-id="${CSS.escape(id)}"]`)?.scrollIntoView({block:'nearest'});
  if(window.innerWidth <= 1100) document.getElementById('secRoot')?.scrollIntoView({block:'start'});
}

/* ---------- agrupamento ---------- */
function secFeitaHoje(s){
  const hoje=todayISO();
  if(s.status==='Cancelada') return false;
  return tarefaRecorrente(s) ? s.ultimaConclusao===hoje : (s.status==='Concluída' && s.dataConclusao===hoje);
}
function secGrupo(s){
  if(secFeitaHoje(s)) return 'hoje';
  if(s.status==='Cancelada' || (!tarefaRecorrente(s) && s.status==='Concluída')) return 'concluidas';
  const data=prazoAtividade(s).data;
  if(!data) return 'semprazo';
  const d=daysDiffFromToday(data);
  return d<0 ? 'atrasadas' : d===0 ? 'hoje' : d<=7 ? 'semana' : 'depois';
}
const SEC_GRUPOS = [
  ['atrasadas','Atrasadas'],['hoje','Hoje'],['semana','Próximos 7 dias'],['depois','Mais adiante'],['semprazo','Sem prazo'],['concluidas','Concluídas e canceladas']
];

function secTarefasVisiveis(){
  const q=secEstado.busca.trim().toLowerCase();
  return DB.getAll('solicitacoes').filter(s=>!ehTarefaRenovacaoDocumento(s))
    .filter(s=>!q || [s.titulo,s.descricao,s.responsavel,s.categoria].join(' ').toLowerCase().includes(q))
    .filter(s=>!secEstado.responsavel || (s.responsavel||'')===secEstado.responsavel)
    .filter(s=>!secEstado.prioridade || (s.prioridade==='Normal'?'Média':s.prioridade)===secEstado.prioridade);
}

function secOrdenar(a,b){
  const fa=secFeitaHoje(a), fb=secFeitaHoje(b);
  if(fa!==fb) return fa?1:-1;
  const da=prazoAtividade(a).data||'9999', db_=prazoAtividade(b).data||'9999';
  if(da!==db_) return da<db_?-1:1;
  const ha=a.horario||a.recorrencia?.horario||'99', hb=b.horario||b.recorrencia?.horario||'99';
  if(ha!==hb) return ha<hb?-1:1;
  return prioridadePeso(b.prioridade)-prioridadePeso(a.prioridade) || String(a.titulo).localeCompare(String(b.titulo),'pt-BR');
}

/* ---------- desenho ---------- */
const secEsc = s => escapeHTML(s ?? '');
const SEC_DIAS = ['dom','seg','ter','qua','qui','sex','sáb'];

function secQuando(s, grupo){
  const data=prazoAtividade(s).data;
  const hora=s.horario||s.recorrencia?.horario||'';
  if(grupo==='concluidas') return s.status==='Cancelada' ? 'Cancelada' : (s.dataConclusao ? formatDateBR(s.dataConclusao) : 'Concluída');
  if(!data) return '';
  const d=daysDiffFromToday(data);
  if(grupo==='hoje') return secFeitaHoje(s) ? 'Feita' : hora;
  if(d<0) return d===-1 ? 'Ontem' : `Há ${-d} dias`;
  if(d===1) return 'Amanhã' + (hora?` · ${hora}`:'');
  const dt=parseISODate(data);
  return (d<=7 ? `${SEC_DIAS[dt.getDay()]}, ` : '') + formatDateBR(data).slice(0,5) + (d>300 ? '/'+data.slice(0,4) : '');
}

function secLinhaHTML(s, grupo){
  const rec=tarefaRecorrente(s);
  const feita=secFeitaHoje(s) || grupo==='concluidas';
  const futuraRotina=rec && !feita && daysDiffFromToday(prazoAtividade(s).data||todayISO())>0;
  const prog=subtarefasProgresso(s);
  const pri=s.prioridade==='Normal'?'Média':s.prioridade;
  const meta=[
    s.responsavel && `<span>${secEsc(s.responsavel)}</span>`,
    s.categoria && `<span>${secEsc(s.categoria)}</span>`,
    rec && `<span class="sec-rotina">↻ ${secEsc(s.recorrencia.frequencia)}</span>`,
    prog.total && `<span>☑ ${prog.feitas}/${prog.total}</span>`,
    ['Em andamento','Aguardando'].includes(s.status) && `<span class="sec-status tom-${badgeStatusSolicitacao(s.status)}">${secEsc(s.status)}</span>`
  ].filter(Boolean).join('');
  const marca = feita
    ? `<button type="button" class="sec-check is-feita" data-sec="reabrir" data-id="${secEsc(s.id)}" aria-label="Reabrir ${secEsc(s.titulo)}" title="${s.status==='Cancelada'?'Reativar':'Desfazer'}">✓</button>`
    : `<button type="button" class="sec-check ${futuraRotina?'is-bloqueada':''}" data-sec="concluir" data-id="${secEsc(s.id)}" aria-label="${rec?'Marcar como feita hoje':'Concluir'}: ${secEsc(s.titulo)}" ${futuraRotina?`disabled title="Próxima vez: ${formatDateBR(prazoAtividade(s).data)}"`:''}></button>`;
  return `<div class="sec-linha ${feita?'is-feita':''} ${s.status==='Cancelada'?'is-cancelada':''} ${secEstado.sel===s.id?'is-sel':''}" data-id="${secEsc(s.id)}">
    ${marca}
    <button type="button" class="sec-linha-corpo" data-sec="abrir" data-id="${secEsc(s.id)}">
      <span class="sec-titulo">${secEsc(s.titulo)}</span>
      ${meta?`<span class="sec-meta">${meta}</span>`:''}
    </button>
    <span class="sec-lado">${['Alta','Urgente'].includes(pri) && !feita ? `<span class="sec-pri tom-${badgePrioridade(pri)}">${pri}</span>` : ''}<span class="sec-quando ${grupo==='atrasadas'?'is-atrasada':''}">${secQuando(s, grupo)}</span></span>
  </div>`;
}

function secListaHTML(){
  const tarefas=secTarefasVisiveis();
  const grupos={}; tarefas.forEach(s=>{ (grupos[secGrupo(s)] = grupos[secGrupo(s)] || []).push(s); });
  const total=DB.getAll('solicitacoes').filter(s=>!ehTarefaRenovacaoDocumento(s)).length;
  if(!total) return `<div class="sec-vazio"><strong>Nenhuma tarefa ainda</strong><span>Escreva acima o que precisa ser feito e aperte Enter. Para algo que se repete — como enviar recado aos pais toda sexta — use “Mais opções”.</span></div>`;
  const blocos=SEC_GRUPOS.map(([k,rotulo])=>{
    const itens=(grupos[k]||[]).sort(secOrdenar);
    if(!itens.length) return '';
    if(k==='concluidas'){
      const recentes=[...itens].sort((a,b)=>String(b.dataConclusao||'').localeCompare(String(a.dataConclusao||''))).slice(0,50);
      return `<section class="sec-grupo is-concluidas"><button type="button" class="sec-grupo-head" data-sec="toggle-concluidas" aria-expanded="${secEstado.verConcluidas}"><h3>${rotulo}</h3><span class="sec-cont">${itens.length}</span><span class="sec-seta">${secEstado.verConcluidas?'▾':'▸'}</span></button>${secEstado.verConcluidas?recentes.map(s=>secLinhaHTML(s,k)).join(''):''}</section>`;
    }
    const abertas=itens.filter(s=>!secFeitaHoje(s)).length;
    const feitas=itens.length-abertas;
    return `<section class="sec-grupo is-${k}"><div class="sec-grupo-head"><h3>${rotulo}</h3><span class="sec-cont">${abertas}</span>${feitas?`<span class="sec-feitas">${feitas} feita${feitas===1?'':'s'}</span>`:''}</div>${itens.map(s=>secLinhaHTML(s,k)).join('')}</section>`;
  }).join('');
  return blocos || `<div class="sec-vazio"><span>Nenhuma tarefa com esses filtros.</span></div>`;
}

function secDetalheHTML(s){
  const rec=tarefaRecorrente(s);
  const pz=prazoAtividade(s);
  const feita=secFeitaHoje(s) || (!rec && s.status==='Concluída');
  const pri=s.prioridade==='Normal'?'Média':(s.prioridade||'Média');
  const hist=DB.getAll('historico').filter(h=>h.refId===s.id).sort((a,b)=>b.timestamp-a.timestamp);
  const relacionados=typeof renderRelacionados==='function' ? renderRelacionados('solicitacao', s.id) : '';
  const acaoPrincipal = s.status==='Cancelada'
    ? `<button type="button" class="btn btn-sm" data-sec="status" data-valor="Pendente" data-id="${secEsc(s.id)}">↩ Reativar</button>`
    : feita ? `<button type="button" class="btn btn-sm" data-sec="reabrir" data-id="${secEsc(s.id)}">↩ Reabrir</button>`
    : `<button type="button" class="btn btn-primary btn-sm" data-sec="concluir" data-id="${secEsc(s.id)}" ${rec && pz.tom==='ok'?'disabled':''}>${rec?'✓ Fiz hoje':'✓ Concluir'}</button>`;
  return `<div class="sec-det-topo">
      <button type="button" class="sec-voltar" data-sec="fechar">← Tarefas</button>
      <button type="button" class="sec-fechar" data-sec="fechar" aria-label="Fechar detalhe">✕</button>
    </div>
    <span class="sec-codigo">${secEsc(s.id)}${ehTarefaRenovacaoDocumento(s)?' · criada pelo módulo Documentos':''}</span>
    <h2>${secEsc(s.titulo)}</h2>
    <div class="sec-det-acoes">${acaoPrincipal}
      <button type="button" class="btn btn-sm" data-sec="editar" data-id="${secEsc(s.id)}">Editar</button>
      <button type="button" class="btn btn-sm sec-perigo" data-sec="excluir" data-id="${secEsc(s.id)}">Excluir</button>
    </div>
    <dl class="sec-fatos">
      <div><dt>${rec?'Próxima vez':'Prazo'}</dt><dd>${pz.data?`${formatDateBR(pz.data)}${(s.horario||s.recorrencia?.horario)?' · '+secEsc(s.horario||s.recorrencia.horario):''}`:'Sem prazo'} ${pz.data?badgeHTML(pz.tom, pz.tom==='ok'?(rec?'em dia':'concluída'):pz.tom==='danger'?(daysDiffFromToday(pz.data)<0?'atrasada':'hoje'):pz.tom==='warn'?'em breve':'no prazo'):''}</dd></div>
      <div><dt>Prioridade</dt><dd><select class="input sec-select" data-sec-campo="prioridade" data-id="${secEsc(s.id)}" aria-label="Prioridade">${PRIORIDADES_TAREFA.map(p=>`<option ${p===pri?'selected':''}>${p}</option>`).join('')}</select></dd></div>
      ${rec
        ? `<div><dt>Rotina</dt><dd>↻ ${secEsc(s.recorrencia.frequencia)}${s.status==='Cancelada'?' · encerrada':''}${s.ultimaOcorrencia?` · última vez ${formatDateBR(s.ultimaOcorrencia)}`:''}<br>${s.status==='Cancelada'?'':`<button type="button" class="sec-link" data-sec="status" data-valor="Cancelada" data-id="${secEsc(s.id)}">Encerrar rotina</button>`}</dd></div>`
        : `<div><dt>Situação</dt><dd><select class="input sec-select" data-sec-campo="status" data-id="${secEsc(s.id)}" aria-label="Situação">${STATUS_TAREFA.map(st=>`<option ${st===(s.status||'Pendente')?'selected':''}>${st}</option>`).join('')}</select></dd></div>`}
      <div><dt>Responsável</dt><dd>${secEsc(s.responsavel||'—')}</dd></div>
      <div><dt>Categoria</dt><dd>${secEsc(s.categoria||'—')}</dd></div>
      ${s.solicitante?`<div><dt>Solicitante</dt><dd>${secEsc(s.solicitante)}</dd></div>`:''}
    </dl>
    ${s.descricao?`<div class="sec-descricao">${secEsc(s.descricao)}</div>`:''}
    ${s.observacoes?`<div class="sec-descricao">${secEsc(s.observacoes)}</div>`:''}
    ${subtarefasHTML('solicitacoes', s)}
    ${relacionados}
    <h4 class="sec-subtitulo">Histórico</h4>
    ${hist.length?`<ol class="sec-hist">${hist.slice(0,30).map(h=>`<li><time>${timestampToBR(h.timestamp)}</time>${secEsc(h.descricao)}</li>`).join('')}</ol>`:'<p class="sec-nada">Sem registros ainda.</p>'}`;
}

function renderSolicitacoes(){
  const root=document.getElementById('secRoot'); if(!root) return;
  const sel=secEstado.sel ? DB.getById('solicitacoes', secEstado.sel) : null;
  if(!sel) secEstado.sel=null;
  const responsaveis=[...new Set(DB.getAll('solicitacoes').map(s=>s.responsavel).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'pt-BR'));
  const focoBusca=document.activeElement?.id==='secBusca';
  root.innerHTML=`<div class="sec-layout ${sel?'tem-detalhe':''}">
    <div class="sec-principal">
      <form class="sec-add" id="secAdd" autocomplete="off">
        <span class="sec-add-mais" aria-hidden="true">＋</span>
        <input class="sec-add-titulo" id="secAddTitulo" placeholder="O que precisa ser feito? (Enter para adicionar)" aria-label="Nova tarefa">
        <input type="date" class="sec-add-data" id="secAddData" value="${todayISO()}" aria-label="Prazo">
        <button type="submit" class="btn btn-primary btn-sm">Adicionar</button>
        <button type="button" class="sec-link" data-sec="nova-completa">Mais opções</button>
      </form>
      <div class="sec-filtros">
        <input type="search" class="input" id="secBusca" placeholder="Buscar tarefa…" value="${secEsc(secEstado.busca)}" aria-label="Buscar tarefa">
        ${responsaveis.length?`<select class="input" id="secResp" aria-label="Responsável"><option value="">Todos os responsáveis</option>${responsaveis.map(r=>`<option ${r===secEstado.responsavel?'selected':''}>${secEsc(r)}</option>`).join('')}</select>`:''}
        <select class="input" id="secPri" aria-label="Prioridade"><option value="">Qualquer prioridade</option>${PRIORIDADES_TAREFA.map(p=>`<option ${p===secEstado.prioridade?'selected':''}>${p}</option>`).join('')}</select>
      </div>
      <div id="secLista">${secListaHTML()}</div>
    </div>
    ${sel?`<aside class="sec-detalhe" aria-label="Detalhe da tarefa">${secDetalheHTML(sel)}</aside>`:''}
  </div>`;
  if(focoBusca){ const b=document.getElementById('secBusca'); b.focus(); b.setSelectionRange(b.value.length,b.value.length); }
  if(sel) bindSubtarefasEvents('solicitacoes', sel.id, renderSolicitacoes);
}

/* ---------- ações ---------- */
function secExcluir(id){
  const item=DB.getById('solicitacoes',id); if(!item) return;
  confirmAction(`Excluir a tarefa "${item.titulo}"?`,()=>{
    DB.remove('solicitacoes',id);
    registrarHistorico({modulo:'secretaria',acao:'exclusão',descricao:`Tarefa "${item.titulo}" excluída.`,refId:id});
    if(secEstado.sel===id) secEstado.sel=null;
    showToast('Tarefa excluída.');
    renderSolicitacoes();
  });
}

function secAlterarCampo(id, campo, valor){
  const item=DB.getById('solicitacoes',id); if(!item || item[campo]===valor) return;
  const dados={[campo]:valor};
  if(campo==='status'){ dados.dataConclusao = valor==='Concluída' ? todayISO() : null; }
  DB.update('solicitacoes',id,dados);
  const rotulo = campo==='status' ? (tarefaRecorrente(item) ? (valor==='Cancelada'?'Rotina encerrada':'Rotina reativada') : `Situação alterada para ${valor}`) : `Prioridade alterada para ${valor}`;
  registrarHistorico({modulo:'secretaria',acao:'edição',descricao:`${rotulo}: "${item.titulo}".`,refId:id});
  renderSolicitacoes();
}

function secAdicionarRapido(){
  const titulo=document.getElementById('secAddTitulo').value.trim();
  if(!titulo){ document.getElementById('secAddTitulo').focus(); return; }
  const prazo=document.getElementById('secAddData').value||todayISO();
  const novo={id:DB.nextId('SOL','solicitacao'),titulo,tipo:'Tarefa',prioridade:'Média',descricao:'',responsavel:'',categoria:'',prazo,horario:'',status:'Pendente',recorrencia:null,anexos:[],criadoEm:Date.now(),atualizadoEm:Date.now()};
  DB.insert('solicitacoes',novo);
  registrarHistorico({modulo:'secretaria',acao:'criação',descricao:`Tarefa "${titulo}" criada.`,refId:novo.id});
  renderSolicitacoes();
  document.getElementById('secAddTitulo')?.focus();
}

const SEC_ACOES = {
  'abrir': b => { secEstado.sel = secEstado.sel===b.dataset.id && window.innerWidth>1100 ? null : b.dataset.id; renderSolicitacoes(); if(window.innerWidth<=1100) document.getElementById('secRoot').scrollIntoView({block:'start'}); },
  'fechar': () => { const id=secEstado.sel; secEstado.sel=null; renderSolicitacoes(); document.querySelector(`.sec-linha[data-id="${CSS.escape(id||'')}"]`)?.scrollIntoView({block:'center'}); },
  'concluir': b => concluirAtividade(b.dataset.id),
  'reabrir': b => { const s=DB.getById('solicitacoes',b.dataset.id); if(s?.status==='Cancelada') secAlterarCampo(s.id,'status','Pendente'); else reabrirAtividade(b.dataset.id); },
  'status': b => secAlterarCampo(b.dataset.id,'status',b.dataset.valor),
  'editar': b => openFormSolicitacao(b.dataset.id),
  'excluir': b => secExcluir(b.dataset.id),
  'nova-completa': () => openFormSolicitacao(null, document.getElementById('secAddTitulo')?.value.trim()),
  'toggle-concluidas': () => { secEstado.verConcluidas=!secEstado.verConcluidas; renderSolicitacoes(); }
};

(function ligarSecretaria(){
  const root=document.getElementById('secRoot'); if(!root) return;
  root.addEventListener('click', e=>{
    const b=e.target.closest('[data-sec]');
    if(!b || !root.contains(b) || b.disabled) return;
    SEC_ACOES[b.dataset.sec]?.(b);
  });
  root.addEventListener('submit', e=>{ if(e.target.id==='secAdd'){ e.preventDefault(); secAdicionarRapido(); } });
  root.addEventListener('input', e=>{
    if(e.target.id!=='secBusca') return;
    secEstado.busca=e.target.value;
    document.getElementById('secLista').innerHTML=secListaHTML();
  });
  root.addEventListener('change', e=>{
    const t=e.target;
    if(t.id==='secResp') secEstado.responsavel=t.value;
    else if(t.id==='secPri') secEstado.prioridade=t.value;
    else if(t.dataset.secCampo) return secAlterarCampo(t.dataset.id, t.dataset.secCampo, t.value);
    else return;
    document.getElementById('secLista').innerHTML=secListaHTML();
  });
})();

/* ---------- formulário completo ---------- */
function openFormSolicitacao(id, tituloInicial=''){
  const item=typeof id==='string' ? DB.getById('solicitacoes',id) : null;
  const rec=item?.recorrencia||{};
  const pri=item?.prioridade==='Normal'?'Média':(item?.prioridade||'Média');
  const horario=item?.horario||rec.horario||'';
  openModal(item?'Editar tarefa':'Nova tarefa',`<form id="formSolicitacao" novalidate><div class="form-grid">
    <div class="field full"><label for="f_titulo">O que precisa ser feito? *</label><input class="input" id="f_titulo" required value="${escapeHTML(item?.titulo||tituloInicial||'')}"></div>
    <div class="field"><label for="f_frequencia">Repete?</label><select class="input" id="f_frequencia">${['Única','Diária','Semanal','Mensal','Anual'].map(x=>`<option value="${x}" ${(rec.frequencia||'Única')===x?'selected':''}>${x==='Única'?'Não, é uma vez só':x}</option>`).join('')}</select></div>
    <div class="field"><label for="f_prioridade">Prioridade</label><select class="input" id="f_prioridade">${PRIORIDADES_TAREFA.map(x=>`<option ${pri===x?'selected':''}>${x}</option>`).join('')}</select></div>
    <div class="field"><label for="f_prazo" id="f_prazo_label">Prazo *</label><input class="input" type="date" id="f_prazo" required value="${item?.prazo||todayISO()}"></div>
    <div class="field"><label for="f_horario">Horário (opcional)</label><input class="input" type="time" id="f_horario" value="${escapeHTML(horario)}"></div>
    <div class="field" id="campoDiaSemana"><label for="f_diaSemana">Toda semana, no dia</label><select class="input" id="f_diaSemana">${['Domingo','Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado'].map((x,i)=>`<option value="${i}" ${Number(rec.diaSemana??1)===i?'selected':''}>${x}</option>`).join('')}</select></div>
    <div class="field" id="campoDiaMes"><label for="f_diaMes">Todo mês, no dia</label><input class="input" type="number" id="f_diaMes" min="1" max="31" value="${rec.diaMes||new Date().getDate()}"></div>
    <div class="field"><label for="f_responsavel">Responsável</label><input class="input" id="f_responsavel" list="f_resp_lista" value="${escapeHTML(item?.responsavel||'')}" placeholder="Ex.: Secretaria"><datalist id="f_resp_lista">${[...new Set(DB.getAll('solicitacoes').map(s=>s.responsavel).filter(Boolean))].map(r=>`<option value="${escapeHTML(r)}">`).join('')}</datalist></div>
    <div class="field"><label for="f_categoria">Categoria</label><input class="input" id="f_categoria" list="f_cat_lista" value="${escapeHTML(item?.categoria||'')}" placeholder="Ex.: administrativo"><datalist id="f_cat_lista">${[...new Set(DB.getAll('solicitacoes').map(s=>s.categoria).filter(Boolean))].map(c=>`<option value="${escapeHTML(c)}">`).join('')}</datalist></div>
    <div class="field full"><label for="f_descricao">Detalhes</label><textarea id="f_descricao">${escapeHTML(item?.descricao||'')}</textarea></div>
    ${item?`<div class="field full"><label>🔗 Vincular a outros registros</label><div class="relacionados-form-section">${renderSelectorRelacionados('solicitacao',item.id,'projeto')}${renderSelectorRelacionados('solicitacao',item.id,'empresa')}</div></div>`:''}
  </div><p class="field-error" id="formErro" hidden></p><div class="modal-actions"><button type="button" class="btn btn-ghost" id="btnCancelarForm">Cancelar</button><button type="submit" class="btn btn-primary">${item?'Salvar alterações':'Criar tarefa'}</button></div></form>`);
  const freqEl=document.getElementById('f_frequencia');
  const ajustar=()=>{ const f=freqEl.value; document.getElementById('campoDiaSemana').hidden=f!=='Semanal'; document.getElementById('campoDiaMes').hidden=f!=='Mensal'; document.getElementById('f_prazo_label').textContent=f==='Única'?'Prazo *':'Primeira vez *'; };
  freqEl.addEventListener('change',ajustar); ajustar();
  document.getElementById('btnCancelarForm').onclick=closeModal;
  document.getElementById('formSolicitacao').addEventListener('submit',e=>{
    e.preventDefault();
    const titulo=document.getElementById('f_titulo').value.trim();
    const prazo=document.getElementById('f_prazo').value;
    const erro=document.getElementById('formErro');
    if(!titulo||!prazo){ erro.hidden=false; erro.textContent=!titulo?'Informe o que precisa ser feito.':'Informe a data.'; return; }
    const freq=freqEl.value;
    const horarioNovo=document.getElementById('f_horario').value||'';
    const mudouRotina = (rec.frequencia||'Única')!==freq || item?.prazo!==prazo;
    const recDados=freq==='Única'?null:{frequencia:freq,horario:horarioNovo||null,diaSemana:Number(document.getElementById('f_diaSemana').value),diaMes:Number(document.getElementById('f_diaMes').value)||new Date().getDate(),proxima:(!mudouRotina&&rec.proxima)?rec.proxima:prazo};
    const dados={titulo,prioridade:document.getElementById('f_prioridade').value,descricao:document.getElementById('f_descricao').value.trim(),responsavel:document.getElementById('f_responsavel').value.trim(),categoria:document.getElementById('f_categoria').value.trim(),prazo,horario:horarioNovo,recorrencia:recDados};
    if(item){
      DB.update('solicitacoes',item.id,dados);
      registrarHistorico({modulo:'secretaria',acao:'edição',descricao:`Tarefa "${dados.titulo}" editada.`,refId:item.id});
      showToast('✓ Tarefa atualizada.');
    } else {
      const novo={id:DB.nextId('SOL','solicitacao'),tipo:'Tarefa',status:'Pendente',...dados,anexos:[],criadoEm:Date.now(),atualizadoEm:Date.now()};
      DB.insert('solicitacoes',novo);
      registrarHistorico({modulo:'secretaria',acao:'criação',descricao:`Tarefa "${novo.titulo}" criada (${freq}).`,refId:novo.id});
      showToast('✓ Tarefa criada.');
      if(currentView==='solicitacoes') secEstado.sel=novo.id;
    }
    closeModal(); renderCurrentView();
  });
  if(item) processarRelacionadosEmForm('solicitacao',item.id,'formSolicitacao');
}

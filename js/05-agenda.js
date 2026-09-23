/* =========================================================
   AGENDA
   Um calendário só para tudo que tem data: eventos, tarefas da
   Secretaria e prazos (vencimento de documentos, início/fim de
   projetos). Semana em colunas, mês compacto e lista dos próximos
   dias, com um painel ao lado mostrando o dia escolhido ou o evento.
   Os eventos continuam na coleção 'eventos'.
   ========================================================= */

const AG_ORIGENS = [['evento','Eventos'],['secretaria','Tarefas'],['prazo','Prazos']];
const AG_DIAS = ['Domingo','Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado'];
const AG_DIAS_CURTOS = ['dom','seg','ter','qua','qui','sex','sáb'];
const AG_MESES = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
const AG_TIPOS = ['Reunião','Atendimento','Compromisso','Evento','Visita','Outro'];
const AG_REPETICOES = [['','Não repete'],['Diária','Todo dia'],['Semanal','Toda semana'],['Mensal','Todo mês'],['Anual','Todo ano']];

let agEstado = { modo:'semana', ref:todayISO(), dia:todayISO(), sel:null, busca:'', ocultas:[] };

/* ---------- utilidades de data ---------- */
function addDaysISO(iso,n){ const d=parseISODate(iso); d.setDate(d.getDate()+n); return isoFromDate(d); }
function agDiasEntre(a,b){ return Math.round((parseISODate(b)-parseISODate(a))/86400000); }
function agInicioSemana(iso){ const d=parseISODate(iso); d.setDate(d.getDate()-((d.getDay()+6)%7)); return isoFromDate(d); }
function agDiaLongo(iso){
  const d=parseISODate(iso);
  return { semana:AG_DIAS[d.getDay()], data:`${d.getDate()} de ${AG_MESES[d.getMonth()]}${d.getFullYear()!==new Date().getFullYear()?' de '+d.getFullYear():''}` };
}
function formatDataAgenda(iso){ if(!iso) return 'Sem data'; const l=agDiaLongo(iso); return `${l.semana}, ${l.data}`; }
function eventoDataHora(e){ return `${e.data}T${e.horarioInicio||'00:00'}`; }
function tipoEventoIcon(t){ return ({'Reunião':'👥','Atendimento':'🤝','Compromisso':'📌','Evento':'🎉','Visita':'🚗','Outro':'📅','Tarefa':'📋','Documento':'📄','Projeto':'📁'}[t]||'📅'); }
function prioridadeAgendaPorData(data, padrao='Média'){
  if(!data) return padrao;
  const dias=daysDiffFromToday(data);
  return dias<0 ? 'Urgente' : dias<=3 ? 'Alta' : dias<=7 ? 'Média' : padrao;
}

/* ---------- tudo que tem data (também usado pelo Dashboard) ---------- */
function eventosAgendaCompletos(){
  const eventos=DB.getAll('eventos').map(e=>({...e,_origem:'evento',_agendaId:e.id}));
  // Tarefas automáticas de renovação de documento e tarefas canceladas não entram.
  const tarefas=DB.getAll('solicitacoes').filter(s=>s.status!=='Cancelada' && prazoAtividade(s).data && !ehTarefaRenovacaoDocumento(s)).map(s=>({
    id:`TASK-${s.id}`, _agendaId:`TASK-${s.id}`, _origem:'secretaria', _taskId:s.id,
    titulo:s.titulo, tipo:'Tarefa', prioridade:s.prioridade||'Média', data:prazoAtividade(s).data,
    horarioInicio:s.horario||s.recorrencia?.horario||'', horarioFim:'', local:'', responsavel:s.responsavel||'',
    participantes:'', descricao:s.descricao||'', concluido:s.status==='Concluída', recorrencia:s.recorrencia||null
  }));
  const documentos=DB.getAll('documentos').filter(d=>d.dataValidade).map(d=>({
    id:`DOC-${d.id}`, _agendaId:`DOC-${d.id}`, _origem:'documento', _refId:d.id,
    titulo:`Vencimento: ${d.nome}`, tipo:'Documento', prioridade:prioridadeAgendaPorData(d.dataValidade),
    data:d.dataValidade, horarioInicio:'', horarioFim:'', local:'', responsavel:d.responsavel||'',
    participantes:'', descricao:d.descricao||'', concluido:false
  }));
  const projetos=[];
  DB.getAll('projetos').filter(pr=>!pr.arquivado).forEach(pr=>{
    const base={_origem:'projeto',_refId:pr.id,tipo:'Projeto',horarioInicio:'',horarioFim:'',local:'',responsavel:pr.responsavel||'',participantes:'',descricao:pr.objetivo||pr.descricao||'',concluido:false};
    if(pr.dataInicio) projetos.push({...base,id:`PRJSTART-${pr.id}`,_agendaId:`PRJSTART-${pr.id}`,_dataCampo:'dataInicio',titulo:`Início: ${pr.nome}`,prioridade:'Média',data:pr.dataInicio});
    if(pr.dataFim) projetos.push({...base,id:`PRJEND-${pr.id}`,_agendaId:`PRJEND-${pr.id}`,_dataCampo:'dataFim',titulo:`Fim: ${pr.nome}`,prioridade:prioridadeAgendaPorData(pr.dataFim,'Média'),data:pr.dataFim});
  });
  return [...eventos,...tarefas,...documentos,...projetos];
}
function agGrupoOrigem(e){ return (e._origem==='documento'||e._origem==='projeto') ? 'prazo' : e._origem; }

function agItens(){
  const q=agEstado.busca.trim().toLowerCase();
  return eventosAgendaCompletos()
    .filter(e=>!agEstado.ocultas.includes(agGrupoOrigem(e)))
    .filter(e=>!q || [e.titulo,e.responsavel,e.local,e.tipo,e.participantes,e.descricao].join(' ').toLowerCase().includes(q));
}
function agPorDia(itens){
  const mapa={};
  itens.forEach(e=>{ (mapa[e.data]=mapa[e.data]||[]).push(e); });
  Object.values(mapa).forEach(l=>l.sort((a,b)=>String(a.horarioInicio||'').localeCompare(String(b.horarioInicio||'')) || String(a.titulo).localeCompare(String(b.titulo),'pt-BR')));
  return mapa;
}

/* ---------- séries de eventos repetidos ---------- */
function agSerie(e){
  const g=e?.recorrencia?.grupo;
  return g ? DB.getAll('eventos').filter(x=>x.recorrencia?.grupo===g).sort((a,b)=>a.data.localeCompare(b.data)) : [];
}
function gerarOcorrenciasEvento(base,rec){
  const out=[]; let atual=base.data; const limite=rec.ate||addDaysISO(base.data,365);
  while(out.length<370 && atual<=limite){
    out.push(atual);
    if(rec.frequencia==='Diária') atual=addDaysISO(atual,1);
    else if(rec.frequencia==='Semanal') atual=addDaysISO(atual,7);
    else if(rec.frequencia==='Mensal'){ const d=parseISODate(base.data), dia=d.getDate(), p=parseISODate(atual); p.setDate(1); p.setMonth(p.getMonth()+1); p.setDate(Math.min(dia,new Date(p.getFullYear(),p.getMonth()+1,0).getDate())); atual=isoFromDate(p); }
    else if(rec.frequencia==='Anual'){ const d=parseISODate(atual); d.setFullYear(d.getFullYear()+1); atual=isoFromDate(d); }
    else break;
  }
  return out;
}
function agFimPadraoRepeticao(data){
  const fimAno=`${data.slice(0,4)}-12-31`;
  return agDiasEntre(data,fimAno)>30 ? fimAno : addDaysISO(data,365);
}

/* ---------- ações sobre itens ---------- */
function marcarEventoConcluido(id){
  const sid=String(id);
  if(sid.startsWith('TASK-')){
    const t=DB.getById('solicitacoes',sid.slice(5)); if(!t) return;
    if(t.status==='Concluída' || (tarefaRecorrente(t) && t.ultimaConclusao===todayISO())) reabrirAtividade(t.id);
    else concluirAtividade(t.id);
    return;
  }
  const e=DB.getById('eventos',id); if(!e) return;
  DB.update('eventos',id,{concluido:!e.concluido,concluidoEm:e.concluido?null:Date.now()});
  registrarHistorico({modulo:'agenda',acao:e.concluido?'reabertura':'conclusão',descricao:`Evento "${e.titulo}" ${e.concluido?'reaberto':'concluído'}.`,refId:id});
  showToast(e.concluido?'↩ Evento reaberto.':'✓ Evento concluído.');
  renderCurrentView();
}

function agMover(id, iso){
  if(id.startsWith('TASK-')){
    const t=DB.getById('solicitacoes',id.slice(5)); if(!t) return;
    if(tarefaRecorrente(t)) DB.update('solicitacoes',t.id,{recorrencia:{...t.recorrencia,proxima:iso}});
    else DB.update('solicitacoes',t.id,{prazo:iso});
    registrarHistorico({modulo:'secretaria',acao:'movimentação',descricao:`Tarefa "${t.titulo}" movida para ${formatDateBR(iso)}.`,refId:t.id});
    showToast(`✓ Tarefa movida para ${formatDateBR(iso)}.`);
  } else {
    const e=DB.getById('eventos',id); if(!e || e.data===iso) return;
    DB.update('eventos',id,{data:iso});
    registrarHistorico({modulo:'agenda',acao:'movimentação',descricao:`Evento "${e.titulo}" movido para ${formatDateBR(iso)}.`,refId:id});
    showToast(`✓ Evento movido para ${formatDateBR(iso)}.`);
  }
  agEstado.dia=iso;
  renderAgenda();
}

function agRemoverEventos(lista){
  const ids=new Set(lista.map(x=>x.id));
  DB.saveAll('eventos', DB.getAll('eventos').filter(x=>!ids.has(x.id)));
  const e=lista[0];
  registrarHistorico({modulo:'agenda',acao:'exclusão',descricao:lista.length>1?`${lista.length} datas do evento "${e.titulo}" excluídas.`:`Evento "${e.titulo}" (${formatDateBR(e.data)}) excluído.`,refId:e.id});
  if(ids.has(agEstado.sel)) agEstado.sel=null;
  closeModal();
  showToast(lista.length>1?`✓ ${lista.length} datas excluídas.`:'✓ Evento excluído.');
  renderCurrentView();
}
function agExcluirEvento(id){
  const e=DB.getById('eventos',id); if(!e) return;
  const serie=agSerie(e);
  if(serie.length<=1){ confirmAction(`Excluir o evento "${e.titulo}"?`,()=>agRemoverEventos([e])); return; }
  const proximos=serie.filter(x=>x.data>=e.data);
  openModal('Excluir evento que se repete',`<p class="ag-modal-texto">“${escapeHTML(e.titulo)}” se repete em ${serie.length} datas. O que você quer excluir?</p>
    <div class="ag-escolhas">
      <button type="button" class="btn" data-ag-excluir="um">Só o de ${formatDateBR(e.data)}</button>
      ${proximos.length<serie.length?`<button type="button" class="btn" data-ag-excluir="proximos">Este e os próximos (${proximos.length})</button>`:''}
      <button type="button" class="btn ag-perigo" data-ag-excluir="todos">Todas as ${serie.length} datas</button>
    </div>
    <div class="modal-actions"><button type="button" class="btn btn-ghost" id="agExcluirCancelar">Cancelar</button></div>`);
  document.getElementById('agExcluirCancelar').onclick=closeModal;
  document.querySelectorAll('[data-ag-excluir]').forEach(b=>b.onclick=()=>agRemoverEventos(({um:[e],proximos,todos:serie})[b.dataset.agExcluir]));
}

/* Chamado por Dashboard, Pendências, Kanban e Pesquisa. */
function abrirDetalheEvento(id){
  const sid=String(id);
  if(sid.startsWith('DOC-')){ abrirDetalheDocumento(sid.slice(4)); return; }
  if(sid.startsWith('PRJSTART-')||sid.startsWith('PRJEND-')){ abrirDetalheProjeto(sid.replace(/^PRJ(?:START|END)-/,'')); return; }
  if(sid.startsWith('TASK-')){ abrirDetalheSolicitacao(sid.slice(5)); return; }
  const e=DB.getById('eventos',id); if(!e) return;
  agEstado={...agEstado, sel:id, dia:e.data, ref:e.data};
  if(!document.getElementById('modalBackdrop').hidden) closeModal();
  if(typeof currentView!=='undefined' && currentView!=='agenda') goToView('agenda'); else renderAgenda();
  if(window.innerWidth<=1200) document.querySelector('.ag-painel')?.scrollIntoView({block:'start'});
}

/* ---------- desenho ---------- */
const agEsc = s => escapeHTML(s ?? '');
function agHora(e){ return e.horarioInicio ? e.horarioInicio + (e.horarioFim ? '–'+e.horarioFim : '') : ''; }
function agMarcaOrigem(e){
  if(e._origem==='secretaria') return e.concluido ? '☑' : '☐';
  if(e._origem==='documento') return '📄';
  if(e._origem==='projeto') return '📁';
  return '';
}
function agArrastavel(e){ return e._origem==='evento' || e._origem==='secretaria'; }

function agChip(e, compacto=false){
  const alta=['Alta','Urgente'].includes(e.prioridade) && e._origem==='evento' && !e.concluido;
  return `<button type="button" class="ag-chip o-${agGrupoOrigem(e)} ${e.concluido?'is-feito':''} ${agEstado.sel===e.id?'is-sel':''}" data-ag="item" data-id="${agEsc(e.id)}" ${agArrastavel(e)?'draggable="true"':''} title="${agEsc(e.titulo)}${e.local?' · '+agEsc(e.local):''}">
    ${e.horarioInicio?`<span class="ag-chip-hora">${agEsc(e.horarioInicio)}</span>`:''}
    <span class="ag-chip-titulo">${agMarcaOrigem(e)?`<span class="ag-chip-marca">${agMarcaOrigem(e)}</span> `:''}${alta?'<b class="ag-alta" aria-label="prioridade alta">!</b> ':''}${agEsc(e.titulo)}</span>
    ${!compacto && e.local?`<span class="ag-chip-local">${agEsc(e.local)}</span>`:''}
  </button>`;
}

function agTitulo(){
  if(agEstado.modo==='mes'){ const d=parseISODate(agEstado.ref); return `${AG_MESES[d.getMonth()].replace(/^./,c=>c.toUpperCase())} de ${d.getFullYear()}`; }
  if(agEstado.modo==='lista') return agEstado.ref===todayISO() ? 'Próximos 30 dias' : `30 dias a partir de ${formatDateBR(agEstado.ref)}`;
  const ini=agInicioSemana(agEstado.ref), fim=addDaysISO(ini,6), a=parseISODate(ini), b=parseISODate(fim);
  return a.getMonth()===b.getMonth()
    ? `${a.getDate()} a ${b.getDate()} de ${AG_MESES[b.getMonth()]} de ${b.getFullYear()}`
    : `${a.getDate()} de ${AG_MESES[a.getMonth()].slice(0,3)} a ${b.getDate()} de ${AG_MESES[b.getMonth()].slice(0,3)} de ${b.getFullYear()}`;
}

function agSemanaHTML(porDia){
  const ini=agInicioSemana(agEstado.ref), hoje=todayISO();
  return `<div class="ag-semana">${Array.from({length:7},(_,i)=>{
    const iso=addDaysISO(ini,i), d=parseISODate(iso), itens=porDia[iso]||[];
    return `<div class="ag-col ${iso===hoje?'is-hoje':''} ${iso===agEstado.dia?'is-dia':''} ${d.getDay()%6===0?'is-fds':''}" data-drop="${iso}" data-ag="dia" data-iso="${iso}">
      <div class="ag-col-cab"><span>${AG_DIAS_CURTOS[d.getDay()]}</span><strong>${d.getDate()}</strong></div>
      <div class="ag-col-corpo">${itens.map(e=>agChip(e)).join('')}</div>
    </div>`;
  }).join('')}</div>`;
}

function agMesHTML(porDia){
  const ref=parseISODate(agEstado.ref), primeiro=isoFromDate(new Date(ref.getFullYear(),ref.getMonth(),1));
  const ini=agInicioSemana(primeiro), diasNoMes=new Date(ref.getFullYear(),ref.getMonth()+1,0).getDate();
  const semanas=Math.ceil((agDiasEntre(ini,primeiro)+diasNoMes)/7), hoje=todayISO();
  const cels=Array.from({length:semanas*7},(_,i)=>{
    const iso=addDaysISO(ini,i), d=parseISODate(iso), itens=porDia[iso]||[], fora=d.getMonth()!==ref.getMonth();
    const origens=[...new Set(itens.map(agGrupoOrigem))];
    return `<div class="ag-cel ${fora?'is-fora':''} ${iso===hoje?'is-hoje':''} ${iso===agEstado.dia?'is-dia':''}" data-drop="${iso}" data-ag="dia" data-iso="${iso}">
      <span class="ag-cel-num">${d.getDate()}</span>
      <div class="ag-cel-itens">${itens.slice(0,3).map(e=>agChip(e,true)).join('')}${itens.length>3?`<span class="ag-mais">+${itens.length-3}</span>`:''}</div>
      ${itens.length?`<span class="ag-pontos" aria-label="${itens.length} item(ns)">${origens.map(o=>`<i class="o-${o}"></i>`).join('')}</span>`:''}
    </div>`;
  }).join('');
  return `<div class="ag-mes"><div class="ag-mes-cab">${['seg','ter','qua','qui','sex','sáb','dom'].map(x=>`<span>${x}</span>`).join('')}</div><div class="ag-mes-grade">${cels}</div></div>`;
}

function agListaHTML(porDia){
  const dias=Array.from({length:30},(_,i)=>addDaysISO(agEstado.ref,i)).filter(iso=>porDia[iso]?.length);
  if(!dias.length) return `<div class="ag-vazio">Nada marcado nos próximos 30 dias${agEstado.busca?' com essa busca':''}.</div>`;
  return `<div class="ag-lista">${dias.map(iso=>{
    const l=agDiaLongo(iso);
    return `<section class="ag-lista-dia ${iso===todayISO()?'is-hoje':''}"><button type="button" class="ag-lista-cab" data-ag="dia" data-iso="${iso}"><strong>${l.data}</strong><span>${iso===todayISO()?'Hoje':l.semana}</span></button>${porDia[iso].map(agLinhaHTML).join('')}</section>`;
  }).join('')}</div>`;
}

function agLinhaHTML(e){
  const marcavel=e._origem==='evento'||e._origem==='secretaria';
  const meta=[e.local, e.responsavel, e._origem==='secretaria'?'Tarefa da Secretaria':e._origem==='documento'?'Documento':e._origem==='projeto'?'Projeto':e.tipo].filter(Boolean).map(agEsc).join(' · ');
  return `<div class="ag-linha o-${agGrupoOrigem(e)} ${e.concluido?'is-feito':''} ${agEstado.sel===e.id?'is-sel':''}">
    ${marcavel?`<button type="button" class="ag-check ${e.concluido?'is-feito':''}" data-ag="concluir" data-id="${agEsc(e.id)}" aria-label="${e.concluido?'Reabrir':'Marcar como feito'}: ${agEsc(e.titulo)}">${e.concluido?'✓':''}</button>`:`<span class="ag-check-vazio">${agMarcaOrigem(e)}</span>`}
    <button type="button" class="ag-linha-corpo" data-ag="item" data-id="${agEsc(e.id)}">
      <span class="ag-linha-hora">${agHora(e)||'Dia todo'}</span>
      <span class="ag-linha-titulo">${agEsc(e.titulo)}</span>
      ${meta?`<span class="ag-linha-meta">${meta}</span>`:''}
    </button>
  </div>`;
}

function agPainelDiaHTML(porDia){
  const iso=agEstado.dia, l=agDiaLongo(iso), itens=porDia[iso]||[];
  return `<div class="ag-painel-cab">
      <div><span>${iso===todayISO()?'Hoje · ':''}${l.semana}</span><h3>${l.data}</h3></div>
      <button type="button" class="btn btn-primary btn-sm" data-ag="novo" data-iso="${iso}">＋ Evento</button>
    </div>
    ${itens.length?itens.map(agLinhaHTML).join(''):'<div class="ag-vazio">Nada marcado para este dia.</div>'}`;
}

function agPainelItemHTML(e){
  const voltar=`<button type="button" class="ag-voltar" data-ag="voltar">← ${agEsc(formatDataAgenda(e.data))}</button>`;
  if(e._origem!=='evento'){
    const abrir = e._origem==='secretaria' ? ['abrir-tarefa','Abrir na Secretaria'] : e._origem==='documento' ? ['abrir-doc','Abrir documento'] : ['abrir-proj','Abrir projeto'];
    return `${voltar}<span class="ag-codigo o-${agGrupoOrigem(e)}">${e._origem==='secretaria'?'Tarefa da Secretaria':e._origem==='documento'?'Vencimento de documento':'Data de projeto'}</span>
      <h2>${agEsc(e.titulo)}</h2>
      <div class="ag-acoes">${e._origem==='secretaria'?`<button type="button" class="btn btn-sm ${e.concluido?'':'btn-primary'}" data-ag="concluir" data-id="${agEsc(e.id)}">${e.concluido?'↩ Reabrir':'✓ Concluir'}</button>`:''}<button type="button" class="btn btn-sm" data-ag="${abrir[0]}" data-id="${agEsc(e.id)}">${abrir[1]} →</button></div>
      <dl class="ag-fatos"><div><dt>Quando</dt><dd>${agEsc(formatDataAgenda(e.data))}${e.horarioInicio?' · '+agEsc(e.horarioInicio):''}</dd></div>${e.responsavel?`<div><dt>Responsável</dt><dd>${agEsc(e.responsavel)}</dd></div>`:''}</dl>
      ${e.descricao?`<div class="ag-descricao">${agEsc(e.descricao)}</div>`:''}
      ${e._origem!=='secretaria'?'<p class="ag-nota">Esta data vem de outro módulo; para mudá-la, abra o registro original.</p>':''}`;
  }
  const serie=agSerie(e), pos=serie.findIndex(x=>x.id===e.id)+1;
  const tarefa=e.tarefaId?DB.getById('solicitacoes',e.tarefaId):null;
  const rep=AG_REPETICOES.find(r=>r[0]===e.recorrencia?.frequencia)?.[1];
  return `${voltar}<span class="ag-codigo o-evento">${agEsc(e.tipo||'Evento')}</span>
    <h2>${agEsc(e.titulo)}</h2>
    <div class="ag-acoes">
      <button type="button" class="btn btn-sm ${e.concluido?'':'btn-primary'}" data-ag="concluir" data-id="${agEsc(e.id)}">${e.concluido?'↩ Reabrir':'✓ Concluir'}</button>
      <button type="button" class="btn btn-sm" data-ag="editar" data-id="${agEsc(e.id)}">Editar</button>
      <button type="button" class="btn btn-sm ag-perigo" data-ag="excluir" data-id="${agEsc(e.id)}">Excluir</button>
    </div>
    <dl class="ag-fatos">
      <div class="is-largo"><dt>Quando</dt><dd>${agEsc(formatDataAgenda(e.data))}${agHora(e)?' · '+agEsc(agHora(e)):''}</dd></div>
      ${e.local?`<div><dt>Local</dt><dd>${agEsc(e.local)}</dd></div>`:''}
      ${e.responsavel?`<div><dt>Responsável</dt><dd>${agEsc(e.responsavel)}</dd></div>`:''}
      ${e.participantes?`<div class="is-largo"><dt>Participantes</dt><dd>${agEsc(e.participantes)}</dd></div>`:''}
      <div><dt>Prioridade</dt><dd>${badgeHTML(badgePrioridade(e.prioridade),e.prioridade||'Média')}</dd></div>
      ${serie.length>1?`<div class="is-largo"><dt>Repetição</dt><dd>${agEsc(rep||'Repete')} · ${pos}ª de ${serie.length} datas (até ${formatDateBR(serie[serie.length-1].data)})</dd></div>`:''}
      ${tarefa?`<div class="is-largo"><dt>Tarefa ligada</dt><dd><button type="button" class="ag-link" data-ag="abrir-tarefa" data-id="TASK-${agEsc(tarefa.id)}">${agEsc(tarefa.titulo)} →</button></dd></div>`:''}
    </dl>
    ${e.descricao?`<div class="ag-descricao">${agEsc(e.descricao)}</div>`:''}`;
}

function renderAgenda(){
  const root=document.getElementById('agRoot'); if(!root) return;
  const itens=agItens(), porDia=agPorDia(itens);
  const selItem=agEstado.sel ? itens.find(e=>e.id===agEstado.sel) || eventosAgendaCompletos().find(e=>e.id===agEstado.sel) : null;
  if(agEstado.sel && !selItem) agEstado.sel=null;
  const focoBusca=document.activeElement?.id==='agBusca';
  const corpo = agEstado.modo==='mes' ? agMesHTML(porDia) : agEstado.modo==='lista' ? agListaHTML(porDia) : agSemanaHTML(porDia);
  root.innerHTML=`<div class="ag-barra">
      <div class="ag-nav">
        <button type="button" class="btn btn-sm" data-ag="anterior" aria-label="Anterior">‹</button>
        <button type="button" class="btn btn-sm" data-ag="hoje">Hoje</button>
        <button type="button" class="btn btn-sm" data-ag="proximo" aria-label="Próximo">›</button>
        <h2 class="ag-titulo">${agTitulo()}</h2>
      </div>
      <div class="ag-ferramentas">
        <div class="ag-modos" role="tablist">${[['semana','Semana'],['mes','Mês'],['lista','Lista']].map(([k,l])=>`<button type="button" role="tab" aria-selected="${agEstado.modo===k}" class="${agEstado.modo===k?'is-ativo':''}" data-ag="modo" data-modo="${k}">${l}</button>`).join('')}</div>
        <input type="search" class="input ag-busca" id="agBusca" placeholder="Buscar…" value="${agEsc(agEstado.busca)}" aria-label="Buscar na agenda">
        <button type="button" class="btn btn-sm" data-ag="imprimir">Imprimir</button>
      </div>
    </div>
    <div class="ag-legenda">${AG_ORIGENS.map(([k,l])=>`<button type="button" class="ag-filtro o-${k} ${agEstado.ocultas.includes(k)?'is-off':''}" data-ag="origem" data-origem="${k}" aria-pressed="${!agEstado.ocultas.includes(k)}"><i></i>${l}</button>`).join('')}<span class="ag-dica">Arraste eventos e tarefas para mudar a data.</span></div>
    <div class="ag-layout">
      <div class="ag-cal">${corpo}</div>
      <aside class="ag-painel" aria-label="${selItem?'Detalhe':'Dia selecionado'}">${selItem?agPainelItemHTML(selItem):agPainelDiaHTML(porDia)}</aside>
    </div>`;
  if(focoBusca){ const b=document.getElementById('agBusca'); b.focus(); b.setSelectionRange(b.value.length,b.value.length); }
}

/* ---------- formulário ---------- */
function openFormEvento(id, dataInicial){
  const item=typeof id==='string' ? DB.getById('eventos',id) : null;
  const data=item?.data || (typeof dataInicial==='string' && dataInicial) || agEstado.dia || todayISO();
  const serie=item?agSerie(item):[];
  const emSerie=serie.length>1;
  const proximos=emSerie?serie.filter(x=>x.data>=item.data):[];
  const tarefas=DB.getAll('solicitacoes').filter(s=>s.status!=='Concluída'&&s.status!=='Cancelada'&&!ehTarefaRenovacaoDocumento(s));
  const esc=escapeHTML;
  openModal(item?'Editar evento':'Novo evento',`<form id="formEvento" novalidate><div class="form-grid">
    <div class="field full"><label for="ev_titulo">O que vai acontecer? *</label><input class="input" id="ev_titulo" required value="${esc(item?.titulo||'')}"></div>
    <div class="field"><label for="ev_data">Data *</label><input class="input" type="date" id="ev_data" required value="${data}"></div>
    <div class="field"><label for="ev_tipo">Tipo</label><select class="input" id="ev_tipo">${AG_TIPOS.map(x=>`<option ${(item?.tipo||'Compromisso')===x?'selected':''}>${x}</option>`).join('')}</select></div>
    <div class="field"><label for="ev_inicio">Começa às</label><input class="input" type="time" id="ev_inicio" value="${item?.horarioInicio||''}"></div>
    <div class="field"><label for="ev_fim">Termina às</label><input class="input" type="time" id="ev_fim" value="${item?.horarioFim||''}"></div>
    <div class="field"><label for="ev_local">Local</label><input class="input" id="ev_local" value="${esc(item?.local||'')}" placeholder="Ex.: sala de reuniões"></div>
    <div class="field"><label for="ev_responsavel">Responsável</label><input class="input" id="ev_responsavel" value="${esc(item?.responsavel||'')}"></div>
    <div class="field full"><label for="ev_participantes">Participantes</label><input class="input" id="ev_participantes" value="${esc(item?.participantes||'')}" placeholder="Separe por vírgulas"></div>
    <div class="field"><label for="ev_prioridade">Prioridade</label><select class="input" id="ev_prioridade">${['Baixa','Média','Alta','Urgente'].map(x=>`<option ${(item?.prioridade||'Média')===x?'selected':''}>${x}</option>`).join('')}</select></div>
    ${emSerie
      ? `<div class="field"><label for="ev_escopo">Aplicar as alterações a</label><select class="input" id="ev_escopo"><option value="um">Só a data de ${formatDateBR(item.data)}</option><option value="proximos">Esta e as próximas (${proximos.length})</option></select></div>`
      : `<div class="field"><label for="ev_repeticao">Repete?</label><select class="input" id="ev_repeticao">${AG_REPETICOES.map(([v,l])=>`<option value="${v}">${l}</option>`).join('')}</select></div>
         <div class="field" id="ev_campo_ate" hidden><label for="ev_ate">Repetir até</label><input class="input" type="date" id="ev_ate" value="${agFimPadraoRepeticao(data)}"></div>`}
    <div class="field full"><label for="ev_tarefa">Ligar a uma tarefa da Secretaria <span class="muted">(opcional)</span></label><select class="input" id="ev_tarefa"><option value="">Nenhuma</option>${tarefas.map(t=>`<option value="${t.id}" ${item?.tarefaId===t.id?'selected':''}>${esc(t.titulo)}</option>`).join('')}</select></div>
    <div class="field full"><label for="ev_descricao">Observações</label><textarea id="ev_descricao">${esc(item?.descricao||'')}</textarea></div>
  </div><p class="field-error" id="ev_erro" hidden></p><div class="modal-actions"><button type="button" class="btn btn-ghost" id="ev_cancelar">Cancelar</button><button type="submit" class="btn btn-primary">${item?'Salvar alterações':'Criar evento'}</button></div></form>`);
  const rep=document.getElementById('ev_repeticao');
  if(rep) rep.onchange=()=>{ document.getElementById('ev_campo_ate').hidden=!rep.value; };
  document.getElementById('ev_cancelar').onclick=closeModal;
  document.getElementById('formEvento').onsubmit=ev=>{
    ev.preventDefault();
    const $=i=>document.getElementById(i);
    const titulo=$('ev_titulo').value.trim(), dt=$('ev_data').value, inicio=$('ev_inicio').value, fim=$('ev_fim').value;
    const erro=t=>{ $('ev_erro').hidden=false; $('ev_erro').textContent=t; };
    if(!titulo||!dt) return erro('Informe o que vai acontecer e a data.');
    if(inicio&&fim&&fim<inicio) return erro('O horário de término não pode ser antes do início.');
    const dados={titulo,tipo:$('ev_tipo').value,prioridade:$('ev_prioridade').value,horarioInicio:inicio,horarioFim:fim,local:$('ev_local').value.trim(),responsavel:$('ev_responsavel').value.trim(),participantes:$('ev_participantes').value.trim(),descricao:$('ev_descricao').value.trim(),tarefaId:$('ev_tarefa').value||null};
    const frequencia=rep?.value||'';
    const ate=frequencia ? ($('ev_ate').value||agFimPadraoRepeticao(dt)) : null;
    if(frequencia && ate<dt) return erro('A data final da repetição precisa ser depois da data do evento.');
    let selecionar=item?.id;
    if(item && emSerie && $('ev_escopo').value==='proximos'){
      const delta=agDiasEntre(item.data,dt), alvo=new Set(proximos.map(x=>x.id));
      DB.saveAll('eventos', DB.getAll('eventos').map(x=>alvo.has(x.id)?{...x,...dados,data:addDaysISO(x.data,delta),atualizadoEm:Date.now()}:x));
      registrarHistorico({modulo:'agenda',acao:'edição',descricao:`Evento "${titulo}" editado em ${proximos.length} datas.`,refId:item.id});
      showToast(`✓ ${proximos.length} datas atualizadas.`);
    } else if(item){
      DB.update('eventos',item.id,{...dados,data:dt});
      let extra=0;
      if(frequencia){
        const grupo='AGEGRP-'+Date.now().toString(36).toUpperCase(), rec={frequencia,ate,grupo};
        DB.update('eventos',item.id,{recorrencia:rec});
        gerarOcorrenciasEvento({data:dt},rec).slice(1).forEach((d,i)=>{ DB.insert('eventos',{...item,...dados,id:'AGE-'+Date.now().toString(36).toUpperCase()+'-'+i,data:d,concluido:false,concluidoEm:null,recorrencia:rec,criadoEm:Date.now(),atualizadoEm:Date.now()}); extra++; });
      }
      registrarHistorico({modulo:'agenda',acao:'edição',descricao:`Evento "${titulo}" editado${extra?` e repetido em mais ${extra} datas`:''}.`,refId:item.id});
      showToast(extra?`✓ Evento atualizado e repetido em mais ${extra} datas.`:'✓ Evento atualizado.');
    } else {
      const rec=frequencia?{frequencia,ate,grupo:'AGEGRP-'+Date.now().toString(36).toUpperCase()}:null;
      const datas=rec?gerarOcorrenciasEvento({data:dt},rec):[dt];
      const eventos=DB.getAll('eventos');
      datas.forEach((d,i)=>eventos.push({id:'AGE-'+Date.now().toString(36).toUpperCase()+'-'+i,...dados,data:d,concluido:false,recorrencia:rec,criadoEm:Date.now(),atualizadoEm:Date.now()}));
      DB.saveAll('eventos',eventos);
      selecionar=eventos[eventos.length-datas.length].id;
      registrarHistorico({modulo:'agenda',acao:'criação',descricao:`Evento "${titulo}" criado${rec?` (${datas.length} datas)`:''}.`,refId:selecionar});
      showToast(rec?`✓ Evento criado em ${datas.length} datas.`:'✓ Evento criado.');
    }
    agEstado={...agEstado, sel:selecionar, dia:dt, ref:agEstado.modo==='mes'&&dt.slice(0,7)===agEstado.ref.slice(0,7)?agEstado.ref:dt};
    closeModal(); renderCurrentView();
  };
}

/* ---------- impressão e avisos ---------- */
function imprimirAgenda(){
  document.body.classList.add('printing-agenda');
  setTimeout(()=>{ window.print(); setTimeout(()=>document.body.classList.remove('printing-agenda'),500); },50);
}
function notificarAgenda(){
  const agora=new Date(), hoje=todayISO(), chave='cs_agenda_alertas_'+hoje;
  const avisados=JSON.parse(localStorage.getItem(chave)||'[]');
  const alvo=DB.getAll('eventos').filter(e=>e.data===hoje&&!e.concluido&&e.horarioInicio&&!avisados.includes(e.id))
    .find(e=>{ const min=(new Date(`${e.data}T${e.horarioInicio}`)-agora)/60000; return min<=30; });
  if(alvo){ avisados.push(alvo.id); localStorage.setItem(chave,JSON.stringify(avisados)); showToast(`⏰ ${alvo.titulo} — ${alvo.horarioInicio}`); }
}

/* ---------- despachante ---------- */
function agMudarPeriodo(passo){
  const d=parseISODate(agEstado.ref);
  if(agEstado.modo==='mes'){ d.setDate(1); d.setMonth(d.getMonth()+passo); agEstado.ref=isoFromDate(d); }
  else agEstado.ref=addDaysISO(agEstado.ref, passo*(agEstado.modo==='lista'?30:7));
  renderAgenda();
}
const AG_ACOES = {
  'anterior': () => agMudarPeriodo(-1),
  'proximo': () => agMudarPeriodo(1),
  'hoje': () => { agEstado={...agEstado, ref:todayISO(), dia:todayISO(), sel:null}; renderAgenda(); },
  'modo': b => { agEstado.modo=b.dataset.modo; agEstado.ref=agEstado.dia; renderAgenda(); },
  'origem': b => { const k=b.dataset.origem; agEstado.ocultas=agEstado.ocultas.includes(k)?agEstado.ocultas.filter(x=>x!==k):[...agEstado.ocultas,k]; renderAgenda(); },
  'dia': b => { agEstado={...agEstado, dia:b.dataset.iso, sel:null}; renderAgenda(); if(window.innerWidth<=1200) document.querySelector('.ag-painel')?.scrollIntoView({block:'nearest'}); },
  'item': b => { const e=eventosAgendaCompletos().find(x=>x.id===b.dataset.id); if(!e) return; agEstado={...agEstado, sel:e.id, dia:e.data}; renderAgenda(); if(window.innerWidth<=1200) document.querySelector('.ag-painel')?.scrollIntoView({block:'nearest'}); },
  'voltar': () => { agEstado.sel=null; renderAgenda(); },
  'novo': b => openFormEvento(null, b.dataset.iso),
  'concluir': b => marcarEventoConcluido(b.dataset.id),
  'editar': b => openFormEvento(b.dataset.id),
  'excluir': b => agExcluirEvento(b.dataset.id),
  'abrir-tarefa': b => abrirDetalheSolicitacao(b.dataset.id.replace(/^TASK-/,'')),
  'abrir-doc': b => abrirDetalheDocumento(b.dataset.id.replace(/^DOC-/,'')),
  'abrir-proj': b => abrirDetalheProjeto(b.dataset.id.replace(/^PRJ(?:START|END)-/,'')),
  'imprimir': () => imprimirAgenda()
};

(function ligarAgenda(){
  const root=document.getElementById('agRoot'); if(!root) return;
  root.addEventListener('click', e=>{
    const b=e.target.closest('[data-ag]');
    if(!b || !root.contains(b) || b.disabled) return;
    AG_ACOES[b.dataset.ag]?.(b);
  });
  root.addEventListener('input', e=>{ if(e.target.id==='agBusca'){ agEstado.busca=e.target.value; renderAgenda(); } });
  root.addEventListener('dragstart', e=>{
    const chip=e.target.closest?.('[draggable="true"][data-id]'); if(!chip) return;
    e.dataTransfer.setData('text/plain', chip.dataset.id); e.dataTransfer.effectAllowed='move';
  });
  root.addEventListener('dragover', e=>{ const alvo=e.target.closest?.('[data-drop]'); if(!alvo) return; e.preventDefault(); root.querySelectorAll('.is-alvo').forEach(x=>x!==alvo&&x.classList.remove('is-alvo')); alvo.classList.add('is-alvo'); });
  root.addEventListener('dragleave', e=>{ const alvo=e.target.closest?.('[data-drop]'); if(alvo && !alvo.contains(e.relatedTarget)) alvo.classList.remove('is-alvo'); });
  root.addEventListener('drop', e=>{
    const alvo=e.target.closest?.('[data-drop]'); if(!alvo) return;
    e.preventDefault(); alvo.classList.remove('is-alvo');
    const id=e.dataTransfer.getData('text/plain'); if(id) agMover(id, alvo.dataset.drop);
  });
  setInterval(notificarAgenda,60000); setTimeout(notificarAgenda,1200);
})();

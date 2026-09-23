/* ---------------------------------------------------------
   AGENDA
   --------------------------------------------------------- */
let agendaDataAtual = new Date();
let agendaModo = 'mes';

function eventoDataHora(e){ return `${e.data}${e.horarioInicio ? 'T'+e.horarioInicio : 'T00:00'}`; }
function formatMesAgenda(d){ return d.toLocaleDateString('pt-BR',{month:'long',year:'numeric'}).replace(/^./,c=>c.toUpperCase()); }
function formatDataAgenda(iso){ return iso ? parseISODate(iso).toLocaleDateString('pt-BR',{weekday:'long',day:'2-digit',month:'2-digit',year:'numeric'}) : 'Sem data'; }
function tipoEventoIcon(t){ return ({'Reunião':'👥','Atendimento':'🤝','Compromisso':'📌','Evento':'🎉','Visita':'🚗','Outro':'📅','Tarefa':'📋','Documento':'📄','Projeto':'📁'}[t]||'📅'); }
function prioridadeEventoClass(p){ return String(p||'Média').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,''); }
function addDaysISO(iso,n){ const d=parseISODate(iso); d.setDate(d.getDate()+n); return isoFromDate(d); }
function prioridadeAgendaPorData(data, padrao='Média'){
  if(!data) return padrao;
  const dias=daysDiffFromToday(data);
  if(dias<0) return 'Urgente';
  if(dias<=3) return 'Alta';
  if(dias<=7) return 'Média';
  return padrao;
}
function eventosAgendaCompletos(){
  const eventos=DB.getAll('eventos').map(e=>({...e,_origem:'evento',_agendaId:e.id}));
  // Tarefas automáticas de renovação de documento não aparecem na Agenda
  // (ficam apenas em Pendências e no módulo Documentos).
  const tarefas=DB.getAll('solicitacoes').filter(s=>prazoAtividade(s).data && !ehTarefaRenovacaoDocumento(s)).map(s=>({
    id:`TASK-${s.id}`, _agendaId:`TASK-${s.id}`, _origem:'secretaria', _taskId:s.id,
    titulo:s.titulo, tipo:'Tarefa', prioridade:s.prioridade||'Média', data:prazoAtividade(s).data,
    horarioInicio:s.horario||s.recorrencia?.horario||'', horarioFim:'', local:'', responsavel:s.responsavel||'',
    participantes:'', descricao:s.descricao||'', concluido:s.status==='Concluída', recorrencia:s.recorrencia||null
  }));

  // Tudo que possui um prazo/data operacional também aparece na Agenda.
  const documentos=DB.getAll('documentos').filter(d=>d.dataValidade).map(d=>({
    id:`DOC-${d.id}`, _agendaId:`DOC-${d.id}`, _origem:'documento', _refId:d.id,
    titulo:`Vencimento: ${d.nome}`, tipo:'Documento', prioridade:prioridadeAgendaPorData(d.dataValidade),
    data:d.dataValidade, horarioInicio:'', horarioFim:'', local:'', responsavel:d.responsavel||'',
    participantes:'', descricao:d.descricao||'', concluido:false
  }));
  const projetos=[];
  DB.getAll('projetos').forEach(pr=>{
    if(pr.dataInicio) projetos.push({id:`PRJSTART-${pr.id}`,_agendaId:`PRJSTART-${pr.id}`,_origem:'projeto',_refId:pr.id,_dataCampo:'dataInicio',titulo:`Início: ${pr.nome}`,tipo:'Projeto',prioridade:'Média',data:pr.dataInicio,horarioInicio:'',horarioFim:'',local:'',responsavel:pr.responsavel||'',participantes:'',descricao:pr.objetivo||pr.descricao||'',concluido:false});
    if(pr.dataFim) projetos.push({id:`PRJEND-${pr.id}`,_agendaId:`PRJEND-${pr.id}`,_origem:'projeto',_refId:pr.id,_dataCampo:'dataFim',titulo:`Fim: ${pr.nome}`,tipo:'Projeto',prioridade:prioridadeAgendaPorData(pr.dataFim,'Média'),data:pr.dataFim,horarioInicio:'',horarioFim:'',local:'',responsavel:pr.responsavel||'',participantes:'',descricao:pr.objetivo||pr.descricao||'',concluido:false});
  });
  return [...eventos,...tarefas,...documentos,...projetos];
}
function filteredAgendaEvents(){
  const q=(document.getElementById('agendaBusca')?.value||'').trim().toLowerCase();
  let eventos=eventosAgendaCompletos();
  if(q) eventos=eventos.filter(e=>[e.titulo,e.responsavel,e.local,e.tipo,e.participantes,e.descricao].join(' ').toLowerCase().includes(q));
  return eventos;
}
function renderAgendaResumo(eventos){
  const box=document.getElementById('agendaResumoHoje'); if(!box)return;
  const hoje=todayISO(); const agora=new Date();
  const hojeEv=eventos.filter(e=>e.data===hoje).sort((a,b)=>eventoDataHora(a).localeCompare(eventoDataHora(b)));
  const proximos=hojeEv.filter(e=>e.horarioInicio && eventoDataHora(e)>=`${hoje}T${String(agora.getHours()).padStart(2,'0')}:${String(agora.getMinutes()).padStart(2,'0')}`);
  const urg=hojeEv.filter(e=>e.prioridade==='Urgente').length;
  const concl=hojeEv.filter(e=>e.concluido).length;
  const prox=proximos[0];
  box.innerHTML=`<div class="agenda-summary-card"><span>📅 Hoje</span><strong>${hojeEv.length}</strong><small>compromisso${hojeEv.length===1?'':'s'}</small></div><div class="agenda-summary-card"><span>⏰ Próximo</span><strong>${prox?escapeHTML(prox.horarioInicio):'—'}</strong><small>${prox?escapeHTML(prox.titulo):'Nenhum próximo'}</small></div><div class="agenda-summary-card ${urg?'is-alert':''}"><span>⚠️ Urgentes</span><strong>${urg}</strong><small>para hoje</small></div><div class="agenda-summary-card"><span>✅ Concluídos</span><strong>${concl}</strong><small>hoje</small></div>`;
}
function eventoCardLista(e){ const podeConcluir=e._origem==='evento'||e._origem==='secretaria'; return `<article class="agenda-list-item ${e.concluido?'is-done':''}" draggable="true" data-drag-event="${e.id}"><div class="agenda-list-date"><strong>${parseISODate(e.data).toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'})}</strong><span>${e.horarioInicio||'Sem horário'}${e.horarioFim?' — '+e.horarioFim:''}</span></div><div class="agenda-list-main"><strong>${tipoEventoIcon(e.tipo)} ${escapeHTML(e.titulo)}</strong><small>${escapeHTML(e.local||'Sem local')} · ${escapeHTML(e.responsavel||'Sem responsável')}</small></div><div class="agenda-list-actions">${podeConcluir?`<button class="btn btn-sm" data-complete-event="${e.id}">${e.concluido?'↩ Reabrir':'✓ Concluir'}</button>`:''}<button class="btn btn-sm" data-event-id="${e.id}">Ver</button></div></article>`; }
function agendaPendenciasHoje(eventos){
  const hoje=todayISO(), agora=new Date();
  return eventos.filter(e=>e.data===hoje&&!e.concluido&&e.horarioInicio&&eventoDataHora(e)<=`${hoje}T${String(agora.getHours()).padStart(2,'0')}:${String(agora.getMinutes()).padStart(2,'0')}`);
}
function marcarEventoConcluido(id){
  if(String(id).startsWith('TASK-')){
    const taskId=String(id).replace(/^TASK-/,'');
    const task=DB.getById('solicitacoes',taskId); if(!task)return;
    if(task.status==='Concluída'){
      DB.update('solicitacoes',taskId,{status:'Pendente',dataConclusao:null,atualizadoEm:Date.now()});
      showToast('↩ Tarefa reaberta.');
    }else{
      concluirAtividade(taskId);
      return;
    }
    renderAgenda(); return;
  }
  const e=DB.getById('eventos',id); if(!e)return;
  DB.update('eventos',id,{concluido:!e.concluido,concluidoEm:e.concluido?null:Date.now(),atualizadoEm:Date.now()});
  registrarHistorico({modulo:'agenda',acao:e.concluido?'reabertura':'conclusão',descricao:`Evento "${e.titulo}" ${e.concluido?'reaberto':'concluído'}.`,refId:id});
  renderAgenda(); showToast(e.concluido?'↩ Evento reaberto.':'✓ Evento concluído.');
}
function imprimirAgenda(){
  document.body.classList.add('printing-agenda');
  setTimeout(()=>{window.print();setTimeout(()=>document.body.classList.remove('printing-agenda'),500);},50);
}
function exportarAgendaBackup(){
  const dados={versao:1,exportadoEm:new Date().toISOString(),eventos:DB.getAll('eventos')};
  const blob=new Blob([JSON.stringify(dados,null,2)],{type:'application/json'}), url=URL.createObjectURL(blob), a=document.createElement('a');
  a.href=url;a.download=`backup-agenda-${todayISO()}.json`;a.click();URL.revokeObjectURL(url);showToast('✓ Backup da agenda exportado.');
}
function importarAgendaBackup(file){
  if(!file)return;const r=new FileReader();r.onload=()=>{try{const dados=JSON.parse(r.result);if(!Array.isArray(dados.eventos))throw new Error('Formato inválido');let n=0;dados.eventos.forEach(e=>{if(e?.id&&e?.titulo&&e?.data){DB.insert('eventos',{...e,id:DB.getById('eventos',e.id)?'AGE-'+Date.now().toString(36)+'-'+n:e.id});n++;}});renderAgenda();showToast(`✓ ${n} eventos importados.`);}catch(err){showToast('⚠ Arquivo de backup inválido.');}};r.readAsText(file);
}

/* ---------------------------------------------------------
   BACKUP COMPLETO — dados + anexos (IndexedDB)
   --------------------------------------------------------- */
function backupToBase64(blob){
  return new Promise((resolve,reject)=>{
    if(!(blob instanceof Blob)){ resolve(null); return; }
    const reader=new FileReader();
    reader.onload=()=>resolve(reader.result);
    reader.onerror=()=>reject(reader.error||new Error('Falha ao ler arquivo'));
    reader.readAsDataURL(blob);
  });
}

async function serializarBackupValor(value){
  if(value instanceof Blob){
    return {__backupType:'Blob',type:value.type||'',data:await backupToBase64(value)};
  }
  if(value instanceof Date){
    return {__backupType:'Date',data:value.toISOString()};
  }
  if(value instanceof ArrayBuffer){
    const bytes=new Uint8Array(value);
    let binary=''; for(let i=0;i<bytes.length;i+=0x8000) binary+=String.fromCharCode(...bytes.subarray(i,i+0x8000));
    return {__backupType:'ArrayBuffer',data:btoa(binary)};
  }
  if(Array.isArray(value)){
    return Promise.all(value.map(serializarBackupValor));
  }
  if(value && typeof value==='object'){
    const out={};
    for(const [k,v] of Object.entries(value)) out[k]=await serializarBackupValor(v);
    return out;
  }
  return value;
}

function backupDataUrlToBlob(dataUrl){
  const [header,data]=String(dataUrl||'').split(',');
  if(!header||data===undefined) throw new Error('Arquivo inválido no backup');
  const mime=(header.match(/data:([^;]+)/)||[])[1]||'application/octet-stream';
  const binary=atob(data); const bytes=new Uint8Array(binary.length);
  for(let i=0;i<binary.length;i++) bytes[i]=binary.charCodeAt(i);
  return new Blob([bytes],{type:mime});
}

async function desserializarBackupValor(value){
  if(Array.isArray(value)) return Promise.all(value.map(desserializarBackupValor));
  if(value && typeof value==='object'){
    if(value.__backupType==='Blob') return backupDataUrlToBlob(value.data);
    if(value.__backupType==='Date') return new Date(value.data);
    if(value.__backupType==='ArrayBuffer'){
      const binary=atob(value.data); const bytes=new Uint8Array(binary.length);
      for(let i=0;i<binary.length;i++) bytes[i]=binary.charCodeAt(i);
      return bytes.buffer;
    }
    const out={};
    for(const [k,v] of Object.entries(value)) out[k]=await desserializarBackupValor(v);
    return out;
  }
  return value;
}

async function projectFilesExport(){
  const db=await ProjectFiles.open();
  const stores=[...db.objectStoreNames]; const dados={};
  for(const storeName of stores){
    dados[storeName]=await new Promise((resolve,reject)=>{
      const tx=db.transaction(storeName,'readonly'); const req=tx.objectStore(storeName).getAll();
      req.onsuccess=async()=>{try{resolve(await Promise.all((req.result||[]).map(serializarBackupValor)));}catch(e){reject(e);}};
      req.onerror=()=>reject(req.error);
    });
  }
  return {name:db.name,version:db.version,stores:dados};
}

async function projectFilesRestore(snapshot){
  const db=await ProjectFiles.open();
  const preparados={};
  for(const [storeName,records] of Object.entries(snapshot?.stores||{})){
    if(db.objectStoreNames.contains(storeName)) preparados[storeName]=await Promise.all((records||[]).map(desserializarBackupValor));
  }
  for(const storeName of [...db.objectStoreNames]){
    await new Promise((resolve,reject)=>{
      const tx=db.transaction(storeName,'readwrite'); tx.objectStore(storeName).clear();
      tx.oncomplete=resolve; tx.onerror=()=>reject(tx.error);
    });
  }
  for(const [storeName,restored] of Object.entries(preparados)){
    await new Promise((resolve,reject)=>{
      const tx=db.transaction(storeName,'readwrite'); const os=tx.objectStore(storeName);
      restored.forEach(record=>os.put(record));
      tx.oncomplete=resolve; tx.onerror=()=>reject(tx.error);
    });
  }
}

async function exportarBackupCompleto(){
  try{
    showToast('⏳ Preparando backup completo...');
    const localStorageData={};
    for(let i=0;i<localStorage.length;i++){
      const key=localStorage.key(i);
      if(key && key.startsWith('cs_')) localStorageData[key]=localStorage.getItem(key);
    }
    const arquivos=await projectFilesExport();
    const dados={
      app:'Central da Secretaria',
      formato:'backup-completo',
      versao:2,
      exportadoEm:new Date().toISOString(),
      localStorage:localStorageData,
      indexedDB:{name:arquivos.name,version:arquivos.version,stores:arquivos.stores}
    };
    const blob=new Blob([JSON.stringify(dados)],{type:'application/json'});
    const url=URL.createObjectURL(blob),a=document.createElement('a');
    a.href=url; a.download=`backup-completo-central-secretaria-${todayISO()}.json`;
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    showToast('✓ Backup completo exportado com dados e anexos.');
  }catch(e){
    console.error('Erro ao exportar backup completo',e);
    showToast('⚠ Não foi possível criar o backup completo.');
  }
}

async function importarBackupCompleto(file){
  if(!file) return;
  if(!confirm('Restaurar o backup substituirá os dados atuais da Central da Secretaria. Deseja continuar?')) return;
  try{
    showToast('⏳ Restaurando backup...');
    const texto=await file.text(); const dados=JSON.parse(texto);
    if(dados?.formato!=='backup-completo' || Number(dados?.versao)!==2) throw new Error('Formato de backup não suportado');
    const local=dados.localStorage||{};
    for(let i=localStorage.length-1;i>=0;i--){
      const key=localStorage.key(i); if(key?.startsWith('cs_')) localStorage.removeItem(key);
    }
    for(const [key,value] of Object.entries(local)){
      if(key.startsWith('cs_')) localStorage.setItem(key,value);
    }
    await projectFilesRestore(dados.indexedDB||{});
    showToast('✓ Backup restaurado. A página será recarregada.');
    setTimeout(()=>location.reload(),700);
  }catch(e){
    console.error('Erro ao restaurar backup completo',e);
    showToast('⚠ Backup inválido ou não foi possível concluir a restauração.');
  }
}
function alternarTelaCheia(){
  const sec=document.getElementById('view-agenda');
  if(!document.fullscreenElement){sec?.requestFullscreen?.();sec?.classList.add('agenda-fullscreen');}
  else document.exitFullscreen?.();
}
function notificarAgenda(){
  const eventos=DB.getAll('eventos');
  const agora=new Date(), hoje=todayISO(), chave='cs_agenda_alertas_'+hoje;
  let avisados=JSON.parse(localStorage.getItem(chave)||'[]');
  const proximos=eventos.filter(e=>e.data===hoje&&!e.concluido&&e.horarioInicio).filter(e=>{const d=new Date(`${e.data}T${e.horarioInicio}`);const diff=(d-agora)/60000;return diff>=0&&diff<=30;});
  const atrasados=agendaPendenciasHoje(eventos);
  const alvo=[...proximos,...atrasados].find(e=>!avisados.includes(e.id));
  if(alvo){avisados.push(alvo.id);localStorage.setItem(chave,JSON.stringify(avisados));showToast(`⏰ ${alvo.titulo} — ${alvo.horarioInicio||'agora'}`);}
}
function renderAgenda(){
  const titulo=document.getElementById('agendaMesTitulo'); if(titulo) titulo.textContent=formatMesAgenda(agendaDataAtual);
  const eventos=filteredAgendaEvents(); renderAgendaResumo(eventos);
  const box=document.getElementById('agendaConteudo'); if(!box)return;
  if(agendaModo==='lista'){
    const inicio=new Date(agendaDataAtual.getFullYear(),agendaDataAtual.getMonth(),1), fim=new Date(agendaDataAtual.getFullYear(),agendaDataAtual.getMonth()+1,0);
    const lista=eventos.filter(e=>{const d=parseISODate(e.data);return d>=inicio&&d<=fim}).sort((a,b)=>eventoDataHora(a).localeCompare(eventoDataHora(b)));
    box.innerHTML=`<div class="agenda-list">${lista.length?lista.map(eventoCardLista).join(''):'<div class="empty-state">Nenhum compromisso encontrado neste mês.</div>'}</div>`; bindAgendaEvents(); return;
  }
  if(agendaModo==='semana'){ renderAgendaSemana(eventos); return; }
  const y=agendaDataAtual.getFullYear(),m=agendaDataAtual.getMonth(),primeiro=new Date(y,m,1),ultimo=new Date(y,m+1,0),offset=primeiro.getDay(),total=ultimo.getDate();
  const cells=[]; for(let i=0;i<offset;i++) cells.push('<div class="agenda-day is-empty"></div>');
  for(let day=1;day<=total;day++){
    const iso=`${y}-${String(m+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`, doDia=eventos.filter(e=>e.data===iso).sort((a,b)=>String(a.horarioInicio||'').localeCompare(String(b.horarioInicio||''))), hoje=iso===todayISO();
    cells.push(`<div class="agenda-day ${hoje?'is-today':''}" data-drop-date="${iso}"><button class="agenda-day-number" data-agenda-new-date="${iso}">${day}</button><div class="agenda-events">${doDia.slice(0,6).map(e=>`<button draggable="true" class="agenda-event priority-${prioridadeEventoClass(e.prioridade)} ${e.concluido?'is-done':''}" data-drag-event="${e.id}" data-event-id="${e.id}">${e._origem==='secretaria'?'📋':tipoEventoIcon(e.tipo)} ${escapeHTML(e.titulo)}${e.horarioInicio?` <span>${e.horarioInicio}</span>`:''}</button>`).join('')}${doDia.length>6?`<div class="agenda-more">+ ${doDia.length-6} outros</div>`:''}</div></div>`);
  }
  box.innerHTML=`<div class="agenda-calendar"><div class="agenda-weekdays">${['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'].map(x=>`<div>${x}</div>`).join('')}</div><div class="agenda-grid">${cells.join('')}</div></div>`; bindAgendaEvents();
}
function renderAgendaSemana(eventos){
  const base=new Date(agendaDataAtual); const day=base.getDay(); base.setDate(base.getDate()-day); const days=Array.from({length:7},(_,i)=>{const d=new Date(base);d.setDate(base.getDate()+i);return d});
  const headers=days.map(d=>{const iso=isoFromDate(d);return `<div class="agenda-week-head ${iso===todayISO()?'is-today':''}">${d.toLocaleDateString('pt-BR',{weekday:'short'})}<strong>${d.getDate()}</strong></div>`}).join('');
  const cols=days.map(d=>{const iso=isoFromDate(d);const dayEvents=eventos.filter(e=>e.data===iso);let slots='';for(let h=0;h<24;h++){const hh=String(h).padStart(2,'0');const evs=dayEvents.filter(e=>String(e.horarioInicio||'').slice(0,2)===hh);slots+=`<div class="agenda-hour" data-drop-date="${iso}" data-drop-hour="${hh}:00"><span>${hh}:00</span><div>${evs.map(e=>`<button draggable="true" class="agenda-week-event priority-${prioridadeEventoClass(e.prioridade)} ${e.concluido?'is-done':''}" data-drag-event="${e.id}" data-event-id="${e.id}">${e._origem==='secretaria'?'📋 ':''}${escapeHTML(e.titulo)}<small>${e.horarioInicio||''}</small></button>`).join('')}</div></div>`}return `<div class="agenda-week-col">${slots}</div>`}).join('');
  document.getElementById('agendaConteudo').innerHTML=`<div class="agenda-week"><div class="agenda-week-heads">${headers}</div><div class="agenda-week-body">${cols}</div></div>`; bindAgendaEvents();
}
function bindAgendaEvents(){
  document.querySelectorAll('[data-complete-event]').forEach(b=>b.onclick=e=>{e.stopPropagation();marcarEventoConcluido(b.dataset.completeEvent);});
  document.querySelectorAll('[data-event-id]').forEach(b=>b.onclick=()=>abrirDetalheEvento(b.dataset.eventId));
  document.querySelectorAll('[data-agenda-new-date]').forEach(b=>b.onclick=()=>openFormEvento(null,b.dataset.agendaNewDate));
  document.querySelectorAll('[data-drag-event]').forEach(el=>el.addEventListener('dragstart',e=>{e.dataTransfer.setData('text/plain',el.dataset.dragEvent);e.dataTransfer.effectAllowed='move';}));
  document.querySelectorAll('[data-drop-date]').forEach(el=>{el.addEventListener('dragover',e=>{e.preventDefault();el.classList.add('drag-over');});el.addEventListener('dragleave',()=>el.classList.remove('drag-over'));el.addEventListener('drop',e=>{e.preventDefault();el.classList.remove('drag-over');const id=e.dataTransfer.getData('text/plain');const date=el.dataset.dropDate;const hour=el.dataset.dropHour;
    if(String(id).startsWith('TASK-')){const taskId=String(id).replace(/^TASK-/,'');const task=DB.getById('solicitacoes',taskId);if(!task)return;DB.update('solicitacoes',taskId,{prazo:date,atualizadoEm:Date.now()});registrarHistorico({modulo:'secretaria',acao:'movimentação',descricao:`Tarefa "${task.titulo}" movida para ${formatDateBR(date)}.`,refId:taskId});renderAgenda();showToast('✓ Prazo da tarefa atualizado.');return;}
    if(String(id).startsWith('DOC-')){const rid=String(id).replace(/^DOC-/,'');const d=DB.getById('documentos',rid);if(!d)return;DB.update('documentos',rid,{dataValidade:date,atualizadoEm:Date.now()});renderAgenda();showToast('✓ Validade do documento atualizada.');return;}
    if(String(id).startsWith('PRJSTART-')||String(id).startsWith('PRJEND-')){const fim=String(id).startsWith('PRJEND-'),rid=String(id).replace(/^PRJ(?:START|END)-/,'');const x=DB.getById('projetos',rid);if(!x)return;DB.update('projetos',rid,{[fim?'dataFim':'dataInicio']:date,atualizadoEm:Date.now()});renderAgenda();showToast('✓ Data do projeto atualizada.');return;}
    const item=DB.getById('eventos',id);if(!item)return;DB.update('eventos',id,{data:date,...(hour?{horarioInicio:hour}: {})});registrarHistorico({modulo:'agenda',acao:'movimentação',descricao:`Evento "${item.titulo}" movido para ${formatDateBR(date)}${hour?' às '+hour:''}.`,refId:id});renderAgenda();showToast('✓ Evento movido.');});});
}
function gerarOcorrenciasEvento(base,rec){
  const out=[]; let atual=base.data, limite=rec.ate||addDaysISO(base.data,365), count=0;
  while(count<370 && atual<=limite){out.push(atual);count++; if(rec.frequencia==='Diária') atual=addDaysISO(atual,1); else if(rec.frequencia==='Semanal') atual=addDaysISO(atual,7); else if(rec.frequencia==='Mensal'){const d=parseISODate(atual),dia=d.getDate();d.setMonth(d.getMonth()+1);d.setDate(Math.min(dia,new Date(d.getFullYear(),d.getMonth()+1,0).getDate()));atual=isoFromDate(d);} else if(rec.frequencia==='Anual'){const d=parseISODate(atual);d.setFullYear(d.getFullYear()+1);atual=isoFromDate(d);} else break;}
  return out;
}
function openFormEvento(id,dataInicial){
  const item=id?DB.getById('eventos',id):null, data=item?.data||dataInicial||todayISO(), rec=item?.recorrencia||{}, tarefas=DB.getAll('solicitacoes').filter(s=>s.status!=='Concluída'&&s.status!=='Cancelada'&&!ehTarefaRenovacaoDocumento(s));
  openModal(item?'Editar evento':'Novo evento',`<form id="formEvento" novalidate><div class="form-grid">
    <div class="field full"><label for="ev_titulo">Título *</label><input class="input" id="ev_titulo" required value="${escapeHTML(item?.titulo||'')}"></div>
    <div class="field"><label for="ev_tipo">Tipo</label><select class="input" id="ev_tipo">${['Reunião','Atendimento','Compromisso','Evento','Visita','Outro'].map(x=>`<option ${item?.tipo===x?'selected':''}>${x}</option>`).join('')}</select></div>
    <div class="field"><label for="ev_prioridade">Prioridade</label><select class="input" id="ev_prioridade">${['Baixa','Média','Alta','Urgente'].map(x=>`<option ${item?.prioridade===x?'selected':''}>${x}</option>`).join('')}</select></div>
    <div class="field"><label for="ev_data">Data *</label><input class="input" type="date" id="ev_data" required value="${data}"></div>
    <div class="field"><label for="ev_inicio">Horário inicial</label><input class="input" type="time" id="ev_inicio" value="${item?.horarioInicio||''}"></div>
    <div class="field"><label for="ev_fim">Horário final</label><input class="input" type="time" id="ev_fim" value="${item?.horarioFim||''}"></div>
    <div class="field"><label for="ev_local">Local</label><input class="input" id="ev_local" value="${escapeHTML(item?.local||'')}" placeholder="Ex.: APAE"></div>
    <div class="field"><label for="ev_responsavel">Responsável</label><input class="input" id="ev_responsavel" value="${escapeHTML(item?.responsavel||'')}"></div>
    <div class="field full"><label for="ev_participantes">Participantes</label><input class="input" id="ev_participantes" value="${escapeHTML(item?.participantes||'')}" placeholder="Separe por vírgulas"></div>
    <div class="field"><label for="ev_repeticao">Repetição</label><select class="input" id="ev_repeticao">${['Não repetir','Diariamente','Semanalmente','Mensalmente','Anualmente'].map(x=>`<option ${((rec.frequencia==='Diária'&&x==='Diariamente')||(rec.frequencia==='Semanal'&&x==='Semanalmente')||(rec.frequencia==='Mensal'&&x==='Mensalmente')||(rec.frequencia==='Anual'&&x==='Anualmente')||(x==='Não repetir'&&!rec.frequencia))?'selected':''}>${x}</option>`).join('')}</select></div>
    <div class="field" id="ev_campo_ate"><label for="ev_ate">Repetir até</label><input class="input" type="date" id="ev_ate" value="${rec.ate||addDaysISO(data,365)}"></div>
    <div class="field" id="ev_campo_semana"><label for="ev_diaSemana">Dia da semana</label><select class="input" id="ev_diaSemana">${['Domingo','Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado'].map((x,i)=>`<option value="${i}" ${Number(rec.diaSemana??parseISODate(data).getDay())===i?'selected':''}>${x}</option>`).join('')}</select></div>
    <div class="field full"><label for="ev_tarefa">Vincular a uma tarefa da Secretaria <span class="muted">(opcional)</span></label><select class="input" id="ev_tarefa"><option value="">Nenhuma tarefa vinculada</option>${tarefas.map(t=>`<option value="${t.id}" ${item?.tarefaId===t.id?'selected':''}>${escapeHTML(t.titulo)} · ${formatDateBR(prazoAtividade(t).data||t.prazo)}</option>`).join('')}</select></div>
    <div class="field full"><label for="ev_descricao">Descrição / observações</label><textarea id="ev_descricao">${escapeHTML(item?.descricao||'')}</textarea></div>
  </div><p class="field-error" id="ev_erro" hidden></p><div class="modal-actions"><button type="button" class="btn btn-ghost" id="ev_cancelar">Cancelar</button><button type="submit" class="btn btn-primary">${item?'Salvar alterações':'Criar evento'}</button></div></form>`);
  const rep=document.getElementById('ev_repeticao'), semana=document.getElementById('ev_campo_semana'), ate=document.getElementById('ev_campo_ate');
  const toggle=()=>{const v=rep.value;const recu=v!=='Não repetir';ate.style.display=recu?'':'none';semana.style.display=v==='Semanalmente'?'':'none';};rep.onchange=toggle;toggle();document.getElementById('ev_cancelar').onclick=closeModal;
  document.getElementById('formEvento').onsubmit=e=>{e.preventDefault();const titulo=document.getElementById('ev_titulo').value.trim(),dt=document.getElementById('ev_data').value,inicio=document.getElementById('ev_inicio').value,fim=document.getElementById('ev_fim').value;if(!titulo||!dt){const er=document.getElementById('ev_erro');er.hidden=false;er.textContent='Informe o título e a data.';return;}if(inicio&&fim&&fim<inicio){const er=document.getElementById('ev_erro');er.hidden=false;er.textContent='O horário final não pode ser antes do inicial.';return;}
    const repMap={'Diariamente':'Diária','Semanalmente':'Semanal','Mensalmente':'Mensal','Anualmente':'Anual'},frep=repMap[rep.value], recDados=frep?{frequencia:frep,ate:document.getElementById('ev_ate').value||addDaysISO(dt,365),diaSemana:Number(document.getElementById('ev_diaSemana').value)}:null;
    const dados={titulo,tipo:document.getElementById('ev_tipo').value,prioridade:document.getElementById('ev_prioridade').value,data:dt,horarioInicio:inicio,horarioFim:fim,local:document.getElementById('ev_local').value.trim(),responsavel:document.getElementById('ev_responsavel').value.trim(),participantes:document.getElementById('ev_participantes').value.trim(),descricao:document.getElementById('ev_descricao').value.trim(),tarefaId:document.getElementById('ev_tarefa').value||null};
    if(item){DB.update('eventos',id,{...dados,recorrencia:recDados});registrarHistorico({modulo:'agenda',acao:'edição',descricao:`Evento "${dados.titulo}" editado.`,refId:id});showToast('✓ Evento atualizado.');}
    else {const datas=frep?gerarOcorrenciasEvento(dados,recDados):[dt],grupo=frep?'AGEGRP-'+Date.now().toString(36).toUpperCase():null;datas.forEach((dataOc,i)=>{const novo={id:'AGE-'+Date.now().toString(36).toUpperCase()+'-'+i,...dados,data:dataOc,recorrencia:frep?{...recDados,grupo}:null,criadoEm:Date.now(),atualizadoEm:Date.now()};DB.insert('eventos',novo);});registrarHistorico({modulo:'agenda',acao:'criação',descricao:`Evento "${dados.titulo}" criado${frep?' com recorrência '+frep:''}.`,refId:grupo});showToast(frep?`✓ ${datas.length} ocorrências criadas.`:'✓ Evento criado.');}
    closeModal();renderAgenda();};
}
function abrirDetalheEvento(id){
  const sid=String(id);
  if(sid.startsWith('DOC-')){ abrirDetalheDocumento(sid.replace(/^DOC-/,'')); return; }
  if(sid.startsWith('PRJSTART-')||sid.startsWith('PRJEND-')){ abrirDetalheProjeto(sid.replace(/^PRJ(?:START|END)-/,'')); return; }
  if(sid.startsWith('TASK-')){ const taskId=String(id).replace(/^TASK-/,''); abrirDetalheSolicitacao(taskId); return; }
  const e=DB.getById('eventos',id);if(!e)return;const tarefa=e.tarefaId?DB.getById('solicitacoes',e.tarefaId):null;openModal(`${tipoEventoIcon(e.tipo)} ${e.id}`,`<div class="event-detail"><h2>${escapeHTML(e.titulo)}</h2><div class="detail-grid"><div><span>Tipo</span><strong>${escapeHTML(e.tipo)}</strong></div><div><span>Prioridade</span><strong>${escapeHTML(e.prioridade)}</strong></div><div><span>Data</span><strong>${formatDataAgenda(e.data)}</strong></div><div><span>Horário</span><strong>${e.horarioInicio||'—'}${e.horarioFim?' — '+e.horarioFim:''}</strong></div><div><span>Local</span><strong>${escapeHTML(e.local||'—')}</strong></div><div><span>Responsável</span><strong>${escapeHTML(e.responsavel||'—')}</strong></div><div><span>Participantes</span><strong>${escapeHTML(e.participantes||'—')}</strong></div></div>${e.recorrencia?.frequencia?`<div class="notice-box"><strong>🔄 Evento recorrente</strong><p>${escapeHTML(e.recorrencia.frequencia)} · até ${formatDateBR(e.recorrencia.ate||e.data)}</p></div>`:''}${tarefa?`<div class="notice-box"><strong>📋 Tarefa vinculada</strong><p>${escapeHTML(tarefa.titulo)} · prazo ${formatDateBR(prazoAtividade(tarefa).data||tarefa.prazo)}</p></div>`:''}<div class="detail-block"><div class="detail-label">Descrição</div><div class="detail-value">${escapeHTML(e.descricao||'—')}</div></div><div class="modal-actions"><button class="btn btn-danger" id="ev_excluir">Excluir</button><button class="btn btn-ghost" id="ev_fechar">Fechar</button><button class="btn btn-ghost" id="ev_concluir">${e.concluido?"↩ Reabrir":"✓ Concluir"}</button><button class="btn btn-primary" id="ev_editar">Editar</button></div></div>`);document.getElementById('ev_fechar').onclick=closeModal;document.getElementById('ev_concluir').onclick=()=>{marcarEventoConcluido(id);closeModal();};document.getElementById('ev_editar').onclick=()=>openFormEvento(id);document.getElementById('ev_excluir').onclick=()=>confirmAction('Tem certeza que deseja excluir este evento?',()=>{DB.remove('eventos',id);registrarHistorico({modulo:'agenda',acao:'exclusão',descricao:`Evento "${e.titulo}" excluído.`,refId:id});closeModal();renderAgenda();showToast('✓ Evento excluído.');});}

document.getElementById('agendaPrev')?.addEventListener('click',()=>{if(agendaModo==='semana')agendaDataAtual=new Date(agendaDataAtual.getFullYear(),agendaDataAtual.getMonth(),agendaDataAtual.getDate()-7);else agendaDataAtual=new Date(agendaDataAtual.getFullYear(),agendaDataAtual.getMonth()-1,1);renderAgenda();});
document.getElementById('agendaNext')?.addEventListener('click',()=>{if(agendaModo==='semana')agendaDataAtual=new Date(agendaDataAtual.getFullYear(),agendaDataAtual.getMonth(),agendaDataAtual.getDate()+7);else agendaDataAtual=new Date(agendaDataAtual.getFullYear(),agendaDataAtual.getMonth()+1,1);renderAgenda();});
document.getElementById('agendaHoje')?.addEventListener('click',()=>{const d=new Date();agendaDataAtual=agendaModo==='semana'?d:new Date(d.getFullYear(),d.getMonth(),1);renderAgenda();});
document.querySelectorAll('[data-agenda-view]').forEach(b=>b.addEventListener('click',()=>{agendaModo=b.dataset.agendaView;document.querySelectorAll('[data-agenda-view]').forEach(x=>x.className='btn btn-sm '+(x===b?'btn-primary':'btn-ghost'));renderAgenda();}));
document.getElementById('agendaBusca')?.addEventListener('input',renderAgenda);
document.querySelector('[data-action="novo-evento"]')?.addEventListener('click',()=>openFormEvento());
document.getElementById('agendaImprimir')?.addEventListener('click',imprimirAgenda);
document.getElementById('agendaBackup')?.addEventListener('click',exportarAgendaBackup);
document.getElementById('agendaTelaCheia')?.addEventListener('click',alternarTelaCheia);
document.addEventListener('fullscreenchange',()=>document.getElementById('view-agenda')?.classList.toggle('agenda-fullscreen',!!document.fullscreenElement));
const agendaImportInput=document.createElement('input'); agendaImportInput.type='file'; agendaImportInput.accept='.json,application/json'; agendaImportInput.hidden=true; document.body.appendChild(agendaImportInput); agendaImportInput.onchange=()=>{importarAgendaBackup(agendaImportInput.files[0]);agendaImportInput.value='';};
document.getElementById('agendaImportar')?.addEventListener('click',()=>agendaImportInput.click());
setInterval(notificarAgenda,60000); setTimeout(notificarAgenda,1200);


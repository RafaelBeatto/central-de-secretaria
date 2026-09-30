/* =========================================================
   DOCUMENTOS
   Documentos da instituição separados pelo que exige ação:
   vencidos, vencendo em 30 dias, em dia e sem validade. Renovar
   atualiza o próprio documento e guarda a versão anterior (com o
   arquivo) em "Versões anteriores". Detalhe no painel ao lado.
   ========================================================= */

const CATEGORIAS_DOCUMENTO=['Certidão','Ofício','Ata','Contrato','Relatório','Declaração','Comprovante','Documento financeiro','Documento institucional','Convênio','Outros'];
const DC_GRUPOS=[['vencido','Vencidos'],['vencendo','Vencem em até 30 dias'],['valido','Em dia'],['sem_validade','Sem validade']];
const DC_VALIDADES_RAPIDAS=[['30 dias',30],['90 dias',90],['6 meses',180],['1 ano',365]];

let dcEstado={ sel:null, busca:'', categoria:'', responsavel:'' };
let dcMigrado=false;

/* Ajustes únicos de dados antigos (idempotentes):
   - vínculos guardados no próprio documento passam para os relacionamentos,
     que é o que o formulário e o detalhe usam;
   - tarefas automáticas "Renovar documento" deixam de existir: a renovação
     agora é acompanhada aqui mesmo, e essas tarefas não apareciam em lugar
     nenhum além do Kanban. */
function dcMigrar(){
  if(dcMigrado || typeof RelacionamentosDB==='undefined') return;
  dcMigrado=true;
  DB.getAll('documentos').filter(d=>Array.isArray(d.vinculos)&&d.vinculos.length).forEach(d=>{
    d.vinculos.filter(v=>v&&v.tipo&&v.id).forEach(v=>RelacionamentosDB.adicionar('documento',d.id,v.tipo,v.id));
    DB.update('documentos',d.id,{vinculos:[]});
  });
  DB.getAll('solicitacoes').filter(t=>ehTarefaRenovacaoDocumento(t)&&!['Concluída','Cancelada'].includes(t.status)).forEach(t=>{
    DB.update('solicitacoes',t.id,{status:'Cancelada',motivoCancelamento:'A renovação passou a ser acompanhada direto em Documentos.'});
  });
}

/* ---------- textos de prazo ---------- */
function dcPrazoTexto(d){
  if(!d.dataValidade) return 'Sem validade';
  const dias=daysDiffFromToday(d.dataValidade);
  if(dias<0) return `Venceu há ${-dias} dia${dias===-1?'':'s'}`;
  if(dias===0) return 'Vence hoje';
  if(dias<=30) return `Vence em ${dias} dia${dias===1?'':'s'}`;
  return `Válido até ${formatDateBR(d.dataValidade)}`;
}
/* Arquivos trazidos das execuções continuam referenciados lá; só apaga o
   arquivo se nenhuma execução apontar para ele. */
function dcRemoverArquivo(anexo){
  if(!anexo) return;
  const emUso=DB.getAll('projetos').some(p=>(p.docsApae||[]).some(x=>x?.anexo?.id===anexo.id));
  if(!emUso) return ProjectFiles.remove(anexo.id);
}
function dcSomarDias(iso,n){ const d=parseISODate(iso||todayISO()); d.setDate(d.getDate()+n); return isoFromDate(d); }

/* ---------- abrir a partir de outras telas ---------- */
function abrirDetalheDocumento(id){
  if(!DB.getById('documentos',id)) return;
  dcEstado.sel=id;
  if(!document.getElementById('modalBackdrop').hidden) closeModal();
  if(typeof currentView!=='undefined' && currentView!=='documentos') goToView('documentos'); else renderDocumentos();
  if(window.innerWidth<=1100) document.getElementById('dcRoot')?.scrollIntoView({block:'start'});
}

/* ---------- desenho ---------- */
const dcEsc = s => escapeHTML(s ?? '');

function dcLinhaHTML(d){
  const sit=situacaoDocumento(d);
  const precisa=['vencido','vencendo'].includes(sit.chave);
  const meta=[d.categoria, d.orgao, d.numero&&`Nº ${d.numero}`, d.responsavel].filter(Boolean).map(dcEsc).join(' · ');
  return `<div class="dc-linha ${dcEstado.sel===d.id?'is-sel':''}" data-id="${dcEsc(d.id)}">
    <button type="button" class="dc-linha-corpo" data-dc="abrir" data-id="${dcEsc(d.id)}">
      <span class="dc-nome">${dcEsc(d.nome)}${d.anexo?' <span class="dc-clipe" title="Tem arquivo">📎</span>':''}</span>
      ${meta?`<span class="dc-meta">${meta}</span>`:''}
    </button>
    <span class="dc-prazo tom-${sit.tom}">${dcPrazoTexto(d)}${d.dataValidade && sit.chave!=='valido'?`<small>${formatDateBR(d.dataValidade)}</small>`:''}</span>
    <span class="dc-linha-acoes">${precisa?`<button type="button" class="btn btn-sm ${sit.chave==='vencido'?'btn-primary':''}" data-dc="renovar" data-id="${dcEsc(d.id)}">Renovar</button>`:''}</span>
  </div>`;
}

function dcListaHTML(){
  const todos=DB.getAll('documentos');
  if(!todos.length) return `<div class="dc-vazio"><strong>Nenhum documento ainda</strong><span>Cadastre certidões, atas, contratos e outros documentos da APAE. Quando um documento tiver validade, ele aparece aqui na hora certa de renovar.</span><button type="button" class="btn btn-primary btn-sm" data-dc="novo">＋ Cadastrar documento</button></div>`;
  const q=normalizarFiltro(dcEstado.busca);
  const lista=todos.filter(d=>
    (!q || normalizarFiltro([d.id,d.nome,d.numero,d.orgao,d.responsavel,d.categoria,d.descricao,d.tags,d.arquivoRef].filter(Boolean).join(' ')).includes(q)) &&
    (!dcEstado.categoria || (d.categoria||'Outros')===dcEstado.categoria) &&
    (!dcEstado.responsavel || (d.responsavel||'')===dcEstado.responsavel));
  const grupos={}; lista.forEach(d=>{ const k=situacaoDocumento(d).chave; (grupos[k]=grupos[k]||[]).push(d); });
  const html=DC_GRUPOS.map(([k,rotulo])=>{
    const itens=(grupos[k]||[]).sort((a,b)=> k==='sem_validade' ? String(a.nome).localeCompare(String(b.nome),'pt-BR') : String(a.dataValidade).localeCompare(String(b.dataValidade)));
    if(!itens.length) return '';
    return `<section class="dc-grupo is-${k}"><div class="dc-grupo-cab"><h3>${rotulo}</h3><span class="dc-cont">${itens.length}</span></div>${itens.map(dcLinhaHTML).join('')}</section>`;
  }).join('');
  return html || '<div class="dc-vazio"><span>Nenhum documento com esses filtros.</span></div>';
}

function dcDetalheHTML(d){
  const sit=situacaoDocumento(d);
  const versoes=[...(d.versoes||[])].reverse();
  const hist=DB.getAll('historico').filter(h=>h.refId===d.id).sort((a,b)=>b.timestamp-a.timestamp);
  const relacionados=typeof renderRelacionados==='function' ? renderRelacionados('documento', d.id) : '';
  const fato=(rotulo,valor)=>valor?`<div><dt>${rotulo}</dt><dd>${valor}</dd></div>`:'';
  return `<div class="dc-det-topo"><button type="button" class="dc-voltar" data-dc="fechar">← Documentos</button><button type="button" class="dc-fechar" data-dc="fechar" aria-label="Fechar detalhe">✕</button></div>
    <span class="dc-codigo">${dcEsc(d.id)} · ${dcEsc(d.categoria||'Outros')}</span>
    <h2>${dcEsc(d.nome)}</h2>
    <div class="dc-situacao tom-${sit.tom}"><strong>${sit.emoji} ${dcPrazoTexto(d)}</strong>${d.dataValidade && sit.chave!=='valido'?`<span>Validade: ${formatDateBR(d.dataValidade)}</span>`:''}</div>
    <div class="dc-det-acoes">
      ${d.dataValidade?`<button type="button" class="btn btn-sm ${['vencido','vencendo'].includes(sit.chave)?'btn-primary':''}" data-dc="renovar" data-id="${dcEsc(d.id)}">Renovar</button>`:''}
      ${d.anexo?`<button type="button" class="btn btn-sm" data-dc="arquivo" data-anexo="${dcEsc(d.anexo.id)}">📎 Abrir arquivo</button>`:''}
      <button type="button" class="btn btn-sm" data-dc="editar" data-id="${dcEsc(d.id)}">Editar</button>
      <button type="button" class="btn btn-sm dc-perigo" data-dc="excluir" data-id="${dcEsc(d.id)}">Excluir</button>
    </div>
    <dl class="dc-fatos">
      ${fato('Número',dcEsc(d.numero))}
      ${fato('Órgão emissor',dcEsc(d.orgao))}
      ${fato('Emissão',d.dataEmissao?formatDateBR(d.dataEmissao):'')}
      ${fato('Validade',d.dataValidade?formatDateBR(d.dataValidade):'Sem validade')}
      ${fato('Responsável',dcEsc(d.responsavel))}
      ${fato('Vale nos projetos como',dcEsc(d.exigenciaApae))}
      ${fato('Onde está guardado',dcEsc(d.arquivoRef))}
      ${fato('Tags',dcEsc(d.tags))}
      ${!d.anexo?fato('Arquivo','<span class="dc-sem">Nenhum arquivo anexado</span>'):''}
    </dl>
    ${d.descricao?`<div class="dc-texto">${dcEsc(d.descricao)}</div>`:''}
    ${d.observacoes?`<div class="dc-texto">${dcEsc(d.observacoes)}</div>`:''}
    ${versoes.length?`<h4 class="dc-subtitulo">Versões anteriores (${versoes.length})</h4><ul class="dc-versoes">${versoes.map(v=>`<li><div><strong>${v.dataValidade?`Válida até ${formatDateBR(v.dataValidade)}`:'Sem validade'}</strong><small>${[v.dataEmissao&&`emitida em ${formatDateBR(v.dataEmissao)}`, v.numero&&`Nº ${dcEsc(v.numero)}`, v.arquivadoEm&&`substituída em ${formatDateBR(isoFromDate(new Date(v.arquivadoEm)))}`].filter(Boolean).join(' · ')}</small></div>${v.anexo?`<button type="button" class="btn btn-sm" data-dc="arquivo" data-anexo="${dcEsc(v.anexo.id)}">📎 Abrir</button>`:''}</li>`).join('')}</ul>`:''}
    ${relacionados}
    <h4 class="dc-subtitulo">Histórico</h4>
    ${hist.length?`<ol class="dc-hist">${hist.slice(0,30).map(h=>`<li><time>${timestampToBR(h.timestamp)}</time>${dcEsc(h.descricao)}</li>`).join('')}</ol>`:'<p class="dc-sem">Sem registros ainda.</p>'}`;
}

function renderDocumentos(){
  const root=document.getElementById('dcRoot'); if(!root) return;
  dcMigrar();
  const todos=DB.getAll('documentos');
  const sel=dcEstado.sel ? DB.getById('documentos',dcEstado.sel) : null;
  if(!sel) dcEstado.sel=null;
  const responsaveis=[...new Set(todos.map(d=>d.responsavel).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'pt-BR'));
  const categorias=[...new Set([...CATEGORIAS_DOCUMENTO, ...todos.map(d=>d.categoria).filter(Boolean)])];
  const focoBusca=document.activeElement?.id==='dcBusca';
  root.innerHTML=`<div class="dc-layout ${sel?'tem-detalhe':''}">
    <div class="dc-principal">
      ${todos.length?`<div class="dc-filtros">
        <input type="search" class="input" id="dcBusca" placeholder="Buscar por nome, número, órgão…" value="${dcEsc(dcEstado.busca)}" aria-label="Buscar documento">
        <select class="input" id="dcCategoria" aria-label="Categoria"><option value="">Todas as categorias</option>${categorias.map(c=>`<option ${c===dcEstado.categoria?'selected':''}>${dcEsc(c)}</option>`).join('')}</select>
        ${responsaveis.length?`<select class="input" id="dcResp" aria-label="Responsável"><option value="">Todos os responsáveis</option>${responsaveis.map(r=>`<option ${r===dcEstado.responsavel?'selected':''}>${dcEsc(r)}</option>`).join('')}</select>`:''}
      </div>`:''}
      <div id="dcLista">${dcListaHTML()}</div>
    </div>
    ${sel?`<aside class="dc-detalhe" aria-label="Detalhe do documento">${dcDetalheHTML(sel)}</aside>`:''}
  </div>`;
  if(focoBusca){ const b=document.getElementById('dcBusca'); b.focus(); b.setSelectionRange(b.value.length,b.value.length); }
}

/* ---------- formulários ---------- */
function dcAtalhosValidade(idEmissao,idValidade){
  return `<div class="dc-atalhos" data-emissao="${idEmissao}" data-validade="${idValidade}">${DC_VALIDADES_RAPIDAS.map(([l,n])=>`<button type="button" class="btn btn-sm" data-dias="${n}">+${l}</button>`).join('')}</div>`;
}
function dcLigarAtalhos(){
  document.querySelectorAll('.dc-atalhos').forEach(box=>box.querySelectorAll('[data-dias]').forEach(b=>b.onclick=()=>{
    const emissao=document.getElementById(box.dataset.emissao).value||todayISO();
    document.getElementById(box.dataset.validade).value=dcSomarDias(emissao,Number(b.dataset.dias));
  }));
}

function openFormDocumento(id, pre={}){
  const item=typeof id==='string' ? DB.getById('documentos',id) : null;
  const exigencia=item ? (item.exigenciaApae||'') : (pre.exigenciaApae||'');
  const nomeInicial=item?.nome || pre.exigenciaApae || '';
  const categoriaInicial=item?.categoria || (pre.exigenciaApae ? (CATEGORIA_EXIGENCIA_APAE[pre.exigenciaApae]||'Certidão') : 'Certidão');
  const responsaveis=[...new Set(DB.getAll('documentos').map(d=>d.responsavel).filter(Boolean))];
  const esc=escapeHTML;
  openModal(item?'Editar documento':'Novo documento',`<form id="formDocumento" novalidate><div class="form-grid">
    <div class="field full"><label for="d_nome">Nome do documento *</label><input class="input" id="d_nome" required placeholder="Ex.: Certidão Negativa de Débitos Federais" value="${esc(nomeInicial)}"></div>
    <div class="field"><label for="d_categoria">Categoria</label><select class="input" id="d_categoria">${CATEGORIAS_DOCUMENTO.map(c=>`<option ${categoriaInicial===c?'selected':''}>${c}</option>`).join('')}</select></div>
    <div class="field"><label for="d_exigencia">Vale como documento da APAE nos projetos</label><select class="input" id="d_exigencia"><option value="">Não</option>${DOCS_APAE_OBRIGATORIOS.map(x=>`<option ${exigencia===x?'selected':''}>${x}</option>`).join('')}</select></div>
    <div class="field"><label for="d_orgao">Órgão emissor</label><input class="input" id="d_orgao" placeholder="Ex.: Receita Federal" value="${esc(item?.orgao||'')}"></div>
    <div class="field"><label for="d_numero">Número / identificação</label><input class="input" id="d_numero" value="${esc(item?.numero||'')}"></div>
    <div class="field"><label for="d_responsavel">Responsável</label><input class="input" id="d_responsavel" list="dcRespLista" value="${esc(item?.responsavel||'')}"><datalist id="dcRespLista">${responsaveis.map(r=>`<option value="${esc(r)}">`).join('')}</datalist></div>
    <div class="field"><label for="d_dataEmissao">Emissão</label><input class="input" type="date" id="d_dataEmissao" value="${item?.dataEmissao||todayISO()}"></div>
    <div class="field"><label for="d_dataValidade">Validade <span class="muted">(deixe vazio se não vence)</span></label><input class="input" type="date" id="d_dataValidade" value="${item?.dataValidade||''}">${dcAtalhosValidade('d_dataEmissao','d_dataValidade')}</div>
    <div class="field full"><label for="d_arquivo">Arquivo ${item?.anexo?`<span class="muted">(atual: ${esc(item.anexo.nome||'arquivo')} — envie outro só para substituir)</span>`:''}</label><input class="input" type="file" id="d_arquivo" accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx"></div>
    <div class="field"><label for="d_arquivoRef">Onde está guardado</label><input class="input" id="d_arquivoRef" placeholder="Pasta, armário, link…" value="${esc(item?.arquivoRef||'')}"></div>
    <div class="field"><label for="d_tags">Tags</label><input class="input" id="d_tags" placeholder="Ex.: convênio, prestação de contas" value="${esc(item?.tags||'')}"></div>
    <div class="field full"><label for="d_descricao">Para que serve</label><textarea id="d_descricao">${esc(item?.descricao||'')}</textarea></div>
    <div class="field full"><label for="d_observacoes">Observações</label><textarea id="d_observacoes">${esc(item?.observacoes||'')}</textarea></div>
    ${item?`<div class="field full"><label>🔗 Vincular a outros registros</label><div class="relacionados-form-section">${renderSelectorRelacionados('documento',item.id,'projeto')}</div></div>`:''}
  </div><p class="field-error" id="formErroDoc" hidden></p><div class="modal-actions"><button type="button" class="btn btn-ghost" id="btnCancelarFormDoc">Cancelar</button><button type="submit" class="btn btn-primary">${item?'Salvar alterações':'Cadastrar documento'}</button></div></form>`);
  dcLigarAtalhos();
  document.getElementById('btnCancelarFormDoc').onclick=closeModal;
  document.getElementById('formDocumento').onsubmit=async e=>{
    e.preventDefault();
    const $=i=>document.getElementById(i);
    const erro=t=>{ $('formErroDoc').hidden=false; $('formErroDoc').textContent=t; };
    const nome=$('d_nome').value.trim();
    if(!nome) return erro('Informe o nome do documento.');
    const dados={nome,categoria:$('d_categoria').value,numero:$('d_numero').value.trim(),orgao:$('d_orgao').value.trim(),responsavel:$('d_responsavel').value.trim(),dataEmissao:$('d_dataEmissao').value||null,dataValidade:$('d_dataValidade').value||null,arquivoRef:$('d_arquivoRef').value.trim(),tags:$('d_tags').value.trim(),descricao:$('d_descricao').value.trim(),observacoes:$('d_observacoes').value.trim(),exigenciaApae:$('d_exigencia').value||null};
    if(dados.dataEmissao && dados.dataValidade && dados.dataValidade<dados.dataEmissao) return erro('A validade não pode ser antes da emissão.');
    const f=$('d_arquivo').files[0];
    if(f){ await dcRemoverArquivo(item?.anexo); dados.anexo=await salvarAnexo(f,'documento'); }
    if(item){
      DB.update('documentos',item.id,dados);
      registrarHistorico({modulo:'documento',acao:'edição',descricao:`Documento "${nome}" editado.`,refId:item.id});
      showToast('✓ Documento atualizado.');
    } else {
      const novo={id:DB.nextId('DOC','documento'),...dados,anexo:dados.anexo||null,versoes:[],criadoEm:Date.now(),atualizadoEm:Date.now()};
      DB.insert('documentos',novo);
      if(!DB.getById('documentos',novo.id)){ showToast('⚠ Não foi possível salvar o documento.'); return; }
      registrarHistorico({modulo:'documento',acao:'criação',descricao:`Documento "${nome}" cadastrado.`,refId:novo.id});
      showToast('✓ Documento cadastrado.');
      dcEstado.sel=novo.id;
    }
    closeModal(); renderCurrentView();
  };
  if(item) processarRelacionadosEmForm('documento',item.id,'formDocumento');
}

/* Renovar = o mesmo documento com nova emissão/validade/arquivo; a versão
   anterior (com o arquivo dela) fica guardada em d.versoes. */
function abrirFormRenovarDocumento(id){
  const d=DB.getById('documentos',id); if(!d) return;
  const esc=escapeHTML;
  openModal(`Renovar: ${d.nome}`,`<form id="formRenovar" novalidate>
    <p class="dc-renovar-atual">Validade atual: <strong>${d.dataValidade?formatDateBR(d.dataValidade):'sem validade'}</strong>${d.anexo?' · o arquivo atual vai para “Versões anteriores”':''}.</p>
    <div class="form-grid">
      <div class="field"><label for="rn_emissao">Nova emissão *</label><input class="input" type="date" id="rn_emissao" required value="${todayISO()}"></div>
      <div class="field"><label for="rn_validade">Nova validade *</label><input class="input" type="date" id="rn_validade" required>${dcAtalhosValidade('rn_emissao','rn_validade')}</div>
      <div class="field"><label for="rn_numero">Número</label><input class="input" id="rn_numero" value="${esc(d.numero||'')}"></div>
      <div class="field"><label for="rn_arquivo">Novo arquivo</label><input class="input" type="file" id="rn_arquivo" accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx"></div>
    </div>
    <p class="field-error" id="rnErro" hidden></p>
    <div class="modal-actions"><button type="button" class="btn btn-ghost" id="rnCancelar">Cancelar</button><button type="submit" class="btn btn-primary">✓ Renovar</button></div>
  </form>`);
  dcLigarAtalhos();
  document.getElementById('rnCancelar').onclick=closeModal;
  document.getElementById('formRenovar').onsubmit=async e=>{
    e.preventDefault();
    const $=i=>document.getElementById(i);
    const emissao=$('rn_emissao').value, validade=$('rn_validade').value;
    const erro=t=>{ $('rnErro').hidden=false; $('rnErro').textContent=t; };
    if(!emissao||!validade) return erro('Informe a nova emissão e a nova validade.');
    if(validade<emissao) return erro('A validade não pode ser antes da emissão.');
    const f=$('rn_arquivo').files[0];
    const anterior={numero:d.numero||'',dataEmissao:d.dataEmissao||null,dataValidade:d.dataValidade||null,anexo:d.anexo||null,arquivadoEm:Date.now()};
    DB.update('documentos',d.id,{dataEmissao:emissao,dataValidade:validade,numero:$('rn_numero').value.trim(),anexo:f?await salvarAnexo(f,'documento'):null,versoes:[...(d.versoes||[]),anterior]});
    registrarHistorico({modulo:'documento',acao:'renovação',descricao:`Documento "${d.nome}" renovado: nova validade ${formatDateBR(validade)} (antes ${d.dataValidade?formatDateBR(d.dataValidade):'sem validade'}).`,refId:d.id});
    showToast(`✓ Renovado até ${formatDateBR(validade)}.`);
    dcEstado.sel=d.id;
    closeModal(); renderCurrentView();
  };
}

function dcExcluir(id){
  const d=DB.getById('documentos',id); if(!d) return;
  const versoes=(d.versoes||[]).filter(v=>v.anexo).length;
  confirmAction(`Excluir "${d.nome}"? O arquivo${versoes?` e os ${versoes} arquivo(s) das versões anteriores também serão removidos`:' anexado também será removido'}.`, async()=>{
    for(const a of [d.anexo,...(d.versoes||[]).map(v=>v.anexo)].filter(Boolean)) await dcRemoverArquivo(a);
    DB.remove('documentos',id);
    if(typeof RelacionamentosDB!=='undefined') RelacionamentosDB.limparPorRegistro('documento',id);
    registrarHistorico({modulo:'documento',acao:'exclusão',descricao:`Documento "${d.nome}" excluído.`,refId:id});
    if(dcEstado.sel===id) dcEstado.sel=null;
    showToast('Documento excluído.');
    renderCurrentView();
  });
}

/* ---------- despachante ---------- */
const DC_ACOES={
  'abrir': b => { dcEstado.sel = dcEstado.sel===b.dataset.id && window.innerWidth>1100 ? null : b.dataset.id; renderDocumentos(); if(window.innerWidth<=1100) document.getElementById('dcRoot').scrollIntoView({block:'start'}); },
  'fechar': () => { const id=dcEstado.sel; dcEstado.sel=null; renderDocumentos(); document.querySelector(`.dc-linha[data-id="${CSS.escape(id||'')}"]`)?.scrollIntoView({block:'center'}); },
  'novo': () => openFormDocumento(),
  'renovar': b => abrirFormRenovarDocumento(b.dataset.id),
  'editar': b => openFormDocumento(b.dataset.id),
  'excluir': b => dcExcluir(b.dataset.id),
  'arquivo': b => baixarAnexo(b.dataset.anexo)
};

(function ligarDocumentos(){
  const root=document.getElementById('dcRoot'); if(!root) return;
  root.addEventListener('click', e=>{
    const b=e.target.closest('[data-dc]');
    if(!b || !root.contains(b) || b.disabled) return;
    DC_ACOES[b.dataset.dc]?.(b);
  });
  root.addEventListener('input', e=>{ if(e.target.id==='dcBusca'){ dcEstado.busca=e.target.value; document.getElementById('dcLista').innerHTML=dcListaHTML(); } });
  root.addEventListener('change', e=>{
    if(e.target.id==='dcCategoria') dcEstado.categoria=e.target.value;
    else if(e.target.id==='dcResp') dcEstado.responsavel=e.target.value;
    else return;
    document.getElementById('dcLista').innerHTML=dcListaHTML();
  });
})();

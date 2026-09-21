/* ---------------------------------------------------------
   13. DOCUMENTOS
   --------------------------------------------------------- */
function calcularPrazoRenovacao(dataValidade){
  const d=parseISODate(dataValidade); if(!d) return todayISO();
  d.setDate(d.getDate()-15);
  const hoje=parseISODate(todayISO());
  return d<hoje?todayISO():isoFromDate(d);
}
function garantirTarefaRenovacaoDocumento(d){
  if(!d?.dataValidade) return null;
  const situacao=situacaoDocumento(d).chave;
  const tarefas=DB.getAll('solicitacoes');
  const existentes=tarefas.filter(t=>t.origemDocumentoId===d.id && t.criadoAutomaticamente);
  const ativa=existentes.find(t=>!['Concluída','Cancelada'].includes(t.status));
  const emAtencao=['vencendo','vencido'].includes(situacao);

  if(!emAtencao){
    existentes.filter(t=>!['Concluída','Cancelada'].includes(t.status)).forEach(t=>{
      DB.update('solicitacoes',t.id,{status:'Cancelada',motivoCancelamento:'Documento renovado/fora do período de renovação automática.'});
      registrarHistorico({modulo:'documento',acao:'renovação',descricao:`Tarefa automática de renovação cancelada para "${d.nome}" porque o documento não está mais em situação de atenção.`,refId:d.id});
    });
    return null;
  }

  const prazo=situacao==='vencido'?todayISO():calcularPrazoRenovacao(d.dataValidade);
  const prioridade=situacao==='vencido'?'Urgente':'Alta';
  if(ativa){
    DB.update('solicitacoes',ativa.id,{titulo:`Renovar documento: ${d.nome}`,prioridade,prazo,responsavel:d.responsavel||ativa.responsavel||'',descricao:`${situacao==='vencido'?'Renovar imediatamente':'Renovar antes'} o documento "${d.nome}". Validade atual: ${formatDateBR(d.dataValidade)}.`,categoria:'Documentos'});
    return ativa.id;
  }

  const novo={
    id:DB.nextId('SOL','solicitacao'),
    titulo:`Renovar documento: ${d.nome}`,
    tipo:'Tarefa', prioridade,
    descricao:`${situacao==='vencido'?'Renovar imediatamente':'Renovar antes'} o documento "${d.nome}". Validade atual: ${formatDateBR(d.dataValidade)}.`,
    responsavel:d.responsavel||'', categoria:'Documentos', prazo, status:'Pendente',
    recorrencia:null, origemDocumentoId:d.id, criadoAutomaticamente:true,
    criadoEm:Date.now(), atualizadoEm:Date.now()
  };
  DB.insert('solicitacoes',novo);
  registrarHistorico({modulo:'documento',acao:'renovação',descricao:`Tarefa de renovação criada automaticamente para "${d.nome}".`,refId:d.id});
  return novo.id;
}
function sincronizarTarefasRenovacaoDocumentos(documentos){
  (documentos||[]).forEach(d=>garantirTarefaRenovacaoDocumento(d));
}
function vinculosDocumentoNormalizados(d){
  return Array.isArray(d?.vinculos)?d.vinculos.filter(v=>v&&v.tipo&&v.id):[];
}
function obterOpcoesVinculoDocumento(item){
  const vinculos=vinculosDocumentoNormalizados(item);
  const marcado=(tipo,id)=>vinculos.some(v=>v.tipo===tipo&&v.id===id);
  const projetos=DB.getAll('projetos').sort((a,b)=>String(a.nome||'').localeCompare(String(b.nome||''),'pt-BR'));
  const grupo=(titulo,tipo,lista,labelFn)=>`<div class="doc-link-group"><strong>${titulo}</strong>${lista.length?lista.map(x=>`<label class="doc-link-option"><input type="checkbox" name="d_vinculo" value="${tipo}:${escapeHTML(x.id)}" ${marcado(tipo,x.id)?'checked':''}><span>${escapeHTML(labelFn(x))}</span></label>`).join(''):'<span class="muted">Nenhum cadastrado.</span>'}</div>`;
  return grupo('Projetos','projeto',projetos,x=>`${x.codigo||x.id} — ${x.nome}`);
}
function textoVinculoDocumento(v){
  if(v.tipo!=='projeto') return null;
  const item=DB.getById('projetos',v.id);
  if(!item) return null;
  return {tipo:'Projeto',nome:`${item.codigo||item.id} — ${item.nome}`,action:()=>abrirDetalheProjeto(item.id)};
}

function renderDocumentos(){
  const todos = DB.getAll('documentos');
  sincronizarTarefasRenovacaoDocumentos(todos);
  const validos = todos.filter(d=>situacaoDocumento(d).chave==='valido').length;
  const vencendoCount = todos.filter(d=>situacaoDocumento(d).chave==='vencendo').length;
  const vencidos = todos.filter(d=>situacaoDocumento(d).chave==='vencido').length;
  document.getElementById('docStatTotal').textContent=todos.length;
  document.getElementById('docStatValidos').textContent=validos;
  document.getElementById('docStatVencendo').textContent=vencendoCount;
  document.getElementById('docStatVencidos').textContent=vencidos;

  // Mantém a opção atualmente escolhida ao atualizar a lista de responsáveis.
  const responsavelSelect=document.querySelector('#filtrosDocumentos [data-filter="responsavel"]');
  const responsavelAtual=responsavelSelect?.value||'';
  populateResponsavelFilter('#filtrosDocumentos [data-filter="responsavel"]', todos);
  if(responsavelSelect && responsavelAtual && [...responsavelSelect.options].some(o=>o.value===responsavelAtual)) responsavelSelect.value=responsavelAtual;

  const filtros=getFiltrosValores('filtrosDocumentos');
  const q=normalizarFiltro(filtros.busca);
  const categoria=normalizarFiltro(filtros.categoria);
  const situacao=normalizarFiltro(filtros.situacao);
  const responsavel=normalizarFiltro(filtros.responsavel);

  let lista=todos.filter(d=>{
    if(q){
      const texto=normalizarFiltro([d.id,d.nome,d.numero,d.orgao,d.responsavel,d.categoria,d.descricao,d.tags,d.arquivoRef].filter(v=>v!=null).join(' '));
      if(!texto.includes(q)) return false;
    }
    if(categoria && normalizarFiltro(d.categoria)!==categoria) return false;
    if(situacao && normalizarFiltro(situacaoDocumento(d).chave)!==situacao) return false;
    if(responsavel && normalizarFiltro(d.responsavel)!==responsavel) return false;
    return true;
  });

  lista.sort((a,b)=>{
    const da=a.dataValidade?parseISODate(a.dataValidade)?.getTime()||Infinity:Infinity;
    const db_=b.dataValidade?parseISODate(b.dataValidade)?.getTime()||Infinity:Infinity;
    return da-db_ || String(a.nome||'').localeCompare(String(b.nome||''),'pt-BR');
  });

  const atencao=todos.filter(d=>['vencido','vencendo'].includes(situacaoDocumento(d).chave)).sort((a,b)=>{
    const da=a.dataValidade?parseISODate(a.dataValidade)?.getTime()||Infinity:Infinity;
    const db_=b.dataValidade?parseISODate(b.dataValidade)?.getTime()||Infinity:Infinity;
    return da-db_;
  });
  document.getElementById('painelVencendo').style.display=atencao.length?'':'none';
  document.getElementById('listaVencendo').innerHTML=atencao.map(d=>{
    const sit=situacaoDocumento(d), dias=daysDiffFromToday(d.dataValidade);
    const texto=sit.chave==='vencido'?`Vencido há ${Math.abs(dias)} dia${Math.abs(dias)===1?'':'s'}`:`Vence em ${dias===0?'hoje':dias===1?'amanhã':dias+' dias'}`;
    return `<div class="attn-item" data-id="${d.id}"><span class="attn-dot ${sit.tom==='danger'?'danger':'warn'}"></span><div class="attn-main"><div class="attn-title">${escapeHTML(d.nome)}</div><div class="attn-sub">${formatDateBR(d.dataValidade)} — ${texto}</div></div><span class="muted">${escapeHTML(d.responsavel||'')}</span></div>`;
  }).join('');
  document.querySelectorAll('#listaVencendo .attn-item').forEach(el=>el.addEventListener('click',()=>abrirDetalheDocumento(el.dataset.id)));

  const tbody=document.querySelector('#tabelaDocumentos tbody');
  document.getElementById('vazioDocumentos').hidden=lista.length!==0;
  document.getElementById('tabelaDocumentos').style.display=lista.length?'':'none';
  tbody.innerHTML=lista.map(d=>{
    const sit=situacaoDocumento(d);
    return `<tr class="${sit.chave==='vencido'?'is-late':''}" data-id="${d.id}">
      <td><span class="muted" style="font-family:var(--font-mono)">${escapeHTML(d.id)}</span></td>
      <td><strong>${escapeHTML(d.nome)}</strong>${d.numero?`<small class="table-sub">Nº ${escapeHTML(d.numero)}</small>`:''}</td>
      <td>${escapeHTML(d.categoria||'Outros')}</td><td>${escapeHTML(d.responsavel||'—')}</td>
      <td>${d.dataEmissao?formatDateBR(d.dataEmissao):'—'}</td><td>${d.dataValidade?formatDateBR(d.dataValidade):'Sem validade'}</td>
      <td>${badgeHTML(sit.tom,sit.emoji+' '+sit.label)}</td>
      <td>${d.anexo?`<button class="btn btn-sm" data-act="arquivo">📎 Abrir</button>`:'—'}</td>
      <td class="row-actions"><button class="btn btn-sm btn-primary" data-act="ver">Acessar</button><button class="btn btn-sm" data-act="editar">Editar</button><button class="btn btn-sm btn-danger" data-act="excluir">Excluir</button></td>
    </tr>`;
  }).join('');
  tbody.querySelectorAll('tr').forEach(tr=>{
    const id=tr.dataset.id;
    tr.querySelector('[data-act="ver"]').addEventListener('click',()=>abrirDetalheDocumento(id));
    tr.querySelector('[data-act="editar"]').addEventListener('click',()=>openFormDocumento(id));
    tr.querySelector('[data-act="arquivo"]')?.addEventListener('click',()=>baixarAnexo(DB.getById('documentos',id)?.anexo?.id));
    tr.querySelector('[data-act="excluir"]').addEventListener('click',()=>confirmAction('Excluir este documento? O arquivo anexado também será removido.',async()=>{
      const item=DB.getById('documentos',id); if(item?.anexo) await ProjectFiles.remove(item.anexo.id); DB.remove('documentos',id);
      registrarHistorico({modulo:'documento',acao:'exclusão',descricao:`Documento "${item?.nome||id}" excluído.`,refId:id}); showToast('Documento excluído.'); renderDocumentos();
    }));
  });
}

document.getElementById('btnAplicarFiltrosDocumentos')?.addEventListener('click',()=>{
  renderDocumentos();
});
document.getElementById('btnLimparFiltrosDocumentos')?.addEventListener('click',()=>{
  document.querySelectorAll('#filtrosDocumentos [data-filter]').forEach(el=>el.value='');
  renderDocumentos();
});
document.querySelector('#filtrosDocumentos [data-filter="busca"]')?.addEventListener('keydown',e=>{
  if(e.key==='Enter') renderDocumentos();
});
document.querySelector('[data-action="novo-documento"]')?.addEventListener('click',()=>openFormDocumento());

const CATEGORIAS_DOCUMENTO=['Certidão','Ofício','Ata','Contrato','Relatório','Declaração','Comprovante','Documento financeiro','Documento institucional','Convênio','Outros'];
function openFormDocumento(id){
  const item=id?DB.getById('documentos',id):null;
  const responsaveis=uniqueResponsaveis(DB.getAll('documentos'));
  openModal(item?'Editar documento':'Novo documento',`
    <form id="formDocumento" novalidate><div class="form-grid">
      <div class="field full"><label>Nome do documento *</label><input class="input" id="d_nome" required placeholder="Ex.: Certidão Negativa Federal" value="${escapeHTML(item?.nome||'')}"></div>
      <div class="field"><label>Categoria</label><select class="input" id="d_categoria">${CATEGORIAS_DOCUMENTO.map(c=>`<option ${item?.categoria===c?'selected':''}>${c}</option>`).join('')}</select></div>
      <div class="field"><label>Número / identificação</label><input class="input" id="d_numero" placeholder="Ex.: 12345/2026" value="${escapeHTML(item?.numero||'')}"></div>
      <div class="field"><label>Órgão / entidade emissora</label><input class="input" id="d_orgao" placeholder="Ex.: Receita Federal" value="${escapeHTML(item?.orgao||'')}"></div>
      <div class="field"><label>Responsável</label><input class="input" id="d_responsavel" list="listaResponsaveisDoc" value="${escapeHTML(item?.responsavel||'')}"><datalist id="listaResponsaveisDoc">${responsaveis.map(r=>`<option value="${escapeHTML(r)}">`).join('')}</datalist></div>
      <div class="field"><label>Data de emissão</label><input class="input" type="date" id="d_dataEmissao" value="${item?.dataEmissao||todayISO()}"></div>
      <div class="field"><label>Data de validade</label><input class="input" type="date" id="d_dataValidade" value="${item?.dataValidade||''}"></div>
      <div class="field"><label>Localização / referência</label><input class="input" id="d_arquivoRef" placeholder="Pasta, armário, link interno..." value="${escapeHTML(item?.arquivoRef||'')}"></div>
      <div class="field"><label>Tags</label><input class="input" id="d_tags" placeholder="Ex.: convênio, prestação de contas" value="${escapeHTML(item?.tags||'')}"></div>
      <div class="field full"><label>🔗 Vincular a outros registros</label><div class="relacionados-form-section">${item?renderSelectorRelacionados('documento',item.id,'projeto'):'<p class="empty-inline">Salve o documento primeiro para adicionar vínculos.</p>'}</div><small class="muted">Você pode vincular este documento a projetos.</small></div>
      <div class="field full"><label>Arquivo digital ${item?.anexo?'(substituir opcionalmente)':''}</label><input class="input" type="file" id="d_arquivo" accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx"></div>
      <div class="field full"><label>Descrição</label><textarea id="d_descricao" placeholder="Para que serve este documento?">${escapeHTML(item?.descricao||'')}</textarea></div>
      <div class="field full"><label>Observações</label><textarea id="d_observacoes" placeholder="Informações adicionais, renovação, cuidados...">${escapeHTML(item?.observacoes||'')}</textarea></div>
    </div><p class="field-error" id="formErroDoc" hidden></p><div class="modal-actions"><button type="button" class="btn btn-ghost" id="btnCancelarFormDoc">Cancelar</button><button type="submit" class="btn btn-primary">${item?'Salvar alterações':'Criar documento'}</button></div></form>`);
  document.getElementById('btnCancelarFormDoc').addEventListener('click',closeModal);
  document.getElementById('formDocumento').addEventListener('submit',async e=>{
    e.preventDefault(); const nome=document.getElementById('d_nome').value.trim(); if(!nome){const er=document.getElementById('formErroDoc');er.hidden=false;er.textContent='Informe o nome do documento.';return;}
    const dados={nome,categoria:document.getElementById('d_categoria').value,numero:document.getElementById('d_numero').value.trim(),orgao:document.getElementById('d_orgao').value.trim(),responsavel:document.getElementById('d_responsavel').value.trim(),dataEmissao:document.getElementById('d_dataEmissao').value||null,dataValidade:document.getElementById('d_dataValidade').value||null,arquivoRef:document.getElementById('d_arquivoRef').value.trim(),tags:document.getElementById('d_tags').value.trim(),descricao:document.getElementById('d_descricao').value.trim(),observacoes:document.getElementById('d_observacoes').value.trim()};
    const f=document.getElementById('d_arquivo').files[0]; if(f){ if(item?.anexo) await ProjectFiles.remove(item.anexo.id); dados.anexo=await salvarAnexo(f,'documento'); } else if(item?.anexo) dados.anexo=item.anexo;
    if(item){DB.update('documentos',item.id,dados);registrarHistorico({modulo:'documento',acao:'edição',descricao:`Documento "${dados.nome}" editado.`,refId:item.id});showToast('✓ Documento atualizado.');}
    else {const novo={id:DB.nextId('DOC','documento'),...dados,criadoEm:Date.now(),atualizadoEm:Date.now()};DB.insert('documentos',novo); if(!DB.getById('documentos',novo.id)){showToast('Não foi possível salvar o documento.');return;} registrarHistorico({modulo:'documento',acao:'criação',descricao:`Documento adicionado: "${novo.nome}"`,refId:novo.id});showToast('✓ Documento criado.');}
    closeModal();renderCurrentView();
  });
  if(item) processarRelacionadosEmForm('documento',item.id,'formDocumento');
}
function abrirDetalheDocumento(id){
  const d=DB.getById('documentos',id); if(!d)return; const sit=situacaoDocumento(d),dias=d.dataValidade?daysDiffFromToday(d.dataValidade):null, historico=DB.getAll('historico').filter(h=>h.refId===id), relacionados=renderRelacionados('documento',id);
  openModal(`Documento ${d.id}`,`<div class="detail-block"><div class="detail-label">Nome</div><div class="detail-value"><strong>${escapeHTML(d.nome)}</strong></div></div>
    <div class="form-grid"><div class="detail-block"><div class="detail-label">Categoria</div><div class="detail-value">${escapeHTML(d.categoria||'—')}</div></div><div class="detail-block"><div class="detail-label">Número</div><div class="detail-value">${escapeHTML(d.numero||'—')}</div></div><div class="detail-block"><div class="detail-label">Órgão emissor</div><div class="detail-value">${escapeHTML(d.orgao||'—')}</div></div><div class="detail-block"><div class="detail-label">Responsável</div><div class="detail-value">${escapeHTML(d.responsavel||'—')}</div></div><div class="detail-block"><div class="detail-label">Emissão</div><div class="detail-value">${d.dataEmissao?formatDateBR(d.dataEmissao):'—'}</div></div><div class="detail-block"><div class="detail-label">Validade</div><div class="detail-value">${d.dataValidade?formatDateBR(d.dataValidade):'Sem validade'}</div></div><div class="detail-block"><div class="detail-label">Situação</div><div class="detail-value">${badgeHTML(sit.tom,sit.emoji+' '+sit.label)}</div></div><div class="detail-block"><div class="detail-label">Prazo</div><div class="detail-value">${dias===null?'—':dias>=0?`Faltam ${dias} dias`:`Venceu há ${Math.abs(dias)} dias`}</div></div></div>
    <div class="detail-block"><div class="detail-label">Arquivo</div><div class="detail-value">${d.anexo?`<button class="btn btn-sm" id="btnAbrirAnexoDoc">📎 ${escapeHTML(d.anexo.nome||'Abrir arquivo')}</button>`:escapeHTML(d.arquivoRef||'Nenhum arquivo anexado')}</div></div>
    <div class="detail-block"><div class="detail-label">Tags</div><div class="detail-value">${escapeHTML(d.tags||'—')}</div></div>
    <div class="detail-block"><div class="detail-label">Vinculado a</div><div class="detail-value"><div class="doc-detail-links">${vinculosDocumentoNormalizados(d).map(v=>{const info=textoVinculoDocumento(v);return info?`<button type="button" class="btn btn-sm doc-link-chip" data-doc-link-tipo="${escapeHTML(v.tipo)}" data-doc-link-id="${escapeHTML(v.id)}">${escapeHTML(info.tipo)}: ${escapeHTML(info.nome)}</button>`:''}).join('')||'<span class="muted">Nenhum registro vinculado.</span>'}</div></div></div>
    <div class="detail-block"><div class="detail-label">Descrição</div><div class="detail-value">${escapeHTML(d.descricao||'—')}</div></div><div class="detail-block"><div class="detail-label">Observações</div><div class="detail-value">${escapeHTML(d.observacoes||'—')}</div></div>
    <div class="detail-block"><div class="detail-label">Histórico</div><div class="hist-timeline">${historico.length?historico.map(h=>`<div><span class="muted" style="font-family:var(--font-mono)">${timestampToBR(h.timestamp)}</span><br>${escapeHTML(h.descricao)}</div>`).join(''):'<span class="muted">Sem eventos registrados.</span>'}</div></div>
    <div class="modal-actions"><button class="btn btn-ghost" id="btnFecharDetalheDoc">Fechar</button><button class="btn btn-danger" id="btnExcluirDetalheDoc">Excluir</button><button class="btn btn-primary" id="btnEditarDetalheDoc">Editar</button></div>`);
  document.getElementById('btnFecharDetalheDoc').addEventListener('click',closeModal); document.getElementById('btnEditarDetalheDoc').addEventListener('click',()=>openFormDocumento(id)); document.getElementById('btnAbrirAnexoDoc')?.addEventListener('click',()=>baixarAnexo(d.anexo.id));
  document.getElementById('btnExcluirDetalheDoc').addEventListener('click',()=>{
    confirmAction('Excluir este documento? O arquivo anexado também será removido.', async () => {
      const item = DB.getById('documentos', id);
      if (item?.anexo) await ProjectFiles.remove(item.anexo.id);
      DB.remove('documentos', id);
      registrarHistorico({ modulo:'documento', acao:'exclusão', descricao:`Documento "${item.nome}" excluído.`, refId:id });
      showToast('Documento excluído.');
      closeModal();
      renderCurrentView();
    });
  });
  document.querySelectorAll('[data-doc-link-tipo]').forEach(btn=>btn.addEventListener('click',()=>{
    const tipo=btn.dataset.docLinkTipo, rid=btn.dataset.docLinkId; closeModal();
    if(tipo==='projeto') abrirDetalheProjeto(rid);
  }));
}


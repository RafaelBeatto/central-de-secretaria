/* ---------------------------------------------------------
   12. PROJETOS
   --------------------------------------------------------- */
function projetoStatusTom(status){
  return ({'Planejamento':'neutral','Em execução':'primary','Concluído':'ok','Suspenso':'warn','Cancelado':'danger'})[status] || 'neutral';
}

function formatMoney(value){
  const n = Number(value);
  if (!Number.isFinite(n)) return 'R$ 0,00';
  return n.toLocaleString('pt-BR', { style:'currency', currency:'BRL' });
}

function uniqueFontesProjetos(){
  return [...new Set(DB.getAll('projetos').map(p => String(p.fonteRecurso||'').trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'pt-BR'));
}

/* ---------------------------------------------------------
   LISTAGEM: árvore Recursos (Pais) → Execuções (Filhos), mais uma
   seção separada para projetos antigos (tipo ainda não definido).
   --------------------------------------------------------- */
function renderProjetos(){
  const filtros=getFiltrosValores('filtrosProjetos');
  const todosRegistros=DB.getAll('projetos');
  const mostrarArquivados=!!document.getElementById('chkMostrarArquivadosRecursos')?.checked;

  const recursosBase=todosRegistros.filter(p=>p.tipo==='recurso' && (mostrarArquivados||!p.arquivado));
  const legados=todosRegistros.filter(p=>!p.tipo);

  const statusEl=document.querySelector('#filtrosProjetos [data-filter="status"]');
  const statusAtual=statusEl?.value||'';
  const statuses=[...new Set(todosRegistros.map(x=>x.status).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'pt-BR'));
  if(statusEl) statusEl.innerHTML='<option value="">Todos os status</option>'+statuses.map(st=>`<option value="${escapeHTML(st)}" ${st===statusAtual?'selected':''}>${escapeHTML(st)}</option>`).join('');

  const q=(filtros.busca||'').toLowerCase();
  const statusFiltro=filtros.status||'';
  const bate=(...campos)=>campos.join(' ').toLowerCase().includes(q);

  const grupos=recursosBase.map(r=>{
    let filhos=recursoExecucoes(r.id);
    if(statusFiltro) filhos=filhos.filter(f=>f.status===statusFiltro);
    if(q){
      const recursoBate=bate(r.nome,r.codigo,r.fonteRecurso,r.orgaoRepassador);
      if(!recursoBate) filhos=filhos.filter(f=>bate(f.nome,f.codigo));
    }
    return { r, filhos, financeiro:recursoResumoFinanceiro(r) };
  }).filter(({r,filhos})=>{
    if(statusFiltro && r.status!==statusFiltro && !filhos.length) return false;
    if(q && !bate(r.nome,r.codigo,r.fonteRecurso,r.orgaoRepassador) && !filhos.length) return false;
    return true;
  });

  const legadosFiltrados=legados.filter(p=>{
    if(statusFiltro && p.status!==statusFiltro) return false;
    if(q && !bate(p.nome,p.codigo,p.fonteRecurso)) return false;
    return true;
  });

  const totalExecucoes=todosRegistros.filter(p=>p.tipo==='execucao').length;
  const totalExecutado=grupos.reduce((s,{financeiro})=>s+financeiro.executado,0);
  document.getElementById('projectSummary').innerHTML=`
    <div class="project-summary-card"><span>Recursos</span><strong>${recursosBase.length}</strong></div>
    <div class="project-summary-card"><span>Execuções</span><strong>${totalExecucoes}</strong></div>
    <div class="project-summary-card"><span>Total executado</span><strong>${formatMoney(totalExecutado)}</strong></div>
    ${legados.length?`<div class="project-summary-card"><span>Antigos não classificados</span><strong>${legados.length}</strong></div>`:''}
  `;

  const grid=document.getElementById('gridProjetos'), vazio=document.getElementById('vazioProjetos');
  vazio.hidden = !!(grupos.length || legadosFiltrados.length);

  let html=`<div class="recursos-toolbar">
    <h3 style="margin:0">📁 Recursos</h3>
    <label class="muted" style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer">
      <input type="checkbox" id="chkMostrarArquivadosRecursos" ${mostrarArquivados?'checked':''}> Mostrar arquivados
    </label>
  </div>`;

  html+=grupos.map(({r,filhos,financeiro})=>`
    <div class="recurso-lista-card ${r.arquivado?'is-arquivado':''}">
      <div class="recurso-lista-head" data-abrir-recurso-lista="${escapeHTML(r.id)}">
        <div><span class="project-code">RECURSO${r.arquivado?' · ARQUIVADO':''}</span><h3>💰 ${escapeHTML(r.nome)}</h3><small class="muted">${escapeHTML(r.fonteRecurso||'Origem não informada')}</small></div>
        ${badgeHTML(projetoStatusTom(r.status),r.status||'Sem status')}
      </div>
      <div class="recurso-lista-financeiro">
        <span>Recebido: <b>${formatMoney(financeiro.recebido)}</b></span>
        <span>Executado: <b>${formatMoney(financeiro.executado)}</b></span>
        <span>Disponível: <b>${formatMoney(financeiro.saldoTotalDisponivel)}</b></span>
      </div>
      <div class="recurso-lista-filhos">
        ${filhos.length?filhos.map(f=>{
          const fin=execucaoFinanceiro(f);
          return `<div class="execucao-lista-item" data-abrir-execucao-lista="${escapeHTML(f.id)}">
            <span>📂 ${escapeHTML(f.nome)}</span>
            ${badgeHTML(projetoStatusTom(f.status),f.status||'Sem status')}
            <span class="muted">${formatMoney(fin.planejado)} · ${fin.pct}% executado</span>
            <button class="btn btn-sm btn-danger" data-excluir-execucao-lista="${escapeHTML(f.id)}" title="Excluir execução">✕</button>
          </div>`;
        }).join(''):'<div class="empty-inline">Nenhuma execução cadastrada ainda.</div>'}
      </div>
      <div class="recurso-lista-foot">
        <button class="btn btn-sm btn-primary" data-nova-execucao-lista="${escapeHTML(r.id)}">＋ Nova execução</button>
        <button class="btn btn-sm" data-ver-recurso-lista="${escapeHTML(r.id)}">Ver recurso →</button>
        <button class="btn btn-sm btn-danger" data-excluir-recurso-lista="${escapeHTML(r.id)}">Excluir</button>
      </div>
    </div>
  `).join('') || (q||statusFiltro?'':'<p class="muted" style="padding:0 4px">Nenhum recurso cadastrado ainda. Clique em "Novo registro" para começar.</p>');

  if(legadosFiltrados.length){
    html+=`<div class="projetos-legado-section">
      <h3>🗂 Projetos antigos (defina o tipo)</h3>
      <p class="muted">Esses registros existiam antes desta atualização e continuam funcionando normalmente. Classifique cada um quando puder, para que passem a fazer parte da nova estrutura de Recursos/Execuções — a classificação nunca é feita automaticamente.</p>
      ${legadosFiltrados.map(p=>`<div class="workspace-item">
        <div><strong>${escapeHTML(p.nome)}</strong><small>${formatMoney(p.valorOrcado)} · ${escapeHTML(p.status||'Sem status')}</small></div>
        <div class="item-actions" style="flex-wrap:wrap">
          <button class="btn btn-sm" data-ver-legado="${escapeHTML(p.id)}">Ver</button>
          <button class="btn btn-sm" data-classificar-recurso="${escapeHTML(p.id)}">📦 É um Recurso</button>
          <button class="btn btn-sm" data-classificar-execucao="${escapeHTML(p.id)}">📂 É uma Execução de...</button>
          <button class="btn btn-sm btn-danger" data-excluir-legado="${escapeHTML(p.id)}">Excluir</button>
        </div>
      </div>`).join('')}
    </div>`;
  }

  grid.innerHTML=html;

  document.getElementById('chkMostrarArquivadosRecursos')?.addEventListener('change',renderProjetos);
  document.querySelectorAll('[data-abrir-recurso-lista]').forEach(el=>el.addEventListener('click',()=>abrirDetalheRecurso(el.dataset.abrirRecursoLista)));
  document.querySelectorAll('[data-ver-recurso-lista]').forEach(el=>el.addEventListener('click',()=>abrirDetalheRecurso(el.dataset.verRecursoLista)));
  document.querySelectorAll('[data-abrir-execucao-lista]').forEach(el=>el.addEventListener('click',()=>abrirDetalheProjeto(el.dataset.abrirExecucaoLista)));
  document.querySelectorAll('[data-nova-execucao-lista]').forEach(el=>el.addEventListener('click',()=>openFormProjeto(null,{tipo:'execucao',paiId:el.dataset.novaExecucaoLista})));
  document.querySelectorAll('[data-ver-legado]').forEach(el=>el.addEventListener('click',()=>abrirDetalheProjeto(el.dataset.verLegado)));
  document.querySelectorAll('[data-classificar-recurso]').forEach(el=>el.addEventListener('click',()=>abrirClassificarComoRecurso(el.dataset.classificarRecurso)));
  document.querySelectorAll('[data-classificar-execucao]').forEach(el=>el.addEventListener('click',()=>abrirClassificarComoExecucao(el.dataset.classificarExecucao)));
  document.querySelectorAll('[data-excluir-legado]').forEach(el=>el.addEventListener('click',()=>{
    const item=DB.getById('projetos',el.dataset.excluirLegado);
    confirmAction(`Tem certeza que deseja excluir "${item.nome}"?`,()=>{
      DB.remove('projetos',item.id);
      registrarHistorico({modulo:'projeto',acao:'exclusão',descricao:`Projeto "${item.nome}" excluído.`,refId:item.id});
      showToast('Registro excluído.'); renderProjetos();
    });
  }));
  document.querySelectorAll('[data-excluir-recurso-lista]').forEach(el=>el.addEventListener('click',()=>{
    const r=DB.getById('projetos',el.dataset.excluirRecursoLista);
    if(recursoExecucoes(r.id).length){ showToast('⚠ Exclua ou reclassifique as execuções deste recurso antes de excluí-lo (ou prefira "Arquivar", dentro do recurso).'); return; }
    confirmAction(`Tem certeza que deseja excluir o recurso "${r.nome}"? Prefira "Arquivar" (dentro do recurso) se ele só estiver encerrado.`,()=>{
      DB.remove('projetos',r.id);
      registrarHistorico({modulo:'projeto',acao:'exclusão',descricao:`Recurso "${r.nome}" excluído.`,refId:r.id});
      showToast('Recurso excluído.'); renderProjetos();
    });
  }));
  document.querySelectorAll('[data-excluir-execucao-lista]').forEach(el=>el.addEventListener('click',(ev)=>{
    ev.stopPropagation();
    const f=DB.getById('projetos',el.dataset.excluirExecucaoLista);
    confirmAction(`Tem certeza que deseja excluir a execução "${f.nome}"? O valor volta a ficar disponível no recurso.`,()=>{
      DB.remove('projetos',f.id);
      registrarHistorico({modulo:'projeto',acao:'exclusão',descricao:`Execução "${f.nome}" excluída.`,refId:f.id});
      if(f.paiId) recursoRegistrarMovimentacao(f.paiId,{tipo:'ajuste',valor:-(Number(f.valorOrcado)||0),descricao:`Execução "${f.nome}" excluída — valor devolvido ao saldo não distribuído.`,origemExecucaoId:f.id});
      showToast('Execução excluída.'); renderProjetos();
    });
  }));
}

/* Classificação segura de projetos antigos (item 23 do pedido): nunca
   automática, sempre uma escolha explícita do usuário, sem perder dados. */
function abrirClassificarComoRecurso(id){
  const item=DB.getById('projetos',id); if(!item) return;
  confirmAction(`Marcar "${item.nome}" como um Recurso (Pai)? Ele passa a representar o dinheiro recebido, e você poderá criar Execuções dentro dele.`,()=>{
    DB.update('projetos',id,{tipo:'recurso'});
    recursoRegistrarMovimentacao(id,{tipo:'entrada',valor:item.valorOrcado,descricao:'Recurso recebido (classificado a partir de um projeto antigo)'});
    registrarHistorico({modulo:'projeto',acao:'classificação',descricao:`Projeto "${item.nome}" classificado como Recurso.`,refId:id});
    showToast('✓ Classificado como Recurso.');
    renderProjetos();
  });
}
function abrirClassificarComoExecucao(id){
  const item=DB.getById('projetos',id); if(!item) return;
  const recursos=DB.getAll('projetos').filter(p=>p.tipo==='recurso');
  if(!recursos.length){ showToast('Cadastre um Recurso primeiro; depois volte aqui para classificar esta execução.'); return; }
  openModal('A qual Recurso esta execução pertence?',`
    <div class="activity-list" style="max-height:45vh;overflow-y:auto">${recursos.map(r=>`<div class="activity-item" data-escolher-recurso-legado="${escapeHTML(r.id)}" style="cursor:pointer"><strong>${escapeHTML(r.nome)}</strong><small>${formatMoney(r.valorOrcado)}</small></div>`).join('')}</div>
    <div class="modal-actions" style="margin-top:16px"><button type="button" class="btn btn-ghost" id="cancelEscolhaRecurso">Cancelar</button></div>
  `);
  document.getElementById('cancelEscolhaRecurso').onclick=closeModal;
  document.querySelectorAll('[data-escolher-recurso-legado]').forEach(el=>el.addEventListener('click',()=>{
    const paiId=el.dataset.escolherRecursoLegado;
    const recurso=DB.getById('projetos',paiId);
    const check=podeCriarExecucao(recurso,item.valorOrcado);
    if(!check.ok){
      showToast(`⚠ O valor desta execução (${formatMoney(item.valorOrcado)}) excede o saldo disponível do recurso "${recurso.nome}" em ${formatMoney(check.excedente)}.`);
      return;
    }
    DB.update('projetos',id,{tipo:'execucao',paiId});
    recursoRegistrarMovimentacao(paiId,{tipo:'distribuicao',valor:item.valorOrcado,descricao:`Valor destinado à execução "${item.nome}" (classificação de projeto antigo)`,destinoExecucaoId:id});
    registrarHistorico({modulo:'projeto',acao:'classificação',descricao:`Projeto "${item.nome}" classificado como Execução do recurso "${recurso.nome}".`,refId:id});
    showToast('✓ Classificado como Execução.');
    closeModal();
    renderProjetos();
  }));
}

document.querySelectorAll('#filtrosProjetos [data-filter]').forEach(el=>el.addEventListener('input',()=>{}));
document.getElementById('btnFiltrarProjetosDemandas')?.addEventListener('click',()=>renderProjetos());
document.getElementById('btnMostrarTodosProjetosDemandas')?.addEventListener('click',()=>{document.querySelectorAll('#filtrosProjetos [data-filter]').forEach(el=>el.value='');renderProjetos();});
document.querySelector('#filtrosProjetos [data-filter="busca"]')?.addEventListener('keydown',e=>{if(e.key==='Enter')renderProjetos();});
document.querySelector('[data-action="novo-projeto-demanda"]')?.addEventListener('click',()=>abrirEscolhaNovoRecursoOuExecucao());

/* Botão "Novo registro" do módulo Projetos: primeiro decide se é um
   Recurso novo ou uma Execução de um recurso já existente. */
function abrirEscolhaNovoRecursoOuExecucao(){
  const recursos=DB.getAll('projetos').filter(p=>p.tipo==='recurso'&&!p.arquivado);
  openModal('Novo registro',`
    <p class="muted" style="margin-bottom:12px">O que você quer cadastrar?</p>
    <div class="activity-list">
      <div class="activity-item" id="optNovoRecurso" style="cursor:pointer"><strong>💰 Novo Recurso</strong><small>Dinheiro que entrou na APAE (convênio, emenda, doação...)</small></div>
      <div class="activity-item" id="optNovaExecucao" style="cursor:pointer"><strong>📂 Nova Execução</strong><small>Uma aplicação específica de um recurso já cadastrado</small></div>
    </div>
    <div class="modal-actions"><button type="button" class="btn btn-ghost" id="cancelEscolhaNovo">Cancelar</button></div>
  `);
  document.getElementById('cancelEscolhaNovo').onclick=closeModal;
  document.getElementById('optNovoRecurso').onclick=()=>{closeModal();openFormProjeto(null,{tipo:'recurso'});};
  document.getElementById('optNovaExecucao').onclick=()=>{
    if(!recursos.length){ closeModal(); showToast('Cadastre um Recurso primeiro.'); openFormProjeto(null,{tipo:'recurso'}); return; }
    closeModal();
    openModal('Para qual Recurso é esta execução?',`
      <div class="activity-list" style="max-height:45vh;overflow-y:auto">${recursos.map(r=>`<div class="activity-item" data-escolher-recurso-novo="${escapeHTML(r.id)}" style="cursor:pointer"><strong>${escapeHTML(r.nome)}</strong><small>Disponível: ${formatMoney(podeCriarExecucao(r,0).disponivel)}</small></div>`).join('')}</div>
      <div class="modal-actions" style="margin-top:16px"><button type="button" class="btn btn-ghost" id="cancelEscolhaRecursoNovo">Cancelar</button></div>
    `);
    document.getElementById('cancelEscolhaRecursoNovo').onclick=closeModal;
    document.querySelectorAll('[data-escolher-recurso-novo]').forEach(el=>el.addEventListener('click',()=>{
      const paiId=el.dataset.escolherRecursoNovo;
      closeModal();
      openFormProjeto(null,{tipo:'execucao',paiId});
    }));
  };
}


function uid(prefix='id'){
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2,9)}`;
}

const ProjectFiles = {
  db:null,
  async open(){
    if(this.db) return this.db;
    this.db = await new Promise((resolve,reject)=>{
      const req=indexedDB.open('central_secretaria_arquivos',1);
      req.onupgradeneeded=()=>{ if(!req.result.objectStoreNames.contains('arquivos')) req.result.createObjectStore('arquivos',{keyPath:'id'}); };
      req.onsuccess=()=>resolve(req.result); req.onerror=()=>reject(req.error);
    });
    return this.db;
  },
  async save(file){ const db=await this.open(); return new Promise((resolve,reject)=>{ const tx=db.transaction('arquivos','readwrite'); tx.objectStore('arquivos').put(file); tx.oncomplete=()=>resolve(); tx.onerror=()=>reject(tx.error); }); },
  async get(id){ const db=await this.open(); return new Promise((resolve,reject)=>{ const tx=db.transaction('arquivos','readonly'); const r=tx.objectStore('arquivos').get(id); r.onsuccess=()=>resolve(r.result); r.onerror=()=>reject(r.error); }); },
  async remove(id){ const db=await this.open(); return new Promise((resolve,reject)=>{ const tx=db.transaction('arquivos','readwrite'); tx.objectStore('arquivos').delete(id); tx.oncomplete=()=>resolve(); tx.onerror=()=>reject(tx.error); }); }
};

/* ---------------------------------------------------------
   Upload/download de anexos (documentos, projetos, etc.)
   O arquivo em si (blob) fica guardado no IndexedDB (ProjectFiles),
   e apenas uma referência leve (id, nome, tipo, tamanho) é
   salva junto do registro no localStorage (DB).
   --------------------------------------------------------- */
async function salvarAnexo(file, categoria='documento'){
  if(!file) return null;
  const id = uid('anx');
  const registro = { id, nome:file.name, tipo:file.type||'', tamanho:file.size||0, categoria, criadoEm:Date.now(), blob:file };
  try{
    await ProjectFiles.save(registro);
  }catch(e){
    console.error('Erro ao salvar anexo', e);
    showToast('⚠ Não foi possível salvar o arquivo.');
    return null;
  }
  return { id, nome:file.name, tipo:file.type||'', tamanho:file.size||0 };
}

async function baixarAnexo(id){
  if(!id){ showToast('⚠ Arquivo não encontrado.'); return; }
  try{
    const registro = await ProjectFiles.get(id);
    if(!registro || !registro.blob){ showToast('⚠ Arquivo não encontrado ou removido.'); return; }
    const url = URL.createObjectURL(registro.blob);
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener';
    a.download = registro.nome || 'arquivo';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(()=>URL.revokeObjectURL(url), 60000);
  }catch(e){
    console.error('Erro ao abrir anexo', e);
    showToast('⚠ Não foi possível abrir o arquivo.');
  }
}

/* Empresa como entidade reutilizável: localiza (por CNPJ, senão por nome)
   ou cria um registro na mesma entidade global já usada pelo Gerador de
   Documentos ('gerador-empresas'), evitando uma segunda implementação de
   cadastro de empresas. Cotações, ordens e documentos continuam ligados
   ao projeto onde nasceram; só os dados cadastrais da empresa passam a
   ser únicos e compartilhados entre projetos. */
function localizarOuCriarEmpresaGlobal(dados){
  const empresas = DB.getAll('gerador-empresas');
  const cnpjLimpo = String(dados.cnpj || '').replace(/\D/g, '');
  let alvo = cnpjLimpo ? empresas.find(x => String(x.cnpj || '').replace(/\D/g, '') === cnpjLimpo) : null;
  if (!alvo) {
    const chaveNome = String(dados.nome || '').trim().toLowerCase();
    alvo = chaveNome ? empresas.find(x => String(x.razaoSocial || '').trim().toLowerCase() === chaveNome) : null;
  }
  if (alvo) return alvo.id;
  const novo = {
    id: uid('emp'), razaoSocial: String(dados.nome || '').trim(), nomeFantasia: dados.nomeFantasia || '',
    cnpj: dados.cnpj || '', contato: dados.contato || '', telefone: dados.telefone || '', email: dados.email || '',
    endereco: dados.endereco || '', municipio: dados.municipio || '', uf: dados.uf || '',
    representante: '', cpfRepresentante: '', observacao: dados.observacao || '',
    documentos: [], criadoEm: Date.now()
  };
  DB.insert('gerador-empresas', novo);
  return novo.id;
}
function getEmpresaGlobal(id){ return id ? DB.getById('gerador-empresas', id) : null; }

/* Lista de documentos-padrão da ficha global da empresa (única,
   compartilhada entre projetos). Movida para cá porque agora também é
   consultada pelo checklist "Documentação das empresas" de cada
   execução (ver projectChecklist/statusDocumentacaoEmpresa) — antes
   esse checklist mantinha uma segunda lista de documentos por execução,
   com nomes até diferentes ("CNPJ" vs "CNPJ da empresa"), então nunca
   reconhecia o que já estava cadastrado na ficha global. */
const EMPRESA_DOCS_SUGERIDOS=['CNPJ','Contrato Social','CND Federal','CND Estadual','CND Municipal','FGTS','CNDT','Outros documentos'];

function projectData(p){
  p.cotacoes = Array.isArray(p.cotacoes) ? p.cotacoes : [];
  p.ordensCompra = Array.isArray(p.ordensCompra) ? p.ordensCompra : [];
  p.documentosProjeto = Array.isArray(p.documentosProjeto) ? p.documentosProjeto : [];
  p.pendencias = Array.isArray(p.pendencias) ? p.pendencias : [];
  p.itensCompra = Array.isArray(p.itensCompra) ? p.itensCompra : [];
  p.cotacoes.forEach(c=>{ c.itens = Array.isArray(c.itens) ? c.itens : []; });
  p.docsApae = Array.isArray(p.docsApae) ? p.docsApae : [];
  p.empresas = Array.isArray(p.empresas) ? p.empresas : [];
  // Migração/normalização: empresas são a pasta central de cada fornecedor.
  const byName = new Map(p.empresas.map(e=>[String(e.nome||'').trim().toLowerCase(),e]));
  const ensureEmpresa = (nome)=>{ const key=String(nome||'').trim().toLowerCase(); if(!key)return null; let e=byName.get(key); if(!e){ e={id:uid('emp'),nome:String(nome).trim(),cnpj:'',contato:'',observacao:'',documentos:[],criadoEm:Date.now()}; p.empresas.push(e); byName.set(key,e); } e.documentos=Array.isArray(e.documentos)?e.documentos:[]; return e; };
  p.cotacoes.forEach(c=>{ if(!c.empresaId){ const e=ensureEmpresa(c.fornecedor); if(e)c.empresaId=e.id; }});
  p.ordensCompra.forEach(o=>{ if(!o.empresaId){ const e=ensureEmpresa(o.fornecedor); if(e)o.empresaId=e.id; }});
  p.empresas.forEach(e=>{
    e.documentos=Array.isArray(e.documentos)?e.documentos:[];
    if(!e.empresaGlobalId){ e.empresaGlobalId = localizarOuCriarEmpresaGlobal({nome:e.nome, cnpj:e.cnpj, contato:e.contato, observacao:e.observacao}); }
    // Migração única: documentos de fornecedor que antes ficavam duplicados
    // por execução (e.documentos) passam a viver só na ficha global da
    // empresa. Não perde nenhum arquivo já anexado — só deixa de existir
    // uma segunda cópia. Idempotente: só copia o que ainda não existe lá.
    if (e.documentos.length){
      const g = getEmpresaGlobal(e.empresaGlobalId);
      if (g){
        g.documentos = Array.isArray(g.documentos) ? g.documentos : [];
        const nomesExistentes = new Set(g.documentos.map(d=>d.nome));
        const novos = e.documentos.filter(d=>!nomesExistentes.has(d.nome));
        if (novos.length) DB.update('gerador-empresas', g.id, { documentos:[...g.documentos, ...novos] });
      }
    }
  });
  p.pagamentos = Array.isArray(p.pagamentos) ? p.pagamentos : [];
  p.plano = p.plano && typeof p.plano === 'object' ? p.plano : {descricao:'',anexo:null};
  // Estrutura Recurso (Pai) / Execução (Filho): campos novos, retrocompatíveis.
  // 'tipo' fica null/undefined em projetos antigos (nunca é inferido automaticamente —
  // ver PROJETOS_LEGADO_STATUS/abrirClassificarProjetoAntigo, mais abaixo).
  p.tipo = (p.tipo === 'recurso' || p.tipo === 'execucao') ? p.tipo : null;
  p.paiId = p.paiId || null;
  p.documentosRecurso = Array.isArray(p.documentosRecurso) ? p.documentosRecurso : [];
  p.movimentacoes = Array.isArray(p.movimentacoes) ? p.movimentacoes : [];
  p.arquivado = !!p.arquivado;
  return p;
}
function projectSave(p){
  DB.update('projetos',p.id,{cotacoes:p.cotacoes,ordensCompra:p.ordensCompra,documentosProjeto:p.documentosProjeto,pendencias:p.pendencias,docsApae:p.docsApae,empresas:p.empresas,pagamentos:p.pagamentos,plano:p.plano,documentosRecurso:p.documentosRecurso,movimentacoes:p.movimentacoes,arquivado:p.arquivado});
}

/* ---------------------------------------------------------
   RECURSO (Pai) / EXECUÇÃO (Filho)
   Mesma entidade 'projetos', mesmo DB.insert/update/remove — só dois
   campos novos (tipo, paiId) mudam o que o registro representa.
   --------------------------------------------------------- */
function ehRecurso(p){ return p?.tipo === 'recurso'; }
function ehExecucao(p){ return p?.tipo === 'execucao'; }
function ehProjetoLegado(p){ return !p?.tipo; }

function recursoExecucoes(recursoId){
  return DB.getAll('projetos').filter(p => p.tipo === 'execucao' && p.paiId === recursoId);
}

/* Soma pagamentos de uma execução (mesmo cálculo já usado em
   projectResumoHTML, só reaproveitado aqui para o recurso). */
function execucaoFinanceiro(f){
  const pd = projectData({ ...f });
  const executado = pd.pagamentos.reduce((s,x) => s + (Number(x.valor)||0), 0);
  const planejado = Number(f.valorOrcado) || 0;
  const saldo = planejado - executado;
  const pct = planejado > 0 ? Math.round((executado/planejado)*100) : 0;
  return { planejado, executado, saldo, pct };
}

/* Resumo financeiro do recurso: recebido / distribuído / executado /
   não distribuído / saldo das execuções — os 3 conceitos do pedido,
   nunca misturados. Execuções canceladas não contam como distribuídas. */
function recursoResumoFinanceiro(recurso){
  const filhos = recursoExecucoes(recurso.id).filter(f => f.status !== 'Cancelado');
  const recebido = Number(recurso.valorOrcado) || 0;
  const distribuido = filhos.reduce((s,f) => s + (Number(f.valorOrcado)||0), 0);
  const executado = filhos.reduce((s,f) => s + execucaoFinanceiro(f).executado, 0);
  const naoDistribuido = recebido - distribuido;
  const saldoExecucoes = distribuido - executado;
  return {
    recebido, distribuido, executado, naoDistribuido, saldoExecucoes,
    saldoTotalDisponivel: naoDistribuido + saldoExecucoes,
    qtdExecucoes: filhos.length,
    percentualDistribuicao: recebido > 0 ? Math.round((distribuido/recebido)*100) : 0,
    percentualExecucao: distribuido > 0 ? Math.round((executado/distribuido)*100) : 0
  };
}

/* Verifica se um valor de execução cabe no saldo não distribuído do
   recurso. excluirExecucaoId ignora a própria execução ao editar (senão
   ela contaria o valor antigo dela mesma como "já distribuído"). */
function podeCriarExecucao(recurso, valor, excluirExecucaoId=null){
  const filhos = recursoExecucoes(recurso.id).filter(f => f.status !== 'Cancelado' && f.id !== excluirExecucaoId);
  const distribuido = filhos.reduce((s,f) => s + (Number(f.valorOrcado)||0), 0);
  const disponivel = (Number(recurso.valorOrcado)||0) - distribuido;
  const valorNum = Number(valor) || 0;
  return { ok: valorNum <= disponivel + 0.005, disponivel, excedente: Math.max(0, valorNum - disponivel) };
}

/* Histórico financeiro do recurso (nunca sobrescreve — só acrescenta).
   Tipos: entrada / distribuicao / execucao / pagamento / transferencia / ajuste. */
function recursoRegistrarMovimentacao(recursoId, dados){
  const r = projectData(DB.getById('projetos', recursoId));
  if (!r) return null;
  const mov = {
    id: uid('mov'), tipo: dados.tipo, valor: Number(dados.valor) || 0,
    descricao: dados.descricao || '', origemExecucaoId: dados.origemExecucaoId || null,
    destinoExecucaoId: dados.destinoExecucaoId || null, data: todayISO(), criadoEm: Date.now()
  };
  r.movimentacoes.push(mov);
  projectSave(r);
  return mov;
}
function projectCount(p,key){ return (p[key]||[]).length; }
function projectAttachments(p){ return [...(p.cotacoes||[]),...(p.ordensCompra||[]),...(p.documentosProjeto||[]),...(p.docsApae||[]),...(p.pagamentos||[])].filter(x=>x.anexo).length + (p.plano?.anexo?1:0); }
function cotacoesValidasParaOrdem(p){
  const empresasComCotacao=new Set(p.cotacoes.map(c=>c.empresaId||String(c.fornecedor||'').trim().toLowerCase()).filter(Boolean));
  return empresasComCotacao.size >= 3 && !!projectFornecedorSelecionado(p);
}
function podeCriarOrdem(p){ return cotacoesValidasParaOrdem(p); }
function motivoBloqueioOrdem(p){
  const qtdEmpresas=new Set(p.cotacoes.map(c=>c.empresaId||String(c.fornecedor||'').trim().toLowerCase()).filter(Boolean)).size;
  if (qtdEmpresas < 3) return `Cadastre cotações de pelo menos 3 empresas antes de criar uma ordem de compra. Faltam ${3-qtdEmpresas} empresa(s).`;
  if (!projectFornecedorSelecionado(p)) return 'Escolha a cotação vencedora antes de criar a ordem de compra.';
  return '';
}

function projectFornecedorSelecionado(p){
  const f=p.cotacoes.filter(c=>c.selecionada).sort((a,b)=>(Number(a.valor)||0)-(Number(b.valor)||0))[0];
  return f || [...p.cotacoes].sort((a,b)=>(Number(a.valor)||0)-(Number(b.valor)||0))[0] || null;
}
function projectChecklist(p){
  const cotOk=new Set(p.cotacoes.map(c=>c.empresaId||String(c.fornecedor||'').trim().toLowerCase()).filter(Boolean)).size>=3;
  const planoOk=!!(p.plano?.descricao||p.plano?.anexo);
  const ordemOk=p.ordensCompra.length>0;
  const apaeOk=p.docsApae.length>0 && p.docsApae.every(x=>x.entregue);
  // Documentação das empresas: lê direto da ficha global de cada empresa
  // vinculada (statusDocumentacaoEmpresa), a mesma fonte já usada no card
  // de cada empresa — não existe mais um checklist separado por execução.
  const fornOk=p.empresas.length>0 && p.empresas.every(e=>statusDocumentacaoEmpresa(e.empresaGlobalId).emoji==='🟢');
  const nfOk=p.documentosProjeto.some(x=>['Nota fiscal','NF','Nota fiscal / recibo'].includes(x.categoria));
  const pagOk=p.pagamentos.length>0;
  return [
    ['Plano de aplicação / trabalho',planoOk,'plano'],
    ['Cotações de 3 empresas',cotOk,'empresas'],
    ['Ordem de compra',ordemOk,'ordens'],
    ['Documentação da APAE',apaeOk,'docs-apae'],
    ['Documentação das empresas',fornOk,'empresas'],
    ['Nota fiscal / comprovante',nfOk,'documentos'],
    ['Pagamento registrado',pagOk,'pagamentos']
  ];
}
function projectProgress(p){const c=projectChecklist(p);return Math.round(c.filter(x=>x[1]).length/c.length*100);}

/* Mapeia a etapa do checklist do projeto para a aba correta do workspace
   (a maioria usa a mesma chave; "ordens" não é uma aba de topo — as ordens
   de compra ficam dentro da aba "Empresas", por empresa). Usada tanto pela
   Central de Pendências (11-pendencias.js) quanto por projectProximaAcao. */
function abaProjetoParaPendencia(tabKey){
  return tabKey === 'ordens' ? 'empresas' : tabKey;
}

/* "Próxima ação" do projeto: primeira etapa do checklist ainda não
   concluída, na mesma ordem em que já aparece no workspace. Não é um
   cálculo novo — só lê o primeiro item pendente de projectChecklist. */
function projectProximaAcao(p){
  const proximo = projectChecklist(p).find(item => !item[1]);
  if (!proximo) return null;
  return { label: proximo[0], tab: abaProjetoParaPendencia(proximo[2]) };
}

function renderWorkspaceProjeto(p,aba='resumo'){
  p=projectData(p);
  const tabs=[['resumo','Visão geral'],['plano','Plano'],['empresas','Empresas'],['docs-apae','Docs. APAE'],['documentos','Documentos'],['pagamentos','Pagamentos'],['prestacao','Prestação de contas'],['pendencias','Pendências']];
  const active=tabs.some(t=>t[0]===aba)?aba:'resumo';
  const map={resumo:projectResumoHTML,plano:projectPlanoHTML,empresas:projectEmpresasHTML,'docs-apae':projectDocsApaeHTML,documentos:projectDocumentosHTML,pagamentos:projectPagamentosHTML,prestacao:projectPrestacaoHTML,pendencias:projectPendenciasHTML};
  const content=map[active](p);
  const recursoPai = p.paiId ? DB.getById('projetos', p.paiId) : null;
  openModal(`${recursoPai?'Execução':'Projeto'} ${escapeHTML(p.codigo)} — ${escapeHTML(p.nome)}`,`<div class="project-workspace"><div class="project-workspace-head"><div>${recursoPai?`<a href="#" class="link-btn" data-abrir-recurso="${escapeHTML(recursoPai.id)}">💰 ${escapeHTML(recursoPai.nome)}</a><br>`:''}<span class="project-code">${escapeHTML(p.codigo)}</span><h2>${escapeHTML(p.nome)}</h2><p>${escapeHTML(p.fonteRecurso||'Fonte não informada')} · ${recursoPai?'Planejado':'Recurso'}: ${formatMoney(p.valorOrcado||0)}</p></div>${badgeHTML(projetoStatusTom(p.status),p.status)}</div><div class="project-progress-box"><div><strong>${projectProgress(p)}%</strong><span>do processo documentado</span></div><div class="project-progress"><i style="width:${projectProgress(p)}%"></i></div></div><div class="project-steps">${projectChecklist(p).map((x,i)=>`<button class="project-step ${x[1]?'done':''} ${active===x[2]?'current':''}" data-step="${x[2]}"><span>${x[1]?'✓':i+1}</span>${x[0]}</button>`).join('')}</div><div class="project-tabs">${tabs.map(([key,label])=>`<button class="project-tab ${active===key?'active':''}" data-tab="${key}">${label}${['empresas','docs-apae','documentos','pagamentos','pendencias'].includes(key)?` <span>${key==='empresas'?p.empresas.length:key==='docs-apae'?p.docsApae.length:key==='pagamentos'?p.pagamentos.length:key==='documentos'?p.documentosProjeto.length:p.pendencias.length}</span>`:''}</button>`).join('')}</div><div class="project-workspace-body">${content}</div></div>`);
  document.querySelectorAll('.project-tab,.project-step').forEach(btn=>btn.addEventListener('click',()=>renderWorkspaceProjeto(projectData(DB.getById('projetos',p.id)),btn.dataset.tab||btn.dataset.step)));
  document.querySelectorAll('[data-abrir-recurso]').forEach(b=>b.onclick=(ev)=>{ev.preventDefault();abrirDetalheRecurso(b.dataset.abrirRecurso);});
  document.querySelectorAll('[data-project-action="editar"]').forEach(b=>b.onclick=()=>openFormProjeto(p.id));
  document.querySelectorAll('[data-project-action="ir-proxima-acao"]').forEach(b=>b.onclick=()=>renderWorkspaceProjeto(projectData(DB.getById('projetos',p.id)),b.dataset.tab));
  document.querySelectorAll('[data-project-action="plano"]').forEach(b=>b.onclick=()=>openFormPlano(p.id));
  document.querySelectorAll('[data-project-action="nova-cotacao"]').forEach(b=>b.onclick=()=>openFormCotacao(p.id,b.dataset.empresa||''));
  document.querySelectorAll('[data-project-action="selecionar-cotacao"]').forEach(b=>b.onclick=()=>selecionarCotacaoProjeto(p.id,b.dataset.item));
  document.querySelectorAll('[data-project-action="nova-ordem"]').forEach(b=>b.onclick=()=>{ const atual=projectData(DB.getById('projetos',p.id)); if(!podeCriarOrdem(atual)){ showToast('⚠ '+motivoBloqueioOrdem(atual)); return; } openFormOrdem(atual.id,b.dataset.empresa||''); });
  document.querySelectorAll('[data-project-action="novo-doc-apae"]').forEach(b=>b.onclick=()=>openFormDocChecklist(p.id));
  document.querySelectorAll('[data-project-action="nova-empresa"]').forEach(b=>b.onclick=()=>openFormEmpresa(p.id));
  document.querySelectorAll('[data-project-action="vincular-empresa"]').forEach(b=>b.onclick=()=>abrirVincularEmpresaExistente(p.id));
  // Acesso à empresa e à ficha completa são tratados por delegação global
  // (em 08-pesquisa-historico.js) para não depender de listeners recriados
  // quando o conteúdo do modal é renderizado novamente.
  document.getElementById('modalBody').querySelectorAll('[data-project-action="acessar-empresa"],[data-project-action="ver-ficha-empresa"]').forEach(b=>{
    b.onclick=null;
  });
  document.querySelectorAll('[data-project-action="editar-empresa"]').forEach(b=>b.onclick=()=>openFormEmpresaEditar(p.id,b.dataset.empresa));
  document.querySelectorAll('[data-project-action="novo-documento"]').forEach(b=>b.onclick=()=>openFormDocumentoProjeto(p.id));
  document.querySelectorAll('[data-project-action="novo-pagamento"]').forEach(b=>b.onclick=()=>openFormPagamento(p.id));
  document.querySelectorAll('[data-project-action="nova-pendencia"]').forEach(b=>b.onclick=()=>openFormPendencia(p.id));
  document.querySelectorAll('[data-project-action="toggle-pendencia"]').forEach(b=>b.onclick=()=>togglePendenciaProjeto(p.id,b.dataset.item));
  document.querySelectorAll('[data-project-action="excluir-pendencia"]').forEach(b=>b.onclick=()=>excluirPendenciaProjeto(p.id,b.dataset.item));
  document.querySelectorAll('[data-project-action="toggle-doc"]').forEach(b=>b.onclick=()=>toggleDocProjeto(p.id,b.dataset.item));
  document.querySelectorAll('[data-file-download]').forEach(b=>b.onclick=()=>baixarAnexo(b.dataset.fileDownload));
  document.querySelectorAll('[data-project-action="excluir-item"]').forEach(b=>b.onclick=()=>excluirItemProjeto(p.id,b.dataset.tipo,b.dataset.item));
}
/* Ponto único de entrada usado por Pendências, Pesquisa, Dashboard e
   Relacionados — decide sozinho se abre o painel do Recurso (Pai) ou o
   workspace operacional da Execução (Filho), então quem chama não
   precisa saber qual é qual. */
function abrirDetalheProjeto(id,aba='resumo'){
  const p=DB.getById('projetos',id);if(!p)return;
  if(p.tipo==='recurso'){ renderWorkspaceRecurso(p, aba==='resumo'?'geral':aba); return; }
  renderWorkspaceProjeto(p,aba);
}
function projectResumoHTML(p){
  const checklist=projectChecklist(p), pend=checklist.filter(x=>!x[1]);
  const cotMin=p.cotacoes.length>=3, fornecedor=projectFornecedorSelecionado(p);
  const previsto=p.cotacoes.filter(c=>c.selecionada).reduce((s,c)=>s+(Number(c.valor)||0),0);
  const gasto=p.pagamentos.reduce((s,x)=>s+(Number(x.valor)||0),0);
  const relacionados=renderRelacionados('projeto',p.id);
  const proximaAcao=projectProximaAcao(p);
  const proximaAcaoHTML=proximaAcao
    ? `<div class="notice-box warning proxima-acao-box"><b>🟠 Próxima ação</b><br>${escapeHTML(proximaAcao.label)}<div class="modal-actions" style="margin-top:10px"><button class="btn btn-sm btn-primary" data-project-action="ir-proxima-acao" data-tab="${escapeHTML(proximaAcao.tab)}">Ir para a ação →</button></div></div>`
    : `<div class="notice-box success"><b>✓ Processo completo</b><br>Todas as etapas do checklist estão concluídas.</div>`;
  return `<div class="project-kpi-grid"><div><span>${p.paiId?'Planejado':'Recurso'}</span><strong>${formatMoney(p.valorOrcado||0)}</strong></div><div><span>Comprometido</span><strong>${formatMoney(previsto||0)}</strong></div><div><span>Pago (executado)</span><strong>${formatMoney(gasto)}</strong></div><div><span>Saldo</span><strong>${formatMoney((Number(p.valorOrcado)||0)-gasto)}</strong></div></div>${proximaAcaoHTML}<div class="workspace-grid"><div class="detail-block"><div class="detail-label">Dados do projeto</div><div class="detail-value"><b>Fonte:</b> ${escapeHTML(p.fonteRecurso||'—')}<br><b>Instrumento:</b> ${escapeHTML(p.convenio||'—')}<br><b>Período:</b> ${formatDateBR(p.dataInicio)} → ${formatDateBR(p.dataFim)}<br><b>Responsável:</b> ${escapeHTML(p.responsavel||'—')}<br><b>Objetivo:</b> ${escapeHTML(p.objetivo||'—')}</div></div><div class="detail-block"><div class="detail-label">Situação</div><div class="detail-value">${cotMin?`<span class="status-inline ok">✓ ${p.cotacoes.length} cotações cadastradas</span>`:`<span class="status-inline danger">! Faltam ${Math.max(0,3-p.cotacoes.length)} cotação(ões)</span>`}<br>${fornecedor?`<span class="status-inline ok">Fornecedor: ${escapeHTML(fornecedor.fornecedor)}</span>`:''}</div></div></div>${pend.length?`<div class="notice-box warning"><b>! O que falta</b><br>${pend.map(x=>`• ${escapeHTML(x[0])}`).join('<br>')}</div>`:''}${relacionados}<div class="modal-actions"><button class="btn btn-ghost" data-project-action="editar">Editar projeto</button></div>`;
}
function projectPlanoHTML(p){return `<div class="workspace-toolbar"><div><h3>Plano do projeto</h3><p>Registre o que será feito com o recurso e guarde o plano aprovado.</p></div><button class="btn btn-primary" data-project-action="plano">${p.plano?.anexo||p.plano?.descricao?'Editar plano':'＋ Cadastrar plano'}</button></div>${p.plano?.descricao?`<div class="detail-block"><div class="detail-label">Descrição / aplicação do recurso</div><div class="detail-value">${escapeHTML(p.plano.descricao)}</div></div>`:'<div class="empty-inline">O plano ainda não foi registrado.</div>'}${p.plano?.anexo?`<div class="workspace-item"><div><strong>📎 ${escapeHTML(p.plano.anexo.nome)}</strong><small>Plano anexado</small></div><button class="btn btn-sm" data-file-download="${p.plano.anexo.id}">Abrir arquivo</button></div>`:''}<div class="notice-box"><b>! Antes de comprar</b><br>Confira se o item está previsto no plano e se o valor é compatível com o recurso recebido.</div>`;}
/* Indicador de documentação da empresa, calculado a partir dos
   documentos reais cadastrados na ficha global (reusa situacaoDocumento). */
function statusDocumentacaoEmpresa(empresaGlobalId){
  const g=getEmpresaGlobal(empresaGlobalId);
  const docs=g?.documentos||[];
  if(!docs.length) return {emoji:'🟠',label:'Documentação incompleta'};
  if(docs.some(d=>situacaoDocumento(d).chave==='vencido')) return {emoji:'🔴',label:'Documento vencido'};
  if(docs.some(d=>!d.anexo)) return {emoji:'🟠',label:'Documentação incompleta'};
  return {emoji:'🟢',label:'Documentação OK'};
}
function projectEmpresasHTML(p){
  const empresas=p.empresas||[];
  const esc=escapeHTML;
  const cards=empresas.map(e=>{
    const cot=p.cotacoes.filter(c=>c.empresaId===e.id || (!c.empresaId && String(c.fornecedor||'').trim().toLowerCase()===String(e.nome||'').trim().toLowerCase()));
    const ord=p.ordensCompra.filter(o=>o.empresaId===e.id || (!o.empresaId && String(o.fornecedor||'').trim().toLowerCase()===String(e.nome||'').trim().toLowerCase()));
    const docs=getEmpresaGlobal(e.empresaGlobalId)?.documentos||[];
    const vencedora=cot.find(c=>c.selecionada);
    const situacao=statusDocumentacaoEmpresa(e.empresaGlobalId);
    return `<div class="empresa-project-card empresa-card-compact">
      <div class="empresa-project-head"><div><span class="project-code">EMPRESA</span><h3>${esc(e.nome)}</h3><p>${e.cnpj?esc(e.cnpj):'CNPJ não informado'}${e.contato?' · '+esc(e.contato):''}</p></div>${vencedora?badgeHTML('success','Cotação vencedora'):''}</div>
      <div class="empresa-project-stats"><span><b>${cot.length}</b> cotação(ões)</span><span><b>${docs.length}</b> documento(s) da empresa</span><span><b>${ord.length}</b> ordem(ns)</span></div>
      <div class="empresa-project-stats"><span>${situacao.emoji} ${situacao.label}</span></div>
      <div class="empresa-project-foot empresa-card-action"><span>${vencedora?'✓ Fornecedor selecionado':'Fornecedor cadastrado'}</span><div style="display:flex;gap:8px"><button class="btn btn-ghost" data-project-action="ver-ficha-empresa" data-empresa-global="${esc(e.empresaGlobalId||'')}">🏢 Ficha completa</button><button class="btn btn-primary" data-project-action="acessar-empresa" data-project="${esc(p.id)}" data-empresa="${esc(e.id)}">Acessar empresa →</button></div></div>
    </div>`;
  }).join('');
  return `<div class="workspace-toolbar"><div><h3>Empresas</h3><p>Cadastre ou vincule fornecedores aqui. Para adicionar cotações, documentos do projeto ou ordens, primeiro acesse a empresa.</p></div><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn btn-ghost" data-project-action="vincular-empresa">🔗 Vincular empresa existente</button><button class="btn btn-primary" data-project-action="nova-empresa">＋ Nova empresa</button></div></div>
  <div class="notice-box"><b>! Organização</b><br>Cada empresa funciona como uma pasta própria dentro do projeto. Abra "Ficha completa" para ver dados, documentos, cotações e ordens desta empresa em todos os projetos em que ela participa.</div>
  ${cards||'<div class="empty-inline">Nenhuma empresa cadastrada. Comece adicionando ou vinculando uma empresa.</div>'}`;
}

function renderEmpresaProjeto(projectId,empresaId,aba='resumo'){
  const esc=escapeHTML;
  const p=projectData(DB.getById('projetos',projectId));
  const e=p.empresas.find(x=>x.id===empresaId); if(!e)return renderWorkspaceProjeto(p,'empresas');
  const cot=p.cotacoes.filter(c=>c.empresaId===e.id || (!c.empresaId && String(c.fornecedor||'').trim().toLowerCase()===String(e.nome||'').trim().toLowerCase()));
  const ord=p.ordensCompra.filter(o=>o.empresaId===e.id || (!o.empresaId && String(o.fornecedor||'').trim().toLowerCase()===String(e.nome||'').trim().toLowerCase()));
  const vencedora=cot.find(c=>c.selecionada);
  // Documentos da empresa vivem só na ficha global (empresaDocumentosGlobais
  // mais abaixo) — aqui só se lê e se linka pra lá, sem upload duplicado.
  const docsGlobais=getEmpresaGlobal(e.empresaGlobalId)?.documentos||[];
  const situacaoDocs=statusDocumentacaoEmpresa(e.empresaGlobalId);
  const tabs=[['resumo','Resumo'],['cotacoes','Cotações'],['documentos','Documentos'],['ordens','Ordens de compra']];
  let content='';
  if(aba==='cotacoes') content=`<div class="workspace-toolbar"><div><h3>Cotações da empresa</h3><p>Adicione aqui os itens que esta empresa está cotando e anexe o orçamento recebido.</p></div><button class="btn btn-primary" data-project-action="nova-cotacao" data-empresa="${esc(e.id)}">＋ Nova cotação</button></div>${cot.length?cot.map(c=>`<div class="workspace-item"><div><strong>${esc(c.data?formatDateBR(c.data):'Sem data')} · ${formatMoney(c.valor||0)} ${c.selecionada?'· ✓ Vencedora':''}</strong><small>${(c.itens||[]).map(i=>`${esc(i.nome)} (${i.quantidade} × ${formatMoney(i.valor)})`).join(' · ')}</small></div><div class="item-actions">${c.anexo?`<button class="btn btn-sm" data-file-download="${c.anexo.id}">📎 Abrir</button>`:''}<button class="btn btn-sm" data-project-action="selecionar-cotacao" data-item="${c.id}" ${(!c.selecionada&&new Set(p.cotacoes.map(x=>x.empresaId||String(x.fornecedor||'').trim().toLowerCase()).filter(Boolean)).size<3)?'disabled':''}>${c.selecionada?'Selecionada':'Escolher'}</button></div></div>`).join(''):'<div class="empty-inline">Nenhuma cotação desta empresa.</div>'}`;
  else if(aba==='documentos') content=`<div class="workspace-toolbar"><div><h3>Documentos da empresa</h3><p>Os documentos ficam guardados uma única vez na ficha da empresa e valem para todos os projetos em que ela participa.</p></div><button class="btn btn-primary" data-project-action="ver-ficha-empresa" data-empresa-global="${esc(e.empresaGlobalId||'')}" data-ficha-aba="documentos">🏢 Gerenciar documentos na ficha</button></div><div class="notice-box"><b>${situacaoDocs.emoji} ${situacaoDocs.label}</b></div>${docsGlobais.length?docsGlobais.map(d=>{const sit=situacaoDocumento(d);return `<div class="workspace-item"><div><strong>${esc(d.nome)}</strong><small>${sit.emoji} ${esc(sit.label)}${d.dataValidade?' · válido até '+formatDateBR(d.dataValidade):''}</small></div>${d.anexo?`<button class="btn btn-sm" data-file-download="${d.anexo.id}">📎 Abrir</button>`:''}</div>`;}).join(''):'<div class="empty-inline">Nenhum documento cadastrado para esta empresa ainda. Use "Gerenciar documentos na ficha" para adicionar.</div>'}`;
  else if(aba==='ordens') content=`<div class="workspace-toolbar"><div><h3>Ordens de compra</h3><p>A ordem só fica disponível para a empresa vencedora, depois das cotações necessárias.</p></div><button class="btn btn-primary" data-project-action="nova-ordem" data-empresa="${esc(e.id)}" ${podeCriarOrdem(p)&&vencedora?'':'disabled'}>＋ Nova ordem</button></div>${ord.length?ord.map(o=>`<div class="workspace-item"><div><strong>${esc(o.numero||'Ordem sem número')}</strong><small>${formatMoney(o.valor||0)} · ${esc(o.status||'')}</small></div>${o.anexo?`<button class="btn btn-sm" data-file-download="${o.anexo.id}">📎 Abrir</button>`:''}</div>`).join(''):'<div class="empty-inline">Nenhuma ordem de compra cadastrada.</div>'}`;
  else content=`<div class="empresa-detail-hero"><div><span class="project-code">EMPRESA</span><h3>${esc(e.nome)}</h3><p>${e.cnpj?`CNPJ: ${esc(e.cnpj)}`:'CNPJ não informado'}${e.contato?' · '+esc(e.contato):''}</p></div><div style="display:flex;gap:8px"><button class="btn btn-ghost" data-project-action="editar-empresa" data-empresa="${esc(e.id)}">Editar empresa</button><button class="btn btn-primary" data-project-action="ver-ficha-empresa" data-empresa-global="${esc(e.empresaGlobalId||'')}">🏢 Ficha completa (todos os projetos)</button></div></div><div class="project-kpi-grid"><div><span>Cotações</span><strong>${cot.length}</strong></div><div><span>Documentação</span><strong>${situacaoDocs.emoji} ${situacaoDocs.label}</strong></div><div><span>Ordens</span><strong>${ord.length}</strong></div><div><span>Situação</span><strong>${vencedora?'Vencedora':'Em análise'}</strong></div></div><div class="notice-box"><b>Como usar esta empresa</b><br>Entre nas abas acima para adicionar os itens das cotações e, quando liberada, criar a ordem de compra. Os documentos da empresa (CNPJ, certidões...) ficam na "Ficha completa", compartilhados com todos os projetos em que ela participa.</div>`;
  openModal(`Empresa — ${escapeHTML(e.nome)}`,`<div class="empresa-workspace"><div class="empresa-back"><button class="btn btn-ghost" data-project-action="voltar-empresas">← Voltar para empresas</button></div><div class="empresa-tabs">${tabs.map(([k,l])=>`<button class="project-tab ${aba===k?'active':''}" data-empresa-tab="${k}">${l}${k==='cotacoes'?` <span>${cot.length}</span>`:k==='documentos'?` <span>${docsGlobais.length}</span>`:k==='ordens'?` <span>${ord.length}</span>`:''}</button>`).join('')}</div><div class="project-workspace-body">${content}</div></div>`);
  document.getElementById('modalBody').querySelectorAll('[data-empresa-tab]').forEach(b=>b.onclick=(ev)=>{ev.preventDefault();renderEmpresaProjeto(projectId,empresaId,b.dataset.empresaTab);});
  const voltarEmp=document.getElementById('modalBody').querySelector('[data-project-action="voltar-empresas"]'); if(voltarEmp) voltarEmp.onclick=(ev)=>{ev.preventDefault();renderWorkspaceProjeto(projectData(DB.getById('projetos',projectId)),'empresas');};
  document.querySelectorAll('[data-project-action="nova-cotacao"]').forEach(b=>b.onclick=()=>openFormCotacao(projectId,b.dataset.empresa||empresaId));
  document.querySelectorAll('[data-project-action="nova-ordem"]').forEach(b=>b.onclick=()=>{const atual=projectData(DB.getById('projetos',projectId));if(!podeCriarOrdem(atual)){showToast('⚠ '+motivoBloqueioOrdem(atual));return;}openFormOrdem(projectId,b.dataset.empresa||empresaId);});
  document.querySelectorAll('[data-project-action="selecionar-cotacao"]').forEach(b=>b.onclick=()=>selecionarCotacaoProjeto(projectId,b.dataset.item));
  document.querySelectorAll('[data-project-action="editar-empresa"]').forEach(b=>b.onclick=()=>openFormEmpresaEditar(projectId,b.dataset.empresa||empresaId));
  document.querySelectorAll('[data-file-download]').forEach(b=>b.onclick=()=>baixarAnexo(b.dataset.fileDownload));
}

/* -----------------------------------------------------------
   FICHA GLOBAL DA EMPRESA
   Ponto único de acesso aos dados de uma empresa, reunindo o que já
   existe espalhado pelos projetos: cotações, ordens de compra e o
   próprio projeto (via p.empresas[].empresaGlobalId), mais uma lista
   de documentos que pertence à empresa (não a um projeto específico).
   Nada aqui duplica dado: cotações e ordens continuam armazenadas
   dentro do projeto onde nasceram; a ficha só consulta e agrupa.
   ----------------------------------------------------------- */

/* Varre todos os projetos e monta, para a empresa global informada, a
   lista de vínculos {projeto, linkLocal} — a mesma empresa pode ter um
   link local diferente em cada projeto. */
function empresaGlobalRelacoes(empresaGlobalId){
  const relacoes=[];
  DB.getAll('projetos').forEach(proj=>{
    const pd=projectData(proj);
    (pd.empresas||[]).filter(e=>e.empresaGlobalId===empresaGlobalId).forEach(link=>{
      relacoes.push({projeto:pd,link});
    });
  });
  return relacoes;
}

function abrirFichaEmpresaGlobal(empresaGlobalId,aba='dados'){
  const g=getEmpresaGlobal(empresaGlobalId);
  if(!g){showToast('Empresa não encontrada.');return;}
  const esc=escapeHTML;
  const relacoes=empresaGlobalRelacoes(empresaGlobalId);
  const cotacoes=[]; const ordens=[];
  relacoes.forEach(({projeto,link})=>{
    projeto.cotacoes.filter(c=>c.empresaId===link.id).forEach(c=>cotacoes.push({...c,_projeto:projeto}));
    projeto.ordensCompra.filter(o=>o.empresaId===link.id).forEach(o=>ordens.push({...o,_projeto:projeto}));
  });
  const docs=g.documentos||[];
  const situacao=statusDocumentacaoEmpresa(empresaGlobalId);
  const tabs=[['dados','Dados'],['documentos','Documentos'],['cotacoes','Cotações'],['ordens','Ordens de compra'],['projetos','Projetos relacionados'],['historico','Histórico']];
  const contadores={documentos:docs.length,cotacoes:cotacoes.length,ordens:ordens.length,projetos:relacoes.length};
  let content='';
  if(aba==='documentos') content=empresaFichaDocumentosHTML(g,docs);
  else if(aba==='cotacoes') content=empresaFichaCotacoesHTML(cotacoes,empresaGlobalId);
  else if(aba==='ordens') content=empresaFichaOrdensHTML(ordens,empresaGlobalId);
  else if(aba==='projetos') content=empresaFichaProjetosHTML(relacoes);
  else if(aba==='historico') content=empresaFichaHistoricoHTML(empresaGlobalId);
  else content=empresaFichaDadosHTML(g,situacao,contadores);

  openModal(`🏢 ${esc(g.razaoSocial||'Empresa')}`,`<div class="project-workspace">
    <div class="project-workspace-head"><div><span class="project-code">EMPRESA</span><h2>${esc(g.razaoSocial||'Sem nome')}</h2><p>${g.cnpj?esc(g.cnpj):'CNPJ não informado'}${g.nomeFantasia?' · '+esc(g.nomeFantasia):''}</p></div>${badgeHTML(situacao.emoji==='🟢'?'ok':situacao.emoji==='🔴'?'danger':'warn',situacao.label)}</div>
    <div class="project-kpi-grid"><div><span>📄 Documentos</span><strong>${contadores.documentos}</strong></div><div><span>💰 Cotações</span><strong>${contadores.cotacoes}</strong></div><div><span>🛒 Ordens</span><strong>${contadores.ordens}</strong></div><div><span>🎯 Projetos</span><strong>${contadores.projetos}</strong></div></div>
    <div class="project-tabs">${tabs.map(([k,l])=>`<button class="project-tab ${aba===k?'active':''}" data-empresa-ficha-tab="${k}">${l}${contadores[k]!==undefined?` <span>${contadores[k]}</span>`:''}</button>`).join('')}</div>
    <div class="project-workspace-body">${content}</div>
  </div>`);

  document.getElementById('modalBody').querySelectorAll('[data-empresa-ficha-tab]').forEach(b=>b.onclick=(ev)=>{ev.preventDefault();abrirFichaEmpresaGlobal(empresaGlobalId,b.dataset.empresaFichaTab);});
  document.querySelectorAll('[data-file-download]').forEach(b=>b.onclick=()=>baixarAnexo(b.dataset.fileDownload));
  document.querySelectorAll('[data-empresa-action="editar"]').forEach(b=>b.onclick=()=>{
    // Reaproveita o formulário já existente; precisa de um projeto/link para reabrir a tela depois.
    const rel=relacoes[0];
    if(rel) openFormEmpresaEditar(rel.projeto.id,rel.link.id);
    else showToast('Vincule esta empresa a um projeto para editá-la.');
  });
  document.querySelectorAll('[data-empresa-action="novo-doc"]').forEach(b=>b.onclick=()=>abrirFormDocumentoEmpresaGlobal(empresaGlobalId));
  document.querySelectorAll('[data-empresa-doc-excluir]').forEach(b=>b.onclick=()=>excluirDocumentoEmpresaGlobal(empresaGlobalId,b.dataset.empresaDocExcluir));
  document.querySelectorAll('[data-empresa-action="nova-cotacao"]').forEach(b=>b.onclick=()=>abrirEscolherProjetoParaEmpresa(empresaGlobalId,'cotacao'));
  document.querySelectorAll('[data-empresa-action="nova-ordem"]').forEach(b=>b.onclick=()=>abrirEscolherProjetoParaEmpresa(empresaGlobalId,'ordem'));
  document.querySelectorAll('[data-empresa-action="vincular-projeto"]').forEach(b=>b.onclick=()=>abrirVincularEmpresaAOutroProjeto(empresaGlobalId));
  document.querySelectorAll('[data-empresa-abrir-projeto]').forEach(b=>b.onclick=()=>{closeModal();abrirDetalheProjeto(b.dataset.empresaAbrirProjeto);});
}

function empresaFichaDadosHTML(g,situacao,contadores){
  const esc=escapeHTML;
  return `<div class="workspace-grid"><div class="detail-block"><div class="detail-label">Dados da empresa</div><div class="detail-value">
    <b>Razão Social:</b> ${esc(g.razaoSocial||'—')}<br>
    <b>Nome Fantasia:</b> ${esc(g.nomeFantasia||'—')}<br>
    <b>CNPJ:</b> ${esc(g.cnpj||'—')}<br>
    <b>Telefone/Contato:</b> ${esc(g.contato||g.telefone||'—')}<br>
    <b>E-mail:</b> ${esc(g.email||'—')}<br>
    <b>Endereço:</b> ${esc(g.endereco||'—')}<br>
    <b>Município:</b> ${esc(g.municipio||'—')} ${g.uf?'/ '+esc(g.uf):''}<br>
    ${g.representante?`<b>Representante:</b> ${esc(g.representante)}<br>`:''}
    ${g.observacao?`<b>Observação:</b> ${esc(g.observacao)}<br>`:''}
  </div></div></div>
  <div class="notice-box"><b>${situacao.emoji} ${situacao.label}</b><br>Baseado nos documentos cadastrados na aba "Documentos" desta empresa.</div>
  <div class="modal-actions"><button class="btn btn-primary" data-empresa-action="editar">Editar dados da empresa</button></div>`;
}

function empresaFichaDocumentosHTML(g,docs){
  const esc=escapeHTML;
  return `<div class="workspace-toolbar"><div><h3>📄 Documentos</h3><p>Documentos da própria empresa (CNPJ, contrato social, certidões...), válidos para todos os projetos.</p></div><button class="btn btn-primary" data-empresa-action="novo-doc">＋ Adicionar documento</button></div>
  ${docs.length?docs.map(d=>{
    const sit=situacaoDocumento(d);
    return `<div class="workspace-item"><div><strong>${esc(d.nome)}</strong><small>${sit.emoji} ${esc(sit.label)}${d.dataValidade?' · válido até '+formatDateBR(d.dataValidade):''}${d.observacao?' · '+esc(d.observacao):''}</small></div><div class="item-actions">${d.anexo?`<button class="btn btn-sm" data-file-download="${d.anexo.id}">📎 Abrir</button>`:''}<button class="btn btn-sm btn-danger" data-empresa-doc-excluir="${d.id}">Excluir</button></div></div>`;
  }).join(''):'<div class="empty-inline">Nenhum documento cadastrado para esta empresa.</div>'}`;
}

function empresaFichaCotacoesHTML(cotacoes,empresaGlobalId){
  const esc=escapeHTML;
  return `<div class="workspace-toolbar"><div><h3>💰 Cotações</h3><p>Cotações desta empresa em todos os projetos em que participa.</p></div><button class="btn btn-primary" data-empresa-action="nova-cotacao">＋ Nova cotação</button></div>
  ${cotacoes.length?cotacoes.sort((a,b)=>(b.data||'').localeCompare(a.data||'')).map(c=>`<div class="workspace-item"><div><strong>${c.data?formatDateBR(c.data):'Sem data'} · ${formatMoney(c.valor||0)} ${c.selecionada?'· ✓ Vencedora':''}</strong><small>Projeto: ${esc(c._projeto.nome)}</small></div><div class="item-actions">${c.anexo?`<button class="btn btn-sm" data-file-download="${c.anexo.id}">📎 Abrir</button>`:''}<button class="btn btn-sm" data-empresa-abrir-projeto="${esc(c._projeto.id)}">Ver projeto</button></div></div>`).join(''):'<div class="empty-inline">Nenhuma cotação desta empresa ainda.</div>'}`;
}

function empresaFichaOrdensHTML(ordens,empresaGlobalId){
  const esc=escapeHTML;
  return `<div class="workspace-toolbar"><div><h3>🛒 Ordens de compra</h3><p>Ordens de compra emitidas para esta empresa, em todos os projetos.</p></div><button class="btn btn-primary" data-empresa-action="nova-ordem">＋ Nova ordem de compra</button></div>
  ${ordens.length?ordens.map(o=>`<div class="workspace-item"><div><strong>${esc(o.numero||'Ordem sem número')}</strong><small>${formatMoney(o.valor||0)} · ${esc(o.status||'')} · Projeto: ${esc(o._projeto.nome)}</small></div><div class="item-actions">${o.anexo?`<button class="btn btn-sm" data-file-download="${o.anexo.id}">📎 Abrir</button>`:''}<button class="btn btn-sm" data-empresa-abrir-projeto="${esc(o._projeto.id)}">Ver projeto</button></div></div>`).join(''):'<div class="empty-inline">Nenhuma ordem de compra para esta empresa ainda.</div>'}`;
}

function empresaFichaProjetosHTML(relacoes){
  const esc=escapeHTML;
  return `<div class="workspace-toolbar"><div><h3>🎯 Projetos relacionados</h3><p>Projetos em que esta empresa participa.</p></div><button class="btn btn-primary" data-empresa-action="vincular-projeto">＋ Vincular a outro projeto</button></div>
  ${relacoes.length?relacoes.map(({projeto})=>`<div class="workspace-item"><div><strong>${esc(projeto.nome)}</strong><small>${esc(projeto.codigo||'')}</small></div><div class="item-actions">${badgeHTML(projetoStatusTom(projeto.status),projeto.status||'Sem status')}<button class="btn btn-sm" data-empresa-abrir-projeto="${esc(projeto.id)}">Acessar projeto →</button></div></div>`).join(''):'<div class="empty-inline">Esta empresa ainda não está vinculada a nenhum projeto.</div>'}`;
}

function empresaFichaHistoricoHTML(empresaGlobalId){
  const esc=escapeHTML;
  const itens=DB.getAll('historico').filter(h=>h.refId===empresaGlobalId).sort((a,b)=>b.timestamp-a.timestamp);
  return `<h3 style="margin-top:0">📜 Histórico</h3>${itens.length?itens.map(h=>`<div class="history-row"><div class="h-meta">${timestampToBR(h.timestamp)} · ${esc(h.acao||h.modulo)}</div><div>${esc(h.descricao)}</div></div>`).join(''):'<div class="empty-inline">Nenhum evento registrado ainda para esta empresa.</div>'}`;
}

function abrirFormDocumentoEmpresaGlobal(empresaGlobalId){
  openModal('Adicionar documento da empresa',`<form id="formDocEmpresaGlobal"><div class="field"><label>Documento *</label><select class="input" id="deg_nome">${EMPRESA_DOCS_SUGERIDOS.map(x=>`<option>${x}</option>`).join('')}</select></div><div class="field"><label>Validade (opcional)</label><input class="input" type="date" id="deg_validade"></div><div class="field"><label>Arquivo *</label><input class="input" type="file" id="deg_arq" required accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx"></div><div class="field"><label>Observação</label><textarea id="deg_obs"></textarea></div><div class="modal-actions"><button type="button" class="btn btn-ghost" id="deg_cancel">Cancelar</button><button class="btn btn-primary">Salvar documento</button></div></form>`);
  document.getElementById('deg_cancel').onclick=closeModal;
  document.getElementById('formDocEmpresaGlobal').onsubmit=async e=>{
    e.preventDefault();
    const f=document.getElementById('deg_arq').files[0];
    if(!f)return;
    const g=getEmpresaGlobal(empresaGlobalId);
    if(!g)return;
    const doc={id:uid('degdoc'),nome:document.getElementById('deg_nome').value,dataValidade:document.getElementById('deg_validade').value||'',observacao:document.getElementById('deg_obs').value.trim(),anexo:await salvarAnexo(f,'doc-empresa')};
    const documentos=[...(g.documentos||[]),doc];
    DB.update('gerador-empresas',empresaGlobalId,{documentos});
    registrarHistorico({modulo:'empresa',acao:'documento',descricao:`Documento "${doc.nome}" adicionado à empresa "${g.razaoSocial}".`,refId:empresaGlobalId});
    closeModal();
    abrirFichaEmpresaGlobal(empresaGlobalId,'documentos');
  };
}
function excluirDocumentoEmpresaGlobal(empresaGlobalId,docId){
  const g=getEmpresaGlobal(empresaGlobalId); if(!g)return;
  const doc=(g.documentos||[]).find(d=>d.id===docId); if(!doc)return;
  confirmAction('Excluir este documento da empresa?',async()=>{
    if(doc.anexo)await ProjectFiles.remove(doc.anexo.id);
    DB.update('gerador-empresas',empresaGlobalId,{documentos:(g.documentos||[]).filter(d=>d.id!==docId)});
    abrirFichaEmpresaGlobal(empresaGlobalId,'documentos');
  });
}

/* Uma cotação/ordem pertence sempre a um projeto — se a empresa ainda
   não estiver vinculada ao projeto escolhido, o vínculo é criado na hora. */
function abrirEscolherProjetoParaEmpresa(empresaGlobalId,tipo){
  const g=getEmpresaGlobal(empresaGlobalId); if(!g)return;
  const projetos=DB.getAll('projetos');
  if(!projetos.length){showToast('Cadastre um projeto primeiro.');return;}
  openModal(`Para qual projeto é ${tipo==='cotacao'?'esta cotação':'esta ordem de compra'}?`,`
    <div class="activity-list" style="max-height:45vh;overflow-y:auto">${projetos.map(pr=>`<div class="activity-item" data-escolher-projeto="${escapeHTML(pr.id)}" style="cursor:pointer"><strong>${escapeHTML(pr.nome)}</strong><small>${escapeHTML(pr.codigo||'')}</small></div>`).join('')}</div>
    <div class="modal-actions" style="margin-top:16px"><button type="button" class="btn btn-ghost" id="escProjCancel">Cancelar</button></div>`);
  document.getElementById('escProjCancel').onclick=closeModal;
  document.querySelectorAll('[data-escolher-projeto]').forEach(el=>{
    el.addEventListener('click',()=>{
      const projectId=el.dataset.escolherProjeto;
      const p=projectData(DB.getById('projetos',projectId));
      let link=p.empresas.find(x=>x.empresaGlobalId===empresaGlobalId);
      if(!link){
        link={id:uid('emp'),empresaGlobalId,nome:g.razaoSocial,cnpj:g.cnpj||'',contato:g.contato||g.telefone||'',email:g.email||'',endereco:g.endereco||'',nomeFantasia:g.nomeFantasia||'',municipio:g.municipio||'',uf:g.uf||'',observacao:'',documentos:[],criadoEm:Date.now()};
        p.empresas.push(link);
        projectSave(p);
      }
      closeModal();
      if(tipo==='cotacao') openFormCotacao(projectId,link.id);
      else openFormOrdem(projectId,link.id);
    });
  });
}
function abrirVincularEmpresaAOutroProjeto(empresaGlobalId){
  const g=getEmpresaGlobal(empresaGlobalId); if(!g)return;
  const jaVinculados=new Set(empresaGlobalRelacoes(empresaGlobalId).map(r=>r.projeto.id));
  const disponiveis=DB.getAll('projetos').filter(pr=>!jaVinculados.has(pr.id));
  if(!disponiveis.length){showToast('Esta empresa já está vinculada a todos os projetos existentes.');return;}
  openModal('Vincular a outro projeto',`
    <div class="activity-list" style="max-height:45vh;overflow-y:auto">${disponiveis.map(pr=>`<div class="activity-item" data-vinc-proj="${escapeHTML(pr.id)}" style="cursor:pointer"><strong>${escapeHTML(pr.nome)}</strong><small>${escapeHTML(pr.codigo||'')}</small></div>`).join('')}</div>
    <div class="modal-actions" style="margin-top:16px"><button type="button" class="btn btn-ghost" id="vincProjCancel">Cancelar</button></div>`);
  document.getElementById('vincProjCancel').onclick=closeModal;
  document.querySelectorAll('[data-vinc-proj]').forEach(el=>{
    el.addEventListener('click',()=>{
      const projectId=el.dataset.vincProj;
      const p=projectData(DB.getById('projetos',projectId));
      p.empresas.push({id:uid('emp'),empresaGlobalId,nome:g.razaoSocial,cnpj:g.cnpj||'',contato:g.contato||g.telefone||'',email:g.email||'',endereco:g.endereco||'',nomeFantasia:g.nomeFantasia||'',municipio:g.municipio||'',uf:g.uf||'',observacao:'',documentos:[],criadoEm:Date.now()});
      projectSave(p);
      registrarHistorico({modulo:'empresa',acao:'vínculo',descricao:`Empresa "${g.razaoSocial}" vinculada ao projeto "${p.nome}".`,refId:empresaGlobalId});
      abrirFichaEmpresaGlobal(empresaGlobalId,'projetos');
    });
  });
}

function checklistDocsHTML(p){const arr=p.docsApae;const titulo='Documentação da APAE';const obrig=['CNPJ','Estatuto','Ata de eleição/posse','Certidão federal','Certidão estadual','Certidão municipal','FGTS','CNDT'];const grupo='apae';return `<div class="workspace-toolbar"><div><h3>${titulo}</h3><p>Os documentos podem ser cadastrados a qualquer momento, independentemente das cotações ou da ordem de compra.</p></div><button class="btn btn-primary" data-project-action="novo-doc-${grupo}">＋ Adicionar documento</button></div><div class="checklist-progress"><strong>${arr.filter(x=>x.entregue).length}/${arr.length||0}</strong> documentos entregues</div><div class="required-docs">${obrig.map(nome=>{const d=arr.find(x=>x.nome===nome);return `<div class="required-doc ${d?.entregue?'done':''}"><span>${d?.entregue?'✓':'○'}</span><div><strong>${nome}</strong><small>${d?.anexo?escapeHTML(d.anexo.nome):d?'Cadastrado, sem arquivo':'Pendente'}</small></div>${d?.anexo?`<button class="btn btn-sm" data-file-download="${d.anexo.id}">Abrir</button>`:''}${d?`<button class="btn btn-sm" data-project-action="toggle-doc" data-grupo="${grupo}" data-item="${d.id}">${d.entregue?'Reabrir':'Concluir'}</button>`:''}</div>`}).join('')}</div>${arr.filter(d=>!obrig.includes(d.nome)).map(d=>`<div class="workspace-item"><div><strong>${escapeHTML(d.nome)}</strong><small>${d.entregue?'✓ Entregue':'Pendente'}</small></div>${d.anexo?`<button class="btn btn-sm" data-file-download="${d.anexo.id}">Abrir</button>`:''}</div>`).join('')}`;}
function projectDocsApaeHTML(p){return checklistDocsHTML(p);}
function projectDocumentosHTML(p){return `<div class="workspace-toolbar"><div><h3>Documentos da execução</h3><p>Notas fiscais, comprovantes, relatórios e demais documentos que não entram nas checklists.</p></div><button class="btn btn-primary" data-project-action="novo-documento">＋ Anexar documento</button></div>${p.documentosProjeto.length?`<div class="workspace-list">${p.documentosProjeto.map(d=>`<div class="workspace-item"><div><strong>${escapeHTML(d.nome)}</strong><small>${escapeHTML(d.categoria||'Outro')} · ${d.data?formatDateBR(d.data):'Sem data'}</small></div><div class="item-actions">${d.anexo?`<button class="btn btn-sm" data-file-download="${d.anexo.id}">📎 Abrir</button>`:''}<button class="btn btn-sm btn-danger" data-project-action="excluir-item" data-tipo="documento" data-item="${d.id}">Excluir</button></div></div>`).join('')}</div>`:'<div class="empty-inline">Nenhum documento de execução anexado.</div>'}`;}
function projectPagamentosHTML(p){return `<div class="workspace-toolbar"><div><h3>Pagamentos</h3><p>Registre quanto foi pago e anexe o comprovante. Isso alimenta o saldo do projeto.</p></div><button class="btn btn-primary" data-project-action="novo-pagamento">＋ Registrar pagamento</button></div>${p.pagamentos.length?`<div class="workspace-list">${p.pagamentos.map(x=>`<div class="workspace-item"><div><strong>${formatMoney(x.valor)} — ${escapeHTML(x.fornecedor||'Pagamento')}</strong><small>${x.data?formatDateBR(x.data):'Sem data'} · ${escapeHTML(x.forma||'Forma não informada')}</small></div>${x.anexo?`<button class="btn btn-sm" data-file-download="${x.anexo.id}">📎 Comprovante</button>`:''}</div>`).join('')}</div>`:'<div class="empty-inline">Nenhum pagamento registrado.</div>'}`;}
function projectPrestacaoHTML(p){const checklist=projectChecklist(p);const pendentes=checklist.filter(x=>!x[1]);const nf=p.documentosProjeto.filter(x=>['Nota fiscal','NF','Nota fiscal / recibo'].includes(x.categoria)).length;const pago=p.pagamentos.reduce((s,x)=>s+(Number(x.valor)||0),0);const saldo=(Number(p.valorOrcado)||0)-pago;return `<div class="workspace-toolbar"><div><h3>Prestação de contas</h3><p>Visão final para conferir se o processo está documentado antes de fechar o projeto. O detalhe de cada etapa está nas abas e na barra de progresso no topo.</p></div></div><div class="project-kpi-grid"><div><span>Recurso recebido</span><strong>${formatMoney(p.valorOrcado||0)}</strong></div><div><span>Total pago</span><strong>${formatMoney(pago)}</strong></div><div><span>Saldo</span><strong>${formatMoney(saldo)}</strong></div><div><span>Notas fiscais</span><strong>${nf}</strong></div></div>${pendentes.length?`<div class="notice-box warning"><b>! Ainda não está pronto (${checklist.length-pendentes.length}/${checklist.length})</b><br>Clique nas etapas destacadas na barra do topo para resolver: ${pendentes.map(x=>escapeHTML(x[0])).join(', ')}.</div>`:'<div class="notice-box success"><b>✓ Projeto pronto para conferência final</b><br>Todos os itens principais estão registrados. A conferência humana e as regras do financiador continuam sendo necessárias.</div>'}`;}
function projectPendenciasHTML(p){return `<div class="workspace-toolbar"><div><h3>Pendências</h3><p>Use quando houver algo específico que precise ser resolvido.</p></div><button class="btn btn-primary" data-project-action="nova-pendencia">＋ Nova pendência</button></div>${p.pendencias.length?`<div class="workspace-list">${p.pendencias.map(x=>`<div class="workspace-item ${x.status==='Concluída'?'selected-item':''}"><div><strong>${escapeHTML(x.titulo)}</strong><small>${escapeHTML(x.prioridade||'Normal')} · ${escapeHTML(x.status||'Pendente')}</small>${x.descricao?`<small>${escapeHTML(x.descricao)}</small>`:''}</div><div class="item-actions"><button class="btn btn-sm" data-project-action="toggle-pendencia" data-item="${x.id}">${x.status==='Concluída'?'Reabrir':'✓ Concluir'}</button><button class="btn btn-sm btn-danger" data-project-action="excluir-pendencia" data-item="${x.id}">Excluir</button></div></div>`).join('')}</div>`:'<div class="empty-inline">Nenhuma pendência manual.</div>'}`;}

/* ---------------------------------------------------------
   WORKSPACE DO RECURSO (Pai) — visão financeira e administrativa
   geral. Nunca mistura planejado com gasto: os três conceitos
   (recebido/distribuído/executado) vêm de recursoResumoFinanceiro().
   --------------------------------------------------------- */
const MOVIMENTACAO_LABEL = {
  entrada:'🟢 Entrada do recurso', distribuicao:'🔵 Distribuição para execução',
  execucao:'🟠 Execução/gasto', pagamento:'🟠 Pagamento',
  transferencia:'🔁 Transferência entre execuções', ajuste:'✎ Ajuste'
};

function recursoGeralHTML(r){
  const f=recursoResumoFinanceiro(r);
  return `<div class="project-kpi-grid">
      <div><span>Recebido</span><strong>${formatMoney(f.recebido)}</strong></div>
      <div><span>Distribuído</span><strong>${formatMoney(f.distribuido)}</strong></div>
      <div><span>Executado</span><strong>${formatMoney(f.executado)}</strong></div>
      <div><span>Saldo não distribuído</span><strong>${formatMoney(f.naoDistribuido)}</strong></div>
    </div>
    <div class="project-kpi-grid">
      <div><span>Saldo das execuções</span><strong>${formatMoney(f.saldoExecucoes)}</strong></div>
      <div><span>Saldo total disponível</span><strong>${formatMoney(f.saldoTotalDisponivel)}</strong></div>
      <div><span>Execuções</span><strong>${f.qtdExecucoes}</strong></div>
      <div><span>Status</span><strong>${escapeHTML(r.status||'—')}</strong></div>
    </div>
    <div class="workspace-grid">
      <div class="detail-block"><div class="detail-label">% distribuído do recurso</div><div class="project-progress"><i style="width:${f.percentualDistribuicao}%"></i></div><small class="muted">${f.percentualDistribuicao}% do valor recebido já foi destinado a execuções</small></div>
      <div class="detail-block"><div class="detail-label">% executado do distribuído</div><div class="project-progress"><i style="width:${f.percentualExecucao}%"></i></div><small class="muted">${f.percentualExecucao}% do valor distribuído já foi gasto</small></div>
    </div>
    <div class="detail-block"><div class="detail-label">Dados do recurso</div><div class="detail-value">
      <b>Tipo/origem:</b> ${escapeHTML(r.fonteRecurso||'—')}<br>
      <b>Órgão/entidade que repassou:</b> ${escapeHTML(r.orgaoRepassador||'—')}<br>
      <b>Convênio/termo/processo:</b> ${escapeHTML(r.convenio||'—')}<br>
      <b>Data do recebimento:</b> ${r.dataRecebimento?formatDateBR(r.dataRecebimento):'—'}<br>
      <b>Período:</b> ${formatDateBR(r.dataInicio)} → ${formatDateBR(r.dataFim)}<br>
      <b>Conta bancária:</b> ${escapeHTML(r.contaBancaria||'—')}<br>
      <b>Responsável:</b> ${escapeHTML(r.responsavel||'—')}<br>
      <b>Finalidade:</b> ${escapeHTML(r.objetivo||'—')}<br>
      ${r.descricao?`<b>Observações:</b> ${escapeHTML(r.descricao)}`:''}
    </div></div>
    <div class="modal-actions">
      <button class="btn btn-ghost" data-recurso-action="editar">Editar recurso</button>
      <button class="btn btn-ghost" data-recurso-action="relatorio">📄 Gerar relatório</button>
      <button class="btn btn-ghost" data-recurso-action="${r.arquivado?'desarquivar':'arquivar'}">${r.arquivado?'↩ Reabrir recurso':'🗄 Arquivar recurso'}</button>
    </div>`;
}

function recursoExecucoesHTML(r){
  const filhos=recursoExecucoes(r.id);
  const check=podeCriarExecucao(r,0);
  const cards=filhos.map(f=>{
    const fin=execucaoFinanceiro(f);
    return `<div class="empresa-project-card empresa-card-compact" data-execucao-abrir="${escapeHTML(f.id)}" style="cursor:pointer">
      <div class="empresa-project-head"><div><span class="project-code">EXECUÇÃO</span><h3>${escapeHTML(f.nome)}</h3></div>${badgeHTML(projetoStatusTom(f.status),f.status||'Sem status')}</div>
      <div class="empresa-project-stats"><span>Planejado: <b>${formatMoney(fin.planejado)}</b></span><span>Executado: <b>${formatMoney(fin.executado)}</b></span><span>Saldo: <b>${formatMoney(fin.saldo)}</b></span></div>
      <div class="project-progress"><i style="width:${fin.pct}%"></i></div>
      <small class="muted">${fin.pct}% executado</small>
    </div>`;
  }).join('');
  return `<div class="workspace-toolbar"><div><h3>Execuções deste recurso</h3><p>Disponível para novas execuções: <b>${formatMoney(check.disponivel)}</b></p></div>
    <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn btn-ghost" data-recurso-action="transferir-saldo">🔁 Transferir saldo</button><button class="btn btn-primary" data-recurso-action="nova-execucao">＋ Nova execução</button></div></div>
    ${cards || '<div class="empty-inline">Nenhuma execução cadastrada ainda.</div>'}`;
}

function recursoDocumentosHTML(r){
  const docs=r.documentosRecurso||[];
  return `<div class="workspace-toolbar"><div><h3>Documentos gerais do recurso</h3><p>Termo, convênio, plano geral, comprovante de recebimento — documentos do recurso como um todo, separados dos documentos de cada execução.</p></div><button class="btn btn-primary" data-recurso-action="novo-documento">＋ Adicionar documento</button></div>
  ${docs.length?docs.map(d=>`<div class="workspace-item"><div><strong>${escapeHTML(d.nome)}</strong><small>${d.data?formatDateBR(d.data):''}${d.observacao?' · '+escapeHTML(d.observacao):''}</small></div><div class="item-actions">${d.anexo?`<button class="btn btn-sm" data-file-download="${d.anexo.id}">📎 Abrir</button>`:''}<button class="btn btn-sm btn-danger" data-recurso-action="excluir-documento" data-item="${d.id}">Excluir</button></div></div>`).join(''):'<div class="empty-inline">Nenhum documento geral cadastrado.</div>'}`;
}

function recursoHistoricoFinanceiroHTML(r){
  const movs=[...(r.movimentacoes||[])].sort((a,b)=>b.criadoEm-a.criadoEm);
  return `<h3 style="margin-top:0">Histórico financeiro</h3><p class="muted">Toda entrada, distribuição, gasto, transferência ou ajuste é registrado aqui — os valores nunca mudam "por baixo".</p>
  ${movs.length?movs.map(m=>`<div class="history-row"><div class="h-meta">${formatDateBR(m.data)} · ${MOVIMENTACAO_LABEL[m.tipo]||m.tipo}</div><div>${formatMoney(m.valor)}${m.descricao?' — '+escapeHTML(m.descricao):''}</div></div>`).join(''):'<div class="empty-inline">Nenhuma movimentação registrada.</div>'}`;
}

function recursoLinhaDoTempoHTML(r){
  const idsFilhos=recursoExecucoes(r.id).map(f=>f.id);
  const relevantes=new Set([r.id,...idsFilhos]);
  const itens=DB.getAll('historico').filter(h=>relevantes.has(h.refId)).sort((a,b)=>b.timestamp-a.timestamp);
  return `<h3 style="margin-top:0">Linha do tempo</h3><p class="muted">Reaproveita o histórico já registrado pelo sistema para o recurso e todas as suas execuções.</p>
  ${itens.length?itens.map(h=>`<div class="history-row"><div class="h-meta">${timestampToBR(h.timestamp)}</div><div>${escapeHTML(h.descricao)}</div></div>`).join(''):'<div class="empty-inline">Nenhum evento registrado ainda.</div>'}`;
}

function renderWorkspaceRecurso(r, aba='geral'){
  r = projectData(DB.getById('projetos', r.id) || r);
  const tabs=[['geral','Visão geral'],['execucoes','Execuções'],['documentos','Documentos'],['historico','Histórico financeiro'],['linha-tempo','Linha do tempo']];
  const active=tabs.some(t=>t[0]===aba)?aba:'geral';
  const mapa={geral:recursoGeralHTML,execucoes:recursoExecucoesHTML,documentos:recursoDocumentosHTML,historico:recursoHistoricoFinanceiroHTML,'linha-tempo':recursoLinhaDoTempoHTML};
  const content=mapa[active](r);
  const f=recursoResumoFinanceiro(r);
  openModal(`💰 Recurso ${escapeHTML(r.codigo)} — ${escapeHTML(r.nome)}`,`<div class="project-workspace">
    <div class="project-workspace-head"><div><span class="project-code">RECURSO</span><h2>${escapeHTML(r.nome)}</h2><p>${escapeHTML(r.fonteRecurso||'Origem não informada')} · Recebido: ${formatMoney(r.valorOrcado||0)}</p></div>${badgeHTML(projetoStatusTom(r.status),r.status||'Sem status')}${r.arquivado?badgeHTML('neutral','Arquivado'):''}</div>
    <div class="project-kpi-grid"><div><span>Executado</span><strong>${formatMoney(f.executado)}</strong></div><div><span>Disponível total</span><strong>${formatMoney(f.saldoTotalDisponivel)}</strong></div><div><span>Execuções</span><strong>${f.qtdExecucoes}</strong></div></div>
    <div class="project-tabs">${tabs.map(([key,label])=>`<button class="project-tab ${active===key?'active':''}" data-recurso-tab="${key}">${label}${key==='execucoes'?` <span>${f.qtdExecucoes}</span>`:''}</button>`).join('')}</div>
    <div class="project-workspace-body">${content}</div>
  </div>`);
  document.querySelectorAll('[data-recurso-tab]').forEach(btn=>btn.onclick=()=>renderWorkspaceRecurso(r,btn.dataset.recursoTab));
  document.querySelectorAll('[data-execucao-abrir]').forEach(el=>el.onclick=()=>abrirDetalheProjeto(el.dataset.execucaoAbrir));
  document.querySelectorAll('[data-recurso-action="editar"]').forEach(b=>b.onclick=()=>openFormProjeto(r.id));
  document.querySelectorAll('[data-recurso-action="nova-execucao"]').forEach(b=>b.onclick=()=>openFormProjeto(null,{tipo:'execucao',paiId:r.id}));
  document.querySelectorAll('[data-recurso-action="transferir-saldo"]').forEach(b=>b.onclick=()=>abrirTransferenciaSaldo(r.id));
  document.querySelectorAll('[data-recurso-action="relatorio"]').forEach(b=>b.onclick=()=>gerarRelatorioRecurso(r.id));
  document.querySelectorAll('[data-recurso-action="arquivar"]').forEach(b=>b.onclick=()=>arquivarRecurso(r.id,true));
  document.querySelectorAll('[data-recurso-action="desarquivar"]').forEach(b=>b.onclick=()=>arquivarRecurso(r.id,false));
  document.querySelectorAll('[data-recurso-action="novo-documento"]').forEach(b=>b.onclick=()=>abrirFormDocumentoRecurso(r.id));
  document.querySelectorAll('[data-recurso-action="excluir-documento"]').forEach(b=>b.onclick=()=>excluirDocumentoRecurso(r.id,b.dataset.item));
  document.querySelectorAll('[data-file-download]').forEach(b=>b.onclick=()=>baixarAnexo(b.dataset.fileDownload));
}
function abrirDetalheRecurso(id, aba='geral'){
  const r=DB.getById('projetos',id); if(!r) return;
  renderWorkspaceRecurso(r,aba);
}

function arquivarRecurso(id, arquivar){
  const r=DB.getById('projetos',id); if(!r) return;
  const texto = arquivar
    ? 'Arquivar este recurso? Ele sai da lista principal, mas continua disponível no histórico e pode ser reaberto depois.'
    : 'Reabrir este recurso na lista principal?';
  confirmAction(texto, ()=>{
    DB.update('projetos',id,{arquivado:arquivar});
    registrarHistorico({modulo:'projeto',acao:arquivar?'arquivamento':'reabertura',descricao:`Recurso "${r.nome}" ${arquivar?'arquivado':'reaberto'}.`,refId:id});
    showToast(arquivar?'✓ Recurso arquivado.':'✓ Recurso reaberto.');
    closeModal();
    renderCurrentView();
  });
}

function abrirFormDocumentoRecurso(recursoId){
  openModal('Adicionar documento do recurso',`<form id="formDocRecurso"><div class="form-grid">
    <div class="field full"><label>Documento *</label><select class="input" id="dr_nome"><option>Termo</option><option>Convênio</option><option>Plano geral</option><option>Comprovante de recebimento</option><option>Documentação do recurso</option><option>Outros documentos</option></select></div>
    <div class="field full"><label>Arquivo *</label><input class="input" type="file" id="dr_arq" required accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx"></div>
    <div class="field full"><label>Observação</label><textarea id="dr_obs"></textarea></div>
  </div><div class="modal-actions"><button type="button" class="btn btn-ghost" id="dr_cancel">Cancelar</button><button class="btn btn-primary">Salvar documento</button></div></form>`);
  document.getElementById('dr_cancel').onclick=closeModal;
  document.getElementById('formDocRecurso').onsubmit=async e=>{
    e.preventDefault();
    const f=document.getElementById('dr_arq').files[0];
    if(!f){showToast('Anexe um arquivo.');return;}
    const r=projectData(DB.getById('projetos',recursoId));
    const doc={id:uid('docr'),nome:document.getElementById('dr_nome').value,observacao:document.getElementById('dr_obs').value.trim(),data:todayISO(),anexo:await salvarAnexo(f,'documento-recurso')};
    r.documentosRecurso.push(doc);
    projectSave(r);
    registrarHistorico({modulo:'projeto',acao:'documento',descricao:`Documento "${doc.nome}" adicionado ao recurso "${r.nome}".`,refId:recursoId});
    closeModal();
    renderWorkspaceRecurso(r,'documentos');
  };
}
function excluirDocumentoRecurso(recursoId, docId){
  const r=projectData(DB.getById('projetos',recursoId));
  const doc=r.documentosRecurso.find(d=>d.id===docId); if(!doc)return;
  confirmAction('Excluir este documento do recurso?', async ()=>{
    if(doc.anexo) await ProjectFiles.remove(doc.anexo.id);
    r.documentosRecurso=r.documentosRecurso.filter(d=>d.id!==docId);
    projectSave(r);
    renderWorkspaceRecurso(r,'documentos');
  });
}

/* Transferência de saldo entre execuções do mesmo recurso (item 12 do
   pedido): nunca altera os valores sem registrar a movimentação. */
function abrirTransferenciaSaldo(recursoId){
  const filhos=recursoExecucoes(recursoId).filter(f=>f.status!=='Cancelado');
  if(filhos.length<2){ showToast('É preciso ter pelo menos 2 execuções ativas para transferir saldo.'); return; }
  openModal('Transferir saldo entre execuções',`<form id="formTransferencia"><div class="form-grid">
    <div class="field"><label>Execução de origem *</label><select class="input" id="tr_origem" required>${filhos.map(f=>`<option value="${escapeHTML(f.id)}">${escapeHTML(f.nome)} (saldo: ${formatMoney(execucaoFinanceiro(f).saldo)})</option>`).join('')}</select></div>
    <div class="field"><label>Execução de destino *</label><select class="input" id="tr_destino" required>${filhos.map(f=>`<option value="${escapeHTML(f.id)}">${escapeHTML(f.nome)}</option>`).join('')}</select></div>
    <div class="field"><label>Valor a transferir (R$) *</label><input class="input" type="number" min="0.01" step="0.01" id="tr_valor" required></div>
    <div class="field full"><label>Motivo *</label><input class="input" id="tr_motivo" required placeholder="Ex.: Economia na aquisição dos materiais"></div>
  </div><p class="field-error" id="trErro" hidden></p><div class="modal-actions"><button type="button" class="btn btn-ghost" id="tr_cancel">Cancelar</button><button class="btn btn-primary">Transferir</button></div></form>`);
  document.getElementById('tr_cancel').onclick=closeModal;
  document.getElementById('formTransferencia').onsubmit=e=>{
    e.preventDefault();
    const origemId=document.getElementById('tr_origem').value;
    const destinoId=document.getElementById('tr_destino').value;
    const valor=Number(document.getElementById('tr_valor').value);
    const motivo=document.getElementById('tr_motivo').value.trim();
    const erro=document.getElementById('trErro');
    if(origemId===destinoId){erro.hidden=false;erro.textContent='Escolha execuções diferentes para origem e destino.';return;}
    if(!Number.isFinite(valor)||valor<=0){erro.hidden=false;erro.textContent='Informe um valor válido.';return;}
    if(!motivo){erro.hidden=false;erro.textContent='Informe o motivo da transferência.';return;}
    const origem=DB.getById('projetos',origemId), destino=DB.getById('projetos',destinoId);
    const saldoOrigem=execucaoFinanceiro(origem).saldo;
    if(valor>saldoOrigem+0.005){erro.hidden=false;erro.textContent=`O saldo de "${origem.nome}" é de ${formatMoney(saldoOrigem)}. Não é possível transferir mais do que isso.`;return;}
    DB.update('projetos',origemId,{valorOrcado:(Number(origem.valorOrcado)||0)-valor});
    DB.update('projetos',destinoId,{valorOrcado:(Number(destino.valorOrcado)||0)+valor});
    recursoRegistrarMovimentacao(recursoId,{tipo:'transferencia',valor,descricao:motivo,origemExecucaoId:origemId,destinoExecucaoId:destinoId});
    registrarHistorico({modulo:'projeto',acao:'transferência',descricao:`Transferência de ${formatMoney(valor)} de "${origem.nome}" para "${destino.nome}": ${motivo}`,refId:recursoId});
    showToast('✓ Saldo transferido.');
    closeModal();
    abrirDetalheRecurso(recursoId,'execucoes');
  };
}

/* Relatório do recurso em PDF — reaproveita o cabeçalho/rodapé
   institucional e o gerador de PDF já existentes (17-gerador-documentos.js),
   em vez de criar um sistema de documentos separado. */
async function gerarRelatorioRecurso(recursoId){
  const r=projectData(DB.getById('projetos',recursoId));
  const f=recursoResumoFinanceiro(r);
  const filhos=recursoExecucoes(r.id);
  showToast('⏳ Gerando relatório...');
  const cabecalho = typeof montarCabecalhoInstitucionalHTML==='function' ? await montarCabecalhoInstitucionalHTML() : '';
  const rodape = typeof montarRodapeInstitucionalHTML==='function' ? montarRodapeInstitucionalHTML() : '';
  const linhasExecucoes=filhos.map((fl,i)=>{
    const fin=execucaoFinanceiro(fl);
    return `<tr><td>${i+1}</td><td>${escapeHTML(fl.nome)}</td><td>${escapeHTML(fl.status||'—')}</td><td>${formatMoney(fin.planejado)}</td><td>${formatMoney(fin.executado)}</td><td>${formatMoney(fin.saldo)}</td></tr>`;
  }).join('');
  const html=`<div class="doc-a4-page">
    ${cabecalho}
    <h2 style="text-align:center;margin:18px 0 4px">Relatório do Recurso</h2>
    <h3 style="text-align:center;margin:0 0 20px">${escapeHTML(r.nome)}</h3>
    <table style="width:100%;border-collapse:collapse;margin-bottom:18px" border="1" cellpadding="6">
      <tr><td><b>Valor recebido</b></td><td>${formatMoney(f.recebido)}</td><td><b>Valor distribuído</b></td><td>${formatMoney(f.distribuido)}</td></tr>
      <tr><td><b>Valor executado</b></td><td>${formatMoney(f.executado)}</td><td><b>Saldo não distribuído</b></td><td>${formatMoney(f.naoDistribuido)}</td></tr>
      <tr><td><b>Saldo das execuções</b></td><td>${formatMoney(f.saldoExecucoes)}</td><td><b>Origem/tipo</b></td><td>${escapeHTML(r.fonteRecurso||'—')}</td></tr>
    </table>
    <h4>Execuções</h4>
    <table style="width:100%;border-collapse:collapse" border="1" cellpadding="6">
      <thead><tr><th>#</th><th>Nome</th><th>Status</th><th>Planejado</th><th>Executado</th><th>Saldo</th></tr></thead>
      <tbody>${linhasExecucoes || '<tr><td colspan="6">Nenhuma execução cadastrada.</td></tr>'}</tbody>
    </table>
    ${rodape}
  </div>`;
  if (typeof salvarPdfGerador==='function') salvarPdfGerador(html, `Relatorio_${r.nome}`);
  else showToast('⚠ Gerador de PDF não está disponível.');
}

const STATUS_RECURSO = ['Aguardando execução','Em execução','Parcialmente distribuído','Com pendências','Encerrado'];
const STATUS_EXECUCAO = ['Planejamento','Em execução','Concluído','Suspenso','Cancelado'];

/* Um único formulário para Recurso (Pai) e Execução (Filho) — os campos
   que mudam de nome/existem só num dos dois são condicionais, mas a
   validação, o salvamento e os vínculos continuam sendo os mesmos.
   opts.tipo/opts.paiId só valem ao CRIAR; ao editar, usa o que já está
   gravado no próprio item. */
function openFormProjeto(id, opts={}){
  const item = id ? projectData(DB.getById('projetos',id)) : null;
  const tipo = item?.tipo || opts.tipo || 'execucao';
  const paiId = item?.paiId || opts.paiId || null;
  const recurso_ = tipo==='recurso' ? item : null;
  const paiRegistro = tipo==='execucao' ? DB.getById('projetos', paiId) : null;
  const statusOpcoes = tipo==='recurso' ? STATUS_RECURSO : STATUS_EXECUCAO;
  const titulo = item ? (tipo==='recurso'?'Editar recurso':'Editar execução') : (tipo==='recurso'?'Novo recurso':'Nova execução');

  openModal(titulo,`<form id="formProjeto" novalidate>
    ${paiRegistro ? `<div class="notice-box">Execução do recurso <b>${escapeHTML(paiRegistro.nome)}</b></div>` : ''}
    <div class="form-grid">
      <div class="field full"><label>Nome ${tipo==='recurso'?'do recurso':'da execução'} *</label><input class="input" id="pr_nome" required placeholder="${tipo==='recurso'?'Ex.: Sicredi 2026':'Ex.: Reforma da sala de fisioterapia'}" value="${escapeHTML(item?.nome||'')}"></div>
      <div class="field"><label>${tipo==='recurso'?'Tipo/origem do recurso':'Observação da fonte'} *</label><input class="input" id="pr_fonte" required placeholder="Ex.: Convênio, emenda, recurso próprio" value="${escapeHTML(item?.fonteRecurso||(paiRegistro?.fonteRecurso||''))}"></div>
      ${tipo==='recurso'?`<div class="field"><label>Órgão/empresa/entidade que repassou</label><input class="input" id="pr_orgao" value="${escapeHTML(item?.orgaoRepassador||'')}"></div>`:''}
      <div class="field"><label>Convênio / termo / processo</label><input class="input" id="pr_convenio" value="${escapeHTML(item?.convenio||'')}"></div>
      ${tipo==='recurso'?`<div class="field"><label>Data do recebimento</label><input class="input" type="date" id="pr_recebimento" value="${item?.dataRecebimento||todayISO()}"></div>`:''}
      <div class="field"><label>Data de início *</label><input class="input" type="date" id="pr_inicio" required value="${item?.dataInicio||todayISO()}"></div>
      <div class="field"><label>Data de término *</label><input class="input" type="date" id="pr_fim" required value="${item?.dataFim||''}"></div>
      <div class="field"><label>${tipo==='recurso'?'Valor recebido (R$)':'Valor planejado (R$)'} *</label><input class="input" type="number" min="0" step="0.01" id="pr_valor" required value="${item?.valorOrcado??''}"></div>
      ${tipo==='recurso'?`<div class="field"><label>Conta bancária vinculada</label><input class="input" id="pr_conta" value="${escapeHTML(item?.contaBancaria||'')}"></div>`:''}
      <div class="field"><label>Responsável</label><input class="input" id="pr_responsavel" value="${escapeHTML(item?.responsavel||paiRegistro?.responsavel||'')}"></div>
      <div class="field"><label>Status</label><select class="input" id="pr_status">${statusOpcoes.map(st=>`<option ${item?.status===st?'selected':''}>${st}</option>`).join('')}</select></div>
      <div class="field full"><label>${tipo==='recurso'?'Finalidade':'Objetivo'}</label><textarea id="pr_objetivo">${escapeHTML(item?.objetivo||'')}</textarea></div>
      <div class="field full"><label>Observações</label><textarea id="pr_descricao">${escapeHTML(item?.descricao||'')}</textarea></div>
      ${tipo==='execucao'?`<div class="field full"><label>🔗 Vincular a outros registros</label><div class="relacionados-form-section">${item?renderSelectorRelacionados('projeto',item.id,'documento'):'<p class="empty-inline">Salve a execução primeiro para adicionar vínculos.</p>'}${item?renderSelectorRelacionados('projeto',item.id,'solicitacao'):''}</div><small class="muted">Você pode vincular esta execução a documentos e tarefas.</small></div>`:''}
    </div>
    <p class="field-error" id="formProjetoErro" hidden></p>
    <div class="modal-actions"><button type="button" class="btn btn-ghost" id="btnCancelarProjeto">Cancelar</button><button class="btn btn-primary">${item?'Salvar alterações':(tipo==='recurso'?'Cadastrar recurso':'Cadastrar execução')}</button></div>
  </form>`);

  document.getElementById('btnCancelarProjeto').onclick=closeModal;
  document.getElementById('formProjeto').onsubmit=e=>{
    e.preventDefault();
    const nome=document.getElementById('pr_nome').value.trim();
    const fonteRecurso=document.getElementById('pr_fonte').value.trim();
    const dataInicio=document.getElementById('pr_inicio').value;
    const dataFim=document.getElementById('pr_fim').value;
    const valorRaw=document.getElementById('pr_valor').value;
    const valorOrcado=Number(valorRaw);
    const erro=document.getElementById('formProjetoErro');
    if(!nome||!fonteRecurso||!dataInicio||!dataFim||valorRaw===''||!Number.isFinite(valorOrcado)||valorOrcado<0){
      erro.hidden=false;erro.textContent='Preencha os campos obrigatórios e informe um valor válido.';return;
    }
    if(parseISODate(dataInicio)>parseISODate(dataFim)){
      erro.hidden=false;erro.textContent='A data de término não pode ser anterior à de início.';return;
    }
    // Bloqueio de distribuição (item 10 do pedido): uma execução nunca
    // pode, sozinha ou junto das demais, superar o saldo não distribuído
    // do recurso pai.
    if(tipo==='execucao' && paiRegistro){
      const check=podeCriarExecucao(paiRegistro,valorOrcado,item?.id||null);
      if(!check.ok){
        erro.hidden=false;
        erro.textContent=`Valor da execução excede o saldo disponível para distribuição em ${formatMoney(check.excedente)}.`;
        return;
      }
    }
    const dados={
      nome,fonteRecurso,
      convenio:document.getElementById('pr_convenio').value.trim(),
      dataInicio,dataFim,valorOrcado,
      responsavel:document.getElementById('pr_responsavel').value.trim(),
      status:document.getElementById('pr_status').value,
      objetivo:document.getElementById('pr_objetivo').value.trim(),
      descricao:document.getElementById('pr_descricao').value.trim(),
      tipo, paiId: tipo==='execucao'?paiId:null
    };
    if(tipo==='recurso'){
      dados.orgaoRepassador=document.getElementById('pr_orgao').value.trim();
      dados.contaBancaria=document.getElementById('pr_conta').value.trim();
      dados.dataRecebimento=document.getElementById('pr_recebimento').value||todayISO();
    }
    let idSalvo=item?.id||null;
    if(item){
      const valorAntigo=Number(item.valorOrcado)||0;
      DB.update('projetos',item.id,dados);
      registrarHistorico({modulo:'projeto',acao:'edição',descricao:`${tipo==='recurso'?'Recurso':'Execução'} "${dados.nome}" editado(a).`,refId:item.id});
      // Ajuste de valor: nunca troca o número "por baixo" sem deixar rastro.
      if(valorOrcado!==valorAntigo){
        const delta=valorOrcado-valorAntigo;
        if(tipo==='recurso'){
          recursoRegistrarMovimentacao(item.id,{tipo:'ajuste',valor:delta,descricao:`Ajuste no valor recebido (de ${formatMoney(valorAntigo)} para ${formatMoney(valorOrcado)}).`});
        } else if(paiId){
          recursoRegistrarMovimentacao(paiId,{tipo:'ajuste',valor:delta,descricao:`Ajuste no valor planejado de "${dados.nome}" (de ${formatMoney(valorAntigo)} para ${formatMoney(valorOrcado)}).`,destinoExecucaoId:item.id});
        }
      }
      showToast('✓ Alterações salvas.');
    } else {
      const novo={id:DB.nextId('PRJ','projeto'),codigo:'PRJ-'+String(DB.getConfig().counters.projeto).padStart(4,'0'),...dados,criadoEm:Date.now(),atualizadoEm:Date.now(),cotacoes:[],ordensCompra:[],documentosProjeto:[],pendencias:[],docsApae:[],empresas:[],pagamentos:[],plano:{descricao:'',anexo:null},documentosRecurso:[],movimentacoes:[],arquivado:false};
      DB.insert('projetos',novo);
      idSalvo=novo.id;
      registrarHistorico({modulo:'projeto',acao:'criação',descricao:`${tipo==='recurso'?'Recurso':'Execução'} "${novo.nome}" ${tipo==='recurso'?'cadastrado':'criada'}.`,refId:novo.id});
      if(tipo==='recurso'){
        recursoRegistrarMovimentacao(novo.id,{tipo:'entrada',valor:novo.valorOrcado,descricao:'Recurso recebido'});
      } else if(paiId){
        recursoRegistrarMovimentacao(paiId,{tipo:'distribuicao',valor:novo.valorOrcado,descricao:`Valor destinado à execução "${novo.nome}"`,destinoExecucaoId:novo.id});
      }
      showToast(tipo==='recurso'?'✓ Recurso cadastrado.':'✓ Execução cadastrada.');
    }
    closeModal();
    if(tipo==='execucao' && paiId){ abrirDetalheRecurso(paiId,'execucoes'); }
    else if(tipo==='recurso'){ abrirDetalheRecurso(idSalvo); }
    else { renderCurrentView(); }
  };
  if(item && tipo==='execucao') processarRelacionadosEmForm('projeto',item.id,'formProjeto');
}
function openFormPlano(projectId){const p=projectData(DB.getById('projetos',projectId));openModal('Plano do projeto',`<form id="formPlano"><div class="field"><label>Como o recurso será utilizado? *</label><textarea id="pl_desc" required>${escapeHTML(p.plano?.descricao||'')}</textarea></div><div class="field"><label>Plano aprovado / documento</label><input class="input" type="file" id="pl_arq" accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx"></div><div class="modal-actions"><button type="button" class="btn btn-ghost" id="pl_cancel">Cancelar</button><button class="btn btn-primary">Salvar plano</button></div></form>`);document.getElementById('pl_cancel').onclick=closeModal;document.getElementById('formPlano').onsubmit=async e=>{e.preventDefault();const desc=document.getElementById('pl_desc').value.trim();if(!desc){showToast('Descreva o plano.');return;}const f=document.getElementById('pl_arq').files[0];p.plano={descricao:desc,anexo:f?await salvarAnexo(f,'plano'):p.plano?.anexo||null};projectSave(p);registrarHistorico({modulo:'projeto',acao:'plano',descricao:`Plano do projeto "${p.nome}" atualizado.`,refId:p.id});closeModal();renderWorkspaceProjeto(p,'plano');};}
function openFormItemProjeto(projectId){openModal('Novo item do projeto',`<form id="formItem"><div class="form-grid"><div class="field full"><label>Item *</label><input class="input" id="it_nome" required placeholder="Ex.: Computador"></div><div class="field"><label>Quantidade</label><input class="input" type="number" id="it_qtd" min="1" value="1"></div><div class="field"><label>Unidade</label><input class="input" id="it_un" value="un."></div><div class="field"><label>Valor previsto por unidade</label><input class="input" type="number" id="it_val" min="0" step="0.01" value="0"></div><div class="field full"><label>Observação</label><textarea id="it_obs"></textarea></div></div><div class="modal-actions"><button type="button" class="btn btn-ghost" id="it_cancel">Cancelar</button><button class="btn btn-primary">Salvar item</button></div></form>`);document.getElementById('it_cancel').onclick=closeModal;document.getElementById('formItem').onsubmit=e=>{e.preventDefault();const p=projectData(DB.getById('projetos',projectId));const item={id:uid('item'),nome:document.getElementById('it_nome').value.trim(),quantidade:Number(document.getElementById('it_qtd').value)||1,unidade:document.getElementById('it_un').value.trim()||'un.',valorPrevisto:Number(document.getElementById('it_val').value)||0,observacao:document.getElementById('it_obs').value.trim()};if(!item.nome){showToast('Informe o item.');return;}p.itensCompra.push(item);projectSave(p);closeModal();renderWorkspaceProjeto(p,'itens');};}
function openFormCotacao(projectId,empresaId=''){
  const p=projectData(DB.getById('projetos',projectId));
  const empresaInicial=p.empresas.find(e=>e.id===empresaId);
  if(!empresaInicial && empresaId) empresaId='';
  openModal('Nova cotação',`<form id="formCotacao"><div class="form-grid"><div class="field full"><label>Empresa *</label><select class="input" id="co_empresa" required><option value="">Selecione a empresa</option>${p.empresas.map(e=>`<option value="${escapeHTML(e.id)}" ${e.id===empresaId?"selected":""}>${escapeHTML(e.nome)}</option>`).join('')}</select></div><div class="field"><label>Data</label><input class="input" type="date" id="co_data" value="${todayISO()}"></div><div class="field full"><label>Itens cotados *</label><div id="co_itens" class="quote-items-editor"><div class="quote-item-row"><input class="input qi_nome" required placeholder="Descrição do item"><input class="input qi_qtd" type="number" min="1" value="1" placeholder="Qtd."><input class="input qi_val" type="number" min="0" step="0.01" required placeholder="Valor"><button type="button" class="btn btn-sm btn-danger qi-remover">×</button></div></div><button type="button" class="btn btn-ghost btn-sm" id="qi_add">＋ Adicionar item</button></div><div class="field"><label>Valor total da proposta (R$) *</label><input class="input" type="number" min="0" step="0.01" id="co_valor" required></div><div class="field"><label>Observação</label><input class="input" id="co_obs"></div><div class="field full"><label>Proposta / orçamento *</label><input class="input" type="file" id="co_arquivo" required accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx"></div></div><div class="notice-box">A cotação deve representar a proposta completa daquele fornecedor. Cadastre os itens dentro da própria cotação.</div><div class="modal-actions"><button type="button" class="btn btn-ghost" id="cancelCo">Cancelar</button><button class="btn btn-primary">Salvar cotação</button></div></form>`);
  const addRow=()=>{const box=document.getElementById('co_itens');const row=box.querySelector('.quote-item-row').cloneNode(true);row.querySelectorAll('input').forEach(x=>x.value=x.classList.contains('qi_qtd')?'1':'');box.appendChild(row);wireRows();};
  const wireRows=()=>document.querySelectorAll('.qi-remover').forEach(btn=>btn.onclick=()=>{const rows=document.querySelectorAll('.quote-item-row');if(rows.length>1)btn.closest('.quote-item-row').remove();});
  document.getElementById('qi_add').onclick=addRow;wireRows();document.getElementById('cancelCo').onclick=closeModal;
  document.getElementById('formCotacao').onsubmit=async e=>{e.preventDefault();const f=document.getElementById('co_arquivo').files[0];const itens=[...document.querySelectorAll('.quote-item-row')].map(r=>({nome:r.querySelector('.qi_nome').value.trim(),quantidade:Number(r.querySelector('.qi_qtd').value)||1,valor:Number(r.querySelector('.qi_val').value)||0})).filter(x=>x.nome);const empresa=p.empresas.find(e=>e.id===document.getElementById('co_empresa').value);const c={id:uid('cot'),itens,empresaId:empresa?.id||'',fornecedor:empresa?.nome||'',data:document.getElementById('co_data').value,valor:Number(document.getElementById('co_valor').value),observacao:document.getElementById('co_obs').value.trim(),selecionada:false};if(!c.fornecedor||!itens.length||!Number.isFinite(c.valor)||!f){showToast('Informe fornecedor, pelo menos um item, valor total e anexe o orçamento.');return;}c.anexo=await salvarAnexo(f,'cotacao');p.cotacoes.push(c);projectSave(p);registrarHistorico({modulo:'projeto',acao:'cotação',descricao:`Cotação de ${c.fornecedor} adicionada ao projeto "${p.nome}".`,refId:p.id});closeModal();renderWorkspaceProjeto(p,'cotacoes');};
}
function selecionarCotacaoProjeto(projectId,cotId){const p=projectData(DB.getById('projetos',projectId));const qtdEmpresas=new Set(p.cotacoes.map(x=>x.empresaId||String(x.fornecedor||'').trim().toLowerCase()).filter(Boolean)).size;if(qtdEmpresas<3){showToast('⚠ É preciso ter cotações de pelo menos 3 empresas antes de escolher a vencedora.');return;}const c=p.cotacoes.find(x=>x.id===cotId);if(!c)return;p.cotacoes.forEach(x=>x.selecionada=x.id===cotId);projectSave(p);showToast('✓ Cotação vencedora selecionada.');renderWorkspaceProjeto(p,'cotacoes');}
function openFormOrdem(projectId,empresaId=''){const p=projectData(DB.getById('projetos',projectId));if(!podeCriarOrdem(p)){showToast('⚠ '+motivoBloqueioOrdem(p));renderWorkspaceProjeto(p,'cotacoes');return;}const forn=projectFornecedorSelecionado(p);if(empresaId && forn?.empresaId!==empresaId){showToast('⚠ A ordem de compra só pode ser criada para a empresa cuja cotação foi escolhida como vencedora.');return;}openModal('Nova ordem de compra',`<form id="formOrdem"><div class="form-grid"><div class="field"><label>Número da ordem *</label><input class="input" id="oc_numero" required></div><div class="field"><label>Fornecedor *</label><input class="input" id="oc_fornecedor" required value="${escapeHTML(forn?.fornecedor||'')}"></div><div class="field full"><label>Itens da compra</label><div class="notice-box">${(forn?.itens||[]).map(i=>`${escapeHTML(i.nome)} — ${i.quantidade} × ${formatMoney(i.valor)}`).join('<br>')||'Itens conforme cotação vencedora'}</div></div><div class="field"><label>Data</label><input class="input" type="date" id="oc_data" value="${todayISO()}"></div><div class="field"><label>Valor total (R$) *</label><input class="input" type="number" min="0" step="0.01" id="oc_valor" required value="${forn?.valor||''}"></div><div class="field"><label>Status</label><select class="input" id="oc_status"><option>Rascunho</option><option>Emitida</option><option>Recebida</option><option>Cancelada</option></select></div><div class="field full"><label>Ordem de compra *</label><input class="input" type="file" id="oc_arquivo" required accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx"></div></div><div class="notice-box">! Recomenda-se emitir a ordem somente após conferir as cotações e a documentação do fornecedor.</div><div class="modal-actions"><button type="button" class="btn btn-ghost" id="cancelOc">Cancelar</button><button class="btn btn-primary">Salvar ordem</button></div></form>`);document.getElementById('cancelOc').onclick=closeModal;document.getElementById('formOrdem').onsubmit=async e=>{e.preventDefault();const f=document.getElementById('oc_arquivo').files[0];const o={id:uid('oc'),numero:document.getElementById('oc_numero').value.trim(),fornecedor:document.getElementById('oc_fornecedor').value.trim(),itens:forn?.itens||[],data:document.getElementById('oc_data').value,valor:Number(document.getElementById('oc_valor').value),status:document.getElementById('oc_status').value};if(!o.numero||!o.fornecedor||!Number.isFinite(o.valor)||!f){showToast('Preencha os campos e anexe a ordem.');return;}o.anexo=await salvarAnexo(f,'ordem');p.ordensCompra.push(o);projectSave(p);registrarHistorico({modulo:'projeto',acao:'ordem de compra',descricao:`Ordem ${o.numero} adicionada ao projeto "${p.nome}".`,refId:p.id});closeModal();renderWorkspaceProjeto(p,'ordens');};}
/* ===== CNPJá API Integration ===== */
function validateCNPJ(cnpj){
  const clean = (cnpj||'').replace(/\D/g,'');
  if (clean.length !== 14) return { valid: false, msg: 'CNPJ deve ter 14 dígitos' };
  const nums = clean.split('').map(Number);
  let sum = 0, mul = 5;
  for (let i = 0; i < 12; i++) {
    sum += nums[i] * mul;
    mul = (mul === 9) ? 2 : mul + 1;
  }
  let rem = sum % 11;
  let digit1 = (rem < 2) ? 0 : 11 - rem;
  if (digit1 !== nums[12]) return { valid: false, msg: 'CNPJ inválido (dígito verificador 1)' };
  sum = 0; mul = 6;
  for (let i = 0; i < 13; i++) {
    sum += nums[i] * mul;
    mul = (mul === 9) ? 2 : mul + 1;
  }
  rem = sum % 11;
  let digit2 = (rem < 2) ? 0 : 11 - rem;
  if (digit2 !== nums[13]) return { valid: false, msg: 'CNPJ inválido (dígito verificador 2)' };
  return { valid: true, clean };
}
function formatCNPJ(cnpj){
  const clean = (cnpj||'').replace(/\D/g,'');
  if (clean.length !== 14) return cnpj;
  return `${clean.slice(0,2)}.${clean.slice(2,5)}.${clean.slice(5,8)}/${clean.slice(8,12)}-${clean.slice(12)}`;
}
async function consultarCNPJa(cnpj){
  const validation = validateCNPJ(cnpj);
  if (!validation.valid) return { ok: false, error: validation.msg };
  const clean = validation.clean;
  try {
    const res = await fetch(`https://open.cnpja.com/office/${clean}`);
    if (res.status === 404) return { ok: false, error: 'CNPJ não encontrado na base de dados' };
    if (!res.ok) return { ok: false, error: `Erro ao consultar API (status ${res.status})` };
    const data = await res.json();
    return { ok: true, data };
  } catch(e) {
    return { ok: false, error: 'Erro de conexão. Verifique sua internet.' };
  }
}
function mapCNPJaDataToForm(data){
  const mapped = {};
  if (data.name) mapped.nome = data.name;
  if (data.alias) mapped.nome_fantasia = data.alias;
  if (data.address) {
    const addr = data.address;
    const endereco = [addr.street, addr.number, addr.city, addr.state, addr.zip]
      .filter(Boolean).join(', ');
    if (endereco) mapped.endereco = endereco;
  }
  if (data.phone) mapped.contato = data.phone;
  if (data.email) mapped.email = data.email;
  return mapped;
}

async function preencherFormularioDeCNPJ(cnpj, formId, btnId){
  if (!cnpj) { showToast('⚠ Informe um CNPJ'); return; }
  const btn = document.getElementById(btnId);
  if (!btn) return;
  const textOriginal = btn.textContent;
  btn.disabled = true;
  btn.textContent = '⏳ Consultando...';
  const result = await consultarCNPJa(cnpj);
  btn.disabled = false;
  btn.textContent = textOriginal;
  if (!result.ok) {
    showToast('⚠ ' + result.error);
    return;
  }
  const mapped = mapCNPJaDataToForm(result.data);
  if (!mapped.nome && !mapped.endereco && !mapped.contato) {
    showToast('⚠ Nenhum dado encontrado para este CNPJ');
    return;
  }
  let msgPreencher = 'Dados encontrados:\n';
  if (mapped.nome) msgPreencher += `• Razão Social: ${mapped.nome}\n`;
  if (mapped.nome_fantasia) msgPreencher += `• Nome Fantasia: ${mapped.nome_fantasia}\n`;
  if (mapped.endereco) msgPreencher += `• Endereço: ${mapped.endereco}\n`;
  if (mapped.contato) msgPreencher += `• Contato: ${mapped.contato}\n`;
  msgPreencher += `\nDeseja preencher estes dados no formulário?`;
  if (confirm(msgPreencher)) {
    if (mapped.nome) {
      const nomeEl = document.getElementById('emp_nome');
      if (nomeEl && !nomeEl.value.trim()) nomeEl.value = mapped.nome;
    }
    if (mapped.endereco) {
      const endEl = document.getElementById('emp_endereco');
      if (endEl && !endEl.value.trim()) endEl.value = mapped.endereco;
    }
    if (mapped.contato) {
      const contEl = document.getElementById('emp_contato');
      if (contEl && !contEl.value.trim()) contEl.value = mapped.contato;
    }
    if (mapped.nome_fantasia) {
      const fantEl = document.getElementById('emp_fantasia');
      if (fantEl && !fantEl.value.trim()) fantEl.value = mapped.nome_fantasia;
    }
    if (mapped.email) {
      const emailEl = document.getElementById('emp_email');
      if (emailEl && !emailEl.value.trim()) emailEl.value = mapped.email;
    }
    showToast('✓ Dados preenchidos com sucesso');
  }
}

function openFormEmpresa(projectId){
  const p=projectData(DB.getById('projetos',projectId));
  openModal('Nova empresa',`<form id="formEmpresa"><div class="form-grid"><div class="field full"><label>Nome da empresa (Razão Social) *</label><input class="input" id="emp_nome" required placeholder="Ex.: Empresa XYZ Ltda."></div><div class="field"><label>Nome Fantasia</label><input class="input" id="emp_fantasia"></div><div class="field"><label>CNPJ</label><input class="input" id="emp_cnpj" placeholder="00.000.000/0001-00"></div><div class="field"><label>Contato</label><input class="input" id="emp_contato" placeholder="Telefone ou e-mail"></div><div class="field"><label>E-mail</label><input class="input" id="emp_email" type="email"></div><div class="field full"><label>Endereço</label><input class="input" id="emp_endereco"></div><div class="field"><label>Município</label><input class="input" id="emp_municipio"></div><div class="field"><label>UF</label><input class="input" id="emp_uf" maxlength="2" style="text-transform:uppercase"></div><div class="field full"><label>Observação</label><textarea id="emp_obs"></textarea></div></div><p class="muted" style="margin-top:4px">Esta empresa fica disponível para vincular a outros projetos, sem precisar recadastrar.</p><div class="modal-actions"><button type="button" class="btn btn-ghost" id="emp_cancel">Cancelar</button><button class="btn btn-primary">Cadastrar empresa</button></div></form>`);
  document.getElementById('emp_cancel').onclick=closeModal;

  // Adiciona botão de consulta CNPJ após o campo
  setTimeout(()=>{
    const cnpjField = document.getElementById('emp_cnpj');
    if(cnpjField && !document.getElementById('btnConsultarCNPJ')){
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.id = 'btnConsultarCNPJ';
      btn.className = 'btn btn-sm';
      btn.textContent = '🔍 Consultar CNPJ';
      btn.style.marginTop = '6px';
      cnpjField.parentNode.appendChild(btn);
      btn.onclick = e => {
        e.preventDefault();
        const cnpj = document.getElementById('emp_cnpj').value.trim();
        if(cnpj) preencherFormularioDeCNPJ(cnpj, 'formEmpresa', 'btnConsultarCNPJ');
      };
    }
  }, 0);

  const cnpjEl = document.getElementById('emp_cnpj');
  cnpjEl.addEventListener('input', e => {
    const val = e.target.value.replace(/\D/g, '');
    if (val.length <= 14) {
      e.target.value = formatCNPJ(val);
    }
  });
  document.getElementById('formEmpresa').onsubmit=e=>{
    e.preventDefault();
    const nome=document.getElementById('emp_nome').value.trim();
    if(!nome){showToast('Informe o nome da empresa.');return;}
    const exists=p.empresas.some(x=>String(x.nome).trim().toLowerCase()===nome.toLowerCase());
    if(exists){showToast('Essa empresa já está cadastrada neste projeto.');return;}
    const dados={
      nome, nomeFantasia:document.getElementById('emp_fantasia').value.trim(),
      cnpj:document.getElementById('emp_cnpj').value.trim(), contato:document.getElementById('emp_contato').value.trim(),
      email:document.getElementById('emp_email').value.trim(), endereco:document.getElementById('emp_endereco').value.trim(),
      municipio:document.getElementById('emp_municipio').value.trim(), uf:document.getElementById('emp_uf').value.trim().toUpperCase(),
      observacao:document.getElementById('emp_obs').value.trim()
    };
    const empresaGlobalId=localizarOuCriarEmpresaGlobal(dados);
    p.empresas.push({id:uid('emp'),empresaGlobalId,...dados,documentos:[],criadoEm:Date.now()});
    projectSave(p);
    registrarHistorico({modulo:'empresa',acao:'vínculo',descricao:`Empresa "${nome}" vinculada ao projeto "${p.nome}".`,refId:empresaGlobalId});
    closeModal();renderWorkspaceProjeto(p,'empresas');
  };
}

/* Reaproveita uma empresa já cadastrada (neste ou em outro projeto) em
   vez de criar um novo registro — evita duplicar a mesma empresa. */
function abrirVincularEmpresaExistente(projectId){
  const p=projectData(DB.getById('projetos',projectId));
  const jaVinculadas=new Set(p.empresas.map(e=>e.empresaGlobalId));
  const disponiveis=DB.getAll('gerador-empresas').filter(g=>!jaVinculadas.has(g.id)).sort((a,b)=>String(a.razaoSocial).localeCompare(String(b.razaoSocial),'pt-BR'));
  if(!disponiveis.length){showToast('Não há outras empresas cadastradas para vincular. Cadastre uma nova.');return;}
  openModal('Vincular empresa existente',`
    <p class="muted" style="margin-bottom:10px">Escolha uma empresa já cadastrada no sistema. Os dados cadastrais continuam únicos e compartilhados entre os projetos.</p>
    <div class="form-group"><input type="text" id="vincEmpBusca" class="input" placeholder="🔎 Buscar por nome ou CNPJ..."></div>
    <div id="vincEmpLista" class="activity-list" style="max-height:40vh;overflow-y:auto"></div>
    <div class="modal-actions" style="margin-top:16px"><button type="button" class="btn btn-ghost" id="vincEmpCancel">Cancelar</button></div>
  `);
  document.getElementById('vincEmpCancel').onclick=closeModal;
  const desenhar=(termo='')=>{
    const t=termo.trim().toLowerCase();
    const filtradas=t?disponiveis.filter(g=>`${g.razaoSocial} ${g.cnpj}`.toLowerCase().includes(t)):disponiveis;
    document.getElementById('vincEmpLista').innerHTML=filtradas.length?filtradas.map(g=>`
      <div class="activity-item" data-vinc-empresa="${g.id}" style="cursor:pointer">
        <strong>${escapeHTML(g.razaoSocial)}</strong>
        <small>${[g.cnpj,g.contato].filter(Boolean).map(escapeHTML).join(' · ')||'Sem dados adicionais'}</small>
      </div>`).join(''):'<p class="muted">Nenhuma empresa encontrada.</p>';
    document.querySelectorAll('[data-vinc-empresa]').forEach(el=>{
      el.addEventListener('click',()=>{
        const g=disponiveis.find(x=>x.id===el.dataset.vincEmpresa);
        if(!g)return;
        p.empresas.push({id:uid('emp'),empresaGlobalId:g.id,nome:g.razaoSocial,cnpj:g.cnpj||'',contato:g.contato||g.telefone||'',email:g.email||'',endereco:g.endereco||'',nomeFantasia:g.nomeFantasia||'',municipio:g.municipio||'',uf:g.uf||'',observacao:'',documentos:[],criadoEm:Date.now()});
        projectSave(p);
        registrarHistorico({modulo:'empresa',acao:'vínculo',descricao:`Empresa "${g.razaoSocial}" vinculada ao projeto "${p.nome}".`,refId:g.id});
        closeModal();renderWorkspaceProjeto(p,'empresas');
      });
    });
  };
  desenhar();
  document.getElementById('vincEmpBusca').addEventListener('input',e=>desenhar(e.target.value));
}
/* Edita os dados cadastrais na entidade global. Como a mesma empresa
   pode estar vinculada a vários projetos, a alteração é propagada para
   a cópia local (cache de exibição) de cada projeto vinculado, para que
   o nome/CNPJ apareçam corretos em todos eles sem duplicar o cadastro. */
function propagarEdicaoEmpresaGlobal(globalId,dados){
  DB.getAll('projetos').forEach(proj=>{
    let mudou=false;
    (proj.empresas||[]).forEach(e=>{
      if(e.empresaGlobalId!==globalId)return;
      Object.assign(e,{nome:dados.nome,cnpj:dados.cnpj,contato:dados.contato,email:dados.email,endereco:dados.endereco,nomeFantasia:dados.nomeFantasia,municipio:dados.municipio,uf:dados.uf,observacao:dados.observacao});
      mudou=true;
      (proj.cotacoes||[]).filter(c=>c.empresaId===e.id).forEach(c=>c.fornecedor=e.nome);
      (proj.ordensCompra||[]).filter(o=>o.empresaId===e.id).forEach(o=>o.fornecedor=e.nome);
    });
    if(mudou) DB.update('projetos',proj.id,{empresas:proj.empresas,cotacoes:proj.cotacoes,ordensCompra:proj.ordensCompra});
  });
}
function openFormEmpresaEditar(projectId,empresaId){
  const p=projectData(DB.getById('projetos',projectId)); const e=p.empresas.find(x=>x.id===empresaId); if(!e)return;
  const g=getEmpresaGlobal(e.empresaGlobalId)||e;
  openModal('Editar empresa',`<form id="formEmpresaEdit"><div class="form-grid"><div class="field full"><label>Nome da empresa (Razão Social) *</label><input class="input" id="emp_nome" required value="${escapeHTML(g.razaoSocial||e.nome||'')}"></div><div class="field"><label>Nome Fantasia</label><input class="input" id="emp_fantasia" value="${escapeHTML(g.nomeFantasia||'')}"></div><div class="field"><label>CNPJ</label><input class="input" id="emp_cnpj" value="${escapeHTML(g.cnpj||e.cnpj||'')}"></div><div class="field"><label>Contato</label><input class="input" id="emp_contato" value="${escapeHTML(g.contato||e.contato||'')}"></div><div class="field"><label>E-mail</label><input class="input" id="emp_email" type="email" value="${escapeHTML(g.email||'')}"></div><div class="field full"><label>Endereço</label><input class="input" id="emp_endereco" value="${escapeHTML(g.endereco||'')}"></div><div class="field"><label>Município</label><input class="input" id="emp_municipio" value="${escapeHTML(g.municipio||'')}"></div><div class="field"><label>UF</label><input class="input" id="emp_uf" maxlength="2" style="text-transform:uppercase" value="${escapeHTML(g.uf||'')}"></div><div class="field full"><label>Observação</label><textarea id="emp_obs">${escapeHTML(g.observacao||e.observacao||'')}</textarea></div></div><p class="muted" style="margin-top:4px">Esta empresa pode estar vinculada a outros projetos — a alteração vale para todos eles.</p><div class="modal-actions"><button type="button" class="btn btn-ghost" id="emp_edit_cancel">Cancelar</button><button class="btn btn-primary">Salvar alterações</button></div></form>`);
  document.getElementById('emp_edit_cancel').onclick=closeModal;

  // Adiciona botão de consulta CNPJ após o campo
  setTimeout(()=>{
    const cnpjField = document.getElementById('emp_cnpj');
    if(cnpjField && !document.getElementById('btnConsultarCNPJEdit')){
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.id = 'btnConsultarCNPJEdit';
      btn.className = 'btn btn-sm';
      btn.textContent = '🔍 Consultar CNPJ';
      btn.style.marginTop = '6px';
      cnpjField.parentNode.appendChild(btn);
      btn.onclick = evt => {
        evt.preventDefault();
        const cnpj = document.getElementById('emp_cnpj').value.trim();
        if(cnpj) preencherFormularioDeCNPJ(cnpj, 'formEmpresaEdit', 'btnConsultarCNPJEdit');
      };
    }
  }, 0);

  const cnpjEl = document.getElementById('emp_cnpj');
  cnpjEl.addEventListener('input', ev => {
    const val = ev.target.value.replace(/\D/g, '');
    if (val.length <= 14) {
      ev.target.value = formatCNPJ(val);
    }
  });
  document.getElementById('formEmpresaEdit').onsubmit=eve=>{
    eve.preventDefault();
    const nome=document.getElementById('emp_nome').value.trim();
    if(!nome){showToast('Informe o nome da empresa.');return;}
    const dados={
      nome, nomeFantasia:document.getElementById('emp_fantasia').value.trim(),
      cnpj:document.getElementById('emp_cnpj').value.trim(), contato:document.getElementById('emp_contato').value.trim(),
      email:document.getElementById('emp_email').value.trim(), endereco:document.getElementById('emp_endereco').value.trim(),
      municipio:document.getElementById('emp_municipio').value.trim(), uf:document.getElementById('emp_uf').value.trim().toUpperCase(),
      observacao:document.getElementById('emp_obs').value.trim()
    };
    if(e.empresaGlobalId){
      DB.update('gerador-empresas',e.empresaGlobalId,{razaoSocial:nome,nomeFantasia:dados.nomeFantasia,cnpj:dados.cnpj,contato:dados.contato,email:dados.email,endereco:dados.endereco,municipio:dados.municipio,uf:dados.uf,observacao:dados.observacao});
      propagarEdicaoEmpresaGlobal(e.empresaGlobalId,dados);
      registrarHistorico({modulo:'empresa',acao:'edição',descricao:`Dados da empresa "${nome}" atualizados.`,refId:e.empresaGlobalId});
    } else {
      Object.assign(e,dados);
      p.cotacoes.filter(c=>c.empresaId===e.id).forEach(c=>c.fornecedor=e.nome);
      p.ordensCompra.filter(o=>o.empresaId===e.id).forEach(o=>o.fornecedor=e.nome);
      projectSave(p);
    }
    closeModal();renderWorkspaceProjeto(projectData(DB.getById('projetos',projectId)),'empresas');
  };
}
function openFormDocChecklist(projectId){const p=projectData(DB.getById('projetos',projectId));const arr=p.docsApae;const obrig=['CNPJ','Estatuto','Ata de eleição/posse','Certidão federal','Certidão estadual','Certidão municipal','FGTS','CNDT'];openModal('Adicionar documento da APAE',`<form id="formCheckDoc"><div class="field"><label>Documento *</label><select class="input" id="cd_nome">${obrig.map(x=>`<option>${x}</option>`).join('')}<option>Outro</option></select></div><div class="field"><label>Arquivo *</label><input class="input" type="file" id="cd_arq" required accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx"></div><div class="field"><label>Observação</label><textarea id="cd_obs"></textarea></div><div class="modal-actions"><button type="button" class="btn btn-ghost" id="cd_cancel">Cancelar</button><button class="btn btn-primary">Salvar documento</button></div></form>`);document.getElementById('cd_cancel').onclick=closeModal;document.getElementById('formCheckDoc').onsubmit=async e=>{e.preventDefault();const f=document.getElementById('cd_arq').files[0];if(!f)return;const d={id:uid('chk'),nome:document.getElementById('cd_nome').value,observacao:document.getElementById('cd_obs').value.trim(),entregue:true,anexo:await salvarAnexo(f,'doc-apae')};arr.push(d);projectSave(p);closeModal();renderWorkspaceProjeto(p,'docs-apae');};}
function toggleDocProjeto(projectId,itemId){const p=projectData(DB.getById('projetos',projectId));const d=p.docsApae.find(x=>x.id===itemId);if(!d)return;d.entregue=!d.entregue;projectSave(p);renderWorkspaceProjeto(p,'docs-apae');}
function openFormDocumentoProjeto(projectId){openModal('Anexar documento de execução',`<form id="formDocProjeto"><div class="form-grid"><div class="field full"><label>Nome do documento *</label><input class="input" id="dp_nome" required></div><div class="field"><label>Categoria</label><select class="input" id="dp_cat"><option>Nota fiscal</option><option>Comprovante</option><option>Relatório</option><option>Declaração</option><option>Outro</option></select></div><div class="field"><label>Data</label><input class="input" type="date" id="dp_data" value="${todayISO()}"></div><div class="field full"><label>Arquivo *</label><input class="input" type="file" id="dp_arquivo" required accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx"></div></div><div class="modal-actions"><button type="button" class="btn btn-ghost" id="cancelDp">Cancelar</button><button class="btn btn-primary">Anexar</button></div></form>`);document.getElementById('cancelDp').onclick=closeModal;document.getElementById('formDocProjeto').onsubmit=async e=>{e.preventDefault();const f=document.getElementById('dp_arquivo').files[0];const d={id:uid('docp'),nome:document.getElementById('dp_nome').value.trim(),categoria:document.getElementById('dp_cat').value,data:document.getElementById('dp_data').value,anexo:await salvarAnexo(f,'documento')};if(!d.nome||!f)return;const projetoAtual=projectData(DB.getById('projetos',projectId));projetoAtual.documentosProjeto.push(d);projectSave(projetoAtual);closeModal();renderWorkspaceProjeto(projetoAtual,'documentos');};}
function openFormPagamento(projectId){openModal('Registrar pagamento',`<form id="formPag"><div class="form-grid"><div class="field"><label>Fornecedor</label><input class="input" id="pg_fornecedor"></div><div class="field"><label>Data</label><input class="input" type="date" id="pg_data" value="${todayISO()}"></div><div class="field"><label>Valor pago (R$) *</label><input class="input" type="number" min="0" step="0.01" id="pg_valor" required></div><div class="field"><label>Forma de pagamento</label><input class="input" id="pg_forma" placeholder="Transferência, Pix, boleto..."></div><div class="field full"><label>Comprovante *</label><input class="input" type="file" id="pg_arq" required accept=".pdf,.jpg,.jpeg,.png,.webp"></div></div><div class="modal-actions"><button type="button" class="btn btn-ghost" id="pg_cancel">Cancelar</button><button class="btn btn-primary">Salvar pagamento</button></div></form>`);document.getElementById('pg_cancel').onclick=closeModal;document.getElementById('formPag').onsubmit=async e=>{e.preventDefault();const f=document.getElementById('pg_arq').files[0],v=Number(document.getElementById('pg_valor').value);if(!f||!Number.isFinite(v)){showToast('Informe valor e comprovante.');return;}const p=projectData(DB.getById('projetos',projectId));p.pagamentos.push({id:uid('pag'),fornecedor:document.getElementById('pg_fornecedor').value.trim(),data:document.getElementById('pg_data').value,valor:v,forma:document.getElementById('pg_forma').value.trim(),anexo:await salvarAnexo(f,'pagamento')});projectSave(p);closeModal();renderWorkspaceProjeto(p,'pagamentos');};}
function excluirItemProjeto(projectId,tipo,itemId){const p=projectData(DB.getById('projetos',projectId));const mapa={cotacao:'cotacoes',ordem:'ordensCompra',documento:'documentosProjeto'};const chave=mapa[tipo];if(!chave)return;const item=p[chave].find(x=>x.id===itemId);if(!item)return;confirmAction('Excluir este item do projeto?',async()=>{if(item.anexo)await ProjectFiles.remove(item.anexo.id);p[chave]=p[chave].filter(x=>x.id!==itemId);projectSave(p);renderWorkspaceProjeto(p,tipo==='cotacao'?'cotacoes':tipo==='ordem'?'ordens':'documentos');});}

function openFormPendencia(projectId){
  openModal('Nova pendência',`<form id="formPendencia"><div class="form-grid">
    <div class="field full"><label for="pe_titulo">O que precisa ser resolvido? *</label><input class="input" id="pe_titulo" required></div>
    <div class="field"><label for="pe_prioridade">Prioridade</label><select class="input" id="pe_prioridade">${['Baixa','Normal','Alta','Urgente'].map(x=>`<option ${x==='Normal'?'selected':''}>${x}</option>`).join('')}</select></div>
    <div class="field full"><label for="pe_descricao">Detalhes (opcional)</label><textarea id="pe_descricao"></textarea></div>
  </div><p class="field-error" id="formPendenciaErro" hidden></p><div class="modal-actions"><button type="button" class="btn btn-ghost" id="pe_cancel">Cancelar</button><button class="btn btn-primary">Salvar pendência</button></div></form>`);
  document.getElementById('pe_cancel').onclick=closeModal;
  document.getElementById('formPendencia').onsubmit=e=>{
    e.preventDefault();
    const titulo=document.getElementById('pe_titulo').value.trim();
    if(!titulo){const erro=document.getElementById('formPendenciaErro');erro.hidden=false;erro.textContent='Descreva a pendência.';return;}
    const p=projectData(DB.getById('projetos',projectId));
    p.pendencias.push({id:uid('pnd'),titulo,prioridade:document.getElementById('pe_prioridade').value,descricao:document.getElementById('pe_descricao').value.trim(),status:'Pendente',criadoEm:Date.now()});
    projectSave(p);
    registrarHistorico({modulo:'projeto',acao:'pendência',descricao:`Pendência "${titulo}" adicionada ao projeto "${p.nome}".`,refId:p.id});
    showToast('✓ Pendência registrada.');
    closeModal();
    renderWorkspaceProjeto(p,'pendencias');
  };
}
function togglePendenciaProjeto(projectId,itemId){
  const p=projectData(DB.getById('projetos',projectId));
  const item=p.pendencias.find(x=>x.id===itemId);
  if(!item)return;
  item.status = item.status==='Concluída' ? 'Pendente' : 'Concluída';
  projectSave(p);
  registrarHistorico({modulo:'projeto',acao:'pendência',descricao:`Pendência "${item.titulo}" marcada como ${item.status.toLowerCase()}.`,refId:p.id});
  renderWorkspaceProjeto(p,'pendencias');
}
function excluirPendenciaProjeto(projectId,itemId){
  const p=projectData(DB.getById('projetos',projectId));
  const item=p.pendencias.find(x=>x.id===itemId);
  if(!item)return;
  confirmAction('Excluir esta pendência?',()=>{
    p.pendencias=p.pendencias.filter(x=>x.id!==itemId);
    projectSave(p);
    registrarHistorico({modulo:'projeto',acao:'pendência',descricao:`Pendência "${item.titulo}" excluída.`,refId:p.id});
    showToast('Pendência excluída.');
    renderWorkspaceProjeto(p,'pendencias');
  });
}


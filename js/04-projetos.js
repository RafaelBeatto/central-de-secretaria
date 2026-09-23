/* ---------------------------------------------------------
   12. PROJETOS
   --------------------------------------------------------- */
function projetoStatusTom(status){
  return ({'Em execução':'primary','Parcialmente distribuído':'primary','Concluído':'ok','Encerrado':'ok','Suspenso':'warn','Com pendências':'warn','Cancelado':'danger'})[status] || 'neutral';
}

function formatMoney(value){
  const n = Number(value);
  if (!Number.isFinite(n)) return 'R$ 0,00';
  return n.toLocaleString('pt-BR', { style:'currency', currency:'BRL' });
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
const DOCS_APAE_OBRIGATORIOS=['CNPJ','Estatuto','Ata de eleição/posse','Certidão federal','Certidão estadual','Certidão municipal','FGTS','CNDT'];
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
  const apaeOk=DOCS_APAE_OBRIGATORIOS.every(nome=>p.docsApae.some(x=>x.nome===nome && x.entregue));
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

const MOVIMENTACAO_LABEL = {
  entrada:'🟢 Entrada do recurso', distribuicao:'🔵 Distribuição para execução',
  execucao:'🟠 Execução/gasto', pagamento:'🟠 Pagamento',
  transferencia:'🔁 Transferência entre execuções', ajuste:'✎ Ajuste'
};

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
    abrirDetalheProjeto(r.id,'documentos');
  };
}
function excluirDocumentoRecurso(recursoId, docId){
  const r=projectData(DB.getById('projetos',recursoId));
  const doc=r.documentosRecurso.find(d=>d.id===docId); if(!doc)return;
  confirmAction('Excluir este documento do recurso?', async ()=>{
    if(doc.anexo) await ProjectFiles.remove(doc.anexo.id);
    r.documentosRecurso=r.documentosRecurso.filter(d=>d.id!==docId);
    projectSave(r);
    abrirDetalheProjeto(r.id,'documentos');
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
    abrirDetalheProjeto(recursoId,'execucoes');
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
  // Ao editar, mantém o tipo gravado — um projeto antigo (tipo null) continua
  // antigo; só a classificação explícita muda isso.
  const tipo = item ? item.tipo : (opts.tipo || 'execucao');
  const paiId = item?.paiId || opts.paiId || null;
  const recurso_ = tipo==='recurso' ? item : null;
  const paiRegistro = tipo==='execucao' ? DB.getById('projetos', paiId) : null;
  const statusOpcoes = tipo==='recurso' ? STATUS_RECURSO : STATUS_EXECUCAO;
  const titulo = item ? (tipo==='recurso'?'Editar recurso':tipo==='execucao'?'Editar execução':'Editar projeto') : (tipo==='recurso'?'Novo recurso':'Nova execução');

  openModal(titulo,`<form id="formProjeto" novalidate>
    ${paiRegistro ? `<div class="notice-box">Execução do recurso <b>${escapeHTML(paiRegistro.nome)}</b></div>` : ''}
    <div class="form-grid">
      <div class="field full"><label>Nome ${tipo==='recurso'?'do recurso':'da execução'} *</label><input class="input" id="pr_nome" required placeholder="${tipo==='recurso'?'Ex.: Sicredi 2026':'Ex.: Reforma da sala de fisioterapia'}" value="${escapeHTML(item?.nome||'')}"></div>
      <div class="field"><label>${tipo==='recurso'?'Tipo/origem do recurso':'Fonte do recurso'} *</label><input class="input" id="pr_fonte" required placeholder="Ex.: Convênio, emenda, recurso próprio" value="${escapeHTML(item?.fonteRecurso||(paiRegistro?.fonteRecurso||''))}"></div>
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
      ${tipo!=='recurso'?`<div class="field full"><label>🔗 Vincular a outros registros</label><div class="relacionados-form-section">${item?renderSelectorRelacionados('projeto',item.id,'documento'):'<p class="empty-inline">Salve a execução primeiro para adicionar vínculos.</p>'}${item?renderSelectorRelacionados('projeto',item.id,'solicitacao'):''}</div><small class="muted">Você pode vincular esta execução a documentos e tarefas.</small></div>`:''}
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
    if(tipo===null) delete dados.tipo;
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
    abrirDetalheProjeto(idSalvo);
  };
  if(item && tipo!=='recurso') processarRelacionadosEmForm('projeto',item.id,'formProjeto');
}
function openFormPlano(projectId){const p=projectData(DB.getById('projetos',projectId));openModal('Plano do projeto',`<form id="formPlano"><div class="field"><label>Como o recurso será utilizado? *</label><textarea id="pl_desc" required>${escapeHTML(p.plano?.descricao||'')}</textarea></div><div class="field"><label>Plano aprovado / documento</label><input class="input" type="file" id="pl_arq" accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx"></div><div class="modal-actions"><button type="button" class="btn btn-ghost" id="pl_cancel">Cancelar</button><button class="btn btn-primary">Salvar plano</button></div></form>`);document.getElementById('pl_cancel').onclick=closeModal;document.getElementById('formPlano').onsubmit=async e=>{e.preventDefault();const desc=document.getElementById('pl_desc').value.trim();if(!desc){showToast('Descreva o plano.');return;}const f=document.getElementById('pl_arq').files[0];p.plano={descricao:desc,anexo:f?await salvarAnexo(f,'plano'):p.plano?.anexo||null};projectSave(p);registrarHistorico({modulo:'projeto',acao:'plano',descricao:`Plano do projeto "${p.nome}" atualizado.`,refId:p.id});closeModal();abrirDetalheProjeto(p.id,'plano');};}
function openFormCotacao(projectId,empresaId=''){
  const p=projectData(DB.getById('projetos',projectId));
  const empresaInicial=p.empresas.find(e=>e.id===empresaId);
  if(!empresaInicial && empresaId) empresaId='';
  openModal('Nova cotação',`<form id="formCotacao"><div class="form-grid"><div class="field full"><label>Empresa *</label><select class="input" id="co_empresa" required><option value="">Selecione a empresa</option>${p.empresas.map(e=>`<option value="${escapeHTML(e.id)}" ${e.id===empresaId?"selected":""}>${escapeHTML(e.nome)}</option>`).join('')}</select></div><div class="field"><label>Data</label><input class="input" type="date" id="co_data" value="${todayISO()}"></div><div class="field full"><label>Itens cotados *</label><div id="co_itens" class="quote-items-editor"><div class="quote-item-row"><input class="input qi_nome" required placeholder="Descrição do item"><input class="input qi_qtd" type="number" min="1" value="1" placeholder="Qtd."><input class="input qi_val" type="number" min="0" step="0.01" required placeholder="Valor"><button type="button" class="btn btn-sm btn-danger qi-remover">×</button></div></div><button type="button" class="btn btn-ghost btn-sm" id="qi_add">＋ Adicionar item</button></div><div class="field"><label>Valor total da proposta (R$) *</label><input class="input" type="number" min="0" step="0.01" id="co_valor" required></div><div class="field"><label>Observação</label><input class="input" id="co_obs"></div><div class="field full"><label>Proposta / orçamento *</label><input class="input" type="file" id="co_arquivo" required accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx"></div></div><div class="notice-box">A cotação deve representar a proposta completa daquele fornecedor. Cadastre os itens dentro da própria cotação.</div><div class="modal-actions"><button type="button" class="btn btn-ghost" id="cancelCo">Cancelar</button><button class="btn btn-primary">Salvar cotação</button></div></form>`);
  const addRow=()=>{const box=document.getElementById('co_itens');const row=box.querySelector('.quote-item-row').cloneNode(true);row.querySelectorAll('input').forEach(x=>x.value=x.classList.contains('qi_qtd')?'1':'');box.appendChild(row);wireRows();};
  const wireRows=()=>document.querySelectorAll('.qi-remover').forEach(btn=>btn.onclick=()=>{const rows=document.querySelectorAll('.quote-item-row');if(rows.length>1)btn.closest('.quote-item-row').remove();});
  document.getElementById('qi_add').onclick=addRow;wireRows();document.getElementById('cancelCo').onclick=closeModal;
  document.getElementById('formCotacao').onsubmit=async e=>{e.preventDefault();const f=document.getElementById('co_arquivo').files[0];const itens=[...document.querySelectorAll('.quote-item-row')].map(r=>({nome:r.querySelector('.qi_nome').value.trim(),quantidade:Number(r.querySelector('.qi_qtd').value)||1,valor:Number(r.querySelector('.qi_val').value)||0})).filter(x=>x.nome);const empresa=p.empresas.find(e=>e.id===document.getElementById('co_empresa').value);const c={id:uid('cot'),itens,empresaId:empresa?.id||'',fornecedor:empresa?.nome||'',data:document.getElementById('co_data').value,valor:Number(document.getElementById('co_valor').value),observacao:document.getElementById('co_obs').value.trim(),selecionada:false};if(!c.fornecedor||!itens.length||!Number.isFinite(c.valor)||!f){showToast('Informe fornecedor, pelo menos um item, valor total e anexe o orçamento.');return;}c.anexo=await salvarAnexo(f,'cotacao');p.cotacoes.push(c);projectSave(p);registrarHistorico({modulo:'projeto',acao:'cotação',descricao:`Cotação de ${c.fornecedor} adicionada ao projeto "${p.nome}".`,refId:p.id});closeModal();abrirDetalheProjeto(p.id,'cotacoes');};
}
function selecionarCotacaoProjeto(projectId,cotId){const p=projectData(DB.getById('projetos',projectId));const qtdEmpresas=new Set(p.cotacoes.map(x=>x.empresaId||String(x.fornecedor||'').trim().toLowerCase()).filter(Boolean)).size;if(qtdEmpresas<3){showToast('⚠ É preciso ter cotações de pelo menos 3 empresas antes de escolher a vencedora.');return;}const c=p.cotacoes.find(x=>x.id===cotId);if(!c)return;p.cotacoes.forEach(x=>x.selecionada=x.id===cotId);projectSave(p);showToast('✓ Cotação vencedora selecionada.');abrirDetalheProjeto(p.id,'cotacoes');}
function openFormOrdem(projectId,empresaId=''){const p=projectData(DB.getById('projetos',projectId));if(!podeCriarOrdem(p)){showToast('⚠ '+motivoBloqueioOrdem(p));abrirDetalheProjeto(p.id,'cotacoes');return;}const forn=projectFornecedorSelecionado(p);if(empresaId && forn?.empresaId!==empresaId){showToast('⚠ A ordem de compra só pode ser criada para a empresa cuja cotação foi escolhida como vencedora.');return;}openModal('Nova ordem de compra',`<form id="formOrdem"><div class="form-grid"><div class="field"><label>Número da ordem *</label><input class="input" id="oc_numero" required></div><div class="field"><label>Fornecedor *</label><input class="input" id="oc_fornecedor" required value="${escapeHTML(forn?.fornecedor||'')}"></div><div class="field full"><label>Itens da compra</label><div class="notice-box">${(forn?.itens||[]).map(i=>`${escapeHTML(i.nome)} — ${i.quantidade} × ${formatMoney(i.valor)}`).join('<br>')||'Itens conforme cotação vencedora'}</div></div><div class="field"><label>Data</label><input class="input" type="date" id="oc_data" value="${todayISO()}"></div><div class="field"><label>Valor total (R$) *</label><input class="input" type="number" min="0" step="0.01" id="oc_valor" required value="${forn?.valor||''}"></div><div class="field"><label>Status</label><select class="input" id="oc_status"><option>Rascunho</option><option>Emitida</option><option>Recebida</option><option>Cancelada</option></select></div><div class="field full"><label>Ordem de compra *</label><input class="input" type="file" id="oc_arquivo" required accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx"></div></div><div class="notice-box">! Recomenda-se emitir a ordem somente após conferir as cotações e a documentação do fornecedor.</div><div class="modal-actions"><button type="button" class="btn btn-ghost" id="cancelOc">Cancelar</button><button class="btn btn-primary">Salvar ordem</button></div></form>`);document.getElementById('cancelOc').onclick=closeModal;document.getElementById('formOrdem').onsubmit=async e=>{e.preventDefault();const f=document.getElementById('oc_arquivo').files[0];const o={id:uid('oc'),numero:document.getElementById('oc_numero').value.trim(),fornecedor:document.getElementById('oc_fornecedor').value.trim(),itens:forn?.itens||[],data:document.getElementById('oc_data').value,valor:Number(document.getElementById('oc_valor').value),status:document.getElementById('oc_status').value};if(!o.numero||!o.fornecedor||!Number.isFinite(o.valor)||!f){showToast('Preencha os campos e anexe a ordem.');return;}o.anexo=await salvarAnexo(f,'ordem');p.ordensCompra.push(o);projectSave(p);registrarHistorico({modulo:'projeto',acao:'ordem de compra',descricao:`Ordem ${o.numero} adicionada ao projeto "${p.nome}".`,refId:p.id});closeModal();abrirDetalheProjeto(p.id,'ordens');};}
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
    closeModal();abrirDetalheProjeto(p.id,'empresas');
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
        closeModal();abrirDetalheProjeto(p.id,'empresas');
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
    closeModal();abrirDetalheProjeto(projectId,'empresas');
  };
}
/* Tira a empresa só desta execução; o cadastro global continua disponível
   para os outros projetos. Cotações e ordens precisam ser excluídas antes,
   para nada sumir sem o usuário ver. */
function removerEmpresaProjeto(projectId,empresaId){
  const p=projectData(DB.getById('projetos',projectId));
  const e=p.empresas.find(x=>x.id===empresaId); if(!e)return;
  const cot=p.cotacoes.filter(c=>c.empresaId===e.id).length, ord=p.ordensCompra.filter(o=>o.empresaId===e.id).length;
  if(cot||ord){ showToast(`⚠ "${e.nome}" tem ${cot} cotação(ões) e ${ord} ordem(ns) nesta execução. Exclua-as primeiro (botão ✕) e depois remova a empresa.`); return; }
  confirmAction(`Remover "${e.nome}" desta execução? O cadastro da empresa continua no sistema para outros projetos.`,()=>{
    p.empresas=p.empresas.filter(x=>x.id!==e.id);
    projectSave(p);
    registrarHistorico({modulo:'empresa',acao:'desvínculo',descricao:`Empresa "${e.nome}" removida do projeto "${p.nome}".`,refId:e.empresaGlobalId||p.id});
    showToast('Empresa removida desta execução.');
    abrirDetalheProjeto(p.id,'empresas');
  });
}
function openFormDocChecklist(projectId){const p=projectData(DB.getById('projetos',projectId));const arr=p.docsApae;const obrig=DOCS_APAE_OBRIGATORIOS;openModal('Adicionar documento da APAE',`<form id="formCheckDoc"><div class="field"><label>Documento *</label><select class="input" id="cd_nome">${obrig.map(x=>`<option>${x}</option>`).join('')}<option>Outro</option></select></div><div class="field"><label>Arquivo *</label><input class="input" type="file" id="cd_arq" required accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx"></div><div class="field"><label>Observação</label><textarea id="cd_obs"></textarea></div><div class="modal-actions"><button type="button" class="btn btn-ghost" id="cd_cancel">Cancelar</button><button class="btn btn-primary">Salvar documento</button></div></form>`);document.getElementById('cd_cancel').onclick=closeModal;document.getElementById('formCheckDoc').onsubmit=async e=>{e.preventDefault();const f=document.getElementById('cd_arq').files[0];if(!f)return;const d={id:uid('chk'),nome:document.getElementById('cd_nome').value,observacao:document.getElementById('cd_obs').value.trim(),entregue:true,anexo:await salvarAnexo(f,'doc-apae')};arr.push(d);projectSave(p);closeModal();abrirDetalheProjeto(p.id,'docs-apae');};}
function toggleDocProjeto(projectId,itemId){const p=projectData(DB.getById('projetos',projectId));const d=p.docsApae.find(x=>x.id===itemId);if(!d)return;d.entregue=!d.entregue;projectSave(p);abrirDetalheProjeto(p.id,'docs-apae');}
function openFormDocumentoProjeto(projectId){openModal('Anexar documento de execução',`<form id="formDocProjeto"><div class="form-grid"><div class="field full"><label>Nome do documento *</label><input class="input" id="dp_nome" required></div><div class="field"><label>Categoria</label><select class="input" id="dp_cat"><option>Nota fiscal</option><option>Comprovante</option><option>Relatório</option><option>Declaração</option><option>Outro</option></select></div><div class="field"><label>Data</label><input class="input" type="date" id="dp_data" value="${todayISO()}"></div><div class="field full"><label>Arquivo *</label><input class="input" type="file" id="dp_arquivo" required accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx"></div></div><div class="modal-actions"><button type="button" class="btn btn-ghost" id="cancelDp">Cancelar</button><button class="btn btn-primary">Anexar</button></div></form>`);document.getElementById('cancelDp').onclick=closeModal;document.getElementById('formDocProjeto').onsubmit=async e=>{e.preventDefault();const f=document.getElementById('dp_arquivo').files[0];const d={id:uid('docp'),nome:document.getElementById('dp_nome').value.trim(),categoria:document.getElementById('dp_cat').value,data:document.getElementById('dp_data').value,anexo:await salvarAnexo(f,'documento')};if(!d.nome||!f)return;const projetoAtual=projectData(DB.getById('projetos',projectId));projetoAtual.documentosProjeto.push(d);projectSave(projetoAtual);closeModal();abrirDetalheProjeto(projetoAtual.id,'documentos');};}
function openFormPagamento(projectId){openModal('Registrar pagamento',`<form id="formPag"><div class="form-grid"><div class="field"><label>Fornecedor</label><input class="input" id="pg_fornecedor"></div><div class="field"><label>Data</label><input class="input" type="date" id="pg_data" value="${todayISO()}"></div><div class="field"><label>Valor pago (R$) *</label><input class="input" type="number" min="0" step="0.01" id="pg_valor" required></div><div class="field"><label>Forma de pagamento</label><input class="input" id="pg_forma" placeholder="Transferência, Pix, boleto..."></div><div class="field full"><label>Comprovante *</label><input class="input" type="file" id="pg_arq" required accept=".pdf,.jpg,.jpeg,.png,.webp"></div></div><div class="modal-actions"><button type="button" class="btn btn-ghost" id="pg_cancel">Cancelar</button><button class="btn btn-primary">Salvar pagamento</button></div></form>`);document.getElementById('pg_cancel').onclick=closeModal;document.getElementById('formPag').onsubmit=async e=>{e.preventDefault();const f=document.getElementById('pg_arq').files[0],v=Number(document.getElementById('pg_valor').value);if(!f||!Number.isFinite(v)){showToast('Informe valor e comprovante.');return;}const p=projectData(DB.getById('projetos',projectId));p.pagamentos.push({id:uid('pag'),fornecedor:document.getElementById('pg_fornecedor').value.trim(),data:document.getElementById('pg_data').value,valor:v,forma:document.getElementById('pg_forma').value.trim(),anexo:await salvarAnexo(f,'pagamento')});projectSave(p);closeModal();abrirDetalheProjeto(p.id,'pagamentos');};}
function excluirItemProjeto(projectId,tipo,itemId){const p=projectData(DB.getById('projetos',projectId));const mapa={cotacao:'cotacoes',ordem:'ordensCompra',documento:'documentosProjeto'};const chave=mapa[tipo];if(!chave)return;const item=p[chave].find(x=>x.id===itemId);if(!item)return;confirmAction('Excluir este item do projeto?',async()=>{if(item.anexo)await ProjectFiles.remove(item.anexo.id);p[chave]=p[chave].filter(x=>x.id!==itemId);projectSave(p);abrirDetalheProjeto(p.id,tipo==='cotacao'?'cotacoes':tipo==='ordem'?'ordens':'documentos');});}

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
    abrirDetalheProjeto(p.id,'pendencias');
  };
}
function togglePendenciaProjeto(projectId,itemId){
  const p=projectData(DB.getById('projetos',projectId));
  const item=p.pendencias.find(x=>x.id===itemId);
  if(!item)return;
  item.status = item.status==='Concluída' ? 'Pendente' : 'Concluída';
  projectSave(p);
  registrarHistorico({modulo:'projeto',acao:'pendência',descricao:`Pendência "${item.titulo}" marcada como ${item.status.toLowerCase()}.`,refId:p.id});
  abrirDetalheProjeto(p.id,'pendencias');
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
    abrirDetalheProjeto(p.id,'pendencias');
  });
}


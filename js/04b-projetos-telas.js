/* =========================================================
   PROJETOS — telas
   Três níveis dentro da própria view (sem modais gigantes):
   Lista de recursos → Recurso → Execução, navegados por breadcrumb.
   Dados, regras financeiras e formulários continuam em 04-projetos.js;
   este arquivo só desenha e despacha cliques.
   ========================================================= */

let pjEstado = { nivel:'lista', id:null, secao:null, busca:'', status:'', arquivados:false };

const PJ_ALIAS_EXEC = { cotacoes:'empresas', ordens:'empresas', itens:'resumo', prestacao:'resumo', geral:'resumo' };
const PJ_ALIAS_REC = { geral:'execucoes', resumo:'execucoes', 'linha-tempo':'historico' };

const PJ_SECOES_EXEC = [
  { key:'resumo', label:'Resumo' },
  { key:'plano', label:'Plano de aplicação', etapa:true },
  { key:'empresas', label:'Empresas e compras', etapa:true },
  { key:'docs-apae', label:'Documentação da APAE', etapa:true },
  { key:'documentos', label:'Notas e documentos', etapa:true },
  { key:'pagamentos', label:'Pagamentos', etapa:true },
  { key:'pendencias', label:'Pendências' }
];
const PJ_SECOES_REC = [['execucoes','Execuções'],['documentos','Documentos'],['historico','Histórico']];

/* ---------- navegação ---------- */
function pjIr(nivel, id=null, secao=null){
  const anterior = pjEstado;
  pjEstado = { ...pjEstado, nivel, id, secao };
  if (!document.getElementById('modalBackdrop').hidden) closeModal();
  if (typeof currentView !== 'undefined' && currentView !== 'projetos') { goToView('projetos'); return; }
  renderProjetos();
  const root = document.getElementById('pjRoot');
  if (anterior.nivel !== nivel || anterior.id !== id) window.scrollTo({ top:0 });
  else if (anterior.secao !== secao && root && window.scrollY > root.offsetTop) root.scrollIntoView({ block:'start' });
}

function abrirDetalheProjeto(id, aba){
  const p = DB.getById('projetos', id); if (!p) return;
  pjIr(p.tipo === 'recurso' ? 'recurso' : 'execucao', id, aba || null);
}
function renderWorkspaceProjeto(p, aba){ abrirDetalheProjeto(p.id, aba); }

/* Clicar em "Projetos" no menu sempre volta para a lista. */
document.addEventListener('click', e => {
  if (e.target.closest?.('.nav-item[data-view="projetos"]')) pjEstado = { ...pjEstado, nivel:'lista', id:null, secao:null };
}, true);

function renderProjetos(){
  const root = document.getElementById('pjRoot'); if (!root) return;
  const reg = pjEstado.id ? DB.getById('projetos', pjEstado.id) : null;
  if (pjEstado.nivel !== 'lista' && !reg) pjEstado = { ...pjEstado, nivel:'lista', id:null, secao:null };
  if (pjEstado.nivel === 'lista') { root.innerHTML = pjListaHTML(); return; }
  if (reg.tipo === 'recurso') { pjEstado.nivel = 'recurso'; root.innerHTML = pjRecursoHTML(projectData(reg)); }
  else { pjEstado.nivel = 'execucao'; root.innerHTML = pjExecucaoHTML(projectData(reg)); }
}

/* ---------- pequenos blocos reaproveitados ---------- */
const pjEsc = s => escapeHTML(s ?? '');

function pjCrumbs(itens){
  return `<nav class="pj-crumbs" aria-label="Caminho">${itens.map((it,i) => i === itens.length-1
    ? `<span aria-current="page">${pjEsc(it.label)}</span>`
    : `<button type="button" data-pj="ir" data-nivel="${it.nivel}" data-id="${pjEsc(it.id||'')}">${pjEsc(it.label)}</button><span class="pj-crumb-sep" aria-hidden="true">›</span>`
  ).join('')}</nav>`;
}

function pjSecHead(titulo, texto, acoes=''){
  return `<div class="pj-sec-head"><div><h3>${titulo}</h3>${texto?`<p>${texto}</p>`:''}</div>${acoes?`<div class="pj-sec-actions">${acoes}</div>`:''}</div>`;
}

function pjAnexoBtn(anexo, rotulo='Abrir'){
  return anexo ? `<button type="button" class="btn btn-sm" data-file-download="${pjEsc(anexo.id)}">📎 ${rotulo}</button>` : '';
}

function pjVazio(texto){ return `<div class="pj-vazio">${texto}</div>`; }

/* Situação da execução: tudo derivado de projectChecklist/execucaoFinanceiro. */
function pjExecSituacao(p){
  const checklist = projectChecklist(p);
  const feitos = checklist.filter(x => x[1]).length;
  return { checklist, feitos, total: checklist.length, prox: projectProximaAcao(p), fin: execucaoFinanceiro(p) };
}

function pjEtapasMini(sit){
  const pct = Math.round(sit.feitos / sit.total * 100);
  return `<span class="pj-etapas" title="${sit.feitos} de ${sit.total} etapas registradas"><span class="pj-etapas-bar"><i style="width:${pct}%"></i></span>${sit.feitos}/${sit.total}</span>`;
}

/* Medidor do recurso: pago | distribuído a pagar | livre. Um só tom
   (escuro → claro), com os valores escritos na legenda. */
function pjMedidorRecurso(f){
  const base = Math.max(f.recebido, f.distribuido, 0.01);
  const pago = Math.max(0, f.executado);
  const aPagar = Math.max(0, f.distribuido - f.executado);
  const livre = Math.max(0, f.naoDistribuido);
  const seg = (cls, valor, titulo) => valor > 0 ? `<i class="${cls}" style="flex-basis:${(valor/base*100).toFixed(2)}%" title="${titulo}: ${formatMoney(valor)}"></i>` : '';
  return `<div class="pj-meter" role="img" aria-label="Pago ${formatMoney(pago)}; distribuído e ainda não pago ${formatMoney(aPagar)}; livre para distribuir ${formatMoney(livre)}">
      ${seg('m-pago', pago, 'Pago')}${seg('m-apagar', aPagar, 'Distribuído, ainda não pago')}${seg('m-livre', livre, 'Livre para distribuir')}
    </div>
    <div class="pj-meter-legend">
      <span><i class="m-pago"></i>Pago <b>${formatMoney(pago)}</b></span>
      <span><i class="m-apagar"></i>Distribuído a pagar <b>${formatMoney(aPagar)}</b></span>
      <span><i class="m-livre"></i>Livre para distribuir <b>${formatMoney(livre)}</b></span>
    </div>
    ${f.naoDistribuido < -0.005 ? `<p class="pj-alerta">⚠ Distribuído acima do valor recebido em ${formatMoney(-f.naoDistribuido)}.</p>` : ''}`;
}

/* =========================================================
   NÍVEL 1 — LISTA
   ========================================================= */
function pjRecursoPai(p){ return p.paiId ? DB.getById('projetos', p.paiId) : null; }

function pjListaHTML(){
  const todos = DB.getAll('projetos');
  if (!todos.length) return `<div id="pjListaCorpo">${pjListaCorpoHTML()}</div>`;
  const statuses = [...new Set(todos.map(x => x.status).filter(Boolean))].sort((a,b) => a.localeCompare(b,'pt-BR'));
  return `<div class="pj-filtros">
        <input type="search" class="input" id="pjBusca" placeholder="Buscar recurso, execução ou código…" value="${pjEsc(pjEstado.busca)}" aria-label="Buscar">
        <select class="input" id="pjStatus" aria-label="Filtrar por status"><option value="">Todos os status</option>${statuses.map(s => `<option ${s===pjEstado.status?'selected':''}>${pjEsc(s)}</option>`).join('')}</select>
        <label class="pj-check"><input type="checkbox" id="pjArquivados" ${pjEstado.arquivados?'checked':''}> Arquivados</label>
    </div>
    <div id="pjListaCorpo">${pjListaCorpoHTML()}</div>`;
}

function pjListaCorpoHTML(){
  const todos = DB.getAll('projetos');
  const q = pjEstado.busca.trim().toLowerCase();
  const st = pjEstado.status;
  const bate = (...c) => !q || c.join(' ').toLowerCase().includes(q);

  const recursos = todos.filter(p => p.tipo === 'recurso' && (pjEstado.arquivados || !p.arquivado));
  const idsRecurso = new Set(todos.filter(p => p.tipo === 'recurso').map(p => p.id));
  // Projetos antigos e execuções cujo recurso não existe mais: ficam juntos, para classificar.
  const avulsos = todos.filter(p => !p.tipo || (p.tipo === 'execucao' && !idsRecurso.has(p.paiId)))
    .filter(p => (!st || p.status === st) && bate(p.nome, p.codigo, p.fonteRecurso));

  const grupos = recursos.map(r => {
    const recursoBate = bate(r.nome, r.codigo, r.fonteRecurso, r.orgaoRepassador);
    let filhos = recursoExecucoes(r.id);
    if (st) filhos = filhos.filter(f => f.status === st);
    if (!recursoBate) filhos = filhos.filter(f => bate(f.nome, f.codigo));
    return { r, filhos, recursoBate };
  }).filter(g => (g.recursoBate && (!st || g.r.status === st)) || g.filhos.length);

  const ativos = recursos.filter(r => !r.arquivado).map(recursoResumoFinanceiro);
  const soma = k => ativos.reduce((s,f) => s + f[k], 0);
  const totais = recursos.length ? `<dl class="pj-totais">
      <div><dt>Recebido</dt><dd>${formatMoney(soma('recebido'))}</dd></div>
      <div><dt>Distribuído</dt><dd>${formatMoney(soma('distribuido'))}</dd></div>
      <div><dt>Pago</dt><dd>${formatMoney(soma('executado'))}</dd></div>
      <div><dt>Disponível</dt><dd>${formatMoney(soma('saldoTotalDisponivel'))}</dd></div>
    </dl>` : '';

  if (!todos.length) return `<div class="pj-inicio">
      <h3>Comece cadastrando um recurso</h3>
      <p>Um <b>recurso</b> é o dinheiro que entrou na APAE — convênio, emenda, doação. Dentro dele você cria as <b>execuções</b>: cada aplicação específica desse dinheiro, com cotações, compras, documentos e pagamentos.</p>
      <button type="button" class="btn btn-primary" data-pj="novo-recurso">＋ Cadastrar o primeiro recurso</button>
    </div>`;

  const cards = grupos.map(({r, filhos}) => {
    const f = recursoResumoFinanceiro(r);
    const qtd = recursoExecucoes(r.id).length;
    return `<article class="pj-rec ${r.arquivado?'is-arquivado':''}">
      <header class="pj-rec-head">
        <button type="button" class="pj-rec-titulo" data-pj="ir" data-nivel="recurso" data-id="${pjEsc(r.id)}">
          <span class="pj-code">${pjEsc(r.codigo)} · Recurso${r.arquivado?' · arquivado':''}</span>
          <span class="pj-rec-nome">${pjEsc(r.nome)}</span>
          <span class="pj-rec-meta">${[r.fonteRecurso, r.orgaoRepassador, `${qtd} execuç${qtd===1?'ão':'ões'}`].filter(Boolean).map(pjEsc).join(' · ')}</span>
        </button>
        <div class="pj-rec-valor"><span>Recebido</span><strong>${formatMoney(f.recebido)}</strong>${badgeHTML(projetoStatusTom(r.status), r.status || 'Sem status')}</div>
      </header>
      ${pjMedidorRecurso(f)}
      <div class="pj-exec-lista">
        ${filhos.map(pjExecLinhaHTML).join('') || `<p class="pj-exec-nenhuma">${qtd ? 'Nenhuma execução corresponde ao filtro.' : 'Nenhuma execução ainda.'}</p>`}
        ${r.arquivado ? '' : `<button type="button" class="pj-exec-add" data-pj="nova-execucao" data-id="${pjEsc(r.id)}">＋ Nova execução</button>`}
      </div>
    </article>`;
  }).join('');

  const avulsosHTML = avulsos.length ? `<section class="pj-avulsos">
      <h3>Registros sem recurso</h3>
      <p>Projetos de antes da divisão em recursos e execuções (ou execuções cujo recurso foi excluído). Continuam funcionando; classifique quando puder — nunca é feito automaticamente.</p>
      ${avulsos.map(p => `<div class="pj-avulso">
        <button type="button" class="pj-avulso-nome" data-pj="ir" data-nivel="execucao" data-id="${pjEsc(p.id)}"><strong>${pjEsc(p.nome)}</strong><small>${pjEsc(p.codigo||'')} · ${formatMoney(p.valorOrcado)} · ${pjEsc(p.status||'Sem status')}</small></button>
        <div class="pj-avulso-acoes">
          <button type="button" class="btn btn-sm" data-pj="classificar-recurso" data-id="${pjEsc(p.id)}">É um recurso</button>
          <button type="button" class="btn btn-sm" data-pj="classificar-execucao" data-id="${pjEsc(p.id)}">É execução de…</button>
        </div>
      </div>`).join('')}
    </section>` : '';

  const nada = !grupos.length && !avulsos.length ? pjVazio('Nada encontrado com esses filtros.') : '';
  return totais + cards + avulsosHTML + nada;
}

function pjExecLinhaHTML(f){
  const p = projectData({ ...f });
  const sit = pjExecSituacao(p);
  return `<button type="button" class="pj-exec-linha ${f.status==='Cancelado'?'is-cancelada':''}" data-pj="ir" data-nivel="execucao" data-id="${pjEsc(f.id)}">
    <span class="pj-exec-nome"><strong>${pjEsc(f.nome)}</strong><small>${sit.prox ? 'Próximo passo: ' + pjEsc(sit.prox.label) : '✓ Todas as etapas registradas'}</small></span>
    <span class="pj-exec-status">${badgeHTML(projetoStatusTom(f.status), f.status || 'Sem status')}</span>
    <span class="pj-num"><small>Planejado</small>${formatMoney(sit.fin.planejado)}</span>
    <span class="pj-num"><small>Pago</small>${formatMoney(sit.fin.executado)}</span>
    ${pjEtapasMini(sit)}
  </button>`;
}

/* =========================================================
   NÍVEL 2 — RECURSO
   ========================================================= */
function pjRecursoHTML(r){
  const secao = PJ_ALIAS_REC[pjEstado.secao] || pjEstado.secao;
  const ativa = PJ_SECOES_REC.some(s => s[0] === secao) ? secao : 'execucoes';
  const f = recursoResumoFinanceiro(r);
  const filhos = recursoExecucoes(r.id);
  const contagem = { execucoes: filhos.length, documentos: r.documentosRecurso.length };
  const conteudo = ativa === 'documentos' ? pjRecursoDocumentosHTML(r) : ativa === 'historico' ? pjRecursoHistoricoHTML(r) : pjRecursoExecucoesHTML(r, filhos);

  return `${pjCrumbs([{nivel:'lista', label:'Projetos'}, {label:r.nome}])}
    <header class="pj-head">
      <div class="pj-head-main">
        <span class="pj-code">${pjEsc(r.codigo)} · Recurso</span>
        <h2>${pjEsc(r.nome)}</h2>
        <p class="pj-meta">${[r.fonteRecurso, r.orgaoRepassador, r.convenio].filter(Boolean).map(pjEsc).join(' · ') || 'Origem não informada'}</p>
      </div>
      <div class="pj-head-side">${badgeHTML(projetoStatusTom(r.status), r.status || 'Sem status')}${r.arquivado ? badgeHTML('neutral','Arquivado') : ''}</div>
    </header>
    <div class="pj-acoes">
      ${r.arquivado ? '' : `<button type="button" class="btn btn-primary btn-sm" data-pj="nova-execucao" data-id="${pjEsc(r.id)}">＋ Nova execução</button>`}
      <button type="button" class="btn btn-sm" data-pj="editar" data-id="${pjEsc(r.id)}">Editar</button>
      <button type="button" class="btn btn-sm" data-pj="transferir" data-id="${pjEsc(r.id)}">Transferir saldo</button>
      <button type="button" class="btn btn-sm" data-pj="relatorio" data-id="${pjEsc(r.id)}">Relatório em PDF</button>
      <button type="button" class="btn btn-sm" data-pj="pasta-prestacao" data-id="${pjEsc(r.id)}" title="Todos os anexos organizados em pastas, num arquivo .zip">📦 Baixar pasta da prestação</button>
      <button type="button" class="btn btn-sm" data-pj="${r.arquivado?'desarquivar':'arquivar'}" data-id="${pjEsc(r.id)}">${r.arquivado ? 'Reabrir' : 'Arquivar'}</button>
      <button type="button" class="btn btn-sm pj-btn-perigo" data-pj="excluir-recurso" data-id="${pjEsc(r.id)}">Excluir</button>
    </div>

    <section class="pj-fin" aria-label="Situação financeira">
      <dl class="pj-fin-nums">
        <div><dt>Recebido</dt><dd>${formatMoney(f.recebido)}</dd></div>
        <div><dt>Distribuído</dt><dd>${formatMoney(f.distribuido)}<small>${f.percentualDistribuicao}% do recebido</small></dd></div>
        <div><dt>Pago</dt><dd>${formatMoney(f.executado)}<small>${f.percentualExecucao}% do distribuído</small></dd></div>
        <div class="is-destaque"><dt>Disponível</dt><dd>${formatMoney(f.saldoTotalDisponivel)}<small>livre + saldo das execuções</small></dd></div>
      </dl>
      ${pjMedidorRecurso(f)}
    </section>

    <div class="pj-rec-layout">
      <div class="pj-rec-main">
        <div class="pj-tabs" role="tablist">${PJ_SECOES_REC.map(([k,l]) => `<button type="button" role="tab" aria-selected="${ativa===k}" class="pj-tab ${ativa===k?'is-ativa':''}" data-pj="ir" data-nivel="recurso" data-id="${pjEsc(r.id)}" data-secao="${k}">${l}${contagem[k]!==undefined?`<span>${contagem[k]}</span>`:''}</button>`).join('')}</div>
        <div class="pj-tab-corpo">${conteudo}</div>
      </div>
      <aside class="pj-rec-aside">
        <h4>Dados do recurso</h4>
        <dl class="pj-dados">
          <div><dt>Recebido em</dt><dd>${r.dataRecebimento ? formatDateBR(r.dataRecebimento) : '—'}</dd></div>
          <div><dt>Período</dt><dd>${formatDateBR(r.dataInicio)} → ${formatDateBR(r.dataFim)}</dd></div>
          <div><dt>Convênio / termo</dt><dd>${pjEsc(r.convenio || '—')}</dd></div>
          <div><dt>Conta bancária</dt><dd>${pjEsc(r.contaBancaria || '—')}</dd></div>
          <div><dt>Responsável</dt><dd>${pjEsc(r.responsavel || '—')}</dd></div>
          <div><dt>Finalidade</dt><dd>${pjEsc(r.objetivo || '—')}</dd></div>
          ${r.descricao ? `<div><dt>Observações</dt><dd>${pjEsc(r.descricao)}</dd></div>` : ''}
        </dl>
      </aside>
    </div>`;
}

function pjRecursoExecucoesHTML(r, filhos){
  const livre = podeCriarExecucao(r, 0).disponivel;
  if (!filhos.length) return pjVazio(`Nenhuma execução ainda. ${formatMoney(livre)} livres para distribuir.${r.arquivado?'':`<br><button type="button" class="btn btn-primary btn-sm" data-pj="nova-execucao" data-id="${pjEsc(r.id)}">＋ Criar a primeira execução</button>`}`);
  return `<div class="pj-tabela" role="table">
      <div class="pj-tabela-head" role="row"><span>Execução</span><span>Status</span><span class="pj-num">Planejado</span><span class="pj-num">Pago</span><span class="pj-num">Saldo</span><span>Etapas</span></div>
      ${filhos.map(fl => {
        const sit = pjExecSituacao(projectData({ ...fl }));
        return `<button type="button" role="row" class="pj-tabela-linha ${fl.status==='Cancelado'?'is-cancelada':''}" data-pj="ir" data-nivel="execucao" data-id="${pjEsc(fl.id)}">
          <span class="pj-exec-nome"><strong>${pjEsc(fl.nome)}</strong><small>${sit.prox ? 'Próximo passo: ' + pjEsc(sit.prox.label) : '✓ Todas as etapas registradas'}</small></span>
          <span>${badgeHTML(projetoStatusTom(fl.status), fl.status || 'Sem status')}</span>
          <span class="pj-num">${formatMoney(sit.fin.planejado)}</span>
          <span class="pj-num">${formatMoney(sit.fin.executado)}</span>
          <span class="pj-num">${formatMoney(sit.fin.saldo)}</span>
          ${pjEtapasMini(sit)}
        </button>`;
      }).join('')}
    </div>
    <p class="pj-rodape-nota">Livre para novas execuções: <b>${formatMoney(livre)}</b></p>`;
}

function pjRecursoDocumentosHTML(r){
  const docs = r.documentosRecurso;
  return `${pjSecHead('Documentos do recurso', 'Termo, convênio, plano geral, comprovante de recebimento — o que vale para o recurso inteiro. Documentos de cada compra ficam dentro da execução.', `<button type="button" class="btn btn-primary btn-sm" data-pj="doc-recurso-novo" data-id="${pjEsc(r.id)}">＋ Adicionar</button>`)}
    ${docs.length ? `<ul class="pj-itens">${docs.map(d => `<li class="pj-item">
      <div><strong>${pjEsc(d.nome)}</strong><small>${d.data ? formatDateBR(d.data) : ''}${d.observacao ? ' · ' + pjEsc(d.observacao) : ''}</small></div>
      <div class="pj-item-acoes">${pjAnexoBtn(d.anexo)}<button type="button" class="btn btn-sm pj-btn-perigo" data-pj="doc-recurso-excluir" data-id="${pjEsc(r.id)}" data-item="${pjEsc(d.id)}" aria-label="Excluir ${pjEsc(d.nome)}">Excluir</button></div>
    </li>`).join('')}</ul>` : pjVazio('Nenhum documento do recurso ainda.')}`;
}

function pjRecursoHistoricoHTML(r){
  const movs = [...r.movimentacoes].sort((a,b) => b.criadoEm - a.criadoEm);
  const ids = new Set([r.id, ...recursoExecucoes(r.id).map(f => f.id)]);
  // Transferências já aparecem nas movimentações; não repete nas atividades.
  const atividades = DB.getAll('historico').filter(h => ids.has(h.refId) && h.acao !== 'transferência').sort((a,b) => b.timestamp - a.timestamp);
  return `${pjSecHead('Movimentações financeiras', 'Registro permanente: entradas, distribuições, transferências e ajustes nunca mudam “por baixo”.')}
    ${movs.length ? `<div class="pj-razao" role="table">${movs.map(m => `<div class="pj-razao-linha" role="row">
      <span class="pj-razao-data">${formatDateBR(m.data)}</span>
      <span><strong>${MOVIMENTACAO_LABEL[m.tipo] || pjEsc(m.tipo)}</strong>${m.descricao ? `<small>${pjEsc(m.descricao)}</small>` : ''}</span>
      <span class="pj-num ${m.valor < 0 ? 'is-negativo' : ''}">${formatMoney(m.valor)}</span>
    </div>`).join('')}</div>` : pjVazio('Nenhuma movimentação registrada.')}
    <h4 class="pj-subtitulo">Atividades do recurso e das execuções</h4>
    ${atividades.length ? `<ol class="pj-linha-tempo">${atividades.slice(0, 60).map(h => `<li><time>${timestampToBR(h.timestamp)}</time><span>${pjEsc(h.descricao)}</span></li>`).join('')}</ol>` : pjVazio('Nenhuma atividade registrada ainda.')}`;
}

/* =========================================================
   NÍVEL 3 — EXECUÇÃO (e projetos antigos sem recurso)
   A navegação lateral É o checklist: cada seção mostra se as
   etapas dela estão concluídas. Não existe outra lista de etapas.
   ========================================================= */
function pjExecucaoHTML(p){
  const secao = PJ_ALIAS_EXEC[pjEstado.secao] || pjEstado.secao;
  const ativa = PJ_SECOES_EXEC.some(s => s.key === secao) ? secao : 'resumo';
  const sit = pjExecSituacao(p);
  const pai = pjRecursoPai(p);
  const legado = !p.tipo || !pai;
  const renderSecao = { resumo:pjExecResumoHTML, plano:pjExecPlanoHTML, empresas:pjExecEmpresasHTML, 'docs-apae':pjExecDocsApaeHTML, documentos:pjExecDocumentosHTML, pagamentos:pjExecPagamentosHTML, pendencias:pjExecPendenciasHTML }[ativa];

  const crumbs = pai
    ? [{nivel:'lista', label:'Projetos'}, {nivel:'recurso', id:pai.id, label:pai.nome}, {label:p.nome}]
    : [{nivel:'lista', label:'Projetos'}, {label:p.nome}];

  return `${pjCrumbs(crumbs)}
    <header class="pj-head">
      <div class="pj-head-main">
        <span class="pj-code">${pjEsc(p.codigo)} · ${legado ? 'Sem recurso' : 'Execução'}</span>
        <h2>${pjEsc(p.nome)}</h2>
        <p class="pj-meta">${formatDateBR(p.dataInicio)} → ${formatDateBR(p.dataFim)}${p.responsavel ? ' · ' + pjEsc(p.responsavel) : ''}</p>
      </div>
      <div class="pj-head-side">${badgeHTML(projetoStatusTom(p.status), p.status || 'Sem status')}</div>
    </header>
    <div class="pj-acoes">
      <button type="button" class="btn btn-sm" data-pj="editar" data-id="${pjEsc(p.id)}">Editar</button>
      <button type="button" class="btn btn-sm" data-pj="pasta-prestacao" data-id="${pjEsc(p.id)}" title="Os anexos desta execução organizados em pastas, num arquivo .zip">📦 Baixar pasta</button>
      <button type="button" class="btn btn-sm pj-btn-perigo" data-pj="excluir-execucao" data-id="${pjEsc(p.id)}">Excluir</button>
    </div>
    ${legado ? `<div class="pj-aviso"><span>Este registro não pertence a nenhum recurso. Classifique-o para ele entrar na estrutura de recursos e execuções.</span><span class="pj-aviso-acoes"><button type="button" class="btn btn-sm" data-pj="classificar-recurso" data-id="${pjEsc(p.id)}">É um recurso</button><button type="button" class="btn btn-sm" data-pj="classificar-execucao" data-id="${pjEsc(p.id)}">É execução de…</button></span></div>` : ''}

    <div class="pj-exec-layout">
      <nav class="pj-secnav" aria-label="Seções da execução">${pjSecNavHTML(p, sit, ativa)}</nav>
      <section class="pj-secao">${renderSecao(p, sit)}</section>
    </div>`;
}

function pjSecNavHTML(p, sit, ativa){
  const porSecao = {};
  sit.checklist.forEach(([label, ok, tab]) => { const k = abaProjetoParaPendencia(tab); (porSecao[k] = porSecao[k] || []).push({ label, ok }); });
  const abertas = p.pendencias.filter(x => x.status !== 'Concluída').length;
  const etapasSecoes = PJ_SECOES_EXEC.filter(s => s.etapa);
  const item = s => {
    const etapas = porSecao[s.key] || [];
    const ok = etapas.length && etapas.every(e => e.ok);
    const marca = s.etapa ? `<span class="pj-nav-marca ${ok?'is-ok':''}" aria-label="${ok?'Concluída':'Pendente'}">${ok ? '✓' : etapasSecoes.indexOf(s) + 1}</span>` : '';
    const extra = s.key === 'pendencias' && abertas ? `<span class="pj-nav-cont">${abertas}</span>` : '';
    const sub = etapas.length > 1 ? `<ul class="pj-nav-sub">${etapas.map(e => `<li class="${e.ok?'is-ok':''}">${e.ok?'✓':'○'} ${pjEsc(e.label)}</li>`).join('')}</ul>` : '';
    return `<button type="button" class="pj-nav-item ${ativa===s.key?'is-ativa':''} ${s.etapa?'is-etapa':''}" data-pj="ir" data-nivel="execucao" data-id="${pjEsc(p.id)}" data-secao="${s.key}" ${ativa===s.key?'aria-current="page"':''}>${marca}<span class="pj-nav-label">${s.label}${sub}</span>${extra}</button>`;
  };
  return `${item(PJ_SECOES_EXEC[0])}
    <div class="pj-nav-grupo"><span>Processo</span><b>${sit.feitos}/${sit.total}</b></div>
    ${PJ_SECOES_EXEC.filter(s => s.etapa).map(item).join('')}
    <div class="pj-nav-sep"></div>
    ${item(PJ_SECOES_EXEC[PJ_SECOES_EXEC.length-1])}`;
}

function pjExecResumoHTML(p, sit){
  const comprometido = p.cotacoes.filter(c => c.selecionada).reduce((s,c) => s + (Number(c.valor)||0), 0);
  const pctPago = sit.fin.planejado > 0 ? Math.min(100, sit.fin.executado / sit.fin.planejado * 100) : 0;
  const passo = sit.prox
    ? `<div class="pj-passo"><div><span>Próximo passo</span><strong>${pjEsc(sit.prox.label)}</strong></div><button type="button" class="btn btn-primary btn-sm" data-pj="ir" data-nivel="execucao" data-id="${pjEsc(p.id)}" data-secao="${pjEsc(sit.prox.tab)}">Resolver agora →</button></div>`
    : `<div class="pj-passo is-ok"><div><span>Prestação de contas</span><strong>✓ Todas as ${sit.total} etapas estão registradas</strong><small>A conferência humana e as regras do financiador continuam sendo necessárias.</small></div></div>`;
  const relacionados = typeof renderRelacionados === 'function' ? renderRelacionados('projeto', p.id) : '';
  return `${passo}
    <section class="pj-fin pj-fin-exec" aria-label="Situação financeira">
      <dl class="pj-fin-nums">
        <div><dt>Planejado</dt><dd>${formatMoney(sit.fin.planejado)}</dd></div>
        <div><dt>Comprometido</dt><dd>${formatMoney(comprometido)}<small>cotação vencedora</small></dd></div>
        <div><dt>Pago</dt><dd>${formatMoney(sit.fin.executado)}<small>${sit.fin.pct}% do planejado</small></dd></div>
        <div class="is-destaque"><dt>Saldo</dt><dd class="${sit.fin.saldo < 0 ? 'is-negativo' : ''}">${formatMoney(sit.fin.saldo)}</dd></div>
      </dl>
      <div class="pj-meter" role="img" aria-label="${sit.fin.pct}% do planejado já foi pago"><i class="m-pago" style="flex-basis:${pctPago.toFixed(2)}%"></i><i class="m-livre"></i></div>
    </section>
    <h4 class="pj-subtitulo">Dados da execução</h4>
    <dl class="pj-dados pj-dados-grade">
      <div><dt>Fonte</dt><dd>${pjEsc(p.fonteRecurso || '—')}</dd></div>
      <div><dt>Convênio / instrumento</dt><dd>${pjEsc(p.convenio || '—')}</dd></div>
      <div><dt>Período</dt><dd>${formatDateBR(p.dataInicio)} → ${formatDateBR(p.dataFim)}</dd></div>
      <div><dt>Responsável</dt><dd>${pjEsc(p.responsavel || '—')}</dd></div>
      <div class="is-largo"><dt>Objetivo</dt><dd>${pjEsc(p.objetivo || '—')}</dd></div>
      ${p.descricao ? `<div class="is-largo"><dt>Observações</dt><dd>${pjEsc(p.descricao)}</dd></div>` : ''}
    </dl>
    ${relacionados}`;
}

function pjExecPlanoHTML(p){
  const tem = p.plano?.descricao || p.plano?.anexo;
  return `${pjSecHead('Plano de aplicação', 'O que será feito com o dinheiro. Antes de comprar, confira se o item está previsto aqui e se o valor é compatível.', `<button type="button" class="btn btn-primary btn-sm" data-pj="plano" data-id="${pjEsc(p.id)}">${tem ? 'Editar plano' : '＋ Registrar plano'}</button>`)}
    ${tem ? `${p.plano.descricao ? `<div class="pj-texto">${pjEsc(p.plano.descricao)}</div>` : ''}
      ${p.plano.anexo ? `<ul class="pj-itens"><li class="pj-item"><div><strong>${pjEsc(p.plano.anexo.nome)}</strong><small>Plano aprovado (arquivo)</small></div><div class="pj-item-acoes">${pjAnexoBtn(p.plano.anexo)}</div></li></ul>` : ''}`
      : pjVazio('O plano ainda não foi registrado.')}`;
}

function pjExecEmpresasHTML(p){
  const qtdComCotacao = new Set(p.cotacoes.map(c => c.empresaId || String(c.fornecedor||'').trim().toLowerCase()).filter(Boolean)).size;
  const faltam = Math.max(0, 3 - qtdComCotacao);
  const vencedora = p.cotacoes.find(c => c.selecionada);
  const liberaOrdem = podeCriarOrdem(p);
  const regra = faltam
    ? `Faltam cotações de <b>${faltam}</b> empresa(s) para poder escolher a vencedora.`
    : vencedora ? 'Cotações completas. A ordem de compra sai para a empresa vencedora.' : 'Cotações completas — escolha a vencedora.';
  const cards = p.empresas.map(e => {
    const cot = p.cotacoes.filter(c => c.empresaId === e.id);
    const ord = p.ordensCompra.filter(o => o.empresaId === e.id);
    const ehVencedora = cot.some(c => c.selecionada);
    const doc = statusDocumentacaoEmpresa(e.empresaGlobalId);
    const tomDoc = doc.emoji === '🟢' ? 'ok' : doc.emoji === '🔴' ? 'danger' : 'warn';
    return `<article class="pj-emp ${ehVencedora?'is-vencedora':''}">
      <header class="pj-emp-head">
        <div><h4>${pjEsc(e.nome)}</h4><small>${[e.cnpj || 'CNPJ não informado', e.contato].filter(Boolean).map(pjEsc).join(' · ')}</small></div>
        <div class="pj-emp-tags">${ehVencedora ? badgeHTML('ok','✓ Vencedora') : ''}
          <button type="button" class="pj-doc-status tom-${tomDoc}" data-project-action="ver-ficha-empresa" data-empresa-global="${pjEsc(e.empresaGlobalId||'')}" data-ficha-aba="documentos" title="Abrir documentos da empresa">${doc.emoji} ${pjEsc(doc.label)}</button>
        </div>
      </header>
      <div class="pj-emp-corpo">
        <div class="pj-emp-col">
          <h5>Cotações</h5>
          ${cot.length ? cot.map(c => `<div class="pj-mini ${c.selecionada?'is-vencedora':''}">
            <div><strong>${formatMoney(c.valor||0)}</strong><small>${c.data ? formatDateBR(c.data) : 'Sem data'}${(c.itens||[]).length ? ' · ' + (c.itens).map(i => pjEsc(i.nome)).join(', ') : ''}</small></div>
            <div class="pj-item-acoes">${pjAnexoBtn(c.anexo)}
              ${c.selecionada ? '' : `<button type="button" class="btn btn-sm" data-pj="selecionar-cotacao" data-id="${pjEsc(p.id)}" data-item="${pjEsc(c.id)}" ${faltam ? 'disabled title="Precisa de cotações de 3 empresas"' : ''}>Escolher</button>`}
              <button type="button" class="btn btn-sm pj-btn-perigo" data-pj="excluir-item" data-id="${pjEsc(p.id)}" data-tipo="cotacao" data-item="${pjEsc(c.id)}" aria-label="Excluir cotação">✕</button>
            </div>
          </div>`).join('') : '<p class="pj-mini-vazio">Nenhuma cotação.</p>'}
        </div>
        <div class="pj-emp-col">
          <h5>Ordens de compra</h5>
          ${ord.length ? ord.map(o => `<div class="pj-mini">
            <div><strong>${pjEsc(o.numero || 'Sem número')}</strong><small>${formatMoney(o.valor||0)} · ${pjEsc(o.status||'')}</small></div>
            <div class="pj-item-acoes">${pjAnexoBtn(o.anexo)}<button type="button" class="btn btn-sm pj-btn-perigo" data-pj="excluir-item" data-id="${pjEsc(p.id)}" data-tipo="ordem" data-item="${pjEsc(o.id)}" aria-label="Excluir ordem">✕</button></div>
          </div>`).join('') : `<p class="pj-mini-vazio">${ehVencedora ? 'Nenhuma ordem emitida ainda.' : 'Só a empresa vencedora recebe ordem.'}</p>`}
        </div>
      </div>
      <footer class="pj-emp-pe">
        <button type="button" class="btn btn-sm btn-primary" data-pj="nova-cotacao" data-id="${pjEsc(p.id)}" data-empresa="${pjEsc(e.id)}">＋ Cotação</button>
        ${ehVencedora ? `<button type="button" class="btn btn-sm" data-pj="nova-ordem" data-id="${pjEsc(p.id)}" data-empresa="${pjEsc(e.id)}" ${liberaOrdem ? '' : 'disabled'}>＋ Ordem de compra</button>` : ''}
        <span class="pj-flex"></span>
        <button type="button" class="btn btn-sm btn-ghost" data-project-action="ver-ficha-empresa" data-empresa-global="${pjEsc(e.empresaGlobalId||'')}">Ficha da empresa</button>
        <button type="button" class="btn btn-sm btn-ghost" data-pj="editar-empresa" data-id="${pjEsc(p.id)}" data-empresa="${pjEsc(e.id)}">Editar</button>
        <button type="button" class="btn btn-sm pj-btn-perigo" data-pj="remover-empresa" data-id="${pjEsc(p.id)}" data-empresa="${pjEsc(e.id)}">Remover</button>
      </footer>
    </article>`;
  }).join('');
  return `${pjSecHead('Empresas e compras', regra, `<button type="button" class="btn btn-sm" data-pj="vincular-empresa" data-id="${pjEsc(p.id)}">Vincular existente</button><button type="button" class="btn btn-primary btn-sm" data-pj="nova-empresa" data-id="${pjEsc(p.id)}">＋ Nova empresa</button>`)}
    ${cards || pjVazio('Nenhuma empresa ainda. Cadastre ou vincule pelo menos 3 fornecedores para cotar.')}`;
}

function pjExecDocsApaeHTML(p){
  const itens=situacaoDocsApae();
  const emDia=itens.filter(i=>i.ok).length;
  const antigos=p.docsApae.filter(d=>d.anexo);
  return `${pjSecHead('Documentação da APAE', `${emDia} de ${itens.length} em dia. Estes documentos são da APAE e ficam em Documentos: cadastrou ou renovou lá, vale para todas as execuções.`, `<button type="button" class="btn btn-sm" data-pj="ir-documentos">Abrir Documentos →</button>`)}
    <div class="pj-docs-grade">${itens.map(({exig,doc,sit,ok})=>`<div class="pj-doc ${ok?'is-ok':doc?'is-vencido':''}">
        <span class="pj-doc-marca" aria-hidden="true">${ok?'✓':doc?'!':'○'}</span>
        ${doc
          ? `<button type="button" class="pj-doc-info" data-pj="apae-ver" data-doc="${pjEsc(doc.id)}" title="Abrir em Documentos"><strong>${exig}</strong><small>${dcPrazoTexto(doc)}${doc.anexo?'':' · sem arquivo'}</small></button>`
          : `<div class="pj-doc-info"><strong>${exig}</strong><small>Não cadastrado em Documentos</small></div>`}
        <div class="pj-item-acoes">${doc
          ? `${pjAnexoBtn(doc.anexo)}${['vencido','vencendo'].includes(sit.chave)?`<button type="button" class="btn btn-sm ${sit.chave==='vencido'?'btn-primary':''}" data-pj="apae-renovar" data-doc="${pjEsc(doc.id)}">Renovar</button>`:''}`
          : `<button type="button" class="btn btn-sm btn-primary" data-pj="apae-cadastrar" data-exig="${pjEsc(exig)}">Cadastrar</button>`}</div>
      </div>`).join('')}</div>
    ${antigos.length?`<h4 class="pj-subtitulo">Anexados nesta execução antes da mudança</h4><ul class="pj-itens">${antigos.map(d=>`<li class="pj-item"><div><strong>${pjEsc(d.nome)}</strong><small>${d.observacao?pjEsc(d.observacao):'Arquivo guardado nesta execução'}</small></div><div class="pj-item-acoes">${pjAnexoBtn(d.anexo)}</div></li>`).join('')}</ul>`:''}`;
}

function pjExecDocumentosHTML(p){
  return `${pjSecHead('Notas e documentos', 'Notas fiscais, comprovantes, relatórios e declarações da execução. Uma nota fiscal conclui a etapa.', `<button type="button" class="btn btn-primary btn-sm" data-pj="documento-novo" data-id="${pjEsc(p.id)}">＋ Anexar documento</button>`)}
    ${p.documentosProjeto.length ? `<ul class="pj-itens">${p.documentosProjeto.map(d => `<li class="pj-item">
      <div><strong>${pjEsc(d.nome)}</strong><small><span class="pj-cat">${pjEsc(d.categoria || 'Outro')}</span> ${d.data ? formatDateBR(d.data) : 'Sem data'}</small></div>
      <div class="pj-item-acoes">${pjAnexoBtn(d.anexo)}<button type="button" class="btn btn-sm pj-btn-perigo" data-pj="excluir-item" data-id="${pjEsc(p.id)}" data-tipo="documento" data-item="${pjEsc(d.id)}">Excluir</button></div>
    </li>`).join('')}</ul>` : pjVazio('Nenhum documento anexado.')}`;
}

function pjExecPagamentosHTML(p, sit){
  return `${pjSecHead('Pagamentos', `Pago ${formatMoney(sit.fin.executado)} de ${formatMoney(sit.fin.planejado)} planejados. Cada pagamento alimenta o saldo da execução e do recurso.`, `<button type="button" class="btn btn-primary btn-sm" data-pj="pagamento-novo" data-id="${pjEsc(p.id)}">＋ Registrar pagamento</button>`)}
    ${p.pagamentos.length ? `<ul class="pj-itens">${[...p.pagamentos].sort((a,b) => String(b.data||'').localeCompare(String(a.data||''))).map(x => `<li class="pj-item">
      <div><strong>${formatMoney(x.valor)} <span class="pj-item-de">— ${pjEsc(x.fornecedor || 'Pagamento')}</span></strong><small>${x.data ? formatDateBR(x.data) : 'Sem data'} · ${pjEsc(x.forma || 'Forma não informada')}</small></div>
      <div class="pj-item-acoes">${pjAnexoBtn(x.anexo, 'Comprovante')}<button type="button" class="btn btn-sm pj-btn-perigo" data-pj="excluir-item" data-id="${pjEsc(p.id)}" data-tipo="pagamento" data-item="${pjEsc(x.id)}" aria-label="Excluir pagamento">✕</button></div>
    </li>`).join('')}</ul>` : pjVazio('Nenhum pagamento registrado.')}`;
}

function pjExecPendenciasHTML(p){
  const ordenadas = [...p.pendencias].sort((a,b) => (a.status === 'Concluída') - (b.status === 'Concluída'));
  return `${pjSecHead('Pendências', 'Para algo específico que precisa ser resolvido e não é uma etapa do processo. Aparecem também na Central de Pendências.', `<button type="button" class="btn btn-primary btn-sm" data-pj="pendencia-nova" data-id="${pjEsc(p.id)}">＋ Nova pendência</button>`)}
    ${ordenadas.length ? `<ul class="pj-itens">${ordenadas.map(x => `<li class="pj-item ${x.status==='Concluída'?'is-concluida':''}">
      <div><strong>${pjEsc(x.titulo)}</strong><small>${pjEsc(x.prioridade || 'Normal')} · ${pjEsc(x.status || 'Pendente')}${x.descricao ? ' · ' + pjEsc(x.descricao) : ''}</small></div>
      <div class="pj-item-acoes"><button type="button" class="btn btn-sm" data-pj="pendencia-toggle" data-id="${pjEsc(p.id)}" data-item="${pjEsc(x.id)}">${x.status === 'Concluída' ? 'Reabrir' : '✓ Concluir'}</button><button type="button" class="btn btn-sm pj-btn-perigo" data-pj="pendencia-excluir" data-id="${pjEsc(p.id)}" data-item="${pjEsc(x.id)}">Excluir</button></div>
    </li>`).join('')}</ul>` : pjVazio('Nenhuma pendência.')}`;
}

/* =========================================================
   AÇÕES — um único despachante por delegação
   ========================================================= */
function pjExcluirRecurso(id){
  const r = DB.getById('projetos', id); if (!r) return;
  if (recursoExecucoes(r.id).length) { showToast('⚠ Exclua ou reclassifique as execuções deste recurso antes (ou prefira "Arquivar").'); return; }
  confirmAction(`Excluir o recurso "${r.nome}"? Se ele só estiver encerrado, prefira "Arquivar".`, () => {
    DB.remove('projetos', r.id);
    registrarHistorico({ modulo:'projeto', acao:'exclusão', descricao:`Recurso "${r.nome}" excluído.`, refId:r.id });
    showToast('Recurso excluído.');
    pjIr('lista');
  });
}

function pjExcluirExecucao(id){
  const f = DB.getById('projetos', id); if (!f) return;
  const pai = f.paiId ? DB.getById('projetos', f.paiId) : null;
  const texto = pai ? `Excluir a execução "${f.nome}"? O valor planejado volta a ficar livre no recurso.` : `Excluir "${f.nome}"?`;
  confirmAction(texto, () => {
    DB.remove('projetos', f.id);
    registrarHistorico({ modulo:'projeto', acao:'exclusão', descricao:`${pai?'Execução':'Projeto'} "${f.nome}" excluído(a).`, refId:f.id });
    if (pai) recursoRegistrarMovimentacao(pai.id, { tipo:'ajuste', valor:-(Number(f.valorOrcado)||0), descricao:`Execução "${f.nome}" excluída — valor devolvido ao saldo não distribuído.`, origemExecucaoId:f.id });
    showToast('Registro excluído.');
    pai ? pjIr('recurso', pai.id) : pjIr('lista');
  });
}

const PJ_ACOES = {
  'ir': b => pjIr(b.dataset.nivel, b.dataset.id || null, b.dataset.secao || null),
  'novo-recurso': () => openFormProjeto(null, { tipo:'recurso' }),
  'nova-execucao': b => openFormProjeto(null, { tipo:'execucao', paiId:b.dataset.id }),
  'editar': b => openFormProjeto(b.dataset.id),
  'excluir-recurso': b => pjExcluirRecurso(b.dataset.id),
  'excluir-execucao': b => pjExcluirExecucao(b.dataset.id),
  'transferir': b => abrirTransferenciaSaldo(b.dataset.id),
  'relatorio': b => gerarRelatorioRecurso(b.dataset.id),
  'pasta-prestacao': b => baixarPastaPrestacao(b.dataset.id),
  'arquivar': b => arquivarRecurso(b.dataset.id, true),
  'desarquivar': b => arquivarRecurso(b.dataset.id, false),
  'doc-recurso-novo': b => abrirFormDocumentoRecurso(b.dataset.id),
  'doc-recurso-excluir': b => excluirDocumentoRecurso(b.dataset.id, b.dataset.item),
  'classificar-recurso': b => abrirClassificarComoRecurso(b.dataset.id),
  'classificar-execucao': b => abrirClassificarComoExecucao(b.dataset.id),
  'plano': b => openFormPlano(b.dataset.id),
  'nova-empresa': b => openFormEmpresa(b.dataset.id),
  'vincular-empresa': b => abrirVincularEmpresaExistente(b.dataset.id),
  'editar-empresa': b => openFormEmpresaEditar(b.dataset.id, b.dataset.empresa),
  'remover-empresa': b => removerEmpresaProjeto(b.dataset.id, b.dataset.empresa),
  'nova-cotacao': b => openFormCotacao(b.dataset.id, b.dataset.empresa || ''),
  'selecionar-cotacao': b => selecionarCotacaoProjeto(b.dataset.id, b.dataset.item),
  'nova-ordem': b => openFormOrdem(b.dataset.id, b.dataset.empresa || ''),
  'excluir-item': b => excluirItemProjeto(b.dataset.id, b.dataset.tipo, b.dataset.item),
  'apae-cadastrar': b => openFormDocumento(null, { exigenciaApae:b.dataset.exig }),
  'apae-renovar': b => abrirFormRenovarDocumento(b.dataset.doc),
  'apae-ver': b => abrirDetalheDocumento(b.dataset.doc),
  'ir-documentos': () => goToView('documentos'),
  'documento-novo': b => openFormDocumentoProjeto(b.dataset.id),
  'pagamento-novo': b => openFormPagamento(b.dataset.id),
  'pendencia-nova': b => openFormPendencia(b.dataset.id),
  'pendencia-toggle': b => togglePendenciaProjeto(b.dataset.id, b.dataset.item),
  'pendencia-excluir': b => excluirPendenciaProjeto(b.dataset.id, b.dataset.item)
};

(function ligarProjetos(){
  const root = document.getElementById('pjRoot'); if (!root) return;
  root.addEventListener('click', e => {
    const down = e.target.closest('[data-file-download]');
    if (down && root.contains(down)) { baixarAnexo(down.dataset.fileDownload); return; }
    const b = e.target.closest('[data-pj]');
    if (!b || !root.contains(b) || b.disabled) return;
    const acao = PJ_ACOES[b.dataset.pj];
    if (acao) acao(b);
  });
  root.addEventListener('input', e => {
    if (e.target.id !== 'pjBusca') return;
    pjEstado.busca = e.target.value;
    document.getElementById('pjListaCorpo').innerHTML = pjListaCorpoHTML();
  });
  root.addEventListener('change', e => {
    if (e.target.id === 'pjStatus') pjEstado.status = e.target.value;
    else if (e.target.id === 'pjArquivados') pjEstado.arquivados = e.target.checked;
    else return;
    document.getElementById('pjListaCorpo').innerHTML = pjListaCorpoHTML();
  });
})();

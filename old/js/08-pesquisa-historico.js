/* ---------------------------------------------------------
   17. BUSCA GERAL COM FULLTEXT E SCORING
   --------------------------------------------------------- */
/* Sem diferenciar acento/maiúscula ("oficio" acha "Ofício") e sem usar o
   termo como expressão regular — antes "(69)" ou "R$" quebravam a busca e
   "1.500" achava qualquer coisa. */
function calcularScoreBusca(texto, termo, pesos = 1){
  if (!texto) return 0;
  const t = normalizarFiltro(String(texto)), q = normalizarFiltro(termo);
  if (!q) return 0;
  if (t === q) return 50 * pesos;          // igual
  if (t.startsWith(q)) return 25 * pesos;  // começa com o termo
  return (t.split(q).length - 1) * 5 * pesos; // quantas vezes aparece
}

function buscarComScoring(items, termo, campos){
  return items
    .map(item => {
      let score = 0;
      campos.forEach(({ field, weight = 1 }) => {
        const valor = field(item);
        score += calcularScoreBusca(valor, termo, weight);
      });
      return { item, score };
    })
    .filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(r => r.item);
}

function buscarEmTudo(termo){
  const q = termo.trim().toLowerCase();
  const vazio = { solicitacoes:[], documentos:[], projetos:[], empresas:[], eventos:[], atendimentos:[], cotacoes:[], ordens:[], gerados:[] };
  if (!q) return vazio;

  const solicitacoes = buscarComScoring(
    DB.getAll('solicitacoes').filter(s => !ehTarefaRenovacaoDocumento(s)),
    q,
    [
      { field: s => s.titulo, weight: 3 },
      { field: s => s.descricao, weight: 2 },
      { field: s => s.categoria, weight: 1.5 },
      { field: s => s.solicitante, weight: 1 },
      { field: s => s.responsavel, weight: 1 }
    ]
  );

  const documentos = buscarComScoring(
    DB.getAll('documentos'),
    q,
    [
      { field: d => d.nome, weight: 3 },
      { field: d => d.descricao, weight: 2 },
      { field: d => d.categoria, weight: 1.5 },
      { field: d => d.responsavel, weight: 1 }
    ]
  );

  const projetos = buscarComScoring(
    DB.getAll('projetos'),
    q,
    [
      { field: p => p.nome, weight: 3 },
      { field: p => p.codigo, weight: 2 },
      { field: p => p.fonteRecurso, weight: 1.5 },
      { field: p => p.objetivo, weight: 1 },
      { field: p => p.descricao, weight: 1 },
      { field: p => p.responsavel, weight: 1 }
    ]
  );

  const empresas = buscarComScoring(
    DB.getAll('gerador-empresas'),
    q,
    [
      { field: e => e.razaoSocial, weight: 3 },
      { field: e => e.nomeFantasia, weight: 2 },
      { field: e => e.cnpj, weight: 1.5 },
      { field: e => e.contato, weight: 1 },
      { field: e => e.municipio, weight: 1 }
    ]
  );

  const eventos = buscarComScoring(
    DB.getAll('eventos'),
    q,
    [
      { field: e => e.titulo, weight: 3 },
      { field: e => e.local, weight: 1.5 },
      { field: e => e.responsavel, weight: 1 },
      { field: e => e.participantes, weight: 1 },
      { field: e => e.descricao, weight: 1 }
    ]
  );

  const atendimentos = buscarComScoring(
    DB.getAll('atendimentos'),
    q,
    [
      { field: a => a.alunoNome, weight: 3 },
      { field: a => a.profissionalNome, weight: 2 }
    ]
  );

  // Cotações e ordens de compra vivem dentro de cada projeto (não são uma
  // entidade própria no DB). A busca as agrega em memória a partir dos
  // projetos já carregados, sem criar uma nova store nem duplicar dados.
  const cotacoesTodas = [];
  const ordensTodas = [];
  DB.getAll('projetos').forEach(p => {
    (p.cotacoes || []).forEach(c => cotacoesTodas.push({ ...c, _projetoId: p.id, _projetoNome: p.nome }));
    (p.ordensCompra || []).forEach(o => ordensTodas.push({ ...o, _projetoId: p.id, _projetoNome: p.nome }));
  });

  const cotacoes = buscarComScoring(cotacoesTodas, q, [
    { field: c => c.fornecedor, weight: 3 },
    { field: c => c._projetoNome, weight: 1.5 },
    { field: c => (c.itens || []).map(i => i.nome).join(' '), weight: 2 }
  ]);

  const ordens = buscarComScoring(ordensTodas, q, [
    { field: o => o.numero, weight: 2 },
    { field: o => o.fornecedor, weight: 3 },
    { field: o => o._projetoNome, weight: 1.5 }
  ]);

  const nq = normalizarFiltro(q);
  const gerados = typeof getDocumentosGerados === 'function'
    ? getDocumentosGerados().filter(d => normalizarFiltro(textoPesquisaDocumento(d)).includes(nq)).sort((a,b) => b.criadoEm - a.criadoEm)
    : [];
  return { solicitacoes, documentos, projetos, empresas, eventos, atendimentos, cotacoes, ordens, gerados };
}

const PS_PRESENCA = { veio:'Veio', faltou:'Faltou', nao_informado:'Sem registro' };
let psFiltro = '';
function psBlocos(r){
  return [
    { k:'tarefas', titulo:'Tarefas', itens:r.solicitacoes, render:s => ({ titulo:s.titulo, sub:[prazoAtividade(s).texto, s.status, s.responsavel], abrir:() => abrirDetalheSolicitacao(s.id) }) },
    { k:'agenda', titulo:'Agenda', itens:r.eventos, render:e => ({ titulo:e.titulo, sub:[formatDateBR(e.data), e.horarioInicio, e.tipo, e.local], abrir:() => abrirDetalheEvento(e.id) }) },
    { k:'atendimentos', titulo:'Atendimentos', itens:r.atendimentos, render:a => ({ titulo:`${a.alunoNome} — ${a.profissionalNome}`, sub:[formatDateBR(a.data), a.horario, a.remarcadoPara ? 'Remarcado' : PS_PRESENCA[a.presenca]], abrir:() => abrirAtendimento(a.id) }) },
    { k:'documentos', titulo:'Documentos', itens:r.documentos, render:d => ({ titulo:d.nome, sub:[situacaoDocumento(d).label, d.dataValidade && `validade ${formatDateBR(d.dataValidade)}`, d.categoria], abrir:() => abrirDetalheDocumento(d.id) }) },
    { k:'gerados', titulo:'Documentos gerados', itens:r.gerados, render:d => ({ titulo:nomeDocumentoGerado(d), sub:[`gerado em ${formatDateBR(d.dataGeracao)}`, d.vinculo && d.vinculo.rotulo], abrir:() => abrirDetalheDocumentoGerado(d.id) }) },
    { k:'recursos', titulo:'Recursos', itens:r.projetos.filter(p => p.tipo === 'recurso'), render:p => ({ titulo:p.nome, sub:[p.status, p.fonteRecurso], abrir:() => abrirDetalheProjeto(p.id) }) },
    { k:'execucoes', titulo:'Execuções', itens:r.projetos.filter(p => p.tipo !== 'recurso'), render:p => ({ titulo:p.nome, sub:[p.status, p.paiId ? DB.getById('projetos', p.paiId)?.nome : 'projeto antigo'], abrir:() => abrirDetalheProjeto(p.id) }) },
    { k:'empresas', titulo:'Empresas', itens:r.empresas, render:e => ({ titulo:e.razaoSocial || e.nomeFantasia, sub:[e.cnpj, e.municipio], abrir:() => abrirFichaEmpresaGlobal(e.id) }) },
    { k:'cotacoes', titulo:'Cotações', itens:r.cotacoes, render:c => ({ titulo:`Cotação — ${c.fornecedor}`, sub:[formatDateBR(c.data), c.selecionada ? 'Vencedora' : 'Em análise', c._projetoNome], abrir:() => abrirDetalheProjeto(c._projetoId, 'empresas') }) },
    { k:'ordens', titulo:'Ordens de compra', itens:r.ordens, render:o => ({ titulo:`Ordem ${o.numero || ''}`, sub:[formatDateBR(o.data), o.status, o._projetoNome], abrir:() => abrirDetalheProjeto(o._projetoId, 'empresas') }) }
  ].filter(b => b.itens.length);
}
let psAcoes = [];
function renderPesquisa(){
  const input = document.getElementById('buscaGeralInput');
  const alvo = document.getElementById('resultadosBuscaGeral');
  if (!input || !alvo) return;
  if (!input._ligado) {
    input._ligado = true;
    input.addEventListener('input', () => { psFiltro = ''; renderPesquisa(); });
    alvo.addEventListener('click', e => {
      const f = e.target.closest('[data-ps-filtro]');
      if (f) { psFiltro = f.dataset.psFiltro; renderPesquisa(); return; }
      const b = e.target.closest('[data-ps]'); if (b) psAcoes[Number(b.dataset.ps)]?.();
    });
  }
  psAcoes = [];
  const termo = input.value;
  if (!termo.trim()) { alvo.innerHTML = '<div class="ps-vazio">Digite um nome, número, CNPJ, assunto… A busca procura em tarefas, agenda, atendimentos, documentos, documentos gerados, projetos e empresas.</div>'; return; }
  const blocos = psBlocos(buscarEmTudo(termo));
  const total = blocos.reduce((s, b) => s + b.itens.length, 0);
  if (!total) { alvo.innerHTML = `<div class="ps-vazio">Nada encontrado para “${escapeHTML(termo)}”.</div>`; return; }
  if (psFiltro && !blocos.some(b => b.k === psFiltro)) psFiltro = '';
  const chip = (v, t, n) => `<button type="button" class="hi-chip ${psFiltro===v?'is-ativo':''}" data-ps-filtro="${v}" aria-pressed="${psFiltro===v}">${t}<span>${n}</span></button>`;
  const mostrar = psFiltro ? blocos.filter(b => b.k === psFiltro) : blocos;
  alvo.innerHTML = `
    <p class="ps-total">${total} resultado${total===1?'':'s'} para “${escapeHTML(termo)}”</p>
    ${blocos.length > 1 ? `<div class="hi-chips">${chip('', 'Tudo', total)}${blocos.map(b => chip(b.k, b.titulo, b.itens.length)).join('')}</div>` : ''}
    ${mostrar.map(b => `<section class="ps-grupo"><h3>${b.titulo}<span>${b.itens.length}</span></h3>
      ${b.itens.map(it => { const r = b.render(it); psAcoes.push(r.abrir); return `<button type="button" class="ps-linha" data-ps="${psAcoes.length - 1}"><strong>${escapeHTML(r.titulo || '—')}</strong><small>${r.sub.filter(Boolean).map(escapeHTML).join(' · ')}</small><i aria-hidden="true">→</i></button>`; }).join('')}
    </section>`).join('')}`;
}

/* pesquisa rápida no topo */
const quickSearchInput = document.getElementById('quickSearch');
const quickSearchResults = document.getElementById('quickSearchResults');
quickSearchInput.addEventListener('input', () => {
  const termo = quickSearchInput.value;
  if (!termo.trim()){ quickSearchResults.hidden = true; return; }
  const r = buscarEmTudo(termo);
  const grupos = [
    { titulo:'Recursos', itens:r.projetos.filter(p=>p.tipo==='recurso'), go: p=>abrirDetalheProjeto(p.id), label:p=>`💰 ${p.nome}` },
    { titulo:'Execuções', itens:r.projetos.filter(p=>p.tipo==='execucao'), go: p=>abrirDetalheProjeto(p.id), label:p=>`📂 ${p.nome}` },
    { titulo:'Projetos', itens:r.projetos.filter(p=>!p.tipo), go: p=>abrirDetalheProjeto(p.id), label:p=>p.nome },
    { titulo:'Empresas', itens:r.empresas, go: e=>abrirFichaEmpresaGlobal(e.id), label:e=>e.razaoSocial||e.nomeFantasia },
    { titulo:'Tarefas', itens:r.solicitacoes, go: s=>abrirDetalheSolicitacao(s.id), label:s=>s.titulo },
    { titulo:'Documentos', itens:r.documentos, go: d=>abrirDetalheDocumento(d.id), label:d=>d.nome },
    { titulo:'Agenda', itens:r.eventos, go: e=>abrirDetalheEvento(e.id), label:e=>e.titulo },
    { titulo:'Atendimentos', itens:r.atendimentos, go: a=>abrirAtendimento(a.id), label:a=>`${a.alunoNome} — ${a.profissionalNome}` },
    { titulo:'Documentos gerados', itens:r.gerados, go: d=>abrirDetalheDocumentoGerado(d.id), label:d=>nomeDocumentoGerado(d) }
  ].filter(g => g.itens.length);

  if (!grupos.length){
    quickSearchResults.hidden = false;
    quickSearchResults.innerHTML = `<div class="qs-group"><p class="muted">Não encontramos resultados para "${escapeHTML(termo)}".</p></div>`;
    return;
  }
  const total = grupos.reduce((s, g) => s + g.itens.length, 0);
  quickSearchResults.hidden = false;
  quickSearchResults.innerHTML = `<button type="button" class="qs-todos" id="qsVerTodos">Ver todos os resultados (${total}) →</button>` + grupos.map(g => `
    <div class="qs-group">
      <div class="qs-group-title">${g.titulo} · ${g.itens.length}</div>
      ${g.itens.slice(0,4).map((it,i) => `<div class="qs-row" data-grupo="${g.titulo}" data-idx="${i}"><span>${escapeHTML(g.label(it))}</span></div>`).join('')}
    </div>`).join('');
  document.getElementById('qsVerTodos').onclick = () => {
    document.getElementById('buscaGeralInput').value = termo;
    quickSearchResults.hidden = true; quickSearchInput.value = '';
    goToView('pesquisa');
  };
  grupos.forEach(g => {
    quickSearchResults.querySelectorAll(`.qs-row[data-grupo="${g.titulo}"]`).forEach(el => {
      el.addEventListener('click', () => { g.go(g.itens[Number(el.dataset.idx)]); quickSearchResults.hidden = true; quickSearchInput.value=''; });
    });
  });
});
quickSearchInput.addEventListener('keydown', e => { if (e.key === 'Enter' && quickSearchInput.value.trim()) document.getElementById('qsVerTodos')?.click(); });
document.addEventListener('click', (e) => {
  const verFichaEmpresa = e.target.closest?.('[data-project-action="ver-ficha-empresa"]');
  if (verFichaEmpresa) {
    e.preventDefault();
    e.stopPropagation();
    const empresaGlobalId = verFichaEmpresa.getAttribute('data-empresa-global');
    const abaAlvo = verFichaEmpresa.getAttribute('data-ficha-aba') || 'dados';
    if (empresaGlobalId) abrirFichaEmpresaGlobal(empresaGlobalId, abaAlvo);
    else showToast('Esta empresa ainda não possui ficha vinculada.');
    return;
  }
  if (!e.target.closest('.quick-search') && !e.target.closest('.qs-results')) quickSearchResults.hidden = true;
});

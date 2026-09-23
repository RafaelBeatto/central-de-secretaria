/* ---------------------------------------------------------
   17. BUSCA GERAL COM FULLTEXT E SCORING
   --------------------------------------------------------- */
function calcularScoreBusca(texto, termo, pesos = 1){
  if (!texto) return 0;
  const t = texto.toLowerCase();
  const q = termo.toLowerCase();
  let score = 0;

  if (t === q) score += 50 * pesos; // match exato
  else if (t.startsWith(q)) score += 25 * pesos; // começa com termo
  else {
    const matches = (t.match(new RegExp(q, 'g')) || []).length;
    score += matches * 5 * pesos; // ocorrências do termo
  }
  return score;
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
  const vazio = { solicitacoes:[], documentos:[], projetos:[], empresas:[], eventos:[], atendimentos:[], cotacoes:[], ordens:[] };
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

  return { solicitacoes, documentos, projetos, empresas, eventos, atendimentos, cotacoes, ordens };
}

function renderPesquisa(){
  const input = document.getElementById('buscaGeralInput');
  function render(){
    const termo = input.value;
    const resultados = buscarEmTudo(termo);
    const container = document.getElementById('resultadosBuscaGeral');
    if (!termo.trim()){
      container.innerHTML = `<p class="muted">Digite um termo para pesquisar em solicitações e documentos.</p>`;
      return;
    }
    const total = Object.values(resultados).reduce((s,arr) => s + arr.length, 0);
    if (!total){
      container.innerHTML = `<p class="muted">Não encontramos resultados para "${escapeHTML(termo)}".</p>`;
      return;
    }

    // Recursos (Pai) e Execuções (Filho) são a mesma busca por trás
    // (resultados.projetos), só exibidas em grupos separados para deixar
    // claro qual é qual — abrirDetalheProjeto já sabe abrir a tela certa.
    const blocos = [
      { titulo:'Recursos', itens: resultados.projetos.filter(p=>p.tipo==='recurso'), render: p => ({ titulo:`💰 ${p.nome}`, data:p.dataRecebimento||p.dataInicio, status:p.status||'Sem status', resumo:p.fonteRecurso, action:()=>abrirDetalheProjeto(p.id) }) },
      { titulo:'Execuções', itens: resultados.projetos.filter(p=>p.tipo==='execucao'), render: p => ({ titulo:`📂 ${p.nome}`, data:p.dataInicio, status:p.status||'Sem status', resumo:p.paiId?DB.getById('projetos',p.paiId)?.nome:'', action:()=>abrirDetalheProjeto(p.id) }) },
      { titulo:'Projetos', itens: resultados.projetos.filter(p=>!p.tipo), render: p => ({ titulo:p.nome, data:p.dataInicio, status:p.status||'Sem status', resumo:p.objetivo||p.descricao, action:()=>abrirDetalheProjeto(p.id) }) },
      { titulo:'Empresas', itens: resultados.empresas, render: e => ({ titulo:e.razaoSocial||e.nomeFantasia, data:null, status:e.cnpj||'CNPJ não informado', resumo:e.municipio, action:()=>abrirFichaEmpresaGlobal(e.id) }) },
      { titulo:'Cotações', itens: resultados.cotacoes, render: c => ({ titulo:`Cotação — ${c.fornecedor}`, data:c.data, status:c.selecionada?'Vencedora':'Em análise', resumo:c._projetoNome, action:()=>abrirDetalheProjeto(c._projetoId,'empresas') }) },
      { titulo:'Ordens de compra', itens: resultados.ordens, render: o => ({ titulo:`Ordem ${o.numero||''}`, data:o.data, status:o.status||'—', resumo:o._projetoNome, action:()=>abrirDetalheProjeto(o._projetoId,'empresas') }) },
      { titulo:'Solicitações', itens: resultados.solicitacoes, render: s => ({ titulo:s.titulo, data:prazoAtividade(s).data, status:s.status, resumo:s.descricao, action:()=>abrirDetalheSolicitacao(s.id) }) },
      { titulo:'Agenda', itens: resultados.eventos, render: e => ({ titulo:e.titulo, data:e.data, status:e.tipo, resumo:e.local, action:()=>abrirDetalheEvento(e.id) }) },
      { titulo:'Documentos', itens: resultados.documentos, render: d => ({ titulo:d.nome, data:d.dataEmissao, status:situacaoDocumento(d).label, resumo:d.descricao, action:()=>abrirDetalheDocumento(d.id) }) },
      { titulo:'Atendimentos', itens: resultados.atendimentos, render: a => ({ titulo:`${a.alunoNome} — ${a.profissionalNome}`, data:a.data, status:a.presenca||'—', resumo:a.horario, action:()=>{ goToView('atendimentos'); if (typeof atendSegundaDaSemana==='function') atendSemanaAtual = atendSegundaDaSemana(a.data); renderAtendimentos(); } }) }
    ];

    container.innerHTML = blocos.filter(b=>b.itens.length).map(b => `
      <div class="panel">
        <div class="panel-head"><h2>${b.titulo}</h2><span class="muted">${b.itens.length} resultado${b.itens.length===1?'':'s'}</span></div>
        <div class="attention-list">
          ${b.itens.map((it,i) => {
            const r = b.render(it);
            return `<div class="attn-item" data-bloco="${b.titulo}" data-idx="${i}">
              <div class="attn-main">
                <div class="attn-title">${escapeHTML(r.titulo)}</div>
                <div class="attn-sub">${typeof r.data === 'number' ? new Date(r.data).toLocaleDateString('pt-BR') : formatDateBR(r.data)} · ${escapeHTML(r.status)} ${r.resumo ? '· '+escapeHTML(r.resumo.slice(0,60)) : ''}</div>
              </div>
            </div>`;
          }).join('')}
        </div>
      </div>`).join('');

    blocos.forEach(b => {
      container.querySelectorAll(`.attn-item[data-bloco="${b.titulo}"]`).forEach(el => {
        el.addEventListener('click', () => b.render(b.itens[Number(el.dataset.idx)]).action());
      });
    });
  }
  input.removeEventListener('input', input._handler || (()=>{}));
  input._handler = render;
  input.addEventListener('input', render);
  render();
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
    { titulo:'Solicitações', itens:r.solicitacoes, go: s=>abrirDetalheSolicitacao(s.id), label:s=>s.titulo },
    { titulo:'Documentos', itens:r.documentos, go: d=>abrirDetalheDocumento(d.id), label:d=>d.nome },
    { titulo:'Agenda', itens:r.eventos, go: e=>abrirDetalheEvento(e.id), label:e=>e.titulo },
    { titulo:'Atendimentos', itens:r.atendimentos, go: a=>{ goToView('atendimentos'); if (typeof atendSegundaDaSemana==='function') atendSemanaAtual = atendSegundaDaSemana(a.data); renderAtendimentos(); }, label:a=>`${a.alunoNome} — ${a.profissionalNome}` }
  ].filter(g => g.itens.length);

  if (!grupos.length){
    quickSearchResults.hidden = false;
    quickSearchResults.innerHTML = `<div class="qs-group"><p class="muted">Não encontramos resultados para "${escapeHTML(termo)}".</p></div>`;
    return;
  }
  quickSearchResults.hidden = false;
  quickSearchResults.innerHTML = grupos.map(g => `
    <div class="qs-group">
      <div class="qs-group-title">${g.titulo} · ${g.itens.length}</div>
      ${g.itens.slice(0,4).map((it,i) => `<div class="qs-row" data-grupo="${g.titulo}" data-idx="${i}"><span>${escapeHTML(g.label(it))}</span></div>`).join('')}
    </div>`).join('');
  grupos.forEach(g => {
    quickSearchResults.querySelectorAll(`.qs-row[data-grupo="${g.titulo}"]`).forEach(el => {
      el.addEventListener('click', () => { g.go(g.itens[Number(el.dataset.idx)]); quickSearchResults.hidden = true; quickSearchInput.value=''; });
    });
  });
});
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
  const acessarEmpresa = e.target.closest?.('[data-project-action="acessar-empresa"]');
  if (acessarEmpresa) {
    e.preventDefault();
    e.stopPropagation();
    const empresaId = acessarEmpresa.getAttribute('data-empresa');
    const projetoId = acessarEmpresa.getAttribute('data-project');
    if (empresaId && projetoId) {
      const projeto = DB.getById('projetos', projetoId);
      if (projeto) {
        renderEmpresaProjeto(projetoId, empresaId);
      } else {
        console.error('Projeto não encontrado:', projetoId);
        showToast('Não foi possível abrir a empresa. Projeto não encontrado.');
      }
    } else {
      console.error('Dados do botão incompletos:', { projetoId, empresaId });
      showToast('Não foi possível abrir a empresa.');
    }
    return;
  }
  if (!e.target.closest('.quick-search') && !e.target.closest('.qs-results')) quickSearchResults.hidden = true;
  if (!e.target.closest('#btnNotif') && !e.target.closest('#notifPanel')) document.getElementById('notifPanel').hidden = true;
});

/* ---------------------------------------------------------
   18. HISTÓRICO
   --------------------------------------------------------- */
function renderHistorico(){
  const filtros = getFiltrosValores('filtrosHistorico');
  let lista = DB.getAll('historico');
  if (filtros.data) lista = lista.filter(h => new Date(h.timestamp).toISOString().slice(0,10) === filtros.data);
  if (filtros.modulo) lista = lista.filter(h => h.modulo === filtros.modulo);
  if (filtros.acao) lista = lista.filter(h => h.acao === filtros.acao);

  const container = document.getElementById('listaHistorico');
  document.getElementById('vazioHistorico').hidden = lista.length !== 0;
  container.innerHTML = lista.map(h => `
    <div class="history-row">
      <div class="h-meta">${timestampToBR(h.timestamp)} · ${h.modulo}</div>
      <div>${escapeHTML(h.descricao)}</div>
    </div>`).join('');
}
document.querySelectorAll('#filtrosHistorico [data-filter]').forEach(el => el.addEventListener('input', renderHistorico));


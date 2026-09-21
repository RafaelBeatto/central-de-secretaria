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
  if (!q) return { solicitacoes:[], documentos:[] };

  const solicitacoes = buscarComScoring(
    DB.getAll('solicitacoes'),
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

  return { solicitacoes, documentos };
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
    const total = resultados.solicitacoes.length + resultados.documentos.length;
    if (!total){
      container.innerHTML = `<p class="muted">Não encontramos resultados para "${escapeHTML(termo)}".</p>`;
      return;
    }

    const blocos = [
      { titulo:'Solicitações', itens: resultados.solicitacoes, render: s => ({ titulo:s.titulo, data:s.dataRecebimento, status:s.status, resumo:s.descricao, action:()=>abrirDetalheSolicitacao(s.id) }) },
      { titulo:'Documentos', itens: resultados.documentos, render: d => ({ titulo:d.nome, data:d.dataEmissao, status:situacaoDocumento(d).label, resumo:d.descricao, action:()=>abrirDetalheDocumento(d.id) }) }
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
    { titulo:'Solicitações', itens:r.solicitacoes, go: s=>abrirDetalheSolicitacao(s.id), label:s=>s.titulo },
    { titulo:'Documentos', itens:r.documentos, go: d=>abrirDetalheDocumento(d.id), label:d=>d.nome }
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
    if (empresaGlobalId) abrirFichaEmpresaGlobal(empresaGlobalId);
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


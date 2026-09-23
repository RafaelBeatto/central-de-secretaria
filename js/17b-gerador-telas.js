/* =========================================================
   GERADOR DE DOCUMENTOS — telas
   Documentos gerados no centro (por mês, com busca e filtro por
   modelo) e um painel ao lado com a miniatura, anexos e versões.
   O formulário de preenchimento mostra a prévia do documento ao
   vivo. Os dados, modelos, numeração, vínculos e a montagem do
   documento ficam em 17-gerador-documentos.js.
   ========================================================= */
let geEstado = { aba:'documentos', busca:'', modelo:'', sel:null };
const geEsc = s => escapeHTML(s ?? '');

/* "DESTINATARIO" → "Destinatário" (acentos das palavras mais comuns). */
const GE_ACENTOS = { destinatario:'destinatário', destinatarios:'destinatários', orgao:'órgão', horario:'horário', periodo:'período', responsavel:'responsável',
  deliberacoes:'deliberações', consideracoes:'considerações', observacao:'observação', endereco:'endereço', mes:'mês', numero:'número', convocacao:'convocação',
  referencia:'referência', informacoes:'informações', extenso:'extenso', setor:'setor', origem:'origem', cnpj:'CNPJ', cpf:'CPF' };
function geRotuloCampo(nome){
  if (GERADOR_CAMPOS_CONTEXTO_LABEL[nome]) return GERADOR_CAMPOS_CONTEXTO_LABEL[nome];
  const t = nome.toLowerCase().split('_').map(p => GE_ACENTOS[p] || p).join(' ');
  return t.charAt(0).toUpperCase() + t.slice(1);
}
function geUsoPorModelo(){
  const uso = {};
  getDocumentosGerados().forEach(d => { uso[d.modeloId] = (uso[d.modeloId] || 0) + 1; });
  return uso;
}
/* Um resumo curto do documento para a lista: a quem se destina ou do que trata. */
function geResumoDoc(d){
  const v = d.valores || {}, c = d.contexto || {};
  const pref = ['DESTINATARIO','NOME','NOME_ALUNO','NOME_EMPRESA','CONVOCADOS','DESTINATARIOS','ASSUNTO','FINALIDADE','REFERENTE','OBJETO'];
  const achados = pref.map(k => v[k] || c[k]).filter(Boolean);
  const texto = [...new Set(achados)].slice(0, 2).join(' · ');
  return texto.length > 90 ? texto.slice(0, 88) + '…' : texto;
}
function geMesTitulo(iso){
  const t = parseISODate(iso).toLocaleDateString('pt-BR', { month:'long', year:'numeric' });
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/* ---------- entrada a partir de outras telas ---------- */
function abrirDetalheDocumentoGerado(id){
  if (!DB.getById('gerador-documentos', id)) return showToast('Documento não encontrado');
  geEstado = { ...geEstado, aba:'documentos', sel:id };
  if (!document.getElementById('modalBackdrop').hidden) closeModal();
  if (typeof currentView !== 'undefined' && currentView !== 'gerador') goToView('gerador'); else renderGeradorDocumentos();
  if (window.innerWidth <= 1100) document.getElementById('geRoot')?.scrollIntoView({ block:'start' });
}

/* ---------- tela ---------- */
function renderGeradorDocumentos(){
  const root = document.getElementById('geRoot'); if (!root) return;
  if (geEstado.sel && !DB.getById('gerador-documentos', geEstado.sel)) geEstado.sel = null;
  const docs = getDocumentosGerados(), modelos = getGeradorModelos(), empresas = getEmpresasGerador();
  const inst = getInstituicaoConfig();
  const aba = (v, t, n) => `<button type="button" class="ge-aba ${geEstado.aba===v?'is-ativa':''}" data-ge="aba" data-valor="${v}" aria-pressed="${geEstado.aba===v}">${t}<span>${n}</span></button>`;
  const focoBusca = document.activeElement?.id === 'geBusca';
  const painel = geEstado.aba === 'documentos' && geEstado.sel;
  root.innerHTML = `
    <div class="ge-barra">
      <div class="ge-abas" role="tablist">${aba('documentos','Documentos',docs.length)}${aba('modelos','Modelos',modelos.length)}${aba('empresas','Empresas',empresas.length)}</div>
      <div class="ge-ferramentas">
        <button type="button" class="btn btn-sm" data-ge="instituicao">⚙ Dados da instituição</button>
        <button type="button" class="btn btn-primary" data-ge="novo-doc">＋ Novo documento</button>
      </div>
    </div>
    ${!inst.nome ? '<div class="ge-aviso">⚠ Os dados da instituição ainda não foram preenchidos — o cabeçalho dos documentos sai vazio. <button type="button" class="btn btn-sm" data-ge="instituicao">Preencher agora</button></div>' : ''}
    <div class="ge-layout ${painel?'tem-painel':''}">
      <div class="ge-principal">${geEstado.aba === 'modelos' ? geModelosHTML(modelos) : geEstado.aba === 'empresas' ? geEmpresasHTML(empresas) : geDocumentosHTML(docs)}</div>
      ${painel ? `<aside class="ge-painel" aria-label="Documento">${gePainelHTML(DB.getById('gerador-documentos', geEstado.sel))}</aside>` : ''}
    </div>`;
  if (focoBusca) { const b = document.getElementById('geBusca'); if (b) { b.focus(); b.setSelectionRange(b.value.length, b.value.length); } }
  if (painel) geCarregarMiniatura(geEstado.sel);
}

function geDocumentosHTML(todos){
  if (!todos.length) return `<div class="ge-vazio"><strong>Nenhum documento gerado ainda</strong><span>Escolha um modelo — ofício, declaração, recibo, ata… — preencha os campos e o documento sai com o cabeçalho da instituição, pronto para imprimir ou salvar em PDF.</span><button type="button" class="btn btn-primary" data-ge="novo-doc">＋ Gerar o primeiro documento</button></div>`;
  const q = normalizarFiltro(geEstado.busca);
  const usados = {};
  todos.forEach(d => { usados[d.modeloId] = usados[d.modeloId] || { nome:d.modeloNome, n:0 }; usados[d.modeloId].n++; });
  const lista = todos.filter(d => (!geEstado.modelo || d.modeloId === geEstado.modelo) && (!q || normalizarFiltro(textoPesquisaDocumento(d)).includes(q)))
    .sort((a,b) => (b.dataGeracao || '').localeCompare(a.dataGeracao || '') || b.criadoEm - a.criadoEm);
  const grupos = [];
  lista.forEach(d => {
    const mes = (d.dataGeracao || '').slice(0,7);
    if (!grupos.length || grupos[grupos.length-1].mes !== mes) grupos.push({ mes, itens:[] });
    grupos[grupos.length-1].itens.push(d);
  });
  const chip = (v, t, n) => `<button type="button" class="hi-chip ${geEstado.modelo===v?'is-ativo':''}" data-ge="filtro-modelo" data-valor="${geEsc(v)}" aria-pressed="${geEstado.modelo===v}">${geEsc(t)}<span>${n}</span></button>`;
  return `
    <div class="ge-filtros">
      <input type="search" class="input" id="geBusca" placeholder="Buscar por número, pessoa, empresa, assunto…" value="${geEsc(geEstado.busca)}" aria-label="Buscar documentos">
    </div>
    ${Object.keys(usados).length > 1 ? `<div class="hi-chips">${chip('', 'Todos', todos.length)}${Object.entries(usados).sort((a,b) => b[1].n - a[1].n).map(([id, u]) => chip(id, u.nome, u.n)).join('')}</div>` : ''}
    ${grupos.length ? grupos.map(g => `<section class="ge-grupo"><h3>${geEsc(geMesTitulo(g.mes + '-01'))}<span>${g.itens.length}</span></h3>${g.itens.map(geLinhaDocHTML).join('')}</section>`).join('')
      : '<div class="ge-vazio">Nenhum documento com esses filtros.</div>'}`;
}
function geLinhaDocHTML(d){
  const resumo = geResumoDoc(d);
  return `<button type="button" class="ge-doc ${geEstado.sel===d.id?'is-sel':''}" data-ge="doc" data-id="${geEsc(d.id)}">
    <span class="ge-doc-corpo"><strong>${geEsc(nomeDocumentoGerado(d))}</strong><small>${geEsc(resumo || d.modeloNome)}${d.vinculo ? ` · 🔗 ${geEsc(d.vinculo.rotulo || '')}` : ''}</small></span>
    <span class="ge-doc-meta">${(d.anexos||[]).length ? `<span title="Anexos">📎 ${d.anexos.length}</span>` : ''}${d.versao > 1 ? `<span class="ge-versao">v${d.versao}</span>` : ''}<time>${formatDateBR(d.dataGeracao).slice(0,5)}</time></span>
  </button>`;
}

function gePainelHTML(d){
  const anexos = d.anexos || [], versoes = (d.versoes || []).slice().reverse();
  return `
    <div class="ge-painel-topo"><button type="button" class="ge-voltar" data-ge="fechar">← Documentos</button><button type="button" class="ge-fechar" data-ge="fechar" aria-label="Fechar">✕</button></div>
    <span class="ge-codigo">${geEsc(d.modeloNome)}</span>
    <h2>${geEsc(nomeDocumentoGerado(d))}</h2>
    <p class="ge-sub">Gerado em ${formatDateBR(d.dataGeracao)}${d.versao > 1 ? ` · versão ${d.versao}` : ''}</p>
    <div class="ge-acoes">
      <button type="button" class="btn btn-sm btn-primary" data-ge="pdf" data-id="${geEsc(d.id)}">⭳ PDF</button>
      <button type="button" class="btn btn-sm" data-ge="imprimir" data-id="${geEsc(d.id)}">🖨 Imprimir</button>
      <button type="button" class="btn btn-sm" data-ge="editar" data-id="${geEsc(d.id)}">✎ Editar</button>
      <button type="button" class="btn btn-sm" data-ge="duplicar" data-id="${geEsc(d.id)}">Duplicar</button>
      <button type="button" class="btn btn-sm at-perigo" data-ge="excluir" data-id="${geEsc(d.id)}">Excluir</button>
    </div>
    <button type="button" class="ge-miniatura" data-ge="ver" data-id="${geEsc(d.id)}" title="Ver em tamanho real"><div class="ge-miniatura-pag" id="geMiniatura"><span class="muted">Montando…</span></div><span class="ge-miniatura-dica">Ver em tamanho real</span></button>
    ${d.vinculo ? `<p class="ge-vinculo">🔗 <button type="button" class="at-link" data-ge="vinculo" data-id="${geEsc(d.id)}">${geEsc(rotuloVinculo(d.vinculo))}</button></p>` : ''}
    <h4 class="ge-subtitulo">Anexos${anexos.length ? ` (${anexos.length})` : ''}</h4>
    ${anexos.length ? `<ul class="ge-anexos">${anexos.map(a => `<li><span><strong>${geEsc(a.nome)}</strong><small>${geEsc(formatarTamanhoArquivo(a.tamanho))}</small></span>
      <button type="button" class="btn btn-sm" data-ge="anexo-baixar" data-anexo="${geEsc(a.id)}">⭳</button><button type="button" class="btn btn-sm at-perigo" data-ge="anexo-remover" data-id="${geEsc(d.id)}" data-anexo="${geEsc(a.id)}" aria-label="Remover ${geEsc(a.nome)}">✕</button></li>`).join('')}</ul>` : '<p class="ge-nada">Comprovantes, protocolos, a via assinada escaneada…</p>'}
    <label class="btn btn-sm ge-anexar">📎 Anexar arquivo<input type="file" id="geAnexoInput" data-id="${geEsc(d.id)}" multiple hidden></label>
    ${versoes.length ? `<h4 class="ge-subtitulo">Versões anteriores</h4><ul class="ge-versoes">${versoes.map(v => `<li><span>Versão ${v.versao}<small>${new Date(v.salvoEm).toLocaleString('pt-BR', { dateStyle:'short', timeStyle:'short' })}</small></span><button type="button" class="btn btn-sm" data-ge="versao" data-id="${geEsc(d.id)}" data-versao="${v.versao}">Ver</button></li>`).join('')}</ul>` : ''}`;
}

/* A miniatura é o próprio documento, reduzido. O HTML fica guardado para
   imprimir/PDF abrirem na hora do clique (sem bloqueio de pop-up). */
let geHTMLPronto = { id:null, html:'' }, geMiniGen = 0;
async function geCarregarMiniatura(id){
  const alvo = document.getElementById('geMiniatura'); if (!alvo) return;
  const minha = ++geMiniGen;
  const doc = DB.getById('gerador-documentos', id);
  const html = await montarHTMLDocumentoGerado(doc);
  if (minha !== geMiniGen) return;
  geHTMLPronto = { id, html };
  const escala = Math.min(1, (alvo.clientWidth || 340) / 794);
  alvo.innerHTML = `<div class="ge-miniatura-escala" style="transform:scale(${escala})">${html}</div>`;
  alvo.style.height = Math.round(1123 * escala * 0.62) + 'px';
}

/* Visualização em tamanho real (também usada para versões antigas). */
async function abrirDocumentoGerado(docId, versao){
  const doc = getDocumentosGerados().find(d => d.id === docId);
  if (!doc) return showToast('Documento não encontrado');
  const html = await montarHTMLDocumentoGerado(doc, versao);
  const rotulo = nomeDocumentoGerado(doc) + (versao ? ` — versão ${versao.versao}` : '');
  openModal(rotulo, `<div class="doc-a4-preview-wrap ge-real">${html}</div>
    <div class="modal-actions no-print">
      ${versao ? '<span class="muted ge-nota-versao">Versão antiga — só para consulta.</span>' : '<button type="button" class="btn btn-ghost" id="geRealEditar">✎ Editar</button>'}
      <button type="button" class="btn" id="geRealImprimir">🖨 Imprimir</button>
      <button type="button" class="btn btn-primary" id="geRealPdf">⭳ Salvar PDF</button>
    </div>`);
  if (!versao) document.getElementById('geRealEditar').onclick = () => { closeModal(); abrirFormularioGerador(null, doc.id); };
  document.getElementById('geRealImprimir').onclick = () => imprimirDocumentoGerador(html, rotulo);
  document.getElementById('geRealPdf').onclick = () => salvarPdfGerador(html, rotulo);
}

function geModelosHTML(modelos){
  const uso = geUsoPorModelo();
  const lista = modelos.slice().sort((a,b) => (uso[b.id]||0) - (uso[a.id]||0) || a.nome.localeCompare(b.nome,'pt-BR'));
  return `
    <div class="ge-topo-aba"><p>Os campos em <b>[COLCHETES]</b> você preenche na hora; os em <b>{CHAVES}</b> o sistema preenche (data, número, dados da instituição).</p><button type="button" class="btn btn-sm" data-ge="novo-modelo">＋ Novo modelo</button></div>
    <div class="ge-lista">${lista.map(m => {
      const n = extrairVariaveis(m.texto).length + classificarCamposChave(m.texto).contexto.length;
      const info = [`${n} campo${n===1?'':'s'} para preencher`, modeloUsaNumeracao(m) && `numerado (${geEsc(serieDoModelo(m))} nº ${espiarProximoNumeroGerador(serieDoModelo(m))})`, uso[m.id] && `usado ${uso[m.id]}×`].filter(Boolean).join(' · ');
      return `<div class="ge-item">
        <span class="ge-item-corpo"><strong>${geEsc(m.nome)}</strong><small>${info}</small></span>
        <span class="ge-item-acoes">
          <button type="button" class="btn btn-sm btn-primary" data-ge="usar" data-id="${geEsc(m.id)}">Usar</button>
          <button type="button" class="btn btn-sm" data-ge="editar-modelo" data-id="${geEsc(m.id)}">Editar</button>
          <button type="button" class="btn btn-sm" data-ge="duplicar-modelo" data-id="${geEsc(m.id)}">Duplicar</button>
          ${m.padrao ? '' : `<button type="button" class="btn btn-sm at-perigo" data-ge="excluir-modelo" data-id="${geEsc(m.id)}">Excluir</button>`}
        </span></div>`;
    }).join('')}</div>`;
}

function geEmpresasHTML(empresas){
  const lista = empresas.slice().sort((a,b) => (a.razaoSocial||'').localeCompare(b.razaoSocial||'','pt-BR'));
  const soProjetos = listarEmpresasParaVinculo().filter(e => e._origem === 'projeto');
  return `
    <div class="ge-topo-aba"><p>O mesmo cadastro usado nos Projetos. Os dados (CNPJ, endereço, representante) preenchem sozinhos os documentos ligados à empresa.</p><button type="button" class="btn btn-sm" data-ge="nova-empresa">＋ Nova empresa</button></div>
    ${lista.length ? `<div class="ge-lista">${lista.map(e => `<div class="ge-item">
      <span class="ge-item-corpo"><strong>${geEsc(e.razaoSocial || e.nomeFantasia || 'Sem nome')}</strong><small>${[e.cnpj && `CNPJ ${e.cnpj}`, e.telefone || e.contato, e.representante && `Rep.: ${e.representante}`].filter(Boolean).map(geEsc).join(' · ') || 'Sem dados adicionais'}</small></span>
      <span class="ge-item-acoes">
        <button type="button" class="btn btn-sm btn-primary" data-ge="gerar-empresa" data-id="${geEsc(e.id)}">Gerar documento</button>
        <button type="button" class="btn btn-sm" data-ge="ficha-empresa" data-id="${geEsc(e.id)}">Ficha</button>
        <button type="button" class="btn btn-sm" data-ge="editar-empresa" data-id="${geEsc(e.id)}">Editar</button>
        <button type="button" class="btn btn-sm at-perigo" data-ge="excluir-empresa" data-id="${geEsc(e.id)}">Excluir</button>
      </span></div>`).join('')}</div>` : '<div class="ge-vazio">Nenhuma empresa cadastrada.</div>'}
    ${soProjetos.length ? `<details class="ge-antigas"><summary>${soProjetos.length} empresa(s) só dentro de projetos antigos</summary><ul>${soProjetos.map(e => `<li>${geEsc(e.razaoSocial)} <small>${geEsc([e.cnpj, `projeto ${e._projetoNome}`].filter(Boolean).join(' · '))}</small></li>`).join('')}</ul><p class="muted">Elas podem ser usadas nos documentos, mas sem endereço e representante. Cadastre acima para ter os dados completos.</p></details>` : ''}`;
}

/* ---------- escolher o modelo ---------- */
function abrirSeletorModeloGerador(vinculoPre){
  const modelos = getGeradorModelos();
  if (!modelos.length) return showToast('Cadastre um modelo antes de gerar documentos.');
  const uso = geUsoPorModelo();
  const ordenados = modelos.slice().sort((a,b) => (uso[b.id]||0) - (uso[a.id]||0) || a.nome.localeCompare(b.nome,'pt-BR'));
  const contexto = vinculoPre ? rotuloVinculo({ ...vinculoPre, rotulo: (listarRegistrosVinculo(vinculoPre.tipo).find(r => r.id === vinculoPre.id) || {}).rotulo }) : '';
  openModal('Qual documento?', `
    ${contexto ? `<p class="ge-contexto">Para: <b>${geEsc(contexto)}</b></p>` : ''}
    <input type="search" class="input" id="geSelBusca" placeholder="Buscar modelo…" aria-label="Buscar modelo">
    <div class="ge-sel-lista" id="geSelLista">${ordenados.map(m => `<button type="button" class="ge-sel" data-modelo="${geEsc(m.id)}" data-nome="${geEsc(normalizarFiltro(m.nome))}"><strong>${geEsc(m.nome)}</strong><small>${uso[m.id] ? `usado ${uso[m.id]}×` : 'ainda não usado'}${modeloUsaNumeracao(m) ? ` · próximo nº ${espiarProximoNumeroGerador(serieDoModelo(m))}` : ''}</small></button>`).join('')}</div>
    <div class="modal-actions"><button type="button" class="btn btn-ghost" id="geSelCancelar">Cancelar</button></div>`);
  document.getElementById('geSelCancelar').onclick = closeModal;
  document.getElementById('geSelBusca').oninput = e => {
    const q = normalizarFiltro(e.target.value);
    document.querySelectorAll('#geSelLista .ge-sel').forEach(b => { b.hidden = !!q && !b.dataset.nome.includes(q); });
  };
  document.getElementById('geSelLista').onclick = e => {
    const b = e.target.closest('[data-modelo]'); if (b) abrirFormularioGerador(b.dataset.modelo, null, vinculoPre);
  };
  document.getElementById('geSelBusca').focus();
}

/* ---------- preencher (com prévia ao vivo) ---------- */
function abrirFormularioGerador(modeloId, docId, vinculoPre){
  const doc = docId ? getDocumentosGerados().find(d => d.id === docId) : null;
  const modelo = doc
    ? { id: doc.modeloId, nome: doc.modeloNome, titulo: doc.titulo, texto: doc.textoSnapshot, serie: doc.serie, formato: doc.formato, espacamento: doc.espacamento }
    : getGeradorModelos().find(m => m.id === modeloId);
  if (!modelo) return showToast('Modelo não encontrado');

  const textoBase = modelo.texto;
  const variaveis = extrairVariaveis(textoBase);
  const chaves = classificarCamposChave(textoBase);
  const auto = camposAutomaticosGerador({ data: doc ? doc.dataGeracao : todayISO() });
  const faltaConfig = chaves.automaticos.filter(c => c !== 'NUMERO' && !auto[c]);
  const valoresIniciais = doc ? (doc.valores || {}) : {};
  const contextoInicial = doc ? (doc.contexto || {}) : {};
  const vinculoAtual = (doc && doc.vinculo) ? { ...doc.vinculo } : (vinculoPre ? { ...vinculoPre } : {});
  const inst = getInstituicaoConfig();
  const numeroPrevia = doc ? doc.numero : (modeloUsaNumeracao(modelo) ? espiarProximoNumeroGerador(serieDoModelo(modelo)) : '');
  const campos = [...chaves.contexto.map(c => ({ nome:c, tipo:'contexto', valor:contextoInicial[c] })), ...variaveis.map(v => ({ nome:v, tipo:'valor', valor:valoresIniciais[v] }))];
  const campoHTML = (c, i) => `<div class="field full"><label for="geCampo_${i}">${geEsc(geRotuloCampo(c.nome))}</label>${
    GERADOR_CAMPOS_LONGOS.includes(c.nome)
      ? `<textarea id="geCampo_${i}" data-campo="${i}" rows="4">${geEsc(c.valor || '')}</textarea>`
      : `<input type="text" class="input" id="geCampo_${i}" data-campo="${i}" value="${geEsc(c.valor || '')}"${c.nome === 'NOME_ALUNO' ? ' list="geListaAlunos"' : ''}>`}</div>`;

  openModal(doc ? `Editar ${nomeDocumentoGerado(doc)}` : `Novo: ${modelo.nome}${numeroPrevia ? ` nº ${numeroPrevia}` : ''}`, `
    <div class="ge-form">
      <div class="ge-form-campos">
        ${doc ? `<p class="ge-contexto">Salvar cria a <b>versão ${doc.versao + 1}</b>; a atual continua guardada.</p>` : ''}
        ${faltaConfig.length ? `<p class="ge-aviso">⚠ Faltam dados da instituição usados neste modelo: ${faltaConfig.map(c => geEsc(geRotuloCampo(c))).join(', ')}.</p>` : ''}
        <div class="field full ge-vinc"><label for="geVincTipo">Ligar a um registro <small>(preenche os campos sozinho)</small></label>
          <div class="ge-vinc-linha">
            <select id="geVincTipo" class="input"><option value="">Nenhum</option>${GERADOR_TIPOS_VINCULO.map(t => `<option value="${t.tipo}"${vinculoAtual.tipo === t.tipo ? ' selected' : ''}>${t.label}</option>`).join('')}</select>
            <select id="geVincId" class="input"${vinculoAtual.tipo ? '' : ' disabled'}></select>
          </div>
        </div>
        ${campos.length ? `<div class="form-grid">${campos.map(campoHTML).join('')}</div>` : '<p class="muted">Este modelo não tem campos para preencher.</p>'}
        <datalist id="geListaAlunos">${(typeof getAtendAlunos === 'function' ? getAtendAlunos() : []).map(a => `<option value="${geEsc(a.nome)}"></option>`).join('')}</datalist>
        <div class="ge-assin">
          <div class="ge-assin-topo"><span>Assinaturas</span>
            <span>${inst.presidente ? '<button type="button" class="btn btn-sm" id="geAssinPresidente">＋ Presidente</button>' : ''}<button type="button" class="btn btn-sm" id="geAssinNova">＋ Assinatura</button></span></div>
          <div id="geAssinLista"></div>
        </div>
      </div>
      <div class="ge-form-previa"><div class="ge-previa-rotulo">Prévia <small>os campos em amarelo ainda estão vazios</small></div><div class="doc-a4-preview-wrap" id="gePrevia"></div></div>
    </div>
    <div class="modal-actions">
      <button type="button" class="btn btn-ghost" id="geFormCancelar">Cancelar</button>
      <button type="button" class="btn btn-primary" id="geFormGerar">${doc ? `Salvar versão ${doc.versao + 1}` : 'Gerar documento'}</button>
    </div>`);

  const $ = id => document.getElementById(id);
  let assinaturas = doc ? (doc.assinaturas || []).map(l => [...l]) : [];
  const desenharAssin = () => {
    $('geAssinLista').innerHTML = assinaturas.map((linhas, i) => `<div class="ge-assin-bloco">
      <textarea rows="2" data-assin="${i}" placeholder="Nome&#10;Cargo" aria-label="Assinatura ${i+1}">${geEsc(linhas.join('\n'))}</textarea>
      <button type="button" class="btn btn-sm at-perigo" data-assin-remover="${i}" aria-label="Remover assinatura">✕</button></div>`).join('') || '<p class="ge-nada">Sem assinatura.</p>';
  };
  desenharAssin();
  $('geAssinNova').onclick = () => { assinaturas.push(['']); desenharAssin(); atualizarPrevia(); $('geAssinLista').querySelector('textarea:last-of-type')?.focus(); };
  if ($('geAssinPresidente')) $('geAssinPresidente').onclick = () => { assinaturas.push([inst.presidente, 'Presidente']); desenharAssin(); atualizarPrevia(); };
  $('geAssinLista').addEventListener('input', e => { if (e.target.dataset.assin !== undefined) { assinaturas[+e.target.dataset.assin] = e.target.value.split('\n'); atualizarPrevia(); } });
  $('geAssinLista').addEventListener('click', e => { const b = e.target.closest('[data-assin-remover]'); if (b) { assinaturas.splice(+b.dataset.assinRemover, 1); desenharAssin(); atualizarPrevia(); } });

  const ler = () => {
    const valores = {}, contexto = {};
    campos.forEach((c, i) => { const v = $(`geCampo_${i}`).value.trim(); if (c.tipo === 'valor') valores[c.nome] = v; else contexto[c.nome] = v; });
    const assin = assinaturas.map(l => l.map(t => t.trim()).filter(Boolean)).filter(l => l.length);
    return { valores, contexto, assinaturas: assin };
  };

  let previaGen = 0, previaTimer = null;
  const atualizarPrevia = () => {
    clearTimeout(previaTimer);
    previaTimer = setTimeout(async () => {
      const minha = ++previaGen;
      const dados = ler();
      const html = await montarHTMLDocumentoGerado({ titulo: modelo.titulo || modelo.nome, modeloNome: modelo.nome, formato: modelo.formato, espacamento: modelo.espacamento,
        textoSnapshot: textoBase, dataGeracao: doc ? doc.dataGeracao : todayISO(), numero: numeroPrevia, ...dados });
      if (minha !== previaGen || !$('gePrevia')) return;
      $('gePrevia').innerHTML = html.replace(/\[([A-ZÀ-Ú0-9_ ]+)\]/g, '<mark class="ge-falta">[$1]</mark>').replace(/\{([A-ZÀ-Ú0-9_]+)\}/g, '<mark class="ge-falta">{$1}</mark>');
    }, 180);
  };
  document.querySelector('.ge-form-campos').addEventListener('input', atualizarPrevia);

  /* vínculo: lista de registros + preenche só o que está vazio */
  const selTipo = $('geVincTipo'), selId = $('geVincId');
  const preencherLista = () => {
    const regs = listarRegistrosVinculo(selTipo.value);
    selId.disabled = !selTipo.value;
    selId.innerHTML = !selTipo.value ? '<option value="">—</option>'
      : regs.length ? `<option value="">Escolha…</option>${regs.map(r => `<option value="${geEsc(r.id)}"${vinculoAtual.id === r.id ? ' selected' : ''}>${geEsc(r.rotulo)}</option>`).join('')}`
      : '<option value="">Nenhum registro</option>';
  };
  const aplicarVinculo = () => {
    if (!selTipo.value || !selId.value) return;
    const dados = dadosDoVinculo({ tipo: selTipo.value, id: selId.value });
    let n = 0;
    campos.forEach((c, i) => { const el = $(`geCampo_${i}`); if (el && !el.value.trim() && dados[c.nome]) { el.value = dados[c.nome]; n++; } });
    if (n) showToast(`✓ ${n} campo(s) preenchido(s) com os dados do registro.`);
    atualizarPrevia();
  };
  selTipo.onchange = () => { vinculoAtual.id = ''; preencherLista(); };
  selId.onchange = aplicarVinculo;
  preencherLista();
  if (vinculoPre && vinculoPre.id && !doc) aplicarVinculo(); else atualizarPrevia();

  $('geFormCancelar').onclick = closeModal;
  $('geFormGerar').onclick = () => {
    const dados = ler();
    const vinculo = selTipo.value && selId.value ? { tipo: selTipo.value, id: selId.value, rotulo: selId.options[selId.selectedIndex].text } : null;
    const salvar = () => {
      const salvo = doc ? salvarNovaVersaoDocumento(doc.id, { ...dados, vinculo }) : salvarDocumentoGerado(modelo, { ...dados, vinculo });
      closeModal();
      showToast(doc ? `✓ Versão ${salvo.versao} salva.` : `✓ ${nomeDocumentoGerado(salvo)} gerado.`);
      abrirDetalheDocumentoGerado(salvo.id);
    };
    const vazios = campos.filter((c, i) => !$(`geCampo_${i}`).value.trim()).map(c => geRotuloCampo(c.nome));
    if (vazios.length) confirmAction(`${vazios.length} campo(s) ficaram vazios: ${vazios.join(', ')}. Eles vão aparecer entre colchetes no documento. ${doc ? 'Salvar' : 'Gerar'} mesmo assim?`, salvar);
    else salvar();
  };
}

/* ---------- anexos ---------- */
async function geAnexar(id, arquivos){
  if (!arquivos.length) return;
  showToast('Salvando anexo(s)…');
  const novos = [];
  for (const f of arquivos) { const ref = await salvarAnexo(f, 'documento-gerado'); if (ref) novos.push(ref); }
  if (!novos.length) return;
  const atual = DB.getById('gerador-documentos', id);
  DB.update('gerador-documentos', id, { anexos: [...(atual.anexos || []), ...novos] });
  registrarHistorico({ modulo: 'gerador-documentos', acao: 'anexo', descricao: `${novos.length} anexo(s) adicionado(s) em "${nomeDocumentoGerado(atual)}".`, refId: id });
  showToast(`✓ ${novos.length} anexo(s) salvo(s).`);
  renderGeradorDocumentos();
}
function geRemoverAnexo(id, anexoId){
  const doc = DB.getById('gerador-documentos', id);
  const anexo = (doc.anexos || []).find(a => a.id === anexoId); if (!anexo) return;
  confirmAction(`Remover o anexo "${anexo.nome}"?`, () => {
    DB.update('gerador-documentos', id, { anexos: doc.anexos.filter(a => a.id !== anexoId) });
    ProjectFiles.remove(anexoId).catch(() => {});
    showToast('Anexo removido.');
    renderGeradorDocumentos();
  });
}

/* ---------- despachante ---------- */
async function geHTMLDoc(id){
  if (geHTMLPronto.id === id && geHTMLPronto.html) return geHTMLPronto.html;
  return montarHTMLDocumentoGerado(DB.getById('gerador-documentos', id));
}
const GE_ACOES = {
  'aba': b => { geEstado.aba = b.dataset.valor; renderGeradorDocumentos(); },
  'filtro-modelo': b => { geEstado.modelo = b.dataset.valor; renderGeradorDocumentos(); },
  'doc': b => { geEstado.sel = b.dataset.id; renderGeradorDocumentos(); if (window.innerWidth <= 1100) document.getElementById('geRoot').scrollIntoView({ block:'start' }); },
  'fechar': () => { geEstado.sel = null; renderGeradorDocumentos(); },
  'novo-doc': () => abrirSeletorModeloGerador(),
  'instituicao': () => abrirConfigInstituicao(),
  'ver': b => abrirDocumentoGerado(b.dataset.id),
  'versao': b => { const d = DB.getById('gerador-documentos', b.dataset.id); const v = (d.versoes || []).find(x => String(x.versao) === b.dataset.versao); if (v) abrirDocumentoGerado(d.id, v); },
  'pdf': async b => { const d = DB.getById('gerador-documentos', b.dataset.id); salvarPdfGerador(await geHTMLDoc(d.id), nomeDocumentoGerado(d)); },
  'imprimir': async b => { const d = DB.getById('gerador-documentos', b.dataset.id); imprimirDocumentoGerador(await geHTMLDoc(d.id), nomeDocumentoGerado(d)); },
  'editar': b => abrirFormularioGerador(null, b.dataset.id),
  'duplicar': b => duplicarDocumentoGerado(b.dataset.id),
  'excluir': b => excluirDocumentoGerado(b.dataset.id),
  'vinculo': b => abrirRegistroVinculado(DB.getById('gerador-documentos', b.dataset.id).vinculo),
  'anexo-baixar': b => baixarAnexo(b.dataset.anexo),
  'anexo-remover': b => geRemoverAnexo(b.dataset.id, b.dataset.anexo),
  'novo-modelo': () => abrirModalModeloGerador(),
  'usar': b => abrirFormularioGerador(b.dataset.id),
  'editar-modelo': b => abrirModalModeloGerador(b.dataset.id),
  'duplicar-modelo': b => duplicarModeloGerador(b.dataset.id),
  'excluir-modelo': b => excluirModeloGerador(b.dataset.id),
  'nova-empresa': () => abrirFormEmpresaGerador(),
  'gerar-empresa': b => abrirSeletorModeloGerador({ tipo:'empresa', id:b.dataset.id }),
  'ficha-empresa': b => abrirFichaEmpresaGlobal(b.dataset.id),
  'editar-empresa': b => abrirFormEmpresaGerador(b.dataset.id),
  'excluir-empresa': b => excluirEmpresaGerador(b.dataset.id)
};

(function ligarGerador(){
  const root = document.getElementById('geRoot'); if (!root) return;
  root.addEventListener('click', e => {
    const b = e.target.closest('[data-ge]'); if (!b || !root.contains(b)) return;
    GE_ACOES[b.dataset.ge]?.(b);
  });
  root.addEventListener('input', e => { if (e.target.id === 'geBusca') { geEstado.busca = e.target.value; renderGeradorDocumentos(); } });
  root.addEventListener('change', e => { if (e.target.id === 'geAnexoInput') { geAnexar(e.target.dataset.id, [...e.target.files]); e.target.value = ''; } });
})();

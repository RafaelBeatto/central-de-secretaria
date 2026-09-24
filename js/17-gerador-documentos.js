/* ---------------------------------------------------------
   17. GERADOR DE DOCUMENTOS
   Aba independente: cabeçalho/rodapé institucional configurável
   uma única vez + modelos de texto com variáveis no formato
   [NOME], [CPF], [VALOR], [DATA] substituídas por um formulário.
   Reaproveita: DB/STORAGE_KEYS (01-core.js), ProjectFiles/salvarAnexo
   (04-projetos.js), escapeHTML/showToast/confirmAction/openModal
   (01-core.js e 03-dashboard.js).
   --------------------------------------------------------- */

/* -----------------------------------------------------------
   17.1 DADOS INSTITUCIONAIS (cabeçalho/rodapé padrão)
   Guardados em DB.getConfig().instituicao — reaproveita o mesmo
   objeto de configuração já usado por tema, contadores etc.
   A logo (imagem) fica no IndexedDB via ProjectFiles/salvarAnexo;
   só a referência leve {id,nome,tipo,tamanho} fica na config.
   ----------------------------------------------------------- */
function getInstituicaoConfig(){
  const cfg = DB.getConfig();
  return cfg.instituicao || {
    nome: '', cnpj: '', endereco: '', telefone: '', email: '', cidadeUf: '', site: '',
    presidente: '', cpfPresidente: '',
    rodape: '', rodapeCampos: {}, rodapeMostrarPagina: false, logoRef: null
  };
}
function salvarInstituicaoConfig(dados){
  const cfg = DB.getConfig();
  cfg.instituicao = { ...getInstituicaoConfig(), ...dados };
  DB.saveConfig(cfg);
  return cfg.instituicao;
}

async function abrirConfigInstituicao(){
  const inst = getInstituicaoConfig();
  const logo = inst.logoRef ? await ProjectFiles.get(inst.logoRef.id).catch(() => null) : null;
  const logoPreviewUrl = logo && logo.blob ? URL.createObjectURL(logo.blob) : null;

  openModal('Dados da instituição (cabeçalho e rodapé)', `
    <p class="muted" style="margin-bottom:10px">Configurados uma única vez e aplicados automaticamente em todos os documentos gerados.</p>
    <div class="form-group">
      <label>Logo da instituição:</label>
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:6px">
        <div id="geradorLogoPreview" style="width:64px;height:64px;border:1px solid var(--border);border-radius:8px;display:flex;align-items:center;justify-content:center;overflow:hidden;background:var(--surface)">
          ${logoPreviewUrl ? `<img src="${logoPreviewUrl}" alt="Logo" style="max-width:100%;max-height:100%">` : '<span class="muted" style="font-size:11px">Sem logo</span>'}
        </div>
        <input type="file" id="geradorLogoInput" accept="image/*" class="input">
      </div>
    </div>
    <label>Nome da instituição:</label>
    <input type="text" id="giNome" class="input" placeholder="Ex: APAE de Corumbiara" value="${escapeHTML(inst.nome)}">
    <label>CNPJ:</label>
    <input type="text" id="giCnpj" class="input" placeholder="00.000.000/0000-00" value="${escapeHTML(inst.cnpj)}">
    <label>Endereço:</label>
    <input type="text" id="giEndereco" class="input" placeholder="Rua, número, bairro" value="${escapeHTML(inst.endereco)}">
    <label>Telefone:</label>
    <input type="text" id="giTelefone" class="input" placeholder="(00) 0000-0000" value="${escapeHTML(inst.telefone)}">
    <label>E-mail:</label>
    <input type="text" id="giEmail" class="input" placeholder="contato@instituicao.org" value="${escapeHTML(inst.email)}">
    <label>Cidade/UF:</label>
    <input type="text" id="giCidadeUf" class="input" placeholder="Corumbiara/RO" value="${escapeHTML(inst.cidadeUf)}">
    <label>Presidente / representante legal:</label>
    <input type="text" id="giPresidente" class="input" placeholder="Nome do presidente" value="${escapeHTML(inst.presidente || '')}">
    <label>CPF do presidente:</label>
    <input type="text" id="giCpfPresidente" class="input" placeholder="000.000.000-00" value="${escapeHTML(inst.cpfPresidente || '')}">
    <label>Site:</label>
    <input type="text" id="giSite" class="input" placeholder="www.instituicao.org.br" value="${escapeHTML(inst.site || '')}">

    <label style="margin-top:14px;display:block"><b>Rodapé dos documentos</b></label>
    <div class="checklist-edit" style="margin-bottom:8px">
      ${[['endereco','Endereço'],['telefone','Telefone'],['email','E-mail'],['site','Site']].map(([k, rotulo]) => `
        <div class="checklist-edit-row">
          <input type="checkbox" id="giRod_${k}" data-rodape-campo="${k}" ${(inst.rodapeCampos || {})[k] ? 'checked' : ''}>
          <label for="giRod_${k}" style="flex:1">Incluir ${rotulo} no rodapé</label>
        </div>`).join('')}
      <div class="checklist-edit-row">
        <input type="checkbox" id="giRodPagina" ${inst.rodapeMostrarPagina ? 'checked' : ''}>
        <label for="giRodPagina" style="flex:1">Mostrar “Página X de Y” no PDF</label>
      </div>
    </div>
    <label>Outras informações do rodapé (texto livre):</label>
    <textarea id="giRodape" class="input" style="height:70px" placeholder="Ex: Utilidade Pública Municipal – Lei nº 000/0000">${escapeHTML(inst.rodape)}</textarea>

    <div class="modal-actions" style="margin-top:20px">
      <button type="button" class="btn btn-ghost" id="btnCancelarInstituicao">Cancelar</button>
      <button type="button" class="btn btn-primary" id="btnSalvarInstituicao">Salvar</button>
    </div>
  `);

  let novoLogoFile = null;
  document.getElementById('geradorLogoInput').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    novoLogoFile = file;
    const preview = document.getElementById('geradorLogoPreview');
    preview.innerHTML = `<img src="${URL.createObjectURL(file)}" alt="Logo" style="max-width:100%;max-height:100%">`;
  });

  document.getElementById('btnCancelarInstituicao').addEventListener('click', closeModal);
  document.getElementById('btnSalvarInstituicao').addEventListener('click', async () => {
    const dados = {
      nome: document.getElementById('giNome').value.trim(),
      cnpj: document.getElementById('giCnpj').value.trim(),
      endereco: document.getElementById('giEndereco').value.trim(),
      telefone: document.getElementById('giTelefone').value.trim(),
      email: document.getElementById('giEmail').value.trim(),
      cidadeUf: document.getElementById('giCidadeUf').value.trim(),
      presidente: document.getElementById('giPresidente').value.trim(),
      cpfPresidente: document.getElementById('giCpfPresidente').value.trim(),
      site: document.getElementById('giSite').value.trim(),
      rodapeCampos: Object.fromEntries([...document.querySelectorAll('[data-rodape-campo]')].map(cb => [cb.dataset.rodapeCampo, cb.checked])),
      rodapeMostrarPagina: document.getElementById('giRodPagina').checked,
      rodape: document.getElementById('giRodape').value.trim()
    };
    if (novoLogoFile) {
      const ref = await salvarAnexo(novoLogoFile, 'logo-instituicao');
      if (ref) dados.logoRef = ref;
    }
    salvarInstituicaoConfig(dados);
    closeModal();
    showToast('✓ Dados da instituição salvos.');
    if (typeof renderGeradorDocumentos === 'function') renderGeradorDocumentos();
  });
}

/* HTML do cabeçalho/rodapé, montado a partir da config institucional
   e usado tanto na miniatura quanto no documento final gerado. */
async function montarCabecalhoInstitucionalHTML(){
  const inst = getInstituicaoConfig();
  let logoImgHTML = '';
  if (inst.logoRef) {
    try {
      const registro = await ProjectFiles.get(inst.logoRef.id);
      if (registro && registro.blob) {
        const dataUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(registro.blob);
        });
        logoImgHTML = `<img src="${dataUrl}" alt="Logo" style="max-height:70px;max-width:140px;object-fit:contain">`;
      }
    } catch (e) { /* logo indisponível: segue sem imagem */ }
  }
  return `
    <div class="doc-a4-cabecalho">
      ${logoImgHTML ? `<div class="doc-a4-logo">${logoImgHTML}</div>` : ''}
      <div class="doc-a4-inst-info">
        <strong>${escapeHTML(inst.nome || 'Instituição não configurada')}</strong>
        ${inst.cnpj ? `<span>CNPJ: ${escapeHTML(inst.cnpj)}</span>` : ''}
        ${inst.endereco ? `<span>${escapeHTML(inst.endereco)}</span>` : ''}
        ${[inst.telefone, inst.email].filter(Boolean).map(escapeHTML).join(' · ') ? `<span>${[inst.telefone, inst.email].filter(Boolean).map(escapeHTML).join(' · ')}</span>` : ''}
      </div>
    </div>`;
}
function montarRodapeInstitucionalHTML(){
  const inst = getInstituicaoConfig();
  const marcados = inst.rodapeCampos || {};
  const partes = [];
  if (marcados.endereco && inst.endereco) partes.push(inst.endereco);
  if (marcados.telefone && inst.telefone) partes.push(inst.telefone);
  if (marcados.email && inst.email) partes.push(inst.email);
  if (marcados.site && inst.site) partes.push(inst.site);

  const linhaCampos = partes.map(escapeHTML).join(' · ');
  const textoLivre = inst.rodape ? escapeHTML(inst.rodape).replace(/\n/g, '<br>') : '';
  if (!linhaCampos && !textoLivre) return '';
  return `<div class="doc-a4-rodape">${[textoLivre, linhaCampos].filter(Boolean).join('<br>')}</div>`;
}

/* -----------------------------------------------------------
   17.2 MODELOS DO GERADOR (sintaxe de variável: [CAMPO])
   Entidade separada de 'modelos-documentos' (módulo "Modelos"
   já existente) para não alterar nem misturar com ele.
   ----------------------------------------------------------- */
const GERADOR_MODELO_INICIAL = {
  id: 'ger-termo-apadrinhamento',
  nome: 'Termo de Apadrinhamento',
  titulo: 'TERMO DE APADRINHAMENTO',
  texto: 'Pelo presente instrumento, a instituição declara que [NOME], portador(a) do CPF [CPF], realizou um apadrinhamento no valor de [VALOR], na data de [DATA].\n\nPor ser verdade, firma-se o presente documento.\n\n[DATA].',
  padrao: true
};

/* -----------------------------------------------------------
   17.2-A MODELOS PRONTOS
   Dez modelos institucionais prontos para uso. Usam duas
   sintaxes de campo:
     {CAMPO} = preenchido automaticamente pelo sistema
               (dados da instituição, data, numeração)
     [CAMPO] = preenchido manualmente no formulário
   A propriedade "serie" controla a numeração automática
   sequencial por ano (ver proximoNumeroGerador).
   ----------------------------------------------------------- */
const GERADOR_MODELOS_PRONTOS = [
  {
    id: 'ger-oficio', nome: 'Ofício', titulo: 'OFÍCIO', serie: 'Ofício', padrao: false,
    texto: 'Ofício nº {NUMERO}\n\nAo(À) Senhor(a) [DESTINATARIO]\n[CARGO_DESTINATARIO]\n[ORGAO_DESTINATARIO]\n\nAssunto: [ASSUNTO]\n\nSenhor(a) [DESTINATARIO],\n\n[TEXTO]\n\nSem mais para o momento, colocamo-nos à disposição para os esclarecimentos que se fizerem necessários.\n\nAtenciosamente,\n\n{DATA}'
  },
  {
    id: 'ger-declaracao', nome: 'Declaração', titulo: 'DECLARAÇÃO', serie: 'Declaração', padrao: false,
    texto: '{NOME_APAE}, inscrita no CNPJ sob o nº {CNPJ_APAE}, com sede em {ENDERECO_APAE}, DECLARA para os devidos fins que [NOME], portador(a) do CPF nº [CPF], [TEXTO].\n\nPor ser expressão da verdade, firmamos a presente declaração.\n\n{DATA}'
  },
  {
    id: 'ger-memorando', nome: 'Memorando', titulo: 'MEMORANDO', serie: 'Memorando', padrao: false,
    texto: 'Memorando nº {NUMERO}\n\nDe: [SETOR_ORIGEM]\nPara: [SETOR_DESTINO]\nAssunto: [ASSUNTO]\n\n[TEXTO]\n\n{DATA}'
  },
  {
    id: 'ger-convocacao', nome: 'Convocação', titulo: 'CONVOCAÇÃO', serie: 'Convocação', padrao: false,
    texto: 'Convocação nº {NUMERO}\n\n{NOME_APAE}, inscrita no CNPJ sob o nº {CNPJ_APAE}, convoca [CONVOCADOS] para [FINALIDADE], a realizar-se no dia [DATA_EVENTO], às [HORARIO], no(a) [LOCAL].\n\nPauta:\n[PAUTA]\n\nContamos com a presença de todos.\n\n{DATA}'
  },
  {
    id: 'ger-solicitacao', nome: 'Solicitação', titulo: 'SOLICITAÇÃO', serie: 'Solicitação', padrao: false,
    texto: 'Solicitação nº {NUMERO}\n\nAo(À) [DESTINATARIO]\n\nAssunto: [ASSUNTO]\n\n{NOME_APAE}, inscrita no CNPJ sob o nº {CNPJ_APAE}, vem por meio deste solicitar [OBJETO].\n\nJustificativa:\n[JUSTIFICATIVA]\n\nNo aguardo de retorno, agradecemos antecipadamente.\n\n{DATA}'
  },
  {
    id: 'ger-ata', nome: 'Ata', titulo: 'ATA DE REUNIÃO', serie: 'Ata', padrao: false,
    texto: 'Ata nº {NUMERO}\n\nAos [DIA] dias do mês de [MES] do ano de {ANO}, às [HORARIO], no(a) [LOCAL], reuniram-se os membros de {NOME_APAE} para tratar de [FINALIDADE].\n\nPresentes:\n[PRESENTES]\n\nOrdem do dia:\n[PAUTA]\n\nDeliberações:\n[DELIBERACOES]\n\nNada mais havendo a tratar, foi encerrada a reunião e lavrada a presente ata, que segue assinada pelos presentes.\n\n{DATA}'
  },
  {
    id: 'ger-termo', nome: 'Termo', titulo: 'TERMO', serie: 'Termo', padrao: false,
    texto: 'Termo nº {NUMERO}\n\nPelo presente termo, {NOME_APAE}, inscrita no CNPJ sob o nº {CNPJ_APAE}, com sede em {ENDERECO_APAE}, neste ato representada por {PRESIDENTE}, portador(a) do CPF nº {CPF_PRESIDENTE}, e [NOME], portador(a) do CPF nº [CPF], firmam o presente termo de [OBJETO], nos seguintes termos:\n\n[CLAUSULAS]\n\nE por estarem de pleno acordo, firmam o presente termo.\n\n{DATA}'
  },
  {
    id: 'ger-comunicado', nome: 'Comunicado', titulo: 'COMUNICADO', serie: 'Comunicado', padrao: false,
    texto: 'Comunicado nº {NUMERO}\n\n{NOME_APAE} comunica a [DESTINATARIOS] que:\n\n[TEXTO]\n\nPara mais informações, entre em contato pelo telefone {TELEFONE_APAE}.\n\n{DATA}'
  },
  {
    id: 'ger-recibo', nome: 'Recibo', titulo: 'RECIBO', serie: 'Recibo', padrao: false,
    texto: 'Recibo nº {NUMERO}\n\nRecebemos de [NOME], portador(a) do CPF/CNPJ nº [CPF_CNPJ], a importância de {VALOR} ([VALOR_POR_EXTENSO]), referente a [REFERENTE].\n\nPara clareza, firmamos o presente recibo.\n\n{DATA}'
  },
  {
    id: 'ger-relatorio', nome: 'Relatório', titulo: 'RELATÓRIO', serie: 'Relatório', padrao: false,
    texto: 'Relatório nº {NUMERO}\n\nPeríodo: [PERIODO]\nResponsável: [RESPONSAVEL]\n\n1. OBJETIVO\n[OBJETIVO]\n\n2. ATIVIDADES REALIZADAS\n[ATIVIDADES]\n\n3. RESULTADOS\n[RESULTADOS]\n\n4. CONSIDERAÇÕES FINAIS\n[CONSIDERACOES]\n\n{DATA}'
  }
];

/* Logo padrão da APAE Corumbiara, embutida em base64 para já vir
   pronta na primeira vez que o sistema é usado (ver seedInstituicaoPadrao). */
const LOGO_APAE_PADRAO_B64 = 'data:image/png;base64,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';

async function seedInstituicaoPadrao(){
  const cfg = DB.getConfig();
  if (cfg.instituicao && cfg.instituicao.nome) return; // já preenchido pelo usuário ou por seed anterior
  let logoRef = null;
  try {
    const resp = await fetch(LOGO_APAE_PADRAO_B64);
    const blob = await resp.blob();
    const file = new File([blob], 'logo-apae.png', { type: 'image/png' });
    logoRef = await salvarAnexo(file, 'logo-instituicao');
  } catch (e) { /* segue sem logo se falhar */ }
  salvarInstituicaoConfig({
    nome: 'APAE – Associação de Pais e Amigos dos Excepcionais de Corumbiara',
    cnpj: '58.725.225/0001-95',
    endereco: 'Avenida Antônio Novais, 2395 – Centro',
    telefone: '(69) 99374-2225',
    email: 'apaecorumbiara@gmail.com',
    cidadeUf: 'Corumbiara/RO',
    rodape: '',
    logoRef
  });
}

/* Correção pontual: uma versão anterior gravava um texto padrão no
   rodapé institucional. Remove esse valor específico se encontrado,
   sem mexer em rodapé que o usuário tenha escrito por conta própria. */
function limparRodapeAutomaticoAntigo(){
  const cfg = DB.getConfig();
  const antigo = 'APAE DE CORUMBIARA\nAvenida Antônio Novais, 2395 – Centro | (69) 99374-2225 | apaecorumbiara@gmail.com';
  if (cfg.instituicao && cfg.instituicao.rodape === antigo) {
    salvarInstituicaoConfig({ rodape: '' });
  }
}

/* Acrescenta os dez modelos prontos uma única vez, sem tocar nos
   modelos que o usuário já criou ou editou. O marcador na config
   garante que um modelo pronto excluído de propósito não volte. */
function seedModelosProntos(){
  const cfg = DB.getConfig();
  if (cfg.geradorModelosProntosV1) return;
  const atuais = DB.getAll('gerador-modelos');
  const existentes = new Set(atuais.map(m => m && m.id));
  const novos = GERADOR_MODELOS_PRONTOS.filter(m => !existentes.has(m.id));
  if (novos.length) DB.saveAll('gerador-modelos', [...atuais, ...novos]);
  cfg.geradorModelosProntosV1 = true;
  DB.saveConfig(cfg);
}

/* A aba "Modelos" (antigo 16-modelos-documentos.js) foi incorporada a
   esta. Os modelos que o usuário criou lá ({{ campo }} em HTML) são
   copiados para cá uma única vez, como [CAMPO]. A coleção antiga
   'modelos-documentos' não é apagada (continua no backup). A "Carta",
   único modelo pronto de lá que não existia aqui, entra também. */
const GERADOR_MODELO_CARTA = {
  id: 'ger-carta', nome: 'Carta', titulo: 'CARTA', serie: '', padrao: false,
  texto: '{CIDADE_UF}, {DATA}\n\n[DESTINATARIO]\n[ENDERECO_DESTINATARIO]\n\nPrezado(a) [TRATAMENTO],\n\n[TEXTO]\n\nAtenciosamente,'
};
function incorporarModelosAntigos(){
  const cfg = DB.getConfig();
  cfg.migracoes = cfg.migracoes || {};
  if (cfg.migracoes.modelosParaGerador) return 0;
  const atuais = DB.getAll('gerador-modelos');
  const ids = new Set(atuais.map(m => m && m.id));
  const novos = [];
  if (!ids.has(GERADOR_MODELO_CARTA.id)) novos.push({ ...GERADOR_MODELO_CARTA });
  (DB.getAll('modelos-documentos') || [])
    .filter(m => m && typeof m.nome === 'string' && m.template && Array.isArray(m.campos))
    .forEach(m => {
      const id = `ger-de-${m.id}`;
      if (ids.has(id)) return;
      let texto = String(m.template);
      m.campos.forEach(campo => {
        const nomeVar = String(campo).trim().toUpperCase().replace(/[^A-ZÀ-Ú0-9_ ]/g, '_');
        const marcador = new RegExp('\\{\\{\\s*' + String(campo).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*\\}\\}', 'g');
        texto = texto.replace(marcador, `[${nomeVar}]`);
      });
      novos.push({ id, nome: m.nome, titulo: m.nome.toUpperCase(), serie: '', texto, formato: 'html', padrao: false, criadoEm: Date.now(), origem: 'modelos' });
    });
  if (novos.length) DB.saveAll('gerador-modelos', [...atuais, ...novos]);
  cfg.migracoes.modelosParaGerador = true;
  DB.saveConfig(cfg);
  return novos.length;
}

function initGeradorDocumentos(){
  if (!DB.getAll('gerador-modelos').length) {
    DB.saveAll('gerador-modelos', [GERADOR_MODELO_INICIAL]);
  }
  seedModelosProntos();
  incorporarModelosAntigos();
  seedInstituicaoPadrao();
  limparRodapeAutomaticoAntigo();
}

function getGeradorModelos(){
  return DB.getAll('gerador-modelos').filter(m => m && typeof m.nome === 'string' && typeof m.texto === 'string');
}

/* Extrai variáveis [CAMPO] do texto, na ordem de primeira aparição, sem repetir. */
function extrairVariaveis(texto){
  const encontradas = [];
  const regex = /\[([A-ZÀ-Ú0-9_ ]+)\]/g;
  let m;
  while ((m = regex.exec(texto || '')) !== null) {
    const nome = m[1].trim();
    if (nome && !encontradas.includes(nome)) encontradas.push(nome);
  }
  return encontradas;
}

function substituirVariaveis(texto, valores){
  let resultado = texto || '';
  Object.entries(valores).forEach(([campo, valor]) => {
    const marcador = new RegExp('\\[' + campo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\]', 'g');
    resultado = resultado.replace(marcador, escapeHTML(valor || `[${campo}]`));
  });
  return resultado;
}

/* -----------------------------------------------------------
   17.2-A2 EDITOR DE TEXTO (tipo Word)
   Editor contenteditable com barra de formatação. Modelos criados
   no editor ganham formato:'html'; os antigos, em texto puro,
   continuam sendo renderizados como antes (escape + quebras \n).
   ----------------------------------------------------------- */
function modeloEhHTML(modelo){
  return !!(modelo && modelo.formato === 'html');
}

/* Remove o que não deve entrar num documento (script, iframe,
   handlers on*, javascript:) preservando a formatação do texto. */
function sanitizarHTMLDocumento(html){
  const tmp = document.createElement('div');
  tmp.innerHTML = html || '';
  tmp.querySelectorAll('script,iframe,object,embed,link,meta,style,form,input,button').forEach(el => el.remove());
  tmp.querySelectorAll('*').forEach(el => {
    [...el.attributes].forEach(attr => {
      const nome = attr.name.toLowerCase();
      const valor = (attr.value || '').toLowerCase().replace(/\s/g, '');
      if (nome.startsWith('on')) el.removeAttribute(attr.name);
      else if ((nome === 'href' || nome === 'src') && valor.startsWith('javascript:')) el.removeAttribute(attr.name);
    });
  });
  return tmp.innerHTML;
}

const GERADOR_TAMANHOS_FONTE = [
  { v: '1', label: '8 pt' }, { v: '2', label: '10 pt' }, { v: '3', label: '12 pt' },
  { v: '4', label: '14 pt' }, { v: '5', label: '18 pt' }, { v: '6', label: '24 pt' }, { v: '7', label: '36 pt' }
];

function barraEditorHTML(){
  return `
    <div class="ger-editor-barra" style="display:flex;flex-wrap:wrap;gap:4px;padding:6px;border:1px solid var(--border);border-bottom:none;border-radius:6px 6px 0 0;background:var(--surface)">
      <button type="button" class="btn btn-sm btn-ghost" data-cmd="bold" title="Negrito"><b>N</b></button>
      <button type="button" class="btn btn-sm btn-ghost" data-cmd="italic" title="Itálico"><i>I</i></button>
      <button type="button" class="btn btn-sm btn-ghost" data-cmd="underline" title="Sublinhado"><u>S</u></button>
      <select class="input ger-editor-select" data-cmd="formatBlock" title="Título" style="width:auto;padding:2px 6px">
        <option value="">Texto normal</option>
        <option value="h1">Título 1</option>
        <option value="h2">Título 2</option>
        <option value="h3">Título 3</option>
      </select>
      <select class="input ger-editor-select" data-cmd="fontSize" title="Tamanho da fonte" style="width:auto;padding:2px 6px">
        <option value="">Tamanho</option>
        ${GERADOR_TAMANHOS_FONTE.map(t => `<option value="${t.v}">${t.label}</option>`).join('')}
      </select>
      <button type="button" class="btn btn-sm btn-ghost" data-cmd="justifyLeft" title="Alinhar à esquerda">⯇</button>
      <button type="button" class="btn btn-sm btn-ghost" data-cmd="justifyCenter" title="Centralizar">≡</button>
      <button type="button" class="btn btn-sm btn-ghost" data-cmd="justifyRight" title="Alinhar à direita">⯈</button>
      <button type="button" class="btn btn-sm btn-ghost" data-cmd="justifyFull" title="Justificar">☰</button>
      <button type="button" class="btn btn-sm btn-ghost" data-cmd="insertUnorderedList" title="Lista com marcadores">• Lista</button>
      <button type="button" class="btn btn-sm btn-ghost" data-cmd="insertOrderedList" title="Lista numerada">1. Lista</button>
      <button type="button" class="btn btn-sm btn-ghost" data-ger-editor="tabela" title="Inserir tabela">▦ Tabela</button>
      <button type="button" class="btn btn-sm btn-ghost" data-ger-editor="quebra" title="Quebra de página">⤓ Quebra</button>
      <select class="input" data-ger-editor="espacamento" title="Espaçamento entre linhas" style="width:auto;padding:2px 6px">
        <option value="1.5">Espaçamento 1,5</option>
        <option value="1">Simples</option>
        <option value="1.8">1,8</option>
        <option value="2">Duplo</option>
      </select>
      <button type="button" class="btn btn-sm btn-ghost" data-cmd="removeFormat" title="Limpar formatação">✕ Formato</button>
    </div>`;
}

/* Liga a barra ao contenteditable. Devolve funções de leitura. */
function ativarEditorGerador(idEditor, espacamentoInicial){
  const editor = document.getElementById(idEditor);
  if (!editor) return null;
  const barra = editor.parentElement.querySelector('.ger-editor-barra');
  let espacamento = espacamentoInicial || '1.5';
  editor.style.lineHeight = espacamento;

  try { document.execCommand('styleWithCSS', false, true); } catch (e) {}

  const exec = (cmd, valor) => {
    editor.focus();
    try { document.execCommand(cmd, false, valor || null); } catch (e) {}
  };

  barra.querySelectorAll('[data-cmd]').forEach(el => {
    if (el.tagName === 'SELECT') {
      el.addEventListener('change', () => {
        if (el.value) exec(el.dataset.cmd, el.dataset.cmd === 'formatBlock' ? `<${el.value}>` : el.value);
        else if (el.dataset.cmd === 'formatBlock') exec('formatBlock', '<p>');
        el.selectedIndex = 0;
      });
    } else {
      el.addEventListener('click', (ev) => { ev.preventDefault(); exec(el.dataset.cmd); });
    }
  });

  barra.querySelector('[data-ger-editor="quebra"]').addEventListener('click', (ev) => {
    ev.preventDefault();
    exec('insertHTML', '<div class="doc-quebra-pagina"></div><p><br></p>');
  });

  barra.querySelector('[data-ger-editor="tabela"]').addEventListener('click', (ev) => {
    ev.preventDefault();
    const linhas = Math.min(20, Math.max(1, parseInt(prompt('Quantas linhas?', '3'), 10) || 3));
    const colunas = Math.min(10, Math.max(1, parseInt(prompt('Quantas colunas?', '3'), 10) || 3));
    const celula = '<td style="border:1px solid #000;padding:6px">&nbsp;</td>';
    const corpo = Array.from({ length: linhas }, () => `<tr>${celula.repeat(colunas)}</tr>`).join('');
    exec('insertHTML', `<table class="doc-tabela" style="width:100%;border-collapse:collapse;margin:10px 0">${corpo}</table><p><br></p>`);
  });

  const selEspaco = barra.querySelector('[data-ger-editor="espacamento"]');
  selEspaco.value = espacamento;
  selEspaco.addEventListener('change', () => {
    espacamento = selEspaco.value;
    editor.style.lineHeight = espacamento;
  });

  return {
    getHTML: () => sanitizarHTMLDocumento(editor.innerHTML),
    getTexto: () => editor.innerText,
    getEspacamento: () => espacamento
  };
}

/* -----------------------------------------------------------
   17.2-B CAMPOS AUTOMÁTICOS {CAMPO}
   Preenchidos pelo próprio sistema a partir dos dados da
   instituição (já cadastrados uma única vez) e da data corrente.
   Não substituem as variáveis [CAMPO], que continuam manuais.
   ----------------------------------------------------------- */
const GERADOR_MESES = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];

function dataPorExtensoGerador(iso){
  const d = iso ? parseISODate(iso) : new Date();
  return `${d.getDate()} de ${GERADOR_MESES[d.getMonth()]} de ${d.getFullYear()}`;
}

/* ctx: { data, numero } — data padrão é hoje; numero vem da numeração automática. */
function camposAutomaticosGerador(ctx){
  const c = ctx || {};
  const inst = getInstituicaoConfig();
  const dataRef = c.data || todayISO();
  return {
    NOME_APAE: inst.nome || '',
    CNPJ_APAE: inst.cnpj || '',
    ENDERECO_APAE: inst.endereco || '',
    TELEFONE_APAE: inst.telefone || '',
    EMAIL_APAE: inst.email || '',
    CIDADE_UF: inst.cidadeUf || '',
    PRESIDENTE: inst.presidente || '',
    CPF_PRESIDENTE: inst.cpfPresidente || '',
    DATA: (inst.cidadeUf ? `${inst.cidadeUf}, ` : '') + dataPorExtensoGerador(dataRef) + '.',
    DATA_CURTA: formatDateBR(dataRef),
    ANO: String(parseISODate(dataRef).getFullYear()),
    NUMERO: c.numero || ''
  };
}

/* Rótulos amigáveis dos campos de contexto que o usuário preenche. */
const GERADOR_CAMPOS_CONTEXTO_LABEL = {
  NOME_ALUNO: 'Nome do aluno',
  NOME_EMPRESA: 'Razão social da empresa',
  CNPJ_EMPRESA: 'CNPJ da empresa',
  ENDERECO_EMPRESA: 'Endereço da empresa',
  TELEFONE_EMPRESA: 'Telefone da empresa',
  EMAIL_EMPRESA: 'E-mail da empresa',
  REPRESENTANTE: 'Representante',
  CPF_REPRESENTANTE: 'CPF do representante',
  NOME_PROJETO: 'Nome do projeto',
  PROFISSIONAL: 'Profissional',
  DATA_ATENDIMENTO: 'Data do atendimento',
  VALOR: 'Valor'
};

function extrairCamposChave(texto){
  const encontradas = [];
  const regex = /\{([A-ZÀ-Ú0-9_]+)\}/g;
  let m;
  while ((m = regex.exec(texto || '')) !== null) {
    if (!encontradas.includes(m[1])) encontradas.push(m[1]);
  }
  return encontradas;
}

/* Separa os {CAMPO} de um modelo em automáticos (o sistema resolve)
   e de contexto (o usuário informa no formulário). */
function classificarCamposChave(texto){
  const auto = camposAutomaticosGerador();
  const todos = extrairCamposChave(texto);
  return {
    automaticos: todos.filter(c => Object.prototype.hasOwnProperty.call(auto, c)),
    contexto: todos.filter(c => !Object.prototype.hasOwnProperty.call(auto, c))
  };
}

/* Substitui {CAMPO}. Campo sem valor permanece visível como {CAMPO}
   para que a ausência fique evidente no documento. */
function substituirCamposChave(texto, valores){
  return (texto || '').replace(/\{([A-ZÀ-Ú0-9_]+)\}/g, (marcador, nome) => {
    const v = valores[nome];
    return (v === undefined || v === null || v === '') ? marcador : escapeHTML(String(v));
  });
}

/* -----------------------------------------------------------
   17.2-C NUMERAÇÃO AUTOMÁTICA (Ofício nº 001/2026)
   Sequência independente por série e por ano, guardada na config.
   ----------------------------------------------------------- */
function serieDoModelo(modelo){
  return (modelo && (modelo.serie || modelo.nome)) || 'Documento';
}
function modeloUsaNumeracao(modelo){
  return extrairCamposChave(modelo && modelo.texto).includes('NUMERO');
}
function espiarProximoNumeroGerador(serie){
  const ano = new Date().getFullYear();
  const atual = (DB.getConfig().geradorNumeracao || {})[`${serie}::${ano}`] || 0;
  return `${String(atual + 1).padStart(3, '0')}/${ano}`;
}
function proximoNumeroGerador(serie){
  const cfg = DB.getConfig();
  cfg.geradorNumeracao = cfg.geradorNumeracao || {};
  const ano = new Date().getFullYear();
  const chave = `${serie}::${ano}`;
  cfg.geradorNumeracao[chave] = (cfg.geradorNumeracao[chave] || 0) + 1;
  DB.saveConfig(cfg);
  return `${String(cfg.geradorNumeracao[chave]).padStart(3, '0')}/${ano}`;
}

/* -----------------------------------------------------------
   17.2-D DOCUMENTOS GERADOS (histórico + versionamento)
   Cada geração vira um registro permanente. Editar não apaga:
   a versão anterior é empilhada em "versoes".
   ----------------------------------------------------------- */
function getDocumentosGerados(){
  return DB.getAll('gerador-documentos').filter(d => d && d.id);
}

function salvarDocumentoGerado(modelo, dados){
  const numero = modeloUsaNumeracao(modelo) ? proximoNumeroGerador(serieDoModelo(modelo)) : '';
  const doc = {
    id: uid('gdoc'),
    modeloId: modelo.id,
    modeloNome: modelo.nome,
    serie: serieDoModelo(modelo),
    titulo: modelo.titulo || modelo.nome,
    numero,
    textoSnapshot: modelo.texto,
    formato: modelo.formato || 'texto',
    espacamento: modelo.espacamento || '',
    anexos: [],
    valores: dados.valores || {},
    contexto: dados.contexto || {},
    assinaturas: dados.assinaturas || [],
    vinculo: dados.vinculo || null,
    versao: 1,
    versoes: [],
    dataGeracao: todayISO(),
    criadoEm: Date.now(),
    atualizadoEm: Date.now()
  };
  DB.insert('gerador-documentos', doc);
  registrarHistorico({
    modulo: 'gerador-documentos', acao: 'criação',
    descricao: `Documento "${nomeDocumentoGerado(doc)}" gerado.`, refId: doc.id
  });
  return doc;
}

function salvarNovaVersaoDocumento(docId, dados){
  const doc = DB.getById('gerador-documentos', docId);
  if (!doc) return null;
  const versoes = [...(doc.versoes || []), {
    versao: doc.versao,
    valores: doc.valores,
    contexto: doc.contexto,
    assinaturas: doc.assinaturas,
    textoSnapshot: doc.textoSnapshot,
    salvoEm: doc.atualizadoEm
  }];
  DB.update('gerador-documentos', docId, {
    valores: dados.valores || {},
    contexto: dados.contexto || {},
    assinaturas: dados.assinaturas || [],
    vinculo: dados.vinculo !== undefined ? dados.vinculo : (doc.vinculo || null),
    versoes,
    versao: doc.versao + 1,
    atualizadoEm: Date.now()
  });
  const atualizado = DB.getById('gerador-documentos', docId);
  registrarHistorico({
    modulo: 'gerador-documentos', acao: 'edição',
    descricao: `Documento "${nomeDocumentoGerado(atualizado)}" salvo como versão ${atualizado.versao}.`, refId: docId
  });
  return atualizado;
}

function nomeDocumentoGerado(doc){
  if (!doc) return '';
  return doc.numero ? `${doc.modeloNome} nº ${doc.numero}` : doc.modeloNome;
}

/* Texto identificador usado na pesquisa: nome, tipo, número, data e
   todos os valores preenchidos (pessoa, empresa, responsável...). */
function textoPesquisaDocumento(doc){
  return [
    doc.modeloNome, doc.titulo, doc.numero, doc.serie,
    formatDateBR(doc.dataGeracao),
    ...Object.values(doc.valores || {}),
    ...Object.values(doc.contexto || {}),
    ...(doc.assinaturas || []).flat(),
    ...(doc.anexos || []).map(a => a.nome),
    rotuloVinculo(doc.vinculo)
  ].filter(Boolean).join(' ').toLowerCase();
}

function duplicarDocumentoGerado(id){
  const original = getDocumentosGerados().find(d => d.id === id);
  if (!original) return showToast('Documento não encontrado');
  // Usa o texto e o formato do próprio documento: se o modelo foi editado
  // ou excluído depois, a cópia continua igual ao original.
  const modelo = { id: original.modeloId, nome: original.modeloNome, titulo: original.titulo, texto: original.textoSnapshot, serie: original.serie, formato: original.formato, espacamento: original.espacamento };
  const copia = salvarDocumentoGerado(modelo, {
    valores: { ...original.valores },
    contexto: { ...original.contexto },
    assinaturas: (original.assinaturas || []).map(l => [...l]),
    vinculo: original.vinculo ? { ...original.vinculo } : null
  });
  geEstado.sel = copia.id;
  renderGeradorDocumentos();
  showToast(copia.numero ? `✓ Cópia criada: ${nomeDocumentoGerado(copia)}.` : '✓ Documento duplicado.');
}

/* -----------------------------------------------------------
   17.2-F CADASTRO DE EMPRESAS
   Registro próprio do Gerador, com os dados completos que um
   documento costuma exigir. As empresas já cadastradas dentro
   dos Projetos também aparecem para vínculo, sem serem copiadas
   — são lidas direto do projeto para não duplicar dados.
   ----------------------------------------------------------- */
function getEmpresasGerador(){
  return DB.getAll('gerador-empresas').filter(e => e && e.id);
}

function listarEmpresasParaVinculo(){
  const proprias = getEmpresasGerador().map(e => ({ ...e, _origem: 'cadastro' }));
  const chaves = new Set(proprias.map(e => (e.cnpj || e.razaoSocial || '').toLowerCase().trim()).filter(Boolean));

  const deProjetos = [];
  DB.getAll('projetos').forEach(p => {
    (p.empresas || []).filter(e => !e.empresaGlobalId).forEach(e => {
      const chave = (e.cnpj || e.nome || '').toLowerCase().trim();
      if (chave && chaves.has(chave)) return;
      deProjetos.push({
        id: `PRJEMP-${p.id}-${e.id}`,
        razaoSocial: e.nome || '', cnpj: e.cnpj || '',
        endereco: '', telefone: e.contato || '', email: '',
        representante: '', cpfRepresentante: '',
        _origem: 'projeto', _projetoNome: p.nome
      });
    });
  });
  return [...proprias, ...deProjetos];
}

function empresaPorId(id){
  return listarEmpresasParaVinculo().find(e => e.id === id) || null;
}

/* Cadastro e edição da empresa: formulário único em 04-projetos.js. */
function abrirFormEmpresaGerador(idParaEditar){ abrirFormEmpresaGlobal(idParaEditar || null); }

function excluirEmpresaGerador(id){
  const e = getEmpresasGerador().find(x => x.id === id);
  if (!e) return showToast('Empresa não encontrada');
  const emUso = getDocumentosGerados().filter(d => d.vinculo && d.vinculo.tipo === 'empresa' && d.vinculo.id === id).length;
  if (emUso) return showToast(`Esta empresa está vinculada a ${emUso} documento(s) e não pode ser excluída.`);
  confirmAction(`Excluir a empresa "${e.razaoSocial}"?`, () => {
    DB.remove('gerador-empresas', id);
    renderGeradorDocumentos();
    showToast('Empresa excluída.');
  });
}

/* -----------------------------------------------------------
   17.2-G VÍNCULO COM REGISTROS DO SISTEMA
   O documento passa a saber a que ele se refere, e os dados do
   registro vinculado preenchem os campos automaticamente.
   ----------------------------------------------------------- */
const GERADOR_TIPOS_VINCULO = [
  { tipo: 'empresa', label: 'Empresa' },
  { tipo: 'projeto', label: 'Projeto' },
  { tipo: 'aluno', label: 'Aluno' },
  { tipo: 'atendimento', label: 'Atendimento' },
  { tipo: 'documento', label: 'Documento' },
  { tipo: 'solicitacao', label: 'Tarefa / Solicitação' }
];

function listarRegistrosVinculo(tipo){
  switch (tipo) {
    case 'empresa':
      return listarEmpresasParaVinculo().map(e => ({ id: e.id, rotulo: e.razaoSocial + (e._origem === 'projeto' ? ` (projeto ${e._projetoNome})` : '') }));
    case 'projeto':
      return DB.getAll('projetos').map(p => ({ id: p.id, rotulo: p.nome }));
    case 'aluno':
      return (typeof getAtendAlunos === 'function' ? getAtendAlunos() : []).map(a => ({ id: a.id, rotulo: a.nome }));
    case 'atendimento':
      return (typeof getAtendimentos === 'function' ? getAtendimentos() : [])
        .slice().sort((a, b) => String(b.data).localeCompare(String(a.data)))
        .map(a => ({ id: a.id, rotulo: `${a.alunoNome || 'Aluno'} — ${formatDateBR(a.data)}${a.horario ? ' ' + a.horario : ''}` }));
    case 'documento':
      return DB.getAll('documentos').map(d => ({ id: d.id, rotulo: d.nome }));
    case 'solicitacao':
      return DB.getAll('solicitacoes').map(s => ({ id: s.id, rotulo: s.titulo }));
    default:
      return [];
  }
}

/* Dados do registro vinculado, já no formato nome-do-campo → valor.
   Serve tanto para {CAMPO} de contexto quanto para [CAMPO] manual. */
function dadosDoVinculo(vinculo){
  if (!vinculo || !vinculo.tipo || !vinculo.id) return {};
  const limpar = (obj) => Object.fromEntries(Object.entries(obj).filter(([, v]) => v));

  if (vinculo.tipo === 'empresa') {
    const e = empresaPorId(vinculo.id);
    if (!e) return {};
    return limpar({
      NOME_EMPRESA: e.razaoSocial, CNPJ_EMPRESA: e.cnpj, ENDERECO_EMPRESA: e.endereco,
      TELEFONE_EMPRESA: e.telefone, EMAIL_EMPRESA: e.email,
      REPRESENTANTE: e.representante, CPF_REPRESENTANTE: e.cpfRepresentante,
      NOME: e.razaoSocial, CNPJ: e.cnpj, ENDERECO: e.endereco, TELEFONE: e.telefone,
      DESTINATARIO: e.representante || e.razaoSocial, FORNECEDOR: e.razaoSocial
    });
  }
  if (vinculo.tipo === 'projeto') {
    const p = DB.getById('projetos', vinculo.id);
    if (!p) return {};
    return limpar({
      NOME_PROJETO: p.nome, PROJETO: p.nome, RESPONSAVEL: p.responsavel,
      OBJETIVO: p.objetivo, PERIODO: `${formatDateBR(p.dataInicio)} a ${formatDateBR(p.dataFim)}`,
      VALOR: p.valorOrcado ? formatMoney(p.valorOrcado) : '', FONTE_RECURSO: p.fonteRecurso
    });
  }
  if (vinculo.tipo === 'aluno') {
    const a = DB.getById('atendimento-alunos', vinculo.id);
    if (!a) return {};
    return limpar({ NOME_ALUNO: a.nome, NOME: a.nome });
  }
  if (vinculo.tipo === 'atendimento') {
    const a = DB.getById('atendimentos', vinculo.id);
    if (!a) return {};
    return limpar({
      NOME_ALUNO: a.alunoNome, NOME: a.alunoNome,
      PROFISSIONAL: a.profissionalNome, RESPONSAVEL: a.profissionalNome,
      DATA_ATENDIMENTO: formatDateBR(a.data), HORARIO: a.horario
    });
  }
  if (vinculo.tipo === 'documento') {
    const d = DB.getById('documentos', vinculo.id);
    if (!d) return {};
    return limpar({ NOME_DOCUMENTO: d.nome, ASSUNTO: d.nome, RESPONSAVEL: d.responsavel });
  }
  if (vinculo.tipo === 'solicitacao') {
    const s = DB.getById('solicitacoes', vinculo.id);
    if (!s) return {};
    return limpar({ ASSUNTO: s.titulo, TITULO: s.titulo, RESPONSAVEL: s.responsavel, TEXTO: s.descricao });
  }
  return {};
}

function rotuloVinculo(vinculo){
  if (!vinculo || !vinculo.tipo) return '';
  const tipoLabel = (GERADOR_TIPOS_VINCULO.find(t => t.tipo === vinculo.tipo) || {}).label || vinculo.tipo;
  return `${tipoLabel}: ${vinculo.rotulo || '—'}`;
}

/* Abre o documento/registro vinculado usando a navegação já existente. */
function abrirRegistroVinculado(vinculo){
  if (!vinculo) return;
  closeModal();
  if (vinculo.tipo === 'projeto') { goToView('projetos'); abrirDetalheProjeto(vinculo.id); }
  else if (vinculo.tipo === 'documento') { goToView('documentos'); abrirDetalheDocumento(vinculo.id); }
  else if (vinculo.tipo === 'solicitacao') { goToView('solicitacoes'); abrirDetalheSolicitacao(vinculo.id); }
  else if (vinculo.tipo === 'aluno') abrirHistoricoAluno(vinculo.id);
  else if (vinculo.tipo === 'atendimento') abrirAtendimento(vinculo.id);
  else if (vinculo.tipo === 'empresa') {
    if (getEmpresaGlobal(vinculo.id)) abrirFichaEmpresaGlobal(vinculo.id);
    else { geEstado.aba = 'empresas'; goToView('gerador'); }
  }
}

/* -----------------------------------------------------------
   17.2-E ANEXOS DO DOCUMENTO
   Reaproveita o mesmo armazenamento de arquivos já usado pelos
   projetos e pela logo (IndexedDB via salvarAnexo/ProjectFiles).
   Em localStorage fica só a referência leve {id,nome,tipo,tamanho}.
   ----------------------------------------------------------- */
function formatarTamanhoArquivo(bytes){
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function excluirDocumentoGerado(id){
  const doc = getDocumentosGerados().find(d => d.id === id);
  if (!doc) return showToast('Documento não encontrado');
  confirmAction(`Excluir "${nomeDocumentoGerado(doc)}" e todas as suas versões?`, () => {
    (doc.anexos || []).forEach(a => ProjectFiles.remove(a.id).catch(() => {}));
    DB.remove('gerador-documentos', id);
    registrarHistorico({ modulo: 'gerador-documentos', acao: 'exclusão', descricao: `Documento "${nomeDocumentoGerado(doc)}" excluído.`, refId: id });
    renderGeradorDocumentos();
    showToast('Documento excluído.');
  });
}

/* -----------------------------------------------------------
   17.4 CRUD DE MODELOS
   ----------------------------------------------------------- */
function abrirModalModeloGerador(idParaEditar){
  const existente = idParaEditar ? getGeradorModelos().find(m => m.id === idParaEditar) : null;

  openModal(existente ? `Editar modelo: ${existente.nome}` : 'Criar novo modelo', `
    <label>Nome do modelo:</label>
    <input type="text" id="gmNome" class="input" placeholder="Ex: Declaração de Comparecimento" value="${existente ? escapeHTML(existente.nome) : ''}">
    <label>Título do documento:</label>
    <input type="text" id="gmTitulo" class="input" placeholder="Ex: DECLARAÇÃO DE COMPARECIMENTO" value="${existente ? escapeHTML(existente.titulo || '') : ''}">
    <label>Série para numeração automática (opcional):</label>
    <input type="text" id="gmSerie" class="input" placeholder="Ex: Ofício — deixe vazio para usar o nome do modelo" value="${existente ? escapeHTML(existente.serie || '') : ''}">
    <label>Texto padrão:</label>
    <div>
      ${barraEditorHTML()}
      <div id="gmTexto" contenteditable="true" class="input" style="height:240px;overflow-y:auto;border-radius:0 0 6px 6px;text-align:justify;white-space:normal">${
        existente
          ? (modeloEhHTML(existente) ? existente.texto : escapeHTML(existente.texto).replace(/\n/g, '<br>'))
          : ''
      }</div>
    </div>
    <p class="muted" style="margin-top:6px;font-size:12px;line-height:1.6">
      <b>{CAMPO}</b> = preenchido pelo sistema. Disponíveis: {NOME_APAE}, {CNPJ_APAE}, {ENDERECO_APAE}, {TELEFONE_APAE}, {EMAIL_APAE}, {CIDADE_UF}, {PRESIDENTE}, {CPF_PRESIDENTE}, {DATA}, {DATA_CURTA}, {ANO}, {NUMERO}.<br>
      <b>[CAMPO]</b> = você preenche na hora de gerar. Ex: [NOME], [CPF], [ASSUNTO].<br>
      Usar <b>{NUMERO}</b> liga a numeração automática sequencial por ano.
    </p>
    <p class="muted" id="gmVarsPreview" style="margin-top:6px"></p>

    <div class="modal-actions" style="margin-top:16px">
      <button type="button" class="btn btn-ghost" id="btnCancelarModeloGerador">Cancelar</button>
      <button type="button" class="btn btn-primary" id="btnSalvarModeloGerador">${existente ? 'Salvar alterações' : 'Salvar modelo'}</button>
    </div>
  `);

  const editor = ativarEditorGerador('gmTexto', existente && existente.espacamento);

  const atualizarPreviewVars = () => {
    const texto = document.getElementById('gmTexto').innerText;
    const manuais = extrairVariaveis(texto);
    const chaves = classificarCamposChave(texto);
    const partes = [];
    if (chaves.automaticos.length) partes.push(`Automáticos: ${chaves.automaticos.map(c => `{${c}}`).join(', ')}`);
    if (chaves.contexto.length) partes.push(`De contexto: ${chaves.contexto.map(c => `{${c}}`).join(', ')}`);
    if (manuais.length) partes.push(`Manuais: ${manuais.map(c => `[${c}]`).join(', ')}`);
    document.getElementById('gmVarsPreview').textContent = partes.length
      ? partes.join(' · ')
      : 'Nenhum campo detectado ainda.';
  };
  document.getElementById('gmTexto').addEventListener('input', atualizarPreviewVars);
  atualizarPreviewVars();

  document.getElementById('btnCancelarModeloGerador').addEventListener('click', closeModal);
  document.getElementById('btnSalvarModeloGerador').addEventListener('click', () => {
    const nome = document.getElementById('gmNome').value.trim();
    const titulo = document.getElementById('gmTitulo').value.trim();
    const serie = document.getElementById('gmSerie').value.trim();
    const texto = editor.getHTML();
    const espacamento = editor.getEspacamento();
    if (!nome) return showToast('Digite o nome do modelo');
    // Um documento pode ser só uma tabela ou uma imagem, sem texto corrido.
    if (!editor.getTexto().trim() && !/<table|<img/i.test(texto)) return showToast('Escreva o texto do documento');

    const modelos = getGeradorModelos();
    if (existente) {
      const idx = modelos.findIndex(m => m.id === existente.id);
      modelos[idx] = { ...existente, nome, titulo, serie, texto, formato: 'html', espacamento };
    } else {
      modelos.push({ id: uid('ger'), nome, titulo, serie, texto, formato: 'html', espacamento, padrao: false, criadoEm: Date.now() });
    }
    DB.saveAll('gerador-modelos', modelos);
    closeModal();
    renderGeradorDocumentos();
    showToast(existente ? '✓ Modelo atualizado.' : '✓ Modelo criado.');
  });
}

function duplicarModeloGerador(id){
  const original = getGeradorModelos().find(m => m.id === id);
  if (!original) return showToast('Modelo não encontrado');
  const modelos = getGeradorModelos();
  modelos.push({ id: uid('ger'), nome: `${original.nome} (cópia)`, titulo: original.titulo, serie: original.serie || '', texto: original.texto, formato: original.formato, espacamento: original.espacamento, padrao: false, criadoEm: Date.now() });
  DB.saveAll('gerador-modelos', modelos);
  renderGeradorDocumentos();
  showToast('✓ Modelo duplicado.');
}

function excluirModeloGerador(id){
  const modelo = getGeradorModelos().find(m => m.id === id);
  if (!modelo) return showToast('Modelo não encontrado');
  if (modelo.padrao) return showToast('O modelo inicial não pode ser excluído, mas pode ser editado.');
  confirmAction(`Tem certeza que deseja excluir o modelo "${modelo.nome}"?`, () => {
    const restantes = getGeradorModelos().filter(m => m.id !== id);
    DB.saveAll('gerador-modelos', restantes);
    renderGeradorDocumentos();
    showToast('Modelo excluído.');
  });
}

/* -----------------------------------------------------------
   17.5 FORMULÁRIO DE PREENCHIMENTO + GERAÇÃO
   ----------------------------------------------------------- */
/* Campos longos ganham textarea em vez de input de uma linha. */
const GERADOR_CAMPOS_LONGOS = ['TEXTO','PAUTA','DELIBERACOES','CLAUSULAS','JUSTIFICATIVA','OBJETIVO','ATIVIDADES','RESULTADOS','CONSIDERACOES','PRESENTES','OBJETO'];

/* Monta o HTML A4 final de um documento já salvo. "versao" opcional
   permite renderizar uma versão antiga sem alterar a atual. */
async function montarHTMLDocumentoGerado(doc, versao){
  const fonte = versao || doc;
  const cabecalho = await montarCabecalhoInstitucionalHTML();
  const rodape = montarRodapeInstitucionalHTML();

  const chaves = {
    ...camposAutomaticosGerador({ data: doc.dataGeracao, numero: doc.numero }),
    ...(fonte.contexto || {})
  };

  // {CAMPO} primeiro (só existe no modelo), depois [CAMPO] com o que o usuário digitou.
  // Modelos do editor já são HTML; os antigos, texto puro, seguem escapados.
  const ehHTML = doc.formato === 'html';
  const textoFonte = fonte.textoSnapshot || doc.textoSnapshot || '';
  let corpoHTML = ehHTML ? sanitizarHTMLDocumento(textoFonte) : escapeHTML(textoFonte);
  corpoHTML = substituirCamposChave(corpoHTML, chaves);
  corpoHTML = substituirVariaveis(corpoHTML, fonte.valores || {});
  if (!ehHTML) corpoHTML = corpoHTML.replace(/\n/g, '<br>');
  const estiloCorpo = [
    doc.espacamento ? `line-height:${escapeHTML(String(doc.espacamento))}` : '',
    ehHTML ? 'white-space:normal' : ''
  ].filter(Boolean).join(';');

  const assinaturas = fonte.assinaturas || [];
  const assinaturaHTML = assinaturas.length
    ? assinaturas.map(linhas => `
      <div class="doc-a4-assinatura">
        <div class="doc-a4-linha-assinatura">_________________________</div>
        ${linhas.map(texto => `<div>${escapeHTML(texto)}</div>`).join('')}
      </div>`).join('')
    : '';

  return `
    <div class="doc-a4-page">
      ${cabecalho}
      <div class="doc-a4-titulo">${escapeHTML(doc.titulo || doc.modeloNome)}</div>
      <div class="doc-a4-corpo"${estiloCorpo ? ` style="${estiloCorpo}"` : ''}>${corpoHTML}</div>
      ${assinaturaHTML}
      ${rodape}
    </div>`;
}

/* Impressão/PDF isolados: janela própria só com o documento,
   sem menus/botões do sistema (mesmo padrão já usado no módulo
   Modelos existente, em 16-modelos-documentos.js). */
function imprimirDocumentoGerador(html, nome){
  const janela = window.open('', '_blank', 'width=900,height=700');
  if (!janela) return showToast('Permita pop-ups neste site para imprimir o documento');
  janela.document.write(`<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>${escapeHTML(nome)}</title>
    <style>${DOC_A4_PRINT_CSS}</style></head><body>${html}</body></html>`);
  janela.document.close();
  let impresso = false;
  const imprimir = () => { if (impresso) return; impresso = true; try { janela.focus(); janela.print(); } catch (e) {} };
  janela.onload = imprimir;
  setTimeout(imprimir, 500);
}

function salvarPdfGerador(html, nome){
  if (typeof html2pdf !== 'undefined') {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = `<style>${DOC_A4_PRINT_CSS}</style>${html}`;
    const worker = html2pdf().set({
      margin: 0,
      filename: `${nome.replace(/[^\w\-]+/g, '_')}_${Date.now()}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' },
      pagebreak: { mode: ['css', 'legacy'], before: '.doc-quebra-pagina' }
    }).from(wrapper);

    // "Página X de Y" só é possível depois que o PDF existe e o total de
    // páginas é conhecido — por isso é carimbado aqui, e não no HTML.
    if (getInstituicaoConfig().rodapeMostrarPagina) {
      worker.toPdf().get('pdf').then(pdf => {
        const total = pdf.internal.getNumberOfPages();
        for (let i = 1; i <= total; i++) {
          pdf.setPage(i);
          pdf.setFontSize(9);
          pdf.setTextColor(90);
          pdf.text(`Página ${i} de ${total}`,
            pdf.internal.pageSize.getWidth() / 2,
            pdf.internal.pageSize.getHeight() - 8,
            { align: 'center' });
        }
      }).save();
    } else {
      worker.save();
    }
    showToast('Gerando PDF...');
  } else {
    imprimirDocumentoGerador(html, nome);
    showToast('Use "Salvar como PDF" na janela de impressão');
  }
}

const DOC_A4_PRINT_CSS = `
  body{margin:0;background:#fff;color:#000;font-family:'Times New Roman',Georgia,serif;}
  .doc-a4-page{width:210mm;min-height:297mm;padding:20mm 18mm;margin:0 auto;box-sizing:border-box;}
  .doc-a4-cabecalho{display:flex;align-items:center;gap:16px;border-bottom:2px solid #000;padding-bottom:12px;margin-bottom:24px;}
  .doc-a4-inst-info{display:flex;flex-direction:column;flex:1;text-align:center;font-size:11pt;line-height:1.5;}
  .doc-a4-inst-info strong{font-size:13pt;}
  .doc-a4-cotacao-info{border-top:1px solid #000;border-bottom:2px solid #000;padding:8px 0;margin-bottom:24px;font-size:11pt;line-height:1.6;}
  .doc-a4-titulo{text-align:center;font-weight:bold;font-size:14pt;margin:20px 0 26px;text-transform:uppercase;letter-spacing:.5px;}
  .doc-a4-corpo{font-size:12pt;line-height:1.8;text-align:justify;white-space:pre-wrap;}
  .doc-a4-assinatura{margin-top:70px;text-align:center;font-size:12pt;}
  .doc-a4-linha-assinatura{margin-bottom:6px;}
  .doc-a4-rodape{margin-top:50px;padding-top:10px;border-top:1px solid #999;text-align:center;font-size:9.5pt;color:#444;white-space:pre-wrap;}
  .doc-quebra-pagina{page-break-after:always;break-after:page;height:0;}
  .doc-a4-corpo table{width:100%;border-collapse:collapse;margin:10px 0;}
  .doc-a4-corpo td,.doc-a4-corpo th{border:1px solid #000;padding:6px;font-size:11pt;}
  .doc-a4-corpo h1{font-size:16pt;margin:14px 0 8px;}
  .doc-a4-corpo h2{font-size:14pt;margin:12px 0 8px;}
  .doc-a4-corpo h3{font-size:13pt;margin:10px 0 6px;}
  .doc-a4-corpo ul,.doc-a4-corpo ol{margin:8px 0 8px 28px;text-align:left;}
  .doc-a4-corpo p{margin:0 0 8px;}
  @media print{ @page{ size:A4; margin:0; } .doc-a4-page{ margin:0; } }
`;

initGeradorDocumentos();

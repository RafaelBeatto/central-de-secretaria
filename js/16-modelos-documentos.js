/* ---------------------------------------------------------
   16. MODELOS DE DOCUMENTOS & TEMPLATES
   --------------------------------------------------------- */

// Modelos padrão
const MODELOS_PADRAO = {
  oficio: {
    nome: 'Ofício',
    icone: '📄',
    template: `
<div style="font-family: Arial; font-size: 12px; line-height: 1.5; max-width: 800px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <strong style="font-size: 14px;">{{ instituicao }}</strong><br>
    <small>{{ endereco }}</small><br>
    <small>Tel: {{ telefone }}</small>
  </div>

  <div style="margin-bottom: 20px;">
    <div><strong>Ofício nº {{ numero }}/{{ ano }}</strong></div>
    <div>Local: {{ local }} de {{ data }}</div>
  </div>

  <div style="margin-bottom: 20px;">
    <strong>{{ destinatario_cargo }}</strong><br>
    {{ destinatario_nome }}<br>
    {{ destinatario_instituicao }}<br>
    {{ destinatario_endereco }}
  </div>

  <div style="margin-bottom: 20px;">
    <div><strong>Assunto: {{ assunto }}</strong></div>
  </div>

  <div style="margin-bottom: 40px; text-align: justify;">
    {{ conteudo }}
  </div>

  <div style="margin-top: 60px;">
    <div style="text-align: center;">
      <div style="margin-bottom: 40px;">_________________________</div>
      <div><strong>{{ assinante_nome }}</strong></div>
      <div>{{ assinante_cargo }}</div>
    </div>
  </div>
</div>
    `,
    campos: ['instituicao', 'endereco', 'telefone', 'numero', 'ano', 'local', 'data', 
             'destinatario_cargo', 'destinatario_nome', 'destinatario_instituicao', 'destinatario_endereco',
             'assunto', 'conteudo', 'assinante_nome', 'assinante_cargo']
  },

  memorando: {
    nome: 'Memorando',
    icone: '📝',
    template: `
<div style="font-family: Arial; font-size: 12px; line-height: 1.5; max-width: 700px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <strong style="font-size: 14px;">MEMORANDO</strong>
  </div>

  <div style="margin-bottom: 15px;">
    <div><strong>PARA:</strong> {{ destinatario }}</div>
    <div><strong>DE:</strong> {{ remetente }}</div>
    <div><strong>DATA:</strong> {{ data }}</div>
    <div><strong>ASSUNTO:</strong> {{ assunto }}</div>
  </div>

  <div style="margin-bottom: 40px; text-align: justify;">
    {{ conteudo }}
  </div>

  <div style="margin-top: 40px;">
    <div style="text-align: center;">
      <div style="margin-bottom: 30px;">_________________________</div>
      <div><strong>{{ assinante_nome }}</strong></div>
    </div>
  </div>
</div>
    `,
    campos: ['destinatario', 'remetente', 'data', 'assunto', 'conteudo', 'assinante_nome']
  },

  carta: {
    nome: 'Carta',
    icone: '💌',
    template: `
<div style="font-family: Arial; font-size: 12px; line-height: 1.6; max-width: 700px;">
  <div style="margin-bottom: 40px;">
    {{ local }}, {{ data }}
  </div>

  <div style="margin-bottom: 20px;">
    <div>{{ destinatario_nome }}</div>
    <div>{{ destinatario_endereco }}</div>
  </div>

  <div style="margin-bottom: 20px;">
    Prezado(a) {{ destinatario_tratamento }},
  </div>

  <div style="margin-bottom: 40px; text-align: justify;">
    {{ conteudo }}
  </div>

  <div style="margin-bottom: 20px;">
    Atenciosamente,
  </div>

  <div style="margin-top: 60px;">
    <div style="text-align: center;">
      <div style="margin-bottom: 40px;">_________________________</div>
      <div><strong>{{ assinante_nome }}</strong></div>
      <div>{{ assinante_cargo }}</div>
    </div>
  </div>
</div>
    `,
    campos: ['local', 'data', 'destinatario_nome', 'destinatario_endereco', 'destinatario_tratamento',
             'conteudo', 'assinante_nome', 'assinante_cargo']
  }
};

/* Ícones de linha para os modelos padrão; os personalizados
   continuam usando o emoji escolhido por quem criou. */
const ICONES_MODELO = {
  oficio: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z"/><path d="M14 3v5h5"/><path d="M8.5 12.5h7M8.5 16h5"/>',
  memorando: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h4"/>',
  carta: '<rect x="3" y="5.5" width="18" height="13" rx="2"/><path d="m3.5 7 8.5 6 8.5-6"/>'
};

function iconeModelo(m){
  const d = ICONES_MODELO[m.id];
  if (d) {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"
      stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  }
  return escapeHTML(m.icone || '📄');
}

function initModelos(){
  if (!DB.getAll('modelos-documentos')) {
    DB.saveAll('modelos-documentos', []);
  }
}

function getModelos(){
  const lista = DB.getAll('modelos-documentos') || [];
  // Ignora registros corrompidos ou vindos de outra entidade
  return lista.filter(m => m && typeof m.nome === 'string' && Array.isArray(m.campos) && m.template);
}

function salvarModelo(modelo){
  let modelos = getModelos();
  const idx = modelos.findIndex(m => m.id === modelo.id);
  if (idx >= 0) {
    modelos[idx] = modelo;
  } else {
    modelo.id = 'mod-' + Date.now();
    modelo.criadoEm = new Date().toISOString();
    modelos.push(modelo);
  }
  DB.saveAll('modelos-documentos', modelos);
  return modelo;
}

function renderModelos(){
  const container = document.getElementById('listaModelos');
  if (!container) return;
  
  const modelos = getModelos();
  const padroes = Object.entries(MODELOS_PADRAO).map(([key, val]) => ({ ...val, id: key, padrao: true }));
  const todos = [...padroes, ...modelos];

  container.innerHTML = `
    <div class="modelos-header">
      <p class="muted">${todos.length} modelo${todos.length !== 1 ? 's' : ''} disponíve${todos.length !== 1 ? 'is' : 'l'}</p>
      <button class="btn btn-primary" onclick="abrirModalNovoModelo()">＋ Novo modelo</button>
    </div>

    <div class="modelos-grid">
      ${todos.map(m => `
        <div class="modelo-card">
          <div class="modelo-icone">${iconeModelo(m)}</div>
          <div class="modelo-nome">${escapeHTML(m.nome)}</div>
          <div class="modelo-campos">
            <small class="muted">${m.campos.length} campo${m.campos.length !== 1 ? 's' : ''} para preencher</small>
          </div>
          <div class="modelo-actions">
            <button class="btn btn-sm btn-primary" onclick="usarModelo('${m.id}')">Usar modelo</button>
            ${!m.padrao ? `<button class="btn btn-sm btn-ghost" onclick="editarModelo('${m.id}')">Editar</button>
            <button class="btn btn-sm btn-ghost" onclick="duplicarModelo('${m.id}')">Duplicar</button>
            <button class="btn btn-sm btn-danger" onclick="excluirModelo('${m.id}')">Excluir</button>` : ''}
          </div>
        </div>
      `).join('')}
    </div>`;
}

function usarModelo(id){
  const modelo = encontrarModelo(id);
  if (!modelo) return showToast('Modelo não encontrado');
  abrirFormularioDocumento(modelo);
}

function abrirFormularioDocumento(modelo){
  const backdrop = document.getElementById('modalBackdrop');
  const modal = document.getElementById('modal');
  const body = document.getElementById('modalBody');

  const campos = modelo.campos.map(campo => ({
    nome: campo,
    label: campo.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  }));

  body.innerHTML = `
    <div style="max-height: 70vh; overflow-y: auto;">
      <div class="form-section">
        <h3>Preenchimento de Campos</h3>
        ${campos.map((campo, i) => `
          <div class="form-group">
            <label>${campo.label}:</label>
            <textarea id="campo_${i}" class="input" style="min-height: 50px;" placeholder="${campo.label}"></textarea>
          </div>
        `).join('')}
      </div>
    </div>

    <div style="display: flex; gap: 8px; margin-top: 20px; justify-content: flex-end;">
      <button class="btn btn-ghost" onclick="fecharModeloModal()">Cancelar</button>
      <button class="btn btn-secondary" onclick="previewDocumento('${modelo.id}')">Visualizar</button>
      <button class="btn btn-primary" onclick="gerarPDF('${modelo.id}')">Gerar PDF</button>
    </div>`;

  document.getElementById('modalTitle').textContent = `Documento: ${modelo.nome}`;
  backdrop.hidden = false;
}

/* Localiza um modelo (padrão ou personalizado) pelo id */
function encontrarModelo(id){
  const padroes = Object.entries(MODELOS_PADRAO).map(([key, val]) => ({ ...val, id: key }));
  return [...padroes, ...getModelos()].find(m => m.id === id) || null;
}

/* Substitui {{ campo }} pelos valores preenchidos no formulário */
function montarDocumentoHTML(modelo){
  let html = modelo.template;
  modelo.campos.forEach((campo, i) => {
    const elem = document.getElementById(`campo_${i}`);
    const valor = elem ? elem.value : '';
    // escapa o campo no padrão {{ nome }} para uso seguro em RegExp
    const marcador = new RegExp('\\{\\{\\s*' + campo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*\\}\\}', 'g');
    html = html.replace(marcador, escapeHTML(valor).replace(/\n/g, '<br>'));
  });
  return html;
}

function abrirJanelaDocumento(modelo, html, imprimir){
  const janela = window.open('', '_blank', 'width=900,height=700');
  if (!janela) {
    showToast('Permita pop-ups neste site para visualizar o documento');
    return null;
  }
  janela.document.write(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>${escapeHTML(modelo.nome)}</title>
  <style>
    body{margin:30px;font-family:Arial,sans-serif;background:#fff;color:#000;}
    @media print{body{margin:0;}}
  </style>
</head>
<body>${html}</body>
</html>`);
  janela.document.close();
  if (imprimir) {
    janela.onload = () => { janela.focus(); janela.print(); };
    setTimeout(() => { try{ janela.focus(); janela.print(); }catch(e){} }, 500);
  }
  return janela;
}

function previewDocumento(modeloId){
  const modelo = encontrarModelo(modeloId);
  if (!modelo) return showToast('Modelo não encontrado');
  abrirJanelaDocumento(modelo, montarDocumentoHTML(modelo), false);
}

function gerarPDF(modeloId){
  const modelo = encontrarModelo(modeloId);
  if (!modelo) return showToast('Modelo não encontrado');

  const html = montarDocumentoHTML(modelo);

  if (typeof html2pdf !== 'undefined') {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = html;
    html2pdf().set({
      margin: 10,
      filename: `${modelo.nome.replace(/[^\w\-]+/g, '_')}_${Date.now()}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' }
    }).from(wrapper).save();
    fecharModeloModal();
    showToast('Gerando PDF...');
  } else {
    // Sem internet o html2pdf não carrega: usa a impressão do navegador
    // ("Salvar como PDF" na janela de impressão).
    const janela = abrirJanelaDocumento(modelo, html, true);
    if (janela) {
      fecharModeloModal();
      showToast('Use "Salvar como PDF" na janela de impressão');
    }
  }
}

function abrirModalNovoModelo(idParaEditar){
  const backdrop = document.getElementById('modalBackdrop');
  const body = document.getElementById('modalBody');
  const existente = idParaEditar ? getModelos().find(m => m.id === idParaEditar) : null;

  body.innerHTML = `
    <label>Nome do modelo:</label>
    <input type="text" id="mNome" class="input" placeholder="Ex: Atestado de Comparecimento" value="${existente ? escapeHTML(existente.nome) : ''}">

    <label>Ícone (emoji):</label>
    <input type="text" id="mIcone" class="input" value="${existente ? escapeHTML(existente.icone || '📄') : '📄'}" maxlength="2">

    <label>Template HTML:</label>
    <textarea id="mTemplate" class="input" style="height: 200px; font-family: monospace; font-size: 11px;"
      placeholder="Use {{ nome_campo }} para campos dinâmicos">${existente ? existente.template : ''}</textarea>

    <label>Campos (um por linha):</label>
    <textarea id="mCampos" class="input" style="height: 100px;" placeholder="nome&#10;data&#10;assinatura">${existente ? existente.campos.join('\n') : ''}</textarea>

    <div style="display: flex; gap: 8px; margin-top: 20px; justify-content: flex-end;">
      <button class="btn btn-ghost" onclick="fecharModeloModal()">Cancelar</button>
      <button class="btn btn-primary" onclick="salvarNovoModelo(${existente ? `'${existente.id}'` : 'null'})">${existente ? 'Salvar alterações' : 'Salvar modelo'}</button>
    </div>`;

  document.getElementById('modalTitle').textContent = existente ? `Editar modelo: ${existente.nome}` : 'Criar novo modelo';
  backdrop.hidden = false;
}

function salvarNovoModelo(idParaEditar){
  const nome = document.getElementById('mNome').value.trim();
  const icone = document.getElementById('mIcone').value.trim() || '📄';
  const template = document.getElementById('mTemplate').value.trim();
  const campos = document.getElementById('mCampos').value.trim().split('\n').map(c => c.trim()).filter(c => c);

  if (!nome) return showToast('Digite o nome do modelo');
  if (!template) return showToast('Descreva o template');
  if (!campos.length) return showToast('Adicione pelo menos um campo');

  const modelo = idParaEditar ? { id: idParaEditar, nome, icone, template, campos } : { nome, icone, template, campos };
  salvarModelo(modelo);
  fecharModeloModal();
  renderModelos();
  showToast(idParaEditar ? 'Modelo atualizado com sucesso!' : 'Modelo criado com sucesso!');
}

function editarModelo(id){
  abrirModalNovoModelo(id);
}

function duplicarModelo(id){
  const original = getModelos().find(m => m.id === id) || Object.entries(MODELOS_PADRAO).map(([key,val])=>({...val,id:key})).find(m => m.id === id);
  if (!original) return showToast('Modelo não encontrado');
  const copia = { nome: `${original.nome} (cópia)`, icone: original.icone, template: original.template, campos: [...original.campos] };
  salvarModelo(copia);
  renderModelos();
  showToast('Modelo duplicado com sucesso!');
}

function excluirModelo(id){
  const modelo = getModelos().find(m => m.id === id);
  if (!modelo) return showToast('Modelo não encontrado');
  confirmAction(`Tem certeza que deseja excluir o modelo "${modelo.nome}"?`, () => {
    const restantes = getModelos().filter(m => m.id !== id);
    DB.saveAll('modelos-documentos', restantes);
    renderModelos();
    showToast('Modelo excluído.');
  });
}

function fecharModeloModal(){
  const backdrop = document.getElementById('modalBackdrop');
  const body = document.getElementById('modalBody');
  if (backdrop) backdrop.hidden = true;
  if (body) body.innerHTML = '';
}

initModelos();

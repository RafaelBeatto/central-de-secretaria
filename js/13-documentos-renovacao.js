/* ============================================
   23. RENOVAÇÃO E VERSIONAMENTO DE DOCUMENTOS
   ============================================ */

const ESTADOS_VALIDADE = {
  valido: { label: 'Válido', emoji: '🟢', tom: 'ok', limite: 999 },
  atencao_60: { label: 'Vence em 60 dias', emoji: '🟡', tom: 'neutral', limite: 60 },
  atencao_30: { label: 'Vence em 30 dias', emoji: '🟠', tom: 'warn', limite: 30 },
  vencido: { label: 'Vencido', emoji: '🔴', tom: 'danger', limite: 0 },
  sem_validade: { label: 'Sem validade', emoji: '⚪', tom: 'neutral', limite: null }
};

function obterEstadoValidadeCompleto(doc) {
  if (!doc.dataValidade) {
    return { ...ESTADOS_VALIDADE.sem_validade, dias: null };
  }

  const dias = daysDiffFromToday(doc.dataValidade);

  if (dias < 0) {
    return { ...ESTADOS_VALIDADE.vencido, dias, diasTexto: `Venceu há ${Math.abs(dias)} dia${Math.abs(dias)===1?'':'s'}` };
  }
  if (dias === 0) {
    return { ...ESTADOS_VALIDADE.vencido, dias, diasTexto: 'Vence hoje' };
  }
  if (dias <= 30) {
    return { ...ESTADOS_VALIDADE.atencao_30, dias, diasTexto: `Faltam ${dias} dia${dias===1?'':'s'}` };
  }
  if (dias <= 60) {
    return { ...ESTADOS_VALIDADE.atencao_60, dias, diasTexto: `Faltam ${dias} dias` };
  }

  return { ...ESTADOS_VALIDADE.valido, dias, diasTexto: `Faltam ${dias} dias` };
}

function vincularDocumentoRenovacao(docAntigoId, docNovoId) {
  const docAntigo = DB.getById('documentos', docAntigoId);
  const docNovo = DB.getById('documentos', docNovoId);

  if (!docAntigo || !docNovo) return false;

  DB.update('documentos', docAntigoId, {
    versaoSubstituida: true,
    versaoNovaId: docNovoId,
    substituidoEm: Date.now()
  });

  DB.update('documentos', docNovoId, {
    versaoAntigaId: docAntigoId,
    dataRenovacao: Date.now()
  });

  RelacionamentosDB.adicionar('documento', docAntigoId, 'documento', docNovoId, 'renovacao');

  registrarHistorico({
    modulo: 'documento',
    acao: 'renovação',
    descricao: `Documento "${docAntigo.nome}" renovado. Nova versão: ${docNovo.nome}`,
    refId: docNovoId
  });

  return true;
}

function obterVersoes(docId) {
  const docs = DB.getAll('documentos');
  const versoes = [];
  let atual = docs.find(d => d.id === docId);

  if (!atual) return [];

  while (atual) {
    versoes.push(atual);
    if (atual.versaoAntigaId) {
      atual = docs.find(d => d.id === atual.versaoAntigaId);
    } else {
      atual = null;
    }
  }

  return versoes.reverse();
}

function renderizarHistoricoVersoes(docId) {
  const versoes = obterVersoes(docId);

  if (versoes.length <= 1) return '';

  return `<div class="versoes-section">
    <div class="versoes-title">📋 Histórico de versões (${versoes.length})</div>
    <div class="versoes-timeline">
      ${versoes.map((v, i) => {
        const estado = obterEstadoValidadeCompleto(v);
        const data = v.dataRenovacao ? formatDateBR(isoFromDate(new Date(v.dataRenovacao))) : 'Versão inicial';
        return `<div class="versao-item ${i === versoes.length - 1 ? 'ativa' : ''}">
          <div class="versao-header">
            <span class="versao-num">v${i + 1}</span>
            <span class="versao-data">${data}</span>
            ${i === versoes.length - 1 ? '<span class="badge ok">Atual</span>' : ''}
          </div>
          <div class="versao-info">
            <strong>${escapeHTML(v.nome)}</strong>
            <div class="versao-status">
              <span class="status-badge ${estado.tom}">${estado.emoji} ${estado.label}</span>
              <span class="versao-validade">${estado.diasTexto || '—'}</span>
            </div>
          </div>
        </div>`;
      }).join('')}
    </div>
  </div>`;
}

function abrirFormRenovarDocumento(docId) {
  const doc = DB.getById('documentos', docId);
  if (!doc) return;

  openModal(`Renovar documento: ${escapeHTML(doc.nome)}`, `
    <form id="formRenovacao" novalidate>
      <div class="form-group">
        <h3>Documento a renovar</h3>
        <div class="doc-atual">
          <strong>${escapeHTML(doc.nome)}</strong>
          <small>Validade: ${formatDateBR(doc.dataValidade) || 'Sem validade'}</small>
        </div>
      </div>

      <div class="form-grid">
        <div class="field full">
          <label for="ren_nome">Nome do novo documento *</label>
          <input class="input" id="ren_nome" required value="${escapeHTML(doc.nome)}" placeholder="Ex.: Certidão de Antecedentes v2">
        </div>
        <div class="field">
          <label for="ren_emissao">Data de emissão *</label>
          <input class="input" type="date" id="ren_emissao" required value="${todayISO()}">
        </div>
        <div class="field">
          <label for="ren_validade">Data de validade *</label>
          <input class="input" type="date" id="ren_validade" required>
        </div>
        <div class="field">
          <label for="ren_responsavel">Responsável</label>
          <input class="input" id="ren_responsavel" value="${escapeHTML(doc.responsavel || '')}">
        </div>
      </div>

      <div class="field full">
        <label for="ren_arquivo">Anexar novo arquivo</label>
        <input class="input" type="file" id="ren_arquivo">
      </div>

      <div class="field full">
        <label for="ren_obs">Observações</label>
        <textarea id="ren_obs" placeholder="Ex.: Renovação solicitada em..."></textarea>
      </div>

      <div class="notice-box">
        <b>ℹ️ Informação</b><br>
        O documento anterior será mantido no histórico. Você poderá acessar todas as versões.
      </div>

      <div class="modal-actions">
        <button type="button" class="btn btn-ghost" id="btnCancelarRenovacao">Cancelar</button>
        <button class="btn btn-primary">✓ Renovar documento</button>
      </div>
    </form>
  `);

  document.getElementById('btnCancelarRenovacao').onclick = closeModal;

  document.getElementById('formRenovacao').onsubmit = async (e) => {
    e.preventDefault();

    const nome = document.getElementById('ren_nome').value.trim();
    const dataEmissao = document.getElementById('ren_emissao').value;
    const dataValidade = document.getElementById('ren_validade').value;
    const responsavel = document.getElementById('ren_responsavel').value.trim();
    const obs = document.getElementById('ren_obs').value.trim();
    const arquivo = document.getElementById('ren_arquivo').files[0];

    if (!nome || !dataEmissao || !dataValidade) {
      showToast('Preencha os campos obrigatórios.');
      return;
    }

    const novoDoc = {
      id: DB.nextId('DOC', 'documento'),
      nome,
      categoria: doc.categoria || '',
      numero: doc.numero || '',
      orgao: doc.orgao || '',
      responsavel,
      dataEmissao,
      dataValidade,
      descricao: doc.descricao || '',
      observacoes: obs,
      tags: doc.tags || '',
      anexo: null,
      vinculos: doc.vinculos || [],
      criadoEm: Date.now(),
      atualizadoEm: Date.now(),
      versaoAntigaId: docId
    };

    if (arquivo) {
      novoDoc.anexo = await salvarAnexo(arquivo, 'documento');
    }

    DB.insert('documentos', novoDoc);
    vincularDocumentoRenovacao(docId, novoDoc.id);

    // Transferir relacionamentos
    const relacionados = RelacionamentosDB.obterPor('documento', docId);
    relacionados.forEach(r => {
      const destino = r.origem.modulo === 'documento' && r.origem.id === docId ? r.destino : r.origem;
      RelacionamentosDB.adicionar('documento', novoDoc.id, destino.modulo, destino.id);
    });

    showToast('✓ Documento renovado com sucesso.');
    closeModal();
    renderCurrentView();
  };
}

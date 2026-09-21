/* ---------------------------------------------------------
   22. RELACIONAMENTOS ENTRE REGISTROS
   --------------------------------------------------------- */

const RELACIONAMENTOS_STORAGE = 'cs_relacionamentos';

const RELACOES_VALIDAS = {
  'projeto': ['empresa', 'documento', 'solicitacao'],
  'empresa': ['projeto', 'documento', 'pagamento', 'solicitacao'],
  'documento': ['projeto', 'empresa', 'solicitacao'],
  'solicitacao': ['projeto', 'empresa', 'documento'],
  'cotacao': ['projeto', 'empresa'],
  'ordem': ['projeto', 'empresa'],
  'pagamento': ['projeto', 'empresa']
};

const RelacionamentosDB = {
  _getAll() {
    try {
      const raw = localStorage.getItem(RELACIONAMENTOS_STORAGE);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.error('Erro ao ler relacionamentos', e);
      return [];
    }
  },
  _save(list) {
    try {
      localStorage.setItem(RELACIONAMENTOS_STORAGE, JSON.stringify(list));
      return true;
    } catch (e) {
      console.error('Erro ao salvar relacionamentos', e);
      return false;
    }
  },
  adicionar(modulo1, id1, modulo2, id2, tipo = 'vinculo') {
    if (!RELACOES_VALIDAS[modulo1]?.includes(modulo2)) return false;
    if (!RELACOES_VALIDAS[modulo2]?.includes(modulo1)) return false;

    const lista = this._getAll();
    const chave = (m1, i1, m2, i2) => `${m1}:${i1}→${m2}:${i2}`;
    const c1 = chave(modulo1, id1, modulo2, id2);
    const c2 = chave(modulo2, id2, modulo1, id1);

    // Evita duplicatas
    if (lista.some(r => r.chave === c1 || r.chave === c2)) return false;

    const relacionamento = {
      id: uid('rel'),
      chave: c1,
      origem: { modulo: modulo1, id: id1 },
      destino: { modulo: modulo2, id: id2 },
      tipo,
      criadoEm: Date.now()
    };
    lista.push(relacionamento);
    return this._save(lista) ? relacionamento : null;
  },
  remover(modulo1, id1, modulo2, id2) {
    const lista = this._getAll();
    const chave1 = `${modulo1}:${id1}→${modulo2}:${id2}`;
    const chave2 = `${modulo2}:${id2}→${modulo1}:${id1}`;
    const nova = lista.filter(r => r.chave !== chave1 && r.chave !== chave2);
    return this._save(nova) ? true : false;
  },
  limparPorRegistro(modulo, id) {
    const lista = this._getAll();
    const nova = lista.filter(r => !(r.origem.modulo === modulo && r.origem.id === id) && !(r.destino.modulo === modulo && r.destino.id === id));
    return this._save(nova) ? true : false;
  },
  obterPor(modulo, id) {
    const lista = this._getAll();
    return lista.filter(r =>
      (r.origem.modulo === modulo && r.origem.id === id) ||
      (r.destino.modulo === modulo && r.destino.id === id)
    );
  },
  obterDestinos(modulo, id, modulo_destino = null) {
    return this.obterPor(modulo, id).map(r => {
      const isOrigem = r.origem.modulo === modulo && r.origem.id === id;
      const destino = isOrigem ? r.destino : r.origem;
      if (modulo_destino && destino.modulo !== modulo_destino) return null;
      return destino;
    }).filter(Boolean);
  }
};

function obterRegistroPorModuloId(modulo, id) {
  const entity = modulo === 'solicitacao' ? 'solicitacoes' : modulo + 's';
  if (modulo === 'cotacao' || modulo === 'ordem' || modulo === 'pagamento') return null; // Estruturas aninhadas
  return DB.getById(entity, id);
}

function renderRelacionados(modulo, id) {
  const relacionamentos = RelacionamentosDB.obterPor(modulo, id);
  if (!relacionamentos.length) return '';

  const grupos = {};
  relacionamentos.forEach(r => {
    const isOrigem = r.origem.modulo === modulo && r.origem.id === id;
    const destino = isOrigem ? r.destino : r.origem;
    const registro = obterRegistroPorModuloId(destino.modulo, destino.id);

    if (!registro) return; // Referência quebrada

    if (!grupos[destino.modulo]) grupos[destino.modulo] = [];
    grupos[destino.modulo].push({
      id: destino.id,
      modulo: destino.modulo,
      registro,
      relacionamento: r
    });
  });

  const labels = {
    'projeto': 'Projetos',
    'empresa': 'Empresas',
    'documento': 'Documentos',
    'solicitacao': 'Tarefas'
  };

  const icons = {
    'projeto': '📁',
    'empresa': '🏢',
    'documento': '📄',
    'solicitacao': '📝'
  };

  let html = '<div class="relacionados-section"><div class="relacionados-title">🔗 Relacionados</div><div class="relacionados-grid">';

  Object.entries(grupos).forEach(([mod, items]) => {
    html += `<div class="relacionados-grupo"><div class="relacionados-grupo-label">${icons[mod] || '🔗'} ${labels[mod] || mod}</div>`;
    items.forEach(item => {
      const nome = item.registro.nome || item.registro.titulo || item.registro.assunto || `${mod} ${item.id}`;
      const btnAcao = mod === 'projeto' ? 'abrirDetalheProjeto' :
                      mod === 'documento' ? 'abrirDetalheDocumento' :
                      mod === 'solicitacao' ? 'abrirDetalheSolicitacao' :
                      mod === 'empresa' ? 'abrirDetalheEmpresa' : null;

      html += `<div class="relacionado-item">
        <div class="relacionado-info">
          <strong>${escapeHTML(nome)}</strong>
          <small>${escapeHTML(item.registro.responsavel || item.registro.descricao || '')}</small>
        </div>
        <div class="relacionado-actions">
          ${btnAcao ? `<button class="btn btn-sm btn-primary" data-action="acessar-relacionado" data-func="${btnAcao}" data-id="${escapeHTML(item.id)}">Acessar</button>` : ''}
          <button class="btn btn-sm btn-danger" data-action="remover-relacionado" data-modulo1="${escapeHTML(modulo)}" data-id1="${escapeHTML(id)}" data-modulo2="${escapeHTML(mod)}" data-id2="${escapeHTML(item.id)}">✕</button>
        </div>
      </div>`;
    });
    html += '</div>';
  });

  html += '</div></div>';

  return html;
}

function renderSelectorRelacionados(modulo, id, modulo_relacionar) {
  const registrosAtuais = RelacionamentosDB.obterDestinos(modulo, id, modulo_relacionar);
  const idsAtuais = new Set(registrosAtuais.map(r => r.id));

  const entity = modulo_relacionar === 'solicitacao' ? 'solicitacoes' : modulo_relacionar + 's';
  const registros = DB.getAll(entity).filter(r => r.id !== id && !idsAtuais.has(r.id));

  if (!registros.length) return '<p class="empty-inline">Nenhum registro disponível para vincular.</p>';

  const labels = {
    'nome': 'Nome',
    'titulo': 'Título',
    'assunto': 'Assunto',
    'codigo': 'Código',
    'numero': 'Número'
  };

  const getLabel = (r) => r.nome || r.titulo || r.assunto || r.codigo || `${modulo_relacionar} ${r.id}`;

  return `<div class="relacionados-selector">
    <label for="rel_${modulo_relacionar}">Vincular ${labels[modulo_relacionar] || modulo_relacionar}:</label>
    <select id="rel_${modulo_relacionar}" class="input">
      <option value="">— Selecione</option>
      ${registros.map(r => `<option value="${escapeHTML(r.id)}">${escapeHTML(getLabel(r))}</option>`).join('')}
    </select>
  </div>`;
}

function processarRelacionadosEmForm(modulo, id, formId) {
  const form = document.getElementById(formId);
  if (!form) return;

  const selects = form.querySelectorAll('[id^="rel_"]');
  selects.forEach(select => {
    select.addEventListener('change', () => {
      const modulo_destino = select.id.replace('rel_', '');
      const id_destino = select.value;

      if (id_destino) {
        const resultado = RelacionamentosDB.adicionar(modulo, id, modulo_destino, id_destino);
        if (resultado) {
          showToast(`✓ Vínculo adicionado: ${modulo} → ${modulo_destino}`);
          select.value = '';
          // Recarregar a seção de relacionados se está visível
          const relSection = document.querySelector('.relacionados-section');
          if (relSection) location.reload(); // Reload simples para atualizar
        } else {
          showToast('⚠ Não foi possível criar o vínculo.');
        }
      }
    });
  });
}

// Delegação de eventos global para botões de relacionados
document.addEventListener('click', (e) => {
  if (e.target.matches('[data-action="acessar-relacionado"]')) {
    const funcao = e.target.dataset.func;
    const id = e.target.dataset.id;
    if (window[funcao] && typeof window[funcao] === 'function') {
      window[funcao](id);
    }
  }

  if (e.target.matches('[data-action="remover-relacionado"]')) {
    const modulo1 = e.target.dataset.modulo1;
    const id1 = e.target.dataset.id1;
    const modulo2 = e.target.dataset.modulo2;
    const id2 = e.target.dataset.id2;

    confirmAction('Deseja remover este vínculo?', () => {
      if (RelacionamentosDB.remover(modulo1, id1, modulo2, id2)) {
        showToast('✓ Vínculo removido.');
        location.reload();
      } else {
        showToast('⚠ Erro ao remover vínculo.');
      }
    });
  }
});

/* ---------------------------------------------------------
   1. CAMADA DE DADOS (DB)
   --------------------------------------------------------- */
const STORAGE_KEYS = {
  projetos: 'cs_projetos',
  solicitacoes: 'cs_solicitacoes',
  documentos: 'cs_documentos',
  eventos: 'cs_eventos',
  historico: 'cs_historico',
  config: 'cs_config',
  'kanban-quadros': 'cs_kanban_quadros',
  'modelos-documentos': 'cs_modelos',
  'gerador-modelos': 'cs_gerador_modelos',
  'gerador-documentos': 'cs_gerador_docs',
  'gerador-empresas': 'cs_gerador_empresas',
  'atendimento-alunos': 'cs_atend_alunos',
  'atendimento-profissionais': 'cs_atend_profissionais',
  atendimentos: 'cs_atendimentos'
};

/* Migração: versões anteriores gravavam Kanban e Modelos na chave "undefined"
   (entidades ausentes em STORAGE_KEYS). Recupera esses dados uma única vez. */
(function migrarChaveIndefinida(){
  try{
    const raw = localStorage.getItem('undefined');
    if (!raw) return;
    const lista = JSON.parse(raw);
    if (!Array.isArray(lista) || !lista.length) { localStorage.removeItem('undefined'); return; }

    const quadros = lista.filter(i => i && Array.isArray(i.colunas));
    const modelos = lista.filter(i => i && Array.isArray(i.campos) && i.template);

    if (quadros.length && !localStorage.getItem('cs_kanban_quadros')) {
      localStorage.setItem('cs_kanban_quadros', JSON.stringify(quadros));
    }
    if (modelos.length && !localStorage.getItem('cs_modelos')) {
      localStorage.setItem('cs_modelos', JSON.stringify(modelos));
    }
    localStorage.removeItem('undefined');
  }catch(e){
    console.warn('Migração de dados antigos ignorada:', e);
  }
})();

const DB = {
  _lastWriteFailed: null,
  _read(key){
    try{
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    }catch(e){
      console.error('Erro ao ler localStorage', key, e);
      return null;
    }
  },
  _write(key, value){
    try{
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    }catch(e){
      this._lastWriteFailed = { key, error:e, at:Date.now() };
      console.error('Erro ao gravar localStorage', key, e);
      return false;
    }
  },
  consumeWriteError(){
    const error=this._lastWriteFailed;
    this._lastWriteFailed=null;
    return error;
  },
  _key(entity){
    const key = STORAGE_KEYS[entity];
    if (!key) {
      console.error('DB: entidade desconhecida "' + entity + '". Registre-a em STORAGE_KEYS.');
      return null;
    }
    return key;
  },
  getAll(entity){
    const key = this._key(entity);
    if (!key) return [];
    const lista = this._read(key);
    return Array.isArray(lista) ? lista : [];
  },
  saveAll(entity, list){
    const key = this._key(entity);
    if (!key) return false;
    return this._write(key, list);
  },
  getById(entity, id){
    return this.getAll(entity).find(item => item.id === id) || null;
  },
  insert(entity, item){
    const list = this.getAll(entity);
    list.push(item);
    const ok=this.saveAll(entity, list);
    return ok ? item : null;
  },
  update(entity, id, patch){
    const list = this.getAll(entity);
    const idx = list.findIndex(i => i.id === id);
    if (idx === -1) return null;
    list[idx] = { ...list[idx], ...patch, atualizadoEm: Date.now() };
    const ok=this.saveAll(entity, list);
    return ok ? list[idx] : null;
  },
  remove(entity, id){
    const list = this.getAll(entity);
    const filtered = list.filter(i => i.id !== id);
    const ok=this.saveAll(entity, filtered);
    return ok && filtered.length !== list.length;
  },
  getConfig(){
    return this._read(STORAGE_KEYS.config) || {
      theme: 'light',
      seeded: false,
      counters: { projeto: 0, solicitacao: 0, documento: 0 }
    };
  },
  saveConfig(cfg){
    this._write(STORAGE_KEYS.config, cfg);
  },
  nextId(prefix, counterKey){
    const cfg = this.getConfig();
    cfg.counters[counterKey] = (cfg.counters[counterKey] || 0) + 1;
    this.saveConfig(cfg);
    return `${prefix}-${String(cfg.counters[counterKey]).padStart(4, '0')}`;
  }
};

/* ---------------------------------------------------------
   2. UTILITÁRIOS DE DATA
   --------------------------------------------------------- */
function todayISO(){
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function isoFromDate(d){
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
/* Soma meses a uma data ISO sem "pular" mês: 31/01 + 1 mês = 28/02 (ou 29).
   diaPreferido mantém o dia original numa série (ex.: dia 31 volta em março). */
function addMesesISO(iso, meses, diaPreferido){
  const d=parseISODate(iso); if(!d) return iso;
  const dia=diaPreferido||d.getDate();
  const alvo=new Date(d.getFullYear(), d.getMonth()+meses, 1);
  alvo.setDate(Math.min(dia, new Date(alvo.getFullYear(), alvo.getMonth()+1, 0).getDate()));
  return isoFromDate(alvo);
}
function parseISODate(iso){
  if (!iso) return null;
  const [y,m,d] = iso.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m-1, d);
}
function daysDiffFromToday(iso){
  const target = parseISODate(iso);
  if (!target) return null;
  const now = new Date();
  const todayMid = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffMs = target.getTime() - todayMid.getTime();
  return Math.round(diffMs / 86400000);
}
function formatDateBR(iso){
  const d = parseISODate(iso);
  if (!d) return '—';
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
}

/* Lê os filtros de qualquer barra de filtros pelo atributo data-filter. */
function normalizarFiltro(valor){
  return String(valor ?? '')
    .trim()
    .toLocaleLowerCase('pt-BR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'');
}
function getFiltrosValores(containerId){
  const container = document.getElementById(containerId);
  const valores = {};
  if (!container) return valores;
  container.querySelectorAll('[data-filter]').forEach(el => {
    valores[el.dataset.filter] = (el.value || '').trim();
  });
  return valores;
}
function prazoTexto(iso){
  if (!iso) return { texto: 'Sem prazo definido', tom: 'neutral' };
  const dias = daysDiffFromToday(iso);
  if (dias < 0) return { texto: `ATRASADO há ${Math.abs(dias)} dia${Math.abs(dias)===1?'':'s'}`, tom: 'danger' };
  if (dias === 0) return { texto: 'Prazo hoje', tom: 'warn' };
  if (dias === 1) return { texto: 'Prazo amanhã', tom: 'warn' };
  if (dias <= 5) return { texto: `Prazo em ${dias} dias`, tom: 'warn' };
  return { texto: `Prazo em ${dias} dias`, tom: 'neutral' };
}
function timestampToBR(ts){
  const d = new Date(ts);
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()} — ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

/* ---------------------------------------------------------
   3. HISTÓRICO / AUDITORIA
   --------------------------------------------------------- */
function registrarHistorico({ modulo, acao, descricao, refId }){
  const registro = {
    id: 'HIS-' + Date.now() + '-' + Math.floor(Math.random()*1000),
    timestamp: Date.now(),
    modulo, acao, descricao, refId: refId || null
  };
  const lista = DB.getAll('historico');
  lista.unshift(registro);
  // manter histórico em tamanho razoável
  if (lista.length > 1000) lista.length = 1000;
  DB.saveAll('historico', lista);
  return registro;
}

/* Tarefas "Renovar documento" criadas automaticamente por versões antigas
   do módulo Documentos: ficam fora das listas (a renovação hoje é
   acompanhada direto em Documentos). */
function ehTarefaRenovacaoDocumento(s){
  return !!(s && s.criadoAutomaticamente && s.origemDocumentoId);
}

/* ---------------------------------------------------------
   3.1 SUBTAREFAS / CHECKLIST GENÉRICO
   Usado dentro de Solicitações para dividir uma tarefa grande em
   passos menores, com progresso visual. Cada registro ganha um
   array `subtarefas: [{id, texto, feito}]`.
   --------------------------------------------------------- */
function subtarefasProgresso(item){
  const lista = item?.subtarefas || [];
  const total = lista.length;
  const feitas = lista.filter(t => t.feito).length;
  const pct = total ? Math.round((feitas/total)*100) : 0;
  return { total, feitas, pct };
}
function subtarefasHTML(entity, item){
  const lista = item.subtarefas || [];
  const prog = subtarefasProgresso(item);
  return `<div class="detail-block subtarefas-block" data-subt-entity="${entity}" data-subt-id="${item.id}">
    <div class="detail-label">Checklist / subtarefas</div>
    ${lista.length ? `<div class="checklist-progress">${prog.feitas}/${prog.total} concluídas${prog.total?` · ${prog.pct}%`:''}</div><div class="subt-progress-bar"><div class="subt-progress-fill" style="width:${prog.pct}%"></div></div>` : ''}
    <div class="checklist-edit subt-list">
      ${lista.map(t => `<div class="checklist-edit-row subt-row ${t.feito?'is-done':''}">
        <input type="checkbox" class="subt-toggle" data-subt-item="${t.id}" ${t.feito?'checked':''}>
        <span class="subt-text" style="flex:1">${escapeHTML(t.texto)}</span>
        <button type="button" class="btn btn-sm btn-danger subt-remove" data-subt-item="${t.id}" title="Remover">✕</button>
      </div>`).join('') || '<p class="muted">Nenhuma subtarefa adicionada ainda.</p>'}
    </div>
    <form class="subt-add-form" style="display:flex;gap:8px;margin-top:10px">
      <input type="text" class="input subt-add-input" placeholder="Adicionar passo..." style="flex:1">
      <button type="submit" class="btn btn-sm btn-primary">＋ Adicionar</button>
    </form>
  </div>`;
}
function bindSubtarefasEvents(entity, id, onChange){
  const bloco = document.querySelector(`.subtarefas-block[data-subt-entity="${entity}"][data-subt-id="${id}"]`);
  if (!bloco) return;
  const salvar = (novaLista, descricaoHist) => {
    const item = DB.getById(entity, id); if (!item) return;
    DB.update(entity, id, { subtarefas: novaLista });
    if (descricaoHist){
      registrarHistorico({ modulo:'secretaria', acao:'edição', descricao: descricaoHist, refId: id });
    }
    if (onChange) onChange();
  };
  bloco.querySelectorAll('.subt-toggle').forEach(cb => {
    cb.addEventListener('change', (e) => {
      const item = DB.getById(entity, id); if (!item) return;
      const lista = (item.subtarefas || []).map(t => t.id === e.target.dataset.subtItem ? { ...t, feito: e.target.checked } : t);
      const alterado = lista.find(t => t.id === e.target.dataset.subtItem);
      salvar(lista, `Subtarefa "${alterado?.texto || ''}" marcada como ${e.target.checked?'concluída':'pendente'}.`);
    });
  });
  bloco.querySelectorAll('.subt-remove').forEach(btn => {
    btn.addEventListener('click', () => {
      const item = DB.getById(entity, id); if (!item) return;
      const removida = (item.subtarefas || []).find(t => t.id === btn.dataset.subtItem);
      const lista = (item.subtarefas || []).filter(t => t.id !== btn.dataset.subtItem);
      salvar(lista, removida ? `Subtarefa "${removida.texto}" removida.` : null);
    });
  });
  const form = bloco.querySelector('.subt-add-form');
  if (form) form.addEventListener('submit', (e) => {
    e.preventDefault();
    const input = form.querySelector('.subt-add-input');
    const texto = input.value.trim();
    if (!texto) return;
    const item = DB.getById(entity, id); if (!item) return;
    const nova = { id: 'ST-' + Date.now() + '-' + Math.floor(Math.random()*1000), texto, feito:false };
    const lista = [...(item.subtarefas || []), nova];
    salvar(lista, `Subtarefa "${texto}" adicionada.`);
  });
}

/* ---------------------------------------------------------
   4. SITUAÇÃO / CÁLCULOS DE NEGÓCIO
   --------------------------------------------------------- */
function situacaoDocumento(doc){
  if (!doc.dataValidade) return { chave: 'sem_validade', label: 'Sem validade', tom: 'neutral', emoji: '⚪' };
  const dias = daysDiffFromToday(doc.dataValidade);
  if (dias < 0) return { chave: 'vencido', label: 'Vencido', tom: 'danger', emoji: '🔴' };
  if (dias <= 30) return { chave: 'vencendo', label: 'Vencendo', tom: 'warn', emoji: '🟡' };
  return { chave: 'valido', label: 'Válido', tom: 'ok', emoji: '🟢' };
}

/* ---------------------------------------------------------
   5. LIMPEZA DE DADOS DE DEMONSTRAÇÃO
   --------------------------------------------------------- */
function removerDadosDeDemonstracao(){
  // Remove registros criados pela versão de demonstração anterior.
  // Registros reais nunca recebem a propriedade "exemplo".
  ['projetos','solicitacoes','documentos'].forEach(entity => {
    const lista = DB.getAll(entity);
    const reais = lista.filter(item => item && item.exemplo !== true);
    if (reais.length !== lista.length) DB.saveAll(entity, reais);
  });

  // Remove também o lançamento automático que a versão anterior
  // criava no histórico ao carregar dados de demonstração.
  const historico = DB.getAll('historico');
  const historicoLimpo = historico.filter(item => {
    const texto = String(item?.descricao || '').toLowerCase();
    return !texto.includes('dados de exemplo carregados') &&
           !texto.includes('dados de exemplo removidos');
  });
  if (historicoLimpo.length !== historico.length) DB.saveAll('historico', historicoLimpo);

  // Recalcula os contadores com base apenas nos registros reais.
  const cfg = DB.getConfig();
  const maxNumero = (entity, regex) => DB.getAll(entity).reduce((max, item) => {
    const m = String(item?.id || '').match(regex);
    return m ? Math.max(max, Number(m[1]) || 0) : max;
  }, 0);
  cfg.counters = {
    projeto: maxNumero('projetos', /^PRJ-(\d+)$/),
    solicitacao: maxNumero('solicitacoes', /^SOL-(\d+)$/),
    documento: maxNumero('documentos', /^DOC-(\d+)$/)
  };
  cfg.seeded = false;
  DB.saveConfig(cfg);
}

/* ---------------------------------------------------------
   6. UI — TOAST / CONFIRMAÇÃO / MODAL
   --------------------------------------------------------- */
let toastTimer = null;
function showToast(msg){
  const storageError = DB?.consumeWriteError?.();
  if(storageError){
    msg = String(msg||'').startsWith('⚠')
      ? `${msg} Verifique o armazenamento do navegador.`
      : `⚠ Não foi possível salvar os dados. Verifique o armazenamento do navegador.`;
  }
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, 3200);
}

function confirmAction(text, onConfirm){
  const backdrop = document.getElementById('confirmBackdrop');
  const btnOk = document.getElementById('btnConfirmOk');
  const btnCancel = document.getElementById('btnConfirmCancel');
  if (!backdrop || !btnOk || !btnCancel) return;

  document.getElementById('confirmText').textContent = text;
  backdrop.hidden = false;

  function cleanup(){
    backdrop.hidden = true;
    btnOk.removeEventListener('click', onOk);
    btnCancel.removeEventListener('click', onCancel);
    backdrop.removeEventListener('click', onBackdropClick);
  }
  function onOk(){ cleanup(); onConfirm(); }
  function onCancel(){ cleanup(); }
  function onBackdropClick(e){
    if (e.target === backdrop) onCancel();
  }

  btnOk.addEventListener('click', onOk);
  btnCancel.addEventListener('click', onCancel);
  backdrop.addEventListener('click', onBackdropClick);
}


function openModal(title, bodyHTML){
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalBody').innerHTML = bodyHTML;
  document.getElementById('modalBackdrop').hidden = false;
}
function closeModal(){
  document.getElementById('modalBackdrop').hidden = true;
  document.getElementById('modalBody').innerHTML = '';
}
document.getElementById('btnCloseModal').addEventListener('click', closeModal);
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  const modal = document.getElementById('modalBackdrop');
  const confirm = document.getElementById('confirmBackdrop');
  if (confirm && !confirm.hidden) confirm.hidden = true;
  else if (modal && !modal.hidden) closeModal();
  else closeSidebarMobile();
});
document.getElementById('modalBackdrop').addEventListener('click', (e) => {
  if (e.target.id === 'modalBackdrop') closeModal();
});


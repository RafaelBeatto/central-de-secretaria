/* ---------------------------------------------------------
   18. INDICADOR DE ARMAZENAMENTO
   Os registros ficam no localStorage (limite prático ~5 MB por
   site) e os anexos no IndexedDB (limite bem maior). O gargalo
   real é o localStorage, então é ele que ganha a barra.
   --------------------------------------------------------- */

const LIMITE_LOCALSTORAGE = 5 * 1024 * 1024; // ~5 MB, padrão da maioria dos navegadores
const AVISO_ATENCAO = 0.75;
const AVISO_CRITICO = 0.90;

const ROTULO_ENTIDADE = {
  projetos: 'Projetos',
  solicitacoes: 'Atividades',
  documentos: 'Documentos',
  eventos: 'Agenda',
  historico: 'Histórico',
  'kanban-quadros': 'Quadros Kanban',
  'modelos-documentos': 'Modelos',
  config: 'Configurações'
};

function formatarBytes(bytes){
  if (!bytes) return '0 KB';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/* localStorage guarda UTF-16: ~2 bytes por caractere. */
function bytesDaChave(key){
  const valor = localStorage.getItem(key);
  if (valor === null) return 0;
  return (key.length + valor.length) * 2;
}

function medirLocalStorage(){
  const porEntidade = [];
  let totalSistema = 0;

  Object.entries(STORAGE_KEYS).forEach(([entidade, chave]) => {
    const bytes = bytesDaChave(chave);
    totalSistema += bytes;
    let registros = null;
    if (entidade !== 'config') {
      try {
        const lista = JSON.parse(localStorage.getItem(chave) || '[]');
        registros = Array.isArray(lista) ? lista.length : null;
      } catch (e) { registros = null; }
    }
    porEntidade.push({
      entidade,
      rotulo: ROTULO_ENTIDADE[entidade] || entidade,
      bytes,
      registros
    });
  });

  // Tudo que estiver no localStorage e não pertencer ao sistema
  let totalGeral = 0;
  for (let i = 0; i < localStorage.length; i++) {
    totalGeral += bytesDaChave(localStorage.key(i));
  }

  porEntidade.sort((a, b) => b.bytes - a.bytes);
  return { porEntidade, totalSistema, totalGeral, outros: Math.max(0, totalGeral - totalSistema) };
}

/* Lista os anexos guardados no IndexedDB (ProjectFiles usa a store 'arquivos'). */
async function medirAnexos(){
  try {
    if (typeof ProjectFiles === 'undefined') return { quantidade: 0, bytes: 0 };
    const db = await ProjectFiles.open();
    return await new Promise((resolve) => {
      const tx = db.transaction('arquivos', 'readonly');
      const req = tx.objectStore('arquivos').openCursor();
      let quantidade = 0, bytes = 0;
      req.onsuccess = () => {
        const cursor = req.result;
        if (cursor) {
          const r = cursor.value || {};
          quantidade++;
          bytes += Number(r.tamanho) || (r.blob && r.blob.size) || 0;
          cursor.continue();
        } else {
          resolve({ quantidade, bytes });
        }
      };
      req.onerror = () => resolve({ quantidade: 0, bytes: 0 });
    });
  } catch (e) {
    console.warn('Não foi possível medir os anexos:', e);
    return { quantidade: 0, bytes: 0 };
  }
}

function nivelDeUso(pct){
  if (pct >= AVISO_CRITICO) return 'critico';
  if (pct >= AVISO_ATENCAO) return 'atencao';
  return 'ok';
}

/* Barra compacta no rodapé da barra lateral */
function renderIndicadorArmazenamento(){
  const alvo = document.getElementById('storageIndicator');
  if (!alvo) return;

  const { totalGeral } = medirLocalStorage();
  const pct = Math.min(1, totalGeral / LIMITE_LOCALSTORAGE);
  const nivel = nivelDeUso(pct);
  const pctTexto = pct < 0.01 ? '<1' : Math.round(pct * 100);

  alvo.hidden = false;
  alvo.innerHTML = `
    <button class="storage-btn is-${nivel}" id="btnArmazenamento" title="Ver detalhes do armazenamento">
      <div class="storage-top">
        <span class="storage-label">Armazenamento</span>
        <span class="storage-pct">${pctTexto}%</span>
      </div>
      <div class="storage-bar"><div class="storage-fill" style="width:${Math.max(2, pct * 100)}%"></div></div>
      <div class="storage-sub">${formatarBytes(totalGeral)} de ~5 MB</div>
    </button>`;

  document.getElementById('btnArmazenamento')
    .addEventListener('click', abrirDetalhesArmazenamento);

  return { pct, nivel };
}

async function abrirDetalhesArmazenamento(){
  const { porEntidade, totalGeral, outros } = medirLocalStorage();
  const pct = Math.min(1, totalGeral / LIMITE_LOCALSTORAGE);
  const nivel = nivelDeUso(pct);

  openModal('Armazenamento do sistema', `
    <div class="storage-detail">
      <div class="storage-summary is-${nivel}">
        <div class="storage-summary-num">${formatarBytes(totalGeral)}</div>
        <div class="storage-summary-sub">de aproximadamente 5 MB disponíveis (${Math.round(pct * 100)}%)</div>
        <div class="storage-bar lg"><div class="storage-fill" style="width:${Math.max(2, pct * 100)}%"></div></div>
      </div>

      ${nivel === 'critico' ? `<div class="notice-box danger">
        <b>! Espaço quase esgotado</b><br>
        Novos registros podem deixar de ser salvos. Libere espaço reduzindo o histórico
        antes de continuar cadastrando.
      </div>` : ''}
      ${nivel === 'atencao' ? `<div class="notice-box">
        <b>! Atenção</b><br>
        O armazenamento já passou de 75%. Vale reduzir o histórico antigo.
      </div>` : ''}

      <h4 class="storage-h4">Onde o espaço está sendo usado</h4>
      <table class="data-table storage-table">
        <thead><tr><th>Módulo</th><th>Registros</th><th>Espaço</th></tr></thead>
        <tbody>
          ${porEntidade.filter(e => e.bytes > 0).map(e => `
            <tr>
              <td>${escapeHTML(e.rotulo)}</td>
              <td>${e.registros === null ? '—' : e.registros}</td>
              <td>${formatarBytes(e.bytes)}</td>
            </tr>`).join('')}
          ${outros > 0 ? `<tr><td>Outros dados do navegador</td><td>—</td><td>${formatarBytes(outros)}</td></tr>` : ''}
        </tbody>
      </table>

      <h4 class="storage-h4">Arquivos anexados</h4>
      <p class="muted" id="storageAnexos">Calculando...</p>

      <div class="notice-box">
        <b>Como funciona</b><br>
        Os registros (tarefas, documentos, agenda, histórico) ocupam o espaço da barra acima,
        limitado pelo navegador. Os arquivos anexados ficam em outra área, bem maior, e não
        concorrem por esse espaço.
      </div>

      <div class="modal-actions">
        <button type="button" class="btn btn-ghost" id="btnFecharArmazenamento">Fechar</button>
        <button type="button" class="btn btn-danger" id="btnReduzirHistorico">Reduzir histórico</button>
      </div>
    </div>
  `);

  document.getElementById('btnFecharArmazenamento').addEventListener('click', closeModal);
  document.getElementById('btnReduzirHistorico').addEventListener('click', reduzirHistorico);

  const anexos = await medirAnexos();
  const alvo = document.getElementById('storageAnexos');
  if (alvo) {
    alvo.textContent = anexos.quantidade
      ? `${anexos.quantidade} arquivo${anexos.quantidade === 1 ? '' : 's'} · ${formatarBytes(anexos.bytes)}`
      : 'Nenhum arquivo anexado.';
  }
}

/* O histórico costuma ser o maior consumidor: mantém os 200 mais recentes. */
function reduzirHistorico(){
  const lista = DB.getAll('historico');
  if (lista.length <= 200) {
    return showToast('O histórico já está enxuto (menos de 200 registros).');
  }
  const removidos = lista.length - 200;
  confirmAction(
    `Manter apenas os 200 lançamentos mais recentes do histórico? ${removidos} registros antigos serão apagados.`,
    () => {
      DB.saveAll('historico', lista.slice(0, 200));
      closeModal();
      renderIndicadorArmazenamento();
      if (currentView === 'historico') renderHistorico();
      showToast(`✓ ${removidos} registros antigos removidos do histórico.`);
    }
  );
}

/* Aviso único por sessão quando o espaço está apertado. */
function verificarArmazenamentoNoInicio(){
  const info = renderIndicadorArmazenamento();
  if (!info) return;
  if (info.nivel === 'critico') {
    setTimeout(() => showToast('⚠ Armazenamento quase cheio. Abra o indicador na barra lateral.'), 1500);
  }
}

/* Mantém a barra em dia sem precisar recarregar a página:
   toda gravação passa por DB.saveAll. */
(function monitorarGravacoes(){
  const original = DB.saveAll.bind(DB);
  let agendado = null;
  DB.saveAll = function(entity, list){
    const r = original(entity, list);
    clearTimeout(agendado);
    agendado = setTimeout(() => renderIndicadorArmazenamento(), 400);
    return r;
  };
})();

verificarArmazenamentoNoInicio();

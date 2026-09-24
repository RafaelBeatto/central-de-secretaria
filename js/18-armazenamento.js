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
  solicitacoes: 'Tarefas da Secretaria',
  documentos: 'Documentos',
  eventos: 'Agenda',
  historico: 'Histórico',
  atendimentos: 'Atendimentos',
  'atendimento-alunos': 'Alunos',
  'atendimento-profissionais': 'Profissionais',
  'gerador-documentos': 'Documentos gerados',
  'gerador-modelos': 'Modelos do Gerador',
  'gerador-empresas': 'Empresas',
  'kanban-quadros': 'Quadros antigos do Kanban',
  'modelos-documentos': 'Modelos antigos',
  config: 'Configurações'
};

/* ---------------------------------------------------------
   PROTEÇÃO CONTRA LIMPEZA AUTOMÁTICA
   Sem isto, o navegador pode apagar os anexos (IndexedDB) sozinho
   quando o disco fica cheio. navigator.storage.persist() pede para
   ele nunca apagar. O Chrome/Edge decidem sem perguntar (aceitam para
   sites usados com frequência, nos favoritos ou instalados); o Firefox
   pergunta. Pedir de novo é inofensivo.
   --------------------------------------------------------- */
let armazenamentoProtegido = null; // null = ainda não sabemos / navegador sem suporte
async function protegerArmazenamento(){
  try{
    if (!navigator.storage?.persist) return null;
    armazenamentoProtegido = await navigator.storage.persisted() || await navigator.storage.persist();
  }catch(e){ armazenamentoProtegido = null; }
  return armazenamentoProtegido;
}

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
    if (typeof ProjectFiles === 'undefined') return { quantidade: 0, bytes: 0, orfaos: [] };
    const db = await ProjectFiles.open();
    // Um arquivo é "órfão" quando o id dele não aparece em nenhum registro
    // salvo (tarefa, documento, projeto, empresa, gerador, configuração…).
    let usados = '';
    for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.startsWith('cs_')) usados += localStorage.getItem(k); }
    return await new Promise((resolve) => {
      const tx = db.transaction('arquivos', 'readonly');
      const req = tx.objectStore('arquivos').openCursor();
      let quantidade = 0, bytes = 0; const orfaos = [];
      req.onsuccess = () => {
        const cursor = req.result;
        if (cursor) {
          const r = cursor.value || {};
          const tam = Number(r.tamanho) || (r.blob && r.blob.size) || 0;
          quantidade++; bytes += tam;
          if (r.id && !usados.includes(String(r.id))) orfaos.push({ id: r.id, bytes: tam, criadoEm: r.criadoEm || 0 });
          cursor.continue();
        } else {
          resolve({ quantidade, bytes, orfaos });
        }
      };
      req.onerror = () => resolve({ quantidade: 0, bytes: 0, orfaos: [] });
    });
  } catch (e) {
    console.warn('Não foi possível medir os anexos:', e);
    return { quantidade: 0, bytes: 0, orfaos: [] };
  }
}

/* Apaga só arquivos de itens já excluídos. Ignora os da última hora
   (um formulário pode estar salvando o arquivo antes do registro). */
function liberarAnexosOrfaos(orfaos){
  const lista = orfaos.filter(o => Date.now() - o.criadoEm > 3600000);
  if (!lista.length) return showToast('Nada para liberar agora.');
  const total = lista.reduce((s, o) => s + o.bytes, 0);
  confirmAction(`Apagar ${lista.length} arquivo(s) de itens que já foram excluídos (${formatarBytes(total)})? Nenhum registro atual usa esses arquivos. Os backups antigos continuam com eles.`, async () => {
    for (const o of lista) await ProjectFiles.remove(o.id).catch(() => {});
    registrarHistorico({ modulo:'sistema', acao:'limpeza', descricao:`${lista.length} arquivo(s) de itens excluídos apagados (${formatarBytes(total)}).` });
    showToast(`✓ ${formatarBytes(total)} liberados.`);
    abrirDetalhesArmazenamento();
  });
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
        Novos registros podem deixar de ser salvos. Libere espaço limpando o histórico
        antigo antes de continuar cadastrando.
      </div>` : ''}
      ${nivel === 'atencao' ? `<div class="notice-box">
        <b>! Atenção</b><br>
        O armazenamento já passou de 75%. Vale limpar o histórico antigo.
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
      <p class="storage-protecao" id="storageProtecao"></p>

      <div class="notice-box">
        <b>Como funciona</b><br>
        Os registros (tarefas, documentos, agenda, histórico) ocupam o espaço da barra acima,
        limitado pelo navegador. Os arquivos anexados ficam em outra área, bem maior, e não
        concorrem por esse espaço.
      </div>

      <div class="modal-actions">
        <button type="button" class="btn btn-ghost" id="btnFecharArmazenamento">Fechar</button>
        <button type="button" class="btn" id="btnLimparHistoricoArm">Limpar histórico…</button>
      </div>
    </div>
  `);

  document.getElementById('btnFecharArmazenamento').addEventListener('click', closeModal);
  document.getElementById('btnLimparHistoricoArm').addEventListener('click', () => abrirLimparHistorico());

  const protegido = await protegerArmazenamento();
  const prot = document.getElementById('storageProtecao');
  if (prot) {
    prot.className = 'storage-protecao ' + (protegido ? 'is-ok' : protegido === false ? 'is-aviso' : '');
    prot.textContent = protegido
      ? '✓ Protegidos: o navegador não apaga estes arquivos sozinho.'
      : protegido === false
        ? '⚠ O navegador ainda não protegeu os arquivos contra limpeza automática. Adicionar o site aos favoritos (Ctrl+D) costuma resolver no Chrome e no Edge. Mantenha o backup em dia.'
        : 'Este navegador não informa se protege os arquivos. Mantenha o backup em dia.';
  }

  const anexos = await medirAnexos();
  const alvo = document.getElementById('storageAnexos');
  if (alvo) {
    alvo.textContent = anexos.quantidade
      ? `${anexos.quantidade} arquivo${anexos.quantidade === 1 ? '' : 's'} · ${formatarBytes(anexos.bytes)}`
      : 'Nenhum arquivo anexado.';
    const orfaos = anexos.orfaos.filter(o => Date.now() - o.criadoEm > 3600000);
    if (orfaos.length) {
      const p = document.createElement('p');
      p.className = 'storage-orfaos';
      p.innerHTML = `${orfaos.length} deles são de itens já excluídos (${formatarBytes(orfaos.reduce((s, o) => s + o.bytes, 0))}) e deixam o backup maior. <button type="button" class="btn btn-sm" id="btnLiberarOrfaos">Liberar espaço</button>`;
      alvo.after(p);
      p.querySelector('button').onclick = () => liberarAnexosOrfaos(orfaos);
    }
  }
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
protegerArmazenamento();

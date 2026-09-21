/* ---------------------------------------------------------
   19. RELATÓRIOS
   --------------------------------------------------------- */
const periodoSelect = document.getElementById('periodoRelatorio');
periodoSelect.addEventListener('change', () => {
  const custom = periodoSelect.value === 'personalizado';
  document.getElementById('relatorioDe').hidden = !custom;
  document.getElementById('relatorioAte').hidden = !custom;
});

function intervaloPeriodo(){
  const hoje = new Date();
  const fimHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 23,59,59);
  const inicioHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  const val = periodoSelect.value;
  if (val === 'hoje') return [inicioHoje, fimHoje];
  if (val === '7dias'){ const ini = new Date(inicioHoje); ini.setDate(ini.getDate()-6); return [ini, fimHoje]; }
  if (val === 'mes') return [new Date(hoje.getFullYear(), hoje.getMonth(), 1), fimHoje];
  if (val === 'mesAnterior'){
    const ini = new Date(hoje.getFullYear(), hoje.getMonth()-1, 1);
    const fim = new Date(hoje.getFullYear(), hoje.getMonth(), 0, 23,59,59);
    return [ini, fim];
  }
  if (val === 'personalizado'){
    const de = document.getElementById('relatorioDe').value;
    const ate = document.getElementById('relatorioAte').value;
    const inicio = de ? parseISODate(de) : new Date(0);
    // Data final deve incluir o dia inteiro, e não somente 00:00.
    const fim = ate ? parseISODate(ate) : fimHoje;
    if (fim && ate) fim.setHours(23, 59, 59, 999);
    return [inicio, fim];
  }
  return [new Date(0), fimHoje];
}

function renderRelatorios(){
  document.getElementById('relatorioConteudo').innerHTML = `<p class="muted">Selecione o período e clique em "Gerar relatório".</p>`;
}

document.getElementById('btnGerarRelatorio').addEventListener('click', gerarRelatorio);
document.getElementById('btnImprimirRelatorio').addEventListener('click', () => window.print());
const btnBackupCompleto=document.getElementById('btnBackupCompleto');
const btnRestaurarBackup=document.getElementById('btnRestaurarBackup');
const inputRestaurarBackup=document.getElementById('inputRestaurarBackup');
btnBackupCompleto?.addEventListener('click',exportarBackupCompleto);
btnRestaurarBackup?.addEventListener('click',()=>inputRestaurarBackup?.click());
inputRestaurarBackup?.addEventListener('change',()=>{const file=inputRestaurarBackup.files?.[0]; importarBackupCompleto(file); inputRestaurarBackup.value='';});

function gerarRelatorio(){
  const [ini, fim] = intervaloPeriodo();
  if (!ini || !fim || Number.isNaN(ini.getTime()) || Number.isNaN(fim.getTime())) {
    showToast('Período inválido.');
    return;
  }
  if (ini.getTime() > fim.getTime()) {
    showToast('A data inicial não pode ser maior que a data final.');
    return;
  }
  const noPeriodoData = (iso) => {
    const d = parseISODate(iso);
    return d && d.getTime() >= ini.getTime() && d.getTime() <= fim.getTime();
  };

  const solicitacoes = DB.getAll('solicitacoes').filter(s => noPeriodoData(s.dataRecebimento));
  const documentosTodos = DB.getAll('documentos');
  const documentosPeriodo = documentosTodos.filter(d => noPeriodoData(d.dataEmissao));

  const dados = {
    solicRecebidas: solicitacoes.length,
    solicConcluidas: solicitacoes.filter(s => s.status==='Concluída').length,
    solicPendentes: solicitacoes.filter(s => s.status==='Pendente').length,
    solicAtrasadas: DB.getAll('solicitacoes').filter(solicitacaoAtrasada).length,
    docsCadastrados: documentosPeriodo.length,
    docsVencidos: documentosTodos.filter(d => situacaoDocumento(d).chave==='vencido').length,
    docsVencendo: documentosTodos.filter(d => situacaoDocumento(d).chave==='vencendo').length
  };

  const itensGrid = [
    ['Solicitações recebidas', dados.solicRecebidas],
    ['Solicitações concluídas', dados.solicConcluidas],
    ['Solicitações pendentes', dados.solicPendentes],
    ['Solicitações atrasadas', dados.solicAtrasadas],
    ['Documentos cadastrados no período', dados.docsCadastrados],
    ['Documentos vencidos (total)', dados.docsVencidos],
    ['Documentos vencendo (total)', dados.docsVencendo]
  ];

  const maxBarra = Math.max(1, dados.solicRecebidas, dados.solicConcluidas, dados.solicPendentes, dados.solicAtrasadas);

  document.getElementById('relatorioConteudo').innerHTML = `
    <p class="muted">Período analisado: ${formatDateBR(isoFromDate(ini))} a ${formatDateBR(isoFromDate(fim))}</p>
    <div class="report-grid">
      ${itensGrid.map(([label,num]) => `
        <div class="report-item">
          <div class="r-num">${num}</div>
          <div class="r-label">${label}</div>
        </div>`).join('')}
    </div>
    <h3 class="report-section-title">Solicitações no período</h3>
    <div style="display:flex;flex-direction:column;gap:8px">
      ${[['Recebidas',dados.solicRecebidas,'var(--primary)'],['Concluídas',dados.solicConcluidas,'var(--ok)'],['Pendentes',dados.solicPendentes,'var(--neutral)'],['Atrasadas',dados.solicAtrasadas,'var(--danger)']]
        .map(([label,val,cor]) => `
        <div style="display:flex;align-items:center;gap:10px">
          <span style="width:90px;font-size:12.5px" class="muted">${label}</span>
          <div style="flex:1;background:var(--surface-2);border-radius:6px;overflow:hidden;height:16px">
            <div style="width:${(val/maxBarra*100)}%;background:${cor};height:100%"></div>
          </div>
          <span style="width:24px;text-align:right;font-family:var(--font-mono);font-size:12.5px">${val}</span>
        </div>`).join('')}
    </div>
  `;
}
function isoFromDate(d){
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}


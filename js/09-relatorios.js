/* =========================================================
   RELATÓRIOS — relatório de atividades do período
   Um documento só, com o cabeçalho da instituição (o mesmo do
   Gerador de Documentos), que junta o que foi feito no período em
   cada área: Secretaria, Agenda, Atendimentos, Documentos e Projetos.
   A pré-visualização na tela é exatamente o que vai para a impressão
   ou para o PDF. O backup dos dados continua nesta tela.
   ========================================================= */
const RL_SECOES = [
  ['secretaria', 'Secretaria'], ['agenda', 'Agenda'], ['atendimentos', 'Atendimentos'],
  ['documentos', 'Documentos'], ['projetos', 'Projetos']
];
let rlEstado = { periodo:'mes', de:'', ate:'', secoes: Object.fromEntries(RL_SECOES.map(([k]) => [k, true])) };
let rlHTMLAtual = '';
const rlEsc = s => escapeHTML(s ?? '');

/* Estilo do documento: vai junto do HTML, então vale igual na tela,
   na impressão e no PDF. */
const RL_DOC_CSS = `
  .rl-doc{font-family:'Times New Roman',Georgia,serif;color:#000;font-size:11pt;line-height:1.45}
  .rl-doc h2,.rl-doc h3,.rl-doc p,.rl-doc td,.rl-doc th{font-family:inherit;color:#000}
  .rl-doc h2{font-size:12.5pt;margin:22px 0 8px;padding-bottom:4px;border-bottom:1.5px solid #000;text-transform:uppercase;letter-spacing:.3px}
  .rl-doc h3{font-size:11pt;margin:14px 0 6px}
  .rl-doc .rl-sub{text-align:center;margin:-14px 0 18px;font-size:10.5pt}
  .rl-doc table{width:100%;border-collapse:collapse;margin:4px 0 8px;font-size:10pt}
  .rl-doc th,.rl-doc td{border:1px solid #999;padding:4px 6px;text-align:left;vertical-align:top}
  .rl-doc th{background:#f0f0f0;font-weight:bold}
  .rl-doc td.n,.rl-doc th.n{text-align:right;white-space:nowrap}
  .rl-doc .rl-resumo{display:grid;grid-template-columns:repeat(3,1fr);gap:0;border:1px solid #999;margin:6px 0 4px}
  .rl-doc .rl-resumo div{padding:6px 8px;border:1px solid #ddd}
  .rl-doc .rl-resumo b{display:block;font-size:14pt}
  .rl-doc .rl-resumo span{font-size:9.5pt}
  .rl-doc .rl-nada{font-style:italic;color:#555;margin:4px 0}
  .rl-doc .rl-nota{font-size:9.5pt;color:#444;margin:4px 0}
  .rl-doc tr,.rl-doc .rl-resumo{break-inside:avoid}
`;

/* ---------- período ---------- */
function rlIntervalo(){
  const hoje = todayISO(), d = parseISODate(hoje);
  const iso = (a, m, dia) => isoFromDate(new Date(a, m, dia));
  switch (rlEstado.periodo) {
    case 'mes': return [iso(d.getFullYear(), d.getMonth(), 1), hoje];
    case 'mesAnterior': return [iso(d.getFullYear(), d.getMonth() - 1, 1), iso(d.getFullYear(), d.getMonth(), 0)];
    case '7dias': return [atendAddDias(hoje, -6), hoje];
    case 'ano': return [`${hoje.slice(0,4)}-01-01`, hoje];
    default: return [rlEstado.de || hoje.slice(0,8) + '01', rlEstado.ate || hoje];
  }
}
const rlNoPeriodo = (iso, de, ate) => !!iso && iso >= de && iso <= ate;
const rlDiaDe = ts => ts ? isoFromDate(new Date(ts)) : '';
const rlData = iso => iso ? formatDateBR(iso) : '—';

/* ---------- coleta por área ---------- */
function rlSecretaria(de, ate){
  const tarefas = DB.getAll('solicitacoes').filter(s => !ehTarefaRenovacaoDocumento(s));
  const concluidas = [];
  tarefas.forEach(s => {
    if (tarefaRecorrente(s)) return;
    const dia = s.dataConclusao || (s.status === 'Concluída' ? rlDiaDe(s.atualizadoEm) : '');
    if (s.status === 'Concluída' && rlNoPeriodo(dia, de, ate)) concluidas.push({ dia, titulo:s.titulo, responsavel:s.responsavel });
  });
  // Recorrentes: cada vez que foi feita fica registrada no Histórico.
  const recorrentes = new Map(tarefas.filter(tarefaRecorrente).map(s => [s.id, s]));
  DB.getAll('historico').filter(h => h.modulo === 'secretaria' && h.acao === 'conclusão' && recorrentes.has(h.refId)).forEach(h => {
    const dia = rlDiaDe(h.timestamp);
    if (rlNoPeriodo(dia, de, ate)) { const s = recorrentes.get(h.refId); concluidas.push({ dia, titulo:`${s.titulo} (${s.recorrencia.frequencia.toLowerCase()})`, responsavel:s.responsavel }); }
  });
  concluidas.sort((a,b) => a.dia.localeCompare(b.dia));
  const criadas = tarefas.filter(s => rlNoPeriodo(s.dataRecebimento || rlDiaDe(s.criadoEm), de, ate)).length;
  const abertas = tarefas.filter(s => !['Concluída','Cancelada'].includes(s.status));
  const atrasadas = abertas.filter(solicitacaoAtrasada).map(s => ({ prazo:prazoAtividade(s).data, titulo:s.titulo, responsavel:s.responsavel })).sort((a,b) => a.prazo.localeCompare(b.prazo));
  return { concluidas, criadas, abertas:abertas.length, atrasadas };
}
function rlAgenda(de, ate){
  const eventos = DB.getAll('eventos').filter(e => rlNoPeriodo(e.data, de, ate))
    .sort((a,b) => (a.data + (a.horarioInicio||'')).localeCompare(b.data + (b.horarioInicio||'')));
  return { eventos, realizados: eventos.filter(e => e.concluido).length };
}
function rlAtendimentos(de, ate){
  const lista = getAtendimentos().filter(a => rlNoPeriodo(a.data, de, ate) && atEfetivo(a));
  const porProf = {}, motivos = {};
  lista.forEach(a => {
    const p = porProf[a.profissionalNome] = porProf[a.profissionalNome] || { total:0, veio:0, faltou:0, alunos:new Set() };
    p.total++; p.alunos.add(a.alunoId);
    if (a.presenca === 'veio') p.veio++;
    if (a.presenca === 'faltou') { p.faltou++; const m = a.faltaMotivo || 'Sem motivo'; motivos[m] = (motivos[m]||0) + 1; }
  });
  return { r: atResumo(lista), alunos: new Set(lista.map(a => a.alunoId)).size, porProf, motivos };
}
function rlDocumentos(de, ate){
  const docs = DB.getAll('documentos');
  const renovados = [];
  docs.forEach(d => (d.versoes||[]).forEach(v => { const dia = rlDiaDe(v.arquivadoEm); if (rlNoPeriodo(dia, de, ate)) renovados.push({ dia, nome:d.nome, validade:d.dataValidade }); }));
  renovados.sort((a,b) => a.dia.localeCompare(b.dia));
  const cadastrados = docs.filter(d => rlNoPeriodo(rlDiaDe(d.criadoEm) || d.dataEmissao, de, ate)).length;
  const vencidos = docs.filter(d => situacaoDocumento(d).chave === 'vencido').sort((a,b) => a.dataValidade.localeCompare(b.dataValidade));
  const vencendo = docs.filter(d => { const n = d.dataValidade ? daysDiffFromToday(d.dataValidade) : null; return n !== null && n >= 0 && n <= 30; }).sort((a,b) => a.dataValidade.localeCompare(b.dataValidade));
  return { total:docs.length, renovados, cadastrados, vencidos, vencendo };
}
function rlProjetos(de, ate){
  const todos = DB.getAll('projetos');
  const recursos = todos.filter(p => p.tipo === 'recurso' && !p.arquivado).map(r => ({ r, f: recursoResumoFinanceiro(r) }));
  const pagamentos = [];
  todos.filter(p => p.tipo !== 'recurso').forEach(p => (p.pagamentos||[]).forEach(pg => {
    if (rlNoPeriodo(pg.data, de, ate)) pagamentos.push({ ...pg, execucao:p.nome, recurso: p.paiId ? DB.getById('projetos', p.paiId)?.nome : '' });
  }));
  pagamentos.sort((a,b) => a.data.localeCompare(b.data));
  return { recursos, pagamentos, totalPago: pagamentos.reduce((s,p) => s + (Number(p.valor)||0), 0) };
}

/* ---------- documento ---------- */
function rlTabela(cab, linhas, numericas = []){
  return `<table><thead><tr>${cab.map((c,i) => `<th${numericas.includes(i)?' class="n"':''}>${c}</th>`).join('')}</tr></thead>
    <tbody>${linhas.map(l => `<tr>${l.map((c,i) => `<td${numericas.includes(i)?' class="n"':''}>${c}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
}
const rlNada = t => `<p class="rl-nada">${t}</p>`;

async function rlMontarHTML(){
  const [de, ate] = rlIntervalo();
  const sec = rlEstado.secoes;
  const S = rlSecretaria(de, ate), A = rlAgenda(de, ate), T = rlAtendimentos(de, ate), D = rlDocumentos(de, ate), P = rlProjetos(de, ate);
  const resumo = [
    sec.secretaria && [S.concluidas.length, 'tarefas concluídas'],
    sec.agenda && [A.eventos.length, 'compromissos na agenda'],
    sec.atendimentos && [T.r.total, 'atendimentos'],
    sec.atendimentos && [T.r.taxa === null ? '—' : T.r.taxa + '%', 'de presença nos atendimentos'],
    sec.documentos && [D.renovados.length, 'documentos renovados'],
    sec.projetos && [formatMoney(P.totalPago), 'pagos nos projetos']
  ].filter(Boolean);

  const partes = [];
  if (sec.secretaria) partes.push(`<h2>Secretaria</h2>
    <p>${S.criadas} tarefa(s) registrada(s) no período · ${S.concluidas.length} concluída(s) · ${S.abertas} em aberto hoje${S.atrasadas.length ? `, das quais ${S.atrasadas.length} atrasada(s)` : ''}.</p>
    <h3>Tarefas concluídas</h3>
    ${S.concluidas.length ? rlTabela(['Data','Tarefa','Responsável'], S.concluidas.map(c => [rlData(c.dia), rlEsc(c.titulo), rlEsc(c.responsavel||'—')])) : rlNada('Nenhuma tarefa concluída no período.')}
    ${S.atrasadas.length ? `<h3>Atrasadas hoje</h3>${rlTabela(['Prazo','Tarefa','Responsável'], S.atrasadas.map(c => [rlData(c.prazo), rlEsc(c.titulo), rlEsc(c.responsavel||'—')]))}` : ''}`);
  if (sec.agenda) partes.push(`<h2>Agenda</h2>
    ${A.eventos.length ? `<p>${A.eventos.length} compromisso(s) no período, ${A.realizados} marcado(s) como realizado(s).</p>
      ${rlTabela(['Data','Hora','Compromisso','Local','Realizado'], A.eventos.map(e => [rlData(e.data), rlEsc(e.horarioInicio||'—'), rlEsc(`${e.titulo}${e.tipo?` (${e.tipo})`:''}`), rlEsc(e.local||'—'), e.concluido ? 'Sim' : '—']))}`
      : rlNada('Nenhum compromisso no período.')}`);
  if (sec.atendimentos) partes.push(`<h2>Atendimentos</h2>
    ${T.r.total ? `<p>${T.r.total} atendimento(s) de ${T.alunos} aluno(s): ${T.r.veio} com presença, ${T.r.faltou} falta(s)${T.r.semRegistro ? `, ${T.r.semRegistro} sem registro` : ''}. Presença de ${T.r.taxa === null ? '—' : T.r.taxa + '%'} (vieram ÷ vieram + faltaram).</p>
      ${rlTabela(['Profissional','Alunos','Atendimentos','Vieram','Faltaram'], Object.entries(T.porProf).sort((a,b) => a[0].localeCompare(b[0],'pt-BR')).map(([n,p]) => [rlEsc(n), p.alunos.size, p.total, p.veio, p.faltou]), [1,2,3,4])}
      ${Object.keys(T.motivos).length ? `<p class="rl-nota">Motivos das faltas: ${Object.entries(T.motivos).sort((a,b) => b[1]-a[1]).map(([m,n]) => `${rlEsc(m)} (${n})`).join('; ')}.</p>` : ''}`
      : rlNada('Nenhum atendimento no período.')}`);
  if (sec.documentos) partes.push(`<h2>Documentos</h2>
    <p>${D.total} documento(s) cadastrado(s) no total · ${D.cadastrados} novo(s) no período · ${D.renovados.length} renovado(s) no período.</p>
    ${D.renovados.length ? `<h3>Renovados no período</h3>${rlTabela(['Renovado em','Documento','Nova validade'], D.renovados.map(r => [rlData(r.dia), rlEsc(r.nome), rlData(r.validade)]))}` : ''}
    <h3>Situação hoje</h3>
    ${D.vencidos.length || D.vencendo.length ? rlTabela(['Documento','Validade','Situação'], [
      ...D.vencidos.map(d => [rlEsc(d.nome), rlData(d.dataValidade), 'Vencido']),
      ...D.vencendo.map(d => [rlEsc(d.nome), rlData(d.dataValidade), `Vence em ${daysDiffFromToday(d.dataValidade)} dia(s)`])
    ]) : rlNada('Nenhum documento vencido ou vencendo nos próximos 30 dias.')}`);
  if (sec.projetos) partes.push(`<h2>Projetos</h2>
    ${P.recursos.length ? rlTabela(['Recurso','Recebido','Executado (total)','Saldo disponível'], P.recursos.map(({r,f}) => [rlEsc(r.nome), formatMoney(f.recebido), formatMoney(f.executado), formatMoney(f.saldoTotalDisponivel)]), [1,2,3]) : ''}
    <h3>Pagamentos no período</h3>
    ${P.pagamentos.length ? rlTabela(['Data','Execução','Fornecedor','Valor'], [
      ...P.pagamentos.map(p => [rlData(p.data), rlEsc(p.execucao + (p.recurso ? ` — ${p.recurso}` : '')), rlEsc(p.fornecedor||'—'), formatMoney(p.valor)]),
      ['', '', '<b>Total</b>', `<b>${formatMoney(P.totalPago)}</b>`]
    ], [3]) : rlNada('Nenhum pagamento registrado no período.')}`);

  const cabecalho = await montarCabecalhoInstitucionalHTML();
  const agora = new Date();
  return `<div class="doc-a4-page"><style>${RL_DOC_CSS}</style>${cabecalho}
    <div class="rl-doc">
      <div class="doc-a4-titulo">Relatório de atividades</div>
      <p class="rl-sub">Período: ${rlData(de)} a ${rlData(ate)} · emitido em ${formatDateBR(todayISO())} às ${String(agora.getHours()).padStart(2,'0')}:${String(agora.getMinutes()).padStart(2,'0')}</p>
      ${resumo.length ? `<div class="rl-resumo">${resumo.map(([v,t]) => `<div><b>${v}</b><span>${t}</span></div>`).join('')}</div>` : ''}
      ${partes.join('') || rlNada('Escolha ao menos uma área para o relatório.')}
    </div>
    <div class="doc-a4-assinatura"><div class="doc-a4-linha-assinatura">_______________________________</div><div>Responsável</div></div>
  </div>`;
}

/* ---------- tela ---------- */
function renderRelatorios(){
  const root = document.getElementById('rlRoot'); if (!root) return;
  const [de, ate] = rlIntervalo();
  const chip = (v, t) => `<button type="button" class="hi-chip ${rlEstado.periodo===v?'is-ativo':''}" data-rl="periodo" data-valor="${v}" aria-pressed="${rlEstado.periodo===v}">${t}</button>`;
  root.innerHTML = `<div class="rl-layout">
    <div class="rl-principal">
      <div class="rl-controles">
        <div class="rl-linha">
          <span class="rl-rotulo">Período</span>
          <div class="hi-chips">${chip('mes','Este mês')}${chip('mesAnterior','Mês passado')}${chip('7dias','Últimos 7 dias')}${chip('ano','Este ano')}${chip('custom','Escolher…')}</div>
          ${rlEstado.periodo === 'custom' ? `<div class="rl-datas"><label>De <input type="date" class="input" id="rlDe" value="${de}"></label><label>Até <input type="date" class="input" id="rlAte" value="${ate}"></label></div>` : ''}
        </div>
        <div class="rl-linha">
          <span class="rl-rotulo">Incluir</span>
          <div class="rl-secoes">${RL_SECOES.map(([k,t]) => `<label class="rl-check"><input type="checkbox" data-rl-secao="${k}" ${rlEstado.secoes[k]?'checked':''}> ${t}</label>`).join('')}</div>
        </div>
        <div class="rl-botoes">
          <button type="button" class="btn btn-primary" data-rl="pdf">⭳ Salvar PDF</button>
          <button type="button" class="btn" data-rl="imprimir">🖨 Imprimir</button>
        </div>
      </div>
      <div class="rl-previa doc-a4-preview-wrap" id="rlPrevia"><p class="muted">Montando o relatório…</p></div>
    </div>
    <aside class="rl-lateral">
      <section class="db-card">
        <header><h2>Backup dos dados</h2></header>
        <p class="rl-texto">Uma cópia de tudo — registros e arquivos anexados — num arquivo só. Guarde fora do computador (pendrive, e-mail, nuvem).</p>
        <div class="rl-botoes-col">
          <button type="button" class="btn btn-primary" data-rl="backup">💾 Baixar backup</button>
          <button type="button" class="btn" data-rl="restaurar">📥 Restaurar backup…</button>
          <input type="file" id="inputRestaurarBackup" accept=".json,application/json" hidden>
        </div>
        <p class="rl-texto rl-aviso">Restaurar substitui os dados atuais pelos do arquivo.</p>
      </section>
    </aside>
  </div>`;
  rlAtualizarPrevia();
}

let rlGeracao = 0;
async function rlAtualizarPrevia(){
  const previa = document.getElementById('rlPrevia'); if (!previa) return;
  const [de, ate] = rlIntervalo();
  if (de > ate) { previa.innerHTML = '<p class="rl-erro">A data inicial é depois da data final.</p>'; rlHTMLAtual = ''; return; }
  const minha = ++rlGeracao;
  const html = await rlMontarHTML();
  if (minha !== rlGeracao) return; // chegou outra atualização no meio
  rlHTMLAtual = html;
  previa.innerHTML = html;
}
function rlNomeArquivo(){ const [de, ate] = rlIntervalo(); return `Relatorio_Atividades_${de}_a_${ate}`; }

(function ligarRelatorios(){
  const root = document.getElementById('rlRoot'); if (!root) return;
  root.addEventListener('click', e => {
    const b = e.target.closest('[data-rl]'); if (!b || !root.contains(b)) return;
    const a = b.dataset.rl;
    if (a === 'periodo') {
      if (b.dataset.valor === 'custom' && rlEstado.periodo !== 'custom') { const [de, ate] = rlIntervalo(); rlEstado.de = de; rlEstado.ate = ate; }
      rlEstado.periodo = b.dataset.valor; renderRelatorios();
    }
    else if (a === 'pdf' || a === 'imprimir') {
      if (!rlHTMLAtual) return showToast('Confira o período do relatório.');
      a === 'pdf' ? salvarPdfGerador(rlHTMLAtual, rlNomeArquivo()) : imprimirDocumentoGerador(rlHTMLAtual, rlNomeArquivo());
    }
    else if (a === 'backup') exportarBackupCompleto();
    else if (a === 'restaurar') document.getElementById('inputRestaurarBackup')?.click();
  });
  root.addEventListener('change', e => {
    const t = e.target;
    if (t.dataset.rlSecao) { rlEstado.secoes[t.dataset.rlSecao] = t.checked; rlAtualizarPrevia(); }
    else if (t.id === 'rlDe' || t.id === 'rlAte') { rlEstado[t.id === 'rlDe' ? 'de' : 'ate'] = t.value; rlAtualizarPrevia(); }
    else if (t.id === 'inputRestaurarBackup') { const file = t.files?.[0]; if (file) importarBackupCompleto(file); t.value = ''; }
  });
})();

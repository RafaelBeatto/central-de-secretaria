/* =========================================================
   ATENDIMENTOS — controle semanal dos atendimentos dos alunos
   Faixa com os dias da semana, lista do dia com presença em um
   clique e um painel ao lado para o atendimento, o aluno ou o
   profissional. Coleções: 'atendimentos', 'atendimento-alunos',
   'atendimento-profissionais'.
   ========================================================= */

/* ---------- cadastros de apoio: alunos e profissionais ---------- */
function getAtendAlunos(){ return DB.getAll('atendimento-alunos'); }
function getAtendProfissionais(){ return DB.getAll('atendimento-profissionais'); }

function garantirAtendCadastro(entity, nome){
  const nomeTrim = (nome || '').trim();
  if (!nomeTrim) return null;
  const existente = DB.getAll(entity).find(x => x.nome.toLowerCase() === nomeTrim.toLowerCase());
  if (existente) return existente;
  const novo = { id: uid(entity === 'atendimento-alunos' ? 'alu' : 'prof'), nome: nomeTrim };
  DB.insert(entity, novo);
  return novo;
}
function atendCamposDe(entity){
  return entity === 'atendimento-alunos' ? { campoId:'alunoId', campoNome:'alunoNome' } : { campoId:'profissionalId', campoNome:'profissionalNome' };
}
function renomearAtendCadastro(entity, id, novoNome){
  const nomeTrim = (novoNome || '').trim();
  if (!nomeTrim) return showToast('Digite um nome.');
  DB.update(entity, id, { nome: nomeTrim });
  const { campoId, campoNome } = atendCamposDe(entity);
  DB.saveAll('atendimentos', getAtendimentos().map(a => a[campoId] === id ? { ...a, [campoNome]: nomeTrim } : a));
  registrarHistorico({ modulo:'atendimentos', acao:'edição', descricao:`Cadastro renomeado para "${nomeTrim}".`, refId:id });
}
/* Une duplicatas ("João" e "joão"): os atendimentos da origem passam para o destino. */
function mesclarAtendCadastro(entity, origemId, destinoId){
  if (origemId === destinoId) return showToast('Selecione dois registros diferentes para mesclar.');
  const destino = DB.getById(entity, destinoId);
  if (!destino) return showToast('Registro de destino não encontrado.');
  const { campoId, campoNome } = atendCamposDe(entity);
  DB.saveAll('atendimentos', getAtendimentos().map(a => a[campoId] === origemId ? { ...a, [campoId]:destinoId, [campoNome]:destino.nome } : a));
  DB.remove(entity, origemId);
  registrarHistorico({ modulo:'atendimentos', acao:'edição', descricao:`Cadastro mesclado em "${destino.nome}".`, refId:destinoId });
}
function excluirAtendCadastro(entity, id){
  const { campoId } = atendCamposDe(entity);
  if (getAtendimentos().some(a => a[campoId] === id)) return showToast('Não é possível excluir: existem atendimentos com este nome. Mescle-o em outro antes.');
  const item = DB.getById(entity, id);
  confirmAction(`Excluir "${item?.nome}"? Não há nenhum atendimento com este nome.`, () => {
    DB.remove(entity, id);
    showToast('Registro excluído.');
    renderGestaoAlunosProfissionais();
  });
}

/* ---------- datas ---------- */
const AT_DIAS = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];
const AT_DIAS_CURTOS = ['dom','seg','ter','qua','qui','sex','sáb'];
function atendSegundaDaSemana(iso){
  const d = parseISODate(iso) || new Date();
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return isoFromDate(d);
}
function atendAddDias(iso, dias){ const d = parseISODate(iso); d.setDate(d.getDate() + dias); return isoFromDate(d); }
function atendDatasDaSemana(segundaIso){ return [0,1,2,3,4,5,6].map(i => atendAddDias(segundaIso, i)); }
function atFimDoAno(iso){ return `${iso.slice(0,4)}-12-31`; }

/* Outras telas ainda ajustam esta variável diretamente. */
let atendSemanaAtual = atendSegundaDaSemana(todayISO());

/* ---------- dados ---------- */
function getAtendimentos(){ return DB.getAll('atendimentos'); }

function criarAtendimento({ alunoNome, profissionalNome, data, horario, observacao, serieId }){
  const aluno = garantirAtendCadastro('atendimento-alunos', alunoNome);
  const prof = garantirAtendCadastro('atendimento-profissionais', profissionalNome);
  if (!aluno || !prof || !data || !horario) return null;
  const registro = {
    id: uid('atd'), alunoId: aluno.id, alunoNome: aluno.nome, profissionalId: prof.id, profissionalNome: prof.nome,
    data, horario, observacao: (observacao || '').trim(), presenca: 'nao_informado', faltaMotivo: '', faltaObs: '',
    remarcadoPara: null, remarcadoDeId: null, serieId: serieId || null, criadoEm: Date.now()
  };
  DB.insert('atendimentos', registro);
  return registro;
}
/* Toda semana até `ate` (padrão: fim do ano). Trava de 52 semanas. */
function criarAtendimentosRecorrentes({ alunoNome, profissionalNome, data, horario, observacao, ate }){
  const serieId = uid('serie'), limite = ate || atFimDoAno(data), criados = [];
  for (let i = 0, dia = data; i < 52 && dia <= limite; i++, dia = atendAddDias(dia, 7)) {
    const r = criarAtendimento({ alunoNome, profissionalNome, data: dia, horario, observacao, serieId });
    if (r) criados.push(r);
  }
  return criados;
}
function atualizarPresenca(id, presenca, faltaMotivo, faltaObs){
  const patch = { presenca, faltaMotivo: presenca === 'faltou' ? (faltaMotivo || '') : '', faltaObs: presenca === 'faltou' ? (faltaObs || '') : '' };
  const a = DB.update('atendimentos', id, patch);
  if (a) registrarHistorico({ modulo:'atendimentos', acao:'status', descricao:`Presença de "${a.alunoNome}" (${formatDateBR(a.data)} ${a.horario}) marcada como ${presenca === 'veio' ? 'Veio' : presenca === 'faltou' ? 'Faltou' : 'Não informado'}.`, refId:id });
  return a;
}

/* Atendimento remarcado (o original) foi "movido": não conta em totais
   nem fica pendente — quem conta é a cópia na nova data. */
function atEfetivo(a){ return !a.remarcadoPara; }
function atResumo(lista){
  const ef = lista.filter(atEfetivo);
  const veio = ef.filter(a => a.presenca === 'veio').length;
  const faltou = ef.filter(a => a.presenca === 'faltou').length;
  const semRegistro = ef.filter(a => a.presenca === 'nao_informado');
  return { total: ef.length, veio, faltou, semRegistro: semRegistro.length,
    semRegistroPassado: semRegistro.filter(a => a.data < todayISO()).length,
    taxa: veio + faltou ? Math.round(veio / (veio + faltou) * 100) : null };
}
function atSerieFutura(a){
  return a.serieId ? getAtendimentos().filter(x => x.serieId === a.serieId && x.data >= a.data && x.presenca === 'nao_informado' && !x.remarcadoPara) : [];
}

/* ---------- estado da tela ---------- */
let atEstado = { dia: todayISO(), painel: null, busca: '', prof: '', soPendentes: false, histDe: '', histAte: '' };

function atDiaNaSemana(){
  const datas = atendDatasDaSemana(atendSemanaAtual);
  if (atEstado.dia === 'semana' || datas.includes(atEstado.dia)) return;
  atEstado.dia = datas.includes(todayISO()) ? todayISO() : datas[0];
}
function atIrPara(painel, data){
  if (data) { atendSemanaAtual = atendSegundaDaSemana(data); atEstado.dia = data; }
  atEstado.painel = painel;
  if (!document.getElementById('modalBackdrop').hidden) closeModal();
  if (typeof currentView !== 'undefined' && currentView !== 'atendimentos') goToView('atendimentos'); else renderAtendimentos();
  if (painel && window.innerWidth <= 1100) document.getElementById('atRoot')?.scrollIntoView({ block:'start' });
}
/* Pontos de entrada usados por Dashboard, Pendências, Pesquisa e Gerador. */
function abrirAtendimento(id){ const a = DB.getById('atendimentos', id); if (a) atIrPara({ tipo:'atd', id }, a.data); }
function abrirHistoricoAluno(alunoId){ if (DB.getById('atendimento-alunos', alunoId)) atIrPara({ tipo:'aluno', id: alunoId }); else showToast('Aluno não encontrado'); }
function abrirFichaProfissional(profId){ if (DB.getById('atendimento-profissionais', profId)) atIrPara({ tipo:'prof', id: profId }); else showToast('Profissional não encontrado'); }

/* ---------- desenho ---------- */
const atEsc = s => escapeHTML(s ?? '');

function atFiltrar(lista){
  const q = normalizarFiltro(atEstado.busca);
  return lista.filter(a => (!q || normalizarFiltro(`${a.alunoNome} ${a.profissionalNome} ${a.observacao||''}`).includes(q))
    && (!atEstado.prof || a.profissionalId === atEstado.prof)
    && (!atEstado.soPendentes || (atEfetivo(a) && a.presenca === 'nao_informado' && a.data < todayISO())));
}

function atTituloSemana(){
  const ini = parseISODate(atendSemanaAtual), fim = parseISODate(atendAddDias(atendSemanaAtual, 6));
  const mes = d => d.toLocaleDateString('pt-BR', { month:'long' });
  return ini.getMonth() === fim.getMonth() ? `${ini.getDate()} a ${fim.getDate()} de ${mes(fim)}` : `${ini.getDate()} de ${mes(ini)} a ${fim.getDate()} de ${mes(fim)}`;
}

function atStatusHTML(r){
  const partes = [`<b>${r.total}</b> atendimento${r.total===1?'':'s'}`, `<b>${r.veio}</b> vieram`, `<b>${r.faltou}</b> faltaram`];
  if (r.semRegistro) partes.push(`<b>${r.semRegistro}</b> sem registro`);
  const taxa = r.taxa === null ? '' : `<span class="at-taxa" title="Vieram ÷ (vieram + faltaram)">Presença ${r.taxa}%</span>`;
  const aviso = r.semRegistroPassado
    ? `<div class="at-aviso"><span>⚠ ${r.semRegistroPassado} atendimento${r.semRegistroPassado===1?'':'s'} de dias que já passaram sem presença marcada.</span><button type="button" class="btn btn-sm" data-at="so-pendentes">${atEstado.soPendentes?'Mostrar todos':'Mostrar só esses'}</button></div>`
    : (r.total && !r.semRegistro ? '<div class="at-aviso is-ok">✓ Semana completa — todas as presenças registradas.</div>' : '');
  return `<div class="at-status"><span>${partes.join(' · ')}</span>${taxa}</div>${aviso}`;
}

function atDiasHTML(semana){
  const datas = atendDatasDaSemana(atendSemanaAtual).filter((d, i) => i < 5 || semana.some(a => a.data === d));
  return `<div class="at-dias" role="tablist">${datas.map(d => {
    const doDia = semana.filter(a => a.data === d && atEfetivo(a));
    const pend = d <= todayISO() && doDia.some(a => a.presenca === 'nao_informado');
    const dt = parseISODate(d);
    return `<button type="button" role="tab" aria-selected="${atEstado.dia===d}" class="at-dia ${atEstado.dia===d?'is-ativo':''} ${d===todayISO()?'is-hoje':''}" data-at="dia" data-dia="${d}">
      <span class="at-dia-nome">${d===todayISO()?'hoje':AT_DIAS_CURTOS[dt.getDay()]}</span><strong>${dt.getDate()}</strong>
      <span class="at-dia-cont">${doDia.length || '—'}${pend?'<i class="at-dia-pend" title="Há presença sem registro"></i>':''}</span>
    </button>`;
  }).join('')}<button type="button" class="at-dia is-semana ${atEstado.dia==='semana'?'is-ativo':''}" data-at="dia" data-dia="semana"><span class="at-dia-nome">ver</span><strong>Semana</strong><span class="at-dia-cont">toda</span></button></div>`;
}

function atLinhaHTML(a){
  const sel = atEstado.painel?.tipo === 'atd' && atEstado.painel.id === a.id;
  if (a.remarcadoPara) {
    return `<div class="at-linha is-remarcado ${sel?'is-sel':''}">
      <span class="at-hora">${atEsc(a.horario)}</span>
      <button type="button" class="at-linha-corpo" data-at="atd" data-id="${atEsc(a.id)}"><strong>${atEsc(a.alunoNome)}</strong><small>Remarcado para ${formatDateBR(a.remarcadoPara.data).slice(0,5)} às ${atEsc(a.remarcadoPara.horario)}${a.remarcadoPara.profissionalNome && a.remarcadoPara.profissionalNome!==a.profissionalNome?' com '+atEsc(a.remarcadoPara.profissionalNome):''}</small></button>
      <span></span>
    </div>`;
  }
  const futuro = a.data > todayISO();
  const nota = [a.remarcadoDeId && 'remarcado', a.serieId && '↻ semanal', a.presenca==='faltou' && a.faltaMotivo, a.observacao].filter(Boolean).map(atEsc).join(' · ');
  return `<div class="at-linha p-${a.presenca} ${sel?'is-sel':''}">
    <span class="at-hora">${atEsc(a.horario)}</span>
    <button type="button" class="at-linha-corpo" data-at="atd" data-id="${atEsc(a.id)}"><strong>${atEsc(a.alunoNome)}</strong><small>${atEsc(a.profissionalNome)}${nota?' · '+nota:''}</small></button>
    <div class="at-presenca" role="group" aria-label="Presença de ${atEsc(a.alunoNome)}">
      <button type="button" class="${a.presenca==='veio'?'is-on':''}" data-at="veio" data-id="${atEsc(a.id)}" aria-pressed="${a.presenca==='veio'}" ${futuro?'disabled title="Ainda não chegou o dia"':''}>✓ Veio</button>
      <button type="button" class="${a.presenca==='faltou'?'is-on':''}" data-at="faltou" data-id="${atEsc(a.id)}" aria-pressed="${a.presenca==='faltou'}">✕ Faltou</button>
    </div>
  </div>`;
}

function atListaHTML(semana){
  const dias = atEstado.dia === 'semana' ? atendDatasDaSemana(atendSemanaAtual) : [atEstado.dia];
  const blocos = dias.map(d => {
    const doDia = atFiltrar(semana.filter(a => a.data === d)).sort((x,y) => x.horario.localeCompare(y.horario) || x.alunoNome.localeCompare(y.alunoNome,'pt-BR'));
    if (!doDia.length && atEstado.dia === 'semana') return '';
    const dt = parseISODate(d);
    return `<section class="at-bloco">
      ${atEstado.dia === 'semana' ? `<h3 class="at-bloco-titulo">${AT_DIAS[dt.getDay()]}, ${formatDateBR(d).slice(0,5)}</h3>` : ''}
      ${doDia.length ? doDia.map(atLinhaHTML).join('') : `<div class="at-vazio">${atEstado.busca||atEstado.prof||atEstado.soPendentes ? 'Nada com esses filtros neste dia.' : 'Nenhum atendimento neste dia.'}<button type="button" class="btn btn-sm btn-primary" data-at="novo">＋ Adicionar</button></div>`}
    </section>`;
  }).join('');
  return blocos || '<div class="at-vazio">Nada nesta semana com esses filtros.</div>';
}

function atHistoricoHTML(lista, colunaNome){
  const de = atEstado.histDe, ate = atEstado.histAte;
  const filtrada = lista.filter(a => (!de || a.data >= de) && (!ate || a.data <= ate)).sort((x,y) => (y.data+y.horario).localeCompare(x.data+x.horario));
  const r = atResumo(filtrada);
  const motivos = {}; filtrada.filter(a => a.presenca === 'faltou' && atEfetivo(a)).forEach(a => { const m = a.faltaMotivo || 'Sem motivo'; motivos[m] = (motivos[m]||0)+1; });
  const rotulo = { veio:'Veio', faltou:'Faltou', nao_informado:'Sem registro' };
  return `<div class="at-periodo"><label>De <input type="date" class="input" id="atHistDe" value="${de}"></label><label>Até <input type="date" class="input" id="atHistAte" value="${ate}"></label></div>
    <dl class="at-numeros">
      <div><dt>Atendimentos</dt><dd>${r.total}</dd></div><div><dt>Vieram</dt><dd>${r.veio}</dd></div>
      <div><dt>Faltaram</dt><dd>${r.faltou}</dd></div><div><dt>Presença</dt><dd>${r.taxa===null?'—':r.taxa+'%'}</dd></div>
    </dl>
    ${Object.keys(motivos).length ? `<p class="at-motivos">Faltas: ${Object.entries(motivos).sort((a,b)=>b[1]-a[1]).map(([m,n]) => `${atEsc(m)} (${n})`).join(' · ')}</p>` : ''}
    <ul class="at-hist">${filtrada.slice(0,80).map(a => `<li class="p-${a.remarcadoPara?'remarcado':a.presenca}"><button type="button" data-at="atd" data-id="${atEsc(a.id)}"><span class="at-hist-data">${formatDateBR(a.data).slice(0,5)} ${atEsc(a.horario)}</span><span>${atEsc(a[colunaNome])}</span><span class="at-hist-p">${a.remarcadoPara?'Remarcado':rotulo[a.presenca]}</span></button></li>`).join('') || '<li class="at-nada">Nenhum atendimento no período.</li>'}</ul>`;
}

function atPainelHTML(){
  const p = atEstado.painel;
  const topo = `<div class="at-painel-topo"><button type="button" class="at-voltar" data-at="fechar">← Atendimentos</button><button type="button" class="at-fechar" data-at="fechar" aria-label="Fechar">✕</button></div>`;
  if (p.tipo === 'aluno' || p.tipo === 'prof') {
    const ent = p.tipo === 'aluno' ? 'atendimento-alunos' : 'atendimento-profissionais';
    const reg = DB.getById(ent, p.id);
    const lista = getAtendimentos().filter(a => (p.tipo === 'aluno' ? a.alunoId : a.profissionalId) === p.id);
    const extra = p.tipo === 'aluno'
      ? `Atende com: ${[...new Set(lista.map(a => a.profissionalNome))].map(atEsc).join(', ') || '—'}`
      : `${new Set(lista.map(a => a.alunoId)).size} aluno(s) atendido(s)`;
    return `${topo}<span class="at-codigo">${p.tipo === 'aluno' ? 'Aluno' : 'Profissional'}</span><h2>${atEsc(reg.nome)}</h2><p class="at-sub">${extra}</p>
      <div class="at-acoes"><button type="button" class="btn btn-sm" data-at="relatorio" data-filtro-tipo="${p.tipo}" data-filtro-id="${atEsc(p.id)}">Relatório em PDF</button></div>
      ${atHistoricoHTML(lista, p.tipo === 'aluno' ? 'profissionalNome' : 'alunoNome')}`;
  }
  const a = DB.getById('atendimentos', p.id);
  const origem = a.remarcadoDeId ? DB.getById('atendimentos', a.remarcadoDeId) : null;
  const copia = a.remarcadoPara ? getAtendimentos().find(x => x.remarcadoDeId === a.id) : null;
  const serie = atSerieFutura(a);
  const rotulo = { veio:'✓ Veio', faltou:'✕ Faltou', nao_informado:'Sem registro' };
  const fato = (t, v) => v ? `<div><dt>${t}</dt><dd>${v}</dd></div>` : '';
  return `${topo}<span class="at-codigo">Atendimento</span>
    <h2><button type="button" class="at-link" data-at="aluno" data-id="${atEsc(a.alunoId)}">${atEsc(a.alunoNome)}</button></h2>
    <p class="at-sub">com <button type="button" class="at-link" data-at="prof" data-id="${atEsc(a.profissionalId)}">${atEsc(a.profissionalNome)}</button></p>
    <div class="at-acoes">
      ${a.remarcadoPara ? '' : `<button type="button" class="btn btn-sm" data-at="remarcar" data-id="${atEsc(a.id)}">Remarcar</button>`}
      <button type="button" class="btn btn-sm at-perigo" data-at="excluir" data-id="${atEsc(a.id)}">Excluir</button>
    </div>
    <dl class="at-fatos">
      ${fato('Quando', `${AT_DIAS[parseISODate(a.data).getDay()]}, ${formatDateBR(a.data)} às ${atEsc(a.horario)}`)}
      ${fato('Presença', a.remarcadoPara ? 'Remarcado' : rotulo[a.presenca])}
      ${fato('Motivo da falta', a.presenca === 'faltou' ? atEsc([a.faltaMotivo, a.faltaObs].filter(Boolean).join(' — ') || 'Não informado') : '')}
      ${fato('Observação', atEsc(a.observacao))}
      ${a.remarcadoPara ? fato('Remarcado para', `${copia ? `<button type="button" class="at-link" data-at="atd" data-id="${atEsc(copia.id)}">` : ''}${formatDateBR(a.remarcadoPara.data)} às ${atEsc(a.remarcadoPara.horario)}${copia?' →</button>':''}${a.remarcadoPara.motivo ? '<br><small>'+atEsc(a.remarcadoPara.motivo)+'</small>' : ''}`) : ''}
      ${origem ? fato('Remarcado de', `<button type="button" class="at-link" data-at="atd" data-id="${atEsc(origem.id)}">${formatDateBR(origem.data)} às ${atEsc(origem.horario)} →</button>`) : ''}
      ${a.serieId ? fato('Repetição', `Toda semana · ${serie.length} atendimento(s) daqui em diante`) : ''}
    </dl>
    ${serie.length > 1 ? `<div class="at-serie"><span>O aluno saiu ou mudou de horário?</span><button type="button" class="btn btn-sm at-perigo" data-at="encerrar-serie" data-id="${atEsc(a.id)}">Encerrar a partir de ${formatDateBR(a.data).slice(0,5)} (${serie.length})</button></div>` : ''}`;
}

function renderAtendimentos(){
  const root = document.getElementById('atRoot'); if (!root) return;
  atDiaNaSemana();
  if (atEstado.painel) {
    const ent = { atd:'atendimentos', aluno:'atendimento-alunos', prof:'atendimento-profissionais' }[atEstado.painel.tipo];
    if (!DB.getById(ent, atEstado.painel.id)) atEstado.painel = null;
  }
  const datas = atendDatasDaSemana(atendSemanaAtual);
  const semana = getAtendimentos().filter(a => datas.includes(a.data));
  const profs = getAtendProfissionais().sort((a,b) => a.nome.localeCompare(b.nome,'pt-BR'));
  const focoBusca = document.activeElement?.id === 'atBusca';
  root.innerHTML = `<div class="at-layout ${atEstado.painel?'tem-painel':''}">
    <div class="at-principal">
      <div class="at-barra">
        <div class="at-nav">
          <button type="button" class="btn btn-sm" data-at="semana-ant" aria-label="Semana anterior">‹</button>
          <button type="button" class="btn btn-sm" data-at="semana-hoje">Esta semana</button>
          <button type="button" class="btn btn-sm" data-at="semana-prox" aria-label="Próxima semana">›</button>
          <label class="at-titulo">${atTituloSemana()}<input type="date" id="atEscolherSemana" value="${atendSemanaAtual}" aria-label="Escolher semana" title="Escolher semana"></label>
        </div>
        <div class="at-ferramentas">
          <button type="button" class="btn btn-sm" data-at="copiar-semana">Copiar semana anterior</button>
          <button type="button" class="btn btn-sm" data-at="relatorio">Relatório</button>
          <button type="button" class="btn btn-sm" data-at="cadastros">Alunos e profissionais</button>
        </div>
      </div>
      ${atStatusHTML(atResumo(semana))}
      ${atDiasHTML(semana)}
      <div class="at-filtros">
        <input type="search" class="input" id="atBusca" placeholder="Buscar aluno, profissional ou observação…" value="${atEsc(atEstado.busca)}" aria-label="Buscar">
        ${profs.length ? `<select class="input" id="atProf" aria-label="Profissional"><option value="">Todos os profissionais</option>${profs.map(p => `<option value="${atEsc(p.id)}" ${p.id===atEstado.prof?'selected':''}>${atEsc(p.nome)}</option>`).join('')}</select>` : ''}
      </div>
      <div id="atLista">${atListaHTML(semana)}</div>
    </div>
    ${atEstado.painel ? `<aside class="at-painel" aria-label="Detalhe">${atPainelHTML()}</aside>` : ''}
  </div>`;
  if (focoBusca) { const b = document.getElementById('atBusca'); b.focus(); b.setSelectionRange(b.value.length, b.value.length); }
}

/* ---------- presença, falta, remarcação, exclusão ---------- */
const ATEND_MOTIVOS_FALTA = ['Doença', 'Consulta médica', 'Transporte', 'Não avisou', 'Compromisso', 'Outro'];

function abrirJustificativaFalta(id){
  const item = DB.getById('atendimentos', id); if (!item) return;
  openModal(`Falta: ${item.alunoNome}`, `<form id="formFalta"><div class="form-grid">
      <div class="field full"><label for="atdMotivoFalta">Motivo</label><select id="atdMotivoFalta" class="input">${ATEND_MOTIVOS_FALTA.map(m => `<option ${item.faltaMotivo===m?'selected':''}>${m}</option>`).join('')}</select></div>
      <div class="field full"><label for="atdObsFalta">Observação (opcional)</label><textarea id="atdObsFalta">${escapeHTML(item.faltaObs || '')}</textarea></div>
    </div><div class="modal-actions"><button type="button" class="btn btn-ghost" id="btnCancelarFalta">Cancelar</button><button class="btn btn-primary">Registrar falta</button></div></form>`);
  document.getElementById('btnCancelarFalta').onclick = closeModal;
  document.getElementById('formFalta').onsubmit = e => {
    e.preventDefault();
    atualizarPresenca(id, 'faltou', document.getElementById('atdMotivoFalta').value, document.getElementById('atdObsFalta').value.trim());
    closeModal(); renderAtendimentos(); showToast('Falta registrada.');
  };
}

function abrirModalRemarcar(id){
  const item = DB.getById('atendimentos', id); if (!item) return;
  const profissionais = getAtendProfissionais();
  openModal(`Remarcar: ${item.alunoNome}`, `<form id="formRemarcar"><div class="form-grid">
      <div class="field"><label for="atdRemData">Nova data</label><input type="date" id="atdRemData" class="input" value="${item.data}" required></div>
      <div class="field"><label for="atdRemHorario">Novo horário</label><input type="time" id="atdRemHorario" class="input" value="${item.horario}" required></div>
      <div class="field full"><label for="atdRemProf">Profissional</label><select id="atdRemProf" class="input">${profissionais.map(p => `<option value="${p.id}" ${p.id===item.profissionalId?'selected':''}>${escapeHTML(p.nome)}</option>`).join('')}</select></div>
      <div class="field full"><label for="atdRemMotivo">Motivo</label><input type="text" id="atdRemMotivo" class="input" placeholder="Ex.: profissional em curso"></div>
    </div><p class="muted">O atendimento original fica no histórico como "remarcado".</p>
    <div class="modal-actions"><button type="button" class="btn btn-ghost" id="btnCancelarRemarcar">Cancelar</button><button class="btn btn-primary">Remarcar</button></div></form>`);
  document.getElementById('btnCancelarRemarcar').onclick = closeModal;
  document.getElementById('formRemarcar').onsubmit = e => {
    e.preventDefault();
    const novaData = document.getElementById('atdRemData').value, novoHorario = document.getElementById('atdRemHorario').value;
    if (!novaData || !novoHorario) return showToast('Informe data e horário.');
    if (novaData === item.data && novoHorario === item.horario && document.getElementById('atdRemProf').value === item.profissionalId) return showToast('Escolha outro dia, horário ou profissional.');
    const prof = profissionais.find(p => p.id === document.getElementById('atdRemProf').value);
    const motivo = document.getElementById('atdRemMotivo').value.trim();
    DB.update('atendimentos', id, { presenca:'nao_informado', faltaMotivo:'', faltaObs:'', remarcadoPara: { data:novaData, horario:novoHorario, profissionalId:prof?.id||item.profissionalId, profissionalNome:prof?.nome||item.profissionalNome, motivo } });
    const novo = { id:uid('atd'), alunoId:item.alunoId, alunoNome:item.alunoNome, profissionalId:prof?.id||item.profissionalId, profissionalNome:prof?.nome||item.profissionalNome,
      data:novaData, horario:novoHorario, observacao:item.observacao, presenca:'nao_informado', faltaMotivo:'', faltaObs:'', remarcadoPara:null, remarcadoDeId:id, serieId:null, criadoEm:Date.now() };
    DB.insert('atendimentos', novo);
    registrarHistorico({ modulo:'atendimentos', acao:'edição', descricao:`Atendimento de "${item.alunoNome}" remarcado de ${formatDateBR(item.data)} ${item.horario} para ${formatDateBR(novaData)} ${novoHorario}.`, refId:id });
    showToast('✓ Atendimento remarcado.');
    atIrPara({ tipo:'atd', id:novo.id }, novaData);
  };
}

/* Mantém remarcações coerentes: apagar a cópia devolve o original para a
   agenda; apagar o original solta a cópia. */
function atRemover(lista){
  const ids = new Set(lista.map(a => a.id));
  const restantes = getAtendimentos().filter(a => !ids.has(a.id)).map(a => {
    if (a.remarcadoPara && lista.some(x => x.remarcadoDeId === a.id)) return { ...a, remarcadoPara:null };
    if (a.remarcadoDeId && ids.has(a.remarcadoDeId)) return { ...a, remarcadoDeId:null };
    return a;
  });
  DB.saveAll('atendimentos', restantes);
  if (atEstado.painel?.tipo === 'atd' && ids.has(atEstado.painel.id)) atEstado.painel = null;
}
function excluirAtendimento(id){
  const a = DB.getById('atendimentos', id); if (!a) return;
  confirmAction(`Excluir o atendimento de "${a.alunoNome}" em ${formatDateBR(a.data)} às ${a.horario}?`, () => {
    atRemover([a]);
    registrarHistorico({ modulo:'atendimentos', acao:'exclusão', descricao:`Atendimento de "${a.alunoNome}" (${formatDateBR(a.data)} ${a.horario}) excluído.`, refId:id });
    showToast('Atendimento excluído.'); renderAtendimentos();
  });
}
function encerrarSerie(id){
  const a = DB.getById('atendimentos', id); if (!a) return;
  const futuros = atSerieFutura(a);
  confirmAction(`Encerrar os atendimentos semanais de "${a.alunoNome}" a partir de ${formatDateBR(a.data)}? ${futuros.length} atendimento(s) sem presença registrada serão removidos. Os anteriores ficam no histórico.`, () => {
    atRemover(futuros);
    registrarHistorico({ modulo:'atendimentos', acao:'exclusão', descricao:`Atendimentos semanais de "${a.alunoNome}" com "${a.profissionalNome}" encerrados a partir de ${formatDateBR(a.data)} (${futuros.length}).`, refId:a.alunoId });
    showToast(`✓ ${futuros.length} atendimento(s) removidos.`);
    atIrPara({ tipo:'aluno', id:a.alunoId });
  });
}

/* ---------- novo atendimento (um, repetido ou vários de uma vez) ---------- */
function abrirModalNovoAtendimento(){
  const dataPadrao = atEstado.dia && atEstado.dia !== 'semana' ? atEstado.dia : atendSemanaAtual;
  const listas = `<datalist id="dlAtendAlunos">${getAtendAlunos().map(a => `<option value="${escapeHTML(a.nome)}">`).join('')}</datalist><datalist id="dlAtendProfs">${getAtendProfissionais().map(p => `<option value="${escapeHTML(p.nome)}">`).join('')}</datalist>`;
  const diasSemana = atendDatasDaSemana(atendSemanaAtual).slice(0,6);
  openModal('Novo atendimento', `
    <div class="at-modos"><button type="button" class="is-ativo" id="atdTabIndividual">Um atendimento</button><button type="button" id="atdTabLote">Vários de uma vez</button></div>
    <form id="formAtdIndividual"><div class="form-grid">
      <div class="field"><label for="atdAluno">Aluno *</label><input type="text" id="atdAluno" class="input" list="dlAtendAlunos" required></div>
      <div class="field"><label for="atdProf">Profissional *</label><input type="text" id="atdProf" class="input" list="dlAtendProfs" required></div>
      <div class="field"><label for="atdData">Data *</label><input type="date" id="atdData" class="input" value="${dataPadrao}" required></div>
      <div class="field"><label for="atdHorario">Horário *</label><input type="time" id="atdHorario" class="input" required></div>
      <div class="field"><label for="atdRecorrencia">Repete?</label><select id="atdRecorrencia" class="input"><option value="nao">Não, só este dia</option><option value="semanal">Toda semana</option></select></div>
      <div class="field" id="atdAteWrap" hidden><label for="atdAte">Até</label><input type="date" id="atdAte" class="input" value="${atFimDoAno(dataPadrao)}"></div>
      <div class="field full"><label for="atdObs">Observação</label><textarea id="atdObs"></textarea></div>
    </div></form>
    <form id="formAtdLote" hidden>
      <p class="muted">Uma linha por atendimento, na semana de ${formatDateBR(atendSemanaAtual)}. Linhas incompletas são ignoradas.</p>
      <div id="atdLoteLinhas"></div>
      <button type="button" class="btn btn-sm" id="btnAtdLoteAddLinha">＋ Linha</button>
      <label class="at-check"><input type="checkbox" id="atdLoteSemanal"> Repetir toda semana até ${formatDateBR(atFimDoAno(atendSemanaAtual))}</label>
    </form>
    ${listas}
    <p class="field-error" id="atdErro" hidden></p>
    <div class="modal-actions"><button type="button" class="btn btn-ghost" id="btnCancelarAtd">Cancelar</button><button type="button" class="btn btn-primary" id="btnSalvarAtd">Adicionar</button></div>`);
  let modo = 'individual';
  const $ = i => document.getElementById(i);
  const erro = t => { $('atdErro').hidden = false; $('atdErro').textContent = t; };
  const addLinha = () => $('atdLoteLinhas').insertAdjacentHTML('beforeend', `<div class="at-lote-linha">
      <input type="text" class="input atdLoteAluno" list="dlAtendAlunos" placeholder="Aluno" aria-label="Aluno">
      <input type="text" class="input atdLoteProf" list="dlAtendProfs" placeholder="Profissional" aria-label="Profissional">
      <select class="input atdLoteDia" aria-label="Dia">${diasSemana.map(d => `<option value="${d}" ${d===dataPadrao?'selected':''}>${AT_DIAS[parseISODate(d).getDay()]}</option>`).join('')}</select>
      <input type="time" class="input atdLoteHorario" aria-label="Horário">
      <button type="button" class="btn btn-sm atdLoteRemover" aria-label="Remover linha">✕</button></div>`);
  const trocar = m => { modo = m; $('formAtdIndividual').hidden = m !== 'individual'; $('formAtdLote').hidden = m !== 'lote'; $('atdTabIndividual').classList.toggle('is-ativo', m === 'individual'); $('atdTabLote').classList.toggle('is-ativo', m === 'lote'); if (m === 'lote' && !$('atdLoteLinhas').children.length) { addLinha(); addLinha(); addLinha(); } };
  $('atdTabIndividual').onclick = () => trocar('individual');
  $('atdTabLote').onclick = () => trocar('lote');
  $('btnAtdLoteAddLinha').onclick = addLinha;
  $('atdLoteLinhas').addEventListener('click', e => { if (e.target.closest('.atdLoteRemover')) e.target.closest('.at-lote-linha').remove(); });
  $('atdRecorrencia').onchange = e => { $('atdAteWrap').hidden = e.target.value !== 'semanal'; };
  $('btnCancelarAtd').onclick = closeModal;
  $('btnSalvarAtd').onclick = () => {
    if (modo === 'individual') {
      const aluno = $('atdAluno').value.trim(), prof = $('atdProf').value.trim(), data = $('atdData').value, horario = $('atdHorario').value, obs = $('atdObs').value.trim();
      if (!aluno || !prof || !data || !horario) return erro('Preencha aluno, profissional, data e horário.');
      if ($('atdRecorrencia').value === 'semanal') {
        const ate = $('atdAte').value || atFimDoAno(data);
        if (ate < data) return erro('A data final precisa ser depois do primeiro atendimento.');
        const criados = criarAtendimentosRecorrentes({ alunoNome:aluno, profissionalNome:prof, data, horario, observacao:obs, ate });
        registrarHistorico({ modulo:'atendimentos', acao:'criação', descricao:`Atendimento semanal de "${aluno}" com "${prof}" criado (${criados.length} semanas, ${horario}).` });
        showToast(`✓ ${criados.length} atendimentos semanais criados, até ${formatDateBR(criados[criados.length-1].data)}.`);
      } else {
        criarAtendimento({ alunoNome:aluno, profissionalNome:prof, data, horario, observacao:obs });
        registrarHistorico({ modulo:'atendimentos', acao:'criação', descricao:`Atendimento de "${aluno}" com "${prof}" criado para ${formatDateBR(data)} ${horario}.` });
        showToast('✓ Atendimento adicionado.');
      }
      atIrPara(null, data);
    } else {
      const semanal = $('atdLoteSemanal').checked;
      let n = 0;
      document.querySelectorAll('.at-lote-linha').forEach(l => {
        const aluno = l.querySelector('.atdLoteAluno').value.trim(), prof = l.querySelector('.atdLoteProf').value.trim(), data = l.querySelector('.atdLoteDia').value, horario = l.querySelector('.atdLoteHorario').value;
        if (!aluno || !prof || !horario) return;
        if (semanal) criarAtendimentosRecorrentes({ alunoNome:aluno, profissionalNome:prof, data, horario, observacao:'' });
        else criarAtendimento({ alunoNome:aluno, profissionalNome:prof, data, horario, observacao:'' });
        n++;
      });
      if (!n) return erro('Preencha ao menos uma linha completa (aluno, profissional e horário).');
      registrarHistorico({ modulo:'atendimentos', acao:'criação', descricao:`${n} atendimento(s) adicionados de uma vez${semanal?' (toda semana)':''}.` });
      showToast(`✓ ${n} atendimento(s) adicionados${semanal?', repetindo toda semana':''}.`);
      closeModal(); renderAtendimentos();
    }
  };
}

/* Copia a programação da semana anterior sem criar duplicatas: pula o que
   já existe nesta semana (mesmo aluno, profissional, dia e horário) e os
   remanejamentos pontuais (remarcações). */
function duplicarSemanaAnterior(){
  const antes = atendDatasDaSemana(atendAddDias(atendSemanaAtual, -7)), agora = atendDatasDaSemana(atendSemanaAtual);
  const chave = (a, d) => `${a.alunoId}|${a.profissionalId}|${d}|${a.horario}`;
  const existentes = new Set(getAtendimentos().filter(a => agora.includes(a.data)).map(a => chave(a, a.data)));
  const copiar = getAtendimentos().filter(a => antes.includes(a.data) && !a.remarcadoPara && !a.remarcadoDeId)
    .filter(a => !existentes.has(chave(a, agora[antes.indexOf(a.data)])));
  if (!copiar.length) return showToast(getAtendimentos().some(a => antes.includes(a.data)) ? 'Esta semana já tem tudo o que havia na semana anterior.' : 'Não há atendimentos na semana anterior.');
  confirmAction(`Copiar ${copiar.length} atendimento(s) da semana anterior para esta? Os que já existem aqui não serão repetidos.`, () => {
    copiar.forEach(a => criarAtendimento({ alunoNome:a.alunoNome, profissionalNome:a.profissionalNome, data:agora[antes.indexOf(a.data)], horario:a.horario, observacao:a.observacao }));
    registrarHistorico({ modulo:'atendimentos', acao:'criação', descricao:`${copiar.length} atendimento(s) copiados da semana anterior.` });
    showToast(`✓ ${copiar.length} atendimento(s) copiados.`);
    renderAtendimentos();
  });
}

/* ---------- relatório (semana, mês ou período; geral, por aluno ou profissional) ---------- */
function abrirRelatorioAtendimentos(filtro){
  const ini = atendSemanaAtual, fim = atendAddDias(atendSemanaAtual, 6);
  const hoje = todayISO(), iniMes = hoje.slice(0,8)+'01', fimMes = isoFromDate(new Date(Number(hoje.slice(0,4)), Number(hoje.slice(5,7)), 0));
  const d = new Date(Number(hoje.slice(0,4)), Number(hoje.slice(5,7))-2, 1), iniMesAnt = isoFromDate(d), fimMesAnt = isoFromDate(new Date(d.getFullYear(), d.getMonth()+1, 0));
  const nomeFiltro = filtro ? DB.getById(filtro.tipo === 'aluno' ? 'atendimento-alunos' : 'atendimento-profissionais', filtro.id)?.nome : '';
  openModal(nomeFiltro ? `Relatório de ${nomeFiltro}` : 'Relatório de atendimentos', `<form id="formRelAtd">
    <div class="at-atalhos"><button type="button" class="btn btn-sm" data-de="${ini}" data-ate="${fim}">Semana na tela</button><button type="button" class="btn btn-sm" data-de="${iniMes}" data-ate="${fimMes}">Este mês</button><button type="button" class="btn btn-sm" data-de="${iniMesAnt}" data-ate="${fimMesAnt}">Mês passado</button></div>
    <div class="form-grid"><div class="field"><label for="atdRelDe">De</label><input type="date" id="atdRelDe" class="input" value="${ini}" required></div><div class="field"><label for="atdRelAte">Até</label><input type="date" id="atdRelAte" class="input" value="${fim}" required></div></div>
    <div id="atdRelChecagem"></div>
    <div class="modal-actions"><button type="button" class="btn btn-ghost" id="btnCancelarRelAtd">Cancelar</button><button class="btn btn-primary">Gerar relatório</button></div></form>`);
  const checar = () => {
    const de = document.getElementById('atdRelDe').value, ate = document.getElementById('atdRelAte').value;
    const sem = atFiltroRelatorio(de, ate, filtro).filter(a => a.presenca === 'nao_informado' && a.data <= todayISO()).length;
    document.getElementById('atdRelChecagem').innerHTML = sem ? `<p class="at-aviso">⚠ ${sem} atendimento(s) do período ainda sem presença — vão aparecer como "sem registro".</p>` : '';
  };
  document.querySelectorAll('.at-atalhos [data-de]').forEach(b => b.onclick = () => { document.getElementById('atdRelDe').value = b.dataset.de; document.getElementById('atdRelAte').value = b.dataset.ate; checar(); });
  ['atdRelDe','atdRelAte'].forEach(i => document.getElementById(i).onchange = checar);
  checar();
  document.getElementById('btnCancelarRelAtd').onclick = closeModal;
  document.getElementById('formRelAtd').onsubmit = e => {
    e.preventDefault();
    const de = document.getElementById('atdRelDe').value, ate = document.getElementById('atdRelAte').value;
    if (!de || !ate || ate < de) return showToast('Confira as datas do período.');
    gerarPdfAtendimentos(de, ate, filtro);
  };
}
function atFiltroRelatorio(de, ate, filtro){
  return getAtendimentos().filter(a => a.data >= de && a.data <= ate && atEfetivo(a) && (!filtro || (filtro.tipo === 'aluno' ? a.alunoId : a.profissionalId) === filtro.id));
}

async function gerarPdfAtendimentos(dataInicio, dataFim, filtro){
  const todos = atFiltroRelatorio(dataInicio, dataFim, filtro).sort((a,b) => (a.data+a.horario).localeCompare(b.data+b.horario));
  const r = atResumo(todos);
  const cabecalho = await montarCabecalhoInstitucionalHTML();
  const porProf = {}; todos.forEach(a => { const s = porProf[a.profissionalNome] = porProf[a.profissionalNome] || { total:0, veio:0, faltou:0 }; s.total++; if (a.presenca === 'veio') s.veio++; if (a.presenca === 'faltou') s.faltou++; });
  const motivos = {}; todos.filter(a => a.presenca === 'faltou').forEach(a => { motivos[a.faltaMotivo || 'Sem motivo'] = (motivos[a.faltaMotivo || 'Sem motivo'] || 0) + 1; });
  const presencaTexto = { veio:'Veio', faltou:'Faltou', nao_informado:'Sem registro' };
  const nomeFiltro = filtro ? DB.getById(filtro.tipo === 'aluno' ? 'atendimento-alunos' : 'atendimento-profissionais', filtro.id)?.nome : '';
  const th = t => `<th style="text-align:left;padding:4px">${t}</th>`, td = t => `<td style="padding:4px">${t}</td>`;
  const html = `<div class="doc-a4-page">${cabecalho}
    <div class="doc-a4-titulo">RELATÓRIO DE ATENDIMENTOS</div>
    <p style="text-align:center;font-size:11pt;margin-bottom:20px">${nomeFiltro ? `${filtro.tipo === 'aluno' ? 'Aluno' : 'Profissional'}: ${escapeHTML(nomeFiltro)} · ` : ''}Período: ${formatDateBR(dataInicio)} a ${formatDateBR(dataFim)}</p>
    <table style="width:100%;border-collapse:collapse;font-size:10pt"><thead><tr style="border-bottom:1.5px solid #000">${th('Data')}${th('Horário')}${th('Aluno')}${th('Profissional')}${th('Presença')}${th('Observação')}</tr></thead>
    <tbody>${todos.map(a => `<tr style="border-bottom:1px solid #ccc">${td(formatDateBR(a.data))}${td(escapeHTML(a.horario))}${td(escapeHTML(a.alunoNome))}${td(escapeHTML(a.profissionalNome))}${td(presencaTexto[a.presenca] + (a.presenca === 'faltou' && a.faltaMotivo ? ` (${escapeHTML(a.faltaMotivo)})` : ''))}${td(escapeHTML([a.remarcadoDeId && 'Remarcado', a.observacao].filter(Boolean).join(' · ')))}</tr>`).join('') || '<tr><td colspan="6" style="padding:8px">Nenhum atendimento no período.</td></tr>'}</tbody></table>
    <div style="margin-top:24px;font-size:11pt"><strong>RESUMO</strong><br>
      Atendimentos: ${r.total}<br>Vieram: ${r.veio}<br>Faltaram: ${r.faltou}<br>Sem registro: ${r.semRegistro}<br>
      Presença: ${r.taxa === null ? '—' : r.taxa + '%'} <span style="font-size:9pt">(vieram ÷ vieram + faltaram)</span>
      ${Object.keys(motivos).length ? `<br>Motivos das faltas: ${Object.entries(motivos).sort((a,b)=>b[1]-a[1]).map(([m,n]) => `${escapeHTML(m)} (${n})`).join('; ')}` : ''}</div>
    ${filtro?.tipo !== 'prof' && Object.keys(porProf).length > 1 ? `<div style="margin-top:16px;font-size:11pt"><strong>POR PROFISSIONAL</strong>
      <table style="width:100%;border-collapse:collapse;margin-top:6px"><thead><tr style="border-bottom:1px solid #000">${th('Profissional')}${th('Atendimentos')}${th('Vieram')}${th('Faltaram')}</tr></thead>
      <tbody>${Object.entries(porProf).sort((a,b)=>a[0].localeCompare(b[0],'pt-BR')).map(([n,s]) => `<tr>${td(escapeHTML(n))}${td(s.total)}${td(s.veio)}${td(s.faltou)}</tr>`).join('')}</tbody></table></div>` : ''}
    <div class="doc-a4-assinatura"><div class="doc-a4-linha-assinatura">_________________________</div><div>Responsável pelo relatório</div></div>
    <div class="doc-a4-assinatura"><div class="doc-a4-linha-assinatura">_________________________</div><div>Data: ___/___/______</div></div>
  </div>`;
  openModal('Relatório de atendimentos', `<div class="doc-a4-preview-wrap">${html}</div>
    <div class="modal-actions no-print"><button type="button" class="btn btn-ghost" id="btnFecharPreviewAtd">Fechar</button><button type="button" class="btn" id="btnImprimirAtd">🖨 Imprimir</button><button type="button" class="btn btn-primary" id="btnPdfAtd">⭳ Salvar como PDF</button></div>`);
  document.getElementById('btnFecharPreviewAtd').onclick = closeModal;
  document.getElementById('btnImprimirAtd').onclick = () => imprimirDocumentoGerador(html, 'Relatorio_Atendimentos');
  document.getElementById('btnPdfAtd').onclick = () => salvarPdfGerador(html, 'Relatorio_Atendimentos');
}

/* ---------- alunos e profissionais: renomear, unir duplicados, excluir ---------- */
function renderGestaoAlunosProfissionais(){
  const corpo = document.getElementById('atdGestaoConteudo'); if (!corpo) return;
  const uso = (entity, id) => { const { campoId } = atendCamposDe(entity); return getAtendimentos().filter(a => a[campoId] === id).length; };
  const lista = (entity, itens) => itens.sort((a,b) => a.nome.localeCompare(b.nome,'pt-BR')).map(item => `
    <div class="at-cad" data-entity="${entity}" data-id="${item.id}">
      <input type="text" class="input atdGestaoNome" value="${escapeHTML(item.nome)}" aria-label="Nome">
      <small>${uso(entity, item.id)} atend.</small>
      <button type="button" class="btn btn-sm atdGestaoRenomear">Salvar</button>
      <button type="button" class="btn btn-sm atdGestaoMesclar">Unir com…</button>
      <button type="button" class="btn btn-sm at-perigo atdGestaoExcluir">Excluir</button>
    </div>`).join('') || '<p class="muted">Nenhum cadastro ainda — eles são criados ao adicionar atendimentos.</p>';
  corpo.innerHTML = `<p class="muted">Corrija nomes digitados errado e una cadastros repetidos (ex.: “João” e “joão”). Os atendimentos acompanham.</p>
    <h3 class="at-cad-titulo">Alunos</h3>${lista('atendimento-alunos', getAtendAlunos())}
    <h3 class="at-cad-titulo">Profissionais</h3>${lista('atendimento-profissionais', getAtendProfissionais())}`;
  corpo.querySelectorAll('.at-cad').forEach(row => {
    const { entity, id } = row.dataset;
    row.querySelector('.atdGestaoRenomear').onclick = () => { renomearAtendCadastro(entity, id, row.querySelector('.atdGestaoNome').value); renderGestaoAlunosProfissionais(); showToast('✓ Nome atualizado.'); };
    row.querySelector('.atdGestaoExcluir').onclick = () => excluirAtendCadastro(entity, id);
    row.querySelector('.atdGestaoMesclar').onclick = () => {
      const outros = DB.getAll(entity).filter(x => x.id !== id);
      if (!outros.length) return showToast('Não há outro cadastro para unir.');
      openModal('Unir com qual cadastro?', `<p class="muted">Os atendimentos de "${escapeHTML(DB.getById(entity,id)?.nome||'')}" passam para o cadastro escolhido, e este é removido.</p>
        <select id="atdMesclarDestino" class="input">${outros.sort((a,b)=>a.nome.localeCompare(b.nome,'pt-BR')).map(o => `<option value="${o.id}">${escapeHTML(o.nome)}</option>`).join('')}</select>
        <div class="modal-actions"><button type="button" class="btn btn-ghost" id="btnCancelarMesclar">Voltar</button><button type="button" class="btn btn-primary" id="btnConfirmarMesclar">Unir</button></div>`);
      document.getElementById('btnCancelarMesclar').onclick = abrirGestaoAlunosProfissionais;
      document.getElementById('btnConfirmarMesclar').onclick = () => { mesclarAtendCadastro(entity, id, document.getElementById('atdMesclarDestino').value); showToast('✓ Cadastros unidos.'); abrirGestaoAlunosProfissionais(); };
    };
  });
}
function abrirGestaoAlunosProfissionais(){
  openModal('Alunos e profissionais', `<div id="atdGestaoConteudo"></div><div class="modal-actions"><button type="button" class="btn btn-ghost" id="btnFecharGestaoAtend">Fechar</button></div>`);
  renderGestaoAlunosProfissionais();
  document.getElementById('btnFecharGestaoAtend').onclick = () => { closeModal(); renderAtendimentos(); };
}

/* ---------- bloco do Dashboard ---------- */
function renderAtendimentosHojeDashboard(){
  const alvo = document.getElementById('atendimentosHojeResumo'); if (!alvo) return;
  const r = atResumo(getAtendimentos().filter(a => a.data === todayISO()));
  alvo.innerHTML = `
    <div class="stat-card c-primary"><div class="stat-num">${r.total}</div><div class="stat-label">Atendimentos de hoje</div></div>
    <div class="stat-card c-ok"><div class="stat-num">${r.veio}</div><div class="stat-label">Vieram</div></div>
    <div class="stat-card c-danger"><div class="stat-num">${r.faltou}</div><div class="stat-label">Faltaram</div></div>
    <div class="stat-card c-neutral"><div class="stat-num">${r.semRegistro}</div><div class="stat-label">Sem registro</div></div>`;
}

/* ---------- despachante ---------- */
const AT_ACOES = {
  'semana-ant': () => { atendSemanaAtual = atendAddDias(atendSemanaAtual, -7); atEstado.dia = atendSemanaAtual; renderAtendimentos(); },
  'semana-prox': () => { atendSemanaAtual = atendAddDias(atendSemanaAtual, 7); atEstado.dia = atendSemanaAtual; renderAtendimentos(); },
  'semana-hoje': () => { atendSemanaAtual = atendSegundaDaSemana(todayISO()); atEstado.dia = todayISO(); renderAtendimentos(); },
  'dia': b => { atEstado.dia = b.dataset.dia; renderAtendimentos(); },
  'so-pendentes': () => { atEstado.soPendentes = !atEstado.soPendentes; if (atEstado.soPendentes) atEstado.dia = 'semana'; renderAtendimentos(); },
  'veio': b => { const a = DB.getById('atendimentos', b.dataset.id); atualizarPresenca(a.id, a.presenca === 'veio' ? 'nao_informado' : 'veio'); renderAtendimentos(); },
  'faltou': b => { const a = DB.getById('atendimentos', b.dataset.id); if (a.presenca === 'faltou') { atualizarPresenca(a.id, 'nao_informado'); renderAtendimentos(); } else abrirJustificativaFalta(a.id); },
  'atd': b => { atEstado.painel = { tipo:'atd', id:b.dataset.id }; const a = DB.getById('atendimentos', b.dataset.id); if (a && !atendDatasDaSemana(atendSemanaAtual).includes(a.data)) { atendSemanaAtual = atendSegundaDaSemana(a.data); atEstado.dia = a.data; } renderAtendimentos(); if (window.innerWidth <= 1100) document.getElementById('atRoot').scrollIntoView({ block:'start' }); },
  'aluno': b => { atEstado.painel = { tipo:'aluno', id:b.dataset.id }; renderAtendimentos(); },
  'prof': b => { atEstado.painel = { tipo:'prof', id:b.dataset.id }; renderAtendimentos(); },
  'fechar': () => { atEstado.painel = null; renderAtendimentos(); },
  'novo': () => abrirModalNovoAtendimento(),
  'remarcar': b => abrirModalRemarcar(b.dataset.id),
  'excluir': b => excluirAtendimento(b.dataset.id),
  'encerrar-serie': b => encerrarSerie(b.dataset.id),
  'copiar-semana': () => duplicarSemanaAnterior(),
  'relatorio': b => abrirRelatorioAtendimentos(b.dataset.filtroTipo ? { tipo:b.dataset.filtroTipo, id:b.dataset.filtroId } : null),
  'cadastros': () => abrirGestaoAlunosProfissionais()
};

(function ligarAtendimentos(){
  const root = document.getElementById('atRoot'); if (!root) return;
  root.addEventListener('click', e => {
    const b = e.target.closest('[data-at]');
    if (!b || !root.contains(b) || b.disabled) return;
    AT_ACOES[b.dataset.at]?.(b);
  });
  root.addEventListener('input', e => {
    if (e.target.id !== 'atBusca') return;
    atEstado.busca = e.target.value;
    const semana = getAtendimentos().filter(a => atendDatasDaSemana(atendSemanaAtual).includes(a.data));
    document.getElementById('atLista').innerHTML = atListaHTML(semana);
  });
  root.addEventListener('change', e => {
    const t = e.target;
    if (t.id === 'atProf') atEstado.prof = t.value;
    else if (t.id === 'atEscolherSemana' && t.value) { atendSemanaAtual = atendSegundaDaSemana(t.value); atEstado.dia = t.value; }
    else if (t.id === 'atHistDe') atEstado.histDe = t.value;
    else if (t.id === 'atHistAte') atEstado.histAte = t.value;
    else return;
    renderAtendimentos();
  });
})();

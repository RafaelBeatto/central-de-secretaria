/* ---------------------------------------------------------
   7. NAVEGAÇÃO / TEMA / RELÓGIO
   --------------------------------------------------------- */
const VIEW_META = {
  dashboard: { title:'Dashboard', sub:'O que resolver, o que tem hoje e como estão os projetos' },
  pendencias: { title:'Pendências', sub:'Tudo que exige ação, em um só lugar' },
  projetos: { title:'Projetos', sub:'Recursos recebidos e onde cada real foi aplicado' },
  solicitacoes: { title:'Secretaria', sub:'Tarefas e rotinas do dia a dia' },
  agenda: { title:'Agenda', sub:'Eventos, tarefas e prazos num só calendário' },
  documentos: { title:'Documentos', sub:'Documentos da instituição e quando renovar' },
  pesquisa: { title:'Pesquisa', sub:'Todos os resultados da busca' },
  kanban: { title:'Kanban', sub:'Organize com quadros de tarefas' },
  historico: { title:'Histórico', sub:'Tudo o que foi feito no sistema, dia a dia' },
  relatorios: { title:'Relatórios', sub:'Relatório de atividades do período e backup dos dados' },
  modelos: { title:'Modelos de Documentos', sub:'Crie e use templates de documentos' },
  gerador: { title:'Gerador de Documentos', sub:'Gere documentos oficiais com cabeçalho e rodapé institucional' },
  atendimentos: { title:'Atendimentos', sub:'Controle semanal de atendimentos dos alunos' }
};

const HELP_TEXT = {
  dashboard: 'A página de entrada. Em "Para resolver" ficam o que está atrasado e o que pede atenção, com o botão para resolver ali mesmo (concluir tarefa, renovar documento, marcar presença). Ao lado, o que tem hoje e nos próximos 7 dias. Embaixo, o andamento dos projetos e três números da semana. Clique em qualquer item para abrir o registro.',
  pendencias: 'Reúne automaticamente todas as pendências do sistema: documentos vencidos/vencendo, tarefas atrasadas e compromissos de hoje. Veja tudo por prioridade em um só lugar.',
  projetos: 'Cada recurso é um dinheiro que entrou na APAE (convênio, emenda, doação). Dentro dele ficam as execuções: cada aplicação desse dinheiro, com plano, cotações, compra, documentos e pagamentos. A barra lateral da execução mostra quais etapas já estão registradas.',
  solicitacoes: 'As tarefas aparecem separadas por quando precisam ser feitas: atrasadas, hoje, próximos 7 dias e mais adiante. Escreva no campo do topo e aperte Enter para adicionar rápido; use Mais opções para rotinas que se repetem (toda semana, todo mês). Clique numa tarefa para ver detalhes, checklist e histórico.',
  agenda: 'Um calendário só para tudo que tem data: eventos (reuniões, visitas, compromissos), tarefas da Secretaria e prazos de documentos e projetos. Clique num dia para ver o que tem nele, clique num evento para ver detalhes, e arraste eventos e tarefas para outra data. Use as etiquetas coloridas para esconder o que não quer ver.',
  documentos: 'Guarde aqui os documentos da APAE (certidões, atas, contratos…). A lista separa o que está vencido, o que vence em 30 dias e o que está em dia. Use Renovar para registrar a nova validade e o novo arquivo: a versão anterior continua guardada no próprio documento.',
  pesquisa: 'Pesquisa rapidamente em todo o sistema: projetos, empresas, cotações, ordens de compra, documentos, tarefas da secretaria, agenda e atendimentos. Clique em qualquer resultado para abrir o registro original.',
  kanban: 'Crie quadros customizados para organizar tarefas, projetos ou eventos da agenda. Arraste cartões entre colunas de status, filtre por responsável ou prioridade. Você controla a estrutura de cada quadro.',
  historico: 'Tudo o que foi criado, alterado, concluído ou excluído, agrupado por dia. Busque por um nome (aluno, documento, tarefa), escolha o período e filtre pelo módulo ou pelo tipo de ação. Clique numa linha para abrir o registro, se ele ainda existir.',
  relatorios: 'Monta o relatório de atividades do período escolhido, com o cabeçalho da instituição: tarefas concluídas, compromissos, atendimentos, documentos renovados e pagamentos dos projetos. Marque as áreas que quer incluir e salve em PDF ou imprima. Aqui também fica o backup de todos os dados.',
  modelos: 'Crie e use modelos de documentos para gerar ofícios, memorandos, cartas e outros documentos formatados. Use templates predefinidos ou crie seus próprios com campos personalizados. Gere documentos em PDF com um clique.',
  gerador: 'Configure os dados da instituição (logo, CNPJ, endereço, rodapé) uma única vez e crie modelos de documentos com variáveis como [NOME], [CPF], [VALOR] e [DATA]. Ao gerar, o sistema aplica automaticamente o cabeçalho e rodapé institucional e mostra uma visualização em formato A4 antes de imprimir ou salvar como PDF.',
  atendimentos: 'A semana dos atendimentos: escolha o dia na faixa e marque Veio ou Faltou com um clique (clicar de novo desfaz). Clique no nome para ver os detalhes, remarcar, excluir ou encerrar um atendimento semanal. No aluno ou no profissional você vê o histórico e a presença. Copiar semana anterior não repete o que já existe; o Relatório gera o PDF da semana, do mês ou de um período.'
};

function mostrarAjuda(view){
  const meta = VIEW_META[view];
  const texto = HELP_TEXT[view];
  if (!meta || !texto) return;
  openModal('Como funciona: ' + meta.title, `<div class="help-content"><p>${escapeHTML(texto)}</p></div>`);
}


let currentView = 'dashboard';

function goToView(view, opts){
  if (!VIEW_META[view]) {
    console.warn('View inválida:', view);
    view = 'dashboard';
  }
  currentView = view;
  document.querySelectorAll('.view').forEach(v => v.hidden = (v.dataset.view !== view));
  document.querySelectorAll('.nav-item').forEach(b => b.classList.toggle('is-active', b.dataset.view === view));
  document.getElementById('pageTitle').textContent = VIEW_META[view].title;
  document.getElementById('pageSubtitle').textContent = VIEW_META[view].sub;
  closeSidebarMobile();
  renderCurrentView(opts);
  window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
}

document.querySelectorAll('.nav-item').forEach(btn => {
  btn.addEventListener('click', () => goToView(btn.dataset.view));
});

/* Um "?" ao lado do título explica a tela aberta (antes havia um "!" em
   cada linha do menu). */
document.getElementById('btnAjudaPagina')?.addEventListener('click', () => mostrarAjuda(currentView));

/* Contadores do menu: só aparecem quando há algo esperando naquela aba.
   Usam as mesmas regras das próprias telas e de Pendências. */
function atualizarMenu(){
  const conta = (view, n, tom) => {
    const el = document.querySelector(`.nav-conta[data-conta="${view}"]`); if (!el) return;
    el.hidden = !n; el.textContent = n > 99 ? '99+' : String(n || '');
    el.className = `nav-conta t-${tom}`;
    el.title = n ? `${n} esperando` : '';
  };
  const hoje = todayISO();
  if (typeof coletarTodasPendencias === 'function' && typeof categoriaAcao === 'function') {
    conta('pendencias', coletarTodasPendencias().filter(p => categoriaAcao(p) === 'atrasado').length, 'danger');
  }
  if (typeof prazoAtividade === 'function') {
    const abertas = DB.getAll('solicitacoes').filter(s => !ehTarefaRenovacaoDocumento(s) && !['Concluída','Cancelada'].includes(s.status));
    const atrasadas = abertas.filter(solicitacaoAtrasada).length;
    const deHoje = abertas.filter(s => prazoAtividade(s).data === hoje && !solicitacaoAtrasada(s)).length;
    conta('solicitacoes', atrasadas + deHoje, atrasadas ? 'danger' : 'neutral');
  }
  conta('agenda', DB.getAll('eventos').filter(e => e.data === hoje && !e.concluido).length, 'neutral');
  if (typeof getAtendimentos === 'function') {
    conta('atendimentos', getAtendimentos().filter(a => a.presenca === 'nao_informado' && !a.remarcadoPara && a.data <= hoje).length, 'warn');
  }
  if (typeof situacaoDocumento === 'function') {
    const docs = DB.getAll('documentos').map(d => situacaoDocumento(d).chave);
    const vencidos = docs.filter(c => c === 'vencido').length, vencendo = docs.filter(c => c === 'vencendo').length;
    conta('documentos', vencidos || vencendo, vencidos ? 'danger' : 'warn');
  }
  const inst = typeof getInstituicaoConfig === 'function' ? getInstituicaoConfig().nome : '';
  const alvo = document.getElementById('brandInstituicao');
  if (alvo) { alvo.textContent = inst || ''; alvo.title = inst || ''; }
}

function applyTheme(theme){
  if (theme === 'auto') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    theme = prefersDark ? 'dark' : 'light';
  }
  document.documentElement.setAttribute('data-theme', theme);

  const btnTheme = document.getElementById('btnTheme');
  const btnThemeMobile = document.getElementById('btnThemeMobile');
  const cfg = DB.getConfig();

  const svg = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"
    stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  const ICONE_TEMA = {
    // lua
    light: svg('<path d="M20.5 14.3A8.5 8.5 0 0 1 9.7 3.5a8.5 8.5 0 1 0 10.8 10.8Z"/>'),
    // sol
    dark: svg('<circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4"/>'),
    // metade sol / metade lua
    auto: svg('<circle cx="12" cy="12" r="8.5"/><path d="M12 3.5v17a8.5 8.5 0 0 0 0-17Z" fill="currentColor" stroke="none"/>')
  };

  const modo = cfg.theme === 'auto' ? 'auto' : theme;
  const titulo = cfg.theme === 'auto'
    ? 'Tema automático (segue o sistema)'
    : (theme === 'dark' ? 'Mudar para o modo claro' : 'Mudar para o modo escuro');

  [btnTheme, btnThemeMobile].forEach(btn => {
    if (!btn) return;
    btn.innerHTML = ICONE_TEMA[modo];
    btn.title = titulo;
    btn.setAttribute('aria-label', titulo);
  });
}

function toggleTheme(){
  const cfg = DB.getConfig();
  const temas = ['light', 'dark', 'auto'];
  const idx = temas.indexOf(cfg.theme || 'light');
  cfg.theme = temas[(idx + 1) % temas.length];
  DB.saveConfig(cfg);
  applyTheme(cfg.theme);
}

document.getElementById('btnTheme').addEventListener('click', toggleTheme);
document.getElementById('btnThemeMobile').addEventListener('click', toggleTheme);

// Detectar mudanças na preferência do sistema
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  const cfg = DB.getConfig();
  if (cfg.theme === 'auto') {
    applyTheme('auto');
  }
});

function updateClock(){
  const d = new Date();
  document.getElementById('clockTime').textContent =
    `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  document.getElementById('clockDate').textContent = formatDateBR(todayISO());
}
setInterval(updateClock, 1000 * 20);

/* mobile sidebar */
const sidebarEl = document.getElementById('sidebar');
const scrimEl = document.getElementById('scrim');
function openSidebarMobile(){
  sidebarEl.classList.add('is-open');
  scrimEl.classList.add('is-open');
  document.getElementById('btnMenu').setAttribute('aria-expanded','true');
}
function closeSidebarMobile(){
  sidebarEl.classList.remove('is-open');
  scrimEl.classList.remove('is-open');
  document.getElementById('btnMenu').setAttribute('aria-expanded','false');
}
document.getElementById('btnMenu').addEventListener('click', () => {
  sidebarEl.classList.contains('is-open') ? closeSidebarMobile() : openSidebarMobile();
});
scrimEl.addEventListener('click', closeSidebarMobile);

/* botão genérico "novo registro" no topo — direciona conforme a view atual */
document.getElementById('btnNewGeneric').addEventListener('click', () => {
  const map = {
    dashboard: openFormSolicitacao, pendencias: openFormSolicitacao, projetos: abrirEscolhaNovoRecursoOuExecucao, solicitacoes: openFormSolicitacao, agenda: openFormEvento,
    documentos: openFormDocumento,
    pesquisa: openFormSolicitacao, kanban: abrirModalNovoQuadro, historico: openFormSolicitacao, relatorios: openFormSolicitacao, modelos: abrirModalNovoModelo,
    gerador: () => abrirModalModeloGerador(), atendimentos: () => abrirModalNovoAtendimento()
  };
  (map[currentView] || openFormSolicitacao)();
});

/* ---------------------------------------------------------
   8. DISPATCH DE RENDERIZAÇÃO
   --------------------------------------------------------- */
function renderCurrentView(opts){
  renderNotifications();
  atualizarMenu();
  switch(currentView){
    case 'dashboard': renderDashboard(); break;
    case 'pendencias': renderPendencias(); break;
    case 'projetos': renderProjetos(); break;
    case 'solicitacoes': renderSolicitacoes(); break;
    case 'agenda': renderAgenda(); break;
    case 'documentos': renderDocumentos(); break;
    case 'pesquisa': renderPesquisa(); break;
    case 'kanban': renderKanban(); break;
    case 'historico': renderHistorico(); break;
    case 'relatorios': renderRelatorios(); break;
    case 'modelos': renderModelos(); break;
    case 'gerador': renderGeradorDocumentos(); break;
    case 'atendimentos': renderAtendimentos(); break;
  }
}


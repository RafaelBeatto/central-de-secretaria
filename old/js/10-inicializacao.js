/* ---------------------------------------------------------
   20. INICIALIZAÇÃO
   --------------------------------------------------------- */
function init(){
  removerDadosDeDemonstracao();
  normalizarRotinas();
  const cfg = DB.getConfig();
  applyTheme(cfg.theme || 'light');
  updateClock();
  goToView('dashboard');
  setTimeout(() => backupAutomaticoAoAbrir(), 1500);
}
init();

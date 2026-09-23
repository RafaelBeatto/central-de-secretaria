/* ---------------------------------------------------------
   20. INICIALIZAÇÃO
   --------------------------------------------------------- */
function init(){
  removerDadosDeDemonstracao();
  const cfg = DB.getConfig();
  applyTheme(cfg.theme || 'light');
  updateClock();
  goToView('dashboard');
}
init();

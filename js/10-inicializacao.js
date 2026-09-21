/* ---------------------------------------------------------
   20. INICIALIZAÇÃO
   --------------------------------------------------------- */
function mostrarAlertaEntradaSecretaria(){
  const tarefas=DB.getAll('solicitacoes').filter(s=>s.status!=='Concluída'&&s.status!=='Cancelada');
  const hoje=tarefas.filter(s=>prazoAtividade(s).data===todayISO());
  const atrasadas=tarefas.filter(s=>solicitacaoAtrasada(s));
  const urgentes=tarefas.filter(s=>s.prioridade==='Urgente');
  if(!hoje.length&&!atrasadas.length&&!urgentes.length)return;
  const blocos=[];
  if(atrasadas.length)blocos.push(`<div class="attention-list"><strong>🚨 ${atrasadas.length} tarefa${atrasadas.length===1?'':'s'} atrasada${atrasadas.length===1?'':'s'}</strong><p class="muted">${atrasadas.slice(0,3).map(x=>escapeHTML(x.titulo)).join(' · ')}</p></div>`);
  if(hoje.length)blocos.push(`<div class="attention-list"><strong>📌 ${hoje.length} tarefa${hoje.length===1?'':'s'} para hoje</strong></div>`);
  if(urgentes.length)blocos.push(`<div class="attention-list"><strong>🔴 ${urgentes.length} urgente${urgentes.length===1?'':'s'}</strong></div>`);
  openModal('Sua atenção é necessária',`<div style="display:flex;flex-direction:column;gap:10px"><p>Antes de começar, veja o que precisa da sua atenção.</p>${blocos.join('')}<div class="modal-actions"><button class="btn btn-primary" id="btnIrSecretaria">Ver minha rotina</button></div></div>`);
  document.getElementById('btnIrSecretaria').onclick=()=>{closeModal();goToView('solicitacoes');};
}

function init(){
  removerDadosDeDemonstracao();
  const cfg = DB.getConfig();
  applyTheme(cfg.theme || 'light');
  updateClock();
  goToView('dashboard');
  setTimeout(mostrarAlertaEntradaSecretaria, 250);
}
init();

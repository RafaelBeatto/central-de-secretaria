/* =========================================================
   CENTRAL DA SECRETARIA — carregador de módulos
   Os módulos são carregados em ordem para preservar o comportamento
   do projeto original sem transformar tudo em ES Modules.
   ========================================================= */
(function(){
  const scripts=[
    '01-core.js',
    '02-navigation.js',
    '03-dashboard.js',
    '04-projetos.js',
    '05-atividades-agenda.js',
    '06-documentos-prazos.js',
    '08-pesquisa-historico.js',
    '09-relatorios.js',
    '10-inicializacao.js',
    '11-pendencias.js',
    '12-relacionamentos.js',
    '13-documentos-renovacao.js',
    '14-graficos-kpis.js',
    '15-kanban.js',
    '16-modelos-documentos.js',
    '17-gerador-documentos.js',
    '18-armazenamento.js',
    '19-atendimentos.js'
  ];
  const base='js/';
  function load(src){
    return new Promise((resolve,reject)=>{
      const s=document.createElement('script');
      s.src=base+src; s.async=false;
      s.onload=resolve; s.onerror=()=>reject(new Error('Não foi possível carregar '+src));
      document.body.appendChild(s);
    });
  }
  (async()=>{
    try{ for(const src of scripts) await load(src); }
    catch(e){ console.error(e); const toast=document.getElementById('toast'); if(toast){toast.textContent='⚠ Erro ao carregar uma parte do sistema. Verifique os arquivos do projeto.';toast.hidden=false;} }
  })();
})();

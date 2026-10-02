# Módulo 8 — Histórico, Relatórios e Pesquisa geral

Fonte no antigo: `old/js/08b-historico.js`, `09-relatorios.js`, `08-pesquisa-historico.js` · Espec: MAPA_DE_USABILIDADE §4.10.

## Histórico (`/historico`, permissão HISTORICO_LER)
- Ações da unidade agrupadas por dia ("Hoje", "Ontem", "Segunda-feira, 5 de outubro"), com hora, área, texto, **quem fez** e tipo da ação.
- Filtros: busca (sem acento/maiúscula), período (hoje / 7 / 30 dias / tudo / um dia específico), tipo de ação e chips por área com contagem.
  "Mostrar mais" de 150 em 150. Clicar na linha abre o registro (tarefa, documento, empresa, recurso, execução, documento gerado…).
- Back: `GET /api/historico?desde&ate` (instantes — o navegador manda a meia-noite local, então "dia" é o do usuário, não UTC); até 1.000 ações
  mais recentes do período, como o antigo.
- **Melhoria:** mostra o autor de cada ação (o antigo era de um só usuário). Busca e filtros rodam no navegador sobre as 1.000 linhas (o banco não tem `unaccent`).
- **Deliberadamente fora:** "Limpar histórico". O histórico agora é trilha de auditoria multiusuário e fica imutável (a entidade já é só de leitura);
  não existe mais o limite de 1.000 registros guardados.

## Relatórios (`/relatorios`, permissão RELATORIO_LER)
- Período (este mês, mês passado, 7 dias, este ano, datas livres até 1 ano), seções marcáveis (Secretaria, Agenda, Atendimentos, Documentos, Projetos),
  prévia A4 com o cabeçalho da unidade = **Imprimir** = **Salvar PDF** (reaproveita `documentoA4`/`impressaoPdf`/`PaginaA4Previa`).
- Back `GET /api/relatorios/atividades?de&ate&secoes` monta os números (`relatorios/ServicoRelatorio`); **cada seção só vem se o usuário lê o módulo**.
  Tarefas de rotina concluídas no período são contadas pelo histórico (como o antigo); tarefas atrasadas, compromissos, presença por profissional,
  motivos de falta, documentos renovados/vencendo e pagamentos do período com total.
- **Removido** (decisão já aprovada): backup, restaurar e backup automático em pasta.
- Datas respeitam o fuso do navegador (cabeçalho `X-Fuso-Horario`).

## Pesquisa geral (`/pesquisa` + campo no cabeçalho)
- Campo "Pesquisar em tudo…" no topo: Enter abre a tela com os resultados; a tela tem busca ao vivo (300 ms), chips por tipo com contagem e linha clicável.
- Back `GET /api/pesquisa?termo` (`pesquisa/ServicoPesquisa`): sem acento/maiúscula, termo nunca vira regex, pontuação igual (50) > começa (25) > contém
  (5 por ocorrência) × peso do campo; até 25 por tipo. Cada tipo só entra se o usuário lê o módulo (professor/profissional não pesquisam alunos).
- Tipos: tarefas, agenda, documentos, documentos gerados, recursos, execuções, empresas, alunos e profissionais.
- **Diferenças do antigo:** cotações e ordens de compra não são pesquisadas (acesse pela execução ou pela ficha da empresa); atendimentos individuais
  viram **alunos/profissionais** (levam à tela de Atendimentos); o resultado de agenda abre a Agenda (sem abrir o evento direto).
- Pesquisa e menu: a rota `/pesquisa` é `oculto: true` em `routes/modulos.ts` (existe, mas não aparece no menu).

## Verificação
- Back compila e sobe validando as consultas novas; front passa em `tsc`, `eslint` e `vite build`.
- Não testado no navegador nem com dados reais (o dono vai revisar), principalmente o PDF do relatório.

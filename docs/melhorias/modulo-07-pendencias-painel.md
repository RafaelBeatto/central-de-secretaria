# Módulo 7 — Pendências + Painel completo

Fonte no antigo: `old/js/11-pendencias.js`, `old/js/03-dashboard.js` · Espec: MAPA_DE_USABILIDADE §4.9.

## O que foi entregue
- **Pendências** (`/pendencias`): tudo que espera pelo usuário em 4 seções — *Atrasado*, *Para hoje*, *Precisa de atenção*,
  *Próximos dias* — com busca e filtro por origem (Tarefas, Documentos, Atendimentos, Agenda, Projetos) e **ação ali mesmo**:
  ✓ Concluir (tarefa), Renovar (documento), ✓ Veio / ✕ Faltou com motivo (atendimento), ✓ Feito (compromisso),
  ✓ Família contatada (faltas seguidas), ✓ Resolvida (pendência de execução). Clicar na linha abre o registro
  (`/secretaria?tarefa=`, `/documentos?documento=`, `/projetos?execucao=&secao=`).
- **Painel** (`/painel`): saudação com resumo ("2 atrasados · 3 pedindo atenção · 4 na agenda de hoje"), **Para resolver**
  (atrasado + atenção, até 6 por grupo, "+N em Pendências"), **Hoje** (atendimentos do dia com medidor + agenda),
  **Próximos 7 dias**, **Projetos em andamento** (pago × recebido por recurso) e **3 números** (tarefas concluídas em 7 dias,
  documentos em dia, presença da semana). O chat continua no fim da tela.

## Melhorias em relação ao antigo
- **Respeita permissão por fonte**: cada bloco só carrega/aparece se o usuário lê aquele módulo (professor não vê tarefas;
  sem PROJETO_LER não vê projetos). Os botões de ação somem em quem só consulta (outra unidade ou sem permissão de escrita).
- **Uma chamada nova no back** (`GET /api/painel/extras`) para o que o front não tinha pronto: atendimentos sem presença,
  alunos com faltas seguidas e pendências manuais de execução. O resto reaproveita as APIs dos módulos (sem duplicar regra).
- **Faltas seguidas calculadas no back** com a mesma regra do front (≥3, para na primeira presença, some após "Família
  contatada"), olhando só os últimos 90 dias — evita baixar o histórico de cada aluno.
- Professor/profissional só vê pendências dos **próprios atendimentos** (mesmo escopo do módulo Atendimentos).
- Rotina já feita hoje ou com próxima vez no futuro **não vira pendência** (o antigo também ignorava; agora usa `rotinaFutura`).
- Etapas faltando de uma execução viram **uma linha só** ("Falta: Cotações, Ordem de compra…"), abrindo direto na seção da 1ª etapa.
- Muitos atendimentos sem presença (>8 em Pendências, >2 no Painel) viram **uma linha-resumo** que leva à tela de Atendimentos.
- Atualiza a tela sozinha após cada ação (recarrega as fontes), sem recarregar a página.

## Selos no menu lateral (feito depois)
- `hooks/useContadoresMenu`: Pendências (total; vermelho se há atrasado), Secretaria (atrasadas), Documentos (vencidos), Atendimentos (sem presença) e
  Agenda (compromissos de hoje). Atualiza a cada 3 min e ao trocar de tela (no máx. 1×/min), da unidade em consulta; se falhar, o menu fica sem selo.

## Deixado de fora / adiado
- "Tarefas concluídas nos últimos 7 dias" conta só tarefas não recorrentes (não há histórico agregado no back).
- Aviso de backup do Painel antigo: removido (backup foi retirado do sistema, decisão já aprovada).

## Verificação
- Back compila e **sobe validando as consultas novas** (JPQL de `semPresenca`, `decididosDesde`, `abertas`).
- Front passa em `tsc`, `eslint` (arquivos novos) e `vite build`.
- Não testado no navegador (o dono vai revisar) nem com dados reais de faltas seguidas.

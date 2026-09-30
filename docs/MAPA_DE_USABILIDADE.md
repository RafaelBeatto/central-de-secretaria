# Mapa de usabilidade

## 1. Perfis e o que cada um vê (matriz padrão)

L = ler · E = criar/editar/excluir · — = sem acesso. Cada unidade pode ajustar a matriz dos cargos abaixo
de quem ajusta (tela **Permissões**). O administrador do sistema tem tudo.

| Módulo | Presidente | Diretor | Administrador | Secretário | Tesoureiro | Professor / Profissional |
|---|---|---|---|---|---|---|
| Painel, Pendências, Chat | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Agenda | E | E | E | E | E | L |
| Secretaria (tarefas) e Kanban | E | E | E | E | L | — |
| Atendimentos | E | E | E | E | — | E |
| Projetos | E | E | L | L | E | — |
| Documentos e Gerador | E | E | E | E | L | — |
| Empresas | E | E | E | E | E | — |
| Histórico e Relatórios | L | L | L | L | L | — |
| Usuários | E | E | E | — | — | — |
| Unidades subordinadas | E | L | E | — | — | — |
| Permissões | E | — | E | — | — | — |
| Dados da instituição | E | E | E | — | — | — |

**Consultar outra unidade:** quem tem unidades abaixo vê o seletor "Visualizando" no cabeçalho. Ao escolher uma
subordinada, todas as telas mostram os dados dela com a faixa "somente leitura" e sem botões de alteração
(`usePermissao().podeAlterar`). O back recusa qualquer escrita fora da própria unidade.

## 2. Telas e rotas

| Rota | Tela | Estado |
|---|---|---|
| `/entrar` | Login (usuário + senha) | ✅ |
| `/trocar-senha` | Troca obrigatória no 1º acesso / pelo menu do perfil | ✅ |
| `/painel` | Saudação + **chat** (lista de conversas e colegas, mensagens, envio) | ✅ parcial (resto no Módulo 7) |
| `/pendencias` | Central de pendências | ⏳ Módulo 7 |
| `/secretaria` | Tarefas e rotinas (`?tarefa=ID` abre o detalhe) | ✅ |
| `/agenda` | Calendário: Semana / Mês / Lista, painel do dia ou do item, eventos com repetição, arrastar, imprimir | ✅ |
| `/atendimentos` | Semana de atendimentos | ⏳ Módulo 3 |
| `/kanban` | Quadro de tarefas (quadro de execuções de projeto entra no Módulo 5) | ✅ tarefas |
| `/projetos` | Recursos → execuções | ⏳ Módulo 5 |
| `/documentos` | Documentos da instituição | ⏳ Módulo 4 |
| `/gerador` | Gerador de documentos | ⏳ Módulo 6 |
| `/empresas` | Fornecedores | ⏳ Módulo 4 |
| `/historico` | Histórico | ⏳ Módulo 8 |
| `/relatorios` | Relatório de atividades | ⏳ Módulo 8 |
| `/administracao/usuarios` | Lista, busca, novo, editar, redefinir senha, ativar/desativar | ✅ |
| `/administracao/unidades` | Árvore; nova subordinada; editar | ✅ |
| `/administracao/permissoes` | Abas por cargo; marcar permissões; salvar/restaurar padrão; "ajustado" | ✅ |
| `/administracao/instituicao` | Logo (S3), dados, rodapé dos documentos | ✅ |
| `/acesso-negado`, `*` | 403 / 404 | ✅ |

Layout: menu lateral por grupos (Início, Dia a dia, Controle, Consultar, Administração), recolhível e lembrado;
no celular vira gaveta. Cabeçalho: menu, "Visualizando", chat com contador de não lidas, tema claro/escuro, perfil.
Diálogos de formulário ocupam a tela inteira no celular; listas viram cartões.

## 3. Fluxos principais

1. **Primeiro acesso:** `admin`/`Apae@2026` → troca de senha obrigatória → painel.
2. **Montar a federação:** Unidades → ⋮ na Nacional → "Nova federação estadual" → ⋮ na estadual → "Nova APAE municipal".
3. **Cadastrar pessoa:** Usuários → Novo usuário → escolher Unidade (os cargos oferecidos mudam conforme a unidade)
   → informar senha provisória e repassar à pessoa → ela troca no primeiro acesso.
4. **Ajustar permissões da unidade:** Permissões → aba do cargo → marcar/desmarcar (marcar "Criar/editar" marca "Ver")
   → Salvar. "Restaurar padrão" desfaz os ajustes do cargo.
5. **Chat:** Painel → Conversas → escolher colega (só da mesma unidade) → Enter envia, Shift+Enter quebra linha;
   ✓✓ azul = lida. O contador do cabeçalho soma as não lidas.
6. **Consultar subordinada:** "Visualizando" → escolher unidade → navegar (somente leitura) → "Voltar à minha".

## 4. Especificação dos módulos a migrar (fonte: `old/js`)

> Regra geral do antigo: toda ação relevante registra no Histórico (`registrarHistorico`) com a descrição exibida ao
> usuário; o novo faz o mesmo com `ServicoHistorico`. Os detalhes de cada registro mostram o histórico dele.

### 4.1 Secretaria — tarefas e rotinas (`old/js/05a-secretaria.js`) · tabela `secretaria.tarefa`/`subtarefa`
- **Campos:** título* (200), prioridade (Baixa/Média/Alta/Urgente, padrão Média), prazo* (na rotina = "Primeira vez"),
  horário opcional, repetição (Única/Diária/Semanal[dia da semana]/Mensal[dia do mês]/Anual), responsável (texto com
  sugestões dos já usados), categoria (texto com sugestões), detalhes. Código `TAR-0001` por unidade.
- **Situações:** Pendente, Em andamento, Aguardando, Concluída, Cancelada.
- **Prazo efetivo:** rotina usa a próxima ocorrência; tarefa única usa o prazo.
- **Concluir:** única → Concluída + data de conclusão hoje. Rotina → se a próxima é futura ou já foi feita hoje, avisa
  "Já feita neste ciclo. Volta em dd/mm"; senão grava última ocorrência = atual, última conclusão = hoje e calcula a
  próxima data **depois de hoje** (`Recorrencia.proximaDepoisDe`), status volta a Pendente.
- **Reabrir (desfazer):** rotina só se foi feita hoje (volta a próxima para a última ocorrência); única volta a Pendente
  e limpa a data de conclusão. Cancelada → "Reativar" (Pendente). Rotina → "Encerrar rotina" = Cancelada.
- **Editar:** se mudou a frequência ou o prazo, a próxima ocorrência passa a ser o novo prazo; senão mantém.
- **Tela:** barra "O que precisa ser feito? (Enter)" + data + "Mais opções" (formulário completo); filtros busca,
  responsável, prioridade; lista agrupada **Atrasadas / Hoje / Próximos 7 dias / Mais adiante / Sem prazo /
  Concluídas e canceladas (recolhido, 50 mais recentes)**; feitas hoje ficam no grupo Hoje riscadas; ordenação:
  feitas por último, prazo, horário, prioridade (peso), título. Linha: círculo de concluir (bloqueado em rotina
  futura), título, meta (responsável, categoria, ↻ frequência, ☑ x/y subtarefas, situação se Em andamento/Aguardando),
  à direita prioridade Alta/Urgente e "quando" (Ontem, Há N dias, Amanhã, seg 12/05…).
  **Painel de detalhe** ao lado (no celular substitui a lista, com "← Tarefas"): código, título, ação principal
  (Concluir/Fiz hoje/Reabrir/Reativar), Editar, Excluir; fatos: prazo/próxima vez com selo (atrasada/hoje/em breve/
  no prazo), prioridade (select), situação (select) ou rotina (↻ frequência, última vez, "Encerrar rotina"),
  responsável, categoria; descrição; **checklist** (adicionar, marcar, remover, barra de progresso); vínculos;
  histórico (30 últimos).
- **Excluir:** confirmação.

### 4.2 Kanban (`old/js/15-kanban.js`)
- Quadros: **Tarefas** (colunas Pendente, Em andamento, Aguardando, Concluída) e **Execuções de projeto**
  (Planejamento, Em execução, Suspenso, Concluído — Módulo 5).
- Concluída mostra só os últimos 14 dias ("Ver todas"). Canceladas não aparecem.
- Mover para Concluída = mesmo "Concluir" da Secretaria (rotina volta no próximo ciclo). Sair de Concluída limpa a data.
- Arrastar cartão entre colunas **e** menu ⋮ "Mover para" (funciona no celular). Adicionar tarefa no rodapé da coluna.
- Cartão: título, prazo com tom (danger/warn), prioridade Alta/Urgente, ↻, ☑ x/y, responsável. Filtros busca e responsável.
- Execução: aviso se mover para Concluído com etapas do checklist pendentes.

### 4.3 Agenda (`old/js/05-agenda.js`) · `agenda.evento`, `agenda.evento_serie`
- Evento: título*, data*, tipo (Reunião/Atendimento/Compromisso/Evento/Visita/Outro), início/fim (fim ≥ início),
  local, responsável, participantes, prioridade, observações, tarefa ligada (opcional), concluído.
- Repetição: Diária/Semanal/Mensal/Anual **até** uma data (padrão fim do ano ou +365 dias; máx. ~370 ocorrências) →
  gera um evento por data na mesma série. Editar série: "só esta data" ou "esta e as próximas" (desloca as datas pelo
  mesmo delta). Excluir série: só esta / esta e as próximas / todas.
- A agenda mostra junto: tarefas com prazo (menos canceladas), vencimentos de documentos, início/fim de projetos
  (execuções não arquivadas). Filtros por origem (Eventos, Tarefas, Prazos) e busca.
- Visões **Semana** (colunas seg–dom), **Mês** (grade, até 3 itens + "+N"), **Lista** (30 dias). Painel lateral do
  dia ou do item. Arrastar evento/tarefa para outro dia (muda a data/próxima ocorrência). Imprimir.
- Aviso (toast) 30 min antes de evento de hoje com horário.

### 4.4 Atendimentos (`old/js/19-atendimentos.js`) · `atendimentos.*`
- Aluno e profissional são cadastros por nome (criados ao digitar no atendimento; tela "Alunos e profissionais"
  para renomear, **unir duplicados** — atendimentos passam para o destino — e excluir sem uso).
- Atendimento: aluno*, profissional*, data*, horário*, observação; presença Não informado/Veio/Faltou;
  falta com motivo (Doença, Consulta médica, Transporte, Não avisou, Compromisso, Outro) + observação.
- "Veio" desabilitado em data futura; clicar de novo desfaz.
- **Série semanal:** mesmo aluno/profissional/horário toda semana até uma data (padrão fim do ano, máx. 52).
  "Encerrar a partir de dd/mm" remove os futuros sem presença.
- **Remarcar:** original fica marcado como remarcado (não conta nos totais) e nasce uma cópia na nova data/horário/
  profissional, com motivo. Excluir a cópia devolve o original; excluir o original solta a cópia.
- **Copiar semana anterior** sem duplicar (mesmo aluno+profissional+dia+horário) e sem copiar remarcações.
- Criar vários de uma vez (linhas aluno/profissional/dia/horário, opção repetir toda semana).
- Tela: navegação de semanas, resumo (total, vieram, faltaram, sem registro, presença %), aviso de dias passados sem
  presença ("mostrar só esses"), faixa de dias com contador e ponto de pendência, lista do dia ou da semana, filtros
  busca e profissional; painel de atendimento/aluno/profissional com histórico por período e motivos de falta.
- **Faltas seguidas:** 3+ faltas consecutivas (ignorando sem registro) geram aviso no aluno e em Pendências até
  "Família contatada" (grava a data; volta só com falta nova).
- PDFs: **Lista de presença** (dia ou semana, por profissional ou todos; colunas horário, aluno, [profissional], Veio,
  Faltou, assinatura) e **Relatório** (semana/mês/mês passado/período; geral, por aluno ou por profissional; resumo,
  motivos, por profissional).

### 4.5 Documentos (`old/js/06-documentos.js`) · `documentos.*`
- Campos: nome*, categoria (Certidão, Ofício, Ata, Contrato, Relatório, Declaração, Comprovante, Documento financeiro,
  Documento institucional, Convênio, Outros), "vale como documento da APAE nos projetos" (CNPJ, Estatuto, Ata de
  eleição/posse, Certidão federal, Certidão estadual, Certidão municipal, FGTS, CNDT), órgão emissor, número,
  responsável, emissão, validade (vazio = não vence; atalhos +30d/+90d/+6m/+1a), arquivo, onde está guardado, tags,
  para que serve, observações. Validade ≥ emissão.
- Situação: vencido (<0), vencendo (≤30 dias), válido, sem validade. Lista agrupada nessa ordem; filtros busca,
  categoria, responsável; botão Renovar nos vencidos/vencendo.
- **Renovar:** nova emissão*, nova validade*, número, novo arquivo; a versão anterior (com arquivo) vai para
  "Versões anteriores" (`documento_versao`).
- Excluir apaga arquivos das versões também.

### 4.6 Empresas (`old/js/04-projetos.js` ficha global) · `empresas.*`
- Cadastro único por unidade: razão social*, nome fantasia, CNPJ (validado; botão "Buscar dados" na API pública
  `open.cnpja.com/office/{cnpj}` preenche só campos vazios), telefone, e-mail, endereço, município, UF, representante,
  CPF do representante, observação. Mesmo CNPJ ou mesma razão social = mesma empresa.
- Documentos da empresa: CNPJ, Contrato Social, CND Federal, CND Estadual, CND Municipal, FGTS, CNDT, Outros — com
  validade e arquivo obrigatório. Situação: 🟢 OK / 🟠 incompleta (sem docs ou sem arquivo) / 🔴 vencido.
- Ficha com abas: Dados, Documentos, Cotações, Ordens de compra, Projetos, Histórico. "Gerar documento" abre o Gerador
  com a empresa vinculada.

### 4.7 Projetos (`old/js/04-projetos.js`, `04b-projetos-telas.js`) · `projetos.*`
- **Recurso** (dinheiro que entrou): nome*, tipo/origem*, órgão repassador, convênio/termo, data de recebimento,
  início*, término* (≥ início), valor recebido*, conta bancária, responsável, status (Aguardando execução, Em execução,
  Parcialmente distribuído, Com pendências, Encerrado), finalidade, observações; arquivar/reabrir; documentos do recurso
  (Termo, Convênio, Plano geral, Comprovante de recebimento, Documentação do recurso, Outros).
- **Execução** (aplicação do recurso): nome*, fonte*, convênio, início*, fim*, valor planejado*, responsável, status
  (Planejamento, Em execução, Concluído, Suspenso, Cancelado), objetivo, observações.
  Não pode passar do saldo **não distribuído** do recurso (canceladas não contam).
- **Financeiro do recurso:** recebido, distribuído (Σ planejado), pago (Σ pagamentos), não distribuído, saldo das
  execuções, disponível = não distribuído + saldo; medidor pago | distribuído a pagar | livre.
  **Movimentações** (nunca alteradas): entrada, distribuição, pagamento, transferência, ajuste (editar valores gera ajuste;
  excluir execução devolve o valor). **Transferir saldo** entre execuções (origem ≠ destino, ≤ saldo, motivo*).
- **Seções da execução = checklist:** Plano de aplicação (descrição* + arquivo), Empresas e compras (cotações de
  **≥3 empresas** para escolher a **vencedora**; ordem de compra só para a vencedora — número*, data, valor, status
  Rascunho/Emitida/Recebida/Cancelada, arquivo*; aviso se documentos da empresa vencidos na data), Documentação da APAE
  (lê os documentos com exigência em Documentos), Notas e documentos (Nota fiscal, Comprovante, Relatório, Declaração,
  Outro; nota fiscal conclui a etapa), Pagamentos (fornecedor, data, valor*, forma, comprovante*; aviso se passar do
  saldo ou docs da empresa vencidos), Pendências (título*, prioridade, detalhes; concluir/reabrir).
  "Próximo passo" = primeira etapa pendente. Cotação: itens (descrição, qtd, valor) somam o total, proposta* anexada.
- **Relatório do recurso em PDF** (números + tabela de execuções). Lista inicial com totais (recebido, distribuído,
  pago, disponível), cartão por recurso com execuções, filtros busca/status/arquivados. Navegação Lista → Recurso → Execução.

### 4.8 Gerador de documentos (`old/js/17-gerador-documentos.js`, `17b-gerador-telas.js`) · `gerador.*`
- Modelos com **{CAMPO}** automático (NOME_APAE, CNPJ_APAE, ENDERECO_APAE, TELEFONE_APAE, EMAIL_APAE, CIDADE_UF,
  PRESIDENTE, CPF_PRESIDENTE, DATA (cidade + data por extenso), DATA_CURTA, ANO, NUMERO) e **[CAMPO]** preenchido
  no formulário. Campos longos (TEXTO, PAUTA, DELIBERACOES, CLAUSULAS, JUSTIFICATIVA, OBJETIVO, ATIVIDADES,
  RESULTADOS, CONSIDERACOES, PRESENTES, OBJETO) viram área de texto.
- 12 modelos do sistema já no seed (unidade NULL); a unidade cria/edita/duplica os seus em editor rico (negrito,
  itálico, títulos, tamanho, alinhamento, listas, tabela, quebra de página, espaçamento). HTML sanitizado.
- **Numeração** automática por série e ano quando o texto usa {NUMERO} (`ServicoNumeracao.numeroDoAno`).
- Documento gerado guarda cópia do texto do modelo; editar gera **nova versão** (anteriores consultáveis); duplicar;
  anexos (S3); vínculo com empresa/execução/aluno/atendimento/documento/tarefa preenche campos automaticamente.
- Assinaturas: blocos de linhas abaixo do texto. Lista por mês com busca e filtro por modelo; prévia A4 ao vivo.
- **Impressão/PDF** no navegador com cabeçalho (logo + dados da unidade) e rodapé (campos marcados + texto livre +
  "Página X de Y" se configurado). O CSS A4 está em `DOC_A4_PRINT_CSS` no arquivo antigo.

### 4.9 Pendências e Painel (`old/js/11-pendencias.js`, `03-dashboard.js`)
- Pendências junta sozinho: tarefas atrasadas e de hoje, documentos vencidos/vencendo, atendimentos passados sem
  presença, alunos com 3 faltas seguidas, compromissos de hoje, etapas faltando nos projetos e pendências de execução.
  Ação ali mesmo (Concluir, Renovar, Veio/Faltou, Feito, Resolvida). Filtros por área.
- Painel: "Para resolver" (atrasado/atenção com ação), hoje e próximos 7 dias, andamento dos projetos, três números
  da semana. Contadores no menu (atrasadas, docs vencidos, atendimentos sem presença, eventos de hoje).

### 4.10 Histórico, Relatórios e Pesquisa (`old/js/08b-historico.js`, `09-relatorios.js`, `08-pesquisa-historico.js`)
- Histórico: agrupado por dia, busca, período, filtro por módulo e por ação; clicar abre o registro se existir.
- Relatório de atividades: período (mês etc.), seções marcáveis (Secretaria, Agenda, Atendimentos, Documentos,
  Projetos) com o cabeçalho da unidade; prévia = impressão = PDF.
- Pesquisa geral (campo no topo): tarefas, agenda, atendimentos, documentos, documentos gerados, recursos, execuções,
  empresas, cotações, ordens; sem diferenciar acento/maiúscula; filtro por tipo; pontuação (igual > começa > contém).

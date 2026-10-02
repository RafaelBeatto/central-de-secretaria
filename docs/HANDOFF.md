# HANDOFF — continuar a migração da Central da Secretaria

> Atualizado em: 2026-10-02 · Concluído: **Base + Módulos 1 a 8 (Secretaria + Kanban, Agenda, Atendimentos, Documentos + Empresas, Projetos, Gerador, Pendências + Painel, Histórico + Relatórios + Pesquisa)** · Próximo: **Módulo 9 — Vínculos entre registros**
> (o desenho do Módulo 9 **ainda não foi feito** — leia o MAPA_DE_USABILIDADE e procure "vínculos" em `old/js/` antes de desenhar)
>
> **Para a IA que vai continuar:** leia este arquivo inteiro, depois `MAPA_DE_CODIGO.md` (onde está cada coisa) e
> `MAPA_DE_USABILIDADE.md` §4 (regras de cada módulo). Siga a seção 4 "Próximo passo exato" e, ao terminar cada módulo,
> atualize este arquivo, os dois mapas e crie `melhorias/modulo-NN-*.md` (pasta `docs/melhorias/`).

## 1. O que é o projeto

Migração do sistema "Central da Secretaria" das APAEs:

- **De:** `old/` — HTML + 20 módulos JS (~700 KB) + localStorage/IndexedDB, rodando só no navegador.
- **Para:** `back/` (API Java 21 + Spring Boot 4.0.7, jar Maven) + `front/` (React 18 + TypeScript + MUI,
  estrutura copiada do template `basefront/main`) + PostgreSQL local `apae` + arquivos na AWS S3.

## 2. Regras do dono do projeto (obrigatórias)

1. **Tudo em pt-BR**: classes, métodos, variáveis, serviços, comentários, mensagens, commits.
2. **Não tomar atitudes arbitrárias**: em dúvida real, perguntar. **Mas antes de perguntar, leia `old/`** —
   ele se irrita com perguntas cuja resposta está no sistema antigo.
3. **Não modificar `old/` nem `basefront/`** (só leitura). `old/` é a especificação funcional; `basefront/` é o
   template visual de onde se copiam componentes.
4. Front e back **com validações** e **respeitando o tamanho das colunas** do banco
   (`Limites.java` ↔ `front/src/constantes/limites.ts` ↔ `apae.sql`).
5. **Nada de base64 no banco.** Arquivo vai para o S3; no banco só a referência (`sistema.arquivo`).
6. **Reaproveitar código**, sem redundância (existem utilitários/componentes prontos — ver MAPA_DE_CODIGO).
7. Boas práticas "Java sênior" e responsividade web/mobile.
8. SQL em **arquivo único e em ordem** (`back/src/main/resources/db/apae.sql`), tabelas **separadas por schema** (nada no `public`).
9. Entrega **módulo a módulo**, com revisão do dono entre eles. Ele pediu para **não gastar tempo com testes
   automatizados** agora (priorizar funcionalidade); compile e faça build sempre.
10. Commits só quando ele pedir.

## 3. Decisões já aprovadas (não reabrir)

| Tema | Decisão |
|---|---|
| Linguagem do front | TypeScript |
| Banco | PostgreSQL local `apae` (usuário/senha locais `postgres/postgres`), `application.properties`; o `-prod` fica para depois |
| Hierarquia | Unidades em árvore **NACIONAL → ESTADUAL → MUNICIPAL** (tabela `acesso.unidade`, caminho materializado `/1/4/17/`) |
| Acesso | **Cargo + unidade** (não roles compostas). Cargos por nível: administrador_sistema(0) > presidente(1) > diretor(2) > administrador(3) > secretário(4) > tesoureiro(5) > professor = profissional(6) |
| Criar usuário | Só cargo **abaixo do seu** na própria unidade, ou **qualquer cargo** (exceto admin do sistema) em unidades subordinadas |
| Permissões | Matriz padrão global (`acesso.cargo_permissao`) + **ajuste por unidade** (`acesso.unidade_cargo_permissao`) com tela. Ninguém concede permissão que não tem |
| Escopo de dados | Cada registro tem `unidade_id`. Unidade superior **só lê** as subordinadas (cabeçalho `X-Unidade`); escrita só na própria |
| Login | Usuário + senha, JWT (acesso 15 min + renovação rotativa 7 dias com detecção de reuso). Cadastro: nome, sobrenome, contato (telefone **ou** e-mail), **data de nascimento** (não idade) |
| Chat | WebSocket STOMP, sempre **1 para 1**, só entre pessoas **da mesma unidade**, painel na tela inicial |
| Arquivos | AWS S3 via `ServicoArquivo` (upload genérico devolve id; registro guarda o id) |
| PDFs | Os PDFs que cada tela gerava no antigo **continuam**, gerados no navegador com o cabeçalho da unidade |
| Removidos | Backup JSON, indicador de armazenamento, pasta .zip da prestação de contas, "classificar projeto antigo" (banco começa do zero) |
| Stack back | Spring Boot 4.0.7 (Jackson 3, Hibernate 7, Security 7), JWT nativo (`oauth2-resource-server`/Nimbus), Caffeine, AWS SDK v2 2.30.0, Lombok |
| Stack front | Versões do basefront (React 18.3, MUI 5.16, RTK 1.8, react-router 6.3, Formik + Yup, Vite 4), `@stomp/stompjs` 7 |

## 4. Estado atual

### Pronto (Fase 1 — base)
- **Banco:** `apae.sql` com **todas** as tabelas de todos os módulos (39 tabelas, 10 schemas) + seeds
  (cargos, 24 permissões, matriz padrão, unidade Nacional, usuário `admin`/`Apae@2026` com troca obrigatória,
  12 modelos prontos do Gerador). Já executado no banco local `apae`.
- **Back:** autenticação, unidades, usuários, matriz de permissões, arquivos S3, histórico (serviço),
  numeração por unidade, chat REST + WebSocket. Compila, empacota o jar e sobe validando o schema.
- **Front:** login, troca de senha, layout (sidebar/header do template), menu e rotas gerados de
  `routes/modulos.ts`, painel com chat, telas de Usuários, Unidades, Permissões e Dados da instituição.
  `tsc` e `vite build` passam. Módulos ainda não migrados abrem "Em construção".

### Pronto (Módulo 1 — Secretaria + Kanban)
- Back `tarefas/`: `Tarefa` (regras de rotina **na entidade**: `concluir`, `reabrir`, `alterarStatus`, `moverPara`,
  `definirRotina`), `Subtarefa`, `StatusTarefa`, `ServicoTarefa`, `ControladorTarefa` (rotas no MAPA_DE_CODIGO).
- Comuns novos no back: `dominio/Prioridade`, `Frequencia`, `Recorrencia`; `Relogio` ("hoje" no fuso do navegador,
  cabeçalho `X-Fuso-Horario`, propriedade `aplicacao.fuso-horario-padrao`); `Datas`; `ServicoHistorico.doRegistro`.
- Front: `views/secretaria/Secretaria.tsx` (barra rápida, filtros, lista agrupada, detalhe com checklist e histórico,
  formulário completo; aceita `?tarefa=ID`), `views/kanban/Kanban.tsx` (arrastar com react-beautiful-dnd + menu ⋮,
  concluídas dos últimos 14 dias / ver todas, criar tarefa na coluna). `axios` envia `X-Fuso-Horario`.
- Reaproveitáveis novos no front: `hooks/useAcoesTarefa`, `utils/tarefas.ts` (grupos, prazo, "quando", ordenação),
  `utils/datas.ts`, `types/comum.ts`, `components/compartilhados/HistoricoDoRegistro`.
- Verificado: back compila e sobe validando o schema; front passa em `tsc` e `vite build`.
- Fica para depois: quadro "Execuções de projeto" no Kanban (Módulo 5) e vínculos da tarefa (Módulos 4/5).

### Pronto (Módulo 2 — Agenda)
- Back `agenda/`: `Evento` (regras na entidade: `aplicar`, `copiarPara`, `concluir`, `reabrir`, `moverPara`,
  `entrarNaSerie`/`sairDaSerie`), `EventoSerie`, `TipoEvento`, `EscopoSerie` (SO_ESTA | ESTA_E_PROXIMAS | TODAS),
  `ServicoEvento` (criar/editar/excluir com série, concluir, reabrir, mover), `ServicoAgenda` (itens do período de todas
  as fontes que o usuário pode ler, até 100 dias, em ordem de data/horário/título), `ControladorAgenda` (rotas no MAPA_DE_CODIGO).
- **Fontes** (`agenda/fontes/`): interface `FonteAgenda` (`permissao()` + `itens(unidade, inicio, fim, hoje)`) com
  `FonteEventos` (AGENDA_LER) e `FonteTarefas` (TAREFA_LER; nova consulta `TarefaRepositorio.comPrazoNoPeriodo`).
  Documentos e projetos entram como novas fontes nos Módulos 4/5 (é só criar o `@Component`): prioridade pela proximidade
  (vencido = Urgente, até 3 dias = Alta, até 7 = Média), chaves `DOCUMENTO-3`, `PROJETO_INICIO-4`, `PROJETO_FIM-4`.
- Comum novo: `Recorrencia.datasDaSerie(inicio, ate, frequencia, limite)` (mensal e anual mantêm o dia da 1ª data:
  31/01 → 28/02 → 31/03; 29/02 volta no bissexto). Limites `EVENTO_TITULO`, `EVENTO_LOCAL`, `EVENTO_PARTICIPANTES`.
- Regras do antigo mantidas: série até 370 datas; "repetir até" padrão = 31/12 ou +365 dias; editar em série com
  "só esta" / "esta e as próximas" (desloca pelas mesmas diferenças de dias); editar evento solto pode ligar a repetição;
  excluir com escopo e apaga a série vazia; arrastar muda só aquela data; tarefa ligada da mesma unidade e em aberto
  (a já ligada pode ficar mesmo se foi concluída depois); textos do histórico iguais ao antigo.
- Front: `views/agenda/Agenda.tsx` + `components/apps/agenda/*` (`VisaoSemana`, `VisaoMes`, `VisaoLista`, `ChipItem`,
  `LinhaItem`, `DiaAlvo` (clique + soltar), `PainelDia`, `PainelItem`, `FormularioEvento`, `DialogoExcluirEvento`,
  `DialogoMoverPara`, `cores.ts`), `types/agenda.ts`, `servicos/agenda.ts`, `utils/agenda.ts` (período, título,
  busca, agrupamento, padrão do "repetir até"), `utils/datas.ts` (+ `inicioDaSemana`, `diasEntre`, `somarMeses`,
  `mesPorExtenso`, `dataCompleta`), `hooks/useAvisoAgenda.ts` (montado no `FullLayout`).
- Arrastar usa HTML5 nativo (entre dias); no celular e pelo teclado há "Mover para…" no painel do item.
- Impressão: `window.print()` com `@media print` (GlobalStyles na tela) escondendo menu, cabeçalho, barra, legenda e painel.
- Ajustes no compartilhado `CampoFormik`: `inputProps` não apaga mais o `maxLength` do `limite`; seleção com opção de
  valor `''` mostra o rótulo dela (antes ficava em branco — afetava o "Repete?" da Secretaria).
- Verificado: back compila, empacota e sobe validando o schema; API testada ponta a ponta (série do dia 31, esta e as
  próximas, escopos de exclusão, limites, tarefa ligada, histórico); front passa em `tsc`, `eslint` (arquivos novos) e
  `vite build`; telas testadas no navegador (Semana/Mês/Lista, painel, formulário, arrastar, excluir série, busca,
  filtros, aviso de 30 min, impressão, celular).

### Pronto (Módulo 3 — Atendimentos)
- Back `atendimentos/`: `Aluno`/`Profissional` (`EntidadeBase` + `criadoEm` manual, sem `atualizado_em` — a tabela não tem essa
  coluna), `Atendimento` (`EntidadeAuditavel`; regras na entidade: `marcarPresenca`, `remarcarPara` — cria a cópia e marca o
  original, `desfazerRemarcacao`, `desligarDoOriginal`), `Presenca`, `MotivoFalta` (6 opções fixas do antigo, sem CHECK no
  banco), `ServicoAtendimento` (CRUD avulso/semanal/lote, presença com regra "Veio" só até hoje, remarcar, excluir com
  religação da remarcação, encerrar série, copiar semana anterior sem duplicar), `ServicoCadastroAtendimento` (renomear,
  mesclar — com `@Modifying @Query` para reatribuir os atendimentos —, excluir sem uso, contato família), `ControladorAtendimento`.
- **Professor/profissional** (novidade da migração: `Profissional.usuarioId`, sem equivalente no antigo): só enxergam e
  criam os **próprios** atendimentos — `ServicoCadastroAtendimento.vinculado()`/`meuProfissional()` cria o cadastro do
  profissional na 1ª vez que o usuário usa o módulo (nome = nome completo do usuário) e todo o `ServicoAtendimento` filtra
  por ele; não gerenciam cadastros (renomear/mesclar/excluir de aluno/profissional exige não ser vinculado).
- Série semanal é só um `serieId` (`UUID`) direto no `Atendimento` — sem tabela própria como a `agenda.evento_serie`,
  porque aqui só existe frequência semanal. Reaproveitado `Recorrencia.datasDaSerie` (máx. 52).
- Regras do antigo mantidas: remarcar cria uma cópia e marca o original (excluir a cópia devolve o original; excluir o
  original solta a cópia); encerrar série remove as futuras sem presença; copiar semana anterior não duplica (mesmo
  aluno+profissional+dia+horário) nem copia remarcações; lote ignora linhas incompletas; faltas seguidas contam do
  atendimento mais recente para trás e param na primeira que não é falta.
- Front: `views/atendimentos/Atendimentos.tsx` + `components/apps/atendimentos/*` (`FaixaDias`, `LinhaAtendimento`,
  `PainelAtendimento`, `PainelPessoa` — aluno e profissional no mesmo componente —, `FormularioNovoAtendimento` com abas
  Individual/Lote, `DialogoRemarcar`, `DialogoJustificarFalta`, `DialogoGestaoCadastros`, `DialogoListaPresenca`,
  `DialogoRelatorio`), `types/atendimentos.ts`, `servicos/atendimentos.ts`, `utils/atendimentos.ts` (resumo e faltas
  seguidas calculados no front a partir do histórico já carregado, como o antigo fazia).
- **Primeiro PDF da migração**: `html2pdf.js` instalado (import dinâmico em `utils/impressaoPdf.ts`, por isso não pesa no
  bundle inicial) + `utils/documentoA4.ts` (cabeçalho institucional com logo do S3, estilo A4) — pensados para serem
  reaproveitados pelos Módulos 5/6/8. Lista de presença e relatório têm Imprimir (`window.print`) e Salvar PDF.
- Verificado: back compila, empacota e sobe validando o schema num banco descartável; API testada ponta a ponta (avulso,
  série semanal de 4 datas, remarcar e desfazer, encerrar série, lote com linha incompleta ignorada, copiar semana anterior
  com deduplicação e as duas mensagens de erro do antigo, renomear/mesclar/excluir com bloqueio por uso, faltas seguidas +
  contato família, escopo do professor/profissional incluindo bloqueio 404/403 fora do próprio); front passa em `tsc`,
  `eslint` e `vite build`. **Um bug encontrado e corrigido nos testes**: `marcarContatoFamilia` pegava a falta mais antiga
  da sequência em vez da mais recente (laço sem `break`/guarda no primeiro valor) — corrigido antes de fechar o módulo.

### Pronto (Módulo 4 — Documentos + Empresas)
- Back `documentos/`: `Documento` (regra `renovar` na entidade: guarda número/emissão/validade/arquivo atuais numa
  `DocumentoVersao` e assume os novos — o arquivo só continua se vier um novo, igual ao antigo), `CategoriaDocumento`,
  `ExigenciaApae` ("vale como documento da APAE nos projetos" — o Módulo 5 lê por aqui), `ServicoDocumento` (CRUD, renovar,
  excluir apagando os arquivos das versões; trocar o arquivo na edição apaga o anterior), `ControladorDocumento`.
  Situação (vencido/vencendo ≤30 dias/válido/sem validade) é calculada **no front**, como no antigo.
- Back `empresas/`: `Empresa`, `EmpresaDocumento` (arquivo obrigatório, categoria `DOCUMENTO_EMPRESA`), `ServicoEmpresa`,
  `ControladorEmpresa`. **Mesmo CNPJ ou mesma razão social = mesma empresa**: `POST` devolve `{empresa, jaExistia: true}` com a
  existente em vez de duplicar; `PUT` recusa (422) o CNPJ/nome de outra. CNPJ e CPF são gravados sempre formatados
  (`DocumentoFiscal.formatarCnpj/Cpf`) para a comparação por igualdade funcionar. A lista já traz os documentos de cada
  empresa (uma consulta só, `findByEmpresaIdIn`) para mostrar a situação 🟢/🟠/🔴; adicionar/excluir documento devolve a
  empresa atualizada.
- Agenda: nova fonte `agenda/fontes/FonteDocumentos` (DOCUMENTO_LER, chave `DOCUMENTO-<id>`, título "Vencimento: nome").
  Comum novo `Prioridade.pelaProximidade(data, hoje, padrao)` (vencido = Urgente, ≤3 dias = Alta, ≤7 = Média) — o Módulo 5
  usa o mesmo para `PROJETO_FIM`. O painel do item na Agenda tem "Abrir documento" (`/documentos?documento=ID`).
- **"Buscar dados" do CNPJ é chamado do navegador** (`servicoEmpresas.consultarCnpj`, `fetch` puro para não mandar o JWT
  a terceiros), como o antigo fazia; preenche só campos vazios e corta no limite de cada coluna. Se um dia o nginx ganhar
  CSP, liberar `connect-src https://open.cnpja.com`.
- Front: `views/documentos/Documentos.tsx` (lista agrupada Vencidos / Vencem em até 30 dias / Em dia / Sem validade, filtros
  busca/categoria/responsável, "Renovar" nos vencidos/vencendo, painel com versões anteriores e histórico; aceita
  `?documento=ID`) + `components/apps/documentos/*` (`ListaDocumentos`, `LinhaDocumento`, `DetalheDocumento`,
  `FormularioDocumento`, `DialogoRenovarDocumento`, `AtalhosValidade` +30d/+90d/+6m/+1a); `views/empresas/Empresas.tsx`
  (lista com situação, busca e filtro por situação, ficha ao lado com abas Dados/Documentos/Histórico) +
  `components/apps/empresas/*` (`LinhaEmpresa`, `FichaEmpresa`, `FormularioEmpresa` com "Buscar dados",
  `DialogoDocumentoEmpresa`); `types/documentos.ts`, `types/empresas.ts`, `servicos/documentos.ts`, `servicos/empresas.ts`,
  `utils/documentos.ts` (situação, texto do prazo, grupos, atalhos de validade, situação da empresa — reaproveitar no Módulo 5).
- Reaproveitáveis novos no front: **`components/formularios/CampoArquivoFormik`** (envia ao S3 ao escolher, guarda só o id,
  mostra o nome do arquivo atual e abre ao clicar — usar em Projetos/Gerador) e `servicoArquivos.dados(id)`.
  `normalizar` (busca sem acento) saiu de `utils/tarefas.ts` para `utils/formatacao.ts` (o chat também passou a usá-lo).
- Fica para o Módulo 5/6: abas Cotações, Ordens de compra e Projetos da ficha, "Ligar a um projeto", "Gerar documento" e o
  bloqueio de excluir empresa ligada a documento gerado (o antigo bloqueava); a lista "empresas só dentro de projetos
  antigos" não existe mais (banco começa do zero).
- Verificado: back compila, empacota e sobe validando o schema num banco descartável; API testada ponta a ponta por curl
  (criar/validar/renovar com versão/trocar arquivo/excluir com arquivos das versões; histórico com datas dd/mm/aaaa; fonte
  da Agenda com prioridade; empresas: deduplicação por CNPJ formatado ou não e por nome, edição sem falso conflito entre
  empresas sem CNPJ, 422 ao repetir CNPJ/nome de outra, validações de CNPJ/CPF/e-mail/UF, documento com arquivo obrigatório
  e da categoria certa, 404 ao excluir documento de outra empresa, exclusão em cascata apagando os arquivos); front passa em
  `tsc`, `eslint` e `vite build`. Os arquivos dos testes foram inseridos direto no banco (sem chaves da AWS nesta máquina).
  **Corrigido no código herdado do commit anterior:** `Empresa.uf` sem `bpchar(2)` (derrubaria a validação do schema), CNPJ/
  CPF/e-mail/UF sem validação, `findBy...CnpjAndIdNot(null)` virava `IS NULL` (duas empresas sem CNPJ "conflitavam"),
  cadastro com CNPJ não conferia a razão social (estourava o índice `ux_empresa_razao`) e histórico da renovação com data ISO.
- Não testado: telas no navegador (o dono vai revisar) e a consulta real à CNPJá.

### Pronto (Módulo 5 — Projetos)
- Back `projetos/`: entidades `Recurso`, `Execucao` (`somarAoPlanejado` da transferência), `RecursoDocumento`,
  `MovimentacaoRecurso`, `ExecucaoEmpresa`, `Cotacao` (itens como `@ElementCollection` de `Cotacao.Item` em `cotacao_item`),
  `OrdemCompra`, `ExecucaoDocumento`, `Pagamento`, `ExecucaoPendencia`; enums em `Enums.java`. Comum novo
  `comum/entidade/EntidadeCriada` (só `criado_em`).
- **`CalculoProjetos`** é a fonte única dos números e do checklist (iguais ao antigo): financeiro do recurso (recebido /
  distribuído / pago / não distribuído / saldo das execuções / disponível; canceladas não contam), livre para distribuir,
  situação da execução (planejado/pago/saldo, 7 etapas, próximo passo), documentação da APAE (por exigência, o documento de
  validade mais longa; sem validade = válido) e empresas com documentação OK. Carrega **em lote** (uma consulta por tabela
  para todas as execuções), então a lista não faz N consultas.
- `ServicoRecurso` (CRUD, arquivar/reabrir, documentos, transferência ≤ saldo da origem, histórico do recurso + execuções),
  `ServicoExecucao` (CRUD com **limite do saldo não distribuído**, situação pelo Kanban, plano, ligar/remover empresa,
  detalhe completo, `daEmpresa` para a ficha), `ServicoItensExecucao` (cotações, vencedora com ≥3 empresas, ordem só da
  vencedora, notas, pagamentos, pendências). Toda mudança de valor vira movimentação (ENTRADA, DISTRIBUICAO, TRANSFERENCIA,
  AJUSTE — editar valor e excluir execução geram AJUSTE), como no antigo; pagamentos **não** geram movimentação (o antigo também não).
- Regras novas vs. o antigo (o banco exigiu): ordem de compra referencia a cotação vencedora (`cotacao_id NOT NULL`), então
  trocar a vencedora ou excluir a cotação com ordem pede excluir a ordem antes; remover empresa com cotação é bloqueado
  (o antigo também bloqueava); não cria execução em recurso arquivado.
- `ServicoArquivo.exigirCategoria(id, categoria)` (novo, reaproveitável): valida que o anexo é da unidade e do tipo certo.
- Histórico: `ServicoHistorico.doRegistroEFilhos` (recurso + execuções juntos, até 60). Refs: `RECURSO`, `EXECUCAO`;
  ligar/remover empresa registra na ficha da empresa (`EMPRESA`).
- Agenda: `agenda/fontes/FonteProjetos` (PROJETO_LER) — início/fim de recursos não arquivados e das execuções deles; chaves
  `RECURSO_INICIO-id`, `RECURSO_FIM-id`, `EXECUCAO_INICIO-id`, `EXECUCAO_FIM-id`; o fim usa `Prioridade.pelaProximidade`.
  O painel do item tem "Abrir projeto".
- Front: `views/projetos/Projetos.tsx` — **o nível aberto fica na URL** (`?recurso=ID`, `?execucao=ID&secao=empresas`), então o
  "voltar" do navegador funciona e Agenda/Kanban/Empresas abrem direto o registro. `components/apps/projetos/*`:
  `ListaRecursos` (totais + cartão por recurso com medidor e execuções), `TelaRecurso` (financeiro, abas Execuções/Documentos/
  Histórico com movimentações, dados ao lado, relatório PDF, transferir, arquivar), `TelaExecucao` (navegação que É o checklist:
  ✓ ou número da etapa; no celular vira abas), `SecoesExecucao` (Resumo, Plano, Empresas e compras, Documentação da APAE,
  Notas e documentos, Pagamentos, Pendências), `FormulariosProjeto`, `DialogosProjeto` (documento do recurso, transferência,
  plano, ligar empresa, cotação com itens e total automático, ordem e pagamento com **aviso de documentos da empresa vencidos
  na data** e de pagamento acima do saldo — confirmados como no antigo), `Comuns` (chip de status, medidor, números, linha de
  item), `relatorioRecurso.ts` (PDF com o cabeçalho da unidade).
- Kanban: quadro "Execuções de projeto" (`components/apps/kanban/QuadroExecucoes`), escolhido no topo para quem tem
  PROJETO_LER; mover para Concluído com etapas pendentes pede confirmação listando as etapas.
- Empresas: ficha com abas **Cotações, Ordens de compra e Projetos** e "Ligar a um projeto"; aceita `?empresa=ID`.
- Documentos: aceita `?exigencia=CNPJ` (abre o cadastro já marcado — vindo de "Cadastrar" na Documentação da APAE); "Renovar"
  da Documentação da APAE abre o mesmo `DialogoRenovarDocumento` dentro do projeto.
- Comuns novos no front: `regras.valor(minimo)` (reais com 2 casas) em `utils/validacao.ts`; `formatarMoeda`, `PROPS_VALOR`,
  `TOM_STATUS`, `avisoDocumentosEmpresa` em `utils/projetos.ts`; `escapeHtml` exportado de `utils/documentoA4.ts`.
- Removido conforme decisão: pasta .zip da prestação e "classificar projeto antigo" (banco começa do zero).
- Verificado: back compila, empacota e sobe validando o schema num banco descartável; API testada ponta a ponta por curl
  (limite do saldo ao criar/editar, período inválido, ligar empresa repetida, cotação de empresa não ligada, vencedora com
  menos de 3 empresas, ordem sem 3 cotações/sem vencedora, troca de vencedora, bloqueios por ordem existente, plano/nota/
  pagamento movendo o checklist, anexo de tipo errado, transferência acima do saldo e válida, movimentações, histórico do
  recurso, Kanban e status, ficha da empresa, Agenda com prioridade, excluir execução devolvendo o valor e apagando os
  arquivos, arquivar bloqueando nova execução). **Bug achado e corrigido nos testes:** trocar a vencedora deixava a anterior
  ainda marcada na resposta (o `update` em massa não atualiza a entidade já carregada) — agora desmarca pela entidade e dá
  `flush` antes de marcar a nova (o índice único `ux_cotacao_vencedora` aceita só uma). Front passa em `tsc`, `eslint` e `vite build`.
- Não testado: telas no navegador (o dono vai revisar) e PDF do relatório (depende do navegador).

### Pronto (Módulo 6 — Gerador de documentos)
- Detalhe das melhorias e decisões em **[melhorias/modulo-06-gerador.md](melhorias/modulo-06-gerador.md)** (pasta nova: um arquivo por módulo).
- Back `gerador/`: `ModeloDocumento` (unidade nula = modelo do sistema, só leitura), `DocumentoGerado` (cópia do texto do modelo,
  respostas em `jsonb`, anexos em `@ElementCollection`; regra `editar` na entidade empilha a versão anterior em
  `DocumentoGeradoVersao`), `FormatoModelo` (HTML/TEXTO), `TipoVinculo` (EMPRESA, EXECUCAO, ALUNO, ATENDIMENTO, DOCUMENTO, TAREFA),
  `SanitizadorHtml` (jsoup: sem script/`on*`/imagens/estilo perigoso), `ServicoModeloDocumento`, `ServicoDocumentoGerado`
  (numeração por série/ano via `ServicoNumeracao`, duplicar, anexos `ANEXO_GERADOR`, `existeLigadoA`), `ControladorGerador` (`/api/gerador`).
  `ServicoEmpresa.excluir` bloqueia empresa ligada a documento gerado.
- O back guarda só texto/respostas; **a montagem do documento (substituição dos campos, cabeçalho, rodapé), a prévia e o PDF são do front**
  (`utils/gerador.ts` → `montarHtmlDocumento`), como no antigo.
- Front: `views/gerador/Gerador.tsx` (abas Documentos/Modelos; aceita `?documento=ID` e `?vinculoTipo=EMPRESA&vinculoId=ID`) +
  `components/apps/gerador/*` (`ListaDocumentosGerados`, `DetalheDocumentoGerado`, `DialogoEscolherModelo`, `FormularioGerador` com prévia
  ao vivo, vínculo, assinaturas, `ListaModelos`, `FormularioModelo`, `DialogoVisualizar`, `PaginaA4Previa`), `components/formularios/EditorRico`,
  `types/gerador.ts`, `servicos/gerador.ts`, `utils/gerador.ts`, `utils/geradorVinculos.ts`. A ficha da empresa ganhou "Gerar documento".
- **Infra:** `pom.xml` ganhou `jsoup` e `jackson-databind` (Jackson 2 — o Hibernate 7 precisa dele para mapear `jsonb`; sem ele o INSERT falha com 500).
- Verificado: back compila, empacota e sobe validando o schema num banco descartável; API testada ponta a ponta por curl (modelo com HTML
  perigoso sanitizado, modelo vazio recusado, modelo do sistema não editável, duplicar modelo, numeração 001/002/003 por série e ano, versão 2
  na edição, duplicar documento, vínculo incompleto recusado, limite de campo 5000, histórico, anexo de categoria errada recusado/certo aceito,
  excluir documento apagando o anexo, excluir empresa ligada recusado); front passa em `tsc`, `eslint` e `vite build`.
- Não testado: telas no navegador (o dono vai revisar) — principalmente o editor rico (`execCommand`), a prévia, o PDF e a impressão.

### Pronto (Módulo 7 — Pendências + Painel)
- Detalhe em **[melhorias/modulo-07-pendencias-painel.md](melhorias/modulo-07-pendencias-painel.md)**.
- Back `painel/`: só `GET /api/painel/extras` (atendimentos sem presença, alunos com 3+ faltas seguidas nos últimos 90 dias, pendências manuais de
  execução). A lógica ficou nos módulos donos: `ServicoAtendimento.semPresenca/alunosComFaltasSeguidas` (respeita o escopo do professor/profissional),
  `ServicoItensExecucao.pendenciasAbertas`. O resto (tarefas, documentos, agenda, recursos/etapas, atendimentos da semana) o front lê das APIs existentes.
- Front: `utils/pendencias.ts` (`montarPendencias`, regras do antigo), `servicos/painel.ts` + `hooks/useDadosPainel` (carrega só o que a permissão permite),
  `components/apps/pendencias/SecoesPendencias` (seções + ações Concluir/Renovar/Veio/Faltou/Feito/Família contatada/Resolvida, reutilizado no Painel),
  `views/pendencias/Pendencias.tsx`, `views/painel/Painel.tsx` + `components/apps/painel/BlocosPainel`.
- Verificado: back compila e sobe validando as consultas; front passa em `tsc`, `eslint` e `vite build`. Não testado no navegador. Adiado: contadores no menu lateral.

### Pronto (Módulo 8 — Histórico, Relatórios, Pesquisa geral)
- Detalhe em **[melhorias/modulo-08-historico-relatorios-pesquisa.md](melhorias/modulo-08-historico-relatorios-pesquisa.md)**.
- Back: `GET /api/historico?desde&ate` (`ServicoHistorico.doPeriodo`, 1.000 mais recentes), `relatorios/` (`GET /api/relatorios/atividades?de&ate&secoes`,
  `ServicoRelatorio`), `pesquisa/` (`GET /api/pesquisa?termo`, `ServicoPesquisa` com pontuação). Repositórios ganharam consultas próprias
  (`HistoricoRepositorio.doPeriodo/acoesSobre`, `DocumentoVersaoRepositorio.renovacoes`, `PagamentoRepositorio.doPeriodo`, `findByUnidadeId` em tarefa/evento/execução).
- Front: `views/historico`, `views/relatorios` (+ `utils/relatorioAtividades.ts`, PDF/impressão reaproveitando `documentoA4`/`impressaoPdf`), `views/pesquisa`
  (+ campo `layouts/.../header/BuscaGeral`), `utils/historico.ts`, `types/{pesquisa,relatorios}.ts`, `servicos/{historico,relatorios,pesquisa}.ts`.
  `Modulo.oculto` (routes/modulos.ts) = rota sem item no menu (Pesquisa).
- Decisões: sem "Limpar histórico" (auditoria imutável); backup removido; pesquisa não cobre cotações/ordens e mostra alunos/profissionais em vez de atendimentos.
- Verificado: back compila e sobe validando as consultas; front passa em `tsc`, `eslint`, `vite build`. Não testado no navegador.

### Próximo passo exato — Módulo 9: Vínculos entre registros (tabela `sistema.vinculo_registro`)
- Encaixar nos módulos 4–6 (documento, tarefa e execução: "Vincular a outros registros" que o formulário antigo tinha). Ler no `old/js` como o vínculo era
  gravado e exibido antes de desenhar; o Gerador já tem seus próprios vínculos (`TipoVinculo`) — não duplicar.
- Ao terminar: criar `melhorias/modulo-09-*.md` e atualizar HANDOFF e mapas.

### Próximos módulos (ordem aprovada)
1. ~~Base~~ → ~~Secretaria + Kanban~~ (prontos)
2. ~~Agenda~~ (pronto)
3. ~~Atendimentos~~ (pronto)
4. ~~Documentos + Empresas~~ (pronto)
5. ~~Projetos~~ (pronto) (recurso → execuções; financeiro, cotações ≥3 empresas, vencedora, ordem de compra, notas, pagamentos, pendências, checklist, relatório PDF)
6. ~~Gerador de documentos~~ (pronto) (modelos com {AUTO}/[MANUAL], numeração por série/ano, versões, vínculos, anexos, PDF)
7. ~~Pendências + Painel completo~~ (pronto)
8. ~~Histórico (tela), Relatórios (relatório de atividades em PDF), Pesquisa geral~~ (pronto)
9. **Vínculos entre registros** (tabela `sistema.vinculo_registro`) — encaixar nos módulos 4–6 ← próximo

## 5. Como rodar

```bash
# Banco (já feito na máquina do dono): psql -U postgres -d apae -f back/src/main/resources/db/apae.sql
cd back && mvnw.cmd spring-boot:run            # porta 8080 (Windows: mvnw.cmd; Linux: ./mvnw)
cd front && npm install && npm run dev         # porta 5173, proxy /api e /ws → 8080
```
Primeiro acesso: `admin` / `Apae@2026`. Para criar uma APAE municipal: Administração → Unidades → ⋮ na Nacional →
"Nova federação estadual"; depois ⋮ na estadual → "Nova APAE municipal". Em Usuários, a unidade aparece no campo "Unidade".

Recriar o banco do zero (apaga tudo!): `psql -U postgres -c "DROP DATABASE apae"` + criar + rodar o script.
Para testes sem sujar o `apae`, crie um banco descartável e rode o jar com
`--spring.datasource.url=jdbc:postgresql://localhost:5432/<banco> --server.port=8081`.

Chaves da AWS no Windows: `back/.env` (não versionado; modelo em `back/.env.exemplo`), importado pelo
`application.properties`. **Nunca** colocar chave em `properties`: o jar não pode levar segredo.

### Produção (BrasilCloud, 177.131.140.222) — publicado em 2026-09-30
- Acesso provisório: `http://177.131.140.222:8090` (nginx) → back em `127.0.0.1:8082`, perfil `prod`
  (`application-prod.properties`). Depois do DNS: `apae.chorobura.com.br` + certbot e fechar a 8090.
- Arquivos em `deploy/`: `instalar.sh` (idempotente), `apae-backend.service` (`-Xmx384m`, `MemoryMax=600M`),
  `nginx-apae.conf`. Front em `/opt/apae/front`, jar em `/opt/apae/back`, segredos em `/etc/apae/apae.env` (600):
  senha do banco e JWT gerados no servidor; `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY` preenchidos pelo dono.
- Banco `apae` com usuário `apae` próprio (PostgreSQL 16 — nada de `uuidv7()`).
- No servidor rodam também System Car (8080), GT06 (8081/5001) e sites do nginx: não mexer. Publicar de novo =
  gerar jar/`front/dist`, enviar para `/tmp/apae-deploy` e rodar `instalar.sh` (ele reinicia o serviço).
- Pastas no S3 (bucket `apae-chorobura`): `UF/municipio/logo/` e `UF/municipio/documentos/<categoria>/`
  (federações: `UF/federacao-estadual/`, `nacional/`). A pasta de cada categoria está em `CategoriaArquivo`.

## 6. Como implementar um módulo (receita)

Back (pacote `br.org.apae.secretaria.<modulo>`):
1. Limites novos em `comum/Limites.java` (e espelhar em `front/src/constantes/limites.ts`).
2. Entidade com `@Table(name=..., schema=...)`, estende `EntidadeAuditavel` (se a tabela tem `criado_em` e `atualizado_em`)
   ou `EntidadeBase`. `unidade_id` como `Long unidadeId`. Regras de negócio **na entidade** quando possível.
3. Repositório Spring Data. Buscas com texto opcional: passe `""` em vez de `null` (ver armadilhas).
4. Serviço: leitura com `contexto.unidadeLeitura()` / `contexto.exigirLeitura(unidadeDoRegistro)`;
   escrita com `contexto.unidadeEscrita()` / `contexto.exigirEscrita(unidadeDoRegistro)`;
   registrar `historico.registrar(ModuloHistorico.X, AcaoHistorico.Y, "descrição", "REF_TIPO", id)`;
   código legível com `numeracao.codigo("TAR", unidadeId)`; data de hoje com `relogio.hoje()`;
   arquivos com `servicoArquivo.buscarParaVincular(id)` / `servicoArquivo.excluir(id)`.
5. DTOs `record` com Bean Validation usando `Limites` (`@Size(max = Limites.X)`), `@Cpf`, `@Cnpj`, `@SenhaForte`.
6. Controlador `/api/<modulo>` com `@PreAuthorize(Permissoes.X_LER|X_ESCREVER)`.

Front:
1. `types/<modulo>.ts`, `servicos/<modulo>.ts` (usando `src/utils/axios`).
2. Tela em `views/<modulo>/`, envolvida por `<Pagina>` (título/subtítulo vêm de `routes/modulos.ts`).
3. Reaproveitar: `useConsulta`, `usePermissao` (`podeAlterar` esconde ações quando se consulta outra unidade),
   `TabelaResponsiva`, `MenuAcoes`, `DialogoFormulario` + `CampoFormik`, `useInteracao` (notificar/confirmar),
   `regras` do Yup (`utils/validacao.ts`), formatações (`utils/formatacao.ts`), componentes do template.
4. Ligar `tela: lazy(() => import(...))` no módulo em `routes/modulos.ts`.

## 7. Armadilhas já encontradas

- **Jackson 3 (Boot 4)** recusa `boolean` ausente no JSON → resolvido com
  `spring.jackson.deserialization.fail-on-null-for-primitives=false`. JSON inválido responde 400.
- **PostgreSQL + JPQL `:param is null`** falha ao inferir tipo → use `""` e `like concat('%', :busca, '%')`.
- **Violação de unicidade aborta a transação no PostgreSQL** → para "criar se não existe" use
  `insert ... on conflict do nothing` (ver `ConversaRepositorio.inserirSeNaoExistir`).
- **WebSocket:** o `SecurityContext` não existe nos `@MessageMapping` → não use `@PreAuthorize` neles; a permissão
  é checada no CONNECT (`ConfiguracaoWebSocket`) e o usuário vem do `Principal`.
- **Colunas `CHAR(n)`** mapeiam com `columnDefinition = "bpchar(n)"` (ex.: `uf`, `token_hash`).
- **Arquivos do basefront usam CRLF**: regex de edição precisa aceitar `\r?\n`.
- **Tema do template**: `Components.tsx` substituía `theme.components` e apagava o locale pt-BR → hoje mescla.
- **Hash BCrypt** para seeds: gere com `spring-security-crypto` + `spring-jcl` do `~/.m2` (ver histórico do handoff) ou pela API.
- O lint do front acusa `any` só nos arquivos copiados do template (mantidos idênticos de propósito).
- Maven não está no PATH da máquina: use sempre o wrapper `back/mvnw.cmd` (baixa o Maven sozinho).
- **Datas em `@RequestParam`**: anote `@DateTimeFormat(iso = ISO.DATE)` (ex.: `GET /agenda?inicio&fim`).
- **Seleção com opção vazia** (`valor: ''`): o `CampoFormik` já liga `displayEmpty`; sem isso o MUI mostra o campo em branco.
- **`@AssertTrue` em record**: o erro chega no front com o nome do método (ex.: `horarioFimValido`), não do campo —
  aparece no alerta do topo do formulário. Valide o mesmo no Yup para o erro sair no campo certo.
- **Reatribuir uma coluna imutável em massa** (ex.: mesclar cadastros): `@ManyToOne` sem `updatable=false` não ajuda
  porque a entidade nunca muda a própria referência sozinha — use `@Modifying @Query("update X set x.rel.id = :novo
  where x.rel.id = :velho")` (ver `AtendimentoRepositorio.reatribuirAluno/reatribuirProfissional`).
- **`html2pdf.js`** tem `types` no `package.json` (não precisa de `@types`), mas a interface de opções não inclui
  `pagebreak` — use `as never`/`as any` no `.set({...})` para essa chave. Importe com `await import('html2pdf.js')`
  dentro da função que gera o PDF: assim ele vira um chunk separado e não pesa no carregamento inicial (~1 MB minificado).
- **Cargo sem tabela Java**: `Cargo` é uma entidade do banco (`codigo` é `String`), não um enum — para checar um cargo
  específico (ex.: professor/profissional) compare `usuario().cargoCodigo()` com a string do `codigo` (só
  `ADMINISTRADOR_SISTEMA` tem uma constante em `Cargo.java`).
- **Spring Data com parâmetro `null`** em método derivado (`findByUnidadeIdAndCnpj(id, null)`) gera `cnpj IS NULL` e acha
  qualquer registro sem o campo — teste o `null` antes de consultar (ver `ServicoEmpresa.mesmaEmpresa`).
- **Spring Data não acha repositório aninhado** (interface dentro de outra classe): `considerNestedRepositories` é `false`
  por padrão — um repositório por arquivo.
- **`@Modifying` em massa + entidade já carregada**: o `update` vai ao banco, mas a entidade na sessão continua com o valor
  antigo e volta assim na resposta. Prefira alterar pelas entidades (e `flush` quando um índice único exige a ordem).
- **Acentos no `curl` do Git Bash** saem fora de UTF-8 e o back responde 400 "formato inválido": teste a API com textos sem
  acento (ou pelo navegador).
- **Heredoc com aspas no Git Bash** às vezes quebra ("unexpected EOF"): para editar arquivos com script, grave o `.py` no
  scratchpad e execute.
- **Chamada a serviço de fora** (ex.: CNPJá): use `fetch` puro, nunca o `api` de `utils/axios` (ele manda o JWT e o
  `X-Unidade`).

- **Hibernate 7 + `jsonb`**: precisa de Jackson 2 (`com.fasterxml.jackson.core:jackson-databind`) no classpath, mesmo com Spring Boot 4/Jackson 3;
  sem isso o INSERT dá "Could not find a FormatMapper for the JSON format". Colunas `jsonb` mapeiam com `@JdbcTypeCode(SqlTypes.JSON)` + `columnDefinition = "jsonb"`.
- **`execCommand`** (editor rico) é "obsoleto", mas funciona em todos os navegadores; botões da barra usam `onMouseDown preventDefault` para não perder a seleção.
- **Parar o back de teste no Windows**: `pkill` não existe; use `Get-CimInstance Win32_Process` (PowerShell) filtrando pela linha de comando e `Stop-Process` —
  com o jar rodando o `mvnw package` falha ao renomear o `.jar`.

## 8. Pendências conhecidas (fora dos módulos)
- Upload real para o S3 não testado (bucket `apae-chorobura` criado; falta o dono preencher as chaves no servidor).
- Token de renovação fica no `localStorage` (alternativa mais segura: cookie httpOnly — perguntar ao dono).
- Arquivos enviados e nunca ligados a registro ficam órfãos (prever rotina de limpeza).
- `application-prod.properties` ainda não existe (decisão do dono: depois).
- Os PDFs do antigo são gerados com **html2pdf** (`old/js/vendor/html2pdf.bundle.min.js`, usado em
  `old/js/17-gerador-documentos.js`). O Módulo 3 já instalou `html2pdf.js` via npm e criou `utils/documentoA4.ts` +
  `utils/impressaoPdf.ts` reaproveitáveis pelos Módulos 5, 6 e 8. A Agenda continua só com `window.print()`.
- Deixados para os módulos seguintes: os vínculos da tarefa, do documento e da execução (item 9, tabela `sistema.vinculo_registro`).
- Agenda: o filtro de fontes por permissão (professor/profissional veem eventos, não tarefas) está no `ServicoAgenda`,
  mas não foi testado com um usuário desses cargos. O aviso de 30 min, como no antigo, também avisa (uma vez no dia) um
  evento de hoje que já começou — confirmar com o dono se deve avisar só os que ainda vão começar.
- Atendimentos: o logo institucional no cabeçalho do PDF/impressão depende do upload real no S3 (pendência acima) —
  sem ele, sai só o texto (nome/endereço/contato). Testado com o cabeçalho sem logo.
- Atendimentos: "Cadastros de apoio" (Aluno/Profissional) não têm tela própria fora do diálogo "Alunos e profissionais";
  se crescer (relatório só de cadastros, por exemplo) considerar uma tela dedicada.
- Nenhum teste automatizado foi escrito (pedido do dono). Também não houve teste manual no navegador das telas dos
  Módulos 1 a 6: o dono ainda vai revisar (as APIs dos Módulos 3, 4 e 5 foram testadas ponta a ponta por curl, sem navegador).
- Documentos: a seção "Vincular a outros registros" do formulário antigo fica para o item 9 (vínculos entre registros).
- `back/erro-backend.txt` (no stage do git) é só um log de "porta 8080 já em uso" — não é bug; pode ser apagado.

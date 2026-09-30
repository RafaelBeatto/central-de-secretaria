# Mapa de código

## Visão geral

```
central-de-secretaria/
├── back/        API Java 21 · Spring Boot 4.0.7 · Maven (jar)
├── front/       React 18 · TypeScript · MUI 5 · Redux Toolkit · Vite
├── docs/        esta documentação
├── old/         sistema antigo — SÓ LEITURA (especificação funcional)
└── basefront/   template Modernize — SÓ LEITURA (fonte dos componentes visuais)
```

Fluxo de uma requisição: tela React → `servicos/<modulo>.ts` → `utils/axios.ts` (JWT, `X-Unidade`, `X-Fuso-Horario`,
renovação automática) → `/api/...` (proxy do Vite em dev) → Controlador (`@PreAuthorize`) → Serviço (escopo da
unidade + regras + histórico) → Repositório/Entidade (JPA) → PostgreSQL. Arquivos: `ServicoArquivo` → S3.
Chat: `@stomp/stompjs` → `/ws` → `ControladorChatWebSocket` → `ServicoChat` → `/user/queue/chat`.

---

## Back — `back/src/main/java/br/org/apae/secretaria/`

| Pacote / arquivo | Responsabilidade |
|---|---|
| `CentralSecretariaAplicacao` | `main`; `Locale` pt-BR (mensagens de validação); cache habilitado |
| **configuracao/** | |
| `PropriedadesAplicacao` | propriedades `aplicacao.*` (jwt, cors, armazenamento, fuso padrão) |
| `ConfiguracaoSeguranca` | filtro stateless, rotas públicas, JWT HS256 (encoder/decoder), CORS, BCrypt |
| `ConfiguracaoWebSocket` | STOMP em `/ws`; autentica no CONNECT; só assina `/user/queue/**` |
| `ConfiguracaoS3` | `S3Client` e `S3Presigner` (endpoint opcional p/ MinIO) |
| **comum/** | reaproveitado por todos os módulos |
| `Limites` | tamanho máximo de cada coluna texto (espelho do SQL e do front) |
| `Textos` | `limpo()` (trim, vazio→null), `busca()` (null→""), `maiusculo()` |
| `Transacoes` | `aposConfirmar()` / `aoDesfazer()` (eventos WS, limpeza S3) |
| `Relogio` | `hoje()` no fuso do navegador (`X-Fuso-Horario`) |
| `entidade/EntidadeBase`, `EntidadeAuditavel` | id IDENTITY, equals por id; `criado_em`/`atualizado_em` automáticos |
| `dominio/Prioridade`, `Frequencia`, `Recorrencia` | enums compartilhados e cálculo de datas repetidas (`proximaDepoisDe` das rotinas, `datasDaSerie` das séries) |
| `excecao/*` | `RegraNegocioExcecao`(422), `NaoEncontradoExcecao`(404), `AcessoNegadoExcecao`(403) |
| `validacao/*` | `@Cpf`, `@Cnpj`, `@SenhaForte`, `DocumentoFiscal` (dígitos e formatação) |
| `web/TratadorGlobalExcecoes` | ProblemDetail pt-BR; `campos` = erros por campo |
| `web/Pagina` | formato estável de paginação `{itens, pagina, tamanho, total, totalPaginas}` |
| **seguranca/** | |
| `UsuarioAutenticado` | usuário da requisição (Principal, nome = id); `alcanca(caminho)` |
| `ServicoUsuarioAutenticado` | carrega usuário + permissões efetivas; **cache** `usuarios-autenticados` (`esquecer`, `esquecerTodos`) |
| `ConversorJwtAutenticacao` | JWT → autenticação; quem deve trocar senha fica sem authorities |
| `ServicoToken` | emite JWT de acesso; gera token de renovação (guarda SHA-256) |
| `ContextoSeguranca` | **escopo por unidade**: `unidadeLeitura()`, `unidadeEscrita()`, `exigirLeitura()`, `exigirEscrita()` |
| **acesso/** | |
| `autenticacao/` | entrar, renovar (rotação + reuso derruba sessões), sair, eu, trocar senha |
| `unidade/` | árvore visível, unidade atual (cabeçalho dos PDFs), criar/editar subordinada, dados institucionais |
| `usuario/` | listar/detalhar/criar/editar/ativar/redefinir senha; `podeGerenciar()` = regra da hierarquia |
| `cargo/` | cargos fixos (seed) |
| `permissao/` | `Permissoes` (constantes p/ `@PreAuthorize`), matriz por unidade, ajuste e restauração |
| **sistema/** | |
| `arquivo/` | upload S3 (tipos por `CategoriaArquivo`, limite de MB), URL assinada, exclusão pós-commit |
| `historico/` | `ServicoHistorico.registrar(...)` (mesma transação), enums `ModuloHistorico`, `AcaoHistorico` |
| `numeracao/ServicoNumeracao` | `codigo("TAR", unidade)` → `TAR-0001`; `numeroDoAno("Ofício", unidade, ano)` → `001/2026` (upsert atômico) |
| **chat/** | `ServicoChat` (regras), `ControladorChat` (REST), `ControladorChatWebSocket` (STOMP) |
| `comum/Relogio`, `comum/Datas` | "hoje" no fuso do navegador (`X-Fuso-Horario`); datas dd/MM/aaaa nas mensagens |
| **tarefas/** | `Tarefa` (regras de rotina na entidade), `Subtarefa`, `StatusTarefa`, `ServicoTarefa`, `ControladorTarefa` |
| **agenda/** | `Evento` (regras na entidade), `EventoSerie`, `TipoEvento`, `EscopoSerie`, `ServicoEvento` (CRUD com série), `ServicoAgenda` (itens do período), `ControladorAgenda` |
| `agenda/fontes/` | `FonteAgenda` (interface: permissão + itens do período), `FonteEventos`, `FonteTarefas` — documentos e projetos entram como novas fontes |
| **atendimentos/** | `Aluno`, `Profissional` (cadastros de apoio; `Profissional.usuarioId` liga ao usuário professor/profissional), `Atendimento` (regras na entidade: `marcarPresenca`, `remarcarPara`, `desfazerRemarcacao`, `desligarDoOriginal`; série semanal = `serieId` UUID sem tabela própria), `Presenca`, `MotivoFalta`, `ServicoAtendimento` (CRUD, presença, série, remarcação, cópia da semana), `ServicoCadastroAtendimento` (renomear/mesclar/excluir aluno e profissional, contato família, `meuProfissional` do usuário vinculado), `ControladorAtendimento` |

`back/src/main/resources/`: `application.properties` (local) · `db/apae.sql` (schema único + seeds).

### Rotas da API (todas sob `/api`)

| Método e rota | Permissão | Observação |
|---|---|---|
| `POST /autenticacao/entrar` · `/renovar` · `/sair` | pública | |
| `GET /autenticacao/eu` · `PUT /autenticacao/senha` | logado | |
| `GET /unidades/arvore` · `GET /unidades/atual` | logado | árvore p/ seletor; unidade em consulta |
| `GET /unidades/{id}` | UNIDADE_LER | |
| `POST /unidades` · `PUT /unidades/{id}` | UNIDADE_ESCREVER | só subordinadas |
| `PUT /unidades/minha/dados-institucionais` | INSTITUICAO_ESCREVER | cabeçalho/rodapé/logo |
| `GET /usuarios?busca&page&size` · `GET /usuarios/{id}` | USUARIO_LER | |
| `GET /usuarios/cargos-atribuiveis?unidadeId` | USUARIO_ESCREVER | |
| `POST /usuarios` · `PUT /usuarios/{id}` · `PATCH /usuarios/{id}/situacao` · `PUT /usuarios/{id}/senha` | USUARIO_ESCREVER | |
| `GET /permissoes` | PERMISSAO_LER | matriz da unidade em consulta |
| `PUT /permissoes/cargos/{cargoId}` · `DELETE /permissoes/cargos/{cargoId}` | PERMISSAO_ESCREVER | ajustar / restaurar padrão |
| `POST /arquivos` (multipart `arquivo`,`categoria`) · `GET /arquivos/{id}` · `GET /arquivos/{id}/url` | logado | escopo pela unidade do arquivo |
| `GET /chat/contatos` · `GET /chat/conversas` · `POST /chat/conversas/com/{usuarioId}` | CHAT_USAR | |
| `GET /chat/conversas/{id}/mensagens?antesDeId` · `POST /chat/mensagens` · `POST /chat/conversas/{id}/lidas` | CHAT_USAR | |
| WS `/ws` → `SEND /app/chat.enviar` `{conversaId,texto}` · `/app/chat.lidas` · `SUBSCRIBE /user/queue/chat`, `/user/queue/erros` | CHAT_USAR (no CONNECT) | |

**Tarefas** (leitura TAREFA_LER, alteração TAREFA_ESCREVER): `GET /tarefas?concluidasDesde` · `GET /tarefas/encerradas?limite` · `GET /tarefas/{id}` ·
`GET /tarefas/{id}/historico` · `GET /tarefas/sugestoes` · `POST /tarefas` · `POST /tarefas/rapida` · `PUT /tarefas/{id}` ·
`DELETE /tarefas/{id}` · `POST /tarefas/{id}/concluir` · `POST /tarefas/{id}/reabrir` · `PATCH /tarefas/{id}/status` ·
`PATCH /tarefas/{id}/prioridade` · `PATCH /tarefas/{id}/data` · `POST|PATCH|DELETE /tarefas/{id}/subtarefas[/{sid}]`.

**Agenda** (leitura AGENDA_LER, alteração AGENDA_ESCREVER): `GET /agenda?inicio&fim` (itens de todas as fontes que o usuário lê, até 100 dias) ·
`GET /agenda/eventos/{id}` (com posição na série, total, última data e "restantes") · `GET /agenda/eventos/{id}/historico` ·
`POST /agenda/eventos` · `PUT /agenda/eventos/{id}` (`escopo` SO_ESTA|ESTA_E_PROXIMAS numa série; `frequencia`+`repetirAte` num evento solto) ·
`DELETE /agenda/eventos/{id}?escopo=SO_ESTA|ESTA_E_PROXIMAS|TODAS` (devolve quantas datas saíram) · `POST /agenda/eventos/{id}/concluir` ·
`POST /agenda/eventos/{id}/reabrir` · `PATCH /agenda/eventos/{id}/data`.

**Atendimentos** (leitura ATENDIMENTO_LER, alteração ATENDIMENTO_ESCREVER; professor/profissional só veem e criam os próprios):
`GET /atendimentos?inicio&fim` · `GET /atendimentos/{id}` · `GET /atendimentos/{id}/historico` · `POST /atendimentos` (avulso ou semanal) ·
`POST /atendimentos/lote` (várias linhas de uma vez, incompletas são ignoradas) · `POST /atendimentos/copiar-semana?segunda=` ·
`PATCH /atendimentos/{id}/presenca` · `POST /atendimentos/{id}/remarcar` · `DELETE /atendimentos/{id}` · `POST /atendimentos/{id}/encerrar-serie` ·
`GET|PUT|DELETE /atendimentos/alunos[/{id}]` · `POST /atendimentos/alunos/{id}/mesclar` · `POST /atendimentos/alunos/{id}/contato-familia` ·
`GET /atendimentos/alunos/{id}/historico` (sem período — filtro de data é no front) · os mesmos 4 últimos para `/atendimentos/profissionais`.

### Banco — schemas e tabelas (`apae.sql`)

| Schema | Tabelas |
|---|---|
| `acesso` | unidade, cargo, permissao, cargo_permissao, unidade_cargo_permissao, usuario, token_renovacao |
| `sistema` | arquivo, historico, numeracao, vinculo_registro |
| `chat` | conversa, mensagem |
| `secretaria` | tarefa, subtarefa |
| `agenda` | evento_serie, evento |
| `documentos` | documento, documento_versao |
| `empresas` | empresa, empresa_documento |
| `projetos` | recurso, recurso_documento, execucao, movimentacao_recurso, execucao_empresa, cotacao, cotacao_item, ordem_compra, execucao_documento, pagamento, execucao_pendencia |
| `gerador` | modelo_documento (unidade NULL = modelo do sistema), documento_gerado (JSONB valores/contexto/assinaturas), documento_gerado_versao, documento_gerado_anexo |
| `atendimentos` | aluno, profissional, atendimento |

Enums gravados como texto em MAIÚSCULAS (ex.: `EM_ANDAMENTO`); o front traduz para rótulos.

---

## Front — `front/src/`

| Pasta / arquivo | Responsabilidade | Origem |
|---|---|---|
| `main.tsx`, `App.tsx` | Redux + Router + tema + `ProvedorInteracao`; liga `sessao.aoMudar` e `iniciarSessao` | template adaptado |
| `routes/modulos.ts` | **fonte única** de módulos (caminho, título, subtítulo, ícone, grupo, permissão, tela) | novo |
| `routes/Router.tsx`, `Guardas.tsx` | rotas geradas dos módulos; `RotaAutenticada`, `RotaPublica`, `RotaPermissao` | novo |
| `utils/axios.ts` | cliente HTTP único; objeto `sessao`; renovação single-flight; `tokenValidoParaWebSocket` | template reescrito |
| `utils/erroApi.ts` | `ErroApi` (status, mensagem, campos) a partir do ProblemDetail | novo |
| `utils/validacao.ts` | `regras` Yup (texto, obrigatorio, email, telefone, cpf, cnpj, uf, senha, login, dataPassada) | novo |
| `utils/formatacao.ts` | datas pt-BR, iniciais, máscaras CPF/CNPJ/telefone | novo |
| `constantes/limites.ts`, `permissoes.ts` | espelho dos limites do banco e códigos de permissão | novo |
| `types/*.ts` | tipos dos DTOs do back | novo |
| `servicos/*.ts` | uma função por rota da API; `chatSocket.ts` (STOMP) | novo |
| `store/Store.tsx` | `customizer`, `autenticacao`, `chat` | template adaptado |
| `store/customizer/CustomizerSlice.tsx` | tema claro/escuro e menu recolhido (persistidos) | template adaptado |
| `store/autenticacao/AutenticacaoSlice.ts` | usuário, árvore de unidades, unidade em consulta | novo |
| `store/apps/chat/ChatSlice.ts` | conversas, mensagens, eventos em tempo real, envio WS→REST | template reescrito |
| `hooks/usePermissao.ts` | `tem(p)`, `podeAlterar(p)`, `somenteLeitura` | novo |
| `hooks/useConsulta.ts` | carregar dados com loading/erro; recarrega ao trocar a unidade | novo |
| `hooks/useChatTempoReal.ts` | conecta o chat no layout | novo |
| `components/container/Pagina.tsx` | moldura de toda tela (título, subtítulo, aviso somente leitura) | novo |
| `components/compartilhados/` | `ProvedorInteracao` (notificar/confirmar), `TabelaResponsiva`, `MenuAcoes`, `AvisoSomenteLeitura` | novo |
| `components/formularios/` | `CampoFormik` (limite/contador/máscara/seleção), `DialogoFormulario` (tela cheia no celular, erros do back por campo) | novo |
| `components/apps/chats/` | `ChatPainel`, `ChatSidebar`, `ChatListing`, `ChatContent`, `ChatMsgSent` | template adaptado |
| `components/shared/`, `forms/theme-elements/`, `custom-scroll/`, `container/PageContainer` | cards, campos, scrollbar | **cópia fiel do template** |
| `layouts/full/` | `FullLayout`, `vertical/sidebar/*` (menu por permissão), `vertical/header/*` (seletor de unidade, aviso de chat, tema, perfil), `shared/logo` (logo APAE) | template adaptado |
| `layouts/blank/`, `shared/loadable`, `shared/breadcrumb`, `theme/*`, `views/spinner` | | **cópia fiel do template** (tema: locale pt-BR) |
| `views/autenticacao/` | `Entrar`, `TrocarSenha`, `LayoutAutenticacao` | template adaptado |
| `views/painel/Painel.tsx` | saudação + chat (resto do painel no Módulo 7) | novo |
| `views/administracao/` | `usuarios/`, `unidades/`, `permissoes/`, `instituicao/` | novo |
| `views/secretaria/Secretaria.tsx`, `components/apps/secretaria/*` | barra rápida, lista agrupada, detalhe, checklist, formulário | novo |
| `views/kanban/Kanban.tsx`, `components/apps/kanban/*` | colunas por situação, arrastar (react-beautiful-dnd) | estrutura do template |
| `hooks/useAcoesTarefa.ts`, `utils/tarefas.ts`, `utils/datas.ts`, `types/comum.ts`, `types/tarefas.ts`, `servicos/tarefas.ts` | ações e regras de exibição de tarefas; datas locais; prioridade/frequência | novo |
| `components/compartilhados/HistoricoDoRegistro.tsx` | "Histórico" no fim de qualquer painel de detalhe | novo |
| `views/agenda/Agenda.tsx`, `components/apps/agenda/*` | Semana/Mês/Lista, painel do dia/item, formulário com série, diálogos de excluir e mover, arrastar (HTML5), impressão | novo |
| `types/agenda.ts`, `servicos/agenda.ts`, `utils/agenda.ts` | itens e eventos; período/título/busca/agrupamento da agenda | novo |
| `hooks/useAvisoAgenda.ts` | aviso 30 min antes dos eventos de hoje (montado no `FullLayout`) | novo |
| `views/atendimentos/Atendimentos.tsx`, `components/apps/atendimentos/*` | faixa da semana (`FaixaDias`), lista com presença em um clique (`LinhaAtendimento`), painel do atendimento/aluno/profissional, formulário (individual/lote), diálogos de remarcar/justificar falta/gestão de cadastros/lista de presença/relatório | novo |
| `types/atendimentos.ts`, `servicos/atendimentos.ts`, `utils/atendimentos.ts` | resumo da semana, faltas seguidas (cálculo no front a partir do histórico já carregado), agrupamento por dia | novo |
| `utils/documentoA4.ts`, `utils/impressaoPdf.ts` | folha A4 com cabeçalho institucional + `imprimir`/`salvarPdf` (`html2pdf.js`, import dinâmico); reaproveitável pelos Módulos 5/6/8 | novo |
| `views/EmConstrucao.tsx`, `views/erro/Erro.tsx` | módulos não migrados; 403/404 | novo / template |

Assets: `assets/images/logos/logo-apae.png` (extraído do base64 do sistema antigo), fundos do template.

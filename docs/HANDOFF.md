# HANDOFF — continuar a migração da Central da Secretaria

> Atualizado em: 2026-09-30 · Concluído: **Base + Módulo 1 (Secretaria + Kanban) + Módulo 2 (Agenda)** · Próximo: **Módulo 3 — Atendimentos**
> (o desenho do Módulo 3 **ainda não foi feito** — comece lendo `old/js/19-atendimentos.js` e o MAPA_DE_USABILIDADE §4.4)
>
> **Para a IA que vai continuar:** leia este arquivo inteiro, depois `MAPA_DE_CODIGO.md` (onde está cada coisa) e
> `MAPA_DE_USABILIDADE.md` §4 (regras de cada módulo). Siga a seção 4 "Próximo passo exato" e, ao terminar cada módulo,
> atualize este arquivo e os dois mapas.

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

### Próximo passo exato — Módulo 3: Atendimentos (espec: MAPA_DE_USABILIDADE §4.4 · fonte: `old/js/19-atendimentos.js`)
- Ler o antigo inteiro e desenhar como foi feito para a Agenda (entidades com regras, serviço, rotas, telas).
- As tabelas `atendimentos.aluno`, `atendimentos.profissional` e `atendimentos.atendimento` **já existem** no `apae.sql`.
- Reaproveitar: `Recorrencia.datasDaSerie` (série semanal, máx. 52), `EscopoSerie`/diálogo de escopo da Agenda se couber,
  `utils/datas.ts`, `DialogoFormulario`/`CampoFormik`, `useConsulta`, `usePermissao`.
- PDFs (lista de presença e relatório): decidir a biblioteca antes (ver §8 — html2pdf).

### Próximos módulos (ordem aprovada)
1. ~~Base~~ → ~~Secretaria + Kanban~~ (prontos)
2. ~~Agenda~~ (pronto)
3. **Atendimentos** ← próximo (alunos, profissionais, presença, remarcação, série semanal, faltas seguidas, lista de presença e relatório em PDF)
4. Documentos (validade, renovação com versões) + Empresas (cadastro único, documentos da empresa, consulta CNPJ)
5. Projetos (recurso → execuções; financeiro, cotações ≥3 empresas, vencedora, ordem de compra, notas, pagamentos, pendências, checklist, relatório PDF)
6. Gerador de documentos (modelos com {AUTO}/[MANUAL], numeração por série/ano, versões, vínculos, anexos, PDF)
7. Pendências + Painel completo ("para resolver", hoje/7 dias, projetos)
8. Histórico (tela), Relatórios (relatório de atividades em PDF), Pesquisa geral
9. Vínculos entre registros (tabela `sistema.vinculo_registro`) — encaixar nos módulos 4–6

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

## 8. Pendências conhecidas (fora dos módulos)
- Upload real para o S3 não testado (faltam credenciais/bucket; variáveis no README raiz).
- Token de renovação fica no `localStorage` (alternativa mais segura: cookie httpOnly — perguntar ao dono).
- Arquivos enviados e nunca ligados a registro ficam órfãos (prever rotina de limpeza).
- `application-prod.properties` ainda não existe (decisão do dono: depois).
- Os PDFs do antigo são gerados com **html2pdf** (`old/js/vendor/html2pdf.bundle.min.js`, usado em
  `old/js/17-gerador-documentos.js`). Para os PDFs dos Módulos 3, 5, 6 e 8, avaliar `html2pdf.js` via npm no front,
  com o cabeçalho vindo de "Dados da instituição". A Agenda usa só `window.print()`.
- Deixados para os módulos seguintes: o quadro "Execuções de projeto" no Kanban (Módulo 5) e os vínculos da tarefa
  (Módulos 4/5).
- Agenda: o filtro de fontes por permissão (professor/profissional veem eventos, não tarefas) está no `ServicoAgenda`,
  mas não foi testado com um usuário desses cargos. O aviso de 30 min, como no antigo, também avisa (uma vez no dia) um
  evento de hoje que já começou — confirmar com o dono se deve avisar só os que ainda vão começar.
- Nenhum teste automatizado foi escrito (pedido do dono). Também não houve teste manual no navegador das telas do
  Módulo 1: o dono ainda vai revisar.

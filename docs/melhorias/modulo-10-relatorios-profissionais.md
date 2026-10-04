# Módulo 10 — Relatórios de professores e profissionais

Módulo **novo** (não existe no `old/`). O professor/profissional produz o relatório fora do sistema, gera o PDF e o envia; o sistema **só arquiva** o PDF.
Não há editor, geração automática, periodicidade nem fluxo de aprovação/revisão.

## Fluxo
1. Professor/profissional abre **Meus Relatórios** → **Enviar relatório** → informa o **nome do relatório**, o **tipo** (**Pessoal** vem sugerido; ao escolher Pessoal aparece o campo **Nome do aluno**, obrigatório; **Geral** não pede aluno), um **complemento** opcional explicando do que se trata, o período (de/até, **opcional**) e escolhe o PDF. Sem "de", vale a **data de hoje**; sem "até", vale o "de".
2. O PDF vai para `/api/arquivos` (categoria `RELATORIO_PROFISSIONAL`, só `.pdf`); em seguida `POST /api/relatorios-profissionais` registra o relatório (status **Entregue**).
3. **Meus Relatórios** lista o que ele enviou por ano → mês (pelo início do período); clicar abre o PDF, o botão ao lado baixa.
3b. **Cobrança**: na Central, **Cobrar relatório** (nome, tipo/aluno, complemento) cria o relatório como **Pendente** para o profissional. Ele aparece no topo de **Meus Relatórios** com o botão **Enviar PDF** (período opcional); ao enviar vira **Entregue**.
4. Quem tem acesso à **Central de Relatórios** vê professores/profissionais da unidade com o total de relatórios, filtra (busca, ano, período, status), escolhe um e abre/baixa os PDFs.

## Permissões (usa a matriz existente; duas permissões novas, módulo `RELATORIOS`)
| Permissão | Padrão | Para quê |
|---|---|---|
| `RELATORIO_PROF_ENVIAR` | Professor, Profissional | Enviar os próprios relatórios e ver os que enviou (menu **Meus Relatórios**) |
| `RELATORIO_PROF_LER` | Presidente, Diretor | **Central de Relatórios** (menu **Consultar**) |
| `RELATORIO_PROF_COBRAR` | Presidente, Diretor | **Cobrar relatório** na Central (só na própria unidade; de professor/profissional ativo) |

Administrador, Secretário e Tesoureiro **não** entram na Central por padrão; a tela Permissões libera por unidade. `RELATORIO_LER` (relatório de atividades) não foi reaproveitada de propósito.
Escopo de unidade igual ao resto: a Central lê a unidade consultada (a própria ou subordinada, cabeçalho `X-Unidade`); enviar é só na própria unidade.

## Banco (`apae.sql`, seção 12)
Schema `relatorios`, tabela `relatorio_profissional`: `unidade_id`, `usuario_id`, `nome_usuario` e `cargo_nome` (retrato do momento do envio), `nome` (do relatório), `tipo` (`PESSOAL`|`GERAL`), `nome_aluno` (texto livre, só no pessoal), `periodo_inicio`, `periodo_fim`,
`complemento`, `arquivo_id` → `sistema.arquivo`, `status` (`PENDENTE`|`ENTREGUE`), `solicitado_por_id`/`solicitado_em` (cobrança), `enviado_em` (nulo enquanto Pendente). Checks: pessoal exige `nome_aluno`; fim ≥ início; só `PENDENTE` pode ficar sem arquivo.
Permissões 25, 26 e 27 + matriz padrão no mesmo script.

## Back (`relatorios/profissional/`)
`RelatorioProfissional`, `StatusRelatorio`, `TipoRelatorio`, `RelatorioProfissionalRepositorio` (consultas da Central com filtros sem `null`), `ServicoRelatorioProfissional`,
`ControladorRelatorioProfissional`, `dto/`. Histórico: módulo `RELATORIOS`, ref `RELATORIO_PROFISSIONAL`.

| Rota (`/api/relatorios-profissionais`) | Permissão |
|---|---|
| `GET /meus` · `POST` (`{nome, tipo, nomeAluno, complemento, periodoInicio?, periodoFim?, arquivoId}`) · `POST /{id}/entregar` (`{periodoInicio?, periodoFim?, arquivoId}`, só o dono e só se Pendente) | `RELATORIO_PROF_ENVIAR` |
| `POST /central/profissionais/{usuarioId}/cobrar` (`{nome, tipo, nomeAluno, complemento}`) | `RELATORIO_PROF_COBRAR` |
| `GET /central/profissionais?busca&ano&de&ate&status` | `RELATORIO_PROF_LER` |
| `GET /central/profissionais/{usuarioId}?ano&de&ate&status` | `RELATORIO_PROF_LER` |
| `GET /{id}/url` (link temporário do PDF) | autor **ou** `RELATORIO_PROF_LER` na unidade do relatório |

## Segurança
- **Arquivo restrito.** `CategoriaArquivo.RELATORIO_PROFISSIONAL` é `restrita()`: as rotas genéricas `/api/arquivos/{id}` e `/{id}/url` respondem 404 para ela
  (ali basta ser da unidade, e um professor abriria o PDF de outro trocando o id). O PDF só abre por `/api/relatorios-profissionais/{id}/url`, depois de conferir autor ou Central
  (`ServicoArquivo.urlTemporariaAutorizada`). Enviar arquivo dessa categoria exige `RELATORIO_PROF_ENVIAR`.
- Ao registrar, o arquivo precisa ter sido enviado **pelo próprio usuário** e não estar em outro relatório. A resposta da API não traz o id do arquivo.
- Relatório fora do alcance (outro autor sem Central, ou outra unidade) responde 404, não 403.

## Front
- Rotas: `/meus-relatorios` (grupo Dia a dia) e `/central-relatorios` (grupo Consultar), definidas em `routes/modulos.ts`.
- `views/relatoriosProfissionais/MeusRelatorios.tsx`, `CentralRelatorios.tsx` (lista de profissionais + painel ao lado, no celular o painel substitui a lista);
  `components/apps/relatoriosProfissionais/ListaRelatorios` (ano → mês, abrir/baixar) e `DialogoEnviarRelatorio`;
  `types/relatoriosProfissionais.ts`, `servicos/relatoriosProfissionais.ts`, `utils/relatoriosProfissionais.ts`.
- Componentes novos: `CamposRelatorio` (nome, tipo, aluno, complemento — usado no envio e na cobrança) e `DialogoCobrarRelatorio`; `DialogoEnviarRelatorio` também atende cobranças (`pendente`).
- `CampoArquivoFormik` ganhou `aceita` (extensões) e `restrito` (mostra o nome sem link); `ACEITA.pdf`; `utils/historico.ts` ganhou o rótulo `RELATORIOS`.

## Decisões e pendências
- **Tipos**: só **Pessoal** (de um aluno) e **Geral**; Geral foi a opção neutra que faltava para o Pessoal ter par — acrescentar outros tipos é incluir no enum, no `CHECK` e em `ROTULO_TIPO_RELATORIO`. O nome do aluno é texto livre (não liga ao cadastro de alunos de Atendimentos).
- **Período livre** (início e fim): não existe periodicidade definida; a Central agrupa por ano/mês do início.
- **Status `PENDENTE`** agora nasce da **cobrança** feita na Central (não há periodicidade nem cobrança automática). Na Central, o chip mostra "N relatórios" (entregues) e "N pendentes". O período de uma cobrança só é definido na entrega.
- Não há aviso ao profissional além de a cobrança aparecer em Meus Relatórios (sem notificação/selo no menu ainda); também não há cancelar cobrança.
- Sem excluir/editar relatório enviado (não definido). Se o PDF for enviado errado, só pelo banco por enquanto.
- Baixar usa link com `download`; com S3 em outro domínio o navegador pode abrir o leitor de PDF (que também baixa).

## Verificação
Back testado ponta a ponta por curl num banco descartável (upload, validações, autor × outro profissional, Central por cargo, filtros, subordinadas via `X-Unidade`, arquivo restrito, histórico).
Front passa em `tsc`, `eslint` e `vite build`; **não testado no navegador** (o dono vai revisar).

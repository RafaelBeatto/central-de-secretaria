# Módulo 6 — Gerador de documentos

Fonte no sistema antigo: `old/js/17-gerador-documentos.js` e `old/js/17b-gerador-telas.js`.
Tabelas: `gerador.*` (já existiam no `apae.sql`; **nenhuma alteração de banco** neste módulo).

## Mantido igual ao antigo
- Campos `{AUTOMÁTICO}` (NOME_APAE, CNPJ_APAE, ENDERECO_APAE, TELEFONE_APAE, EMAIL_APAE, CIDADE_UF, PRESIDENTE,
  CPF_PRESIDENTE, DATA, DATA_CURTA, ANO, NUMERO) e `[MANUAL]`; `{OUTRO}` vira campo "de contexto" no formulário.
  Campo sem valor continua visível como `[CAMPO]` / `{CAMPO}` (amarelo na prévia).
- Campos longos (TEXTO, PAUTA, DELIBERACOES…) em área de texto; rótulos amigáveis ("DESTINATARIO" → "Destinatário").
- Numeração por **série e ano** quando o texto usa `{NUMERO}` (série = a do modelo ou o nome dele): `001/2026`.
- O documento guarda **cópia do texto do modelo**; editar o modelo (ou excluí-lo) não muda os documentos já gerados.
- Editar um documento **não apaga**: a versão atual vai para "Versões anteriores" (consulta, PDF e impressão delas).
- Duplicar documento (usa o texto do próprio documento; recebe número novo se for numerado).
- Vínculo com registro preenche só os campos **vazios**; vínculo também aparece como link para abrir o registro.
- Assinaturas (blocos de linhas), anexos, lista por mês com busca em tudo que foi preenchido e filtro por modelo,
  prévia A4 ao vivo, miniatura, visualização em tamanho real, PDF e impressão com cabeçalho e rodapé da unidade
  ("Página X de Y" se a unidade marcou).

## Melhorias / mudanças deliberadas
| Tema | Antes (`old/`) | Agora |
|---|---|---|
| Numeração | contador no `localStorage` (duas abas/usuários podiam repetir número) | `ServicoNumeracao.numeroDoAno`: upsert atômico no banco, **sem número repetido**; número só é consumido ao gerar (a prévia só "espia") |
| HTML do editor | sanitizado só no navegador | sanitizado **no back** (jsoup): sem script/iframe/formulário/`on*`/`javascript:`, sem `url()`/`position` em estilo, **sem imagens** (nada de base64 nem fonte externa) |
| Modelos do sistema | podia editar o "modelo inicial" | os 12 modelos do sistema são **somente leitura**: use *Duplicar* e edite a cópia (todas as unidades enxergam os mesmos, cada unidade tem os seus) |
| Anexos | IndexedDB do navegador | **AWS S3** (categoria `ANEXO_GERADOR`), só o id no banco; apagar o documento/anexo apaga o arquivo |
| Empresas dentro do Gerador | aba "Empresas" própria + cadastro duplicado | **removida**: usa-se o cadastro único de Empresas; a ficha da empresa ganhou **"Gerar documento"** (abre o seletor de modelo já ligado à empresa) |
| Excluir empresa ligada a documento gerado | bloqueava | continua bloqueando, agora validado no back (`ServicoEmpresa.excluir` → mensagem clara) |
| Vínculo "projeto" | ligava ao projeto antigo | liga à **execução** de projeto (`EXECUCAO`): preenche NOME_PROJETO, OBJETIVO, PERIODO, VALOR, FONTE_RECURSO, RESPONSAVEL |
| Vínculos com permissão | — | a lista de cada tipo usa as APIs dos módulos; quem não lê aquele módulo vê "Você não tem acesso a esta lista" |
| Limites | sem limite | `Limites.java` ↔ `limites.ts` ↔ `apae.sql`: nome do modelo 100, título 150, série 60, texto 100 000, campo 5 000, até 60 campos, 10 assinaturas × 5 linhas × 150 caracteres |
| Atenção ao celular | modal | formulário em **tela cheia**, prévia empilhada abaixo dos campos; painel do documento ocupa a tela com "← Documentos" |
| Prévia/miniatura | HTML solto (CSS global) | `PaginaA4Previa`: folha A4 reduzida à largura disponível, com o CSS isolado (`ESTILO_DOCUMENTO`), sem afetar o resto da tela |
| Histórico | `registrarHistorico` | `ServicoHistorico` (`GERADOR`): criação, edição (versão N), anexos, exclusão — aparece no painel do documento |
| Tema escuro | — | só o papel A4 é branco (como o impresso); o restante usa o tema |

## Novidades técnicas reaproveitáveis
- `components/formularios/EditorRico.tsx` — editor rico (negrito, itálico, sublinhado, título, tamanho, alinhamento,
  listas, tabela, quebra de página, espaçamento). Não controlado: troque a `key` para recarregar.
- `components/apps/gerador/PaginaA4Previa.tsx` — qualquer HTML A4 reduzido ao espaço disponível.
- `utils/documentoA4.ts`: `ESTILO_DOCUMENTO` (classes sem `body`/`@media print`, serve para prévia na tela),
  `rodapeInstitucionalHtml(unidade)`. `utils/impressaoPdf.ts`: `salvarPdf(html, nome, { paginaXdeY })`.
- `utils/gerador.ts` (campos, montagem do documento, busca) e `utils/geradorVinculos.ts` (listas e dados de cada tipo
  de vínculo, rota para abrir o registro) — o Módulo 8 (pesquisa geral) pode usar `textoBusca`/`nomeDocumento`.
- Back: `SanitizadorHtml` (jsoup) para qualquer HTML rico futuro.

## Correções de infraestrutura descobertas
- **Hibernate 7 + colunas `jsonb`**: o Spring Boot 4 usa Jackson 3, mas o Hibernate só mapeia JSON com Jackson 2 no
  classpath. Sem `com.fasterxml.jackson.core:jackson-databind` o `INSERT` falha com "Could not find a FormatMapper for the
  JSON format" (500). Dependência adicionada ao `pom.xml`.

## Fora deste módulo
- "Vincular a outros registros" genérico (tabela `sistema.vinculo_registro`) continua no item 9 do roteiro.
- Modelos da unidade não geram histórico (o antigo também não registrava).
- Não testado no navegador (o dono vai revisar): editor rico (`execCommand`), PDF/impressão e a prévia.

# Módulo 9 — Vínculos entre registros

Fonte no antigo: `old/js/12-relacionamentos.js` (e os seletores "🔗 Vincular a outros registros" dos formulários de tarefa e documento).

## O que foi entregue
- Seção **Relacionados** no detalhe de **tarefa**, **documento**, **empresa** (aba Histórico) e **execução de projeto** (aba Resumo): lista agrupada por tipo
  (título + código/CNPJ), botão **Abrir** (vai direto ao registro) e **✕** para remover, com confirmação; **Vincular…** abre um diálogo com tipo + busca no registro.
- Back `vinculos/`: `GET /api/vinculos?tipo&id`, `GET /api/vinculos/opcoes?tipo&id&alvo`, `POST /api/vinculos`, `DELETE /api/vinculos?tipo&id&alvoTipo&alvoId`
  (tabela `sistema.vinculo_registro`; o par é gravado ordenado, então A↔B = B↔A, sem duplicar).

## Melhorias em relação ao antigo
- Vincula **qualquer par** entre tarefa, documento, empresa e execução (o antigo só oferecia projeto/empresa nos formulários, e só ao **editar**).
- **Permissões**: ler os dois módulos + escrever no módulo do registro de onde parte o vínculo; só entre registros da **própria unidade**
  (unidade superior apenas consulta). Quem não lê um módulo não vê os vínculos com ele.
- **Sem referência quebrada**: excluir tarefa/documento/empresa/execução apaga os vínculos dela (o antigo deixava lixo e escondia na tela).
- **Histórico**: ligar e desligar entram no histórico dos dois registros (ações Vínculo/Desvínculo).
- Sem `location.reload()` — a lista atualiza na hora.
- Candidatos já filtrados: não aparece o próprio registro nem quem já está ligado.

## Decisões / fora do escopo
- **Empresa ↔ execução não é vínculo livre**: já existe a ligação própria em Projetos ("Ligar a um projeto" / empresas da execução, com cotações e pagamentos).
  Repetir seria duplicar; o back recusa o par com essa explicação.
- Não existem vínculos para cotação, ordem de compra e pagamento (eram "estruturas aninhadas" sem tela no antigo) nem para recurso, atendimento e documento gerado
  (o Gerador tem os próprios vínculos, `TipoVinculo`, que preenchem campos do documento).
- O atalho "Vincular" do Gerador/Documentos antigo (vínculos guardados no próprio documento) não existe mais — o banco começa do zero.

## Verificação
- Back compila e sobe validando o mapeamento da tabela; front passa em `tsc`, `eslint` e `vite build`. Não testado no navegador nem por chamadas HTTP.

package br.org.apae.secretaria.projetos.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import br.org.apae.secretaria.comum.Limites;
import br.org.apae.secretaria.comum.dominio.Prioridade;
import br.org.apae.secretaria.projetos.Enums.CategoriaDocumentoExecucao;
import br.org.apae.secretaria.projetos.Enums.StatusExecucao;
import br.org.apae.secretaria.projetos.Enums.StatusOrdemCompra;
import br.org.apae.secretaria.projetos.Enums.StatusRecurso;
import jakarta.validation.Valid;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** Requisições do módulo de projetos (old/js/04-projetos.js). Valores em reais com 2 casas. */
public final class RequisicoesProjeto {

    private RequisicoesProjeto() {
    }

    public record RequisicaoRecurso(
            @NotBlank @Size(max = Limites.PROJETO_NOME) String nome,
            @NotBlank @Size(max = Limites.PROJETO_FONTE) String fonteRecurso,
            @Size(max = Limites.PROJETO_ORGAO) String orgaoRepassador,
            @Size(max = Limites.PROJETO_CONVENIO) String convenio,
            LocalDate dataRecebimento,
            @NotNull LocalDate dataInicio,
            @NotNull LocalDate dataFim,
            @NotNull @DecimalMin("0.00") @Digits(integer = 12, fraction = 2) BigDecimal valorRecebido,
            @Size(max = Limites.PROJETO_CONTA) String contaBancaria,
            @Size(max = Limites.RESPONSAVEL) String responsavel,
            @NotNull StatusRecurso status,
            @Size(max = Limites.TEXTO_LONGO) String finalidade,
            @Size(max = Limites.TEXTO_LONGO) String observacoes) {

        @AssertTrue(message = "A data de término não pode ser anterior à de início.")
        public boolean isPeriodoValido() {
            return dataInicio == null || dataFim == null || !dataFim.isBefore(dataInicio);
        }
    }

    public record RequisicaoExecucao(
            @NotBlank @Size(max = Limites.PROJETO_NOME) String nome,
            @NotBlank @Size(max = Limites.PROJETO_FONTE) String fonteRecurso,
            @Size(max = Limites.PROJETO_CONVENIO) String convenio,
            @NotNull LocalDate dataInicio,
            @NotNull LocalDate dataFim,
            @NotNull @DecimalMin("0.00") @Digits(integer = 12, fraction = 2) BigDecimal valorPlanejado,
            @Size(max = Limites.RESPONSAVEL) String responsavel,
            @NotNull StatusExecucao status,
            @Size(max = Limites.TEXTO_LONGO) String objetivo,
            @Size(max = Limites.TEXTO_LONGO) String observacoes) {

        @AssertTrue(message = "A data de término não pode ser anterior à de início.")
        public boolean isPeriodoValido() {
            return dataInicio == null || dataFim == null || !dataFim.isBefore(dataInicio);
        }
    }

    public record RequisicaoArquivado(boolean arquivado) {
    }

    public record RequisicaoStatusExecucao(@NotNull StatusExecucao status) {
    }

    public record RequisicaoDocumentoRecurso(
            @NotBlank @Size(max = Limites.RECURSO_DOCUMENTO_NOME) String nome,
            @Size(max = Limites.PROJETO_OBSERVACAO) String observacao,
            @NotNull Long arquivoId) {
    }

    public record RequisicaoTransferencia(
            @NotNull Long origemId,
            @NotNull Long destinoId,
            @NotNull @DecimalMin("0.01") @Digits(integer = 12, fraction = 2) BigDecimal valor,
            @NotBlank @Size(max = Limites.PROJETO_OBSERVACAO) String motivo) {
    }

    public record RequisicaoPlano(
            @NotBlank @Size(max = Limites.PLANO_DESCRICAO) String descricao,
            Long arquivoId) {
    }

    public record RequisicaoVincularEmpresa(@NotNull Long empresaId) {
    }

    public record RequisicaoItemCotacao(
            @NotBlank @Size(max = Limites.COTACAO_ITEM_DESCRICAO) String descricao,
            @NotNull @Min(1) Integer quantidade,
            @NotNull @DecimalMin("0.00") @Digits(integer = 12, fraction = 2) BigDecimal valorUnitario) {
    }

    public record RequisicaoCotacao(
            @NotNull Long empresaId,
            LocalDate data,
            @NotEmpty(message = "Informe pelo menos um item.") @Valid List<RequisicaoItemCotacao> itens,
            @NotNull @DecimalMin("0.00") @Digits(integer = 12, fraction = 2) BigDecimal valorTotal,
            @Size(max = Limites.PROJETO_OBSERVACAO) String observacao,
            @NotNull(message = "Anexe a proposta / orçamento.") Long arquivoId) {
    }

    public record RequisicaoOrdem(
            @NotBlank @Size(max = Limites.ORDEM_NUMERO) String numero,
            LocalDate data,
            @NotNull @DecimalMin("0.00") @Digits(integer = 12, fraction = 2) BigDecimal valor,
            @NotNull StatusOrdemCompra status,
            @NotNull(message = "Anexe a ordem de compra.") Long arquivoId) {
    }

    public record RequisicaoDocumentoExecucao(
            @NotBlank @Size(max = Limites.EXECUCAO_DOCUMENTO_NOME) String nome,
            @NotNull CategoriaDocumentoExecucao categoria,
            LocalDate data,
            @NotNull(message = "Anexe o arquivo.") Long arquivoId) {
    }

    public record RequisicaoPagamento(
            Long empresaId,
            @Size(max = Limites.PAGAMENTO_FORNECEDOR) String fornecedor,
            LocalDate data,
            @NotNull @DecimalMin("0.01") @Digits(integer = 12, fraction = 2) BigDecimal valor,
            @Size(max = Limites.PAGAMENTO_FORMA) String forma,
            @NotNull(message = "Anexe o comprovante.") Long arquivoId) {
    }

    public record RequisicaoPendencia(
            @NotBlank @Size(max = Limites.PENDENCIA_TITULO) String titulo,
            @NotNull Prioridade prioridade,
            @Size(max = Limites.PENDENCIA_DESCRICAO) String descricao) {
    }

    public record RequisicaoConcluirPendencia(boolean concluida) {
    }
}

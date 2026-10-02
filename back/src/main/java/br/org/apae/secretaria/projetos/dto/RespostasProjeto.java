package br.org.apae.secretaria.projetos.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

import br.org.apae.secretaria.comum.dominio.Prioridade;
import br.org.apae.secretaria.documentos.ExigenciaApae;
import br.org.apae.secretaria.empresas.dto.EmpresaResposta;
import br.org.apae.secretaria.projetos.Cotacao;
import br.org.apae.secretaria.projetos.Enums.CategoriaDocumentoExecucao;
import br.org.apae.secretaria.projetos.Enums.StatusExecucao;
import br.org.apae.secretaria.projetos.Enums.StatusOrdemCompra;
import br.org.apae.secretaria.projetos.Enums.StatusRecurso;
import br.org.apae.secretaria.projetos.Enums.TipoMovimentacao;
import br.org.apae.secretaria.projetos.ExecucaoDocumento;
import br.org.apae.secretaria.projetos.ExecucaoPendencia;
import br.org.apae.secretaria.projetos.MovimentacaoRecurso;
import br.org.apae.secretaria.projetos.OrdemCompra;
import br.org.apae.secretaria.projetos.Pagamento;
import br.org.apae.secretaria.projetos.RecursoDocumento;

/** Respostas do módulo de projetos. Os números financeiros e o checklist vêm prontos do back. */
public final class RespostasProjeto {

    private RespostasProjeto() {
    }

    /** Recebido / distribuído / pago — os três conceitos nunca se misturam (canceladas não contam). */
    public record FinanceiroRecurso(
            BigDecimal recebido, BigDecimal distribuido, BigDecimal pago, BigDecimal naoDistribuido,
            BigDecimal saldoExecucoes, BigDecimal disponivel, int percentualDistribuicao, int percentualExecucao) {
    }

    /** Etapa do checklist; "secao" é a seção da execução onde ela se resolve. */
    public record Etapa(String rotulo, boolean ok, String secao) {
    }

    public record SituacaoExecucao(
            BigDecimal planejado, BigDecimal pago, BigDecimal saldo, int percentualPago, List<Etapa> etapas,
            int etapasFeitas, Etapa proximoPasso) {
    }

    public record ExecucaoResumo(
            Long id, Long recursoId, String recursoNome, String codigo, String nome, StatusExecucao status,
            String responsavel, LocalDate dataInicio, LocalDate dataFim, SituacaoExecucao situacao) {
    }

    public record RecursoResumo(
            Long id, String codigo, String nome, String fonteRecurso, String orgaoRepassador, StatusRecurso status,
            boolean arquivado, FinanceiroRecurso financeiro, List<ExecucaoResumo> execucoes) {
    }

    public record DocumentoRecursoResposta(Long id, String nome, String observacao, LocalDate data, Long arquivoId) {
        public static DocumentoRecursoResposta de(RecursoDocumento d) {
            return new DocumentoRecursoResposta(d.getId(), d.getNome(), d.getObservacao(), d.getData(), d.getArquivoId());
        }
    }

    public record MovimentacaoResposta(
            Long id, TipoMovimentacao tipo, BigDecimal valor, String descricao, LocalDate data, Instant criadoEm) {
        public static MovimentacaoResposta de(MovimentacaoRecurso m) {
            return new MovimentacaoResposta(m.getId(), m.getTipo(), m.getValor(), m.getDescricao(), m.getData(),
                    m.getCriadoEm());
        }
    }

    public record RecursoDetalhe(
            Long id, String codigo, String nome, String fonteRecurso, String orgaoRepassador, String convenio,
            LocalDate dataRecebimento, LocalDate dataInicio, LocalDate dataFim, BigDecimal valorRecebido,
            String contaBancaria, String responsavel, StatusRecurso status, String finalidade, String observacoes,
            boolean arquivado, FinanceiroRecurso financeiro, List<ExecucaoResumo> execucoes,
            List<DocumentoRecursoResposta> documentos, List<MovimentacaoResposta> movimentacoes, Instant atualizadoEm) {
    }

    public record EmpresaVinculada(Long vinculoId, EmpresaResposta empresa) {
    }

    public record ItemCotacaoResposta(String descricao, Integer quantidade, BigDecimal valorUnitario) {
    }

    public record CotacaoResposta(
            Long id, Long empresaId, LocalDate data, BigDecimal valorTotal, String observacao, boolean vencedora,
            Long arquivoId, List<ItemCotacaoResposta> itens) {
        public static CotacaoResposta de(Cotacao c) {
            return new CotacaoResposta(c.getId(), c.getEmpresaId(), c.getData(), c.getValorTotal(), c.getObservacao(),
                    c.isVencedora(), c.getArquivoId(), c.getItens().stream()
                            .map(i -> new ItemCotacaoResposta(i.descricao(), i.quantidade(), i.valorUnitario())).toList());
        }
    }

    public record OrdemResposta(
            Long id, Long cotacaoId, String numero, LocalDate data, BigDecimal valor, StatusOrdemCompra status,
            Long arquivoId) {
        public static OrdemResposta de(OrdemCompra o) {
            return new OrdemResposta(o.getId(), o.getCotacaoId(), o.getNumero(), o.getData(), o.getValor(), o.getStatus(),
                    o.getArquivoId());
        }
    }

    public record DocumentoExecucaoResposta(
            Long id, String nome, CategoriaDocumentoExecucao categoria, LocalDate data, Long arquivoId) {
        public static DocumentoExecucaoResposta de(ExecucaoDocumento d) {
            return new DocumentoExecucaoResposta(d.getId(), d.getNome(), d.getCategoria(), d.getData(), d.getArquivoId());
        }
    }

    public record PagamentoResposta(
            Long id, Long empresaId, String fornecedor, LocalDate data, BigDecimal valor, String forma, Long arquivoId) {
        public static PagamentoResposta de(Pagamento p) {
            return new PagamentoResposta(p.getId(), p.getEmpresaId(), p.getFornecedor(), p.getData(), p.getValor(),
                    p.getForma(), p.getArquivoId());
        }
    }

    public record PendenciaResposta(Long id, String titulo, Prioridade prioridade, String descricao, boolean concluida) {
        public static PendenciaResposta de(ExecucaoPendencia p) {
            return new PendenciaResposta(p.getId(), p.getTitulo(), p.getPrioridade(), p.getDescricao(), p.isConcluida());
        }
    }

    /** Para cada exigência, o documento em Documentos que a atende (o de validade mais longa). */
    public record DocumentoApae(
            ExigenciaApae exigencia, Long documentoId, String nome, LocalDate dataValidade, Long arquivoId, boolean ok) {
    }

    public record ExecucaoDetalhe(
            Long id, Long recursoId, String recursoNome, boolean recursoArquivado, String codigo, String nome,
            String fonteRecurso, String convenio, LocalDate dataInicio, LocalDate dataFim, BigDecimal valorPlanejado,
            String responsavel, StatusExecucao status, String objetivo, String observacoes, String planoDescricao,
            Long planoArquivoId, SituacaoExecucao situacao, List<EmpresaVinculada> empresas,
            List<CotacaoResposta> cotacoes, List<OrdemResposta> ordens, List<DocumentoExecucaoResposta> documentos,
            List<PagamentoResposta> pagamentos, List<PendenciaResposta> pendencias,
            List<DocumentoApae> documentacaoApae, Instant atualizadoEm) {
    }

    /** O que a ficha da empresa mostra dos projetos: execuções ligadas, cotações e ordens. */
    public record EmpresaNosProjetos(
            List<ExecucaoResumo> execucoes, List<CotacaoDaEmpresa> cotacoes, List<OrdemDaEmpresa> ordens) {
    }

    public record CotacaoDaEmpresa(
            Long id, Long execucaoId, String execucaoNome, LocalDate data, BigDecimal valorTotal, boolean vencedora,
            Long arquivoId) {
    }

    public record OrdemDaEmpresa(
            Long id, Long execucaoId, String execucaoNome, String numero, LocalDate data, BigDecimal valor,
            StatusOrdemCompra status, Long arquivoId) {
    }
}

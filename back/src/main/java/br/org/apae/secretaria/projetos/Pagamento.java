package br.org.apae.secretaria.projetos;

import java.math.BigDecimal;
import java.time.LocalDate;

import br.org.apae.secretaria.comum.Limites;
import br.org.apae.secretaria.comum.entidade.EntidadeCriada;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** Pagamento da execução, com comprovante obrigatório. */
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "pagamento", schema = "projetos")
public class Pagamento extends EntidadeCriada {

    @Column(name = "execucao_id", nullable = false, updatable = false)
    private Long execucaoId;

    @Column(name = "empresa_id", updatable = false)
    private Long empresaId;

    @Column(length = Limites.PAGAMENTO_FORNECEDOR, updatable = false)
    private String fornecedor;

    @Column(updatable = false)
    private LocalDate data;

    @Column(nullable = false, precision = 14, scale = 2, updatable = false)
    private BigDecimal valor;

    @Column(length = Limites.PAGAMENTO_FORMA, updatable = false)
    private String forma;

    @Column(name = "arquivo_id", nullable = false, updatable = false)
    private Long arquivoId;

    public Pagamento(Long execucaoId, Long empresaId, String fornecedor, LocalDate data, BigDecimal valor, String forma, Long arquivoId) {
        this.execucaoId = execucaoId;
        this.empresaId = empresaId;
        this.fornecedor = fornecedor;
        this.data = data;
        this.valor = valor;
        this.forma = forma;
        this.arquivoId = arquivoId;
    }
}

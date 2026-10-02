package br.org.apae.secretaria.projetos;

import java.math.BigDecimal;
import java.time.LocalDate;

import br.org.apae.secretaria.comum.Limites;
import br.org.apae.secretaria.comum.entidade.EntidadeCriada;
import br.org.apae.secretaria.projetos.Enums.StatusOrdemCompra;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** Ordem de compra, sempre da cotação vencedora. */
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "ordem_compra", schema = "projetos")
public class OrdemCompra extends EntidadeCriada {

    @Column(name = "execucao_id", nullable = false, updatable = false)
    private Long execucaoId;

    @Column(name = "cotacao_id", nullable = false, updatable = false)
    private Long cotacaoId;

    @Column(nullable = false, length = Limites.ORDEM_NUMERO, updatable = false)
    private String numero;

    @Column(updatable = false)
    private LocalDate data;

    @Column(nullable = false, precision = 14, scale = 2, updatable = false)
    private BigDecimal valor;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10, updatable = false)
    private StatusOrdemCompra status;

    @Column(name = "arquivo_id", nullable = false, updatable = false)
    private Long arquivoId;

    public OrdemCompra(Long execucaoId, Long cotacaoId, String numero, LocalDate data, BigDecimal valor, StatusOrdemCompra status, Long arquivoId) {
        this.execucaoId = execucaoId;
        this.cotacaoId = cotacaoId;
        this.numero = numero;
        this.data = data;
        this.valor = valor;
        this.status = status;
        this.arquivoId = arquivoId;
    }
}

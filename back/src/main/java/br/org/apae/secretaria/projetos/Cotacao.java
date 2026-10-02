package br.org.apae.secretaria.projetos;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

import br.org.apae.secretaria.comum.Limites;
import br.org.apae.secretaria.comum.entidade.EntidadeCriada;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Embeddable;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Proposta completa de uma empresa numa execução, com os itens cotados e o arquivo da proposta. */
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "cotacao", schema = "projetos")
public class Cotacao extends EntidadeCriada {

    @Column(name = "execucao_id", nullable = false, updatable = false)
    private Long execucaoId;

    @Column(name = "empresa_id", nullable = false, updatable = false)
    private Long empresaId;

    @Column(updatable = false)
    private LocalDate data;

    @Column(name = "valor_total", nullable = false, precision = 14, scale = 2, updatable = false)
    private BigDecimal valorTotal;

    @Column(length = Limites.PROJETO_OBSERVACAO, updatable = false)
    private String observacao;

    @Setter
    @Column(nullable = false)
    private boolean vencedora;

    @Column(name = "arquivo_id", nullable = false, updatable = false)
    private Long arquivoId;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "cotacao_item", schema = "projetos", joinColumns = @JoinColumn(name = "cotacao_id"))
    private List<Item> itens = new ArrayList<>();

    public Cotacao(Long execucaoId, Long empresaId, LocalDate data, BigDecimal valorTotal, String observacao,
            Long arquivoId, List<Item> itens) {
        this.execucaoId = execucaoId;
        this.empresaId = empresaId;
        this.data = data;
        this.valorTotal = valorTotal;
        this.observacao = observacao;
        this.arquivoId = arquivoId;
        this.itens.addAll(itens);
    }

    @Embeddable
    public record Item(
            @Column(nullable = false, length = Limites.COTACAO_ITEM_DESCRICAO) String descricao,
            @Column(nullable = false) Integer quantidade,
            @Column(name = "valor_unitario", nullable = false, precision = 14, scale = 2) BigDecimal valorUnitario) {
    }
}

package br.org.apae.secretaria.projetos;

import java.math.BigDecimal;
import java.time.LocalDate;

import br.org.apae.secretaria.comum.Limites;
import br.org.apae.secretaria.comum.entidade.EntidadeCriada;
import br.org.apae.secretaria.projetos.Enums.TipoMovimentacao;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** Lançamento do histórico financeiro do recurso (nunca alterado). */
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "movimentacao_recurso", schema = "projetos")
public class MovimentacaoRecurso extends EntidadeCriada {

    @Column(name = "recurso_id", nullable = false, updatable = false)
    private Long recursoId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 15, updatable = false)
    private TipoMovimentacao tipo;

    @Column(nullable = false, precision = 14, scale = 2, updatable = false)
    private BigDecimal valor;

    @Column(length = Limites.PROJETO_OBSERVACAO, updatable = false)
    private String descricao;

    @Column(name = "execucao_origem_id", updatable = false)
    private Long execucaoOrigemId;

    @Column(name = "execucao_destino_id", updatable = false)
    private Long execucaoDestinoId;

    @Column(nullable = false, updatable = false)
    private LocalDate data;

    @Column(name = "usuario_id", updatable = false)
    private Long usuarioId;

    public MovimentacaoRecurso(Long recursoId, TipoMovimentacao tipo, BigDecimal valor, String descricao, Long execucaoOrigemId, Long execucaoDestinoId, LocalDate data, Long usuarioId) {
        this.recursoId = recursoId;
        this.tipo = tipo;
        this.valor = valor;
        this.descricao = descricao;
        this.execucaoOrigemId = execucaoOrigemId;
        this.execucaoDestinoId = execucaoDestinoId;
        this.data = data;
        this.usuarioId = usuarioId;
    }
}

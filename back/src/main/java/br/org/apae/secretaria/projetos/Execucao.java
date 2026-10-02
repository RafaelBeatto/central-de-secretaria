package br.org.apae.secretaria.projetos;

import java.math.BigDecimal;
import java.time.LocalDate;

import br.org.apae.secretaria.comum.Limites;
import br.org.apae.secretaria.comum.entidade.EntidadeAuditavel;
import br.org.apae.secretaria.projetos.Enums.StatusExecucao;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Aplicação de parte de um recurso: cotações, compras, documentos e pagamentos. */
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "execucao", schema = "projetos")
public class Execucao extends EntidadeAuditavel {

    @Setter(AccessLevel.NONE)
    @Column(name = "unidade_id", nullable = false, updatable = false)
    private Long unidadeId;

    @Setter(AccessLevel.NONE)
    @Column(name = "recurso_id", nullable = false, updatable = false)
    private Long recursoId;

    @Setter(AccessLevel.NONE)
    @Column(nullable = false, updatable = false, length = Limites.CODIGO)
    private String codigo;

    @Column(nullable = false, length = Limites.PROJETO_NOME)
    private String nome;

    @Column(name = "fonte_recurso", nullable = false, length = Limites.PROJETO_FONTE)
    private String fonteRecurso;

    @Column(length = Limites.PROJETO_CONVENIO)
    private String convenio;

    @Column(name = "data_inicio", nullable = false)
    private LocalDate dataInicio;

    @Column(name = "data_fim", nullable = false)
    private LocalDate dataFim;

    @Column(name = "valor_planejado", nullable = false, precision = 14, scale = 2)
    private BigDecimal valorPlanejado;

    @Column(length = Limites.RESPONSAVEL)
    private String responsavel;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 15)
    private StatusExecucao status;

    @Column(length = Limites.TEXTO_LONGO)
    private String objetivo;

    @Column(length = Limites.TEXTO_LONGO)
    private String observacoes;

    @Column(name = "plano_descricao", length = Limites.PLANO_DESCRICAO)
    private String planoDescricao;

    @Column(name = "plano_arquivo_id")
    private Long planoArquivoId;

    @Setter(AccessLevel.NONE)
    @Column(name = "criado_por_id", updatable = false)
    private Long criadoPorId;

    public Execucao(Long unidadeId, Long recursoId, String codigo, Long criadoPorId) {
        this.unidadeId = unidadeId;
        this.recursoId = recursoId;
        this.codigo = codigo;
        this.criadoPorId = criadoPorId;
    }

    public boolean cancelada() {
        return status == StatusExecucao.CANCELADO;
    }

    /** Transferência de saldo entre execuções: só mexe no planejado, a movimentação fica no recurso. */
    public void somarAoPlanejado(BigDecimal valor) {
        valorPlanejado = valorPlanejado.add(valor);
    }
}

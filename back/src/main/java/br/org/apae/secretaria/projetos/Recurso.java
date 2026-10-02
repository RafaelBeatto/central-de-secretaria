package br.org.apae.secretaria.projetos;

import java.math.BigDecimal;
import java.time.LocalDate;

import br.org.apae.secretaria.comum.Limites;
import br.org.apae.secretaria.comum.entidade.EntidadeAuditavel;
import br.org.apae.secretaria.projetos.Enums.StatusRecurso;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Dinheiro que entrou na APAE (convênio, emenda, doação); as execuções aplicam esse valor. */
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "recurso", schema = "projetos")
public class Recurso extends EntidadeAuditavel {

    @Setter(AccessLevel.NONE)
    @Column(name = "unidade_id", nullable = false, updatable = false)
    private Long unidadeId;

    @Setter(AccessLevel.NONE)
    @Column(nullable = false, updatable = false, length = Limites.CODIGO)
    private String codigo;

    @Column(nullable = false, length = Limites.PROJETO_NOME)
    private String nome;

    @Column(name = "fonte_recurso", nullable = false, length = Limites.PROJETO_FONTE)
    private String fonteRecurso;

    @Column(name = "orgao_repassador", length = Limites.PROJETO_ORGAO)
    private String orgaoRepassador;

    @Column(length = Limites.PROJETO_CONVENIO)
    private String convenio;

    @Column(name = "data_recebimento")
    private LocalDate dataRecebimento;

    @Column(name = "data_inicio", nullable = false)
    private LocalDate dataInicio;

    @Column(name = "data_fim", nullable = false)
    private LocalDate dataFim;

    @Column(name = "valor_recebido", nullable = false, precision = 14, scale = 2)
    private BigDecimal valorRecebido;

    @Column(name = "conta_bancaria", length = Limites.PROJETO_CONTA)
    private String contaBancaria;

    @Column(length = Limites.RESPONSAVEL)
    private String responsavel;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 25)
    private StatusRecurso status;

    @Column(length = Limites.TEXTO_LONGO)
    private String finalidade;

    @Column(length = Limites.TEXTO_LONGO)
    private String observacoes;

    @Column(nullable = false)
    private boolean arquivado;

    @Setter(AccessLevel.NONE)
    @Column(name = "criado_por_id", updatable = false)
    private Long criadoPorId;

    public Recurso(Long unidadeId, String codigo, Long criadoPorId) {
        this.unidadeId = unidadeId;
        this.codigo = codigo;
        this.criadoPorId = criadoPorId;
    }
}

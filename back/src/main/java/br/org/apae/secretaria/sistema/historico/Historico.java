package br.org.apae.secretaria.sistema.historico;

import java.time.Instant;

import br.org.apae.secretaria.comum.Limites;
import br.org.apae.secretaria.comum.entidade.EntidadeBase;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** Linha de auditoria: o que foi feito, por quem, em qual registro. Nunca é alterada. */
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "historico", schema = "sistema")
public class Historico extends EntidadeBase {

    @Column(name = "unidade_id", nullable = false, updatable = false)
    private Long unidadeId;

    @Column(name = "usuario_id", updatable = false)
    private Long usuarioId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = Limites.HISTORICO_MODULO, updatable = false)
    private ModuloHistorico modulo;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = Limites.HISTORICO_ACAO, updatable = false)
    private AcaoHistorico acao;

    @Column(nullable = false, length = Limites.HISTORICO_DESCRICAO, updatable = false)
    private String descricao;

    @Column(name = "ref_tipo", length = 30, updatable = false)
    private String refTipo;

    @Column(name = "ref_id", updatable = false)
    private Long refId;

    @Column(name = "criado_em", nullable = false, updatable = false)
    private Instant criadoEm;

    Historico(Long unidadeId, Long usuarioId, ModuloHistorico modulo, AcaoHistorico acao, String descricao,
            String refTipo, Long refId) {
        this.unidadeId = unidadeId;
        this.usuarioId = usuarioId;
        this.modulo = modulo;
        this.acao = acao;
        this.descricao = descricao.length() > Limites.HISTORICO_DESCRICAO
                ? descricao.substring(0, Limites.HISTORICO_DESCRICAO - 1) + "…"
                : descricao;
        this.refTipo = refTipo;
        this.refId = refId;
        this.criadoEm = Instant.now();
    }
}

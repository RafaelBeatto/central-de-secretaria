package br.org.apae.secretaria.atendimentos;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.UUID;

import br.org.apae.secretaria.comum.Limites;
import br.org.apae.secretaria.comum.entidade.EntidadeAuditavel;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * Atendimento de um aluno com um profissional (old/js/19-atendimentos.js).
 * Numa série semanal, cada data é um atendimento com o mesmo {@code serieId}.
 */
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "atendimento", schema = "atendimentos")
public class Atendimento extends EntidadeAuditavel {

    @Column(name = "unidade_id", nullable = false, updatable = false)
    private Long unidadeId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "aluno_id", nullable = false, updatable = false)
    private Aluno aluno;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "profissional_id", nullable = false)
    private Profissional profissional;

    @Column(nullable = false)
    private LocalDate data;

    @Column(nullable = false)
    private LocalTime horario;

    @Column(length = Limites.OBSERVACAO_CURTA)
    private String observacao;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 15)
    private Presenca presenca = Presenca.NAO_INFORMADO;

    @Enumerated(EnumType.STRING)
    @Column(name = "falta_motivo", length = 30)
    private MotivoFalta faltaMotivo;

    @Column(name = "falta_observacao", length = Limites.OBSERVACAO_CURTA)
    private String faltaObservacao;

    /** Este atendimento foi remarcado: fica no histórico e não conta nos totais; quem conta é a cópia. */
    @Column(nullable = false)
    private boolean remarcado;

    @Column(name = "remarcado_motivo", length = Limites.ATENDIMENTO_REMARCADO_MOTIVO)
    private String remarcadoMotivo;

    /** Preenchido só na cópia: de qual atendimento ela nasceu. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "remarcado_de_id")
    private Atendimento remarcadoDe;

    @Column(name = "serie_id")
    private UUID serieId;

    @Column(name = "criado_por_id", updatable = false)
    private Long criadoPorId;

    public Atendimento(Long unidadeId, Aluno aluno, Profissional profissional, LocalDate data, LocalTime horario,
            String observacao, UUID serieId, Long criadoPorId) {
        this.unidadeId = unidadeId;
        this.aluno = aluno;
        this.profissional = profissional;
        this.data = data;
        this.horario = horario;
        this.observacao = observacao;
        this.serieId = serieId;
        this.criadoPorId = criadoPorId;
    }

    public void marcarPresenca(Presenca novaPresenca, MotivoFalta motivo, String observacaoFalta) {
        presenca = novaPresenca;
        faltaMotivo = novaPresenca == Presenca.FALTOU ? motivo : null;
        faltaObservacao = novaPresenca == Presenca.FALTOU ? observacaoFalta : null;
    }

    /** O original fica marcado (sem contar mais) e uma cópia nasce na nova data/horário/profissional. */
    public Atendimento remarcarPara(Profissional novoProfissional, LocalDate novaData, LocalTime novoHorario,
            String motivo) {
        remarcado = true;
        remarcadoMotivo = motivo;
        presenca = Presenca.NAO_INFORMADO;
        faltaMotivo = null;
        faltaObservacao = null;
        Atendimento copia = new Atendimento(unidadeId, aluno, novoProfissional, novaData, novoHorario, observacao,
                null, criadoPorId);
        copia.remarcadoDe = this;
        return copia;
    }

    /** Ao excluir a cópia, o original volta a valer normalmente. */
    public void desfazerRemarcacao() {
        remarcado = false;
        remarcadoMotivo = null;
    }

    /** Ao excluir o original remarcado, a cópia fica "solta" (deixa de referenciar quem não existe mais). */
    public void desligarDoOriginal() {
        remarcadoDe = null;
    }

    public boolean efetivo() {
        return !remarcado;
    }

    public boolean emSerie() {
        return serieId != null;
    }
}

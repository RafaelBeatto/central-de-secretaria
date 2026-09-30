package br.org.apae.secretaria.agenda;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;

import br.org.apae.secretaria.comum.Limites;
import br.org.apae.secretaria.comum.dominio.Prioridade;
import br.org.apae.secretaria.comum.entidade.EntidadeAuditavel;
import br.org.apae.secretaria.tarefas.Tarefa;
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

/** Evento da agenda (old/js/05-agenda.js). Numa série, cada data é um evento. */
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "evento", schema = "agenda")
public class Evento extends EntidadeAuditavel {

    @Column(name = "unidade_id", nullable = false, updatable = false)
    private Long unidadeId;

    @Column(nullable = false, length = Limites.EVENTO_TITULO)
    private String titulo;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 15)
    private TipoEvento tipo = TipoEvento.COMPROMISSO;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private Prioridade prioridade = Prioridade.MEDIA;

    @Column(nullable = false)
    private LocalDate data;

    @Column(name = "horario_inicio")
    private LocalTime horarioInicio;

    @Column(name = "horario_fim")
    private LocalTime horarioFim;

    @Column(length = Limites.EVENTO_LOCAL)
    private String local;

    @Column(length = Limites.RESPONSAVEL)
    private String responsavel;

    @Column(length = Limites.EVENTO_PARTICIPANTES)
    private String participantes;

    @Column(length = Limites.TEXTO_LONGO)
    private String descricao;

    @Column(nullable = false)
    private boolean concluido;

    @Column(name = "concluido_em")
    private Instant concluidoEm;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tarefa_id")
    private Tarefa tarefa;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "serie_id")
    private EventoSerie serie;

    @Column(name = "criado_por_id", updatable = false)
    private Long criadoPorId;

    public Evento(Long unidadeId, Long criadoPorId, LocalDate data) {
        this.unidadeId = unidadeId;
        this.criadoPorId = criadoPorId;
        this.data = data;
    }

    /** Dados que o formulário altera (a data fica de fora: numa série ela é deslocada à parte). */
    public void aplicar(DadosEvento d) {
        titulo = d.titulo();
        tipo = d.tipo();
        prioridade = d.prioridade();
        horarioInicio = d.horarioInicio();
        horarioFim = d.horarioFim();
        local = d.local();
        responsavel = d.responsavel();
        participantes = d.participantes();
        descricao = d.descricao();
        tarefa = d.tarefa();
    }

    /** Nova data da mesma série, com os mesmos dados e ainda não concluída. */
    public Evento copiarPara(LocalDate novaData) {
        Evento copia = new Evento(unidadeId, criadoPorId, novaData);
        copia.aplicar(new DadosEvento(titulo, tipo, prioridade, horarioInicio, horarioFim, local, responsavel,
                participantes, descricao, tarefa));
        copia.serie = serie;
        return copia;
    }

    public void concluir() {
        concluido = true;
        concluidoEm = Instant.now();
    }

    public void reabrir() {
        concluido = false;
        concluidoEm = null;
    }

    public void moverPara(LocalDate novaData) {
        data = novaData;
    }

    public void entrarNaSerie(EventoSerie novaSerie) {
        serie = novaSerie;
    }

    public void sairDaSerie() {
        serie = null;
    }

    public boolean emSerie() {
        return serie != null;
    }

    /** O que o formulário preenche, já validado e limpo pelo serviço. */
    public record DadosEvento(String titulo, TipoEvento tipo, Prioridade prioridade, LocalTime horarioInicio,
            LocalTime horarioFim, String local, String responsavel, String participantes, String descricao,
            Tarefa tarefa) {
    }
}

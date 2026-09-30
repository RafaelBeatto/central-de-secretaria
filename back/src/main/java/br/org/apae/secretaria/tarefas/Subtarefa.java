package br.org.apae.secretaria.tarefas;

import br.org.apae.secretaria.comum.Limites;
import br.org.apae.secretaria.comum.entidade.EntidadeBase;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** Passo do checklist de uma tarefa. */
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "subtarefa", schema = "secretaria")
public class Subtarefa extends EntidadeBase {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "tarefa_id", nullable = false, updatable = false)
    private Tarefa tarefa;

    @Column(nullable = false, length = Limites.SUBTAREFA_TEXTO)
    private String texto;

    @Column(nullable = false)
    private boolean feita;

    @Column(nullable = false)
    private short ordem;

    Subtarefa(Tarefa tarefa, String texto, short ordem) {
        this.tarefa = tarefa;
        this.texto = texto;
        this.ordem = ordem;
    }

    void marcar(boolean feita) {
        this.feita = feita;
    }
}

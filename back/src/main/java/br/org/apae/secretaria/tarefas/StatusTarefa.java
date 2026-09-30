package br.org.apae.secretaria.tarefas;

/** Situações de uma tarefa (as mesmas colunas do Kanban de tarefas). */
public enum StatusTarefa {
    PENDENTE("Pendente"),
    EM_ANDAMENTO("Em andamento"),
    AGUARDANDO("Aguardando"),
    CONCLUIDA("Concluída"),
    CANCELADA("Cancelada");

    private final String rotulo;

    StatusTarefa(String rotulo) {
        this.rotulo = rotulo;
    }

    public String rotulo() {
        return rotulo;
    }

    public boolean encerrada() {
        return this == CONCLUIDA || this == CANCELADA;
    }
}

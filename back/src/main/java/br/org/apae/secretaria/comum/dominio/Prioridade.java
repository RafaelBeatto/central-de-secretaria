package br.org.apae.secretaria.comum.dominio;

/** Prioridade usada em tarefas, eventos e pendências de projeto. */
public enum Prioridade {
    BAIXA("Baixa"), MEDIA("Média"), ALTA("Alta"), URGENTE("Urgente");

    private final String rotulo;

    Prioridade(String rotulo) {
        this.rotulo = rotulo;
    }

    public String rotulo() {
        return rotulo;
    }
}

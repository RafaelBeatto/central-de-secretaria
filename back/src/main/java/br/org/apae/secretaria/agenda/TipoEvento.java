package br.org.apae.secretaria.agenda;

/** Tipos de evento da agenda (os mesmos do sistema antigo). */
public enum TipoEvento {
    REUNIAO("Reunião"), ATENDIMENTO("Atendimento"), COMPROMISSO("Compromisso"), EVENTO("Evento"), VISITA("Visita"),
    OUTRO("Outro");

    private final String rotulo;

    TipoEvento(String rotulo) {
        this.rotulo = rotulo;
    }

    public String rotulo() {
        return rotulo;
    }
}

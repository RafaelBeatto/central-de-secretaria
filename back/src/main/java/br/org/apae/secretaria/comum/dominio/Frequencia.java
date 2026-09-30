package br.org.apae.secretaria.comum.dominio;

/** Repetição de rotinas (tarefas) e de séries de eventos da agenda. */
public enum Frequencia {
    DIARIA("Diária"), SEMANAL("Semanal"), MENSAL("Mensal"), ANUAL("Anual");

    private final String rotulo;

    Frequencia(String rotulo) {
        this.rotulo = rotulo;
    }

    public String rotulo() {
        return rotulo;
    }
}

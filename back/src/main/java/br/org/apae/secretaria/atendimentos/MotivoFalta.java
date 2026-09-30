package br.org.apae.secretaria.atendimentos;

/** Motivos de falta oferecidos no antigo (old/js/19-atendimentos.js: ATENDIMENTOS_MOTIVOS_FALTA). */
public enum MotivoFalta {
    DOENCA("Doença"), CONSULTA_MEDICA("Consulta médica"), TRANSPORTE("Transporte"), NAO_AVISOU("Não avisou"),
    COMPROMISSO("Compromisso"), OUTRO("Outro");

    private final String rotulo;

    MotivoFalta(String rotulo) {
        this.rotulo = rotulo;
    }

    public String rotulo() {
        return rotulo;
    }
}

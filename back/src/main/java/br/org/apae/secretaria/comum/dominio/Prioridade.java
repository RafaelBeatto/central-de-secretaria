package br.org.apae.secretaria.comum.dominio;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;

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

    /**
     * Prioridade de um prazo vindo de outro módulo (vencimento de documento, fim de projeto),
     * pela proximidade: vencido = Urgente, até 3 dias = Alta, até 7 = Média, depois o padrão
     * (old/js/05-agenda.js: prioridadeAgendaPorData).
     */
    public static Prioridade pelaProximidade(LocalDate data, LocalDate hoje, Prioridade padrao) {
        long dias = ChronoUnit.DAYS.between(hoje, data);
        return dias < 0 ? URGENTE : dias <= 3 ? ALTA : dias <= 7 ? MEDIA : padrao;
    }
}

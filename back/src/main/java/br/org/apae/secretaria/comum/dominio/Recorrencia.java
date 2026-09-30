package br.org.apae.secretaria.comum.dominio;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

/**
 * Cálculo de datas que se repetem (mesmas regras do sistema antigo).
 * Somar meses não "pula" mês: 31/01 + 1 mês = 28/02 (ou 29), e o dia
 * preferido faz a série voltar ao dia 31 em março.
 */
public final class Recorrencia {

    private static final int LIMITE_CICLOS = 1000;

    private Recorrencia() {
    }

    public static LocalDate somarMeses(LocalDate data, int meses, int diaPreferido) {
        LocalDate alvo = data.withDayOfMonth(1).plusMonths(meses);
        return alvo.withDayOfMonth(Math.min(diaPreferido, alvo.lengthOfMonth()));
    }

    /** Próxima ocorrência depois de "atual". diaMes só vale para MENSAL (null = dia de "atual"). */
    public static LocalDate proximaApos(LocalDate atual, Frequencia frequencia, Integer diaMes) {
        return switch (frequencia) {
            case DIARIA -> atual.plusDays(1);
            case SEMANAL -> atual.plusWeeks(1);
            case MENSAL -> somarMeses(atual, 1, diaMes != null ? diaMes : atual.getDayOfMonth());
            case ANUAL -> somarMeses(atual, 12, atual.getDayOfMonth());
        };
    }

    /**
     * Primeira ocorrência posterior a "limite", andando a partir de "atual".
     * Uma rotina atrasada vários ciclos, feita hoje, volta numa data que ainda vai chegar.
     */
    public static LocalDate proximaDepoisDe(LocalDate atual, LocalDate limite, Frequencia frequencia, Integer diaMes) {
        LocalDate proxima = atual;
        for (int i = 0; i < LIMITE_CICLOS; i++) {
            proxima = proximaApos(proxima, frequencia, diaMes);
            if (proxima.isAfter(limite)) {
                break;
            }
        }
        return proxima;
    }

    /**
     * Datas de uma série (eventos repetidos da agenda): de "inicio" até "ate", no
     * máximo "limite" datas. Mensal e anual mantêm o dia da primeira data
     * (31/01 → 28/02 → 31/03; 29/02 volta a 29/02 no ano bissexto).
     */
    public static List<LocalDate> datasDaSerie(LocalDate inicio, LocalDate ate, Frequencia frequencia, int limite) {
        List<LocalDate> datas = new ArrayList<>();
        int diaBase = inicio.getDayOfMonth();
        LocalDate atual = inicio;
        while (datas.size() < limite && !atual.isAfter(ate)) {
            datas.add(atual);
            atual = switch (frequencia) {
                case DIARIA -> atual.plusDays(1);
                case SEMANAL -> atual.plusWeeks(1);
                case MENSAL -> somarMeses(atual, 1, diaBase);
                case ANUAL -> somarMeses(atual, 12, diaBase);
            };
        }
        return datas;
    }
}

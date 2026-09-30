package br.org.apae.secretaria.comum;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;

/** Datas em texto no padrão brasileiro (mensagens e histórico). */
public final class Datas {

    private static final DateTimeFormatter BR = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    private Datas() {
    }

    public static String br(LocalDate data) {
        return data == null ? "sem data" : BR.format(data);
    }
}

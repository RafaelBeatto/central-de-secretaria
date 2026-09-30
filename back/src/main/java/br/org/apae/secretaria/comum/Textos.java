package br.org.apae.secretaria.comum;

/** Normalização dos textos recebidos: espaços nas pontas removidos e vazio vira nulo. */
public final class Textos {

    private Textos() {
    }

    public static String limpo(String valor) {
        if (valor == null) {
            return null;
        }
        String aparado = valor.strip();
        return aparado.isEmpty() ? null : aparado;
    }

    /** Para filtros de busca: nulo vira "" (casa com tudo no LIKE). */
    public static String busca(String valor) {
        String limpo = limpo(valor);
        return limpo == null ? "" : limpo;
    }

    public static String maiusculo(String valor) {
        String limpo = limpo(valor);
        return limpo == null ? null : limpo.toUpperCase(java.util.Locale.ROOT);
    }
}

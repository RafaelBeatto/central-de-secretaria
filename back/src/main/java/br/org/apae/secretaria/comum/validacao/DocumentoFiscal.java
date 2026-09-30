package br.org.apae.secretaria.comum.validacao;

/** Cálculo dos dígitos verificadores de CPF e CNPJ (mesma regra do sistema antigo). */
public final class DocumentoFiscal {

    private DocumentoFiscal() {
    }

    public static String somenteDigitos(String valor) {
        return valor == null ? "" : valor.replaceAll("\\D", "");
    }

    public static boolean cnpjValido(String valor) {
        String cnpj = somenteDigitos(valor);
        if (cnpj.length() != 14 || cnpj.chars().distinct().count() == 1) {
            return false;
        }
        return digitoCnpj(cnpj, 12) == cnpj.charAt(12) - '0' && digitoCnpj(cnpj, 13) == cnpj.charAt(13) - '0';
    }

    public static boolean cpfValido(String valor) {
        String cpf = somenteDigitos(valor);
        if (cpf.length() != 11 || cpf.chars().distinct().count() == 1) {
            return false;
        }
        return digitoCpf(cpf, 9) == cpf.charAt(9) - '0' && digitoCpf(cpf, 10) == cpf.charAt(10) - '0';
    }

    /** 00.000.000/0000-00 */
    public static String formatarCnpj(String valor) {
        String d = somenteDigitos(valor);
        return d.length() != 14 ? valor
                : "%s.%s.%s/%s-%s".formatted(d.substring(0, 2), d.substring(2, 5), d.substring(5, 8), d.substring(8, 12), d.substring(12));
    }

    /** 000.000.000-00 */
    public static String formatarCpf(String valor) {
        String d = somenteDigitos(valor);
        return d.length() != 11 ? valor
                : "%s.%s.%s-%s".formatted(d.substring(0, 3), d.substring(3, 6), d.substring(6, 9), d.substring(9));
    }

    private static int digitoCnpj(String cnpj, int posicoes) {
        int soma = 0;
        int peso = posicoes - 7;
        for (int i = 0; i < posicoes; i++) {
            soma += (cnpj.charAt(i) - '0') * peso;
            peso = peso == 2 ? 9 : peso - 1;
        }
        int resto = soma % 11;
        return resto < 2 ? 0 : 11 - resto;
    }

    private static int digitoCpf(String cpf, int posicoes) {
        int soma = 0;
        for (int i = 0; i < posicoes; i++) {
            soma += (cpf.charAt(i) - '0') * (posicoes + 1 - i);
        }
        int resto = (soma * 10) % 11;
        return resto == 10 ? 0 : resto;
    }
}

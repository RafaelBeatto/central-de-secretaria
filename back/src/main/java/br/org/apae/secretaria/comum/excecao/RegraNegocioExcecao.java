package br.org.apae.secretaria.comum.excecao;

/** Operação válida no formato, mas que fere uma regra do negócio (responde 422). */
public class RegraNegocioExcecao extends RuntimeException {

    public RegraNegocioExcecao(String mensagem) {
        super(mensagem);
    }
}

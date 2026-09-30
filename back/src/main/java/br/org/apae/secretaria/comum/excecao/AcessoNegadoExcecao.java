package br.org.apae.secretaria.comum.excecao;

/** Usuário autenticado sem direito à operação (responde 403). */
public class AcessoNegadoExcecao extends RuntimeException {

    public AcessoNegadoExcecao(String mensagem) {
        super(mensagem);
    }
}

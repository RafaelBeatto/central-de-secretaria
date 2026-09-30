package br.org.apae.secretaria.comum.excecao;

/** Registro inexistente ou fora do escopo do usuário (responde 404, sem revelar qual dos dois). */
public class NaoEncontradoExcecao extends RuntimeException {

    public NaoEncontradoExcecao(String recurso) {
        super(recurso + " não encontrado(a).");
    }
}

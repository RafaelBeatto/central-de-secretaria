package br.org.apae.secretaria.acesso.autenticacao.dto;

import java.time.Instant;

/** Resposta de login/renovação: par de tokens e os dados do usuário. */
public record RespostaSessao(String tokenAcesso, Instant acessoExpiraEm, String tokenRenovacao, UsuarioSessao usuario) {
}

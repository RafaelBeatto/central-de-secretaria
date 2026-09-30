package br.org.apae.secretaria.acesso.usuario.dto;

import br.org.apae.secretaria.comum.validacao.SenhaForte;

/** Senha provisória definida por um superior; o usuário troca no próximo acesso. */
public record RequisicaoRedefinirSenha(@SenhaForte String senhaProvisoria) {
}

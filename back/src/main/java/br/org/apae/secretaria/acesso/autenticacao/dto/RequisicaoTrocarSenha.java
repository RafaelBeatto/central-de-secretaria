package br.org.apae.secretaria.acesso.autenticacao.dto;

import br.org.apae.secretaria.comum.Limites;
import br.org.apae.secretaria.comum.validacao.SenhaForte;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RequisicaoTrocarSenha(
        @NotBlank @Size(max = Limites.SENHA_MAXIMO) String senhaAtual,
        @SenhaForte String novaSenha) {
}

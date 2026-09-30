package br.org.apae.secretaria.acesso.autenticacao.dto;

import br.org.apae.secretaria.comum.Limites;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RequisicaoEntrar(
        @NotBlank @Size(max = Limites.USUARIO_LOGIN) String login,
        @NotBlank @Size(max = Limites.SENHA_MAXIMO) String senha) {
}

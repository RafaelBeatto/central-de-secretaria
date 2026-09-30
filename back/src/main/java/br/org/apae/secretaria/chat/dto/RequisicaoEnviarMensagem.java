package br.org.apae.secretaria.chat.dto;

import br.org.apae.secretaria.comum.Limites;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record RequisicaoEnviarMensagem(
        @NotNull Long conversaId,
        @NotBlank @Size(max = Limites.MENSAGEM_TEXTO) String texto) {
}

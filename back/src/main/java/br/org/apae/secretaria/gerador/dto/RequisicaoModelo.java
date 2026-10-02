package br.org.apae.secretaria.gerador.dto;

import br.org.apae.secretaria.comum.Limites;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** Criação/edição de modelo (old: abrirModalModeloGerador). O texto é o HTML do editor, sanitizado no serviço. */
public record RequisicaoModelo(
        @NotBlank @Size(max = Limites.GERADOR_MODELO_NOME) String nome,
        @Size(max = Limites.GERADOR_TITULO) String titulo,
        @Size(max = Limites.GERADOR_SERIE) String serie,
        @NotBlank @Size(max = Limites.GERADOR_TEXTO) String texto,
        @Pattern(regexp = "^(1|1\\.5|1\\.8|2)?$", message = "espaçamento inválido") String espacamento) {
}

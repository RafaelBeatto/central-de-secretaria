package br.org.apae.secretaria.acesso.unidade.dto;

import br.org.apae.secretaria.comum.Limites;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Criação/edição de uma unidade subordinada. Na edição, unidadePaiId é ignorado
 * (a unidade não muda de lugar na árvore).
 */
public record RequisicaoUnidade(
        @NotNull Long unidadePaiId,
        @NotBlank @Size(max = Limites.UNIDADE_NOME) String nome,
        @Pattern(regexp = "^$|^[A-Za-z]{2}$", message = "use a sigla com 2 letras") String uf,
        @Size(max = Limites.MUNICIPIO) String municipio,
        boolean ativo) {
}

package br.org.apae.secretaria.empresas.dto;

import java.time.LocalDate;

import br.org.apae.secretaria.comum.Limites;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** old/js/04-projetos.js: abrirFormDocumentoEmpresaGlobal — arquivo é obrigatório. */
public record RequisicaoEmpresaDocumento(
        @NotBlank @Size(max = Limites.EMPRESA_DOCUMENTO_NOME) String nome,
        LocalDate dataValidade,
        @Size(max = Limites.EMPRESA_DOCUMENTO_OBSERVACAO) String observacao,
        @NotNull Long arquivoId) {
}

package br.org.apae.secretaria.documentos.dto;

import java.time.LocalDate;

import br.org.apae.secretaria.comum.Limites;
import br.org.apae.secretaria.documentos.CategoriaDocumento;
import br.org.apae.secretaria.documentos.ExigenciaApae;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** Cadastro/edição de um documento (old/js/06-documentos.js: openFormDocumento). */
public record RequisicaoDocumento(
        @NotBlank @Size(max = Limites.DOCUMENTO_NOME) String nome,
        @NotNull CategoriaDocumento categoria,
        ExigenciaApae exigenciaApae,
        @Size(max = Limites.DOCUMENTO_NUMERO) String numero,
        @Size(max = Limites.DOCUMENTO_ORGAO) String orgao,
        @Size(max = Limites.RESPONSAVEL) String responsavel,
        LocalDate dataEmissao,
        LocalDate dataValidade,
        @Size(max = Limites.DOCUMENTO_LOCAL_GUARDADO) String localGuardado,
        @Size(max = Limites.DOCUMENTO_TAGS) String tags,
        @Size(max = Limites.TEXTO_LONGO) String descricao,
        @Size(max = Limites.TEXTO_LONGO) String observacoes,
        Long arquivoId) {

    @AssertTrue(message = "A validade não pode ser antes da emissão.")
    public boolean isDataValidadeValida() {
        return dataEmissao == null || dataValidade == null || !dataValidade.isBefore(dataEmissao);
    }
}

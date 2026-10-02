package br.org.apae.secretaria.documentos.dto;

import java.time.LocalDate;

import br.org.apae.secretaria.comum.Limites;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * Renovação: nova emissão/validade/número; o arquivo atual vai para "versões
 * anteriores" e só continua vinculado se {@code arquivoId} vier preenchido
 * (old/js/06-documentos.js: abrirFormRenovarDocumento).
 */
public record RequisicaoRenovarDocumento(
        @NotNull LocalDate dataEmissao,
        @NotNull LocalDate dataValidade,
        @Size(max = Limites.DOCUMENTO_NUMERO) String numero,
        Long arquivoId) {

    @AssertTrue(message = "A validade não pode ser antes da emissão.")
    public boolean isDataValidadeValida() {
        return !dataValidade.isBefore(dataEmissao);
    }
}

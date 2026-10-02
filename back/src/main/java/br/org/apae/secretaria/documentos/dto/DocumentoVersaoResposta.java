package br.org.apae.secretaria.documentos.dto;

import java.time.Instant;
import java.time.LocalDate;

import br.org.apae.secretaria.documentos.DocumentoVersao;

public record DocumentoVersaoResposta(
        Long id, String numero, LocalDate dataEmissao, LocalDate dataValidade, Long arquivoId, Instant substituidaEm) {

    public static DocumentoVersaoResposta de(DocumentoVersao v) {
        return new DocumentoVersaoResposta(v.getId(), v.getNumero(), v.getDataEmissao(), v.getDataValidade(),
                v.getArquivoId(), v.getSubstituidaEm());
    }
}

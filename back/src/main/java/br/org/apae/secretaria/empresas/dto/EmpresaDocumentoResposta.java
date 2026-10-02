package br.org.apae.secretaria.empresas.dto;

import java.time.Instant;
import java.time.LocalDate;

import br.org.apae.secretaria.empresas.EmpresaDocumento;

public record EmpresaDocumentoResposta(
        Long id, String nome, LocalDate dataValidade, String observacao, Long arquivoId, Instant criadoEm) {

    public static EmpresaDocumentoResposta de(EmpresaDocumento d) {
        return new EmpresaDocumentoResposta(d.getId(), d.getNome(), d.getDataValidade(), d.getObservacao(),
                d.getArquivoId(), d.getCriadoEm());
    }
}

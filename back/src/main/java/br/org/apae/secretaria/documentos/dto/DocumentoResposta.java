package br.org.apae.secretaria.documentos.dto;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

import br.org.apae.secretaria.documentos.CategoriaDocumento;
import br.org.apae.secretaria.documentos.Documento;
import br.org.apae.secretaria.documentos.ExigenciaApae;

public record DocumentoResposta(
        Long id, String codigo, String nome, CategoriaDocumento categoria, ExigenciaApae exigenciaApae, String numero,
        String orgao, String responsavel, LocalDate dataEmissao, LocalDate dataValidade, String localGuardado,
        String tags, String descricao, String observacoes, Long arquivoId, List<DocumentoVersaoResposta> versoes,
        Instant criadoEm, Instant atualizadoEm) {

    public static DocumentoResposta de(Documento d, List<DocumentoVersaoResposta> versoes) {
        return new DocumentoResposta(d.getId(), d.getCodigo(), d.getNome(), d.getCategoria(), d.getExigenciaApae(),
                d.getNumero(), d.getOrgao(), d.getResponsavel(), d.getDataEmissao(), d.getDataValidade(),
                d.getLocalGuardado(), d.getTags(), d.getDescricao(), d.getObservacoes(), d.getArquivoId(), versoes,
                d.getCriadoEm(), d.getAtualizadoEm());
    }
}

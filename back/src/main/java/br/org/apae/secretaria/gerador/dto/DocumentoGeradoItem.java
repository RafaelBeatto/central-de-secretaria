package br.org.apae.secretaria.gerador.dto;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

import br.org.apae.secretaria.gerador.DocumentoGerado;
import br.org.apae.secretaria.gerador.TipoVinculo;

/** Linha da lista de documentos gerados: sem o texto, mas com as respostas (a busca do antigo olhava nelas). */
public record DocumentoGeradoItem(Long id, Long modeloId, String modeloNome, String titulo, String numero,
        LocalDate dataGeracao, int versao, TipoVinculo vinculoTipo, Long vinculoId, String vinculoRotulo,
        Map<String, String> valores, Map<String, String> contexto, List<List<String>> assinaturas, int totalAnexos) {

    public static DocumentoGeradoItem de(DocumentoGerado d) {
        return new DocumentoGeradoItem(d.getId(), d.getModeloId(), d.getModeloNome(), d.getTitulo(), d.getNumero(),
                d.getDataGeracao(), d.getVersao(), d.getVinculoTipo(), d.getVinculoId(), d.getVinculoRotulo(),
                d.getValores(), d.getContexto(), d.getAssinaturas(), d.getAnexos().size());
    }
}

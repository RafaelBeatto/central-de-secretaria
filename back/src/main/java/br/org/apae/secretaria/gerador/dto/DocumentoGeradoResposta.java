package br.org.apae.secretaria.gerador.dto;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

import br.org.apae.secretaria.gerador.DocumentoGerado;
import br.org.apae.secretaria.gerador.DocumentoGeradoVersao;
import br.org.apae.secretaria.gerador.FormatoModelo;
import br.org.apae.secretaria.gerador.TipoVinculo;
import br.org.apae.secretaria.sistema.arquivo.dto.ArquivoResposta;

/** Documento completo: texto (cópia do modelo), respostas, anexos e versões anteriores. */
public record DocumentoGeradoResposta(Long id, Long modeloId, String modeloNome, String titulo, String numero,
        String texto, FormatoModelo formato, String espacamento, LocalDate dataGeracao, int versao,
        TipoVinculo vinculoTipo, Long vinculoId, String vinculoRotulo, Map<String, String> valores,
        Map<String, String> contexto, List<List<String>> assinaturas, List<ArquivoResposta> anexos,
        List<Versao> versoes) {

    public record Versao(int versao, String texto, Map<String, String> valores, Map<String, String> contexto,
            List<List<String>> assinaturas, Instant salvoEm) {

        static Versao de(DocumentoGeradoVersao v) {
            return new Versao(v.getVersao(), v.getTextoSnapshot(), v.getValores(), v.getContexto(),
                    v.getAssinaturas(), v.getSalvoEm());
        }
    }

    public static DocumentoGeradoResposta de(DocumentoGerado d, List<ArquivoResposta> anexos,
            List<DocumentoGeradoVersao> versoes) {
        return new DocumentoGeradoResposta(d.getId(), d.getModeloId(), d.getModeloNome(), d.getTitulo(),
                d.getNumero(), d.getTextoSnapshot(), d.getFormato(), d.getEspacamento(), d.getDataGeracao(),
                d.getVersao(), d.getVinculoTipo(), d.getVinculoId(), d.getVinculoRotulo(), d.getValores(),
                d.getContexto(), d.getAssinaturas(), anexos, versoes.stream().map(Versao::de).toList());
    }
}

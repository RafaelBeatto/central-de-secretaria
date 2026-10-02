package br.org.apae.secretaria.gerador.dto;

import br.org.apae.secretaria.gerador.FormatoModelo;
import br.org.apae.secretaria.gerador.ModeloDocumento;

/**
 * @param usos           quantos documentos a unidade já gerou com o modelo
 * @param proximoNumero  prévia da numeração ("003/2026"), só para modelos que usam {NUMERO}
 */
public record ModeloResposta(Long id, String nome, String titulo, String serie, String texto, FormatoModelo formato,
        String espacamento, boolean doSistema, long usos, String proximoNumero) {

    public static ModeloResposta de(ModeloDocumento m, long usos, String proximoNumero) {
        return new ModeloResposta(m.getId(), m.getNome(), m.getTitulo(), m.getSerie(), m.getTexto(), m.getFormato(),
                m.getEspacamento(), m.doSistema(), usos, proximoNumero);
    }
}

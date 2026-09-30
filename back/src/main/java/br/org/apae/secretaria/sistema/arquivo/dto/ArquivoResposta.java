package br.org.apae.secretaria.sistema.arquivo.dto;

import java.time.Instant;

import br.org.apae.secretaria.sistema.arquivo.Arquivo;
import br.org.apae.secretaria.sistema.arquivo.CategoriaArquivo;

/** Dados públicos de um arquivo (a chave do S3 nunca sai do back). */
public record ArquivoResposta(Long id, String nome, String tipo, long tamanho, CategoriaArquivo categoria, Instant criadoEm) {

    public static ArquivoResposta de(Arquivo arquivo) {
        return new ArquivoResposta(arquivo.getId(), arquivo.getNomeOriginal(), arquivo.getTipoConteudo(),
                arquivo.getTamanhoBytes(), arquivo.getCategoria(), arquivo.getCriadoEm());
    }
}

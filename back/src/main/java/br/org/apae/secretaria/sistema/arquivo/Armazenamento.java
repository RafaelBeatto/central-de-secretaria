package br.org.apae.secretaria.sistema.arquivo;

import java.io.IOException;
import java.io.InputStream;

/** Onde os arquivos ficam guardados: AWS S3 (padrão) ou uma pasta local, só no desenvolvimento sem chaves da AWS. */
public interface Armazenamento {

    /** Condição do armazenamento local: sem chaves da AWS e com a pasta configurada (vazia em produção). */
    String CONDICAO_LOCAL = "'${aplicacao.armazenamento.chave-acesso:}' == '' && '${aplicacao.armazenamento.pasta-local:}' != ''";

    void enviar(String chave, InputStream conteudo, long tamanho, String tipoConteudo) throws IOException;

    /** Link temporário para abrir o arquivo com o nome original. */
    String urlTemporaria(String chave, String nomeOriginal);

    void excluir(String chave);
}

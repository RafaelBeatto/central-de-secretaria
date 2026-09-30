package br.org.apae.secretaria.sistema.arquivo;

import java.util.Set;

/**
 * Para que o arquivo serve. Define a pasta no S3 e os formatos aceitos
 * (os mesmos que o sistema antigo aceitava em cada tela).
 */
public enum CategoriaArquivo {
    LOGO(Formatos.IMAGENS),
    DOCUMENTO(Formatos.DOCUMENTOS),
    DOCUMENTO_EMPRESA(Formatos.DOCUMENTOS),
    DOCUMENTO_RECURSO(Formatos.DOCUMENTOS),
    PLANO_APLICACAO(Formatos.DOCUMENTOS),
    COTACAO(Formatos.DOCUMENTOS),
    ORDEM_COMPRA(Formatos.DOCUMENTOS),
    DOCUMENTO_EXECUCAO(Formatos.DOCUMENTOS),
    COMPROVANTE_PAGAMENTO(Formatos.COMPROVANTES),
    ANEXO_GERADOR(Formatos.DOCUMENTOS);

    private final Set<String> extensoes;

    CategoriaArquivo(Set<String> extensoes) {
        this.extensoes = extensoes;
    }

    public boolean aceita(String extensao) {
        return extensoes.contains(extensao);
    }

    public Set<String> extensoes() {
        return extensoes;
    }

    private static final class Formatos {
        static final Set<String> IMAGENS = Set.of("png", "jpg", "jpeg", "webp");
        static final Set<String> COMPROVANTES = Set.of("pdf", "png", "jpg", "jpeg", "webp");
        static final Set<String> DOCUMENTOS = Set.of("pdf", "png", "jpg", "jpeg", "webp", "doc", "docx", "xls", "xlsx");
    }
}

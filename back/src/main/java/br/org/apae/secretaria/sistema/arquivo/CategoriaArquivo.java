package br.org.apae.secretaria.sistema.arquivo;

import java.util.Set;

/**
 * Para que o arquivo serve. Define a pasta no S3 e os formatos aceitos
 * (os mesmos que o sistema antigo aceitava em cada tela).
 */
public enum CategoriaArquivo {
    LOGO("logo", Formatos.IMAGENS),
    DOCUMENTO("documentos/gerais", Formatos.DOCUMENTOS),
    DOCUMENTO_EMPRESA("documentos/empresas", Formatos.DOCUMENTOS),
    DOCUMENTO_RECURSO("documentos/recursos", Formatos.DOCUMENTOS),
    PLANO_APLICACAO("documentos/planos-aplicacao", Formatos.DOCUMENTOS),
    COTACAO("documentos/cotacoes", Formatos.DOCUMENTOS),
    ORDEM_COMPRA("documentos/ordens-compra", Formatos.DOCUMENTOS),
    DOCUMENTO_EXECUCAO("documentos/execucao", Formatos.DOCUMENTOS),
    COMPROVANTE_PAGAMENTO("documentos/comprovantes", Formatos.COMPROVANTES),
    ANEXO_GERADOR("documentos/anexos", Formatos.DOCUMENTOS);

    private final String pasta;
    private final Set<String> extensoes;

    CategoriaArquivo(String pasta, Set<String> extensoes) {
        this.pasta = pasta;
        this.extensoes = extensoes;
    }

    /** Pasta dentro da unidade no bucket (ex.: "documentos/ordens-compra"). */
    public String pasta() {
        return pasta;
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

package br.org.apae.secretaria.documentos;

/**
 * Documentos que os projetos exigem da instituição (old/js/04-projetos.js:
 * DOCS_APAE_OBRIGATORIOS). Quando um documento vale como uma dessas exigências,
 * os projetos podem enxergá-lo em vez de pedir um anexo próprio.
 */
public enum ExigenciaApae {
    CNPJ("CNPJ"), ESTATUTO("Estatuto"), ATA_ELEICAO_POSSE("Ata de eleição/posse"),
    CERTIDAO_FEDERAL("Certidão federal"), CERTIDAO_ESTADUAL("Certidão estadual"),
    CERTIDAO_MUNICIPAL("Certidão municipal"), FGTS("FGTS"), CNDT("CNDT");

    private final String rotulo;

    ExigenciaApae(String rotulo) {
        this.rotulo = rotulo;
    }

    public String rotulo() {
        return rotulo;
    }
}

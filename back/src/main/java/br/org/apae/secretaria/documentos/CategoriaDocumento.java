package br.org.apae.secretaria.documentos;

/** Categorias oferecidas no antigo (old/js/06-documentos.js: CATEGORIAS_DOCUMENTO). */
public enum CategoriaDocumento {
    CERTIDAO("Certidão"), OFICIO("Ofício"), ATA("Ata"), CONTRATO("Contrato"), RELATORIO("Relatório"),
    DECLARACAO("Declaração"), COMPROVANTE("Comprovante"), DOCUMENTO_FINANCEIRO("Documento financeiro"),
    DOCUMENTO_INSTITUCIONAL("Documento institucional"), CONVENIO("Convênio"), OUTROS("Outros");

    private final String rotulo;

    CategoriaDocumento(String rotulo) {
        this.rotulo = rotulo;
    }

    public String rotulo() {
        return rotulo;
    }
}

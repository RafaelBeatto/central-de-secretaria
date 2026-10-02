package br.org.apae.secretaria.vinculos;

import br.org.apae.secretaria.sistema.historico.ModuloHistorico;

/** Tipos de registro que podem ser ligados entre si (os mesmos do CHECK de {@code sistema.vinculo_registro}). */
public enum TipoRegistro {
    EXECUCAO("PROJETO_LER", "PROJETO_ESCREVER", ModuloHistorico.PROJETOS),
    EMPRESA("EMPRESA_LER", "EMPRESA_ESCREVER", ModuloHistorico.EMPRESAS),
    DOCUMENTO("DOCUMENTO_LER", "DOCUMENTO_ESCREVER", ModuloHistorico.DOCUMENTOS),
    TAREFA("TAREFA_LER", "TAREFA_ESCREVER", ModuloHistorico.SECRETARIA);

    private final String permissaoLer;
    private final String permissaoEscrever;
    private final ModuloHistorico modulo;

    TipoRegistro(String permissaoLer, String permissaoEscrever, ModuloHistorico modulo) {
        this.permissaoLer = permissaoLer;
        this.permissaoEscrever = permissaoEscrever;
        this.modulo = modulo;
    }

    public String permissaoLer() {
        return permissaoLer;
    }

    public String permissaoEscrever() {
        return permissaoEscrever;
    }

    public ModuloHistorico modulo() {
        return modulo;
    }

    /**
     * Empresa ↔ execução já tem ligação própria (empresas da execução, com cotações e pagamentos);
     * não se repete como vínculo livre.
     */
    public boolean pode(TipoRegistro outro) {
        return this != outro && !(this == EXECUCAO && outro == EMPRESA) && !(this == EMPRESA && outro == EXECUCAO);
    }
}

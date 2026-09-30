package br.org.apae.secretaria.acesso.permissao;

/**
 * Códigos das permissões (tabela acesso.permissao) prontos para @PreAuthorize.
 * Uso: {@code @PreAuthorize(Permissoes.USUARIO_ESCREVER)}.
 */
public final class Permissoes {

    private Permissoes() {
    }

    private static final String TEM = "hasAuthority('";
    private static final String FIM = "')";

    public static final String AGENDA_LER = TEM + "AGENDA_LER" + FIM;
    public static final String AGENDA_ESCREVER = TEM + "AGENDA_ESCREVER" + FIM;
    public static final String TAREFA_LER = TEM + "TAREFA_LER" + FIM;
    public static final String TAREFA_ESCREVER = TEM + "TAREFA_ESCREVER" + FIM;
    public static final String ATENDIMENTO_LER = TEM + "ATENDIMENTO_LER" + FIM;
    public static final String ATENDIMENTO_ESCREVER = TEM + "ATENDIMENTO_ESCREVER" + FIM;
    public static final String PROJETO_LER = TEM + "PROJETO_LER" + FIM;
    public static final String PROJETO_ESCREVER = TEM + "PROJETO_ESCREVER" + FIM;
    public static final String DOCUMENTO_LER = TEM + "DOCUMENTO_LER" + FIM;
    public static final String DOCUMENTO_ESCREVER = TEM + "DOCUMENTO_ESCREVER" + FIM;
    public static final String GERADOR_LER = TEM + "GERADOR_LER" + FIM;
    public static final String GERADOR_ESCREVER = TEM + "GERADOR_ESCREVER" + FIM;
    public static final String EMPRESA_LER = TEM + "EMPRESA_LER" + FIM;
    public static final String EMPRESA_ESCREVER = TEM + "EMPRESA_ESCREVER" + FIM;
    public static final String HISTORICO_LER = TEM + "HISTORICO_LER" + FIM;
    public static final String RELATORIO_LER = TEM + "RELATORIO_LER" + FIM;
    public static final String USUARIO_LER = TEM + "USUARIO_LER" + FIM;
    public static final String USUARIO_ESCREVER = TEM + "USUARIO_ESCREVER" + FIM;
    public static final String UNIDADE_LER = TEM + "UNIDADE_LER" + FIM;
    public static final String UNIDADE_ESCREVER = TEM + "UNIDADE_ESCREVER" + FIM;
    public static final String PERMISSAO_LER = TEM + "PERMISSAO_LER" + FIM;
    public static final String PERMISSAO_ESCREVER = TEM + "PERMISSAO_ESCREVER" + FIM;
    public static final String INSTITUICAO_ESCREVER = TEM + "INSTITUICAO_ESCREVER" + FIM;
    public static final String CHAT_USAR = TEM + "CHAT_USAR" + FIM;
}

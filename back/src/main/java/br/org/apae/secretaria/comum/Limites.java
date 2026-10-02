package br.org.apae.secretaria.comum;

/**
 * Tamanho máximo de cada coluna texto do banco (db/apae.sql).
 * Usado ao mesmo tempo no mapeamento JPA (@Column(length)) e na validação
 * dos DTOs (@Size(max)), para que o limite nunca divirja entre as camadas.
 * O front espelha estes valores em src/constantes/limites.ts.
 */
public final class Limites {

    private Limites() {
    }

    // Pessoa / contato (reaproveitados em várias tabelas)
    public static final int NOME_PESSOA = 120;
    public static final int TELEFONE = 20;
    public static final int EMAIL = 120;
    public static final int CPF = 14;
    public static final int CNPJ = 18;
    public static final int UF = 2;
    public static final int MUNICIPIO = 100;
    public static final int RESPONSAVEL = 120;
    public static final int OBSERVACAO_CURTA = 500;
    public static final int TEXTO_LONGO = 2000;

    // Unidade
    public static final int UNIDADE_NOME = 150;
    public static final int UNIDADE_ENDERECO = 200;
    public static final int UNIDADE_CIDADE_UF = 100;
    public static final int UNIDADE_SITE = 150;
    public static final int UNIDADE_RODAPE = 500;

    // Usuário
    public static final int USUARIO_LOGIN = 50;
    public static final int USUARIO_NOME = 60;
    public static final int USUARIO_SOBRENOME = 100;
    /** O BCrypt considera no máximo 72 bytes da senha. */
    public static final int SENHA_MINIMO = 8;
    public static final int SENHA_MAXIMO = 72;

    // Arquivo
    public static final int ARQUIVO_NOME = 255;
    public static final int ARQUIVO_TIPO = 100;
    public static final int ARQUIVO_CHAVE = 300;
    public static final int ARQUIVO_CATEGORIA = 40;

    // Histórico
    public static final int HISTORICO_MODULO = 30;
    public static final int HISTORICO_ACAO = 30;
    public static final int HISTORICO_DESCRICAO = 500;

    // Chat
    public static final int MENSAGEM_TEXTO = 2000;

    // Códigos legíveis (TAR-0001, DOC-0001…)
    public static final int CODIGO = 12;

    // Secretaria
    public static final int TAREFA_TITULO = 200;
    public static final int TAREFA_CATEGORIA = 60;
    public static final int SUBTAREFA_TEXTO = 200;

    // Agenda
    public static final int EVENTO_TITULO = 200;
    public static final int EVENTO_LOCAL = 150;
    public static final int EVENTO_PARTICIPANTES = 500;

    // Atendimentos
    public static final int ATENDIMENTO_NOME = 150;
    public static final int ATENDIMENTO_REMARCADO_MOTIVO = 200;

    // Documentos
    public static final int DOCUMENTO_NOME = 200;
    public static final int DOCUMENTO_NUMERO = 60;
    public static final int DOCUMENTO_ORGAO = 150;
    public static final int DOCUMENTO_LOCAL_GUARDADO = 200;
    public static final int DOCUMENTO_TAGS = 200;

    // Empresas
    public static final int EMPRESA_RAZAO_SOCIAL = 200;
    public static final int EMPRESA_NOME_FANTASIA = 200;
    public static final int EMPRESA_ENDERECO = 250;
    public static final int EMPRESA_OBSERVACAO = 1000;
    public static final int EMPRESA_DOCUMENTO_NOME = 60;
    public static final int EMPRESA_DOCUMENTO_OBSERVACAO = 500;

    // Projetos
    public static final int PROJETO_NOME = 150;
    public static final int PROJETO_FONTE = 120;
    public static final int PROJETO_ORGAO = 150;
    public static final int PROJETO_CONVENIO = 100;
    public static final int PROJETO_CONTA = 100;
    public static final int PROJETO_OBSERVACAO = 500;
    public static final int PLANO_DESCRICAO = 4000;
    public static final int RECURSO_DOCUMENTO_NOME = 60;
    public static final int COTACAO_ITEM_DESCRICAO = 200;
    public static final int ORDEM_NUMERO = 40;
    public static final int EXECUCAO_DOCUMENTO_NOME = 150;
    public static final int PAGAMENTO_FORNECEDOR = 200;
    public static final int PAGAMENTO_FORMA = 30;
    public static final int PENDENCIA_TITULO = 200;
    public static final int PENDENCIA_DESCRICAO = 1000;

    // Gerador de documentos
    public static final int GERADOR_MODELO_NOME = 100;
    public static final int GERADOR_TITULO = 150;
    public static final int GERADOR_SERIE = 60;
    public static final int GERADOR_TEXTO = 100000;
    public static final int GERADOR_ESPACAMENTO = 4;
    public static final int GERADOR_NUMERO = 20;
    public static final int GERADOR_VINCULO_ROTULO = 200;
    public static final int GERADOR_CAMPO_NOME = 60;
    public static final int GERADOR_CAMPO_VALOR = 5000;
    public static final int GERADOR_CAMPOS_MAXIMO = 60;
    public static final int GERADOR_ASSINATURAS_MAXIMO = 10;
    public static final int GERADOR_ASSINATURA_LINHAS_MAXIMO = 5;
    public static final int GERADOR_ASSINATURA_LINHA = 150;
}

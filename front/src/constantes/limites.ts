/**
 * Tamanho máximo de cada campo, espelhando as colunas do banco
 * (back: Limites.java / db/apae.sql). Alterou lá, altere aqui.
 */
export const LIMITES = {
  // Pessoa / contato
  NOME_PESSOA: 120,
  TELEFONE: 20,
  EMAIL: 120,
  CPF: 14,
  CNPJ: 18,
  UF: 2,
  MUNICIPIO: 100,
  RESPONSAVEL: 120,
  OBSERVACAO_CURTA: 500,
  TEXTO_LONGO: 2000,

  // Unidade
  UNIDADE_NOME: 150,
  UNIDADE_ENDERECO: 200,
  UNIDADE_CIDADE_UF: 100,
  UNIDADE_SITE: 150,
  UNIDADE_RODAPE: 500,

  // Usuário
  USUARIO_LOGIN: 50,
  USUARIO_NOME: 60,
  USUARIO_SOBRENOME: 100,
  SENHA_MINIMO: 8,
  SENHA_MAXIMO: 72,

  // Arquivo (MB — o back também valida)
  ARQUIVO_TAMANHO_MB: 20,

  // Chat
  MENSAGEM_TEXTO: 2000,

  // Secretaria
  TAREFA_TITULO: 200,
  TAREFA_CATEGORIA: 60,
  SUBTAREFA_TEXTO: 200,

  // Agenda
  EVENTO_TITULO: 200,
  EVENTO_LOCAL: 150,
  EVENTO_PARTICIPANTES: 500,

  // Atendimentos
  ATENDIMENTO_NOME: 150,
  ATENDIMENTO_REMARCADO_MOTIVO: 200,
} as const;

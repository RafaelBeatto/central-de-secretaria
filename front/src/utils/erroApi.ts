/**
 * Erro padronizado das chamadas à API (a partir do ProblemDetail do back).
 * "campos" traz as mensagens por campo para exibir no formulário.
 */
export class ErroApi extends Error {
  constructor(
    public readonly status: number,
    mensagem: string,
    public readonly campos: Record<string, string> = {},
  ) {
    super(mensagem);
  }

  static de(erro: unknown): ErroApi {
    if (erro instanceof ErroApi) return erro;
    const resposta = (erro as { response?: { status: number; data?: { detail?: string; campos?: Record<string, string> } } })?.response;
    if (!resposta) {
      return new ErroApi(0, 'Sem conexão com o servidor. Verifique a internet e tente de novo.');
    }
    const dados = resposta.data ?? {};
    return new ErroApi(resposta.status, dados.detail || 'Não foi possível concluir a operação.', dados.campos ?? {});
  }
}

/** Mensagem pronta para o usuário, qualquer que seja o erro. */
export const mensagemDeErro = (erro: unknown) => ErroApi.de(erro).message;

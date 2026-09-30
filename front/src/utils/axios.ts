import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { ErroApi } from './erroApi';
import type { RespostaSessao } from 'src/types/acesso';

/**
 * Cliente HTTP único da aplicação.
 * - Envia o JWT e, quando o usuário está consultando outra unidade, o cabeçalho X-Unidade.
 * - Em 401, renova o token uma única vez (mesmo com várias chamadas simultâneas) e repete a chamada.
 * - Converte qualquer erro em ErroApi.
 */
const CHAVE_SESSAO = 'central-secretaria:sessao';

interface Tokens {
  tokenAcesso: string;
  tokenRenovacao: string;
}

let tokens: Tokens | null = lerTokens();
let unidadeVisualizada: number | null = null;
let renovacaoEmAndamento: Promise<RespostaSessao> | null = null;
let aoRenovar: (sessao: RespostaSessao) => void = () => undefined;
let aoExpirar: () => void = () => undefined;

function lerTokens(): Tokens | null {
  try {
    const texto = localStorage.getItem(CHAVE_SESSAO);
    return texto ? (JSON.parse(texto) as Tokens) : null;
  } catch {
    return null;
  }
}

export const sessao = {
  definir(resposta: RespostaSessao) {
    tokens = { tokenAcesso: resposta.tokenAcesso, tokenRenovacao: resposta.tokenRenovacao };
    localStorage.setItem(CHAVE_SESSAO, JSON.stringify(tokens));
  },
  limpar() {
    tokens = null;
    unidadeVisualizada = null;
    localStorage.removeItem(CHAVE_SESSAO);
  },
  existe: () => tokens !== null,
  tokenAcesso: () => tokens?.tokenAcesso ?? null,
  tokenRenovacao: () => tokens?.tokenRenovacao ?? null,
  /** null = a própria unidade do usuário. */
  visualizarUnidade(id: number | null) {
    unidadeVisualizada = id;
  },
  /** Chamado pelo store: atualiza o usuário após renovar e desloga quando a sessão acaba. */
  aoMudar(handlers: { renovou: (s: RespostaSessao) => void; expirou: () => void }) {
    aoRenovar = handlers.renovou;
    aoExpirar = handlers.expirou;
  },
};

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL ?? '/api' });

/** Fuso do navegador: o back usa para saber qual é o "hoje" de quem está usando. */
const fusoHorario = Intl.DateTimeFormat().resolvedOptions().timeZone;

api.interceptors.request.use((config) => {
  if (fusoHorario) config.headers['X-Fuso-Horario'] = fusoHorario;
  if (tokens) config.headers.Authorization = `Bearer ${tokens.tokenAcesso}`;
  if (unidadeVisualizada !== null) config.headers['X-Unidade'] = String(unidadeVisualizada);
  return config;
});

const ROTAS_SEM_RENOVACAO = ['/autenticacao/entrar', '/autenticacao/renovar', '/autenticacao/sair'];

api.interceptors.response.use(
  (resposta) => resposta,
  async (erro: AxiosError) => {
    const original = erro.config as (InternalAxiosRequestConfig & { _repetida?: boolean }) | undefined;
    const podeRenovar =
      erro.response?.status === 401 &&
      original &&
      !original._repetida &&
      tokens?.tokenRenovacao &&
      !ROTAS_SEM_RENOVACAO.some((rota) => original.url?.includes(rota));

    if (!podeRenovar) {
      return Promise.reject(ErroApi.de(erro));
    }
    try {
      renovacaoEmAndamento ??= api
        .post<RespostaSessao>('/autenticacao/renovar', { tokenRenovacao: tokens!.tokenRenovacao })
        .then((r) => r.data)
        .finally(() => {
          renovacaoEmAndamento = null;
        });
      const nova = await renovacaoEmAndamento;
      sessao.definir(nova);
      aoRenovar(nova);
      original._repetida = true;
      return api(original);
    } catch {
      sessao.limpar();
      aoExpirar();
      return Promise.reject(new ErroApi(401, 'Sua sessão expirou. Entre novamente.'));
    }
  },
);

/** Renova o token antes de abrir o WebSocket (que não passa pelos interceptadores). */
export async function tokenValidoParaWebSocket(): Promise<string | null> {
  try {
    await api.get('/autenticacao/eu');
  } catch {
    return null;
  }
  return sessao.tokenAcesso();
}

export default api;

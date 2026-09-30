import api from 'src/utils/axios';
import type { RespostaSessao, UsuarioSessao } from 'src/types/acesso';

export const servicoAutenticacao = {
  entrar: (login: string, senha: string) =>
    api.post<RespostaSessao>('/autenticacao/entrar', { login, senha }).then((r) => r.data),

  sair: (tokenRenovacao: string) => api.post('/autenticacao/sair', { tokenRenovacao }),

  eu: () => api.get<UsuarioSessao>('/autenticacao/eu').then((r) => r.data),

  trocarSenha: (senhaAtual: string, novaSenha: string) =>
    api.put<UsuarioSessao>('/autenticacao/senha', { senhaAtual, novaSenha }).then((r) => r.data),
};

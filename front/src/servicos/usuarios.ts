import api from 'src/utils/axios';
import type { Cargo, Pagina, UsuarioDetalhe, UsuarioResumo } from 'src/types/acesso';

export interface DadosUsuario {
  nome: string;
  sobrenome: string;
  telefone: string;
  email: string;
  dataNascimento: string;
  cargoId: number | '';
  unidadeId: number | '';
}

export interface RequisicaoCriarUsuario extends DadosUsuario {
  login: string;
  senhaProvisoria: string;
}

export const servicoUsuarios = {
  listar: (busca: string, pagina: number, tamanho: number) =>
    api
      .get<Pagina<UsuarioResumo>>('/usuarios', { params: { busca: busca || undefined, page: pagina, size: tamanho } })
      .then((r) => r.data),
  detalhe: (id: number) => api.get<UsuarioDetalhe>(`/usuarios/${id}`).then((r) => r.data),
  cargosAtribuiveis: (unidadeId?: number) =>
    api.get<Cargo[]>('/usuarios/cargos-atribuiveis', { params: { unidadeId } }).then((r) => r.data),
  criar: (dados: RequisicaoCriarUsuario) => api.post<UsuarioDetalhe>('/usuarios', dados).then((r) => r.data),
  atualizar: (id: number, dados: DadosUsuario) =>
    api.put<UsuarioDetalhe>(`/usuarios/${id}`, dados).then((r) => r.data),
  alterarSituacao: (id: number, ativo: boolean) =>
    api.patch<UsuarioDetalhe>(`/usuarios/${id}/situacao`, { ativo }).then((r) => r.data),
  redefinirSenha: (id: number, senhaProvisoria: string) =>
    api.put(`/usuarios/${id}/senha`, { senhaProvisoria }),
};

import api from 'src/utils/axios';
import type { UnidadeDetalhe, UnidadeResumo } from 'src/types/acesso';

export interface RequisicaoUnidade {
  unidadePaiId: number;
  nome: string;
  uf: string;
  municipio: string;
  ativo: boolean;
}

export type RequisicaoDadosInstitucionais = Omit<
  UnidadeDetalhe,
  'id' | 'tipo' | 'uf' | 'municipio' | 'unidadePaiId' | 'ativo'
>;

export const servicoUnidades = {
  arvore: () => api.get<UnidadeResumo[]>('/unidades/arvore').then((r) => r.data),
  atual: () => api.get<UnidadeDetalhe>('/unidades/atual').then((r) => r.data),
  detalhe: (id: number) => api.get<UnidadeDetalhe>(`/unidades/${id}`).then((r) => r.data),
  criar: (dados: RequisicaoUnidade) => api.post<UnidadeDetalhe>('/unidades', dados).then((r) => r.data),
  atualizar: (id: number, dados: RequisicaoUnidade) =>
    api.put<UnidadeDetalhe>(`/unidades/${id}`, dados).then((r) => r.data),
  salvarDadosInstitucionais: (dados: RequisicaoDadosInstitucionais) =>
    api.put<UnidadeDetalhe>('/unidades/minha/dados-institucionais', dados).then((r) => r.data),
};

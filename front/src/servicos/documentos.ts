import api from 'src/utils/axios';
import type { HistoricoRegistro } from 'src/types/comum';
import type { Documento, RequisicaoDocumento, RequisicaoRenovarDocumento } from 'src/types/documentos';

const u = (id: number, resto = '') => `/documentos/${id}${resto}`;
const dados = <T>(r: { data: T }) => r.data;
const ouNulo = (valor: string) => valor || null;

/** Converte o formulário para o formato do back (vazio → null). */
const paraApi = (d: RequisicaoDocumento) => ({
  ...d,
  exigenciaApae: ouNulo(d.exigenciaApae),
  dataEmissao: ouNulo(d.dataEmissao),
  dataValidade: ouNulo(d.dataValidade),
});

export const servicoDocumentos = {
  listar: () => api.get<Documento[]>('/documentos').then(dados),
  detalhe: (id: number) => api.get<Documento>(u(id)).then(dados),
  historico: (id: number) => api.get<HistoricoRegistro[]>(u(id, '/historico')).then(dados),

  criar: (d: RequisicaoDocumento) => api.post<Documento>('/documentos', paraApi(d)).then(dados),
  atualizar: (id: number, d: RequisicaoDocumento) => api.put<Documento>(u(id), paraApi(d)).then(dados),
  renovar: (id: number, r: RequisicaoRenovarDocumento) => api.post<Documento>(u(id, '/renovar'), r).then(dados),
  excluir: (id: number) => api.delete(u(id)),
};

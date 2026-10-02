import api from 'src/utils/axios';
import type { HistoricoRegistro } from 'src/types/comum';
import type {
  DocumentoGerado,
  DocumentoGeradoItem,
  ModeloDocumento,
  RequisicaoDocumentoGerado,
  RequisicaoModelo,
} from 'src/types/gerador';

const dados = <T>(r: { data: T }) => r.data;
const d = (id: number, resto = '') => `/gerador/documentos/${id}${resto}`;
const semEspacamentoVazio = (r: RequisicaoModelo) => ({ ...r, espacamento: r.espacamento || null });

export const servicoGerador = {
  // ---------- modelos ----------
  modelos: () => api.get<ModeloDocumento[]>('/gerador/modelos').then(dados),
  criarModelo: (r: RequisicaoModelo) => api.post<ModeloDocumento>('/gerador/modelos', semEspacamentoVazio(r)).then(dados),
  atualizarModelo: (id: number, r: RequisicaoModelo) =>
    api.put<ModeloDocumento>(`/gerador/modelos/${id}`, semEspacamentoVazio(r)).then(dados),
  duplicarModelo: (id: number) => api.post<ModeloDocumento>(`/gerador/modelos/${id}/duplicar`).then(dados),
  excluirModelo: (id: number) => api.delete(`/gerador/modelos/${id}`),

  // ---------- documentos gerados ----------
  documentos: () => api.get<DocumentoGeradoItem[]>('/gerador/documentos').then(dados),
  documento: (id: number) => api.get<DocumentoGerado>(d(id)).then(dados),
  historico: (id: number) => api.get<HistoricoRegistro[]>(d(id, '/historico')).then(dados),
  gerar: (r: RequisicaoDocumentoGerado) => api.post<DocumentoGerado>('/gerador/documentos', r).then(dados),
  atualizar: (id: number, r: RequisicaoDocumentoGerado) => api.put<DocumentoGerado>(d(id), r).then(dados),
  duplicar: (id: number) => api.post<DocumentoGerado>(d(id, '/duplicar')).then(dados),
  excluir: (id: number) => api.delete(d(id)),
  anexar: (id: number, arquivoId: number) => api.post<DocumentoGerado>(d(id, '/anexos'), { arquivoId }).then(dados),
  removerAnexo: (id: number, arquivoId: number) => api.delete<DocumentoGerado>(d(id, `/anexos/${arquivoId}`)).then(dados),
};

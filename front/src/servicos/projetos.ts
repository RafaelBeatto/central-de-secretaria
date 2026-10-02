import api from 'src/utils/axios';
import type { HistoricoRegistro, Prioridade } from 'src/types/comum';
import type {
  CategoriaDocumentoExecucao,
  EmpresaNosProjetos,
  ExecucaoDetalhe,
  ExecucaoResumo,
  ItemCotacao,
  RecursoDetalhe,
  RecursoResumo,
  RequisicaoExecucao,
  RequisicaoRecurso,
  StatusExecucao,
  StatusOrdemCompra,
} from 'src/types/projetos';

const dados = <T>(r: { data: T }) => r.data;
const r = (id: number, resto = '') => `/projetos/recursos/${id}${resto}`;
const e = (id: number, resto = '') => `/projetos/execucoes/${id}${resto}`;
/** Datas vazias do formulário viram null. */
const semVazios = <T extends object>(o: T) =>
  Object.fromEntries(Object.entries(o).map(([k, v]) => [k, v === '' ? null : v])) as T;

export const servicoProjetos = {
  // recursos
  recursos: (arquivados = false) => api.get<RecursoResumo[]>('/projetos/recursos', { params: { arquivados } }).then(dados),
  recurso: (id: number) => api.get<RecursoDetalhe>(r(id)).then(dados),
  historicoRecurso: (id: number) => api.get<HistoricoRegistro[]>(r(id, '/historico')).then(dados),
  criarRecurso: (req: RequisicaoRecurso) => api.post<RecursoDetalhe>('/projetos/recursos', semVazios(req)).then(dados),
  atualizarRecurso: (id: number, req: RequisicaoRecurso) => api.put<RecursoDetalhe>(r(id), semVazios(req)).then(dados),
  excluirRecurso: (id: number) => api.delete(r(id)),
  arquivar: (id: number, arquivado: boolean) => api.patch<RecursoDetalhe>(r(id, '/arquivado'), { arquivado }).then(dados),
  adicionarDocumentoRecurso: (id: number, req: { nome: string; observacao: string; arquivoId: number | null }) =>
    api.post<RecursoDetalhe>(r(id, '/documentos'), req).then(dados),
  excluirDocumentoRecurso: (id: number, documentoId: number) =>
    api.delete<RecursoDetalhe>(r(id, `/documentos/${documentoId}`)).then(dados),
  transferir: (id: number, req: { origemId: number | ''; destinoId: number | ''; valor: number | ''; motivo: string }) =>
    api.post<RecursoDetalhe>(r(id, '/transferencias'), req).then(dados),

  // execuções
  criarExecucao: (recursoId: number, req: RequisicaoExecucao) =>
    api.post<ExecucaoDetalhe>(r(recursoId, '/execucoes'), semVazios(req)).then(dados),
  execucoesDoKanban: () => api.get<ExecucaoResumo[]>('/projetos/execucoes').then(dados),
  execucao: (id: number) => api.get<ExecucaoDetalhe>(e(id)).then(dados),
  historicoExecucao: (id: number) => api.get<HistoricoRegistro[]>(e(id, '/historico')).then(dados),
  atualizarExecucao: (id: number, req: RequisicaoExecucao) => api.put<ExecucaoDetalhe>(e(id), semVazios(req)).then(dados),
  alterarStatus: (id: number, status: StatusExecucao) => api.patch<ExecucaoResumo>(e(id, '/status'), { status }).then(dados),
  excluirExecucao: (id: number) => api.delete(e(id)),
  salvarPlano: (id: number, req: { descricao: string; arquivoId: number | null }) =>
    api.put<ExecucaoDetalhe>(e(id, '/plano'), req).then(dados),
  vincularEmpresa: (id: number, empresaId: number) => api.post<ExecucaoDetalhe>(e(id, '/empresas'), { empresaId }).then(dados),
  desvincularEmpresa: (id: number, vinculoId: number) => api.delete<ExecucaoDetalhe>(e(id, `/empresas/${vinculoId}`)).then(dados),

  adicionarCotacao: (id: number, req: { empresaId: number | ''; data: string; itens: ItemCotacao[]; valorTotal: number | ''; observacao: string; arquivoId: number | null }) =>
    api.post<ExecucaoDetalhe>(e(id, '/cotacoes'), semVazios(req)).then(dados),
  escolherVencedora: (id: number, cotacaoId: number) => api.post<ExecucaoDetalhe>(e(id, `/cotacoes/${cotacaoId}/vencedora`)).then(dados),
  excluirCotacao: (id: number, cotacaoId: number) => api.delete<ExecucaoDetalhe>(e(id, `/cotacoes/${cotacaoId}`)).then(dados),
  adicionarOrdem: (id: number, req: { numero: string; data: string; valor: number | ''; status: StatusOrdemCompra; arquivoId: number | null }) =>
    api.post<ExecucaoDetalhe>(e(id, '/ordens'), semVazios(req)).then(dados),
  excluirOrdem: (id: number, ordemId: number) => api.delete<ExecucaoDetalhe>(e(id, `/ordens/${ordemId}`)).then(dados),
  adicionarDocumento: (id: number, req: { nome: string; categoria: CategoriaDocumentoExecucao; data: string; arquivoId: number | null }) =>
    api.post<ExecucaoDetalhe>(e(id, '/documentos'), semVazios(req)).then(dados),
  excluirDocumento: (id: number, documentoId: number) => api.delete<ExecucaoDetalhe>(e(id, `/documentos/${documentoId}`)).then(dados),
  adicionarPagamento: (id: number, req: { empresaId: number | ''; fornecedor: string; data: string; valor: number | ''; forma: string; arquivoId: number | null }) =>
    api.post<ExecucaoDetalhe>(e(id, '/pagamentos'), semVazios(req)).then(dados),
  excluirPagamento: (id: number, pagamentoId: number) => api.delete<ExecucaoDetalhe>(e(id, `/pagamentos/${pagamentoId}`)).then(dados),
  adicionarPendencia: (id: number, req: { titulo: string; prioridade: Prioridade; descricao: string }) =>
    api.post<ExecucaoDetalhe>(e(id, '/pendencias'), req).then(dados),
  concluirPendencia: (id: number, pendenciaId: number, concluida: boolean) =>
    api.patch<ExecucaoDetalhe>(e(id, `/pendencias/${pendenciaId}`), { concluida }).then(dados),
  excluirPendencia: (id: number, pendenciaId: number) => api.delete<ExecucaoDetalhe>(e(id, `/pendencias/${pendenciaId}`)).then(dados),

  daEmpresa: (empresaId: number) => api.get<EmpresaNosProjetos>(`/projetos/empresas/${empresaId}`).then(dados),
};

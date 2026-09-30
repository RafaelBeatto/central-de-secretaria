import api from 'src/utils/axios';
import type { HistoricoRegistro } from 'src/types/comum';
import type {
  AlunoAtendimento,
  AtendimentoResposta,
  ProfissionalAtendimento,
  RequisicaoAtendimentoLote,
  RequisicaoNovoAtendimento,
  RequisicaoPresenca,
  RequisicaoRemarcar,
} from 'src/types/atendimentos';

const u = (id: number, resto = '') => `/atendimentos/${id}${resto}`;
const dados = <T>(r: { data: T }) => r.data;

function paraApi(a: RequisicaoNovoAtendimento) {
  return { ...a, repetirAte: a.semanal && a.repetirAte ? a.repetirAte : null };
}

export const servicoAtendimentos = {
  itens: (inicio: string, fim: string) => api.get<AtendimentoResposta[]>('/atendimentos', { params: { inicio, fim } }).then(dados),
  detalhe: (id: number) => api.get<AtendimentoResposta>(u(id)).then(dados),
  historico: (id: number) => api.get<HistoricoRegistro[]>(u(id, '/historico')).then(dados),

  criar: (a: RequisicaoNovoAtendimento) => api.post<AtendimentoResposta>('/atendimentos', paraApi(a)).then(dados),
  criarLote: (r: RequisicaoAtendimentoLote) => api.post<number>('/atendimentos/lote', r).then(dados),
  copiarSemanaAnterior: (segunda: string) => api.post<number>('/atendimentos/copiar-semana', null, { params: { segunda } }).then(dados),

  atualizarPresenca: (id: number, r: RequisicaoPresenca) =>
    api.patch<AtendimentoResposta>(u(id, '/presenca'), { ...r, faltaMotivo: r.faltaMotivo || null }).then(dados),
  remarcar: (id: number, r: RequisicaoRemarcar) =>
    api.post<AtendimentoResposta>(u(id, '/remarcar'), { ...r, profissionalId: r.profissionalId || null }).then(dados),
  excluir: (id: number) => api.delete(u(id)),
  encerrarSerie: (id: number) => api.post<number>(u(id, '/encerrar-serie')).then(dados),

  // ---------- alunos ----------
  listarAlunos: () => api.get<AlunoAtendimento[]>('/atendimentos/alunos').then(dados),
  historicoDoAluno: (id: number) => api.get<AtendimentoResposta[]>(`/atendimentos/alunos/${id}/historico`).then(dados),
  renomearAluno: (id: number, nome: string) => api.put(`/atendimentos/alunos/${id}`, { nome }),
  mesclarAluno: (id: number, destinoId: number) => api.post(`/atendimentos/alunos/${id}/mesclar`, { destinoId }),
  excluirAluno: (id: number) => api.delete(`/atendimentos/alunos/${id}`),
  contatoFamilia: (id: number) => api.post(`/atendimentos/alunos/${id}/contato-familia`),

  // ---------- profissionais ----------
  listarProfissionais: () => api.get<ProfissionalAtendimento[]>('/atendimentos/profissionais').then(dados),
  historicoDoProfissional: (id: number) => api.get<AtendimentoResposta[]>(`/atendimentos/profissionais/${id}/historico`).then(dados),
  renomearProfissional: (id: number, nome: string) => api.put(`/atendimentos/profissionais/${id}`, { nome }),
  mesclarProfissional: (id: number, destinoId: number) => api.post(`/atendimentos/profissionais/${id}/mesclar`, { destinoId }),
  excluirProfissional: (id: number) => api.delete(`/atendimentos/profissionais/${id}`),
};

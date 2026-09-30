import api from 'src/utils/axios';
import type { HistoricoRegistro, Prioridade } from 'src/types/comum';
import type { RequisicaoTarefa, StatusTarefa, SugestoesTarefa, Tarefa } from 'src/types/tarefas';

const u = (id: number, resto = '') => `/tarefas/${id}${resto}`;
const dados = <T>(r: { data: T }) => r.data;

/** Converte o formulário para o formato do back (vazio → null). */
function paraApi(t: RequisicaoTarefa) {
  return {
    ...t,
    horario: t.horario || null,
    frequencia: t.frequencia || null,
    diaSemana: t.frequencia === 'SEMANAL' ? t.diaSemana : null,
    diaMes: t.frequencia === 'MENSAL' ? t.diaMes : null,
  };
}

export const servicoTarefas = {
  ativas: (concluidasDesde?: string) => api.get<Tarefa[]>('/tarefas', { params: { concluidasDesde } }).then(dados),
  encerradas: (limite = 50) => api.get<Tarefa[]>('/tarefas/encerradas', { params: { limite } }).then(dados),
  detalhe: (id: number) => api.get<Tarefa>(u(id)).then(dados),
  historico: (id: number) => api.get<HistoricoRegistro[]>(u(id, '/historico')).then(dados),
  sugestoes: () => api.get<SugestoesTarefa>('/tarefas/sugestoes').then(dados),

  criar: (t: RequisicaoTarefa) => api.post<Tarefa>('/tarefas', paraApi(t)).then(dados),
  criarRapida: (titulo: string, extras: { prazo?: string | null; status?: StatusTarefa; responsavel?: string } = {}) =>
    api.post<Tarefa>('/tarefas/rapida', { titulo, ...extras }).then(dados),
  atualizar: (id: number, t: RequisicaoTarefa) => api.put<Tarefa>(u(id), paraApi(t)).then(dados),
  excluir: (id: number) => api.delete(u(id)),

  concluir: (id: number) => api.post<Tarefa>(u(id, '/concluir')).then(dados),
  reabrir: (id: number) => api.post<Tarefa>(u(id, '/reabrir')).then(dados),
  alterarStatus: (id: number, status: StatusTarefa) => api.patch<Tarefa>(u(id, '/status'), { status }).then(dados),
  alterarPrioridade: (id: number, prioridade: Prioridade) =>
    api.patch<Tarefa>(u(id, '/prioridade'), { prioridade }).then(dados),
  moverPara: (id: number, data: string) => api.patch<Tarefa>(u(id, '/data'), { data }).then(dados),

  adicionarSubtarefa: (id: number, texto: string) => api.post<Tarefa>(u(id, '/subtarefas'), { texto }).then(dados),
  marcarSubtarefa: (id: number, subtarefaId: number, feita: boolean) =>
    api.patch<Tarefa>(u(id, `/subtarefas/${subtarefaId}`), { feita }).then(dados),
  removerSubtarefa: (id: number, subtarefaId: number) =>
    api.delete<Tarefa>(u(id, `/subtarefas/${subtarefaId}`)).then(dados),
};

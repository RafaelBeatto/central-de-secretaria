import api from 'src/utils/axios';
import type { HistoricoRegistro } from 'src/types/comum';
import type { EscopoSerie, EventoDetalhe, ItemAgenda, RequisicaoEvento } from 'src/types/agenda';

const u = (id: number, resto = '') => `/agenda/eventos/${id}${resto}`;
const dados = <T>(r: { data: T }) => r.data;

/** Converte o formulário para o formato do back (vazio → null). */
function paraApi(e: RequisicaoEvento) {
  return {
    ...e,
    horarioInicio: e.horarioInicio || null,
    horarioFim: e.horarioFim || null,
    tarefaId: e.tarefaId || null,
    frequencia: e.frequencia || null,
    repetirAte: e.frequencia && e.repetirAte ? e.repetirAte : null,
  };
}

export const servicoAgenda = {
  /** Eventos, tarefas e prazos do período (até 100 dias). */
  itens: (inicio: string, fim: string) => api.get<ItemAgenda[]>('/agenda', { params: { inicio, fim } }).then(dados),
  detalhe: (id: number) => api.get<EventoDetalhe>(u(id)).then(dados),
  historico: (id: number) => api.get<HistoricoRegistro[]>(u(id, '/historico')).then(dados),

  criar: (e: RequisicaoEvento) => api.post<EventoDetalhe>('/agenda/eventos', paraApi(e)).then(dados),
  atualizar: (id: number, e: RequisicaoEvento) => api.put<EventoDetalhe>(u(id), paraApi(e)).then(dados),
  /** Devolve quantas datas foram excluídas. */
  excluir: (id: number, escopo: EscopoSerie = 'SO_ESTA') => api.delete<number>(u(id), { params: { escopo } }).then(dados),

  concluir: (id: number) => api.post<EventoDetalhe>(u(id, '/concluir')).then(dados),
  reabrir: (id: number) => api.post<EventoDetalhe>(u(id, '/reabrir')).then(dados),
  moverPara: (id: number, data: string) => api.patch<EventoDetalhe>(u(id, '/data'), { data }).then(dados),
};

import type { Frequencia, Prioridade } from './comum';

export type TipoEvento = 'REUNIAO' | 'ATENDIMENTO' | 'COMPROMISSO' | 'EVENTO' | 'VISITA' | 'OUTRO';
export type OrigemItemAgenda = 'EVENTO' | 'TAREFA' | 'DOCUMENTO' | 'PROJETO';
/** Filtro da legenda: documento e projeto aparecem juntos como "Prazos". */
export type GrupoOrigem = 'EVENTO' | 'TAREFA' | 'PRAZO';
export type EscopoSerie = 'SO_ESTA' | 'ESTA_E_PROXIMAS' | 'TODAS';
export type ModoAgenda = 'semana' | 'mes' | 'lista';

export const ROTULO_TIPO_EVENTO: Record<TipoEvento, string> = {
  REUNIAO: 'Reunião',
  ATENDIMENTO: 'Atendimento',
  COMPROMISSO: 'Compromisso',
  EVENTO: 'Evento',
  VISITA: 'Visita',
  OUTRO: 'Outro',
};

export const ROTULO_GRUPO_ORIGEM: Record<GrupoOrigem, string> = { EVENTO: 'Eventos', TAREFA: 'Tarefas', PRAZO: 'Prazos' };

/** Qualquer coisa com data na agenda (evento, tarefa ou prazo de outro módulo). */
export interface ItemAgenda {
  chave: string;
  origem: OrigemItemAgenda;
  refId: number;
  titulo: string;
  tipoEvento: TipoEvento | null;
  prioridade: Prioridade;
  data: string;
  horarioInicio: string | null;
  horarioFim: string | null;
  local: string | null;
  responsavel: string | null;
  participantes: string | null;
  descricao: string | null;
  concluido: boolean;
  serieId: number | null;
  recorrente: boolean;
}

export interface EventoDetalhe {
  id: number;
  titulo: string;
  tipo: TipoEvento;
  prioridade: Prioridade;
  data: string;
  horarioInicio: string | null;
  horarioFim: string | null;
  local: string | null;
  responsavel: string | null;
  participantes: string | null;
  descricao: string | null;
  concluido: boolean;
  concluidoEm: string | null;
  tarefaId: number | null;
  tarefaTitulo: string | null;
  serieId: number | null;
  frequencia: Frequencia | null;
  repetirAte: string | null;
  /** Posição desta data na série (1 quando não se repete). */
  posicao: number;
  total: number;
  primeiraData: string;
  ultimaData: string;
  /** Esta e as próximas. */
  restantes: number;
  criadoEm: string;
  atualizadoEm: string;
}

export interface RequisicaoEvento {
  titulo: string;
  data: string;
  tipo: TipoEvento;
  prioridade: Prioridade;
  horarioInicio: string;
  horarioFim: string;
  local: string;
  responsavel: string;
  participantes: string;
  descricao: string;
  tarefaId: number | '';
  frequencia: Frequencia | '';
  repetirAte: string;
  escopo: EscopoSerie;
}

import type { Frequencia, Prioridade } from './comum';

export type StatusTarefa = 'PENDENTE' | 'EM_ANDAMENTO' | 'AGUARDANDO' | 'CONCLUIDA' | 'CANCELADA';

export const ROTULO_STATUS_TAREFA: Record<StatusTarefa, string> = {
  PENDENTE: 'Pendente',
  EM_ANDAMENTO: 'Em andamento',
  AGUARDANDO: 'Aguardando',
  CONCLUIDA: 'Concluída',
  CANCELADA: 'Cancelada',
};

export interface Subtarefa {
  id: number;
  texto: string;
  feita: boolean;
}

export interface Tarefa {
  id: number;
  codigo: string;
  titulo: string;
  descricao: string | null;
  responsavel: string | null;
  categoria: string | null;
  prioridade: Prioridade;
  status: StatusTarefa;
  prazo: string | null;
  horario: string | null;
  dataConclusao: string | null;
  frequencia: Frequencia | null;
  diaSemana: number | null;
  diaMes: number | null;
  proxima: string | null;
  ultimaOcorrencia: string | null;
  ultimaConclusao: string | null;
  recorrente: boolean;
  prazoEfetivo: string | null;
  feitaHoje: boolean;
  subtarefas: Subtarefa[];
  criadoEm: string;
  atualizadoEm: string;
}

export interface RequisicaoTarefa {
  titulo: string;
  prioridade: Prioridade;
  prazo: string;
  horario: string;
  frequencia: Frequencia | '';
  diaSemana: number;
  diaMes: number;
  responsavel: string;
  categoria: string;
  descricao: string;
}

export interface SugestoesTarefa {
  responsaveis: string[];
  categorias: string[];
}

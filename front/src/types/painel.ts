/** Painel e Pendências (back: painel/*). */
import type { Prioridade } from './comum';
import type { ItemAgenda } from './agenda';
import type { AtendimentoResposta, MotivoFalta } from './atendimentos';
import type { Documento } from './documentos';
import type { RecursoResumo } from './projetos';
import type { Tarefa } from './tarefas';

export interface AtendimentoSemPresenca {
  id: number;
  alunoNome: string;
  profissionalNome: string;
  data: string;
  horario: string;
}

export interface AlunoComFaltas {
  alunoId: number;
  alunoNome: string;
  quantidade: number;
  desde: string;
  ultima: string;
  motivos: MotivoFalta[];
}

export interface PendenciaExecucao {
  id: number;
  execucaoId: number;
  titulo: string;
  prioridade: Prioridade;
}

export interface ExtrasPainel {
  atendimentosSemPresenca: AtendimentoSemPresenca[];
  alunosComFaltas: AlunoComFaltas[];
  pendenciasExecucao: PendenciaExecucao[];
}

/** Tudo que o Painel e as Pendências leem; o que o usuário não pode ver vem vazio. */
export interface DadosPainel {
  tarefas: Tarefa[];
  documentos: Documento[];
  agenda: ItemAgenda[];
  recursos: RecursoResumo[];
  atendimentosSemana: AtendimentoResposta[];
  extras: ExtrasPainel;
}

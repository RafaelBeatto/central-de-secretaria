export type Presenca = 'NAO_INFORMADO' | 'VEIO' | 'FALTOU';
export type MotivoFalta = 'DOENCA' | 'CONSULTA_MEDICA' | 'TRANSPORTE' | 'NAO_AVISOU' | 'COMPROMISSO' | 'OUTRO';

export const ROTULO_PRESENCA: Record<Presenca, string> = {
  NAO_INFORMADO: 'Sem registro',
  VEIO: 'Veio',
  FALTOU: 'Faltou',
};

export const ROTULO_MOTIVO_FALTA: Record<MotivoFalta, string> = {
  DOENCA: 'Doença',
  CONSULTA_MEDICA: 'Consulta médica',
  TRANSPORTE: 'Transporte',
  NAO_AVISOU: 'Não avisou',
  COMPROMISSO: 'Compromisso',
  OUTRO: 'Outro',
};

export interface AlunoAtendimento {
  id: number;
  nome: string;
  faltasContatoAte: string | null;
  totalAtendimentos: number;
}

export interface ProfissionalAtendimento {
  id: number;
  nome: string;
  totalAtendimentos: number;
}

/** Atendimento para a faixa de dias e o painel (old/js/19-atendimentos.js). */
export interface AtendimentoResposta {
  id: number;
  alunoId: number;
  alunoNome: string;
  profissionalId: number;
  profissionalNome: string;
  data: string;
  horario: string;
  observacao: string | null;
  presenca: Presenca;
  faltaMotivo: MotivoFalta | null;
  faltaObservacao: string | null;
  remarcado: boolean;
  remarcadoMotivo: string | null;
  remarcadoDeId: number | null;
  remarcadoDeData: string | null;
  remarcadoDeHorario: string | null;
  remarcadoParaId: number | null;
  remarcadoParaData: string | null;
  remarcadoParaHorario: string | null;
  remarcadoParaProfissionalNome: string | null;
  serieId: string | null;
  restantesNaSerie: number;
  criadoEm: string;
  atualizadoEm: string;
}

export interface RequisicaoNovoAtendimento {
  alunoNome: string;
  profissionalNome: string;
  data: string;
  horario: string;
  observacao: string;
  semanal: boolean;
  repetirAte: string;
}

export interface LinhaLoteAtendimento {
  alunoNome: string;
  profissionalNome: string;
  data: string;
  horario: string;
}

export interface RequisicaoAtendimentoLote {
  semanal: boolean;
  linhas: LinhaLoteAtendimento[];
}

export interface RequisicaoPresenca {
  presenca: Presenca;
  faltaMotivo: MotivoFalta | '';
  faltaObservacao: string;
}

export interface RequisicaoRemarcar {
  data: string;
  horario: string;
  profissionalId: number | '';
  motivo: string;
}

/** Resumo da semana ou do período (calculado no front a partir da lista carregada). */
export interface ResumoAtendimentos {
  total: number;
  veio: number;
  faltou: number;
  semRegistro: number;
  semRegistroPassado: number;
  taxa: number | null;
}

/** Sequência de faltas mais recentes de um aluno (aviso de "família contatada"). */
export interface FaltasSeguidas {
  quantidade: number;
  desde: string | null;
  ultima: string | null;
  motivos: MotivoFalta[];
}

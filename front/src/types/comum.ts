/** Tipos compartilhados entre módulos. */

export type Prioridade = 'BAIXA' | 'MEDIA' | 'ALTA' | 'URGENTE';
export type Frequencia = 'DIARIA' | 'SEMANAL' | 'MENSAL' | 'ANUAL';

export const ROTULO_PRIORIDADE: Record<Prioridade, string> = {
  BAIXA: 'Baixa',
  MEDIA: 'Média',
  ALTA: 'Alta',
  URGENTE: 'Urgente',
};
export const PESO_PRIORIDADE: Record<Prioridade, number> = { BAIXA: 1, MEDIA: 2, ALTA: 3, URGENTE: 4 };
export const COR_PRIORIDADE: Record<Prioridade, 'default' | 'primary' | 'warning' | 'error'> = {
  BAIXA: 'default',
  MEDIA: 'primary',
  ALTA: 'warning',
  URGENTE: 'error',
};

export const ROTULO_FREQUENCIA: Record<Frequencia, string> = {
  DIARIA: 'Diária',
  SEMANAL: 'Semanal',
  MENSAL: 'Mensal',
  ANUAL: 'Anual',
};

export interface HistoricoRegistro {
  id: number;
  modulo: string;
  acao: string;
  descricao: string;
  usuarioNome: string | null;
  criadoEm: string;
}

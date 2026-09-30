import type { GrupoOrigem } from 'src/types/agenda';

/** Cor de cada origem (legenda, chips, pontos do mês e linhas). */
export const COR_ORIGEM: Record<GrupoOrigem, 'primary' | 'secondary' | 'warning'> = {
  EVENTO: 'primary',
  TAREFA: 'secondary',
  PRAZO: 'warning',
};

/** Tipo arrastado entre dias (dataTransfer), com a chave do item. */
export const TIPO_ARRASTE = 'application/x-agenda-item';

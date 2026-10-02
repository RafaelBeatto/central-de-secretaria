import api from 'src/utils/axios';
import type { HistoricoRegistro } from 'src/types/comum';

export const servicoHistorico = {
  /** Ações do período: [desde, ate) em instantes (meia-noite local de cada dia). */
  doPeriodo: (desde: Date, ate: Date) =>
    api.get<HistoricoRegistro[]>('/historico', { params: { desde: desde.toISOString(), ate: ate.toISOString() } }).then((r) => r.data),
};

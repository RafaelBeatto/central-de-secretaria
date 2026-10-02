import api from 'src/utils/axios';
import type { RelatorioAtividades, SecaoRelatorio } from 'src/types/relatorios';

export const servicoRelatorios = {
  atividades: (de: string, ate: string, secoes: SecaoRelatorio[]) =>
    api.get<RelatorioAtividades>('/relatorios/atividades', { params: { de, ate, secoes: secoes.join(',') } }).then((r) => r.data),
};

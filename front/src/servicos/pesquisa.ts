import api from 'src/utils/axios';
import type { ResultadoPesquisa } from 'src/types/pesquisa';

export const servicoPesquisa = {
  pesquisar: (termo: string) => api.get<ResultadoPesquisa[]>('/pesquisa', { params: { termo } }).then((r) => r.data),
};

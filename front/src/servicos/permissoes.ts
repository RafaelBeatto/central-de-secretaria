import api from 'src/utils/axios';
import type { MatrizPermissoes } from 'src/types/acesso';

export const servicoPermissoes = {
  matriz: () => api.get<MatrizPermissoes>('/permissoes').then((r) => r.data),
  atualizar: (cargoId: number, permissoes: string[]) =>
    api.put<MatrizPermissoes>(`/permissoes/cargos/${cargoId}`, { permissoes }).then((r) => r.data),
  restaurarPadrao: (cargoId: number) =>
    api.delete<MatrizPermissoes>(`/permissoes/cargos/${cargoId}`).then((r) => r.data),
};

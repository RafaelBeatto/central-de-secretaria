import api from 'src/utils/axios';
import type { ContatoChat, ConversaResumo, MensagemChat } from 'src/types/chat';

export const servicoChat = {
  contatos: () => api.get<ContatoChat[]>('/chat/contatos').then((r) => r.data),
  conversas: () => api.get<ConversaResumo[]>('/chat/conversas').then((r) => r.data),
  abrirCom: (usuarioId: number) =>
    api.post<ConversaResumo>(`/chat/conversas/com/${usuarioId}`).then((r) => r.data),
  mensagens: (conversaId: number, antesDeId?: number) =>
    api
      .get<MensagemChat[]>(`/chat/conversas/${conversaId}/mensagens`, { params: { antesDeId } })
      .then((r) => r.data),
  enviar: (conversaId: number, texto: string) =>
    api.post<MensagemChat>('/chat/mensagens', { conversaId, texto }).then((r) => r.data),
  marcarLidas: (conversaId: number) => api.post(`/chat/conversas/${conversaId}/lidas`),
};

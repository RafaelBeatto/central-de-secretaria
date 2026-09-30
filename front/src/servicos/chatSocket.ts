import { Client } from '@stomp/stompjs';
import type { EventoChat } from 'src/types/chat';

/**
 * Conexão STOMP do chat (/ws). Autentica com o JWT no CONNECT, reconecta sozinha
 * e busca um token válido antes de cada (re)conexão.
 */
const urlWebSocket =
  import.meta.env.VITE_WS_URL ?? `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`;

let cliente: Client | null = null;

export const chatSocket = {
  conectar(opcoes: {
    obterToken: () => Promise<string | null>;
    aoEvento: (evento: EventoChat) => void;
    aoErro: (mensagem: string) => void;
    aoMudarConexao: (conectado: boolean) => void;
  }) {
    chatSocket.desconectar();
    const novo = new Client({
      brokerURL: urlWebSocket,
      reconnectDelay: 5000,
      heartbeatIncoming: 20000,
      heartbeatOutgoing: 20000,
      beforeConnect: async () => {
        const token = await opcoes.obterToken();
        if (!token) {
          await novo.deactivate();
          return;
        }
        novo.connectHeaders = { Authorization: `Bearer ${token}` };
      },
      onConnect: () => {
        novo.subscribe('/user/queue/chat', (quadro) => opcoes.aoEvento(JSON.parse(quadro.body)));
        novo.subscribe('/user/queue/erros', (quadro) => opcoes.aoErro(quadro.body));
        opcoes.aoMudarConexao(true);
      },
      onWebSocketClose: () => opcoes.aoMudarConexao(false),
    });
    cliente = novo;
    novo.activate();
  },

  desconectar() {
    cliente?.deactivate();
    cliente = null;
  },

  /** Envia pelo WebSocket; devolve false se não estiver conectado (quem chama usa o REST). */
  enviar(conversaId: number, texto: string) {
    if (!cliente?.connected) return false;
    cliente.publish({ destination: '/app/chat.enviar', body: JSON.stringify({ conversaId, texto }) });
    return true;
  },
};

import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { servicoChat } from 'src/servicos/chat';
import { chatSocket } from 'src/servicos/chatSocket';
import type { ContatoChat, ConversaResumo, EventoChat, MensagemChat } from 'src/types/chat';

/**
 * Chat da tela inicial (conversas sempre entre duas pessoas da mesma unidade).
 * As mensagens chegam em tempo real pelo WebSocket (ver hooks/useChatTempoReal).
 */
interface EstadoChat {
  contatos: ContatoChat[];
  conversas: ConversaResumo[];
  conversaAtivaId: number | null;
  mensagens: Record<number, MensagemChat[]>;
  /** Conversas que ainda têm mensagens antigas para carregar. */
  temMaisAntigas: Record<number, boolean>;
  busca: string;
  conectado: boolean;
}

const estadoInicial: EstadoChat = {
  contatos: [],
  conversas: [],
  conversaAtivaId: null,
  mensagens: {},
  temMaisAntigas: {},
  busca: '',
  conectado: false,
};

const LOTE = 50;

export const carregarChat = createAsyncThunk('chat/carregar', async () => {
  const [contatos, conversas] = await Promise.all([servicoChat.contatos(), servicoChat.conversas()]);
  return { contatos, conversas };
});

/** Abre (ou reaproveita) a conversa com um colega e carrega as mensagens. */
export const abrirConversaCom = createAsyncThunk('chat/abrir', async (usuarioId: number, { dispatch }) => {
  const conversa = await servicoChat.abrirCom(usuarioId);
  await dispatch(carregarMensagens({ conversaId: conversa.id }));
  return conversa;
});

export const carregarMensagens = createAsyncThunk(
  'chat/mensagens',
  async ({ conversaId, antesDeId }: { conversaId: number; antesDeId?: number }) => {
    const mensagens = await servicoChat.mensagens(conversaId, antesDeId);
    // O back devolve da mais nova para a mais antiga; na tela é o contrário.
    return { conversaId, antesDeId, mensagens: [...mensagens].reverse() };
  },
);

/**
 * Envia pelo WebSocket (a mensagem volta pelo próprio WebSocket para todas as abas);
 * se ele estiver fora do ar, envia pelo REST e acrescenta a resposta na hora.
 */
export const enviarMensagem = createAsyncThunk(
  'chat/enviar',
  async ({ conversaId, texto, meuId }: { conversaId: number; texto: string; meuId: number }, { dispatch }) => {
    if (chatSocket.enviar(conversaId, texto)) return;
    const mensagem = await servicoChat.enviar(conversaId, texto);
    dispatch(eventoRecebido({ evento: { tipo: 'MENSAGEM', conversaId, mensagem }, meuId }));
  },
);

export const marcarLidas = createAsyncThunk('chat/lidas', async (conversaId: number) => {
  await servicoChat.marcarLidas(conversaId);
  return conversaId;
});

const chatSlice = createSlice({
  name: 'chat',
  initialState: estadoInicial,
  reducers: {
    buscar: (state, action: PayloadAction<string>) => {
      state.busca = action.payload;
    },
    selecionarConversa: (state, action: PayloadAction<number | null>) => {
      state.conversaAtivaId = action.payload;
    },
    conexaoAlterada: (state, action: PayloadAction<boolean>) => {
      state.conectado = action.payload;
    },
    eventoRecebido: (state, action: PayloadAction<{ evento: EventoChat; meuId: number }>) => {
      const { evento, meuId } = action.payload;
      if (evento.tipo === 'LIDAS') {
        state.mensagens[evento.conversaId]?.forEach((m) => {
          if (m.remetenteId === meuId && !m.lidaEm) m.lidaEm = new Date().toISOString();
        });
        return;
      }
      const mensagem = evento.mensagem!;
      const lista = (state.mensagens[mensagem.conversaId] ??= []);
      if (!lista.some((m) => m.id === mensagem.id)) lista.push(mensagem);
      const conversa = state.conversas.find((c) => c.id === mensagem.conversaId);
      if (conversa) {
        conversa.ultimaMensagem = mensagem;
        const aberta = state.conversaAtivaId === mensagem.conversaId;
        if (mensagem.remetenteId !== meuId && !aberta) conversa.naoLidas += 1;
        // Conversa com novidade sobe para o topo.
        state.conversas = [conversa, ...state.conversas.filter((c) => c.id !== conversa.id)];
      }
    },
    chatLimpo: () => estadoInicial,
  },
  extraReducers: (builder) => {
    builder
      .addCase(carregarChat.fulfilled, (state, action) => {
        state.contatos = action.payload.contatos;
        state.conversas = action.payload.conversas;
      })
      .addCase(abrirConversaCom.fulfilled, (state, action) => {
        const conversa = action.payload;
        if (!state.conversas.some((c) => c.id === conversa.id)) state.conversas.unshift(conversa);
        state.conversaAtivaId = conversa.id;
      })
      .addCase(carregarMensagens.fulfilled, (state, action) => {
        const { conversaId, antesDeId, mensagens } = action.payload;
        state.mensagens[conversaId] = antesDeId ? [...mensagens, ...(state.mensagens[conversaId] ?? [])] : mensagens;
        state.temMaisAntigas[conversaId] = mensagens.length === LOTE;
      })
      .addCase(marcarLidas.fulfilled, (state, action) => {
        const conversa = state.conversas.find((c) => c.id === action.payload);
        if (conversa) conversa.naoLidas = 0;
      });
  },
});

export const { buscar, selecionarConversa, conexaoAlterada, eventoRecebido, chatLimpo } = chatSlice.actions;
export default chatSlice.reducer;

import { useEffect } from 'react';
import { useDispatch, useSelector } from 'src/store/Store';
import { carregarChat, chatLimpo, conexaoAlterada, eventoRecebido } from 'src/store/apps/chat/ChatSlice';
import { chatSocket } from 'src/servicos/chatSocket';
import { tokenValidoParaWebSocket } from 'src/utils/axios';
import { PERMISSOES } from 'src/constantes/permissoes';
import { useInteracao } from 'src/components/compartilhados/ProvedorInteracao';

/** Conecta o chat enquanto o usuário estiver logado e tiver permissão de usá-lo. */
export function useChatTempoReal() {
  const dispatch = useDispatch();
  const { notificar } = useInteracao();
  const usuario = useSelector((s) => s.autenticacao.usuario);
  const podeUsar = !!usuario && !usuario.trocarSenha && usuario.permissoes.includes(PERMISSOES.CHAT_USAR);
  const meuId = usuario?.id;

  useEffect(() => {
    if (!podeUsar || meuId === undefined) return undefined;
    dispatch(carregarChat());
    chatSocket.conectar({
      obterToken: tokenValidoParaWebSocket,
      aoEvento: (evento) => dispatch(eventoRecebido({ evento, meuId })),
      aoErro: (mensagem) => notificar(mensagem, 'error'),
      aoMudarConexao: (conectado) => {
        dispatch(conexaoAlterada(conectado));
        // Ao reconectar, sincroniza o que chegou enquanto estava fora.
        if (conectado) dispatch(carregarChat());
      },
    });
    return () => {
      chatSocket.desconectar();
      dispatch(chatLimpo());
    };
  }, [dispatch, notificar, podeUsar, meuId]);
}

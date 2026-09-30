import { FormEvent, KeyboardEvent, useState } from 'react';
import { IconButton, InputBase, Box, Popover, Typography } from '@mui/material';
import Picker from 'emoji-picker-react';
import { IconMoodSmile, IconSend } from '@tabler/icons-react';
import { useDispatch, useSelector } from 'src/store/Store';
import { enviarMensagem } from 'src/store/apps/chat/ChatSlice';
import { LIMITES } from 'src/constantes/limites';
import { useInteracao } from 'src/components/compartilhados/ProvedorInteracao';
import { mensagemDeErro } from 'src/utils/erroApi';

/** Caixa de envio (Enter envia, Shift+Enter quebra linha), com emojis como no template. */
const ChatMsgSent = () => {
  const [texto, setTexto] = useState('');
  const [ancoraEmoji, setAncoraEmoji] = useState<HTMLButtonElement | null>(null);
  const dispatch = useDispatch();
  const { notificar } = useInteracao();
  const conversaId = useSelector((s) => s.chat.conversaAtivaId);
  const meuId = useSelector((s) => s.autenticacao.usuario?.id);
  const restante = LIMITES.MENSAGEM_TEXTO - texto.length;

  const enviar = async (e?: FormEvent) => {
    e?.preventDefault();
    const conteudo = texto.trim();
    if (!conteudo || !conversaId || meuId === undefined) return;
    setTexto('');
    try {
      await dispatch(enviarMensagem({ conversaId, texto: conteudo, meuId })).unwrap();
    } catch (erro) {
      setTexto(conteudo);
      notificar(mensagemDeErro(erro), 'error');
    }
  };

  const aoTeclar = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      enviar();
    }
  };

  if (!conversaId) return null;

  return (
    <Box p={2}>
      <form onSubmit={enviar} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
        <IconButton aria-label="Emojis" onClick={(e) => setAncoraEmoji(e.currentTarget)} sx={{ display: { xs: 'none', sm: 'inline-flex' } }}>
          <IconMoodSmile />
        </IconButton>
        <Popover
          anchorEl={ancoraEmoji}
          open={Boolean(ancoraEmoji)}
          onClose={() => setAncoraEmoji(null)}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          transformOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        >
          <Picker
            native
            onEmojiClick={(_evento: unknown, emoji: { emoji: string }) =>
              setTexto((atual) => (atual + emoji.emoji).slice(0, LIMITES.MENSAGEM_TEXTO))
            }
          />
        </Popover>
        <InputBase
          fullWidth
          multiline
          maxRows={4}
          value={texto}
          placeholder="Escreva uma mensagem"
          inputProps={{ 'aria-label': 'Escreva uma mensagem', maxLength: LIMITES.MENSAGEM_TEXTO }}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={aoTeclar}
        />
        {restante < 200 ? (
          <Typography variant="caption" color={restante < 20 ? 'error' : 'textSecondary'}>
            {restante}
          </Typography>
        ) : null}
        <IconButton aria-label="Enviar" type="submit" disabled={!texto.trim()} color="primary">
          <IconSend stroke={1.5} size="20" />
        </IconButton>
      </form>
    </Box>
  );
};

export default ChatMsgSent;

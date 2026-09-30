import { Badge, IconButton, Tooltip } from '@mui/material';
import { IconMessage2 } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'src/store/Store';
import { usePermissao } from 'src/hooks/usePermissao';
import { PERMISSOES } from 'src/constantes/permissoes';

/** Ícone do chat com o total de mensagens não lidas; leva ao painel, onde fica o chat. */
const AvisoChat = () => {
  const navegar = useNavigate();
  const { tem } = usePermissao();
  const naoLidas = useSelector((s) => s.chat.conversas.reduce((total, c) => total + c.naoLidas, 0));

  if (!tem(PERMISSOES.CHAT_USAR)) return null;

  return (
    <Tooltip title={naoLidas ? `${naoLidas} mensagem(ns) não lida(s)` : 'Chat'}>
      <IconButton size="large" color="inherit" aria-label="Abrir chat" onClick={() => navegar('/painel#chat')}>
        <Badge badgeContent={naoLidas} color="primary" max={99}>
          <IconMessage2 size="21" stroke="1.5" />
        </Badge>
      </IconButton>
    </Tooltip>
  );
};

export default AvisoChat;

import { useEffect, useRef } from 'react';
import {
  Typography,
  Divider,
  Avatar,
  ListItem,
  ListItemText,
  ListItemAvatar,
  IconButton,
  Box,
  Button,
} from '@mui/material';
import { IconChecks, IconMenu2, IconMessages } from '@tabler/icons-react';
import { useDispatch, useSelector } from 'src/store/Store';
import { carregarMensagens, marcarLidas } from 'src/store/apps/chat/ChatSlice';
import { formatarData, formatarHora, iniciais } from 'src/utils/formatacao';

interface Props {
  toggleChatSidebar: () => void;
}

/** Mensagens da conversa aberta (mesmo desenho de balões do template). */
const ChatContent = ({ toggleChatSidebar }: Props) => {
  const dispatch = useDispatch();
  const meuId = useSelector((s) => s.autenticacao.usuario?.id);
  const { conversaAtivaId, conversas, mensagens, temMaisAntigas } = useSelector((s) => s.chat);
  const conversa = conversas.find((c) => c.id === conversaAtivaId);
  const lista = conversaAtivaId ? mensagens[conversaAtivaId] ?? [] : [];
  const fim = useRef<HTMLDivElement>(null);
  const ultimaId = lista[lista.length - 1]?.id;

  // Nova mensagem: rola até o fim e, se veio do outro, marca como lida.
  useEffect(() => {
    fim.current?.scrollIntoView({ block: 'end' });
    if (conversa?.naoLidas) dispatch(marcarLidas(conversa.id));
  }, [ultimaId, conversa?.id, conversa?.naoLidas, dispatch]);

  if (!conversa) {
    return (
      <Box display="flex" alignItems="center" p={2} gap={1} minHeight={120}>
        <Box sx={{ display: { xs: 'flex', lg: 'none' } }}>
          <IconButton aria-label="Ver conversas" onClick={toggleChatSidebar}>
            <IconMenu2 stroke={1.5} />
          </IconButton>
        </Box>
        <IconMessages stroke={1.5} />
        <Typography variant="h6" color="textSecondary">
          Escolha uma conversa ou um colega para começar.
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" alignItems="center" p={2}>
        <Box sx={{ display: { xs: 'block', lg: 'none' }, mr: '10px' }}>
          <IconButton aria-label="Ver conversas" onClick={toggleChatSidebar}>
            <IconMenu2 stroke={1.5} />
          </IconButton>
        </Box>
        <ListItem dense disableGutters>
          <ListItemAvatar>
            <Avatar>{iniciais(conversa.outroUsuario.nomeCompleto)}</Avatar>
          </ListItemAvatar>
          <ListItemText
            primary={<Typography variant="h5">{conversa.outroUsuario.nomeCompleto}</Typography>}
            secondary={conversa.outroUsuario.cargoNome}
          />
        </ListItem>
      </Box>
      <Divider />
      <Box sx={{ height: { xs: 'calc(100vh - 330px)', lg: '420px' }, overflowY: 'auto' }} p={{ xs: 2, md: 3 }}>
        {temMaisAntigas[conversa.id] ? (
          <Box textAlign="center" mb={2}>
            <Button
              size="small"
              onClick={() => dispatch(carregarMensagens({ conversaId: conversa.id, antesDeId: lista[0]?.id }))}
            >
              Carregar mensagens anteriores
            </Button>
          </Box>
        ) : null}
        {lista.map((mensagem, indice) => {
          const minha = mensagem.remetenteId === meuId;
          const dia = mensagem.enviadaEm.slice(0, 10);
          const mudouDia = indice === 0 || lista[indice - 1].enviadaEm.slice(0, 10) !== dia;
          return (
            <Box key={mensagem.id}>
              {mudouDia ? (
                <Typography variant="caption" color="textSecondary" display="block" textAlign="center" my={1}>
                  {formatarData(new Date(mensagem.enviadaEm).toLocaleDateString('sv-SE'))}
                </Typography>
              ) : null}
              <Box
                mb={1.5}
                display="flex"
                flexDirection="column"
                alignItems={minha ? 'flex-end' : 'flex-start'}
              >
                <Box
                  sx={{
                    p: 1,
                    px: 1.5,
                    borderRadius: 1,
                    backgroundColor: minha ? 'primary.light' : 'grey.100',
                    maxWidth: { xs: '85%', md: '420px' },
                    whiteSpace: 'pre-wrap',
                    overflowWrap: 'anywhere',
                  }}
                >
                  {mensagem.texto}
                </Box>
                <Typography variant="caption" color="grey.400" display="flex" alignItems="center" gap={0.5}>
                  {formatarHora(mensagem.enviadaEm)}
                  {minha ? (
                    <IconChecks size={14} color={mensagem.lidaEm ? '#5D87FF' : undefined} aria-label={mensagem.lidaEm ? 'Lida' : 'Enviada'} />
                  ) : null}
                </Typography>
              </Box>
            </Box>
          );
        })}
        <div ref={fim} />
      </Box>
    </Box>
  );
};

export default ChatContent;

import {
  Avatar,
  List,
  ListItemText,
  ListItemAvatar,
  TextField,
  Box,
  Badge,
  ListItemButton,
  Typography,
  InputAdornment,
  ListSubheader,
} from '@mui/material';
import { IconSearch } from '@tabler/icons-react';
import { useDispatch, useSelector } from 'src/store/Store';
import {
  abrirConversaCom,
  buscar,
  carregarMensagens,
  marcarLidas,
  selecionarConversa,
} from 'src/store/apps/chat/ChatSlice';
import Scrollbar from 'src/components/custom-scroll/Scrollbar';
import { formatarMomento, iniciais } from 'src/utils/formatacao';
import type { ConversaResumo } from 'src/types/chat';

const normalizar = (texto: string) =>
  texto.toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[̀-ͯ]/g, '');

/** Conversas recentes e colegas da unidade (para começar uma conversa nova). */
const ChatListing = ({ aoSelecionar }: { aoSelecionar: () => void }) => {
  const dispatch = useDispatch();
  const usuario = useSelector((s) => s.autenticacao.usuario);
  const { conversas, contatos, busca, conversaAtivaId, mensagens, conectado } = useSelector((s) => s.chat);

  const termo = normalizar(busca);
  const conversasFiltradas = conversas.filter((c) => normalizar(c.outroUsuario.nomeCompleto).includes(termo));
  const comConversa = new Set(conversas.map((c) => c.outroUsuario.id));
  const colegas = contatos.filter((c) => !comConversa.has(c.id) && normalizar(c.nomeCompleto).includes(termo));

  const abrir = (conversa: ConversaResumo) => {
    dispatch(selecionarConversa(conversa.id));
    if (!mensagens[conversa.id]) dispatch(carregarMensagens({ conversaId: conversa.id }));
    if (conversa.naoLidas) dispatch(marcarLidas(conversa.id));
    aoSelecionar();
  };

  const resumo = (conversa: ConversaResumo) => {
    const ultima = conversa.ultimaMensagem;
    if (!ultima) return 'Nenhuma mensagem ainda';
    return `${ultima.remetenteId === usuario?.id ? 'Você: ' : ''}${ultima.texto}`;
  };

  return (
    <div>
      <Box display="flex" alignItems="center" gap="10px" p={3}>
        <Badge
          variant="dot"
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          overlap="circular"
          color={conectado ? 'success' : 'secondary'}
        >
          <Avatar sx={{ width: 54, height: 54, bgcolor: 'primary.main' }}>
            {iniciais(usuario?.nomeCompleto ?? '')}
          </Avatar>
        </Badge>
        <Box minWidth={0}>
          <Typography variant="body1" fontWeight={600} noWrap>
            {usuario?.nomeCompleto}
          </Typography>
          <Typography variant="body2">{conectado ? 'Conectado' : 'Reconectando…'}</Typography>
        </Box>
      </Box>
      <Box px={3} py={1}>
        <TextField
          placeholder="Buscar pessoas"
          size="small"
          type="search"
          value={busca}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconSearch size="16" />
              </InputAdornment>
            ),
          }}
          inputProps={{ 'aria-label': 'Buscar pessoas' }}
          fullWidth
          onChange={(e) => dispatch(buscar(e.target.value))}
        />
      </Box>
      <Scrollbar sx={{ height: { xs: 'calc(100vh - 190px)', lg: '430px' } }}>
        <List sx={{ px: 0 }}>
          {conversasFiltradas.length ? <ListSubheader disableSticky>Conversas</ListSubheader> : null}
          {conversasFiltradas.map((conversa) => (
            <ListItemButton
              key={conversa.id}
              onClick={() => abrir(conversa)}
              sx={{ mb: 0.5, py: 2, px: 3, alignItems: 'start' }}
              selected={conversaAtivaId === conversa.id}
            >
              <ListItemAvatar>
                <Badge badgeContent={conversa.naoLidas} color="primary" max={99}>
                  <Avatar sx={{ width: 42, height: 42 }}>{iniciais(conversa.outroUsuario.nomeCompleto)}</Avatar>
                </Badge>
              </ListItemAvatar>
              <ListItemText
                primary={
                  <Typography variant="subtitle2" fontWeight={600} mb={0.5} noWrap>
                    {conversa.outroUsuario.nomeCompleto}
                  </Typography>
                }
                secondary={resumo(conversa)}
                secondaryTypographyProps={{ noWrap: true, fontWeight: conversa.naoLidas ? 600 : 400 }}
                sx={{ my: 0, minWidth: 0 }}
              />
              <Box sx={{ flexShrink: 0 }} mt={0.5} ml={1}>
                <Typography variant="body2">{formatarMomento(conversa.ultimaMensagem?.enviadaEm)}</Typography>
              </Box>
            </ListItemButton>
          ))}

          {colegas.length ? <ListSubheader disableSticky>Colegas da unidade</ListSubheader> : null}
          {colegas.map((contato) => (
            <ListItemButton
              key={contato.id}
              onClick={() => {
                dispatch(abrirConversaCom(contato.id));
                aoSelecionar();
              }}
              sx={{ py: 1.5, px: 3 }}
            >
              <ListItemAvatar>
                <Avatar sx={{ width: 42, height: 42 }}>{iniciais(contato.nomeCompleto)}</Avatar>
              </ListItemAvatar>
              <ListItemText
                primary={
                  <Typography variant="subtitle2" fontWeight={600} noWrap>
                    {contato.nomeCompleto}
                  </Typography>
                }
                secondary={contato.cargoNome}
              />
            </ListItemButton>
          ))}

          {!conversasFiltradas.length && !colegas.length ? (
            <Typography color="textSecondary" px={3} py={2}>
              {busca ? 'Ninguém encontrado com essa busca.' : 'Ainda não há colegas cadastrados nesta unidade.'}
            </Typography>
          ) : null}
        </List>
      </Scrollbar>
    </div>
  );
};

export default ChatListing;

import { Box, Avatar, Typography, IconButton, Tooltip, useMediaQuery, Theme } from '@mui/material';
import { IconPower } from '@tabler/icons-react';
import { useDispatch, useSelector } from 'src/store/Store';
import { sair } from 'src/store/autenticacao/AutenticacaoSlice';
import { iniciais } from 'src/utils/formatacao';

/** Rodapé do menu: quem está logado, cargo e botão de sair. */
export const Profile = () => {
  const customizer = useSelector((state) => state.customizer);
  const usuario = useSelector((state) => state.autenticacao.usuario);
  const dispatch = useDispatch();
  const lgUp = useMediaQuery((theme: Theme) => theme.breakpoints.up('lg'));
  const hideMenu = lgUp ? customizer.isCollapse && !customizer.isSidebarHover : '';

  if (!usuario || hideMenu) return null;

  return (
    <Box display="flex" alignItems="center" gap={2} sx={{ m: 3, p: 2, bgcolor: 'secondary.light' }}>
      <Avatar sx={{ bgcolor: 'primary.main' }}>{iniciais(usuario.nomeCompleto)}</Avatar>
      <Box minWidth={0}>
        <Typography variant="h6" noWrap>
          {usuario.nome}
        </Typography>
        <Typography variant="caption" noWrap display="block">
          {usuario.cargo.nome}
        </Typography>
      </Box>
      <Box sx={{ ml: 'auto' }}>
        <Tooltip title="Sair" placement="top">
          <IconButton color="primary" aria-label="Sair" size="small" onClick={() => dispatch(sair())}>
            <IconPower size="20" />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );
};

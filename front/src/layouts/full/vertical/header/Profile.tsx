import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Box, Menu, Avatar, Typography, Divider, Button, IconButton, Stack } from '@mui/material';
import { IconBuildingCommunity, IconKey, IconMail } from '@tabler/icons-react';
import { useDispatch, useSelector } from 'src/store/Store';
import { sair } from 'src/store/autenticacao/AutenticacaoSlice';
import { iniciais } from 'src/utils/formatacao';

/** Menu do usuário no cabeçalho (mesmo desenho do template). */
const Profile = () => {
  const [ancora, setAncora] = useState<HTMLElement | null>(null);
  const usuario = useSelector((s) => s.autenticacao.usuario);
  const dispatch = useDispatch();
  if (!usuario) return null;

  return (
    <Box>
      <IconButton
        size="large"
        aria-label="Menu do usuário"
        color="inherit"
        aria-controls="menu-usuario"
        aria-haspopup="true"
        onClick={(e) => setAncora(e.currentTarget)}
      >
        <Avatar sx={{ width: 35, height: 35, bgcolor: 'primary.main', fontSize: 14 }}>
          {iniciais(usuario.nomeCompleto)}
        </Avatar>
      </IconButton>
      <Menu
        id="menu-usuario"
        anchorEl={ancora}
        keepMounted
        open={Boolean(ancora)}
        onClose={() => setAncora(null)}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        sx={{ '& .MuiMenu-paper': { width: { xs: 'calc(100vw - 32px)', sm: '340px' }, p: 3 } }}
      >
        <Typography variant="h5">Meu perfil</Typography>
        <Stack direction="row" py={3} spacing={2} alignItems="center">
          <Avatar sx={{ width: 64, height: 64, bgcolor: 'primary.main' }}>{iniciais(usuario.nomeCompleto)}</Avatar>
          <Box minWidth={0}>
            <Typography variant="subtitle2" color="textPrimary" fontWeight={600} noWrap>
              {usuario.nomeCompleto}
            </Typography>
            <Typography variant="subtitle2" color="textSecondary">
              {usuario.cargo.nome}
            </Typography>
            <Typography variant="subtitle2" color="textSecondary" display="flex" alignItems="center" gap={1}>
              <IconMail width={15} height={15} />
              {usuario.login}
            </Typography>
          </Box>
        </Stack>
        <Typography variant="subtitle2" color="textSecondary" display="flex" alignItems="center" gap={1} mb={2}>
          <IconBuildingCommunity width={16} height={16} />
          {usuario.unidade.nome}
        </Typography>
        <Divider />
        <Stack spacing={1.5} mt={2}>
          <Button
            component={Link}
            to="/trocar-senha"
            variant="text"
            startIcon={<IconKey size={18} />}
            onClick={() => setAncora(null)}
            sx={{ justifyContent: 'flex-start' }}
          >
            Trocar minha senha
          </Button>
          <Button variant="outlined" color="primary" fullWidth onClick={() => dispatch(sair())}>
            Sair
          </Button>
        </Stack>
      </Menu>
    </Box>
  );
};

export default Profile;
